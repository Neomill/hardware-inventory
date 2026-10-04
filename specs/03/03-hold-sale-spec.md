# Hold Sale Specification

**Project:** Olaer Store\
**Phase:** 3 --- Unspecified features from E11\
**Scope:** Holding, listing, resuming and discarding an unfinished sale\
**Status:** Approved 2026-10-04 by the owner --- build this round (decision D6)\
**Backend:** Not included (D5)\
**Owners:** `data-layer-engineer`, then `sales-engineer` (and a one-line change for
`settings-engineer`), then `qa-engineer`

---

## 1. Objective

Let the cashier set an unfinished sale aside, serve someone else, and come back to the right
sale later, without the resumed sale quietly asking for stock the store no longer has.

Hold Sale already exists in the code without a spec (`specs/01/DESIGN-ERRATA.md` E11). This
document is its written scope. It replaces the current behaviour; it does not add a second
mechanism.

### Why the store needs it

The counter receives sales in batches, not one at a time. A helper gathers a customer's items and
brings the paper slip and goods to the cashier (`docs/business/02-current-workflow.md`, Step 2 to
Step 4). A customer whose slip is already keyed in may need to fetch more money, call someone, or
add an item, while the next customer is waiting. Without Hold Sale the cashier must either make
the queue wait or clear the cart and key everything in again, which is the manual re-work the
product exists to remove (`docs/PRD.md`, "Reduce cashier workload"; "Complete a sale in under two
minutes").

The docs do not mention holding a sale. The feature comes only from the design references
(`sales 1`, `sales 2`, `sales 3`), which E11 flags. It is kept because it is already built and
because the business case above follows from the documented workflow. The owner approved this
scope on 2026-10-04 (`docs/business/10-decisions.md` D6), which meets Handbook section 20 ("Do not
invent features") and section 21 ("Before building").

### What is wrong today (QA findings, confirmed in code)

| # | Problem | Where |
| - | ------- | ----- |
| P1 | A resumed held cart can ask for more than the current stock. Nothing warns the cashier until Confirm Sale fails at checkout. | `resumeHeldCart` in `src/stores/useShopStore.ts` copies the lines back without checking stock |
| P2 | Only the most recently held cart can be resumed (last in, first out). There is no list and no way to choose. | `resumeHeldCart` takes `heldCarts[heldCarts.length - 1]` |
| P3 | The Sales root button is labelled **Hold Sale** but resumes a held cart. Holding happens only on the POS page. | `src/features/sales/pages/SalesRootPage.tsx` |
| P4 | A held cart has no id, no time and no label, so even a list could not tell two held sales apart. | `heldCarts: CartLine[][]` in `useShopStore.ts` and `shopPersistence.ts` |
| P5 | A held cart cannot be thrown away except by resuming it and clearing the cart. | No discard action exists |
| P6 | `recordSale` does not check `isActive`, so a held cart holding a since-deactivated product would still sell it. Business rule: "Products cannot be sold if inactive." | `recordSale` in `useShopStore.ts` checks existence and stock only |
| P7 | `useCart` silently drops a line whose product no longer exists, while `recordSale` rejects the whole sale for it. The cart shows one thing and checkout does another. | `src/features/sales/hooks/useCart.ts` |

---

## 2. Source of Truth

```text
docs/business/02-current-workflow.md     Customer purchase workflow, Steps 2-4
docs/business/04-business-rules.md       Inventory never negative; inactive products cannot be sold
docs/business/10-decisions.md            D2 (whole units), D3 (one fixed user), D5 (client side)
docs/product/00-developer-handbook.md    s.14 UI, s.17 errors, s.18 stock, s.20 AI rules, s.21 DoD
specs/01/DESIGN-ERRATA.md                E5, E7, E11
specs/01/sales 1 - root.png              Hold Sale button with a count badge
specs/01/sales 2 - new sales.png         Hold Sale in the POS bottom bar
specs/01/sales 3 - add new product.png   Same bottom bar
src/stores/useShopStore.ts               holdCart, resumeHeldCart, recordSale, addToCart
src/stores/shopPersistence.ts            heldCarts persisted, SHOP_STORAGE_VERSION = 1
```

This spec overrides the PNGs on the button label (section 7.1). The PNGs show no list, no label
and no discard; everything below on those points comes from this spec.

---

## 3. Non-Goals

- **Reserving stock for a held sale.** Decided against (section 5.2, decision Q1 in section 11).
- Holding a sale at the checkout step with payment details. Only the cart's lines are held. The
  payment method, amount and customer are chosen at checkout, as today.
- Attaching a customer record to a held sale (decision Q3 in section 11).
- Automatic expiry or deletion of held sales (decision Q4 in section 11).
- An audit log of discarded held sales. A held sale is not a sale, a payment or a stock movement,
  so the audit rule in `04-business-rules.md` does not cover it.
- Holding across devices. Data lives in one browser (D5).
- Carrying a held sale's label back onto the cart after resuming, so that re-holding pre-fills it.
- Discounts on a held sale. Discounts are not built yet (`computeSaleTotals(lines, 0, ...)`).

---

## 4. Data Model Changes

### 4.1 Types (`src/domain/types.ts`)

```ts
/** One line of a held sale. */
export type HeldSaleLine = {
  productId: string
  /** Whole units, more than zero (D2). */
  quantity: number
  /** Copied when the sale is held, so the list can show it. Never used to price the sale. */
  productName: string
  /** Copied when the sale is held. Used only to warn about a price change (Q5). */
  unitPrice: Centavos
}

/** A cart set aside with Hold Sale. Not a Sale: it records nothing and moves no stock. */
export type HeldSale = {
  /** "HOLD-1747801234567": the hold time in ms, plus "-2", "-3" on a clash. */
  id: string
  /** Optional words to find it again: "Pedro, fetching cash". Trimmed; blank is null. */
  label: string | null
  /** At least one line, in the order they were added to the cart. */
  lines: HeldSaleLine[]
  /** ISO 8601. */
  heldAt: string
  /** CURRENT_USER.name (D3). Cheap to stamp now, costly to add later. */
  heldBy: string
}

/** What changed when a held sale (or any cart) was checked against current stock. */
export type CartAdjustment =
  | { kind: 'removed_missing'; productId: string; productName: string; quantity: number }
  | { kind: 'removed_inactive'; productId: string; productName: string; quantity: number }
  | { kind: 'removed_out_of_stock'; productId: string; productName: string; quantity: number }
  | { kind: 'reduced'; productId: string; productName: string; from: number; to: number; unit: string }
```

The id follows the pattern `recordSale` already uses for `Sale.id` (`SALE-${occurredAt.getTime()}`).
A sequential id from `nextSequentialId` is not used because held sales are deleted, and a deleted
number would be handed out again.

### 4.2 Store state (`src/stores/useShopStore.ts`)

| Before | After |
| ------ | ----- |
| `heldCarts: CartLine[][]` | `heldSales: HeldSale[]`, oldest first |
| `holdCart(): ActionResult` | `holdCart(input?: { label?: string }): HoldCartResult` |
| `resumeHeldCart(): ActionResult` | `resumeHeldSale(heldSaleId: string): ResumeHeldSaleResult` |
| (none) | `discardHeldSale(heldSaleId: string): ActionResult` |
| (none) | `swapWithHeldSale(heldSaleId: string, input?: { label?: string }): ResumeHeldSaleResult` |

```ts
export type HoldCartResult = { ok: true; heldSale: HeldSale } | { ok: false; message: string }

export type ResumeHeldSaleResult =
  | { ok: true; adjustments: CartAdjustment[] }
  | { ok: false; message: string }
```

`heldCarts` and `resumeHeldCart` are removed, not kept as aliases.

### 4.3 Persistence (`src/stores/shopPersistence.ts`)

- `PersistedShopData.heldCarts` becomes `heldSales: HeldSale[]`.
- `SHOP_STORAGE_VERSION` goes from `1` to `2`. The dashboard note is deferred (D7), so this is the
  only change in the bump.
- `MIGRATIONS[1]` turns each non-empty `CartLine[]` in `heldCarts` into a `HeldSale`:
  - `label: null`, `heldBy: CURRENT_USER.name`
  - `heldAt`: the migration time, minus one millisecond per position from the end, so the old
    order (newest last) survives. The true hold time was never stored and cannot be recovered.
  - `productName` and `unitPrice` copied from the product with that id. A line whose product no
    longer exists is kept with `productName: 'Unknown product'` and `unitPrice: 0`; reconciliation
    removes it on resume (section 5.3).
  - The `heldCarts` key is deleted.
- `MIGRATIONS[0]` must still upgrade version-0 data: it chains into `MIGRATIONS[1]`.
- `sanitizeHeldSales` replaces `sanitizeHeldCarts`. It keeps a held sale only if `id` is a string,
  `heldAt` is a parseable date, `label` is null or a string, and at least one line passes the
  existing `isCartLine` check plus `typeof productName === 'string'` and a non-negative integer
  `unitPrice`. Bad lines are dropped; a held sale left with no lines is dropped. A label longer
  than the limit is cut to the limit. More held sales than the limit (Q2) are all kept: the limit
  stops new holds, it does not delete data (Handbook s.17, "Always preserve user data").
- `buildSeedData` returns `heldSales: []`. The seed has no held sales. `resetToSeedData` therefore
  clears them, as it clears `heldCarts` today.
- The data export (`src/features/settings/lib/exportData.ts`) picks this up through
  `selectPersistedData` with no change of its own.

### 4.4 Pure functions (`src/domain/heldSale.ts`, new)

```ts
export const HELD_SALE_LIMIT = 10          // Q2
export const HELD_SALE_LABEL_MAX = 40

normalizeHeldSaleLabel(raw: string | undefined): string | null
validateHold(input: { cartLineCount: number; heldCount: number; label?: string }): ValidationResult
buildHeldSale(input: {
  cart: CartLine[]; products: Product[]; label: string | null
  heldBy: string; now: Date; existingIds: string[]
}): HeldSale
reconcileCartWithStock(lines: CartLine[], products: Product[]):
  { lines: CartLine[]; adjustments: CartAdjustment[] }
describeAdjustment(adjustment: CartAdjustment): string     // the sentence shown to the cashier
heldSaleItemCount(held: HeldSale): number                  // sum of quantities
heldSaleEstimatedTotal(held: HeldSale, products: Product[]): Centavos   // current prices
findPriceChanges(held: HeldSale, products: Product[]):
  { productId: string; productName: string; heldPrice: Centavos; currentPrice: Centavos }[]
```

`reconcileCartWithStock` is written for any `CartLine[]`, not only held sales, so the live cart can
use it too (section 5.5).

---

## 5. Rules

### 5.1 Holding

1. Hold needs a non-empty cart. Message: "There is nothing to hold yet." (existing copy).
2. Hold is refused when `heldSales.length >= HELD_SALE_LIMIT`. Message:
   "You already have 10 held sales. Resume or discard one first." Nothing is written.
3. The label is optional. It is trimmed; blank becomes `null`; more than 40 characters is
   refused with "Keep the label to 40 characters." rather than silently cut.
4. A successful hold appends one `HeldSale`, copies each cart line's product name and current price
   onto it, and empties the cart, in one `set` call.
5. Holding writes **no stock movement** and does not change any product's stock.

### 5.2 Stock: held sales do not reserve stock

**Decided (owner, 2026-10-04, D6):** a held sale reserves nothing. Current Stock keeps meaning the
sum of the product's stock movements, and another sale may sell the units a held sale is waiting
for. Quantities are re-checked and reduced on resume.

Why:

- **Stock is only what the movements say.** "Inventory changes only through transactions. Never
  edit stock directly." (Handbook s.18; glossary, "Stock Movement"). A reservation is either a
  new movement type that is later reversed, which fills the movement log with entries that are not
  real stock changes, or a second figure ("available" beside "current"), which every screen,
  KPI and report would then have to choose between. The Dashboard, Products, Inventory and Reports
  agree today because they read one figure (E3).
- **The goods do not move.** A held sale's items are either still on the shelf or sitting at the
  counter; either way they are still the store's stock. The real risk is that the last unit is sold
  to someone else, and section 5.3 catches that on resume, before the cashier tells the customer a
  total.
- **A held sale is usually short.** The customer is in the store, fetching money or adding an item.
  A forgotten held sale that reserved stock would block real sales until someone noticed and
  discarded it (decision Q4).
- **Checkout already re-checks.** `recordSale` re-validates stock at confirm time (E7; spec 02
  s.10), so stock can never go negative whichever choice is made.

The cost: a customer waiting on a held sale can lose the last units to a sale made meanwhile. The
cashier is told on resume, with the exact product and quantity (section 5.3).

### 5.3 Resuming

`resumeHeldSale(id)`:

1. Unknown id: `{ ok: false, message: 'That held sale is no longer here.' }`.
2. The current cart is not empty: `{ ok: false, message: 'Finish or hold the current sale first.' }`
   (existing copy). The UI offers the swap instead (section 5.4), so the cashier never hits this
   in normal use.
3. Run `reconcileCartWithStock(held.lines, products)` line by line, in order:

   | Product state now | Result | Adjustment |
   | ----------------- | ------ | ---------- |
   | No product with that id | Line removed | `removed_missing` |
   | `isActive === false` | Line removed | `removed_inactive` |
   | `stock <= 0` | Line removed | `removed_out_of_stock` |
   | `quantity > stock` | Quantity set to `stock` (clamped) | `reduced`, `from` and `to` |
   | Otherwise | Unchanged | none |

4. If no line survives: `{ ok: false, message: 'None of the items in this held sale can be sold
   now.' }`. The held sale is **kept**, so the cashier can see what it was and discard it
   deliberately. Nothing is written.
5. Otherwise, in one `set` call: the cart becomes the reconciled lines, and the held sale is
   removed from `heldSales`. Return `{ ok: true, adjustments }`.
6. Prices are **not** taken from the held sale. The resumed cart is priced like any cart, at the
   product's current price, and the sale stamps that price at checkout (spec 02 s.7, `SaleLine`).

Clamping, not refusing, is chosen because a partial resume still saves the cashier from re-keying
the rest of the sale, and the cashier is told exactly what changed. Every adjustment is shown
(section 7.3) until dismissed; nothing is changed silently (Handbook s.17, "Never silently fail").

### 5.4 Swapping

`swapWithHeldSale(id, { label })` holds the current cart and resumes the chosen held sale as one
step. It is the action offered when the cart is not empty.

1. The current cart must be non-empty; otherwise use `resumeHeldSale`.
2. The held count does not grow (one in, one out), so the limit in 5.1 rule 2 does not apply.
3. If the chosen held sale has no line left after reconciliation (5.3 rule 4), the whole swap is
   refused and nothing changes: the current cart stays in the cart.
4. On success, one `set` call: the current cart becomes a new `HeldSale` (with the label given,
   if any), the chosen held sale is removed, and the cart becomes its reconciled lines.

### 5.5 Live cart and checkout (fixes P6, P7)

- `recordSale` refuses a line whose product is inactive: "<name> is no longer for sale. Remove it
  to continue." (business rule, `04-business-rules.md`, "Products cannot be sold if inactive").
- `useCart` stops hiding lines whose product is missing. The Sales engineer either shows them as
  unavailable lines with a Remove control, or runs `reconcileCartWithStock` on the live cart when
  the POS page opens and shows the adjustments the same way as on resume. Recommended: the
  second, because it reuses one function and one message style.

### 5.6 Discarding

`discardHeldSale(id)` removes the held sale. It writes nothing else: no stock, no sale, no log.
Unknown id: `{ ok: false, message: 'That held sale is no longer here.' }`. The UI must ask for
confirmation first (Handbook s.17, "Confirm destructive actions").

### 5.7 Order and age

- The list shows held sales **newest first**. The badge counts all held sales.
- A held sale shows its age as a time today ("10:42 AM") or a date and time for any earlier day
  ("May 20, 4:15 PM"). A held sale from an earlier day carries a "From <day>" marker so it is not
  mistaken for one from this morning. There is no automatic expiry (Q4).

---

## 6. Who May Do It

Version 1 has one fixed user and no roles in the app (D3). Holding, resuming, swapping and
discarding are all open to whoever is at the till. The role table in `05-user-roles.md` ("Cashier:
Cannot delete sales") is about completed sales; a held sale is not a sale, so discarding one is
not restricted.

---

## 7. Screens and States

### 7.1 Sales root (`SalesRootPage.tsx`) --- fixes P2, P3

- The button is relabelled **Held Sales**, with the count badge from the design. This overrides
  `sales 1 - root.png`, where the button reads "Hold Sale": on this screen there is no cart to hold,
  so the label described the wrong action.
- The badge shows `heldSales.length` when it is more than zero and is hidden at zero. The button's
  accessible name includes the count: "Held Sales, 2 waiting".
- At zero the button stays visible and enabled and opens the empty list, so its place on the
  screen never moves (same reasoning as D4).
- Tapping it opens the **Held Sales** dialog (7.2).

### 7.2 Held Sales dialog (new, in `src/features/sales/components/`)

Uses the shared `Dialog` from `src/components/common/Dialog.tsx` (focus managed, Esc closes).

Each row, newest first:

| Shows | Source |
| ----- | ------ |
| Label, or "Held sale" when there is none | `label` |
| Time held, with the "From <day>" marker for earlier days | `heldAt` |
| "5 items: PVC Pipe 1/2", Cement (Holcim) +3 more" | `heldSaleItemCount`, `lines[].productName` |
| "About PHP 631.00" at current prices | `heldSaleEstimatedTotal` |
| Warning pill "Stock changed" when `reconcileCartWithStock` would adjust anything, with the adjustments listed on expand | live products |
| Note "Prices changed" when `findPriceChanges` is non-empty (decision Q5) | live products |
| **Resume** (primary) and **Discard** (secondary, destructive styling) | |

Every figure is computed from store data at render time (E3, E4). The example text above is a
format, not data.

States:

- **Empty:** "No held sales. Use Hold Sale on the New Sale screen to set a sale aside." with a link
  to `ROUTES.newSale`.
- **Cart not empty:** a notice at the top, "You have a sale in progress (3 items).", and each row's
  primary action reads **Hold current and resume** (calls `swapWithHeldSale`). An optional label
  field for the current cart appears in the confirmation step.
- **Nothing left to sell** (5.3 rule 4): the row's Resume is disabled, the row reads "None of these
  items can be sold now", and Discard stays enabled.
- **Discard:** a confirm step inside the dialog: "Discard this held sale? Its 5 items will be
  removed from the list. Stock is not affected." Buttons **Discard** and **Keep**.
- **Success (resume or swap):** the dialog closes and the app navigates to `ROUTES.newSale`.
- **Error:** the store's message in an `Alert` (tone `error`) inside the dialog. The dialog stays
  open.

### 7.3 POS page (`PosPage.tsx`) after a resume

- When the resume returned adjustments, a warning `Alert` above the grid lists each one with
  `describeAdjustment`, for example:
  - "PVC Pipe 1/2": reduced from 30 to 12 pcs, only 12 left in stock."
  - "Door Knob (Stainless) removed: out of stock."
  - "Paint Thinner removed: no longer for sale."
- It stays until the cashier dismisses it or leaves the page, and is not replaced by later
  add-to-cart messages. The page receives the adjustments through router state or a small
  feature-level store; the Sales engineer chooses, and it must survive no further than the page.
- Price changes (decision Q5) are listed the same way: "Cement (Holcim) is now PHP 265.00
  (was PHP 260.00 when held)."

### 7.4 POS page: holding

- **Hold Sale** in the bottom bar stays, as in `sales 2` and `sales 3`.
- With an empty cart it is disabled, with the hint "Add items before holding" as its description,
  instead of failing after the tap.
- Tapping it opens a small dialog: optional **Label** input (40 characters, counter shown,
  placeholder "Customer name or note, optional") and **Hold Sale**. Enter submits. This is one
  extra tap compared to today; the label is what makes the list usable (P4).
- At the limit, the dialog shows the limit message and the button is disabled.
- On success: navigate to `ROUTES.sales`, as today, with a success notice "Sale held." on the
  Sales root.

### 7.5 Settings (`DataCard.tsx`)

"Held sales" count reads `heldSales.length`; `hasSaleInProgress` uses `heldSales.length > 0`. No
other change.

---

## 8. Edge Cases

| Case | Expected |
| ---- | -------- |
| Held sale's product sold out by another sale while held | Line removed on resume, adjustment shown |
| Stock dropped below the held quantity | Quantity clamped to stock, adjustment shown |
| Stock rose while held | No change. The held quantity is kept, not raised |
| Product deactivated while held | Line removed, adjustment shown; checkout would also refuse it (5.5) |
| Product price changed while held | Cart uses the current price; price change shown (decision Q5) |
| Every line unavailable | Resume refused, held sale kept, Discard offered |
| Cart not empty when resuming | Swap offered; plain resume refused with the existing message |
| Swap where the chosen held sale cannot resume | Nothing changes; current cart untouched |
| Two lines for the same product | Cannot happen: `addToCart` merges lines. Reconciliation still treats each line on its own and the sanitizer does not need to merge |
| Ten held sales | Hold refused with the limit message; swap still allowed |
| More than ten held sales in stored data (older app, import) | All kept and listed; new holds refused until below the limit |
| Held sale from yesterday | Listed with a "From <day>" marker; resumes normally |
| Page reload with held sales | All held sales, labels and times survive (persisted) |
| Reset demo data | Held sales cleared, as today; the reset dialog already warns via `hasSaleInProgress` |
| Two held sales in the same millisecond | Second id gets "-2" |
| Corrupt held-sale data in storage | Bad entries dropped by the sanitizer; the rest of the data loads |
| Label of only spaces | Stored as null; shown as "Held sale" |
| Label with 41 characters | Refused with "Keep the label to 40 characters." |

---

## 9. Acceptance Criteria

- [ ] **AC1** The Sales root button reads **Held Sales** and shows a badge with the number of held
      sales; the badge is hidden at zero.
- [ ] **AC2** The button opens a list of every held sale, newest first, with label (or "Held
      sale"), time held, item count, item summary and estimated total from current data.
- [ ] **AC3** Any held sale in the list can be resumed, not only the newest.
- [ ] **AC4** Any held sale can be discarded after a confirmation; discarding changes no stock.
- [ ] **AC5** Holding a sale optionally takes a label of at most 40 characters.
- [ ] **AC6** Holding is refused at 10 held sales (decision Q2), with a clear
      message, and writes nothing.
- [ ] **AC7** Holding and discarding create no stock movement and change no product's stock.
- [ ] **AC8** On resume, a line above current stock is clamped to current stock, and a line that is
      out of stock, inactive or missing is removed; each change is shown to the cashier in words
      before checkout.
- [ ] **AC9** A held sale with no sellable line cannot be resumed and is not deleted automatically.
- [ ] **AC10** With a sale in progress, the cashier can hold it and resume another in one action;
      the held count does not change.
- [ ] **AC11** The list flags a held sale whose stock has changed before it is resumed.
- [ ] **AC12** `recordSale` refuses an inactive product.
- [ ] **AC13** Held sales, with their labels and times, survive a page reload; data saved by the
      previous version (`heldCarts`) is migrated, not lost.
- [ ] **AC14** No figure or text from the screenshots appears in the feature (E3, E4).
- [ ] **AC15** Works without horizontal scroll at 390, 768 and 1280 px; the dialog works by
      keyboard and its controls are labelled (Handbook s.21).
- [ ] **AC16** `npm run verify` passes (or, until it is in place, `npm run typecheck`, `npm test`
      and `npm run lint`), and `npm run test:e2e` covers the hold, resume and discard flow.
- [ ] **AC17** On resume, every line whose current price differs from the price when held is
      listed with both prices, and the list marks such held sales "Prices changed".

---

## 10. Test Cases

### 10.1 Unit tests --- `src/domain/heldSale.test.ts` (data-layer-engineer)

| ID | Function | Case | Expected |
| -- | -------- | ---- | -------- |
| U1 | `normalizeHeldSaleLabel` | `'  Pedro  '`, `''`, `'   '`, `undefined` | `'Pedro'`, `null`, `null`, `null` |
| U2 | `validateHold` | empty cart | not ok, "nothing to hold" |
| U3 | `validateHold` | `heldCount` 9 / 10 | ok / not ok with limit message |
| U4 | `validateHold` | label of 40 / 41 characters | ok / not ok |
| U5 | `buildHeldSale` | two lines | copies name and current price; `heldAt` from `now`; `heldBy` passed through |
| U6 | `buildHeldSale` | `existingIds` holds the same ms id | id ends in `-2` |
| U7 | `reconcileCartWithStock` | all lines within stock | lines unchanged, no adjustments |
| U8 | `reconcileCartWithStock` | qty 30, stock 12 | qty 12, one `reduced` 30 to 12 |
| U9 | `reconcileCartWithStock` | stock 0 | line removed, `removed_out_of_stock` |
| U10 | `reconcileCartWithStock` | inactive product | line removed, `removed_inactive` |
| U11 | `reconcileCartWithStock` | unknown product id | line removed, `removed_missing` |
| U12 | `reconcileCartWithStock` | stock rose above qty | qty unchanged |
| U13 | `reconcileCartWithStock` | mixed lines | order of surviving lines preserved; one adjustment per changed line |
| U14 | `heldSaleEstimatedTotal` | price changed since hold | uses current price, integer centavos |
| U15 | `findPriceChanges` | one price up, one unchanged | returns only the changed one |
| U16 | `describeAdjustment` | each kind | the sentences in section 7.3 |

### 10.2 Store tests --- `src/stores/useShopStore.test.ts` (data-layer-engineer)

| ID | Case | Expected |
| -- | ---- | -------- |
| S1 | `holdCart({ label: 'Pedro' })` with 2 lines | one held sale, label set, cart empty, product stock and movements unchanged |
| S2 | `holdCart()` at the limit | `ok: false`; state unchanged |
| S3 | Hold A, hold B, `resumeHeldSale(A.id)` | cart is A's lines; B still held (not LIFO) |
| S4 | Hold 5 pcs; `recordSale` sells all but 2 of that product; resume | cart qty 2; one `reduced` adjustment |
| S5 | Hold a line whose product then reaches 0 | resumed without that line; `removed_out_of_stock` |
| S6 | Every line unavailable | `ok: false`; held sale still present; cart still empty |
| S7 | `resumeHeldSale` with a non-empty cart | `ok: false`; nothing changed |
| S8 | `swapWithHeldSale` | old cart now held, chosen sale in cart, count unchanged |
| S9 | `swapWithHeldSale` where the chosen sale has nothing sellable | nothing changed |
| S10 | `discardHeldSale` | removed; stock, movements, sales unchanged |
| S11 | `discardHeldSale('nope')` | `ok: false` |
| S12 | `recordSale` with an inactive product in the cart | `ok: false`; nothing written |
| S13 | `resetToSeedData` | `heldSales` empty |

### 10.3 Persistence tests --- `src/stores/shopPersistence.test.ts` (data-layer-engineer)

| ID | Case | Expected |
| -- | ---- | -------- |
| M1 | Version 1 snapshot with `heldCarts: [[A], [B]]` | version 2 with two held sales, B newest, names and prices copied, `heldCarts` gone |
| M2 | Version 0 snapshot without `heldCarts` | `heldSales: []` |
| M3 | Version 1 held line for a missing product | kept as "Unknown product", price 0 |
| M4 | Sanitizer: held sale with no valid lines, bad date, non-string id | dropped; others kept |
| M5 | Sanitizer: 12 valid held sales | all 12 kept |
| M6 | Round trip: hold with label, reload store from the same storage | identical held sale |

### 10.4 Browser checks (qa-engineer, Playwright per `.claude/agents/qa-engineer.md`)

A Playwright `test:e2e` script is being added in parallel (`package.json`, `e2e/`). Once it lands,
B1 to B10 belong in an end-to-end spec for the sales flow (Handbook s.21); until then the QA agent
runs them by hand.

| ID | Steps | Expected |
| -- | ----- | -------- |
| B1 | New Sale; add 2 products; Hold Sale with label "Pedro"; | Sales root shows Held Sales badge 1; list shows "Pedro", 2 lines |
| B2 | Hold two sales; open list; resume the older one | Older sale's lines in cart; badge 1 |
| B3 | Hold a sale with 5 of product X; sell X down to 2 in a new sale; open list | "Stock changed" pill on the held sale |
| B4 | Resume it | Cart shows 2 of X; warning names X, 5 to 2 |
| B5 | Proceed to checkout and confirm cash | Sale recorded; stock of X is 0, never negative |
| B6 | Discard a held sale, Keep first, then Discard | First keeps it; second removes it; product stock unchanged on Inventory |
| B7 | With items in the cart, open Held Sales, Hold current and resume | Swap happens; badge unchanged |
| B8 | Hold 10 sales, try an 11th | Refused with the limit message |
| B9 | Hold a sale; reload the page | Held sale, label and time still there |
| B10 | Settings, Reset demo data | Held sales gone; badge hidden |
| B11 | 390, 768, 1280 px; keyboard only through hold, list, resume, discard | No horizontal scroll; focus stays in the dialog; Esc closes |
| B12 | Hold a sale; change a held product's price in the saved data (localStorage) and reload; the app has no price editor yet; open the list; resume | "Prices changed" on the row; POS lists old and new price; cart uses the new price |

---

## 11. Decisions

The owner answered every open question on 2026-10-04. Recorded as D6 in
`docs/business/10-decisions.md`; marked resolved in `docs/business/09-open-questions.md`.

| # | Question | Decision | Options set aside |
| - | -------- | -------- | ----------------- |
| Q1 | Should a held sale reserve stock? | **No.** Re-check on resume: reduce to current stock, remove unsellable lines, tell the cashier (sections 5.2, 5.3). Checkout re-checks again. | Reserve without a movement; reserve with a time limit |
| Q2 | How many held sales at once? | **10** (`HELD_SALE_LIMIT`). Stored data above the limit is kept; only new holds are refused. | 5; no limit |
| Q3 | Label or customer? | **Free-text label only**, at most 40 characters. No customer link in V1; the customer is still chosen at checkout (E5). | Optional customer link; customer required |
| Q4 | Old held sales? | **Kept until resumed or discarded.** Held sales from an earlier day are marked "From <day>". No automatic expiry. | Auto-discard at day end; dashboard warning |
| Q5 | Warn when a price changed while held? | **Yes.** The list marks the held sale "Prices changed" and the POS page lists each change on resume (sections 7.2, 7.3). | Silent repricing |

Revisit Q1 if customers regularly lose items they were promised while a sale is held, and Q3 if
the owner later wants a held sale to pre-select a ledger customer.

---

## 12. Build Order

```text
1. data-layer-engineer     src/domain/types.ts, src/domain/heldSale.ts (+ tests)
                           src/stores/useShopStore.ts: heldSales, holdCart, resumeHeldSale,
                             swapWithHeldSale, discardHeldSale; recordSale refuses inactive
                           src/stores/shopPersistence.ts: version 2, MIGRATIONS[1], sanitizer
                           Keeps the build green by making the mechanical rename in the three
                           callers (SalesRootPage, PosPage, DataCard) with no behaviour change,
                           as its "update every caller" rule requires.

2. sales-engineer          Held Sales button and dialog, hold dialog with label, swap,
   (parallel)              adjustment alert on POS, live-cart reconciliation (5.5),
                           src/features/sales/lib for any formatting logic (+ tests)
   settings-engineer       Confirm DataCard reads heldSales (likely already done in step 1)

3. code-reviewer           Review steps 1 and 2

4. qa-engineer             Section 10.4 in a browser, plus the neighbouring checkout flows
```

The dashboard note is deferred (D7), so this round's only data-layer change is Hold Sale.

Nothing in step 2 may start until step 1's report lists the new exports and their signatures.
