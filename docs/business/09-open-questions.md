# Business Decisions

## Customer Ledger

A customer may have multiple unpaid balances.

Partial payments are allowed.

---

## Product Pricing

Selling prices may change after new inventory is received.

Prices do not usually change daily.

---

## Inventory Adjustment

Both the owner and cashier are allowed to perform inventory adjustments.

Every adjustment should be recorded with a reason.

---

## Sales

Cashiers are allowed to cancel a sale.

Cancelled sales should remain in the system for audit purposes.

---

## Discounts

Discounts are allowed.

Version 1 should support either:

- Fixed amount discount
- Percentage discount

The system should record who approved the discount.

---

## Supplier Invoices

Current storage method needs confirmation.

Recommended workflow:

1. Supplier delivers products.
2. Supplier provides an invoice.
3. Invoice is assigned a unique number.
4. Purchase is recorded in the system.
5. A scanned copy or photo of the invoice can be attached (future enhancement).

Version 1 can record:

- Supplier
- Invoice number
- Invoice date
- Total amount
- Purchase items
- Received by

---

## Hold Sale (resolved 2026-10-04, see `10-decisions.md` D6)

Full reasoning: `specs/03/03-hold-sale-spec.md` section 11.

- Q1. Should a held sale reserve stock? **Resolved: no.** Quantities are re-checked and reduced on
  resume, and checked again at checkout.
- Q2. How many held sales at once? **Resolved: 10.**
- Q3. Label only, or link a customer too? **Resolved: free-text label only** in Version 1.
- Q4. What happens to old held sales? **Resolved: kept until resumed or discarded**, marked
  "From <day>" when older than today. No automatic expiry.
- Q5. Tell the cashier when a price changed while the sale was held? **Resolved: yes.**

---

## Dashboard Note (resolved 2026-10-04, see `10-decisions.md` D7)

Full reasoning: `specs/03/03-dashboard-note-spec.md` section 5.

- Q1. Keep the note in Version 1? **Resolved: no.** The card is hidden and the hardcoded sentence
  deleted. The spec keeps a future proposal.
- Q2 to Q4 (one note or a list, length limit, reset behaviour) are **not needed** while the note is
  deferred. They reopen only if the owner revives the note.
