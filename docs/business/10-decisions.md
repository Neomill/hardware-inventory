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
