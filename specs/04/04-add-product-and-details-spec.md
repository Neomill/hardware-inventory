# Add Product and Product Details Specification

**Project:** Olaer Store\
**Phase:** 4 --- Sale cancellation, Add Product and Product Details, supplier invoices\
**Scope:** Creating a product with an automatic SKU and opening stock; the Product Details page\
**Status:** Approved (owner, 2026-11-01) --- decision D9; every question settled (section 11)\
**Backend:** Not included (D5)\
**Owners:** `data-layer-engineer`, then `products-engineer`, then `code-reviewer` and
`qa-engineer`

---

## 1. Objective

Let the owner add a product the store starts selling, without choosing a SKU by hand, and with
the stock already on the shelf recorded as an opening stock movement. Give every product a
details page that shows what it is, how much is on hand and why: its stock movements and the
sales it appeared in.

Both routes exist as placeholders today (`NewProductPage.tsx`, `ProductDetailPage.tsx`). The
placeholder text says they wait for "SKU format and opening stock"; this spec settles both.

### Why the store needs it

- `PRD.md` scope lists Products and Categories; the information architecture lists Product List
  and **Product Details** (`01-information-architecture.md`).
- The Products toolbar already has an **Add Product** button and every row an eye icon that lead
  to these placeholders.
- Without Add Product, a new item can only be sold by editing the seed.

---

## 2. Source of Truth

```text
docs/business/04-business-rules.md       one selling price; inactive cannot be sold; stock rules
docs/business/02-current-workflow.md     Stock Receiving step 5: prices change after deliveries
docs/business/05-user-roles.md           Owner manages prices; cashier cannot change prices
docs/business/07-glossary.md             SKU "Unique product identifier"; "Reorder At"; "Current Stock"
docs/business/09-open-questions.md       Product Pricing
docs/business/10-decisions.md            D2 (one unit, whole quantities), D3, D6 Q5, D9 (this spec)
src/domain/inventory.ts                  buildOpeningStockMovement, OPENING_STOCK_* (opening convention)
src/domain/ids.ts                        nextSequentialId
src/domain/customer.ts                   validateNewCustomer (duplicate-name precedent)
src/domain/money.ts                      parseAmountInput
src/data/mock/catalog.ts                 existing SKUs, categories and units
src/features/products/                   list, toolbar, row actions, placeholders
```

---

## 3. Non-Goals

- Deleting a product. Deactivate instead (section 5.5).
- Editing SKU, unit or stock (section 5.5, decision Q1).
- Images (`imageUrl` stays unused by this form), barcodes (E8), supplier per product, cost price.
- A separate category or unit catalogue. Categories and units stay plain strings on products; a
  new one exists once a product uses it.
- Price history. The placeholder mentioned "price changes"; it is not in this version.
- Bulk import.

---

## 4. Data Model Changes

### 4.1 Types

`Product` is unchanged. A new product's `id` equals its SKU, as for every seeded product
(`catalog.ts`).

### 4.2 Pure functions (`src/domain/product.ts`, new)

```ts
export const PRODUCT_NAME_MAX = 80      // same as CUSTOMER_NAME_MAX_LENGTH
export const CATEGORY_MAX = 40
export const UNIT_MAX = 20

/** Trims and collapses repeated spaces. */
export function normalizeProductText(raw: string): string

/** An existing value matching ignoring case ("plumbing" -> "Plumbing"), else the normalized input. */
export function matchExisting(raw: string, existing: string[]): string

/** "Nails & Screws" -> "NAI". Up to three letters A-Z of the category. Null when it has none. */
export function skuPrefixForCategory(category: string): string | null

/** The next free SKU for the category (section 5.2). Checks both SKUs and ids. */
export function nextProductSku(category: string, products: Product[]): string

export function validateNewProduct(
  input: NewProductInput, products: Product[],
): ValidationResult
```

`NewProductInput` is `{ name: string; category: string; unit: string; price: Centavos;
reorderLevel: number; openingStock: number; isActive: boolean }`.

### 4.3 Store (`src/stores/useShopStore.ts`)

```ts
export type AddProductInput = NewProductInput
export type AddProductResult =
  | { ok: true; product: Product; movement: StockMovement }
  | { ok: false; message: string }

addProduct: (input: AddProductInput) => AddProductResult
```

And for editing (decision Q1):

```ts
export type ProductChanges = Partial<Pick<Product,
  'name' | 'category' | 'price' | 'reorderLevel' | 'isActive'>>
updateProduct: (productId: string, changes: ProductChanges) => ActionResult
```

### 4.4 Persistence

No change to the stored shape for this spec. The phase 4 version bump (2 to 3) is defined in
`04-sale-cancellation-spec.md` s.4.4. New products and their opening movements are ordinary
`products` and `movements` records.

---

## 5. Rules

### 5.1 Fields

| Field | Rule | Message |
| ----- | ---- | ------- |
| Name | Normalized; 1 to 80 characters; no other product with the same name ignoring case (precedent: `validateNewCustomer`: two identical names in POS search cannot be told apart) | "Enter the product name." / "Keep the name under 80 characters." / "<name> is already in the product list." |
| Category | Pick an existing one, or type a new one (D9: new categories allowed). Typed text matching an existing category ignoring case uses the existing spelling (`matchExisting`). 1 to 40 characters, at least one letter (needed for the SKU) | "Choose or type a category." / "A category needs at least one letter." |
| Unit | Pick an existing unit (pcs, sack, kg ... from the products) or type a new one, matched the same way. 1 to 20 characters. One unit per product (D2) | "Choose or type a unit." |
| Price | Typed in pesos, parsed with `parseAmountInput` to integer centavos; more than zero ("Every product has exactly one selling price") | "Enter a price greater than zero." |
| Reorder At | Whole number, zero or more (glossary label) | "Enter a whole number, 0 or more." |
| Opening stock | Whole number, zero or more (D2). Defaults to 0 | same |
| Active | Checkbox "Available for sale", on by default | none |
| SKU | Not typed. Shown read-only; assigned on save (5.2) | none |

Rules live in `src/domain/product.ts`; the form's Zod schema in
`src/features/products/lib/productForm.ts` calls them, and `addProduct` checks again (Handbook
s.21: enforced in the domain or store, not only the UI).

### 5.2 SKU (auto-generated, D9)

**Decided (owner, 2026-11-01):** the SKU is generated, never typed. The owner asked for the
category prefix used by existing SKUs. The catalogue does not have one: existing SKUs are
product-family codes, not category codes. Cement holds CEM, AGG and CHB; Tools has five different
prefixes (HSB, HAM, SDS, MTP, WRN); TAP appears in both Hardware and Electrical; Plumbing has PVC,
PVCE, FCT, TEF and BVL. Only Cement (CEM) and Nails & Screws (NAI) match their category name.

So the rule, deterministic and unique (owner, 2026-11-01, decision Q2):

1. **Prefix:** the first three letters A to Z of the category name, upper-cased, ignoring spaces
   and symbols (`skuPrefixForCategory`). Fewer than three letters uses what there is ("GI" ->
   "GI").
2. **Number:** one more than the highest number already used with that prefix, three digits:
   `nextSequentialId(prefix + '-', [...skus, ...ids], 3)`. "PVC-" does not match "PVCE-050", so
   prefixes never collide by accident. Past 999 it simply grows to four digits.
3. **Unique:** checked against every product's SKU and id. Two categories that share a prefix
   ("Paints", "Paint Sundries") share one number sequence, so they still never collide.
4. The form previews it; the store computes it again at save, from the data at that moment.

| Category | Prefix | Existing with that prefix | New SKU |
| -------- | ------ | ------------------------- | ------- |
| Cement | CEM | CEM-001, CEM-002 | CEM-003 |
| Nails & Screws | NAI | NAI-200, NAI-300 | NAI-301 |
| Plumbing | PLU | none | PLU-001 |
| Tools | TOO | none | TOO-001 |
| Garden (new) | GAR | none | GAR-001 |

A SKU never changes after it is assigned, even if the category later changes (it is the product's
identifier, glossary).

### 5.3 Opening stock

**Decided (owner, D9):** stock only changes through movements. `addProduct` writes, in **one
`set` call**:

1. The product, with `stock` = opening stock and `id` = `sku`.
2. `buildOpeningStockMovement({ productId, quantity: openingStock, occurredAt: now, recordedBy:
   CURRENT_USER.name })`: type `stock_in`, reference `OPENING`, description "Opening stock",
   id `MOV-OPEN-<id>` (the existing convention in `inventory.ts`).

The movement is written **even when the opening stock is 0**, as the seed does for every product
(`seedSales.ts`, "Every product gets one, even when it opened with nothing"), so each product's
log starts on the day it was added. Stock then always equals the sum of movements, which
`reconcileOpeningStock` checks on every load.

### 5.4 Product Details content

All read from the store at render time (E3, E4):

- Product facts: name, SKU, category, unit, price, Reorder At, Active or Inactive.
- Current Stock with its unit and status (`deriveStockStatus`).
- Totals from `summarizeMovements` over the product's movements: received (opening stock
  included), sold, returned from cancelled sales, adjusted (net).
- Latest 10 movements (`filterMovements({ productId })`), with "View all" to
  `ROUTES.movementsFor(id)`.
- Latest 10 sales containing the product, any status, newest first: sale number, when, customer,
  quantity, unit price **as sold** (`SaleLine.unitPrice`), amount, and a Cancelled marker. Pure
  helper `productSalesHistory(sales, productId, limit)` in
  `src/features/products/lib/productDetail.ts`.

### 5.5 Editing (owner, 2026-11-01, decision Q1)

- Editable: name, category, price, Reorder At, active. Same rules as 5.1; the name must not match
  another product (itself excluded).
- Never editable: SKU (identifier), unit (D2: stock and history are counted in it), stock
  (movements only, Handbook s.18).
- A price change never alters history: each `SaleLine` copies `unitPrice` at sale time
  (`types.ts`). A cart in progress is priced at checkout from the current price (`recordSale`).
  Held sales already flag "Prices changed" (D6, Q5).
- Deactivating hides nothing from history; `recordSale` already refuses inactive products.
- No audit record of the edit (`04-business-rules.md` Audit covers sales, payments and inventory
  transactions only).

---

## 6. Who May Do It

Whoever is at the till (D3). `05-user-roles.md` says only the owner manages prices; without a
login that cannot be enforced in V1, as for every other action.

---

## 7. Screens and States

### 7.1 Add Product (`NewProductPage.tsx`, `ROUTES.newProduct`)

One card, single column, like Receive Stock (`ReceiveStockView.tsx`), shared `FormField`,
`TextInput`, `SelectField`.

- Fields in the order of 5.1. Category and Unit are selects of existing values plus a last option
  "New category..." / "New unit..." that reveals a text input. Price uses `inputMode="decimal"`
  with a PHP prefix. Opening stock's label carries the unit: "Opening stock (sack)".
- SKU preview line under Category: "SKU: CEM-003, assigned when you save." Blank until a category
  is chosen.
- Buttons: **Cancel** (to `ROUTES.products`) and **Add Product** (primary). Enter submits.
- **Errors:** each field's message under it; a store refusal in an error `Alert` above the
  buttons; everything typed is kept (Handbook s.17).
- **Success:** navigate to `ROUTES.productDetail(id)` with router state; the page shows "Product
  added. Opening stock: 25 sack." as a success notice.

### 7.2 Product Details (`ProductDetailPage.tsx`, `ROUTES.productDetail`)

- **Header card:** name, SKU, category, unit, price, Reorder At, status pill; Inactive shows a
  neutral "Not for sale" pill. Actions: **Receive Stock** (`ROUTES.receiveStockFor(id)`), **Stock
  history** (`ROUTES.movementsFor(id)`), and **Edit Product** (dialog,
  shared `Dialog`).
- **Stock card:** Current Stock large, status pill, and the four totals.
- **Stock Movements card:** columns When, Type (`MovementTypePill` from
  `src/components/common/StatusPills.tsx`), Change (+/-), Reference, Details, Recorded By. A sale
  number links to that sale; an invoice number links to the invoice once
  `04-supplier-invoices-spec.md` is built. A reference with no target is plain text.
- **Recent Sales card:** as 5.4; Sale No. links to `ROUTES.saleDetail`.
- **Empty states:** no sales: "Not sold yet." No movements (only possible for corrupt data): "No
  stock movements yet."
- **Not found:** the pattern of `SaleCompletePage`: "Product not found. This product is not saved
  on this device. It may have been removed by a demo data reset." and **Back to Products**.

### 7.3 Products list (`ProductListCard.tsx`)

Today the product name is plain text; only the eye icon and the "View details" menu item link to
details (verified in `ProductListCard.tsx`, `ProductRowActions.tsx`). The name becomes a link to
`ROUTES.productDetail(id)`. The eye icon stays.

---

## 8. Edge Cases

| Case | Expected |
| ---- | -------- |
| New product in a new category "Garden" | SKU GAR-001; category appears in the Products filter |
| Category typed "cement " | Stored as "Cement"; SKU CEM-003 |
| Category "123" | Refused: needs a letter |
| Two products added to Cement in a row | CEM-003, then CEM-004 |
| Name "pvc pipe 1/2\"" | Refused: already in the product list |
| Opening stock 0 | Product Out of Stock; one "Opening stock +0" movement; POS shows it disabled (E7) |
| Inactive at creation | Saved; not sellable; details shows "Not for sale" |
| Price "0" or "abc" | Refused |
| Reload after adding | Product, SKU and opening movement survive |
| `/products/NOPE` | Not found state |
| Product sold then sale cancelled | Recent Sales shows it with Cancelled; movements show Sale and Reversal |

---

## 9. Acceptance Criteria

- [ ] **AC1** Add Product creates an active (or inactive) product with name, category (existing or
      new), unit, price in centavos, Reorder At and opening stock.
- [ ] **AC2** The SKU is generated by 5.2, is unique, and is shown before saving.
- [ ] **AC3** Opening stock is recorded as one `stock_in` movement described "Opening stock", even
      at 0; product stock equals the sum of its movements.
- [ ] **AC4** Invalid input is refused with the messages in 5.1, in the form and in the store.
- [ ] **AC5** Product Details shows the product's facts, Current Stock and status, its movement
      history and the sales it appeared in, all from store data.
- [ ] **AC6** Product names in the Products list link to Product Details.
- [ ] **AC7** The new product can be found and sold at the POS straight away.
- [ ] **AC8** Editing changes only the allowed fields and never alters a past
      sale.
- [ ] **AC9** Works at 390, 768 and 1280 px; form usable by keyboard; `npm run verify` passes;
      `npm run test:e2e` covers B1 to B5.

---

## 10. Test Cases

### 10.1 Unit --- `src/domain/product.test.ts` (data-layer-engineer)

| ID | Function | Case | Expected |
| -- | -------- | ---- | -------- |
| U1 | `skuPrefixForCategory` | "Cement", "Nails & Screws", "GI", "123" | CEM, NAI, GI, null |
| U2 | `nextProductSku` | Cement with the seed catalogue | CEM-003 |
| U3 | `nextProductSku` | Nails & Screws | NAI-301 |
| U4 | `nextProductSku` | new category "Garden" | GAR-001 |
| U5 | `nextProductSku` | an id (not SKU) already "GAR-001" | GAR-002 |
| U6 | `matchExisting` | "cement ", ["Cement"] | "Cement" |
| U7 | `validateNewProduct` | duplicate name in other case | refused |
| U8 | `validateNewProduct` | price 0, reorder -1, opening 2.5 | each refused |

### 10.2 Store (data-layer-engineer)

| ID | Case | Expected |
| -- | ---- | -------- |
| S1 | `addProduct` valid, opening 25 | product with id = sku, stock 25; one opening movement; `stockFromMovements` = 25 |
| S2 | `addProduct` opening 0 | movement with delta 0 written |
| S3 | `addProduct` invalid | `ok: false`; nothing written |
| S4 | Add then `addToCart` and `recordSale` | sale recorded with the new product |
| S5 | `updateProduct` price | product price changed; past sale lines unchanged |

### 10.3 Feature lib (products-engineer)

| ID | Function | Case | Expected |
| -- | -------- | ---- | -------- |
| F1 | `addProductSchema` | blank fields, bad price text | field errors with 5.1 messages |
| F2 | `productSalesHistory` | product in 12 sales, one cancelled | 10 newest; cancelled flagged; unit price as sold |

### 10.4 End to end --- `e2e/products.spec.ts` (new, products-engineer; qa-engineer runs)

| ID | Steps | Expected |
| -- | ----- | -------- |
| B1 | Products, Add Product; category "New category..." "Garden", unit "pcs", price 150, Reorder At 5, opening 12 | SKU preview GAR-001; after save, details shows 12 pcs, In Stock, one Opening stock movement |
| B2 | Submit with the name of a seeded product and price 0 | both errors shown; nothing added |
| B3 | Products list: click a product name | its details page; after selling 2 of it, Recent Sales lists the sale and stock is 2 lower |
| B4 | Add a product, reload, open POS, search it | still there, sellable |
| B5 | Product Details, Edit Product: change the price; open an earlier sale of it | details show the new price; the old sale keeps its price; SKU and unit not editable |

---

## 11. Decisions

The owner settled both questions on 2026-11-01, approving the recommendations. Recorded in D9.

| # | Question | Decision | Options set aside |
| - | -------- | -------- | ----------------- |
| Q1 | Can the owner edit a product on Product Details? | **Yes: name, category, price, Reorder At and active status.** Never SKU, unit or stock (section 5.5). | Price and active only; no editing in V1 |
| Q2 | Which SKU prefix? | **The first three letters of the category name plus the next free number** (section 5.2). | Most-used existing prefix in the category; an owner-written prefix table |

---

## 12. Build Order (all of phase 4)

```text
1. data-layer-engineer   ONE pass for all three 04 specs:
                         - product.ts (+ tests), addProduct, updateProduct
                         - saleCancellation.ts (+ tests), cancelSale, Sale.cancellation
                         - supplierInvoice.ts (+ tests), receiveInvoice (receiveStock stays
                           until step 2b), invoices slice, seed invoices INV-10018..10021
                         - shopPersistence.ts: version 3, MIGRATIONS[2], schemas, sanitizer
   ui-platform-engineer  In parallel with step 1 (no data dependency): ROUTES.invoices,
                         ROUTES.invoiceDetail and its pattern, App.tsx routes to InventoryPage
                         (04-supplier-invoices-spec.md s.7)
2. products-engineer     Add Product, Product Details, name links    (e2e/products.spec.ts)
   sales-engineer        Cancel Sale, cancelled states                (e2e/sales.spec.ts)
   inventory-engineer    Invoice receive form, Invoices list/detail   (e2e/inventory.spec.ts)
   dashboard-engineer    Recent Sales excludes cancelled (one line)
   (all parallel)
2b. data-layer-engineer  Remove receiveStock once the invoice form no longer calls it
3. code-reviewer         Review steps 1 and 2
4. qa-engineer           Every section 10 browser check of the three specs, plus checkout,
                         ledger and the version 2 to 3 upgrade with real saved data
```

Step 2 starts only after step 1's report lists every new export with its signature. Adding
`Sale.cancellation` breaks every place that builds a `Sale` (seed, `recordSale`,
`src/test/fixtures.ts`); the data layer updates them in step 1 so the build stays green.
