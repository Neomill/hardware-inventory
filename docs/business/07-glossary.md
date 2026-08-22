# Glossary

OR

Official Receipt.

---

Ledger

Record of customer debts.

---

Stock In

Receiving products from suppliers.

---

Stock Out

Products leaving inventory.

---

Supplier

Business providing products.

---

SKU

Unique product identifier.

---

Sale Number

The store's own reference for a recorded sale, formatted `#YYYYMMDD-NNNN`.

Not an invoice and not an Official Receipt. An OR is a separate document
issued only when a customer asks for one.

---

Supplier Invoice

The document a supplier provides with a delivery, formatted `INV-NNNNN`.

A different sequence from Sale Number, and the only thing called an
invoice in this system.

---

Stock Movement

Any recorded change to a product's stock: a Stock In, a sale, a
cancellation reversal, or a manual adjustment.

Stock is the sum of a product's movements. It is never edited directly.

---

Reorder At

The stock level at or below which a product needs restocking.

Shown as "Reorder At" in the interface rather than "reorder level" or
"reorder point", which read as inventory jargon.

---

Recorded By

The person who made a sale, took a payment, or changed stock.

Every record carries one, so the store can always trace who did what.

---

# UI Terminology Decisions

Recorded 2026-08-22. Applied to the Dashboard and binding on later
screens, so the same thing is never called two names.

| Interface label   | Not                               | Why                                                        |
| ----------------- | --------------------------------- | ---------------------------------------------------------- |
| Sale No.          | Invoice                           | These are not invoices; a supplier invoice is a real thing  |
| Recent Stock Movements | Recent Inventory Transactions | Matches the store's own words, Stock In and Stock Out       |
| Reorder At        | Reorder Level                     | Plain language over inventory jargon                        |
| Recorded By       | User                              | States the audit meaning instead of a generic system word   |
| Current Stock     | On Hand, Available                | Widely used and immediately clear                           |
| Outstanding Credit | Receivables, AR                  | The store's framing; never accounting vocabulary            |

The application should never feel like accounting software (Developer
Handbook section 5). Where a plain word and an industry word both work,
the plain word wins.
