# Hardware Store Management System

## Dashboard Functional Specification --- Client-Side POC

**Document Type:** Functional Specification\
**Scope:** Dashboard only\
**Implementation:** Frontend-only React prototype\
**Primary Users:** Cashier and Owner\
**Primary Device:** Tablet, with laptop/desktop support

------------------------------------------------------------------------

## 1. Purpose

The Dashboard is the operational starting point for the hardware store
application.

It must allow the user to quickly understand:

1.  Today's sales
2.  Outstanding customer balances
3.  Products that need restocking
4.  Total active products
5.  Recent sales
6.  Recent inventory activity
7.  Important store notes
8.  Quick access to common operations

The dashboard must use application state and derived data rather than
hardcoded values.

------------------------------------------------------------------------

# 2. POC Scope

For this prototype:

-   No backend is required.
-   No authentication is required.
-   No cloud sync is required.
-   No real payment processing is required.
-   No real barcode scanner integration is required.
-   Data is provided through local mock data.
-   User actions must modify client-side application state.
-   State should persist across page refreshes.
-   Dashboard values must be derived from the same data used by other
    modules.

The prototype should behave like a small working application rather than
a static mockup.

------------------------------------------------------------------------

# 3. Required Technology

## Core

-   React
-   TypeScript
-   Vite

## State

-   Zustand

## Routing

-   React Router

## UI

-   Existing repository UI/components
-   shadcn/ui where appropriate
-   Tailwind CSS

## Forms / Validation

-   React Hook Form
-   Zod

## Icons

-   Lucide React

## Persistence

For the initial POC:

-   localStorage is acceptable.

The application should isolate persistence behind a
repository/data-access layer so it can later be replaced with IndexedDB.

------------------------------------------------------------------------

# 4. Dashboard Responsibilities

The Dashboard must not become the place where business transactions are
created.

Its responsibility is:

-   Display business status
-   Display operational alerts
-   Display recent activity
-   Provide navigation to operational workflows

Examples:

-   New Sale → Sales workflow
-   Receive Stock → Inventory receiving workflow
-   Customer Ledger → Customer balances
-   Search Product → Product lookup

------------------------------------------------------------------------

# 5. Required Dashboard Data

The Dashboard must consume the following domain data:

``` ts
Product
Sale
SaleItem
Customer
Payment
InventoryTransaction
Note
```

The Dashboard should not maintain a separate copy of these records.

------------------------------------------------------------------------

# 6. KPI Requirements

The Dashboard must display four primary metrics.

## 6.1 Today's Sales

Definition:

> Total value of completed sales created during the current business
> date.

Include:

-   Cash sales
-   Partial-payment sales
-   Credit sales

Exclude:

-   Cancelled sales

The calculation must use the sale's transaction date.

Example:

``` ts
todaySales = sum(
  sale.total
  where sale.createdAt is today
  and sale.status !== "cancelled"
)
```

The value must update automatically when a new sale is completed or an
existing sale is cancelled.

------------------------------------------------------------------------

## 6.2 Outstanding Credit

Definition:

> Total unpaid customer balance currently recorded in the system.

This is not limited to today's transactions.

Example:

``` ts
outstandingCredit = sum(
  customer.outstandingBalance
)
```

Alternatively, if balances are derived from transactions:

``` text
Outstanding =
Credit/Partial Sales
-
Recorded Payments
```

The implementation must use one consistent source of truth.

------------------------------------------------------------------------

## 6.3 Low Stock Items

Definition:

> Number of active products whose current stock is at or below their
> reorder level.

Example:

``` ts
lowStockCount = products.filter(
  product =>
    product.isActive &&
    product.currentStock <= product.reorderLevel
).length
```

Out-of-stock products should also be included in the low-stock count
unless the product's business rules explicitly separate them.

------------------------------------------------------------------------

## 6.4 Total Products

Definition:

> Number of active product records.

Do not count inventory quantity.

Example:

``` ts
totalProducts = products.filter(
  product => product.isActive
).length
```

------------------------------------------------------------------------

# 7. KPI Comparison

Where previous-period comparison is displayed, it must be calculated.

For example:

``` ts
changePercentage =
  previousValue === 0
    ? null
    : ((currentValue - previousValue) / previousValue) * 100
```

The UI must handle:

-   Increase
-   Decrease
-   No change
-   Previous value of zero

Do not hardcode percentages in dashboard components.

------------------------------------------------------------------------

# 8. Quick Actions

The Dashboard must provide navigation to the most common workflows.

## New Sale

Action:

``` text
Navigate to Sales → New Sale
```

Expected result:

The cashier can immediately begin selecting products.

------------------------------------------------------------------------

## Receive Stock

Action:

``` text
Navigate to Inventory → Receive Stock
```

Expected result:

The cashier can begin the stock receiving workflow.

------------------------------------------------------------------------

## Customer Ledger

Action:

``` text
Navigate to Customer Ledger
```

Expected result:

The user can search customers and review outstanding balances.

------------------------------------------------------------------------

## Search Product

Action:

``` text
Navigate to Products
```

Expected result:

The user can search and view current product stock.

------------------------------------------------------------------------

# 9. Recent Sales

The Dashboard must display a limited number of recent sales.

Recommended POC limit:

``` text
5 records
```

The list must be sorted by:

``` text
createdAt DESC
```

Each record should expose enough information to identify the
transaction:

-   Sale number
-   Customer
-   Total
-   Payment type
-   Transaction time
-   Payment status

Payment types:

``` ts
"cash"
"partial"
"credit"
```

Statuses may include:

``` ts
"paid"
"partial"
"unpaid"
"cancelled"
```

------------------------------------------------------------------------

# 10. Recent Sales Navigation

Selecting a sale must navigate to the sale detail workflow.

Example:

``` text
/sales/:saleId
```

The Dashboard must not directly edit the sale.

The user should be able to inspect:

-   Sale items
-   Sale total
-   Customer
-   Payment type
-   Amount paid
-   Remaining balance
-   Transaction date
-   Sale status

For partial/credit sales, the sale detail page must provide access to
recording a payment.

------------------------------------------------------------------------

# 11. View All Sales

The Dashboard must provide navigation to the full Sales workspace.

Expected destination:

``` text
/sales
```

The Sales workspace is responsible for:

-   Starting a new sale
-   Searching sales
-   Filtering sales
-   Viewing sale details
-   Recording payments for outstanding balances

The Dashboard only provides a recent summary.

------------------------------------------------------------------------

# 12. Low Stock Items

The Dashboard must display a limited list of products requiring
attention.

Recommended POC limit:

``` text
5 records
```

Sort order:

1.  Out of stock
2.  Lowest stock percentage
3.  Lowest current quantity

At minimum, each record should provide:

-   Product name
-   Current stock
-   Unit
-   Reorder level

Example:

``` text
currentStock: 5
reorderLevel: 20
unit: "pcs"
```

------------------------------------------------------------------------

# 13. Low Stock Navigation

Selecting a low-stock product must navigate to its product detail.

Example:

``` text
/products/:productId
```

"View All" must navigate to the Products page with a low-stock filter.

Example:

``` text
/products?filter=low-stock
```

------------------------------------------------------------------------

# 14. Product Stock Rules

The Dashboard must not calculate stock from arbitrary UI state.

Product stock must come from the application's inventory source of
truth.

For example:

``` text
Initial Stock
+
Stock In
-
Sales
+
Returns
+
/- Adjustments
=
Current Stock
```

The exact inventory calculation should eventually live in the inventory
domain/service layer.

------------------------------------------------------------------------

# 15. Recent Inventory Transactions

The Dashboard must display recent inventory activity.

Recommended POC limit:

``` text
5 records
```

Transaction types:

``` ts
"stock_in"
"sale"
"adjustment"
"return"
```

For the first POC, it is acceptable to implement:

``` ts
"stock_in"
"sale"
```

while keeping the data model extensible.

Each transaction should contain:

``` ts
{
  id: string
  type: InventoryTransactionType
  productId: string
  quantity: number
  referenceId?: string
  description: string
  createdAt: string
  createdBy?: string
}
```

------------------------------------------------------------------------

# 16. Inventory Transaction Navigation

Selecting a transaction should navigate to the relevant source record
where possible.

Examples:

``` text
Stock In
→ Inventory Receiving Details

Sale
→ Sale Details

Adjustment
→ Inventory Adjustment Details
```

The Dashboard must not duplicate transaction-management logic.

------------------------------------------------------------------------

# 17. Notes

The POC may provide a simple store note feature.

Minimum requirements:

-   Display current note
-   Create note
-   Edit note
-   Delete note

Example model:

``` ts
type Note = {
  id: string
  content: string
  createdAt: string
  updatedAt: string
}
```

For the initial POC, one active dashboard note is sufficient.

------------------------------------------------------------------------

# 18. Data Relationships

The Dashboard must use related entities rather than duplicated
information.

Example:

``` text
Sale
  ↓
Customer
  ↓
Customer Balance
```

and:

``` text
Sale
  ↓
Sale Items
  ↓
Products
  ↓
Inventory
```

and:

``` text
Stock Receipt
  ↓
Inventory Transaction
  ↓
Product Stock
```

This allows the dashboard to reflect changes made elsewhere in the
application.

------------------------------------------------------------------------

# 19. Client-Side State

Use Zustand for shared application state.

Suggested stores:

``` text
products.store.ts
sales.store.ts
customers.store.ts
inventory.store.ts
notes.store.ts
```

The Dashboard should primarily consume selectors.

Example:

``` ts
useDashboardStore()
```

is not preferred if it creates a second source of truth.

Instead:

``` text
Product Store
      ↓
Product Selectors
      ↓
Dashboard
```

``` text
Sales Store
      ↓
Sales Selectors
      ↓
Dashboard
```

------------------------------------------------------------------------

# 20. Dashboard Selectors

Create reusable derived selectors.

Examples:

``` ts
selectTodaySales()
selectOutstandingCredit()
selectLowStockProducts()
selectTotalActiveProducts()
selectRecentSales()
selectRecentInventoryTransactions()
```

These selectors should be reusable by other parts of the application.

------------------------------------------------------------------------

# 21. Persistence

The POC must persist client-side data.

Minimum requirement:

``` text
Refresh browser
↓
Data remains available
```

Recommended implementation:

``` text
Zustand
↓
Persistence middleware
↓
localStorage
```

However, application components should not directly call:

``` ts
localStorage.getItem()
localStorage.setItem()
```

Instead, isolate persistence.

Example:

``` text
Application
    ↓
Store
    ↓
Repository
    ↓
Storage Adapter
    ↓
localStorage
```

This makes migration to IndexedDB easier.

------------------------------------------------------------------------

# 22. Mock Data

The POC must contain realistic data for:

-   Products
-   Sales
-   Customers
-   Inventory transactions
-   Notes

Mock data should represent real business scenarios.

Required sale examples:

1.  Cash sale
2.  Partial-payment sale
3.  Credit sale
4.  Cancelled sale

Required inventory examples:

1.  Stock received
2.  Product sold
3.  Low-stock product
4.  Out-of-stock product

------------------------------------------------------------------------

# 23. Business Rules the Dashboard Must Respect

## Cancelled Sale

Cancelled sales:

-   Do not contribute to today's sales
-   Do not contribute to outstanding credit
-   Must remain visible in transaction history if history supports
    cancelled records

------------------------------------------------------------------------

## Cash Sale

``` text
total = amountPaid
remainingBalance = 0
status = paid
```

------------------------------------------------------------------------

## Partial Sale

``` text
amountPaid > 0
amountPaid < total
remainingBalance = total - amountPaid
status = partial
```

------------------------------------------------------------------------

## Credit Sale

``` text
amountPaid = 0
remainingBalance = total
status = unpaid
```

A customer is required for credit and partial transactions according to
the application's business rules.

------------------------------------------------------------------------

# 24. Dashboard Refresh Behavior

The Dashboard must update when application state changes.

Example:

``` text
Cashier completes sale
        ↓
Sales store updates
        ↓
Inventory store updates
        ↓
Customer balance updates if applicable
        ↓
Dashboard selectors recalculate
        ↓
Dashboard reflects new values
```

No manual page refresh should be required.

------------------------------------------------------------------------

# 25. Error Handling

The POC must handle common states.

## No sales

Display an empty state instead of a broken table.

## No low-stock products

Display:

``` text
No products need restocking.
```

## No inventory transactions

Display:

``` text
No recent inventory activity.
```

## No notes

Display an empty note state.

## Missing product/customer reference

Do not crash the dashboard.

Display a safe fallback such as:

``` text
Unknown Product
```

or

``` text
Walk-in Customer
```

------------------------------------------------------------------------

# 26. Loading / Initialization

Even though the POC is local-only, structure the application so data
initialization can later become asynchronous.

Avoid assuming:

``` ts
data === immediately available
```

The Dashboard should support:

``` text
loading
ready
empty
error
```

states.

------------------------------------------------------------------------

# 27. Performance Requirements

The Dashboard should remain responsive on an entry-level tablet.

Requirements:

-   Avoid unnecessary global re-renders.
-   Use Zustand selectors instead of subscribing components to the
    entire store.
-   Avoid recalculating large datasets repeatedly.
-   Keep mock datasets reasonably sized for the POC.
-   Do not introduce unnecessary dependencies.

The Dashboard should not require a powerful laptop to operate smoothly.

------------------------------------------------------------------------

# 28. Offline-Oriented Architecture

Although offline sync is outside this POC, the application must not be
architected in a way that prevents it.

Future architecture:

``` text
React UI
    ↓
Application Services
    ↓
State Management
    ↓
Repository Interface
    ↓
IndexedDB
    ↓
Sync Queue
    ↓
Backend API
    ↓
Cloud Database
```

The Dashboard should only care about application/domain data.

It should not care whether that data came from:

``` text
localStorage
IndexedDB
REST API
cloud sync
```

------------------------------------------------------------------------

# 29. Security Boundaries

Security is not fully implemented in this frontend-only POC.

However:

-   Do not put secrets in the frontend.
-   Do not place database credentials in environment variables exposed
    to Vite.
-   Do not assume frontend role restrictions are security.
-   Do not implement authorization solely through React route guards.

Future authorization must be enforced by the backend.

------------------------------------------------------------------------

# 30. Testing Requirements

At minimum, test the dashboard calculations.

Examples:

### Today's Sales

Given:

``` text
Sale A = ₱1,000 today
Sale B = ₱500 today
Sale C = ₱2,000 yesterday
```

Expected:

``` text
Today's Sales = ₱1,500
```

------------------------------------------------------------------------

### Cancelled Sale

Given:

``` text
Sale A = ₱1,000
status = cancelled
```

Expected:

``` text
Today's Sales = ₱0
```

------------------------------------------------------------------------

### Low Stock

Given:

``` text
currentStock = 5
reorderLevel = 10
```

Expected:

``` text
lowStock = true
```

Given:

``` text
currentStock = 10
reorderLevel = 10
```

Expected:

``` text
lowStock = true
```

------------------------------------------------------------------------

### Outstanding Balance

Given:

``` text
Credit Sale = ₱1,000
Payment = ₱300
```

Expected:

``` text
Outstanding = ₱700
```

------------------------------------------------------------------------

# 31. Definition of Done

The Dashboard POC is complete when:

-   [ ] React + TypeScript project runs locally
-   [ ] Dashboard route works
-   [ ] Sidebar navigation works
-   [ ] Mock data loads successfully
-   [ ] KPI values are calculated from application data
-   [ ] Today's sales calculation works
-   [ ] Outstanding balance calculation works
-   [ ] Low-stock calculation works
-   [ ] Active-product count works
-   [ ] Recent sales are dynamically generated from sales data
-   [ ] Recent inventory transactions are dynamically generated
-   [ ] Quick actions navigate to the correct workflows
-   [ ] Sale records can be opened
-   [ ] Product records can be opened
-   [ ] Dashboard reflects state changes without page refresh
-   [ ] Data survives browser refresh
-   [ ] Empty states are handled
-   [ ] Invalid/missing references do not crash the application
-   [ ] Dashboard calculations have automated tests
-   [ ] No business-critical values are hardcoded into UI components
-   [ ] No direct localStorage access exists inside presentation
    components
-   [ ] Architecture allows local persistence to be replaced by
    IndexedDB later

------------------------------------------------------------------------

# 32. Recommended Implementation Order

Do not build the entire Dashboard at once.

Implement in this order:

``` text
1. Project setup
        ↓
2. Domain types
        ↓
3. Mock data
        ↓
4. Repository/storage layer
        ↓
5. Zustand stores
        ↓
6. Dashboard selectors
        ↓
7. Dashboard data states
        ↓
8. Dashboard interactions/navigation
        ↓
9. Persistence
        ↓
10. Tests
        ↓
11. Integration with Sales
        ↓
12. Integration with Inventory
        ↓
13. Integration with Customer Ledger
```

The visual implementation can then be applied using the existing
repository design reference.

------------------------------------------------------------------------

# 33. Important Development Principle

The prototype should **not be implemented as a screenshot recreation**.

The screenshot is a **visual reference only**.

The functional architecture should represent the eventual application:

``` text
Sales
  ↓
Inventory
  ↓
Customer Ledger
  ↓
Dashboard
```

A successful POC should allow a user to perform an action and see its
consequences elsewhere in the application.

For example:

``` text
Create ₱1,000 cash sale
        ↓
Sale created
        ↓
Inventory decreases
        ↓
Inventory transaction created
        ↓
Today's Sales increases
        ↓
Recent Sales updates
```

and:

``` text
Receive 50 sacks of cement
        ↓
Stock receipt created
        ↓
Inventory increases
        ↓
Inventory transaction created
        ↓
Low-stock status recalculates
        ↓
Dashboard updates
```

This is the minimum level of functional behavior that makes the
prototype useful for validating the actual hardware-store workflow.
