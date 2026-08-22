# Design Reference Errata

Status: Authoritative over the PNG references\
Date: 2026-08-22

The design references in this folder contain contradictions, both against
`docs/` and against each other. Where this file and a PNG disagree,
**this file wins**.

Do not transcribe figures from the screenshots. They are layout and
interaction references, not data fixtures.

---

# E1 --- The partial payment design does not exist

`sales 5 - checkout partial payment.png` and
`sales 6 - checkout payment cash .png` are **byte-identical** files
(md5 `b829fce3fd2f71dd9396e421fab31ffc`). Both show the Cash mode
selected with Cash tendered and Change.

Partial payment is the most complex of the three payment modes and has no
design. Required before Phase 5:

-   Amount Paid input, constrained to `0 < amountPaid < total`
-   Remaining balance display
-   Customer selection, which is **mandatory** in this mode (see E5)
-   Confirmation copy stating what goes to the ledger

Until designed, Phase 5 implements it by analogy to the Credit panel with
an editable amount.

---

# E2 --- Tax direction is inverted in four references

`sales 2`, `sales 4`, `sales 5`, and `sales 6` show
`Subtotal 631.00 + Tax (VAT 12%) 75.72 = TOTAL 706.72`.

Per decision **D1**, VAT is inclusive and never added. The correct
presentation is:

``` text
Subtotal (5 items)     PHP 631.00
Discount                 PHP 0.00
------------------------------------
TOTAL                  PHP 631.00
  incl. VAT (12%)       PHP 67.61
```

`sales 7 - sales confirmation.png` has the correct **structure**
(Subtotal equals Total, no tax line) but stale **figures**: it shows
PHP 706.72 throughout. Against a PHP 631.00 total, cash tendered
PHP 1,000.00 gives change of **PHP 369.00**, not PHP 293.28.

---

# E3 --- Stock figures contradict across three screens

The same five products carry different stock levels depending on the
screen:

  Product              dashboard.png   products.png   sales 2   Reorder level
  -------------------- --------------- -------------- --------- ---------------
  PVC Pipe 1/2"        5               150            150 pcs   20
  Cement (Holcim)      3               35             35 sack   10
  Nails 2"             2               22             22 kg     10
  GI Pipe 1"           4               45             45 pcs    15
  Sand Paper #120      6               8              8 pcs     20

`products.png` and `sales 2` agree with each other. `dashboard.png`
disagrees with both.

There is a second, independent inconsistency: `products.png` badges
Cement (35) and Nails 2" (22) as **Low Stock**, but the reorder levels
from `dashboard.png` are 10 and 10. Both should read In Stock. It also
badges GI Pipe 1" (45, reorder 15) as In Stock while the dashboard lists
it as a low-stock item.

**Resolution.** Stock is derived from the inventory transaction log
(decision D2, Handbook section 18). Low-stock status is derived as
`stock <= reorderLevel`. No screen carries an independent stock figure,
so this class of contradiction becomes impossible once Phase 2 lands.

---

# E4 --- KPI figures contradict across screens

  Metric              dashboard.png    sales 1 - root.png
  ------------------- ---------------- --------------------
  Today's sales       PHP 42,560.00    PHP 18,450.00
  Outstanding credit  PHP 18,340.00    PHP 3,200.00

`sales 1 - root.png` is also internally inconsistent: the header reads
`TOTAL SALES PHP 18,450.00` while the Payment Summary donut in the same
screenshot totals `PHP 12,450.00`.

**Resolution.** Every KPI is computed from the seed transaction log. None
of these figures is a target. `TOTAL PRODUCTS 2,153` is likewise
illustrative -- the Phase 2 seed dataset holds roughly 40 products, and
the tile will read that. Do not hardcode any number from a screenshot.

---

# E5 --- Customer is not optional for credit and partial sales

All checkout references label section 2 `CUSTOMER (OPTIONAL)` and default
it to `Walk-in Customer`, including `sales 4 - checkout credit.png`,
whose own panel reads *"This will be recorded as customer balance."*

A walk-in customer has no ledger. An unattributed balance is
unrecoverable.

**Rule.** A customer is optional for **cash** only, and **required** for
**partial payment** and **credit**. Selecting either mode without a
customer must block Confirm Sale with a clear message.

---

# E6 --- Sale numbering uses two different formats

  Reference             Format shown
  --------------------- -----------------------
  dashboard.png         `INV-2025-0521-0015`
  sales 1 - root.png    `#20250521-0042`
  sales 7               `#20250521-0042`

`dashboard.png` additionally uses `INV-10021` and `INV-10020` as
references for stock-in rows, which are supplier invoice numbers, not
sale numbers, but share the `INV-` prefix.

**Resolution.** Two distinct sequences, two distinct formats:

``` text
Sale number         #YYYYMMDD-NNNN      #20250521-0042
Supplier invoice    INV-NNNNN           INV-10021
```

The dashboard's Recent Sales "INVOICE" column is renamed to "SALE NO."
and adopts the sale number format.

---

# E7 --- Zero-stock products offer an enabled Add button

`sales 2 - new sales.png` shows `Door Knob (Stainless)` at `0 pcs` with
an active `+ Add` button. Business rules state inventory can never be
negative and inactive products cannot be sold.

**Rule.** A product at zero stock renders its Add control disabled with
an Out of Stock treatment. Adding to cart is also capped at available
stock, and the checkout re-validates at confirm time.

---

# E8 --- Barcode scanning contradicts the business observations

`sales 2 - new sales.png` shows a `Scan Barcode` button.
`docs/business/08-observations.md` states plainly: *"Products do not use
barcodes."*

**Resolution.** The control is omitted from Version 1. The search field
already accepts name and SKU, which is how staff actually look products
up. Revisit if the store adopts barcode labelling.

---

# E9 --- Brand name is inconsistent

`sales 1 - root.png` and `sales 7 - sales confirmation.png` show
**OLAER HARDWARE**. `dashboard.png`, `products.png`, `sales 2`,
`sales 3`, `sales 4`, `sales 5`, and `sales 6` show **HARDWARE STORE**.

`src/config/app.ts` currently holds the generic name. The real store name
needs confirmation from the owner, then lives in one constant.

---

# E10 --- Reports is missing from the sidebar in seven references

Reports appears in the sidebar of `sales 1 - root.png` and `sales 7`
only. Per decision **D4** it is a permanent primary nav item, so the
seven references that omit it are stale.

---

# E11 --- Undocumented features appear in the designs

Present in the references, absent from every document in `docs/`:

  Feature                       Seen in                Disposition
  ----------------------------- ---------------------- -------------------
  Hold Sale (with count badge)  sales 1, sales 2, 3    Needs a spec
  NOTE widget                   dashboard.png          Needs a spec
  Export button                 products.png           Phase 9 or later
  Print Receipt                 sales 7                Phase 5, via print stylesheet
  Auto-advance countdown        sales 7                Phase 5, cancellable

None of these are modelled in Phase 2. Hold Sale and the dashboard NOTE
widget each need a written scope before they are built, since both imply
persisted state beyond the sale itself.
