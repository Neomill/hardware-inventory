# Dashboard Note Specification

**Project:** Olaer Store\
**Phase:** 3 --- Unspecified features from E11\
**Scope:** The NOTE card on the Dashboard\
**Status:** Deferred --- not in V1 (owner decision 2026-10-04, D7). Only step 0 (removal) is built this round\
**Backend:** Not included (D5)\
**Owners this round:** `dashboard-engineer` (step 0), then `qa-engineer`

---

## 1. Objective

Decide what the NOTE card on the Dashboard is, and either build it properly or remove it.

Today the card shows a sentence copied from `specs/01/dashboard.png`. In
`src/features/dashboard/hooks/useDashboardData.ts`:

```ts
note: {
  id: 'note-1',
  body: 'Check with supplier for more 1/2" PVC Pipe.',
},
```

That breaks the rule that nothing on screen is transcribed from a screenshot (`DESIGN-ERRATA.md`
E3, E4; CLAUDE.md; Handbook s.21, "no figures or text copied from the design screenshots"). It must
go whatever the owner decides about the feature (section 6, step 0).

### What the docs say

**Nothing.** No document in `docs/` mentions a note, a reminder or a message board:

- `docs/product/01-information-architecture.md`, "Dashboard / Widgets", lists exactly Today's
  Sales, Outstanding Credit, Low Stock, Recent Sales and Recent Inventory Transactions. No note.
- `docs/PRD.md`, `docs/business/*` and the Handbook do not mention one.
- The only source is `dashboard.png`, and E11 lists it as "Needs a spec".

The Handbook says "Do not invent features" (s.20), and the dashboard's stated purpose is "Give the
owner a quick overview of the business" (IA), which the other widgets already serve.

### The case for keeping it

The docs do describe a gap a note would fill. "Owner does not open the store. Cashier operates
independently during the morning." (`docs/business/08-observations.md`). The store runs on one
device with no login (D3), so the owner and the cashier see the same Dashboard. A short note on it
is the digital form of a message left by the till: "Check with supplier for more PVC pipe",
"Pedro will pay his balance on Friday". The paper notebook it would replace is named in
`01-business-overview.md`.

### Decision

**The owner chose to remove the note from V1** (2026-10-04, `docs/business/10-decisions.md` D7).
The card is hidden and the hardcoded sentence is deleted (section 6, step 0). That is the only
work this round.

Section 4 is kept as the **future proposal**: if the owner later wants a note, it is the starting
point, and it must be approved again before anyone builds it.

---

## 2. Source of Truth

```text
specs/01/dashboard.png                    The NOTE card: title, icon, one short paragraph
specs/01/DESIGN-ERRATA.md                 E3, E4 (no transcribed text), E11 (needs a spec)
docs/product/01-information-architecture.md   Dashboard widgets (no note listed)
docs/business/08-observations.md          Owner does not open; cashier works alone in the morning
docs/business/10-decisions.md             D3 (one fixed user), D5 (client side)
docs/product/00-developer-handbook.md     s.14 UI, s.17 errors, s.20 AI rules, s.21 DoD
src/features/dashboard/hooks/useDashboardData.ts   hardcoded note
src/features/dashboard/components/NoteCard.tsx     read-only card
src/features/dashboard/pages/DashboardPage.tsx     renders NoteCard when note is not null
src/features/dashboard/types.ts           DashboardNote = { id, body }
src/stores/shopPersistence.ts             persisted shape, SHOP_STORAGE_VERSION = 1
```

The PNG shows one note with no author, date, edit control or list. Everything below about editing,
limits and states comes from this spec.

---

## 3. Non-Goals

- A list of reminders, due dates, done ticks, or notifications. See Q2.
- Notes attached to products, customers or sales.
- Rich text, links, images, mentions.
- Edit history. Only the current note and who last saved it are kept.
- Per-role visibility or editing. There are no roles in the app (D3).
- Syncing between devices (D5).
- Seeding a demo note. The seed has no note: any seeded text would either be copied from the
  screenshot (forbidden) or invented content.

---

## 4. Future Proposal (deferred, not in V1)

Not to be built this round. Kept so the work is not lost if the note is revived. Its open
questions (section 5, Q2 to Q4) stay open until then.

### 4.1 What it is

**One shared note** for the store, shown on the Dashboard. Anyone at the till can write, change or
clear it. It is plain text, short, and replaces itself: there is only ever one.

This matches the design (one card, one paragraph) and the need in 1 (a message left for the next
person at the counter) with the least new state. A list (Q2) is a reminders feature, which nothing
in the docs asks for.

### 4.2 Data model changes

`src/domain/types.ts`:

```ts
/** The single note on the Dashboard. Plain text. */
export type StoreNote = {
  /** Trimmed, 1 to STORE_NOTE_MAX_LENGTH characters. Line breaks kept. */
  body: string
  /** ISO 8601, when it was last saved. */
  updatedAt: string
  /** CURRENT_USER.name (D3). */
  updatedBy: string
}
```

`src/stores/useShopStore.ts`:

```ts
storeNote: StoreNote | null            // null: no note

saveStoreNote(body: string): ActionResult   // blank body clears the note
```

`src/domain/storeNote.ts` (new, pure):

```ts
export const STORE_NOTE_MAX_LENGTH = 280      // Q3
export const STORE_NOTE_MAX_LINES = 6

normalizeStoreNoteBody(raw: string): string   // trim ends; CRLF to LF; 3+ blank lines to 1
validateStoreNote(raw: string): ValidationResult
```

`src/stores/shopPersistence.ts`:

- `PersistedShopData` gains `storeNote: StoreNote | null`.
- `SHOP_STORAGE_VERSION` goes up by one from whatever it is then (Hold Sale takes it to `2` this
  round). The migration step sets `storeNote: null` when absent.
- Sanitizer: keeps the note only if `body` is a non-empty string, `updatedAt` parses as a date and
  `updatedBy` is a string. A body longer than the limit is kept, cut to the limit (stored data is
  never thrown away whole for a length problem). Anything else becomes `null`. A bad note never
  sends the whole dataset back to the seed: it is a "small field", like `settings`.
- `buildSeedData` returns `storeNote: null`, so **Reset demo data clears the note**. The reset
  dialog should mention it (Q4).
- The JSON export includes it through `selectPersistedData`.

`src/features/dashboard/types.ts`: `DashboardNote` is deleted; `DashboardData.note` becomes
`StoreNote | null`, read straight from the store. `useDashboardData` no longer authors anything.

### 4.3 Rules

1. **Save:** `saveStoreNote(body)` normalizes the text. If the result is empty, the note becomes
   `null` (cleared). Otherwise it must pass `validateStoreNote`; on success the note is replaced
   with `{ body, updatedAt: now, updatedBy: CURRENT_USER.name }`.
2. **Length:** at most 280 characters after normalizing, and at most 6 lines. Over the limit is
   refused, not cut: "Keep the note to 280 characters." / "Keep the note to 6 lines." The
   editor counts down so the cashier never reaches the error by surprise.
3. **Unchanged save:** saving the same text does not change `updatedAt` or `updatedBy`.
4. **Plain text:** the body is rendered as text with line breaks preserved
   (`white-space: pre-line`), never as HTML.
5. **Who:** anyone using the app (D3). `updatedBy` is shown so the owner can tell who wrote it.
6. A rejected save writes nothing (store action convention, `data-layer-engineer.md`).

### 4.4 Screens and states (`NoteCard.tsx`, dashboard-engineer)

Position as in the design and the current layout: beside Recent Stock Movements, 3 of 12 columns
at `xl`, full width below it on smaller screens.

| State | Shows |
| ----- | ----- |
| **Empty** (`storeNote === null`) | Title "Note" with the icon; text "No note. Leave a message for whoever opens the store next."; button **Add note** |
| **Has note** | Title "Note"; the body; a footer "Juan Dela Cruz, today 10:42 AM" (or a date for earlier days); button **Edit** (icon button with the label "Edit note") |
| **Editing** | A labelled textarea ("Note") pre-filled with the body; counter "212 left" that turns to a warning colour under 20 and states the problem in words over the limit (not colour alone); **Save** and **Cancel**; **Clear note** when a note exists |
| **Clear** | Confirm inline: "Clear this note? It cannot be brought back." **Clear** / **Keep** (Handbook s.17) |
| **Error** | The store's message in an `Alert` (tone `error`) under the textarea; the typed text is kept (Handbook s.17, "Always preserve user data") |
| **Saved** | Returns to "Has note"; focus goes back to the Edit button |

- The card is always rendered (empty or not), so the Dashboard grid does not jump when a note is
  added or cleared, and the feature can be found.
- Enter inserts a line break; Ctrl+Enter or Cmd+Enter saves; Esc cancels and restores the saved
  text after asking if there are unsaved changes.
- Leaving the Dashboard while editing drops the unsaved text. A draft is not persisted.
- Touch targets and type sizes follow the other dashboard cards (Handbook s.14, s.16).

### 4.5 Edge cases

| Case | Expected |
| ---- | -------- |
| Save only spaces and blank lines | Note cleared (`null`); Empty state shown |
| 281 characters | Refused with the length message; text kept in the editor |
| 7 short lines | Refused with the lines message |
| Pasted text with Windows line endings | Saved with LF; counted after normalizing |
| Text containing `<b>` or a URL | Shown literally; no link, no markup |
| Same text saved again | Nothing changes, including the footer |
| Note saved yesterday | Footer shows the date, not "today" |
| Long unbroken word | Wraps inside the card; no horizontal scroll at 390 px |
| Stored note from a newer or damaged save | Sanitized as in 4.2; other data unaffected |
| Reset demo data | Note cleared |
| Storage blocked (private mode) | Note works until the page closes, like all other data (`DataCard.tsx` already says so) |

### 4.6 Acceptance criteria

- [ ] **AC1** No text from `dashboard.png` appears anywhere in the source or the running app.
- [ ] **AC2** With no note, the card shows the empty state and an Add note button.
- [ ] **AC3** A note of up to 280 characters and 6 lines can be added, edited and cleared from the
      Dashboard; clearing asks for confirmation.
- [ ] **AC4** A longer note is refused with a message that says the limit, and the typed text stays.
- [ ] **AC5** The card shows who last saved the note and when.
- [ ] **AC6** The note survives a page reload and is included in the data export.
- [ ] **AC7** Reset demo data clears the note; the seed has no note.
- [ ] **AC8** The note is shown as plain text with line breaks.
- [ ] **AC9** No horizontal scroll at 390, 768 and 1280 px; the editor works by keyboard and every
      control has a label.
- [ ] **AC10** `npm run verify` passes (or, until it is in place, `npm run typecheck`, `npm test`
      and `npm run lint`), and `npm run test:e2e` covers add, edit and clear.

### 4.7 Test cases

Unit, `src/domain/storeNote.test.ts` (data-layer-engineer):

| ID | Case | Expected |
| -- | ---- | -------- |
| U1 | `normalizeStoreNoteBody('  hi  ')` | `'hi'` |
| U2 | CRLF input | LF only |
| U3 | Four blank lines between two lines | one blank line |
| U4 | `validateStoreNote` with 280 / 281 characters | ok / not ok |
| U5 | 6 / 7 lines | ok / not ok |
| U6 | Empty after normalizing | ok (means clear) |

Store, `src/stores/useShopStore.test.ts`:

| ID | Case | Expected |
| -- | ---- | -------- |
| S1 | `saveStoreNote('Order PVC')` | note set; `updatedBy` is the current user |
| S2 | `saveStoreNote('   ')` with a note | note is `null` |
| S3 | Over the limit | `ok: false`; previous note unchanged |
| S4 | Same text twice | `updatedAt` unchanged after the second |
| S5 | `resetToSeedData` | note `null` |

Persistence, `src/stores/shopPersistence.test.ts`:

| ID | Case | Expected |
| -- | ---- | -------- |
| M1 | Version 1 snapshot | migrates with `storeNote: null` |
| M2 | Stored note with a number for `body` | `storeNote: null`; rest of data loaded |
| M3 | Stored note of 400 characters | kept, cut to 280 |
| M4 | Round trip | identical note after reload |

Browser (qa-engineer): add a note, reload, edit, clear with Keep then Clear, try 281 characters,
check the footer, Reset demo data, and the three viewports. Confirm with a source search that the
screenshot sentence no longer exists in `src/`.

---

## 5. Decisions and Open Questions

### Decided

| # | Question | Decision |
| - | -------- | -------- |
| Q1 | Keep the note in V1? | **No. Removed from V1** (owner, 2026-10-04, D7). Hide the card and delete the hardcoded sentence. Section 4 remains a future proposal. |

Options set aside for Q1: keep one shared editable note (section 4); keep a read-only note set in
Settings.

### Open only if the note is revived

These need no answer now. They apply only to section 4, if the owner later revives it. The
recommendations stand.

**Q2 --- One note or a list of reminders?**

- A. One note. *(Section 4.)* Matches the design and the smallest need.
- B. A short list (up to 5) of reminders, each with a done tick.

Recommendation: **A**. B is a task manager, which the docs do not ask for and the Handbook warns
against ("should never feel like accounting software", s.5; "Do not invent features", s.20).

**Q3 --- Length limit?**

- A. 280 characters, 6 lines. *(Section 4.)* Fits the 3-column card at 1280 px without scrolling,
  like the design.
- B. 500 characters, with the card scrolling.

Recommendation: **A**.

**Q4 --- Should Reset demo data keep the note?**

- A. No, it clears it like every other record. *(Section 4.)*
- B. Yes, keep it.

Recommendation: **A**, with the reset dialog listing "the dashboard note" among what is lost.

---

## 6. Build Order (this round: step 0 only)

```text
0. dashboard-engineer     src/features/dashboard/ only. No store, domain or persistence change.
                          - useDashboardData.ts: delete the hardcoded note and the `note` field.
                          - types.ts: delete DashboardNote and DashboardData.note.
                          - DashboardPage.tsx: stop rendering NoteCard; RecentMovementsCard takes
                            the full row at every width.
                          - NoteCard.tsx: delete (dead code; the future design lives in section 4).

1. qa-engineer            Checks 6.1 below in a browser at 390, 768 and 1280 px.
```

Nothing from section 4 is built this round: no `storeNote` state, no storage version bump for the
note, no editor.

### 6.1 Acceptance criteria for this round

- [ ] **R1** The Dashboard shows no Note card at any width.
- [ ] **R2** The sentence copied from `dashboard.png` appears nowhere in `src/` (source search) or
      in the running app (E3, E4).
- [ ] **R3** Recent Stock Movements fills the row the note used to share, with no gap and no
      horizontal scroll at 390, 768 and 1280 px.
- [ ] **R4** `DashboardData` has no `note` field, and nothing imports `NoteCard` or `DashboardNote`.
- [ ] **R5** `npm run verify` passes (or, until it is in place, `npm run typecheck`, `npm test` and
      `npm run lint`).
