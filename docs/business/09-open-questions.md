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
