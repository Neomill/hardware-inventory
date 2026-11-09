# Plain-Language Labels (Phase 3)

Date: 2026-11-09. This is part of the senior-friendly UX plan
([02-senior-ux-plan.md](02-senior-ux-plan.md), Phase 3).

The two users are around 60, read English and are not trained in accounting or IT. Every word they
see on screen, in a message, or on a receipt uses the terms below.

This list covers **visible text only.** Code identifiers, types, routes, URLs, storage keys, file
names and specs keep their names (`StockMovement`, `heldSales`, `ROUTES.customers`, `sku` fields,
and so on).

Headings and buttons use Title Case, as the app already does. Sentences use normal case.

## Word list

| Old wording | New wording | Notes |
| --- | --- | --- |
| SKU (label, column, hint) | Product code | The column header is "Product Code". Search placeholders read "Search by product name or code...". |
| SKUs (a count of products) | Products | |
| Customer Ledger | Customer Credit | The nav label and page title. "Back to Customer Ledger" becomes "Back to Customer Credit". "View Ledger" becomes "View Customer Credit". |
| Ledger Statement | Credit History | |
| Outstanding (column or label) | Still Owed | |
| Outstanding balance | Still owed | |
| Outstanding Credit | Credit Still Owed | The dashboard KPI, the report section and the customer summary. |
| Total Outstanding | Total Still Owed | |
| Outstanding Balances (customer list heading) | Customers Who Owe | |
| Outstanding (a sale's payment status) | Unpaid | |
| "no outstanding balance" | "owes nothing" | For example: "This customer owes nothing." |
| Open Charges | Unpaid Sales | |
| Oldest Open Charge | Oldest Unpaid Sale | |
| Stock Movements | Stock History | Tabs, cards and headings. The short tab label is "History". "Recent Stock Movements" becomes "Recent Stock History". |
| "stock movements" in sentences | "stock changes" | For example: "No stock changes in the last 30 days." |
| Reversal / Reversed (movement type, totals) | Sale Cancelled / Cancelled Sales | Stock that came back from a cancelled sale. |
| Adjustment (movement type) | Correction | |
| Adjust Stock (dialog title) | Correct Stock | |
| Adjust (row button) | Correct Stock | Two words, so it is never read as the adjective "correct". |
| Save Adjustment | Save Correction | |
| Adjusted / Adjusted (net) | Corrected / Corrected (net) | |
| "this adjustment" in messages | "this correction" | |
| Movement description `Adjusted: <reason>` | `Corrected: <reason>` | New records only. Saved records are never rewritten. |
| Physical count (quick reason) | Counted on shelf | The seed's "Physical count correction" becomes "Shelf count correction". |
| On Hand (column) | Stock | "In Stock" is already a status label, so the column is just "Stock". |
| "on hand" in sentences | "in stock" | For example: "Only 5 pcs in stock. Stock cannot go below zero." |
| On hand now | In stock now | |
| Reorder At / Reorder Level | Low-Stock Alert At | As a form label: "Low-stock alert at". The hint reads "Shown as Low Stock at or below this number." |
| "reorder level" in sentences | "low-stock alert" | For example: "At or below the low-stock alert". |
| Walk-in Customer | No-name customer | Includes the default customer name saved on new sales and messages such as "...for a no-name customer." |
| Sales (POS) | Sell | The nav label and page title. |
| Open POS | Start a new sale | |
| Hold Sale | Pause Sale | |
| Held Sales | Paused Sales | Includes "held sales" in sentences and accessible names. |
| Sale held. | Sale paused. | "Resume" stays as it is. |
| Credit Extended | Sold on Credit | "Collected vs Credit Extended" becomes "Collected vs Sold on Credit". |

## Unchanged on purpose

- **VAT, Invoice, Supplier, Receive Stock, Partial Payment, Credit, Cash, Discount, Reference,
  Resume:** these are words the owner already uses on paper.
- **Inventory:** the section name stays, because it is the word hardware stores use.
