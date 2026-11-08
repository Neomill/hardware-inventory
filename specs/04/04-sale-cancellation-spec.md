# Sale Cancellation Specification

**Project:** Olaer Store\
**Phase:** 4 --- Sale cancellation, Add Product and Product Details, supplier invoices\
**Scope:** Cancelling a completed sale, with a reason, returning its stock\
**Status:** Approved (owner, 2026-11-01) --- decision D8; every question settled (section 11)\
**Backend:** Not included (D5)\
**Owners:** `data-layer-engineer`, then `sales-engineer` and `dashboard-engineer`, then
`code-reviewer` and `qa-engineer`

---

## 1. Objective

Let the cashier cancel a completed sale that should not have been recorded: a wrong item, a
customer who changed their mind before leaving, a sale keyed in twice. The cancelled sale stays
in history, marked Cancelled with who, when and why; its stock comes back through stock
movements; and it stops counting in every total.

### Why the store needs it

- `09-open-questions.md`, Sales: "Cashiers are allowed to cancel a sale. Cancelled sales should
  remain in the system for audit purposes."
- `04-business-rules.md`: "Completed sales cannot be edited. Cancelled sales remain in history."
- Handbook s.18: "Cancelled sales remain in history." Glossary, Stock Movement: a movement can be
  "a cancellation reversal".
- The model was built for it in Phase 2: `SaleStatus = 'completed' | 'cancelled'` and
  `MovementType` includes `'sale_reversal'` (`src/domain/types.ts`). No action uses either yet.

Today a mistaken sale cannot be undone at all: stock stays reduced and the money stays in the
day's sales.

---

## 2. Source of Truth

```text
docs/business/04-business-rules.md       Completed sales cannot be edited; cancelled remain; audit
docs/business/05-user-roles.md           Cashier: "Cannot delete sales" (cancelling is not deleting)
docs/business/09-open-questions.md       Sales: cashiers may cancel; kept for audit
docs/business/10-decisions.md            D3 (one fixed user), D5, D8 (this spec)
docs/product/00-developer-handbook.md    s.17 confirm destructive actions, s.18, s.21
src/domain/types.ts                      Sale, SaleStatus, StockMovement, MovementType
src/domain/ledger.ts                     chargedAmount, remainingBySale (oldest-first allocation)
src/domain/reports.ts                    completedSalesIn
src/features/sales/lib/salesMetrics.ts   computeSalesMetrics, describeSettlement
src/features/sales/pages/SaleCompletePage.tsx
src/features/dashboard/lib/dashboardMetrics.ts
src/stores/useShopStore.ts, src/stores/shopPersistence.ts (SHOP_STORAGE_VERSION = 2)
```

---

## 3. Non-Goals

- **Refunds.** No refund record, no money movement, no "refunded" figure (D8). What happens to
  cash already taken is stated on screen (section 5.6) and handled outside the app.
- Partial cancellation (one line of a sale) or returning some of the goods. A sale is cancelled
  whole or not at all.
- Un-cancelling. A cancelled sale stays cancelled; the cashier records a new sale if needed.
- Editing a completed sale in any other way. Completed sales stay immutable (CLAUDE.md).
- Approval by the owner, PINs or roles. One fixed user, no login (D3).
- Showing a cancelled charge as a line on the customer's ledger statement (D8: the ledger
  excludes it; the sale stays in sales history).
- A full sales history page. The Sales root's Recent Sales search already finds any sale by number
  or customer, and the ledger links to each charge.

---

## 4. Data Model Changes

### 4.1 Types (`src/domain/types.ts`)

```ts
/** Who cancelled a sale, when and why (D8). */
export type SaleCancellation = {
  /** ISO 8601. */
  cancelledAt: string
  /** CURRENT_USER.name (D3). */
  cancelledBy: string
  /** Trimmed, 1 to CANCEL_REASON_MAX characters. */
  reason: string
}

export type Sale = {
  // ...every existing field, unchanged...
  /** Null while the sale stands. Set once, when status becomes 'cancelled'. */
  cancellation: SaleCancellation | null
}
```

`StockMovement.reason`'s comment changes to "Required for an adjustment and a sale reversal, null
otherwise."

### 4.2 Pure functions (`src/domain/saleCancellation.ts`, new)

```ts
/** Same limit as the stock adjustment reason (src/features/inventory/lib/stockForms.ts). */
export const CANCEL_REASON_MAX = 120

export function validateCancelReason(raw: string): ValidationResult

/** Customer payments the ledger has applied to this sale (0 for cash and walk-in sales). */
export function appliedToSale(sale: Sale, sales: Sale[], payments: CustomerPayment[]): Centavos

export type CancelCheck =
  | { ok: true }
  | { ok: false; kind: 'already_cancelled' | 'payments_applied'; message: string }

export function checkCancellable(
  sale: Sale, sales: Sale[], payments: CustomerPayment[],
): CancelCheck

/** One 'sale_reversal' per line (section 5.4). */
export function buildSaleReversalMovements(
  sale: Sale, cancellation: SaleCancellation,
): StockMovement[]

/** The sentence about money taken at the counter (section 5.6), or null when none was taken. */
export function describeCounterMoney(sale: Sale): string | null
```

### 4.3 Store (`src/stores/useShopStore.ts`)

```ts
export type CancelSaleInput = { saleId: string; reason: string }
export type CancelSaleResult =
  | { ok: true; sale: Sale; movements: StockMovement[] }
  | { ok: false; message: string }

cancelSale: (input: CancelSaleInput) => CancelSaleResult
```

`recordSale` and the seed (`src/data/mock/seedSales.ts`) write `cancellation: null`. The test
fixture `testSale` in `src/test/fixtures.ts` defaults it to `null`.

### 4.4 Persistence (`src/stores/shopPersistence.ts`) --- shared with the other two 04 specs

One bump for all of phase 4: `SHOP_STORAGE_VERSION` goes from **2 to 3**. `MIGRATIONS[2]` does
every phase 4 change in one step, so a browser holding version 2 data loads it with nothing lost:

1. Every sale without a `cancellation` key gets `cancellation: null`. A sale already stored with
   `status: 'cancelled'` (the app could never produce one, but stored data might) gets
   `{ cancelledAt: sale.occurredAt, cancelledBy: 'System', reason: 'Cancelled before reasons were
   recorded' }`.
2. `invoices: []` when the key is missing (spec `04-supplier-invoices-spec.md` s.4.4).

Versions 0 and 1 reach it through the existing loop in `runPersistedMigrations`.

`saleSchema` gains `cancellation: z.object({ cancelledAt: timestamp, cancelledBy: z.string(),
reason: z.string() }).nullable()`. A sale whose `cancellation` key is missing after migration is
read as `null`, not rejected: sales are never dropped, so a strict check would turn one odd
record into a full reset (see `inspectPersistedShop`). No check ties `status` to `cancellation`
on load, for the same reason; the store keeps them in step.

---

## 5. Rules

### 5.1 What can be cancelled

**Decided (owner, 2026-11-01, D8):** any sale with `status: 'completed'`, from any day, of any
payment type, unless section 5.3 blocks it.

- Unknown id: "That sale is no longer here."
- Already cancelled: "This sale is already cancelled." Nothing is written.

### 5.2 Reason

Required (D8; `04-business-rules.md`, Audit; Handbook s.18 "Every inventory change must have a
reason"). Trimmed. Blank: "Give a reason for cancelling this sale." Over 120 characters: "Keep the
reason under 120 characters." Free text; no preset list (none was asked for).

### 5.3 Blocked when a customer payment has been applied to the sale

**Decided (owner, 2026-11-01, D8):** a partial or credit sale cannot be cancelled once the
customer has paid something toward it, because that money would then belong to nothing.

What "paid something toward it" means in this code. Customer payments are not tied to a sale
(`CustomerPayment` in `types.ts`). `remainingBySale` in `src/domain/ledger.ts` pools each
customer's payments and settles their charges **oldest sale first**, regardless of when each
payment was made. So the money applied to sale S is:

```text
applied(S) = chargedAmount(S) - remainingBySale(sales, payments).get(S.id)
```

**The rule (owner, 2026-11-01, Q1):** cancellation is refused when `applied(S) > 0`.
`checkCancellable` uses exactly
this; it reuses `remainingBySale`, so the Sales screen, the Ledger and this check can never
disagree.

| Case | applied | Result |
| ---- | ------- | ------ |
| Cash sale (walk-in or named) | 0 (`chargedAmount` is 0) | Allowed |
| Partial sale, only the down payment taken at the counter | 0 (the down payment is `amountPaid`, not a ledger payment) | Allowed |
| Credit sale, no customer payment since | 0 | Allowed |
| Customer owes A (older, PHP 1,000) and S (PHP 500); pays PHP 300 | A gets 300, S gets 0 | S allowed; A blocked |
| Same, pays PHP 1,200 | A 1,000, S 200 | Both blocked |

Why this is safe: when `applied(S) = 0` the customer's payments are fully used by charges older
than S, so removing S leaves every other sale's allocation unchanged and the balance never goes
below zero. Cancelling any sale that had money applied would move that money onto newer sales or
leave it unallocated; that is exactly what is blocked.

This test is a little narrower than "any payment recorded after the sale": in the fourth row, a
later PHP 300 went entirely to the older sale A, so S can still be cancelled. The owner chose
this narrower, exact test (Q1).

Blocked message (store and screen), with the figures from the data:

> "You can't cancel this sale. Pedro Santos has already paid PHP 200.00 toward it (payments go to
> the oldest balance first). Leave the sale as it is and tell the owner. Refunds are not recorded
> in this version."

The owner approved this wording (Q2). It does not suggest Adjust Stock.

### 5.4 What cancelling writes

`cancelSale` does everything in **one `set` call**, or writes nothing:

1. The sale gets `status: 'cancelled'` and `cancellation: { cancelledAt: now, cancelledBy:
   CURRENT_USER.name, reason }`. No other field of the sale changes: lines, totals, `taxRate`,
   `amountPaid`, `changeGiven`, `balanceDue`, `recordedBy` and `saleNumber` stay as recorded.
2. One movement per sale line (`buildSaleReversalMovements`):

   | Field | Value |
   | ----- | ----- |
   | `id` | `MOV-REV-${sale.id}-${line.productId}` (unique: a sale is cancelled once) |
   | `type` | `'sale_reversal'` |
   | `quantityDelta` | `+line.quantity` |
   | `reference` | `sale.saleNumber` |
   | `description` | `Sale cancelled: ${reason}` (same shape as `Adjusted: ${reason}`) |
   | `reason` | the reason |
   | `note` | `null` |
   | `recordedBy`, `occurredAt` | `CURRENT_USER.name`, the cancellation time |

   Dated at the cancellation, not the sale: the log reads in the order things happened, and stock
   at any earlier moment stays what it really was.
3. Each product's `stock` goes up by its line quantity, together with its movement (Handbook
   s.18).

Stock never goes negative: a reversal only adds. A line whose product is **inactive** still gets
its stock back (inactive blocks selling, not stock). A line whose product **no longer exists** in
`products` refuses the whole cancellation: "<name> is no longer in the product list, so its
stock cannot be returned." (A movement for a missing product would break the stock check in
`inspectPersistedShop`.) The app has no way to delete a product, so this is a guard only.

The sale number is never reused: `nextSaleSequence` reads every stored sale, cancelled included.

### 5.5 Where a cancelled sale counts for nothing (verified in code)

| Place | Code | Today |
| ----- | ---- | ----- |
| Reports (daily sales, top products, payment breakdown) | `completedSalesIn` in `reports.ts` | Already excludes |
| Customer balances, open charges, statement, Outstanding Credit | `chargedAmount` in `ledger.ts` returns 0 unless `completed` | Already excludes |
| Sales root KPIs, payment summary, top products | `computeSalesMetrics` filters `completed` | Already excludes |
| Dashboard Today's Sales, Outstanding Credit | `computeSalesMetrics`, `computeTotalOutstanding` | Already excludes |
| Dashboard Recent Sales list | `salesOnDay(sales, today)` in `computeDashboardData` | **Lists it.** Change: completed only (D8, "dashboard excludes it") |
| Sales root Recent Sales status column | `describeSettlement`: `remaining` is 0, so it reads **"Paid"** | **Wrong.** Change: reads "Cancelled" |
| Sale page "Status now" row | same | **Wrong.** Change: reads "Cancelled" |

### 5.6 Money taken at the counter

No refund is recorded (D8). The sale keeps its recorded `amountPaid` and `changeGiven`, and the
sale page says plainly what that means (`describeCounterMoney`):

| Sale | Sentence |
| ---- | -------- |
| Cash | "PHP 631.00 was taken at the counter. The app does not record refunds; any money returned to the customer is handled outside the app." |
| Partial | "A down payment of PHP 300.00 was taken at the counter. ..." (same second sentence) |
| Credit | none (nothing was taken) |

Reports' "collected" figure drops by the same amount, because `collectedAtSale` only reads
completed sales.

---

## 6. Who May Do It

Whoever is at the till (D3). `09-open-questions.md` allows cashiers to cancel. `05-user-roles.md`
"Cannot delete sales" is respected: nothing is deleted.

---

## 7. Screens and States

### 7.1 Sale page (`SaleCompletePage.tsx`, `ROUTES.saleDetail`) --- the only place to cancel

The action lives on the sale page only, not on list rows: the cashier sees the full receipt before
cancelling, and there is one place to build and test. The Sales root list, the dashboard and the
ledger already link here.

**Completed sale:**

- A **Cancel Sale** button below the receipt actions, secondary with destructive (rose) styling,
  never the primary button.
- When `checkCancellable` is not ok, the button is disabled and the block message (5.3) is shown
  under it as a warning `Alert`, instead of failing after the tap.

**Cancelled sale:**

- The "Sale Completed" banner is not shown, even with `state.completed` in the router state.
- A rose banner at the top: **Cancelled** --- "Cancelled May 21, 4:15 PM by Juan Dela Cruz.
  Reason: Customer changed his mind." and "Stock returned: 5 items across 2 products."
- The counter-money sentence (5.6) as an info `Alert`, when there is one.
- The receipt header carries **CANCELLED** (it prints too), and the "Status now" row reads
  "Cancelled". "Balance now" is hidden.
- The bottom info `Alert` ("Stock was reduced ...") is replaced by the cancellation summary.
- No Cancel Sale button.

All examples are formats; every figure comes from the sale (E3, E4).

### 7.2 Cancel dialog (new, `src/features/sales/components/CancelSaleDialog.tsx`)

Shared `Dialog` (focus trapped, Esc closes = Keep Sale).

- Title: "Cancel sale #20261101-0007?"
- Summary: total, customer, item count.
- What will happen, from the data:
  - "5 items go back into stock."
  - "It is removed from today's sales and reports." (or "from the sales and reports for May 21"
    for an earlier day)
  - Partial or credit: "Pedro Santos's balance goes down by PHP 331.00."
  - The counter-money sentence (5.6), when there is one.
- **Reason** textarea, required, character counter to 120.
- Buttons: **Cancel Sale** (destructive) and **Keep Sale**. No bare "Cancel" button, so the two
  meanings never share a label.
- Store refusal: the message in an error `Alert` inside the dialog; the dialog stays open and keeps
  the reason.
- Success: the dialog closes, the page shows the cancelled state with a success notice "Sale
  cancelled. Stock returned."

### 7.3 Sales root, Recent Sales (`RecentSalesPanel.tsx`)

The Status column reads **Cancelled** (neutral tone) with no "left" line. Nothing else changes.
`describeSettlement` (or a sibling in `salesMetrics.ts`) returns the cancelled label so the sale
page and the list share one rule.

### 7.4 Dashboard Recent Sales (`dashboardMetrics.ts`)

`recentSales` takes completed sales only. One-line change for `dashboard-engineer`.

### 7.5 Inventory, Stock Movements

No change: `sale_reversal` already shows as "Reversal" with its icon (`statusTones.ts`). The
reference is the sale number.

---

## 8. Edge Cases

| Case | Expected |
| ---- | -------- |
| Sale from last month | Cancellable; reports for that month drop it |
| Cash sale, walk-in | Cancellable; counter-money sentence shown |
| Partial sale, down payment only | Cancellable; balance on the ledger drops by `balanceDue` |
| Credit sale with a payment applied | Button disabled, block message |
| Credit sale, later payment went only to an older charge | Cancellable (5.3, decision Q1) |
| Customer paid off an older sale; newer credit sale unpaid | Newer one cancellable |
| Cancel the same sale twice (two tabs) | Second refused: "already cancelled"; nothing written |
| Product now inactive | Stock returned anyway |
| Product price changed since | Irrelevant: the sale keeps its own line prices |
| Product missing from the list | Whole cancellation refused (5.4) |
| Blank or 121-character reason | Refused with the messages in 5.2 |
| Reload after cancelling | Cancelled state, reason and reversal movements survive |
| Version 2 data in the browser | Loads; every sale gets `cancellation: null` (4.4) |
| Reset demo data | Fresh seed; no cancelled sales |
| Sale number of a later sale that day | Unaffected; cancelled numbers are never reused |

---

## 9. Acceptance Criteria

- [ ] **AC1** Any completed sale from any day can be cancelled from its sale page, after a
      confirmation dialog that requires a reason.
- [ ] **AC2** The sale stays in history with status Cancelled and shows who cancelled it, when and
      why; no other field of the sale changes.
- [ ] **AC3** One Reversal movement per line returns the stock, dated at the cancellation, with the
      sale number as reference; product stock equals the sum of its movements afterwards.
- [ ] **AC4** Reports, the customer ledger, the Sales root KPIs and the Dashboard (KPIs and Recent
      Sales) leave the cancelled sale out.
- [ ] **AC5** A partial or credit sale with any customer payment applied to it (5.3) cannot be
      cancelled; the cashier sees why and what to do, and the store refuses it too.
- [ ] **AC6** The sale page and the Recent Sales list read "Cancelled", never "Paid".
- [ ] **AC7** Money taken at the counter is shown as not refunded; no refund record exists.
- [ ] **AC8** A refused cancellation writes nothing.
- [ ] **AC9** Version 2 saved data loads after the upgrade with every record kept.
- [ ] **AC10** No figure from the screenshots (E3, E4); works at 390, 768 and 1280 px; the dialog
      works by keyboard.
- [ ] **AC11** `npm run verify` passes and `npm run test:e2e` covers B1 to B5.

---

## 10. Test Cases

### 10.1 Unit --- `src/domain/saleCancellation.test.ts` (data-layer-engineer)

| ID | Function | Case | Expected |
| -- | -------- | ---- | -------- |
| U1 | `validateCancelReason` | `'  wrong item '`, `''`, `'   '`, 121 chars | ok, refused, refused, refused |
| U2 | `appliedToSale` | cash sale | 0 |
| U3 | `appliedToSale` | credit 500, no payments | 0 |
| U4 | `appliedToSale` | older credit 1,000 + this 500, payment 300 | 0 for this, 300 for the older |
| U5 | `appliedToSale` | same, payment 1,200 | 200 |
| U6 | `checkCancellable` | already cancelled | `already_cancelled` |
| U7 | `checkCancellable` | U5 case | `payments_applied`, message names customer and PHP 200.00 |
| U8 | `buildSaleReversalMovements` | 2 lines | 2 movements, positive deltas, ids, reference, description, reason as in 5.4 |
| U9 | `describeCounterMoney` | cash, partial, credit | sentences in 5.6; null for credit |

### 10.2 Store --- `src/stores/useShopStore.test.ts` (data-layer-engineer)

| ID | Case | Expected |
| -- | ---- | -------- |
| S1 | Record a cash sale, cancel it | status cancelled, cancellation stamped, stock back to before, 1 reversal per line |
| S2 | Cancel with blank reason | `ok: false`; state unchanged |
| S3 | Cancel twice | second `ok: false`; one set of reversals |
| S4 | Credit sale, record a payment, cancel | `ok: false`; state unchanged |
| S5 | Credit sale, cancel; `computeOutstanding` | balance down by `balanceDue` |
| S6 | Product deactivated, cancel | ok; stock returned |
| S7 | Unknown sale id | `ok: false` |
| S8 | After cancel, every product's stock equals `stockFromMovements` | true |

### 10.3 Persistence --- `src/stores/shopPersistence.test.ts` (data-layer-engineer)

| ID | Case | Expected |
| -- | ---- | -------- |
| M1 | Version 2 snapshot | version 3; every sale has `cancellation: null`; `invoices: []`; nothing dropped |
| M2 | Version 2 sale already `cancelled` | gets the placeholder cancellation (4.4) |
| M3 | Version 0 and 1 snapshots | reach version 3 through every step |
| M4 | Round trip: cancel, reload | identical sale and movements |

### 10.4 Feature lib --- `src/features/sales/lib/salesMetrics.test.ts` (sales-engineer),
`src/features/dashboard/lib/dashboardMetrics.test.ts` (dashboard-engineer)

| ID | Case | Expected |
| -- | ---- | -------- |
| F1 | Settlement label of a cancelled sale | "Cancelled" |
| F2 | `computeDashboardData` with a cancelled sale today | not in `recentSales`; KPIs exclude it |

### 10.5 End to end --- `e2e/sales.spec.ts` (sales-engineer adds; qa-engineer runs)

| ID | Steps | Expected |
| -- | ----- | -------- |
| B1 | Sell 2 of a product for cash; open the sale; Cancel Sale; Keep Sale | nothing changes |
| B2 | Cancel Sale with empty reason, then with "Wrong item" | first refused; then banner Cancelled with reason; stock back on Products; Reversal row in Stock Movements; Today's Sales back to before |
| B3 | Credit sale for a customer; cancel it | customer's balance on the Ledger back to before |
| B4 | Credit sale; record a payment for that customer covering it; open the sale | Cancel Sale disabled; message names the amount |
| B5 | Cancel a sale; reload | still Cancelled; Recent Sales row reads Cancelled; Dashboard Recent Sales does not list it |

---

## 11. Decisions

The owner settled both questions on 2026-11-01, approving the recommendations. Recorded in D8.

| # | Question | Decision | Options set aside |
| - | -------- | -------- | ----------------- |
| Q1 | Which exact test blocks a partial or credit sale? | **Block only when the ledger has applied a customer payment to the sale** (`applied(S) > 0`, section 5.3), using `remainingBySale`. | Block when any payment by that customer was recorded after the sale |
| Q2 | What does a blocked cashier do? | **"Leave the sale as it is and tell the owner. Refunds are not recorded in this version."** (message in 5.3) | Also suggesting Adjust Stock for returned goods, which would make stock and sales disagree |

---

## 12. Build Order

```text
1. data-layer-engineer   types.ts (SaleCancellation, Sale.cancellation), saleCancellation.ts
                         (+ tests), cancelSale in useShopStore, cancellation: null in recordSale,
                         seed and fixtures, persistence v3 (shared with the other 04 specs)
2. sales-engineer        Cancel Sale button and blocked state, CancelSaleDialog, cancelled state
   dashboard-engineer    of the sale page, Cancelled label in Recent Sales (+ lib tests, e2e B1-B5)
   (parallel)            recentSales excludes cancelled (+ test)
3. code-reviewer, then qa-engineer
```

Nothing in step 2 starts until step 1's report lists the new exports and their signatures. The
full phase 4 order is in `04-add-product-and-details-spec.md` s.12.
