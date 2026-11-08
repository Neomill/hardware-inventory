# Locked Decisions

Status: Authoritative\
Date: 2026-08-22\
Phase: Before Phase 2 (Domain + Data Layer)

These decisions resolve contradictions between the design references in
`specs/01/` and the business documentation in `docs/`. They are locked
because each one changes the domain model, and the domain model is built
next.

Each entry records what was decided, why, what it forces elsewhere, and
the condition that would justify revisiting it.

---

# D1 --- Tax is VAT-inclusive with a configurable rate

## Decision

Product selling prices already include VAT. The sale total is the sum of
line totals minus any discount. **Tax is never added on top.**

VAT is displayed as a reference breakdown only.

## Rationale

Shelf prices in the store are the prices customers pay. A price tag
reading PHP 28.00 means the customer hands over PHP 28.00. Adding 12% at
the counter would contradict every posted price and confuse both the
cashier and the customer.

Official Receipts are issued only when requested (see
`08-observations.md`), so the VAT breakdown is a reporting concern, not a
checkout concern.

## Computation

Derive the net first, then take VAT as the remainder. This guarantees the
two components sum exactly to the total with no rounding drift:

``` text
netOfVat = round(total / (1 + rate))
vatAmount = total - netOfVat
```

Worked example at the design's figures:

``` text
Line items sum        PHP 631.00     (63100 centavos)
Discount                PHP 0.00
-------------------------------------
TOTAL                 PHP 631.00     (63100 centavos)
  net of VAT          PHP 563.39     (56339 centavos)
  VAT-inclusive 12%    PHP 67.61      (6761 centavos)
```

## Consequences

-   The rate is configurable in Settings. Default `0.12`.
-   `Sale.taxRate` is stamped onto every sale at write time. Historical
    sales keep the rate that was in force when they were recorded.
    Reports must never recompute past sales at the current rate.
-   The checkout and cart designs (`sales 2`, `sales 4`, `sales 5`,
    `sales 6`) add tax on top of the subtotal. Those designs are
    incorrect. See `specs/01/DESIGN-ERRATA.md`.
-   Cash tendered PHP 1,000.00 against this cart yields change of
    **PHP 369.00**, not the PHP 293.28 shown in the designs.

## Revisit when

The store becomes VAT-registered under a scheme that requires
tax-exclusive pricing, or begins issuing Official Receipts by default.

---

# D2 --- One selling unit per product

## Decision

Every product has exactly one unit. Receiving and selling use the same
unit. There is no unit conversion in Version 1.

## Rationale

`08-observations.md` notes that some products are purchased in sacks but
sold by kilogram. Modelling that properly requires a base unit plus
conversion factors, and every stock computation, KPI, and report then has
to be conversion-aware. That cost is not justified for a POC.

Splitting such products into two records keeps every stock figure a plain
sum.

## Consequences

-   `Product.unit` is a single `UnitCode`.
-   `deriveStockLevel()` is a sum of signed quantity deltas. No
    conversion logic anywhere.
-   Products sold in two units become two product records in the seed
    data (for example `Cement (Holcim)` by sack and `Cement (loose)` by
    kilogram). Their stock pools are independent.
-   The **Unit** dropdown in `sales 3 - add new product.png` becomes a
    static label. A product has one unit; there is nothing to choose.
-   Line quantities are positive **integers**. The quick-add steppers in
    the design (+1, +5, +10, +20, +50, +100) confirm this. Fractional
    quantities such as 2.5 kg are an explicit non-goal.

## Revisit when

The store needs to decant a single stock pool across two units, or needs
to sell fractional quantities.

---

# D3 --- No login, one fixed user

## Decision

Version 1 has no authentication, no login screen, and no route guards. A
single hardcoded current user is defined in `src/config/app.ts` and
stamped onto every record that changes state.

## Rationale

`PRD.md` lists Authentication in scope; the Developer Handbook section 6
excludes it from MVP scope. Every design reference shows a fixed user
chip (Juan Dela Cruz, Owner) and none shows a login screen. The designs
and the handbook agree, so the PRD's scope line is deferred.

## Consequences

-   `recordedBy` is a required field on `Sale`, `Payment`, and
    `InventoryTransaction`.
-   This field is what makes two already-required business rules
    implementable: the discount approver from `09-open-questions.md`, and
    the inventory-adjustment reason audit trail from Handbook section 18.
-   Adding the stamp now is cheap. Retrofitting it onto existing records
    later is not.
-   The user chip in the sidebar is presentational. It has no menu
    actions in Version 1.

## Revisit when

More than one person operates the till, or a backend exists to
authenticate against.

---

# D4 --- Reports occupies a nav slot now, ships in Phase 9

## Decision

Reports is added to the primary navigation immediately, routing to a
placeholder page. The module itself is implemented in Phase 9.

## Rationale

`PRD.md` lists Reports in scope. `sales 1 - root.png` and
`sales 7 - sales confirmation.png` show it in the sidebar; the other five
references do not. Deciding its position now means the sidebar geometry
is final and never shifts under the user.

## Consequences

-   `navigation.ts` gains a sixth primary item between Customer Ledger
    and the Settings group.
-   The five "View Report" and "View Details" deep links in
    `sales 1 - root.png` get real targets instead of dead ends.
-   `01-information-architecture.md` is amended to include Reports.
-   The seven design references that omit Reports from the sidebar are
    stale. See `specs/01/DESIGN-ERRATA.md`.

## Revisit when

Never for placement. The Phase 9 scope is open until the page is
designed.

---

# D5 --- Client-side only for the POC

## Decision

No backend, no API client, no server-side anything. All state lives in
the browser for the duration of the POC.

## Rationale

Confirmed product direction, consistent with `PRD.md`, Handbook section
13, and the initialization spec section 18. The POC exists to validate
workflows with the store, not infrastructure.

## Consequences

-   Repository **interfaces** are the architectural seam. Phase 2 ships
    in-memory implementations hydrated from the seed dataset.
-   UI components must never import a repository implementation. They
    depend on the interface only. This is what keeps the eventual API
    swap confined to one folder.
-   Persistence (localStorage, then IndexedDB) is deferred to Phase 10.
    Until then a page refresh resets to seed data. This is expected and
    acceptable for demos.
-   No authentication server, no sync, no migrations.

## Revisit when

Phase 10, or when the store wants to keep data between sessions.

---

# D6 --- Hold Sale is in V1, and held sales do not reserve stock

Date: 2026-10-04. Spec: `specs/03/03-hold-sale-spec.md` (Approved).

## Decision

The cashier can set an unfinished sale aside and resume any held sale
later, not only the newest. Specifically:

-   A held sale **does not reserve stock**. On resume, each line is
    re-checked: a quantity above current stock is reduced to it, and a
    line that is out of stock, inactive or missing is removed. The
    cashier is told about every change. Checkout checks stock again.
-   At most **10** held sales at once.
-   A held sale carries an optional **free-text label** (up to 40
    characters). No customer link in Version 1; the customer is still
    chosen at checkout.
-   Held sales are **kept until resumed or discarded**. Those from an
    earlier day are marked "From <day>". There is no automatic expiry.
-   If a product's **price changed** while the sale was held, the
    cashier is warned. The sale uses the current price.

## Rationale

Hold Sale appears only in the design references (`DESIGN-ERRATA.md`
E11), but it supports the documented counter workflow: the helper
brings each customer's slip and goods to the cashier, and one customer
may need to step away while the next is waiting
(`02-current-workflow.md`).

Stock stays the plain sum of stock movements (Handbook section 18). A
reservation would need either movements that are not real stock
changes, or a second "available" figure that every screen, KPI and
report would have to choose between.

## Consequences

-   `heldCarts: CartLine[][]` becomes `heldSales: HeldSale[]`, each
    with id, label, lines, time held and who held it. The storage
    version goes from 1 to 2, with a migration that keeps existing
    held carts.
-   The Sales root button is relabelled **Held Sales** (with its count
    badge) and opens a list with Resume and Discard. This overrides
    `sales 1 - root.png`.
-   `recordSale` must refuse inactive products, which a held sale could
    otherwise carry to checkout.
-   Discarding needs confirmation and changes no stock.

## Revisit when

Customers regularly lose items they were promised while a sale is
held (reconsider reservation), or the owner wants a held sale to
pre-select a ledger customer.

---

# D7 --- The dashboard NOTE widget is not in V1

Date: 2026-10-04. Spec: `specs/03/03-dashboard-note-spec.md` (Deferred).

## Decision

The NOTE card shown in `dashboard.png` is removed from Version 1. The
card is hidden and the hardcoded sentence copied from the screenshot is
deleted.

## Rationale

No document in `docs/` asks for a note. The information architecture
lists the Dashboard widgets and the note is not one of them. The
current card shows text copied from the screenshot, which E3 and E4
forbid.

## Consequences

-   Dashboard engineer removes the note from `useDashboardData`, the
    `DashboardData` type and the page, and deletes `NoteCard`. Recent
    Stock Movements takes the full row.
-   No store, domain or persistence change.
-   The spec keeps a proposal (one shared plain-text note, 280
    characters, editable by anyone at the till) for a later version.

## Revisit when

The owner wants a way to leave messages for the cashier at the till,
for example because the owner does not open the store
(`08-observations.md`). The proposal must be approved again first.

---

# D8 --- Any completed sale can be cancelled, with a reason

Date: 2026-11-01. Spec: `specs/04/04-sale-cancellation-spec.md` (Approved, owner,
2026-11-01).

## Decision

The owner decided:

-   Any completed sale, from any day, can be cancelled. A **reason is
    required**. The sale stays in history marked **Cancelled**, with who
    cancelled it, when and why. Completed sales are otherwise immutable.
-   Its stock comes back through one `sale_reversal` movement per line.
-   Reports, the customer ledger and the Dashboard leave it out.
-   A partial or credit sale **cannot be cancelled once the customer has
    paid something toward it**. The cashier is told why and what to do.
    The exact test: cancellation is blocked **only when the ledger has
    applied a customer payment to the sale** under its oldest-first
    allocation (spec section 5.3). The cashier is told: "Leave the sale
    as it is and tell the owner. Refunds are not recorded in this
    version."
-   **No refund records.** Money taken at the counter is shown as not
    refunded; any money handed back is handled outside the app.
-   The action is on the sale page, behind a confirmation dialog.

## Rationale

`09-open-questions.md` allows cashiers to cancel and keeps cancelled
sales for audit; `04-business-rules.md` keeps them in history. The model
already has `SaleStatus 'cancelled'` and the `sale_reversal` movement
type. Customer payments are not tied to a sale, so cancelling a sale
that a payment was applied to would leave that money belonging to
nothing; blocking it keeps every balance correct without refunds.

## Consequences

-   `Sale` gains `cancellation: { cancelledAt, cancelledBy, reason } |
    null`. The storage version goes from 2 to 3 (shared with D9 and D10),
    with a migration that sets it to null on existing sales.
-   The Dashboard Recent Sales list and the "Paid" status label change to
    leave out or name cancelled sales; reports and the ledger already do.
-   New store action `cancelSale`.

## Revisit when

The store needs refunds or partial returns, or the owner wants
cancelling restricted to the owner (needs a login, D3).

---

# D9 --- Add Product generates the SKU and records opening stock

Date: 2026-11-01. Spec: `specs/04/04-add-product-and-details-spec.md` (Approved, owner,
2026-11-01).

## Decision

The owner decided:

-   Add Product takes name, category, unit, price, reorder level,
    opening stock and active status. The **SKU is generated**, not typed:
    the **first three letters of the category name** plus the next free
    number (CEM-003, PLU-001). Existing SKUs carry product-family codes,
    not category codes, so this rule replaces guessing from them. New
    categories are allowed.
-   **Opening stock** is recorded as a `stock_in` movement described
    "Opening stock". Stock changes only through movements.
-   Product Details (`/products/:productId`) shows the product, its
    current stock and status, its stock movements and the sales it was
    in. Product names in the Products list link there.
-   The owner can **edit** name, category, price, reorder level and
    active status on Product Details. **Never** SKU, unit or stock. Past
    sales keep their own prices because each sale line copies the price.

## Rationale

The PRD and the information architecture list Products, Categories and
Product Details; both pages were placeholders waiting for a SKU rule and
an opening-stock rule. Opening stock as a movement follows the existing
convention in `src/domain/inventory.ts` and the seed.

## Consequences

-   New store actions `addProduct` and `updateProduct`; new
    `src/domain/product.ts`.
-   No change to the stored shape for products.

## Revisit when

The store starts labelling products with its own codes, or needs price
history.

---

# D10 --- A supplier invoice covers many products and is stored

Date: 2026-11-01. Spec: `specs/04/04-supplier-invoices-spec.md` (Approved, owner,
2026-11-01).

## Decision

The owner decided:

-   One invoice covers **many products**. It records supplier (free
    text), invoice number (`INV-NNNNN`, **unique**), invoice date, who
    received it (the fixed user, D3), the product lines with quantities,
    and the **total typed from the paper invoice**. There are no
    per-item costs.
-   Saving writes one `stock_in` movement per line with the invoice
    number as reference, and stores the invoice record.
-   Invoices can be listed and opened from Inventory.
-   The seeded receipts INV-10018 to INV-10021 become invoice records.
-   **An invoice is required** to receive stock. A delivery with no
    paper invoice is recorded with Adjust Stock (add, with a reason).
-   Receipts saved before this change **stay as stock movements**; they
    are not turned into invoices, and their numbers stay reserved.

## Rationale

`09-open-questions.md` lists what Version 1 records for a supplier
invoice. Today's Receive Stock takes one product per save and keeps no
invoice, so a delivery is re-typed line by line and its total is lost.

## Consequences

-   New `SupplierInvoice` type and `invoices` store slice; storage
    version 3 (shared with D8 and D9).
-   Receive Stock becomes the invoice form; `receiveStock` is replaced by
    `receiveInvoice` (one flow, spec section 5.1).
-   A fourth Inventory tab, Invoices, with a detail page.

## Revisit when

The store wants unit costs and margins, scanned invoices, or a supplier
list.
