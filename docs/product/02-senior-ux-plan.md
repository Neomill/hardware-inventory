# Senior-Friendly UX Plan

Status: proposal, not yet built. Date: 2026-11-09.

This plan explains how to make Olaer Store easy for its two users: the store owner and the cashier.
Both are around 60, both use Facebook and a smartphone every day, and both wear reading glasses at
the counter. They will use the app on a tablet and a laptop, in English. It has four parts: what that experience gives us, what
the research says, where the app stands today, and the changes in priority order.

---

## 1. Who we are designing for

**What they already know.** Facebook and smartphone experience gives us a lot to build on:

- tapping, scrolling and typing in a search box
- a bar of labelled tabs (Facebook's bottom bar on phone) and a Back button
- red badges with numbers that mean "look at this"
- cards with a photo, a title and one or two buttons
- confirmation screens ("Posted", "Sent")

**What they probably do not know.** These are desktop or office habits, and the app uses them today:

- dense data tables with small uppercase headers
- icon-only buttons, the "⋮" (kebab) menu, and tooltips that only show on hover
- accounting and IT jargon (SKU, Ledger, Adjustment, Stock Movements, Outstanding)
- long forms with many fields on one screen

**What age changes, for most people around 60:**

- **Eyes.** Most people need reading glasses for close work (presbyopia). Contrast sensitivity drops,
  so pale grey text and orange-on-white get harder to read.
- **Hands.** Taps are less precise, and small targets placed close together get mis-tapped.
- **Memory and attention.** Working memory is more easily overloaded, so recognising things on screen
  works better than remembering them.
- **Confidence.** Fear of "breaking something" or making a mistake that cannot be undone is one of the
  biggest barriers. It is a bigger barrier than skill.

Older users are slower, not incapable. The aim is an app that feels calm and safe and can't be
misread. A "senior mode" that looks childish would miss that aim.

---

## 2. What the research says

| # | Principle | Evidence |
| --- | --- | --- |
| R1 | **Bigger text, with user control over size.** Text must still work when enlarged to 200%. Older adults are good at picking the size that suits them. | WCAG 1.4.4 Resize Text. W3C WAI-AGE review. Univ. of Washington study: adults 60+ judged their own best target size better than younger adults did. |
| R2 | **Strong contrast.** Aim for 7:1 on body text (AAA). 4.5:1 is the minimum (AA). | WCAG 1.4.3 and 1.4.6. WAI-AGE notes the loss of contrast sensitivity with age. |
| R3 | **Large, well-spaced tap targets.** 44×44 px is the accessibility "enhanced" level. Accuracy falls sharply for older adults on small targets. | WCAG 2.5.5 (44 px, AAA) and 2.5.8 (24 px, AA). Census Bureau tap-accuracy study (ages 65–84). Leitão & Silva (2012) on target size and spacing. |
| R4 | **Icons always come with a text label.** Older adults have more trouble with icon-only controls. | UBC icon-usability study with older adults (Leung et al.). |
| R5 | **Undo and forgiveness.** Fear of mistakes that can't be undone is a major barrier to learning. | Leung et al. 2012, *How older adults learn to use mobile devices*. Error-recovery studies (Synapse, ExplorAR). |
| R6 | **Consistency and familiar patterns.** In e-health app testing, this was the top-priority heuristic for older users. | Ageing Lab (UPM) older-user testing. |
| R7 | **One main action per screen, with an uncluttered layout and short text.** Content was easier to navigate than menus and buttons. | NIA "Making your website senior friendly". UPM Ageing Lab. 2020 study of 22 older adults. |
| R8 | **Plain words, not jargon.** Use clear labels and short sections. | NIA tip sheet. NN/g *UX Design for Seniors* (87 guidelines from usability tests with people aged 65–89). |
| R9 | **Feedback that stays.** No messages that vanish on a timer, and a clear confirmation of what just happened. | Follows from R5 and R7. WCAG 2.2.1 Timing Adjustable. |
| R10 | **Test with the real person.** None of the POS research covers older owners specifically, so watching our user is the only reliable check. | The research gap itself. The StoreHub POS study recommends user testing first. |

Sources are listed at the end.

---

## 3. Where the app stands today

Based on a code audit of `src/` on branch `fix/demo-feedback`.

**Already good. Keep these:**

- Buttons and inputs are 48 px tall (`h-12`), and main actions are 56 px (`h-14`).
- Every form puts its label above the field. No field relies on a placeholder alone.
- Errors appear inline under the field.
- Success messages stay on screen. Nothing auto-dismisses.
- Dialogs trap focus, close with Escape, and return focus to where you were.
- There is a visible focus ring, and icon-only buttons have `aria-label`s.
- Sidebar items have both an icon and a text label.
- Risky actions ask for confirmation: clear cart, cancel sale, reset data.
- The handbook already says "tablet first, large buttons, large typography" (§14).

**Gaps, mapped to the principles in section 2:**

| Gap | Where | Principle |
| --- | --- | --- |
| Most text is 14 px (`text-sm`): table cells, buttons, product names. There are 76 uses of 12 px (`text-xs`). | `Button.tsx:19`, `SummaryTable.tsx:44`, `PosProductGrid.tsx:36` | R1 |
| Table headers and every card title are 12 px UPPERCASE grey. | `SummaryTable.tsx:55`, `index.css:28` (`.card-title`) | R1, R2 |
| There is no way to make text bigger. | — | R1 |
| White text on brand orange `#F26B21` is about 3:1. That fails AA for normal text, and it is on every primary button. | `tailwind.config.js` | R2 |
| Secondary text is `#64748B` (about 4.8:1), often at 12 px. It passes AA but not AAA. | `text-muted`, 189 uses | R2 |
| The quantity stepper and the cart "remove" button are 36 px. Pagination is 36 px. "Clear" is a bare text link. | `QuantityStepper.tsx:16`, `CartPanel.tsx:60,111`, `Pagination.tsx:15` | R3 |
| Product rows use an eye icon and a "⋮" menu. Inventory "History" and "View" are icon-only with hover tooltips. | `ProductRowActions.tsx:85`, `InventoryTable.tsx` | R4 |
| Removing a cart line happens instantly. There is no confirmation and no undo. No undo exists anywhere in the app. | `CartPanel.tsx:111` | R5 |
| Adding one item takes 2 taps (Add, then Add to Cart in a dialog). A one-item sale takes at least 6 taps. | `AddToCartDialog.tsx` | R7 |
| On phone and small tablet, navigation is behind a hamburger (☰) drawer. There is no bottom tab bar, which is the Facebook pattern our user knows. | `TopBar.tsx`, `MobileNavDrawer.tsx` | R6 |
| The UI has jargon throughout: SKU, Customer Ledger, Stock Movements, Adjustment, Reorder Level, On Hand, Outstanding, Open Charges, Reversed, Walk-in, Physical count, POS. | many | R8 |
| Cash entry is typed only (`placeholder="0.00"`). There are no quick-cash buttons. | `CheckoutPage` | R7 |

---

## 4. The plan

The phases are ordered by value against risk. Phases 1 and 2 are mostly visual and change no business
rule. Every phase must pass `npm run verify` and `npm run test:e2e`. Note: the e2e tests probably find
elements by their visible text, so Phase 3 (renaming) will need test updates.

### Phase 1: Readability (highest value, lowest risk)

1. **Raise the base sizes.**
   - Body, table cells, buttons and product names go from 14 px to **16 px** (`text-base`).
   - Information that matters is never 12 px: card titles, table headers, SKU lines, cart unit prices,
     status pills, inventory tabs. The minimum becomes 14 px, and 12 px is kept for decoration only.
2. **Stop using small UPPERCASE grey for titles.** Card titles and table headers become sentence case,
   14–16 px, semibold, in dark ink. Uppercase at small sizes is the hardest text to read.
3. **Add a text-size setting.** In Settings, add "Text size: Normal / Large / Extra large". It sets the
   root font size to 100%, 112.5% or 125% of the browser default (16, 18 or 20 px). Tailwind sizes
   are in `rem`, so the whole UI scales with it. The default is **Large**, because both users wear
   reading glasses at the counter. It is saved **per device** under its own key, not in store data.
   That way the tablet and the laptop can each keep their own size, and a data export or reset
   leaves it alone. Printouts always use the browser default size.
4. **Fix contrast.**
   - Darken the primary button orange to about `#C2410C` (about 5.2:1 with white), or use dark text on
     the current orange.
   - Darken `muted` to slate-600 `#475569` (about 7.5:1).
   - Make the product image placeholders and empty-state icons darker.
5. **Make numbers easy to read.** The cart total, change due and amount owed become the largest thing
   on their screen. Peso amounts use tabular figures, with the `₱` sign always shown.

*Status: built 2026-11-09.*

- The text size logic is in `src/lib/textSize.ts`, with the `useTextSize` hook and the control in
  `TextSizeCard` on Settings.
- Primary buttons and the active nav item use `brand-700`, and `muted` is `#475569`.
- Card titles and table headers are sentence case.
- No `text-xs` is left in the app; the receipt keeps it for print only.
- Sell and Checkout use `text-base`, with larger totals.

Two layout fixes came out of the Large default:
- The top bar's date and clock chips now wrap on phones.
- The Sell product grid fits as many columns as the space beside the cart allows.

Known limit: on a 1280×800 laptop at Large, the cart list beside the products shows about two lines
before it scrolls. Phases 4 and 5 should revisit the cart layout.

### Phase 2: Tap targets and visible controls

1. Every tappable thing is **at least 48 px**, with at least 8 px between neighbouring targets. This
   covers the stepper (36 → 48), cart remove (36 → 48), pagination, the dialog close button and the
   "Clear" link.
2. **No icon-only buttons in the main flows.** Each icon gets a text label: "Remove", "History",
   "View", "Details".
3. **Remove the "⋮" menu on product rows.** Show the two or three actions as labelled buttons, or open
   a details screen that lists them as large buttons.
4. **No hover-only information.** Anything that is now in a `title` tooltip becomes visible text.

*Status: built 2026-11-09.*

- **48 px controls:** the quantity stepper, pagination, dialog close, cart Clear and Remove, category
  chips, quick-quantity and quick-reason buttons, report filters and row actions are all at least
  48 px (54 px at Large), with 8 px gaps.
- **Labelled buttons:**
  - Cart lines: "Remove".
  - Inventory rows: "History" and "View".
  - Customer rows: "View".
  - Pagination: "Previous" and "Next".
  - Cart notice: "Dismiss".
  - The menu button on tablet portrait and phone: "Menu".
- **Product rows:** the "⋮" menu is gone, replaced by View, Receive and History buttons. The
  `menuPlacement` helper was removed with it.
- **Tooltips:** none are left. Stock pills say "Low Stock" or "Out of Stock" in words, and long
  ledger descriptions and top-seller names wrap instead of being cut off.

Kept as icons: the "×" close buttons on dialogs and the cart sheet. They are 48 px, have accessible
names, and the "×" is a sign both users know from their phones.

Known limit: cart lines are taller now (stepper and Remove at 54 px). On a 1280×800 laptop at
Large, the cart beside the products shows about one and a half lines before it scrolls. This adds
to the cart-height item for Phases 4 and 5.

### Phase 3: Plain language

Replace jargon with everyday words, and update `docs/business/07-glossary.md` to match. These are
first suggestions; the owner should choose the words they actually use in the store.

| Now | Proposed |
| --- | --- |
| SKU | Product code |
| Customer Ledger | Customer Credit |
| Outstanding / Open charges | Still owed |
| Stock Movements | Stock History |
| Adjustment / Save Adjustment | Correct Stock / Save Correction |
| Physical count | Counted on shelf |
| On Hand | In Stock |
| Reorder Level / Reorder At | Low-stock alert at |
| Walk-in Customer | No-name customer |
| Reversed | Cancelled |
| Sales (POS) | Sell |
| Held Sales | Paused Sales |

Also:

- **Write messages as plain sentences.** For example: "Sale saved. Change: ₱150.00". "You removed
  Hammer 16oz. Undo". "Stock of Cement 40kg is now 18 bags."
- **The labels are English only** (owner decision, section 5). Use plain everyday English.

*Status: built 2026-11-09.* The full word list is in
[03-plain-language-labels.md](03-plain-language-labels.md), and `docs/business/07-glossary.md`
points to it. Only visible text changed: code names, routes and storage keys keep their names, and
saved records keep the text they were saved with.

Changes from the first table above, found while applying it:

- "On Hand" became **"Stock"**, not "In Stock", because "In Stock" is already a status label.
- The row button is **"Correct Stock"**, not "Correct", so it is never read as the adjective.
- "Hold Sale" became **"Pause Sale"**, to match "Paused Sales".
- These were added:
  - A sale's "Outstanding" status became **"Unpaid"**.
  - "Open Charges" became **"Unpaid Sales"**.
  - "Credit Extended" became **"Sold on Credit"**.
  - "Open POS" became **"Start a new sale"**.

Still to do: check the words with the owner and cashier in the first test session, and replace any
that do not match how they talk.

### Phase 4: Safety and confidence

1. **Undo instead of extra confirmations, for small actions.** When a cart line is removed, show
   "Removed Hammer 16oz — Undo" in a bar that stays until the next action. Confirmation dialogs stay
   only for big actions: cancel a sale, clear the cart, reset data.
2. **Final buttons say exactly what they will do.** "Confirm sale" becomes "Confirm sale — ₱1,250.00".
   "Save Adjustment" becomes "Set stock to 18".
3. **Show before and after for stock changes.** Display "Now: 20 → After: 18" in large text before
   saving. A live hint already exists, so this makes it more prominent.
4. **Prevent double taps.** Disable final buttons while they save, so a hard or double tap cannot
   record a sale twice.
5. **Success screens.** Show a large check mark, one sentence, and the next likely action, for
   example "New sale" or "Print receipt". This already exists for sales; the plan applies it to
   receiving stock and correcting stock.

*Business rules are unchanged:* completed sales stay immutable. Undo covers only actions that are
not yet saved, such as cart edits.

*Status: built 2026-11-09.*

1. **Undo.** Removing a cart line no longer asks first. A bar says "Removed Claw Hammer 16oz." with
   an Undo button, and it stays until the next cart action. If the sheet closed because the last
   line went, the bar waits at the bottom of the Sell screen. Undo puts the line back in its place.
   If stock fell in the meantime, the quantity is capped at what is left and the screen says so. The
   store action is `restoreCartLine`.
2. **Final buttons say what happens:**
   - Checkout: "Confirm Sale — ₱1,250.00".
   - Correct Stock: "Set Stock to 32 sack" once a valid change is typed, otherwise "Save
     Correction".
   - Record Payment already said "Record ₱500.00".
3. **Before and after.** The Correct Stock dialog shows "Now 35 sack → After saving 32 sack" in
   large type.
4. **Double taps.** Confirm Sale ignores a second tap. Receive Stock, Correct Stock, Record Payment,
   Edit Product and Add Customer lock their save button while it saves.
5. **Success messages.** After a correction, the message leads with the result: "Saved. Cement
   (Holcim) now has 32 sack in stock (−3 sack, Damaged)." Receiving stock already had its own
   confirmation screen, so it is unchanged.

### Phase 5: Fewer steps in the main flows

1. **One-tap add in Sell.** Tapping a product card adds 1. Tapping again adds another. The card shows
   the count in a badge (the Facebook red-badge habit). The quantity dialog becomes optional, opened
   from the cart line or a long-press "More…" button, for bulk items such as nails or cement.
2. **Quick cash buttons** at checkout: "Exact amount", ₱100, ₱200, ₱500, ₱1,000. Change due is shown
   in very large text.
3. **Recognition over recall.** Show product photos where available, and put recently sold or
   favourite products first in Sell.
4. **Home screen with four big task buttons:** Sell, Receive Delivery, Check Stock, Who Owes Me. The
   dashboard figures move below them.
5. **Bottom tab bar on tablet in portrait** (below 1024 px). It has 4–5 labelled tabs, the same
   pattern as Facebook's app, and replaces the hamburger drawer for the main sections. The sidebar
   stays on tablet landscape and laptop, which are the store's main devices. Lower priority than
   steps 1–4.
6. **Break long forms into short steps.** Receive Stock becomes 1) Supplier and invoice, 2) Products
   received, 3) Check and save, with a progress label ("Step 2 of 3").

*Status: steps 1–5 built 2026-11-09; step 6 not started.*

1. **One-tap add.** Each Sell card has "Add 1" and "Choose Quantity". Choose Quantity opens the
   quantity dialog for bulk items, a visible button rather than a hidden long-press. The card shows
   an "N in cart" badge. Add 1 becomes "All in Cart" once the cart holds every unit in stock.
2. **Quick cash.** The amounts are the exact total, then the total rounded up to the next ₱100,
   ₱500 and ₱1,000, without repeats. For ₱5,880 that is Exact ₱5,880.00, ₱5,900.00 and ₱6,000.00.
   The change is shown in large type as before. The amounts come from `quickCashAmounts`.
3. **Best sellers first.** The Sell grid lists the most units sold in the last 30 days first,
   leaving out cancelled sales (`orderByBestSellers`). A small "Best sellers first" caption says so.
   There are still no product photos, because the catalogue has none.
4. **Home screen.** Sell, Receive Delivery, Check Stock and Who Owes Me are big buttons at the top
   of the dashboard. Check Stock opens Products with the search box focused. The figures follow.
5. **Bottom tabs.** Below `lg`, the tabs are Dashboard, Sell, Inventory, Customer Credit and More.
   More opens the full menu, and the old Menu button in the top bar is gone. The tabs sit outside the
   scroll area, so the Sell cart bar stays just above them.
6. **Not started:** splitting Receive Stock into steps. The form already ends on a confirmation
   screen. Deciding on steps should wait until we have watched the owner receive a delivery in a test
   session.

**Cart height on the laptop.** The cart beside the grid hides Subtotal and Discount while there is
no discount, since they would repeat the total. Checkout still shows both. "Proceed to Checkout" is
now "Checkout", which matches the tablet cart bar, and it sits beside Pause Sale. At 1280×800 the
cart now shows about 2.6 lines at Large (it was 1.5), 3.2 at Normal and 2.1 at Extra large.

### Phase 6: Help and learning

- Add a short "How do I…?" help page with 5–6 tasks, each with numbered steps and screenshots from
  the store's own data. It should be printable as a one-page cheat sheet to keep beside the counter.
- Add a first-time hint on Sell ("Tap a product to add it").
- Use friendly empty states that tell the user what to do next. Most already do.

*Status: built 2026-11-09.*

- **Help page** (`/help`, "How Do I…?").
  - **Where it is:** in the menu (behind More on a tablet held upright), plus a link under the big
    buttons on the home screen.
  - **Seven jobs:** sell for cash, sell on credit, receive a delivery, fix a wrong stock count, see
    who owes and take a payment, pause a sale, and make the text bigger. A box underneath covers
    what to do if something goes wrong.
  - **Format:** the steps are numbered, and each button name is drawn like the button itself. Each
    job has a button that opens the screen it starts on.
  - **Wording:** the text lives in `features/help/lib/helpTopics.ts`. A test fails if old jargon
    (Ledger, SKU, Adjust, Hold, Outstanding, POS) comes back.
- **Cheat sheet.** "Print Cheat Sheet" prints the steps in two columns with no navigation, sized to
  fit one A4 page. This has not been checked on a real printer yet.
- **First-time tip on Sell.** "Tap Add 1… Choose Quantity… Undo", with "More help" and "Got it"
  buttons. After "Got it", it stays hidden on that device.
- **Bottom tabs.** On pages behind More (Products, Reports, Settings, Help), the More tab lights up,
  so one tab always shows where you are.
- **Changed from the plan:** there are no screenshots. Pictures of screens go out of date with every
  change, while the drawn button names stay correct because they come from the same word list.

### Phase 7: Test with the real owner (do this after Phase 1, and again at the end)

- **Five tasks, with the owner and the cashier separately, at the counter on the real tablet:**
  1. Sell 3 items for cash.
  2. Sell on credit to a customer.
  3. Receive a delivery.
  4. Correct a stock count.
  5. Find out who owes money.
- Ask them to think aloud. Do not help unless they are stuck for more than about a minute.
- **Record** time per task, wrong taps, moments of hesitation, and the words they use for things.
  Their words feed back into the Phase 3 table.
- **Success target:** every task finished without help, and no task-blocking errors, by the second
  session.

---

## 5. Owner answers (2026-11-09)

| Question | Answer | What it changes in the plan |
| --- | --- | --- |
| Device | **Tablet and laptop.** | Design and test at tablet (768–1024 px, touch) and laptop (1280 px, mouse). Phone (390 px) only has to keep working, as the definition of done already requires. Hover can't be relied on, because tablets have no hover. |
| Language | **English.** | No Filipino or Taglish option. Phase 3 uses plain English words. |
| Reading glasses | **Yes, at the counter.** | The default text size is **Large** (18 px root). The size setting stays, so each person can change it. |
| Other users | **Owner and cashier, both about 60.** | Both personas need the senior-friendly design, not only the owner. The cashier spends most of the day in **Sell and Checkout**, so those screens come first in every phase. |
| Testing | **Yes, about 30 minutes.** | Run the Phase 7 sessions with **both** people, separately, on the real tablet. Once after Phase 1, and again at the end. |

---

## Sources

- Nielsen Norman Group, *UX Design for Seniors (Ages 65 and older)*, 3rd ed. — https://www.nngroup.com/reports/senior-citizens-on-the-web/
- W3C WAI-AGE, *Comparative requirements for older users* — https://www.w3.org/WAI/WAI-AGE/comparative.html
- W3C WAI-AGE, *Needs for older users: targeted studies* — https://www.w3.org/WAI/WAI-AGE/targeted.html
- WCAG 2.2 target size 2.5.5 / 2.5.8 summaries — https://www.disabilityworld.org/toolkit/standards/wcag/2-5-5-target-size-enhanced/ and https://www.disabilityworld.org/toolkit/standards/wcag/2-5-8-target-size-minimum/
- NIA, *Making your website senior friendly* (archived) — https://webarchive.library.unt.edu/web/20120915102518/http://www.nia.nih.gov/health/publication/making-your-website-senior-friendly
- UPM Ageing Lab, *UX and usability for older users* — https://ageinglab.ctb.upm.es/en/ux-and-usability-for-older-users-en
- Univ. of Washington, self-selected target sizes for older adults (ASSETS '19) — https://faculty.washington.edu/wobbrock/pubs/assets-19.06.pdf
- Hourcade, tap accuracy by age (US Census Bureau FedCASIC 2005) — https://www.census.gov/fedcasic/fc2005/ppt/wp3_hourcade.pdf
- Leitão & Silva (2012), target and spacing sizes for smartphone UIs for older adults — https://mural.maynoothuniversity.ie/6045
- Leung et al., icon usability for older adults (UBC) — https://www.cs.ubc.ca/labs/edapt/papers/leung2011.pdf
- Synapse: trial-and-error support for older adults — https://ar5iv.labs.arxiv.org/html/2209.09596
- ExplorAR: older adults learning smartphone apps — https://arxiv.org/html/2508.01282v1
- StoreHub POS usability preprint (2025) — https://www.preprints.org/manuscript/202504.1736
- Singapore CHI app guidelines for seniors — https://child.chi.sg/files/pdffiles/chi_app_guidelines.pdf

Contrast ratios in this document were calculated from the hex values in `tailwind.config.js`.
WCAG 1.4.6 (7:1, AAA) is quoted from the WCAG standard, not from the search results above.
