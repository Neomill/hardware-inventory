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

## Sale Cancellation (resolved 2026-11-01, see `10-decisions.md` D8)

Full scope: `specs/04/04-sale-cancellation-spec.md`.

- Which sales can be cancelled? **Resolved: any completed sale, from any day**, with a required
  reason. It stays in history marked Cancelled with who, when and why.
- What happens to stock? **Resolved: returned** through one `sale_reversal` movement per line.
- Do reports, the ledger and the dashboard count it? **Resolved: no.**
- A partial or credit sale the customer has paid toward? **Resolved: cannot be cancelled**; the
  cashier is told why. The exact test: blocked **only when the ledger has applied a customer
  payment to the sale** (spec Q1). The cashier is told to leave the sale and tell the owner
  (spec Q2).
- Refunds? **Resolved: not recorded** in Version 1.

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

### Resolved 2026-11-01 (see `10-decisions.md` D10)

Full scope: `specs/04/04-supplier-invoices-spec.md`.

- Storage method? **Resolved: an invoice record is stored** in the app, beside one Stock In
  movement per line.
- What is recorded? **Resolved:** supplier (free text), unique `INV-NNNNN` number, invoice date,
  received by, product lines with quantities, and the total typed from the paper. No per-item
  costs.
- One product per delivery or many? **Resolved: many** on one invoice.
- Deliveries without a paper invoice? **Resolved: an invoice is required**; a paperless delivery
  goes through Adjust Stock with a reason (spec Q1).
- Receipts saved before this change? **Resolved: left as stock movements**, numbers reserved
  (spec Q2).

---

## Add Product and Product Details (resolved 2026-11-01, see `10-decisions.md` D9)

Full scope: `specs/04/04-add-product-and-details-spec.md`.

- SKU? **Resolved: generated** from the first three letters of the category name plus the next
  free number (spec Q2).
- Opening stock? **Resolved: recorded as an "Opening stock" Stock In movement.**
- New categories? **Resolved: allowed.**
- Editing a product on Product Details? **Resolved: yes**, name, category, price, Reorder At and
  active status; never SKU, unit or stock (spec Q1).

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
