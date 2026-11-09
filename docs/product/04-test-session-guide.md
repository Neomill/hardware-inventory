# Test Session Guide (Phase 7)

Date: 2026-11-09. This is Phase 7 of the senior-friendly UX plan ([02-senior-ux-plan.md](02-senior-ux-plan.md)).

**Goal:** watch the owner and the cashier use the app on their own. They do five real jobs while you
watch and take notes. You are testing the app, not the people.

- **Who:** the owner and the cashier, **one at a time**, about 30 minutes each.
- **Where:** at the counter, on the real tablet, at a quiet time of day (not during a rush).
- **When:** once now, and once more after the fixes this session leads to.

---

## 1. Before the session

**Get the new version onto the tablet.** The work is on branch `fix/demo-feedback` and is not live
yet. Choose one of these:

- **A. Publish it.** Push the branch, open a pull request into `main` and merge it. The site
  updates at https://neomill.github.io/hardware-inventory/.
- **B. Run it from the laptop.** Leave the live site as it is. On the laptop, run:

  ```bash
  npm run dev
  ```

  The terminal shows a **Network** address, for example `http://192.168.x.x:5173/olaer-store/`.
  Open that address on the tablet. The tablet and laptop must be on the same Wi-Fi.

**On the tablet, before each person:**

- [ ] Open the app, go to **Settings**, tap **Reset demo data**, and confirm. Both people then start
      from the same data.
- [ ] Leave the text size at **Large** (the default). Don't change it for them. Task 6 checks
      whether they find the setting themselves.
- [ ] Don't dismiss the tip on the Sell screen. We want to see whether they read it. The first
      person's "Got it" hides it on that tablet for the second person, so note who saw it.
- [ ] Hold the tablet upright, the way they will use it at the counter. Turn up the brightness and
      charge it.

**Bring:**

- [ ] Their reading glasses.
- [ ] The **supplier invoice slip** (section 4), printed or handwritten.
- [ ] The **cheat sheet**: in the app, open **More**, then **Help**, then **Print Cheat Sheet**.
      Keep it face down until the end of the session.
- [ ] Two copies of the **notes sheet** (section 6), a pen, and a phone timer.

---

## 2. What to say at the start

Read this, or say it in your own words:

> "We are trying out the new version of the store app. I want to see where it is easy and where it
> is confusing, so we can fix it. **You can't do anything wrong.** If something is hard, that is
> the app's fault, not yours.
>
> I will ask you to do a few everyday jobs. Please **say out loud what you are thinking** as you go,
> like 'I'm looking for…'. I will mostly stay quiet and take notes. If you get really stuck, I will
> help.
>
> This is practice data, so nothing you do changes the real store."

---

## 3. How to run it

- **Don't point at the screen or name buttons.** Read the task as it is written. It describes the
  job, not where to tap.
- **Wait before helping.** If they are stuck, ask "What are you looking for?" If they are still
  stuck after **about a minute**, help them, and mark the task "with help".
- **Time each task** from when you finish reading it until they say they are done.
- **Write down their words.** If they call something by a different name, for example "utang"
  instead of "credit", note it word for word. Those words go into the label list
  ([03-plain-language-labels.md](03-plain-language-labels.md)).
- Don't explain afterwards why the app works the way it does. Just thank them and move on.

---

## 4. The tasks

Read each one aloud. Hand over the invoice slip for task 3.

### Task 1: Cash sale

> "A customer buys **2 Claw Hammers** and **1 roll of Masking Tape**. They pay with a **₱1,000**
> bill. Make the sale, and tell me how much change to give."

- **Done when:** the sale is saved and they tell you the change shown on the screen.
- **Watch:**
  - Do they find **Sell** on the home screen?
  - Do they tap **Add 1** twice for the hammers, or use **Choose Quantity**?
  - Do they notice the **"2 in cart"** badge?
  - Do they type ₱1,000 or tap the quick-cash button?
  - Do they read the change from the green box?

### Task 2: Credit sale

> "**Pedro Santos** takes **5 sacks of Cement (Holcim)**. He will pay next week. Record it."

- **Done when:** the sale is saved as **Credit** to Pedro Santos.
- **Watch:**
  - Do they tap Add 1 five times, or use Choose Quantity?
  - Do they find **Credit** under Payment?
  - Do they pick the customer without help?
  - Do they understand the message if they try without choosing a customer?

### Task 3: Receive a delivery

Hand them this slip:

```
ABC TRADING                    INVOICE No. INV-90001
Date: (today)

Paint Thinner ............ 20 liters
Nails 2" ................. 10 kg
                         TOTAL  ₱5,000.00
```

> "This delivery just arrived with this invoice. Put it into the app."

- **Done when:** the invoice is saved with both products. Paint Thinner and Nails 2" now show more
  stock.
- **Watch:**
  - Do they find **Receive Delivery**?
  - Do they understand which paper field goes into which box?
  - Do they find **Add to invoice** for each product?
  - Do they check the list before **Receive Stock**?
  - This task decides whether Receive Stock should be split into steps, so write down every place
    where they hesitate.

### Task 4: Fix a stock count

> "You counted the **Masking Tape** on the shelf. There are only **35 rolls**. Make the app match
> the shelf."

- **Done when:** Masking Tape shows **35 roll** in stock.
- **Watch:**
  - Do they find the product?
  - Do they choose **Remove stock**, not Add stock?
  - Do they work out the difference themselves, or use the **Now → After saving** box?
  - Do they read the **"Set Stock to 35 roll"** button before tapping it?

### Task 5: Who owes, and take a payment

> "Find out **who owes the store the most**, and how much. That customer just came in and paid
> **₱500**. Record it."

If the top balance is under ₱500, say "paid the full amount" instead.

- **Done when:** they tell you the right customer and amount, and the payment is recorded.
- **Watch:**
  - Do they go to **Who Owes Me** or **Customer Credit**?
  - Do they understand "Still Owed"?
  - Do they find **Record Payment**?

### If there is time

- **Task 6, bigger text:** "The words are too small for you today. Make them bigger."
  - **Watch:** do they find **Settings** behind **More**?
- **Task 7, pause a sale:** "Start a sale of 1 hammer. The customer goes to get their wallet. Put
  the sale aside and serve someone else, then finish the first one."
- **Undo:** if they remove the wrong item at any point, note whether they notice the **Undo** bar.

---

## 5. After the tasks (5 minutes)

Ask these and write the answers word for word:

1. "What was the hardest part?"
2. "Was there anything you would call by a different name?"
3. "Was the text easy to read? Were the buttons easy to tap?"
4. "From 1 to 5, how easy was it, where 5 is very easy?"
5. "Would you be happy using this at the counter tomorrow? What would stop you?"

Then turn the **cheat sheet** over and ask: "Would this help you? What is missing?"

---

## 6. Notes sheet

One copy per person. Print this section on its own page.

**Name:** ______________________ **Owner / Cashier** **Date:** ____________

| Task | Done alone? (Yes / With help / No) | Time | Wrong taps | Where they got stuck | Their own words |
| --- | --- | --- | --- | --- | --- |
| 1. Cash sale |  |  |  |  |  |
| 2. Credit sale |  |  |  |  |  |
| 3. Receive delivery |  |  |  |  |  |
| 4. Fix stock count |  |  |  |  |  |
| 5. Who owes and payment |  |  |  |  |  |
| 6. Bigger text (extra) |  |  |  |  |  |
| 7. Pause sale (extra) |  |  |  |  |  |

**Tick what you saw:**

- [ ] Leaned in, squinted or took glasses off and on
- [ ] Tapped the wrong button
- [ ] Waited more than 5 seconds without knowing what to do
- [ ] Read the Sell tip / Tapped "Got it"
- [ ] Used the bottom tabs / Used **More**
- [ ] Noticed the "in cart" badge
- [ ] Used Undo
- [ ] Used the quick cash buttons
- [ ] Read a button aloud before tapping it

**Ease, 1 to 5:** ____ **Would use it tomorrow?** Yes / No / Not yet

**Answers to the after-task questions:**

____________________________________________________________________________

____________________________________________________________________________

____________________________________________________________________________

---

## 7. After the session

- **Success** (from the plan): every task done **without help**, and no blocking errors, by the
  second session.
- **Bring both notes sheets back here.** We will turn them into changes:
  - Words they used differently go into the label list.
  - Anything they got stuck on becomes a fix.
  - Task 3 tells us whether Receive Stock should be split into steps.
  - The cheat sheet gets their suggestions.
- **Reset the demo data** on the tablet when you are done, so the next person starts clean.
