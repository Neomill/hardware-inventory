# Supplier Invoices Specification

**Project:** Olaer Store\
**Phase:** 4 --- Sale cancellation, Add Product and Product Details, supplier invoices\
**Scope:** Receiving a delivery as one supplier invoice covering many products; listing invoices\
**Status:** Approved (owner, 2026-11-01) --- decision D10; every question settled (section 11)\
**Backend:** Not included (D5)\
**Owners:** `data-layer-engineer` and `ui-platform-engineer`, then `inventory-engineer`, then
`code-reviewer` and `qa-engineer`

---

## 1. Objective

Record a supplier delivery the way it arrives: one paper invoice listing several products. Saving
it raises the stock of every product on it and keeps the invoice itself (supplier, number, date,
total, who received it) so the owner can find it again.

### Why the store needs it

- `09-open-questions.md`, Supplier Invoices: Version 1 records supplier, invoice number, invoice
  date, total amount, purchase items and received by. The recommended workflow gives each invoice
  a unique number.
- Glossary: the supplier invoice is "the document a supplier provides with a delivery, formatted
  `INV-NNNNN`", the only thing called an invoice (E6).
- Today's Receive Stock (`ReceiveStockView.tsx`, `receiveStock` in `useShopStore.ts`) takes **one
  product** per save, the invoice number and supplier are optional, and no invoice record exists:
  the number survives only as each movement's `reference`. A ten-line delivery is ten saves with
  the number typed ten times, and the total is nowhere.

---

## 2. Source of Truth

```text
docs/business/02-current-workflow.md     Stock Receiving Workflow (after hours, then recorded)
docs/business/04-business-rules.md       Stock increases after receiving; audit
docs/business/07-glossary.md             Supplier, Supplier Invoice, Stock In
docs/business/09-open-questions.md       Supplier Invoices
docs/business/10-decisions.md            D2, D3 (receivedBy), D5, D10 (this spec)
specs/01/DESIGN-ERRATA.md                E6 (INV-NNNNN, distinct from sale numbers)
src/domain/inventory.ts                  normalizeSupplierInvoice, validateStockReceipt
src/stores/useShopStore.ts               receiveStock
src/features/inventory/                  ReceiveStockView, ReceiptConfirmation, ProductPicker,
                                         InventoryTabs, InventoryPage, stockForms
src/data/mock/seedSales.ts               RECEIPTS (INV-10018 to INV-10021)
```

---

## 3. Non-Goals

- Unit costs, cost price, margins or checking the total against the lines (D10: the total is typed
  from the paper; there are no per-item costs).
- Attaching a scan or photo (`09-open-questions.md`: future enhancement).
- A supplier list or supplier records. Supplier is free text (D10).
- Editing, voiding or deleting an invoice once saved. A mistake is corrected with Adjust Stock,
  which already requires a reason.
- Changing selling prices from the invoice (that is Edit Product on Product Details, `04-add-product-and-details-spec.md` s.5.5).
- Purchase orders, payments to suppliers, accounts payable.

---

## 4. Data Model Changes

### 4.1 Types (`src/domain/types.ts`)

```ts
/** One product on a supplier invoice. Copied so the record survives a later rename. */
export type SupplierInvoiceLine = {
  productId: string
  productName: string
  sku: string
  unit: string
  /** Whole units, more than zero (D2). */
  quantity: number
}

/** A delivery as written on the supplier's paper invoice (D10). Never edited once saved. */
export type SupplierInvoice = {
  /** "INV-10021" (E6). Unique; the record's key. */
  invoiceNumber: string
  supplier: string
  /** "2026-11-01" (DayKey): the date printed on the invoice. */
  invoiceDate: string
  /** Typed from the paper, integer centavos, more than zero. */
  total: Centavos
  /** At least one, one per product. */
  lines: SupplierInvoiceLine[]
  note: string | null
  /** CURRENT_USER.name (D3). */
  receivedBy: string
  /** ISO 8601, when it was saved. Also every line's movement time. */
  recordedAt: string
}
```

### 4.2 Pure functions (`src/domain/supplierInvoice.ts`, new)

```ts
export const SUPPLIER_NAME_MAX = 80     // existing limit in stockForms.ts
export const INVOICE_NOTE_MAX = 200     // existing note limit

/** True when the number is on a saved invoice or on any stock movement's reference. */
export function isInvoiceNumberTaken(
  invoiceNumber: string, invoices: SupplierInvoice[], movements: StockMovement[],
): boolean

export function validateSupplierInvoice(
  input: ReceiveInvoiceInput,
  context: { invoices: SupplierInvoice[]; movements: StockMovement[]; products: Product[]; today: Date },
): ValidationResult

/** One stock_in per line (section 5.3). */
export function buildInvoiceMovements(invoice: SupplierInvoice): StockMovement[]

/** Distinct supplier names from saved invoices, A to Z, for the Supplier suggestions. */
export function knownSuppliers(invoices: SupplierInvoice[]): string[]

export function invoiceUnitCount(invoice: SupplierInvoice): number
```

`normalizeSupplierInvoice` in `inventory.ts` is reused unchanged.

### 4.3 Store (`src/stores/useShopStore.ts`)

| Before | After |
| ------ | ----- |
| (none) | `invoices: SupplierInvoice[]`, oldest first |
| `receiveStock(input: ReceiveStockInput): StockMovementResult` | `receiveInvoice(input: ReceiveInvoiceInput): ReceiveInvoiceResult` |

```ts
export type ReceiveInvoiceInput = {
  invoiceNumber: string          // case and spaces forgiven, as today
  supplier: string
  invoiceDate: string            // DayKey
  total: Centavos
  lines: { productId: string; quantity: number }[]
  note?: string
}

export type ReceiveInvoiceResult =
  | { ok: true; invoice: SupplierInvoice; movements: StockMovement[] }
  | { ok: false; message: string }
```

`receiveStock` and `ReceiveStockInput` are removed, not kept as aliases (one flow, section 5.1),
once the inventory engineer has moved `ReceiveStockView` to `receiveInvoice` (section 12): the old
form cannot be switched mechanically, because its invoice number and total are optional.
`validateStockReceipt` goes with it if nothing else uses it.

### 4.4 Persistence (`src/stores/shopPersistence.ts`)

Part of the single phase 4 bump, **version 2 to 3** (`04-sale-cancellation-spec.md` s.4.4):

- `PersistedShopData` and `selectPersistedData` gain `invoices`. The settings data export picks it
  up through `selectPersistedData` with no change of its own.
- `MIGRATIONS[2]` sets `invoices: []` when missing. Receipts saved before this version stay as
  movements only and are not turned into invoices (decision Q2); their numbers stay reserved by
  `isInvoiceNumberTaken`.
- `invoiceSchema` checks each invoice (number matches `INV-NNNNN`, readable dates, positive whole
  total, at least one line with a positive whole quantity). Invoices are **salvaged one by one**: a
  bad one is dropped and reported in `dropped` as "1 supplier invoice", like products. This is
  safe because stock rests on movements, which are never dropped; the invoice is the paper's
  record, not the stock's.
- A repeated invoice number keeps the first and drops the rest (reported the same way).
- `buildSeedData` returns the seed invoices (section 5.6). `resetToSeedData` restores them.

---

## 5. Rules

### 5.1 One flow

**Decided (owner, 2026-11-01):** the Receive Stock form **becomes** the invoice form. There is one
way to receive stock, and every delivery has an invoice. `ROUTES.receiveStockFor(productId)` (row
actions, Product Details) still works: it opens the form with that product as the first line.

**Decided (owner, 2026-11-01, Q1):** an invoice is required. A delivery that arrives with no paper
invoice is recorded with Adjust Stock (add, with a reason), as for any other stock correction.

### 5.2 Validation (`validateSupplierInvoice`, checked again in the store)

| Field | Rule | Message |
| ----- | ---- | ------- |
| Invoice number | `normalizeSupplierInvoice` (E6) | "Supplier invoice numbers look like INV-10021." |
| | Unique (D10): not on any saved invoice and not any movement's reference | "INV-10021 is already recorded." |
| Supplier | Required; trimmed, spaces collapsed; at most 80 | "Enter the supplier." / "Keep the supplier name under 80 characters." |
| Invoice date | A real date, not after today (store clock, local day): the delivery has already happened | "The invoice date cannot be in the future." |
| Total | Pesos parsed with `parseAmountInput` to integer centavos, more than zero | "Enter the total from the invoice." |
| Lines | At least one | "Add at least one product." |
| | Each product exists | "A product on this invoice no longer exists." |
| | Each quantity whole and more than zero (D2) | "Enter a whole number of units greater than zero." |
| | A product twice: the store merges the lines (`mergeCartLines` precedent); the form does not offer a product already on the invoice | none |
| Note | Optional, at most 200 | "Keep the note under 200 characters." |

Inactive products can be received (today's `receiveStock` allows it; inactive blocks selling
only). The total is not compared with anything (D10).

### 5.3 What saving writes

One `set` call, or nothing:

1. The invoice: lines copy `productName`, `sku` and `unit` from the products;
   `receivedBy: CURRENT_USER.name`; `recordedAt: now`.
2. One movement per line (`buildInvoiceMovements`):

   | Field | Value |
   | ----- | ----- |
   | `id` | `MOV-${invoiceNumber}-${productId}` |
   | `type`, `quantityDelta` | `'stock_in'`, `+quantity` |
   | `reference` | the invoice number |
   | `description` | `Received from ${supplier}` (today's wording) |
   | `reason`, `note` | `null`, `null` (the note lives on the invoice) |
   | `recordedBy`, `occurredAt` | `CURRENT_USER.name`, `recordedAt` |

   Movements are dated when saved, not on the invoice date: deliveries are unloaded after hours
   and recorded afterwards (`02-current-workflow.md`), and stock was not in the system before.
3. Each product's `stock` goes up by its quantity.

### 5.4 Supplier

Free text (D10). Nothing in `docs/` defines a supplier record; the Handbook s.13 only lists
suppliers among mock data. To keep typing down (Handbook s.14), the field suggests names from
earlier invoices (`knownSuppliers`, an HTML `datalist`); any text is accepted.

### 5.5 Invoices list and detail

- Read only. Newest invoice date first, then newest `recordedAt`.
- Every figure comes from the stored invoice (E3, E4).

### 5.6 Seed

`RECEIPTS` in `seedSales.ts` becomes `INVOICES`, one record per existing receipt, so a fresh seed
shows four invoices consistent with the movements:

| Invoice | Supplier | Line | Recorded (`SeedTime`) | Total (demo figure) |
| ------- | -------- | ---- | --------------------- | ------------------- |
| INV-10021 | ABC Trading | PVC-050 x 150 | [0, '16:45'] | 345000 |
| INV-10020 | XYZ Supplies | CEM-001 x 50 | [1, '08:00'] | 1150000 |
| INV-10019 | Metro Electrical | WIR-020 x 20 | [2, '10:00'] | 1650000 |
| INV-10018 | Metro Electrical | LED-009 x 60 | [3, '14:00'] | 720000 |

- `invoiceDate` is the local day of the recorded time; `receivedBy` and the movements'
  `recordedBy` are `SEED_RECORDER`.
- The totals are illustrative seed values, each below the retail value of the goods; they are not
  from any screenshot.
- The existing movements keep their ids (`MOV-INV-10021` ...), quantities, descriptions and times,
  so opening stock and every seeded stock figure stay exactly as they are. Only the invoice
  records are new.

---

## 6. Who May Do It

Whoever is at the till (D3); `receivedBy` records who. `05-user-roles.md` gives inventory to the
owner; without a login this is not enforced, as today.

---

## 7. Screens and States

### 7.1 Routes (`ui-platform-engineer`)

```ts
invoices: '/inventory/invoices',
invoiceDetail: (invoiceNumber: string) => `/inventory/invoices/${encodeURIComponent(invoiceNumber)}`,
patterns.invoiceDetail: '/inventory/invoices/:invoiceNumber',
```

Both routes render `InventoryPage` in `App.tsx`, as `receiveStock` and `stockMovements` do.

### 7.2 Inventory tabs (`InventoryTabs.tsx`)

A fourth tab **Invoices** (short label "Invoices", `FileText` icon), after Stock Movements. The
grid goes to four columns; labels stay on one line at 390 px. The tab is active on the list and on
an invoice's page.

### 7.3 Receive Stock (`ReceiveStockView.tsx`, rebuilt)

- Heading "Receive Stock", line: "Record a delivery from its supplier invoice. Stock goes up for
  every product as soon as you save."
- **Invoice** group: Invoice number (placeholder INV-10021, upper-cased), Supplier (with
  suggestions), Invoice date (date input, defaults to today, latest today), Invoice total (PHP,
  decimal keypad).
- **Products** group: `ProductPicker` and a Quantity field with **Add to invoice**; then the lines:
  product name and SKU, Current Stock, quantity (editable), **Remove**. A running line: "3
  products, 120 units". Products already on the invoice are not offered again.
- Note (optional).
- Buttons: **Cancel** (to `ROUTES.inventory`) and **Receive Stock** (primary).
- **Errors:** field messages in place; "Add at least one product." under the lines; a store
  refusal in an error `Alert`; nothing typed is lost (Handbook s.17).
- **Success:** a confirmation card (replaces `ReceiptConfirmation`'s single-product content):
  invoice number, supplier, invoice date, total, and per line the quantity received and stock on
  hand now. Actions: **Receive another delivery** (fresh form), **View invoice**
  (`ROUTES.invoiceDetail`), **Stock movements**.

The form's Zod schema lives in `src/features/inventory/lib/stockForms.ts` (or a new
`invoiceForm.ts`) and calls the domain rules.

### 7.4 Invoices list (new view in `src/features/inventory/components/`)

- Table: Invoice No. (link), Supplier, Invoice Date, Products (line count), Units, Total,
  Received By. Search by invoice number or supplier. Pages with `usePagedList`.
- **Empty:** "No supplier invoices yet. Record a delivery in Receive Stock." with a link to
  `ROUTES.receiveStock`.
- **No match:** "No invoices match your search."

### 7.5 Invoice detail

- Invoice number, supplier, invoice date, total, received by, "Recorded <date, time>", note.
- Lines: product name (link to `ROUTES.productDetail`), SKU, quantity with unit. Names are the
  copies stored on the invoice.
- **Not found:** "Invoice not found. It is not saved on this device. It may have been removed by
  a demo data reset." and **Back to Invoices**.

### 7.6 Stock Movements

In the Reference column, an invoice number with a saved invoice links to its detail page. Older
references without a record stay plain text.

---

## 8. Edge Cases

| Case | Expected |
| ---- | -------- |
| Invoice number "inv-10022 " | Saved as INV-10022 |
| INV-10021 (seeded) typed again | Refused: already recorded |
| Number used by an older single-product receipt in saved data | Refused: already recorded |
| Same number from a different supplier | Refused (unique, D10) |
| Invoice dated tomorrow | Refused |
| Invoice dated last week | Saved; movements dated now |
| Total blank or 0 | Refused |
| No lines | Refused |
| Same product added twice (only possible outside the form) | Lines merged by the store |
| Inactive product on the invoice | Received; stays not for sale |
| `?product=CEM-001` link | Form opens with Cement (Holcim) as the first line |
| Unknown `?product=` | Form opens with no lines |
| Reload after saving | Invoice, lines and movements survive |
| Version 2 data | Loads; `invoices: []`; old receipts still in Stock Movements |
| Reset demo data | Four seed invoices |

---

## 9. Acceptance Criteria

- [ ] **AC1** One save records an invoice with supplier, unique INV-NNNNN number, invoice date,
      total in centavos, received by and one or more product lines.
- [ ] **AC2** Saving writes one `stock_in` movement per line with the invoice number as reference,
      and raises each product's stock by its quantity, in one update.
- [ ] **AC3** A duplicate number, a future date, a missing total or an invoice with no lines is
      refused with the messages in 5.2, and nothing is written.
- [ ] **AC4** Receive Stock is the invoice form; the single-product form and `receiveStock` are
      gone; `receiveStockFor` links still preselect the product.
- [ ] **AC5** An Invoices tab lists every invoice and opens each one's detail.
- [ ] **AC6** A fresh seed has invoices INV-10018 to INV-10021 matching their movements; seeded
      stock figures are unchanged.
- [ ] **AC7** Version 2 saved data loads with every record kept.
- [ ] **AC8** Works at 390, 768 and 1280 px and by keyboard; `npm run verify` passes;
      `npm run test:e2e` covers B1 to B4.

---

## 10. Test Cases

### 10.1 Unit --- `src/domain/supplierInvoice.test.ts` (data-layer-engineer)

| ID | Function | Case | Expected |
| -- | -------- | ---- | -------- |
| U1 | `isInvoiceNumberTaken` | number on an invoice / only on a movement / unused | true / true / false |
| U2 | `validateSupplierInvoice` | each row of 5.2 | the message in 5.2 |
| U3 | `validateSupplierInvoice` | date today / tomorrow (fixed `today`) | ok / refused |
| U4 | `buildInvoiceMovements` | 2 lines | 2 `stock_in`, ids, reference, description as in 5.3 |
| U5 | `knownSuppliers` | repeats, mixed case | distinct, sorted |

### 10.2 Store (data-layer-engineer)

| ID | Case | Expected |
| -- | ---- | -------- |
| S1 | `receiveInvoice` with 2 lines | one invoice, two movements, both stocks up; stock equals sum of movements |
| S2 | Duplicate number | `ok: false`; nothing written |
| S3 | One line's product missing | `ok: false`; nothing written (no partial save) |
| S4 | Repeated product in input | one line, quantities added |
| S5 | `resetToSeedData` | four seed invoices |

### 10.3 Persistence and seed (data-layer-engineer)

| ID | Case | Expected |
| -- | ---- | -------- |
| M1 | Version 2 snapshot | version 3 with `invoices: []` (with `04-sale-cancellation-spec.md` M1) |
| M2 | One malformed invoice among three | two kept; `dropped` reports "1 supplier invoice" |
| M3 | Two invoices with one number | first kept, second dropped and reported |
| M4 | Seed (`seedSales.test.ts`) | each invoice's lines equal its movements; stock checks unchanged |

### 10.4 End to end --- `e2e/inventory.spec.ts` (inventory-engineer updates; qa-engineer runs)

The existing test "receiving stock raises stock and logs a Stock In movement" is rewritten for the
invoice form.

| ID | Steps | Expected |
| -- | ----- | -------- |
| B1 | Receive Stock: INV-10050, supplier "ABC Trading", today, total 5,000; add PVC-050 x 10 and CEM-001 x 5; save | Confirmation lists both; Products shows both stocks up; Stock Movements has two Stock In rows with INV-10050 |
| B2 | Invoices tab; open INV-10050 | Detail shows supplier, total PHP 5,000.00, two lines |
| B3 | Try INV-10021, then a future date, then no lines | Each refused with its message; nothing saved |
| B4 | Products row menu, Receive stock | Form opens with that product as the first line |

---

## 11. Decisions

The owner settled both questions on 2026-11-01, approving the recommendations. Recorded in D10.

| # | Question | Decision | Options set aside |
| - | -------- | -------- | ----------------- |
| Q1 | What about a delivery with no paper invoice? | **An invoice is required.** A paperless delivery is recorded with Adjust Stock (add, with a reason) (section 5.1). | A "No invoice" switch saving lines without an invoice record |
| Q2 | Turn receipts saved before this change into invoices? | **No.** They stay as Stock In movements and their numbers stay reserved by `isInvoiceNumberTaken` (section 4.4). Reset demo data gives the four seed invoices. | Grouping old movements into invoices with total "not recorded" |

---

## 12. Build Order

```text
1. data-layer-engineer   types, supplierInvoice.ts (+ tests), invoices slice, receiveInvoice
                         (receiveStock left in place for now), seed INVOICES, persistence v3
   ui-platform-engineer  ROUTES.invoices, ROUTES.invoiceDetail, pattern, App.tsx routes (parallel)
2. inventory-engineer    Invoice form on receiveInvoice, confirmation, Invoices tab, list, detail,
                         invoice links in Stock Movements (+ lib tests, e2e B1-B4)
3. data-layer-engineer   Remove receiveStock, ReceiveStockInput and their tests (now unused)
4. code-reviewer, then qa-engineer
```

The full phase 4 order, with products and sales running beside step 2, is in
`04-add-product-and-details-spec.md` s.12.
