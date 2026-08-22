# Domain and Data Layer Specification

**Project:** Olaer Store\
**Phase:** 2 --- Domain and Data Layer\
**Scope:** Domain model, pure logic, repository boundary, seed dataset\
**Status:** Ready to implement\
**Backend:** Not included\
**UI:** None in this phase

---

## 1. Objective

Build the shared foundation that Dashboard, Products, Sales, Inventory,
Customer Ledger, and Reports all read from, before any of those screens
exist.

This phase produces **no user interface**. Its entire output is types,
pure functions, repository interfaces, in-memory implementations, one
coherent seed dataset, and the unit tests that prove the arithmetic.

### Why this comes first

The three designed screens are not independent. Dashboard, Products, and
Sales read and write the same five things: products, stock, sales,
customers, and ledger entries. Building them feature by feature with
per-feature mock data produces three incompatible datasets and forces a
rewrite of all three when Inventory and Customer Ledger arrive.

Handbook section 18 already states the resolution: _"Inventory changes
only through transactions. Never edit stock directly."_ If stock is a
**derived** value computed from an inventory transaction log, and a
completed sale emits its records atomically, then:

- Inventory is a view over data Sales already wrote
- Customer Ledger is a view over data Sales already wrote
- Reports are an aggregation over data Sales already wrote
- Dashboard KPIs reconcile with Products stock badges because they are
  the same computation

The four undesigned modules become assembly work rather than
re-architecture. That is the entire purpose of this phase.

---

## 2. Source of Truth

Read before implementing:

```text
docs/PRD.md
docs/product/00-developer-handbook.md
docs/business/04-business-rules.md
docs/business/08-observations.md
docs/business/09-open-questions.md
docs/business/10-decisions.md      <- decisions D1 to D5, authoritative
specs/01/DESIGN-ERRATA.md          <- overrides the PNG references
```

The design PNGs in `specs/01/` are layout references only. **Do not
transcribe any figure from a screenshot.** See `DESIGN-ERRATA.md` E2, E3,
E4.

---

## 3. Non-Goals

Explicitly out of scope for this phase:

- Any React component, page, hook, or route change
- Any styling or design-system work
- Any backend, API client, or network call
- Persistence of any kind (localStorage, IndexedDB) --- deferred to
  Phase 10 per D5
- Authentication or route guards --- per D3
- Unit conversion --- per D2
- Fractional line quantities --- per D2
- Barcode input --- per E8
- Hold Sale and the dashboard NOTE widget --- unspecified, per E11

---

## 4. Structure

```text
src/
├── domain/                 Pure. No React, no I/O, no imports from features.
│   ├── money.ts
│   ├── units.ts
│   ├── product.ts
│   ├── customer.ts
│   ├── sale.ts
│   ├── inventory.ts
│   ├── ledger.ts
│   └── ids.ts
│
├── data/
│   ├── repositories/       Interfaces + in-memory implementations
│   │   ├── types.ts
│   │   └── inMemory/
│   └── mock/               One coherent seed dataset
│       └── seed.ts
│
└── features/sales/services/
    └── recordSale.ts       The atomic checkout use case
```

`src/domain/` must remain importable by a plain Node test with no DOM.
Enforce it by keeping it free of any `react` or `@/components` import.

---

## 5. Money

### Rule

**All monetary values are integer centavos.** No floating-point
arithmetic on money anywhere in the codebase.

```ts
/** An amount in centavos. 63100 means PHP 631.00. */
export type Centavos = number;
```

### Rationale

The design's own figures demonstrate the hazard: a 12% VAT component of
PHP 631.00, and later partial payments against that balance, produce
sub-centavo residues under float arithmetic. Those residues accumulate
into ledger balances that never reach exactly zero, and a customer whose
debt shows PHP 0.01 forever is a support call the store cannot resolve.

### Required functions

```ts
fromPesos(pesos: number): Centavos
toPesos(amount: Centavos): number
parseAmountInput(raw: string): Centavos | null   // cashier keypad input
applyRate(amount: Centavos, rate: number): Centavos   // single rounding point
```

Rounding is half-up, applied once, only inside `applyRate`.

### Required change to existing code

`formatCurrency` in `src/lib/format.ts` currently accepts pesos as a
`number`. It must be changed to accept `Centavos`, so that no caller can
pass a float by accident. Update its doc comment accordingly.

---

## 6. VAT

Per **D1**, VAT is inclusive and never added to a total.

```ts
export type VatBreakdown = { net: Centavos; vat: Centavos };

export function breakDownVat(total: Centavos, rate: number): VatBreakdown;
```

Derive `net` first, then take `vat` as the remainder, so the two always
sum exactly to `total`:

```text
net = round(total / (1 + rate))
vat = total - net
```

`rate` comes from settings, defaults to `0.12`, and is **stamped onto
each sale at write time** as `Sale.taxRate`. Reports must use the stored
rate for historical sales and never recompute at the current rate.

---

## 7. Domain Types

Field lists below are the required minimum. Add only what a rule in
`docs/` demands.

### Product

```ts
type Product = {
  id: ProductId;
  name: string; // 'PVC Pipe 1/2"'
  sku: string; // 'PVC-050', unique
  categoryId: CategoryId;
  unit: UnitCode; // exactly one, per D2
  price: Centavos; // VAT-inclusive selling price, per D1
  reorderLevel: number; // drives Low Stock, per E3
  isActive: boolean; // inactive products cannot be sold
  imageUrl?: string;
};
```

`Product` carries **no stock field.** Stock is derived. This is the
single most important constraint in the phase.

### Sale

```ts
type SaleStatus = "completed" | "cancelled";
type PaymentMethod = "cash" | "partial" | "credit";
type DiscountType = "none" | "fixed" | "percent";

type SaleLine = {
  productId: ProductId;
  productName: string; // denormalised: a past sale must not change
  sku: string; //   when a product is later renamed or repriced
  unit: UnitCode;
  unitPrice: Centavos;
  quantity: number; // positive integer, per D2
  lineTotal: Centavos; // unitPrice * quantity
};

type Sale = {
  id: SaleId;
  saleNumber: string; // '#20250521-0042', per E6
  lines: SaleLine[];
  subtotal: Centavos; // sum of lineTotal
  discountType: DiscountType;
  discountValue: number; // centavos if fixed, basis points if percent
  discountAmount: Centavos;
  total: Centavos; // subtotal - discountAmount
  taxRate: number; // stamped at write time, per D1
  paymentMethod: PaymentMethod;
  amountPaid: Centavos;
  changeGiven: Centavos;
  customerId: CustomerId | null; // null only for cash, per E5
  status: SaleStatus;
  recordedBy: UserId; // per D3
  approvedBy: UserId | null; // required when discountAmount > 0
  occurredAt: string; // ISO 8601
};
```

Line fields are denormalised deliberately. Completed sales cannot be
edited (business rule), so a sale must remain a faithful record even
after the product it references is renamed, repriced, or deactivated.

### Discount

`percent` is stored in **basis points** to stay integral: `500` means
5.00%.

```text
fixed:    discountAmount = min(discountValue, subtotal)
percent:  discountAmount = applyRate(subtotal, discountValue / 10000)
```

`discountAmount` is capped at `subtotal`. A total can never be negative.
`approvedBy` is required whenever `discountAmount > 0`, per
`09-open-questions.md`.

### InventoryTransaction

```ts
type InventoryTransactionType =
  | "stock_in" // received from supplier
  | "sale" // sold, negative delta
  | "sale_reversal" // sale cancelled, positive delta
  | "adjustment"; // manual correction, reason required

type InventoryTransaction = {
  id: TransactionId;
  productId: ProductId;
  type: InventoryTransactionType;
  quantityDelta: number; // SIGNED. -5 for a sale of 5.
  reference: string; // sale number or 'INV-10021', per E6
  reason: string | null; // required when type is 'adjustment'
  recordedBy: UserId;
  occurredAt: string;
};
```

### LedgerEntry

```ts
type LedgerEntryType = "charge" | "payment" | "reversal";

type LedgerEntry = {
  id: LedgerEntryId;
  customerId: CustomerId;
  type: LedgerEntryType;
  amount: Centavos; // SIGNED. charge positive, payment negative.
  saleId: SaleId | null;
  reference: string;
  recordedBy: UserId;
  occurredAt: string;
};
```

---

## 8. Pure Functions

Every function in this section is deterministic, side-effect free, and
directly unit tested.

```ts
// sale.ts
computeSaleTotals(lines, discountType, discountValue): SaleTotals
computeChange(total, amountPaid): Centavos
validateCheckout(draft): ValidationResult   // enforces E5 and stock caps

// inventory.ts
deriveStockLevel(transactions): number       // sum of quantityDelta
deriveStockLevels(transactions): Map<ProductId, number>
isLowStock(stock, reorderLevel): boolean     // stock <= reorderLevel
stockStatus(stock, reorderLevel): 'in_stock' | 'low_stock' | 'out_of_stock'

// ledger.ts
computeOutstanding(entries): Centavos        // sum of amount
computeOutstandingByCustomer(entries): Map<CustomerId, Centavos>
```

### Payment mode rules

```text
cash      amountPaid >= total
          change = amountPaid - total
          customer optional
          no ledger entry

partial   0 < amountPaid < total
          change = 0
          customer REQUIRED  (E5)
          ledger charge of (total - amountPaid)

credit    amountPaid = 0
          change = 0
          customer REQUIRED  (E5)
          ledger charge of total
```

---

## 9. Repository Boundary

Per **D5**, repository interfaces are the seam that keeps a future
backend a one-folder change.

```ts
interface ProductRepository {
  list(query?: ProductQuery): Product[];
  findById(id: ProductId): Product | undefined;
  findBySku(sku: string): Product | undefined;
}

interface InventoryTransactionRepository {
  listByProduct(productId: ProductId): InventoryTransaction[];
  listAll(range?: DateRange): InventoryTransaction[];
  append(entries: InventoryTransaction[]): void;
}
```

Plus `CustomerRepository`, `SaleRepository`, and `LedgerRepository`
following the same shape.

### Hard rules

- UI components import **interfaces only**, never an implementation.
- Implementations live in `src/data/repositories/inMemory/` and are
  wired in exactly one place.
- No repository method performs business calculation. Repositories
  store and retrieve; `src/domain/` computes.

---

## 10. The Atomic Checkout

This is the highest-value function in the codebase. Everything Inventory,
Ledger, and Reports later display is whatever this function writes.

```ts
// src/features/sales/services/recordSale.ts
function recordSale(draft: SaleDraft, repos: Repositories): RecordSaleResult;
```

A single successful call emits, together:

```text
1. one Sale                             status 'completed'
2. one InventoryTransaction per line     type 'sale', negative delta
3. one LedgerEntry                       only when partial or credit
```

### Requirements

- **Validate before writing.** Re-check stock availability at confirm
  time, not only at add-to-cart time.
- **Reject** any line that would drive stock below zero. Inventory can
  never be negative (business rule).
- **Reject** partial or credit without a customer, per E5.
- **All or nothing.** A rejected sale writes nothing at all. No
  partially applied stock deductions.
- `cancelSale(saleId)` sets status to `cancelled`, emits
  `sale_reversal` transactions restoring stock, and emits a ledger
  `reversal` where a charge existed. The original sale row **remains**
  in history (business rule).

---

## 11. Seed Dataset

One coherent world in `src/data/mock/seed.ts`. Coherent means every
screen agrees **because every figure is computed from the same
transaction log**, not because three files were hand-tuned to match.

### Requirements

- Roughly 40 products across the categories in the references:
  Plumbing, Cement, Nails & Screws, Pipes, Hardware, Paints,
  Electrical, Tools, Safety
- Include the twelve products visible in the designs with their SKUs,
  units, and prices (PVC-050, CEM-001, NAI-200, GI-100, SP-120,
  PNT-701, WIR-020, PVCE-050, DK-001, THN-001, and the screw and
  masking tape lines)
- At least one product at zero stock, to exercise E7
- At least three below reorder level, to populate Low Stock
- 8 customers, including Juan Dela Cruz, Pedro Santos, and Maria Reyes
  from the references
- Roughly 60 days of sales across all three payment methods, including
  at least one cancelled sale
- At least two customers carrying multiple unpaid balances
  (`09-open-questions.md`)
- Supplier stock-in transactions with `INV-NNNNN` references

### The critical constraint

**The seed emits transactions, not stock numbers.** Every stock level in
the application is the sum of that product's transaction deltas. There is
no authored stock figure anywhere in the seed data.

Per E3 and E4, the seed will produce different totals than the
screenshots show. That is correct and expected. Nothing in the codebase
hardcodes `2,153` or `PHP 42,560.00`.

Seed timestamps are generated relative to a single injected `now`, so
that "today" is always today when the POC is demonstrated.

---

## 12. Testing

Vitest is already configured. Required coverage:

| Area       | Must prove                                                |
| ---------- | --------------------------------------------------------- |
| money      | No float drift; `parseAmountInput` rejects junk           |
| VAT        | `net + vat === total` exactly, across many totals         |
| totals     | Line sums, fixed and percent discounts, cap at subtotal   |
| change     | Cash tendered above, equal to, and below total            |
| stock      | Derivation from a log; low and out-of-stock thresholds    |
| ledger     | Multiple charges and partial payments settle to exactly 0 |
| recordSale | Emits all three record types; rejects atomically          |
| cancelSale | Restores stock; original sale survives                    |

The ledger test is the one that matters most: a customer with three
credit sales and four partial payments totalling the same amount must end
at exactly `0`, not `1` centavo.

---

## 13. Definition of Done

- [ ] `src/domain/` contains no React import and no I/O
- [ ] All money is `Centavos`; no float arithmetic on money
- [ ] `formatCurrency` accepts `Centavos`
- [ ] `Product` has no stock field
- [ ] Stock is derived from the transaction log in every code path
- [ ] VAT is inclusive; `net + vat === total` exactly
- [ ] `Sale.taxRate` is stamped at write time
- [ ] Discount supports fixed and percent, capped, with `approvedBy`
- [ ] `recordSale` emits Sale + InventoryTransactions + LedgerEntry
      atomically
- [ ] `recordSale` rejects negative stock and customerless credit
- [ ] `cancelSale` reverses stock and ledger, keeps the sale
- [ ] Repository interfaces defined; in-memory implementations wired
      once
- [ ] Seed dataset authored as transactions only, no stock figures
- [ ] Seed reconciles: derived stock, KPIs, and balances all agree
- [ ] Unit tests cover every table row in section 12
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] No UI file was modified except `src/lib/format.ts`
- [ ] No backend, no persistence, no auth

---

## 14. What Comes After

```text
Phase 3   Design-system primitives
Phase 4   Products
Phase 5   Sales / POS
Phase 6   Dashboard
Phase 7   Inventory
Phase 8   Customer Ledger
Phase 9   Reports + Settings
Phase 10  Persistence
```

Phase 3 extracts the recurring primitives from the design references.
Phases 4 through 9 are assembly over the foundation built here.
