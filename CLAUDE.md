# Olaer Store

Client-side POS and inventory POC for a single hardware store. React 18, TypeScript, Vite, Tailwind,
Zustand, React Hook Form + Zod, Vitest. No backend (decision D5). See [README.md](README.md).

## Read before changing behaviour

- `docs/product/00-developer-handbook.md` (section 20 has the AI development rules, section 21 the
  definition of done)
- `docs/business/04-business-rules.md` and `docs/business/10-decisions.md` (D1 to D5)
- `specs/01/DESIGN-ERRATA.md`, which overrides the PNG design references

## Rules that are easy to break

- Money is integer centavos (`src/domain/money.ts`). No float arithmetic on money.
- VAT is inclusive and never added to a total (D1). Each sale stores its own `taxRate`.
- Stock changes only through stock movements. It never goes negative.
- Completed sales are immutable. Customer payments are separate records.
- A customer is required for partial and credit sales (E5).
- Never transcribe figures from the screenshots. Every number comes from store data (E3, E4).
- `src/domain/` is pure: no React and no feature imports.
- Business logic lives in `src/domain/` or a feature's `lib/`, never in components.
- Build links from `ROUTES` in `src/app/routes.ts`.

## Layout

- `src/domain/`: types and pure rules (sale, inventory, ledger, reports, settings)
- `src/stores/useShopStore.ts`: the single store, persisted to localStorage (`shopPersistence.ts`)
- `src/features/<module>/`: `pages/`, `components/`, `hooks/`, `lib/` per module
- `src/components/common/`: shared UI

## Checks

`npm run verify` runs format check, lint (zero warnings), typecheck, unit tests with coverage and
the build. It must pass before work is done. Run `npm run test:e2e` for the browser tests of the
main flows. The definition of done is section 21 of the developer handbook.

The dev server is `npm run dev` at http://localhost:5173/olaer-store/ (HashRouter, so routes are
`#/inventory` and so on).

## Agents

Project agents live in `.claude/agents/`. Each owns a folder and edits nothing outside it:

- `data-layer-engineer`: `src/domain/`, `src/stores/`, `src/data/`, `src/lib/format.ts`
- `ui-platform-engineer`: `src/components/`, `src/app/`, `src/hooks/`, `src/lib/pagination.ts`,
  `src/index.css`
- Feature engineers: `src/features/<module>/` (dashboard, products, sales, inventory, ledger
  (`customers`), reports, settings)
- `spec-writer`: `specs/`. `code-reviewer` and `qa-engineer` do not edit app code.

When a change spans owners, the data layer and UI platform go first, then the features. Work
happens on a branch, never on `main`, because a push to `main` deploys. Agents do not commit.
