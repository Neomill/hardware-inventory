# Glossary

OR

Official Receipt.

---

Customer Credit

Record of what each customer owes and has paid. Called the "ledger" in
the code; the screen says Customer Credit.

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

Product Code

Unique product identifier, such as `CEM-001`. Called the SKU in the
code; the screen says Product Code.

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

Stock History

Every recorded change to a product's stock: a Stock In, a sale, a
cancelled sale's stock coming back, or a correction. Each change is a
"stock movement" in the code.

Stock is the sum of a product's movements. It is never edited directly.

---

Low-Stock Alert At

The stock level at or below which a product shows as Low Stock and
needs restocking. Called `reorderLevel` in the code.

Shown as "Low-Stock Alert At" (2026-11-09). It replaced "Reorder At",
which still read as inventory jargon to the owner and cashier.

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
| Recent Stock History | Recent Stock Movements, Recent Inventory Transactions | Everyday words (revised 2026-11-09) |
| Low-Stock Alert At | Reorder At, Reorder Level        | Says what it does (revised 2026-11-09)                     |
| Recorded By       | User                              | States the audit meaning instead of a generic system word   |
| Current Stock     | On Hand, Available                | Widely used and immediately clear                           |
| Credit Still Owed | Outstanding Credit, Receivables, AR | Plain words over accounting ones (revised 2026-11-09)   |

The application should never feel like accounting software (Developer
Handbook section 5). Where a plain word and an industry word both work,
the plain word wins.

The full list of plain-language labels from 2026-11-09 (Customer Credit,
Still Owed, Stock History, Correct Stock, Pause Sale, Sell, Product Code
and others) is in `docs/product/03-plain-language-labels.md`.
