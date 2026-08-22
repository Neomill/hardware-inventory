# Business Rules

## Inventory

Stock decreases after every completed sale.

Stock increases after receiving new inventory.

Inventory can never be negative.

---

## Sales

Completed sales cannot be edited.

Cancelled sales remain in history.

---

## Ledger

Only customers with credit transactions have ledger entries.

Partial payments reduce outstanding balance.

---

## Products

Every product has exactly one selling price.

Products cannot be sold if inactive.

---

## Tax

Selling prices are VAT-inclusive. Tax is never added to a sale total.

VAT is shown as a reference breakdown only, derived from the total.

The VAT rate is configurable and is recorded on each sale at the time the
sale is made. Past sales keep the rate that applied when they were
recorded.

See `10-decisions.md` D1.

---

## Payment and Customers

A customer is optional for cash sales.

A customer is required for partial payments and credit sales. A balance
cannot be recorded against a walk-in customer.

See `specs/01/DESIGN-ERRATA.md` E5.

---

## Discounts

A discount may be a fixed amount or a percentage.

A discount can never exceed the sale subtotal, and a sale total can never
be negative.

Every discount records who approved it.

---

## Audit

Every sale, payment, and inventory transaction records who made it.

Every inventory adjustment records a reason.
