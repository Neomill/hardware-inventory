# Full Test Checklist

Date: 2026-11-09. Use this to test the whole app by hand before merging `fix/demo-feedback`
(senior-friendly UX, Phases 1 to 6). Each line says what to do, and what you should see after the
arrow (→).

## How to test

**Run the branch:**

```bash
git checkout fix/demo-feedback
```

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173/olaer-store/. To test on the real tablet, open the **Network** address
the terminal shows (the tablet and laptop must be on the same Wi-Fi).

**Start clean:** go to Settings, tap Reset demo data, and confirm. Do this again whenever the
numbers get confusing.

**Screen sizes.** Test on each size below. In Chrome, DevTools → device toolbar sets the width.

| Size | Width | What it looks like |
| --- | --- | --- |
| Laptop | 1280 × 800 | Sidebar on the left. The cart sits beside the products. |
| Tablet, held sideways | 1024 | Sidebar on the left. The cart opens from a bar at the bottom. |
| Tablet, held upright | 768 | Bottom tabs. The cart opens from a bar at the bottom. |
| Phone | 390 | Bottom tabs. Must work, but it is not the main device. |

**Automated checks** (already run on this branch; rerun before merging):

```bash
npm run verify
```

```bash
npm run test:e2e
```

---

## A. Every screen, every size

- [ ] On every page and at every size, the page never scrolls sideways. Only wide tables scroll,
      inside their own card.
- [ ] The browser console (F12) shows no red errors on any page.
- [ ] Text is easy to read at Large (the default). No important text is tiny or pale grey.
- [ ] Every button is at least a finger wide and tall. No button is only an icon, except the "×"
      close buttons.
- [ ] Nothing important appears only when the mouse hovers over it.
- [ ] Words follow the plain list ([03-plain-language-labels.md](03-plain-language-labels.md)). You
      never see SKU, Ledger, Outstanding, Adjust, Hold, Held, On Hand, Reorder or POS.

## B. Navigation

- [ ] **Laptop and tablet sideways:** the sidebar shows Dashboard, Products, Sell, Inventory,
      Customer Credit, Reports, Help and Settings. → The page you are on is highlighted in orange.
- [ ] **Tablet upright and phone:** the bottom tabs are Dashboard, Sell, Inventory, Customer Credit
      and More. → The current tab is highlighted.
- [ ] Tap **More**. → A menu slides in with every section. Escape or tapping outside closes it.
- [ ] Open Products, Reports, Settings or Help from More. → The **More** tab lights up.
- [ ] Turn the tablet (or resize from 768 to 1024 and back) with the menu open. → Nothing gets
      stuck, and the page still works.
- [ ] On the Sell screen on a tablet, the cart bar sits just above the bottom tabs, not behind
      them.

## C. Dashboard (home screen)

- [ ] Four big buttons come first: **Sell, Receive Delivery, Check Stock, Who Owes Me**.
- [ ] Sell → opens a new sale. Receive Delivery → opens Receive Stock. Check Stock → opens Products
      with the search box ready to type in. Who Owes Me → opens Customer Credit.
- [ ] "Not sure how? See step-by-step help" → opens Help.
- [ ] The figures (Today's Sales, Credit Still Owed, Needs restocking, Total Products) match what
      the other screens show.
- [ ] Recent Sales, Needs Restocking and Recent Stock History show items. Their links open the
      right pages.

## D. Sell (making a sale)

**Product grid:**

- [ ] A tip shows at the top: "Tap Add 1…". **More help** opens Help. **Got it** hides the tip,
      and it stays hidden after a reload.
- [ ] "Best sellers first" shows above the products, and the most-sold items are at the top.
- [ ] Search by name (for example "hammer") and by product code (for example "HAM"). → The list
      filters.
- [ ] Category buttons filter the list. **All** shows everything.
- [ ] Tap **Add 1**. → The item goes into the cart, and the card shows a **"1 in cart"** badge. Tap
      again. → "2 in cart".
- [ ] Tap **Choose Quantity**. → A dialog opens with a stepper and quick numbers (1/5/10/20/50/100).
      Add 10. → The cart has 10 more.
- [ ] Add a product until the cart holds all of its stock. → Its button says **All in Cart** and
      cannot be tapped.
- [ ] An out-of-stock product (Door Knob) → its button says **Out of Stock** and cannot be tapped.

**Cart:**

- [ ] The +/− buttons change the quantity. − stops at 1, and + stops at the stock on hand.
- [ ] Tap **Remove** on a line. → It disappears at once, and a dark bar says "Removed … " with
      **Undo**.
- [ ] Tap **Undo**. → The line comes back in the same place with the same quantity.
- [ ] Remove a line, then add something else. → The Undo bar goes away.
- [ ] **Tablet:** remove the last line inside the cart sheet. → The sheet closes and the Undo bar
      waits at the bottom of the screen. Undo still works.
- [ ] **Clear** asks first ("Clear this sale?"). Cancel keeps the cart, and confirming empties it.
- [ ] **Laptop:** while there is no discount, the cart shows only the Total and the "Includes VAT"
      line, with no Subtotal or Discount. **Checkout** and **Pause Sale** sit side by side, and
      about 2 to 3 lines show before the list scrolls.
- [ ] Reload the page with items in the cart. → The cart is still there.

**Pause and resume:**

- [ ] **Pause Sale** → asks for a label (optional) → "Sale paused." → the cart is empty.
- [ ] **Paused Sales** shows the count, lists the paused sale with its label and time, and
      **Resume** puts it back.
- [ ] With a sale in progress, a paused sale offers **Pause current and resume**. → The two swap.
- [ ] Pause 10 sales. → Pause Sale is disabled and says why.
- [ ] Pause a sale, sell its item in another sale until stock runs low, then resume. → A notice
      lists what changed, and quantities are reduced, never below zero.
- [ ] Discard a paused sale. → It asks first, then it is gone.

## E. Checkout

- [ ] The items list shows every line, and quantities can still be changed here.
- [ ] **Cash** is chosen at first, and Cash received is filled in with the exact total.
- [ ] The quick cash buttons show **Exact ₱…**, then round-ups to the next ₱100, ₱500 and ₱1,000,
      without repeats. Tapping one fills the amount, and **Change** shows in big green numbers.
- [ ] Type less cash than the total. → A clear message, and Confirm is disabled.
- [ ] **Partial Payment** without a customer → it asks for a customer. Choose one and type part of
      the total. → "Remaining balance" shows.
- [ ] **Credit** without a customer → it asks for a customer. Choose one. → The whole amount goes
      to Customer Credit.
- [ ] A **No-name customer** cannot be given credit.
- [ ] The confirm button reads **"Confirm Sale — ₱…"** with the right total.
- [ ] Double-tap Confirm Sale quickly. → Only **one** sale is recorded (check Recent Sales).
- [ ] **Cancel sale** on checkout asks first, then empties the cart and goes back.
- [ ] **VAT check:** the total is the sum of the lines. VAT shows as "Includes VAT (12%) of ₱…" and
      is **never added on top**.

## F. Receipt, sale details and cancelling a sale

- [ ] After confirming → "Sale Completed", with a receipt showing the store name, address, sale
      number, lines, total, payment and change.
- [ ] **Print Receipt** → only the receipt prints, and it fits 80 mm paper or A4. Larger text
      settings do not make the print bigger.
- [ ] **Start New Sale** → an empty Sell screen.
- [ ] Open an old sale from Sell → Recent Sales → **View Details**. → It does not say "just
      completed".
- [ ] **Cancel Sale** on a cash sale → a reason is required → after cancelling, stock comes back
      and the sale shows **Cancelled** with who, when and why.
- [ ] Cancel a credit sale. → The customer's balance goes back down.
- [ ] A credit sale that already has a payment against it cannot be cancelled, and says why.
- [ ] A completed sale cannot be edited anywhere (completed sales never change).

## G. Products

- [ ] The list shows each product with its code, category, price, stock and status. Pages: 48px
      page buttons with **Previous** and **Next**.
- [ ] Search, then **Filters** (category, stock status). → The list and the "1–N of N" count
      update.
- [ ] Every row has **View**, **Receive** and **History** buttons, with no "⋮" menu.
- [ ] **Export** → downloads a CSV with Product, Product Code, Category, Unit, Price, Stock and
      Status.
- [ ] **Add Product**:
  - [ ] Its product code is shown and assigned on save.
  - [ ] The opening stock is recorded.
  - [ ] A duplicate name or a zero price is refused with a clear message.
  - [ ] The new product can be sold straight away.
- [ ] **Product details** shows the stock card, stock history and recent sales.
- [ ] **Edit Product:**
  - [ ] Change the price. → New sales use the new price, and old sales keep the old price.
  - [ ] "Product code (cannot change)" and the unit cannot be edited.

## H. Inventory

**Current Inventory:**

- [ ] The columns are Product, Category, **Stock**, Unit, **Low-Stock Alert At**, Status and
      Actions.
- [ ] The actions are **Receive**, **Correct Stock**, **History** and **View**.
- [ ] **Correct Stock**:
  - [ ] Choose Remove or Add stock and type a number. → A box shows **"Now X → After saving Y"**,
        and the button reads **"Set Stock to Y …"**.
  - [ ] Taking stock below zero is blocked straight away with a message.
  - [ ] A reason is required. The quick reasons (Damaged, Counted on shelf, …) fill it in.
  - [ ] After saving → "Saved. … now has Y … in stock (…)", and the table updates.

**Receive Stock:**

- [ ] Fill in the invoice number (INV-NNNNN), supplier, date (no future dates) and total. Search a
      product, type a quantity and tap **Add to invoice**. Repeat. Tap **Receive Stock**. → A
      confirmation screen, stock goes up, and **Receive another delivery** works.
- [ ] The same invoice number twice is refused. The same product twice on one invoice is refused.
- [ ] Receive from a product row (**Receive**). → The form opens with that product already added.

**Stock History and Invoices:**

- [ ] **Stock History** lists sales, deliveries, corrections and cancelled sales, with filters and
      totals ("Sold", "Received", "Cancelled Sales", "Corrected").
- [ ] **Invoices** lists supplier invoices. Opening one shows its lines.

## I. Customer Credit

- [ ] **Customers Who Owe** is listed with the biggest balance first, showing Still Owed, Unpaid
      Sales and Last Activity.
- [ ] The summary shows Credit Still Owed, Customers With Balance and Oldest Unpaid Sale.
- [ ] **Add Customer** → the new customer appears and can be picked at checkout.
- [ ] Each row's **View** opens the customer page, with Credit History, Unpaid Sales and Payment
      History.
- [ ] **Record Payment**:
  - [ ] The button reads **"Record ₱…"**.
  - [ ] Paying more than is owed is refused while you type.
  - [ ] After saving, the balance goes down. The oldest unpaid sale is paid first.
- [ ] A customer who owes nothing shows "This customer owes nothing." and no Record Payment.

## J. Reports

- [ ] Periods: Today, Yesterday, Last 7 days, Last 30 days and Custom. → Every section follows the
      period.
- [ ] **Daily Sales**: Total Sales, Transactions, Average Sale, "Collected vs Sold on Credit", the
      chart and the Daily Breakdown.
- [ ] **Top Selling Products**: by quantity and by revenue.
- [ ] **Payment Breakdown**: by payment method. The totals add up to Total Sales.
- [ ] **Credit Still Owed**: Total Still Owed, Customer Balances and Credit Payments Received.
- [ ] Make a sale, then check Reports. → The numbers change by exactly that sale.

## K. Settings

- [ ] **Text size: Normal, Large and Extra large.**
  - [ ] Each applies at once, to the whole app.
  - [ ] The choice survives a reload.
  - [ ] Each device keeps its own size.
  - [ ] Reset demo data does not change it.
- [ ] **Store profile:** change the store name, address, phone and VAT rate, then **Save
      settings**. → "Settings saved", the receipt shows the new name, and new sales use the new
      VAT rate.
- [ ] **Data:** the counts are shown. **Export data (JSON)** downloads a file. **Reset demo data**
      asks to confirm and offers the export first.

## L. Help

- [ ] **How Do I…?** shows seven jobs with numbered steps, button names drawn like buttons, and a
      "go there" button on each.
- [ ] Each "go there" button opens the right screen.
- [ ] Every button named in the steps really exists with that exact name.
- [ ] **Print Cheat Sheet** → prints two columns with no menus, and fits **one A4 page**. This has
      not been checked on paper yet.

## M. Keyboard, focus and screen reader basics (laptop)

- [ ] Tab moves through every control in order. A clear orange focus ring always shows.
- [ ] Every dialog keeps Tab inside it, closes with Escape, and returns focus to the button that
      opened it.
- [ ] A whole sale can be done with the keyboard only: search, Add 1, open the cart, Pause or
      Checkout, Confirm.

## N. Saved data and reliability

- [ ] Reload in the middle of a sale. → The cart, paused sales and every record are still there.
- [ ] Open the app in two tabs and make a sale in one. → The other tab shows it after it
      refreshes, and each tab keeps its own cart.
- [ ] If the browser blocks saving (some private modes), Settings → Data says records are kept only
      until the page closes, and the app still works.
- [ ] Stock never goes below zero on any path: sale, correction, resume or cancel.

---

## Report problems

For each problem, note the **screen**, the **size** (laptop, tablet sideways, tablet upright or
phone), **what you did**, **what you expected** and **what happened**. A screenshot helps.
