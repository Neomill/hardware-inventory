# Olaer Store

Client-side POC for a single hardware store: dashboard, product lookup, POS, inventory and customer ledger.
Frontend only — no backend, no authentication, no cloud sync. See [docs/PRD.md](docs/PRD.md), the
[developer handbook](docs/product/00-developer-handbook.md) and [initialization spec](specs/01/01-project-initialization-spec.md).

## Stack

React 18 · TypeScript · Vite 5 · Tailwind CSS 3 · React Router 6 · Zustand · React Hook Form · Zod · Lucide · Vitest

Versions are pinned to majors that support Node 18 (the local toolchain here is Node 18.15).

## Getting started

```bash
npm install
npm run dev
```

The dev server prints a URL that already includes the Pages base path (`/olaer-store/`).

| Script                  | Purpose                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`           | Vite dev server with HMR                                                                                           |
| `npm run build`         | Typecheck, then build to `dist/`                                                                                   |
| `npm run preview`       | Serve the production build locally                                                                                 |
| `npm run typecheck`     | `tsc` over `src`, the Vite config, and `e2e/` with the Playwright config                                           |
| `npm run lint`          | ESLint, zero warnings allowed (`eslint-config-prettier` turns off formatting rules)                                |
| `npm run format`        | Prettier, rewriting files in place                                                                                 |
| `npm run format:check`  | Prettier, check only (fails on unformatted files)                                                                  |
| `npm run test`          | Vitest (single run), `test:watch` for watch mode. Never runs `e2e/`                                                |
| `npm run test:coverage` | Vitest with v8 coverage. Fails below 90% lines/functions/statements, 85% branches in `src/domain` and `src/stores` |
| `npm run test:e2e`      | Playwright against a dev server on port 5180 (desktop 1280x800 and tablet 768x1024)                                |
| `npm run verify`        | `format:check`, `lint`, `typecheck`, `test:coverage`, `build`, in that order. Leaves out e2e                       |

`verify` is the local quality gate. It leaves out e2e to stay fast, so run `npm run test:e2e`
separately before merging UI changes. First-time e2e setup: `npx playwright install chromium`. If
that download is blocked, use an installed browser instead: `PW_CHANNEL=msedge npm run test:e2e`.
Playwright starts its own dev server on port 5180, or reuses one already running there, so it never
touches a server on 5173. HTML reports go to `playwright-report/`, coverage to `coverage/`.

## Project structure

```
src/
  app/            App root, router, route paths
  components/
    common/       Shared presentational pieces
    layout/       AppShell, Sidebar, TopBar, nav config
  config/         App-wide constants (locale, currency, storage namespace)
  features/       Feature-based modules (dashboard, products, sales, inventory, customers, settings)
  hooks/          Shared React hooks
  lib/            Framework-agnostic helpers (formatting, class merging)
```

Each feature owns its components, hooks, types, mock data and services. Business logic never lives in
UI components.

`@/` is aliased to `src/` in both Vite and TypeScript.

## GitHub Pages

Deployment runs from [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push to
`main`: install → lint → test → build → publish `dist/` via the Pages artifact actions.

One-time repository setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Published at `https://neomill.github.io/hardware-inventory/`.

Two details make the static host work:

- **Base path** — `vite.config.ts` defaults `base` to `/olaer-store/` for local work; the deploy
  workflow sets `VITE_BASE` to `/<repository name>/` so assets resolve under the
  project-site subpath. Override with `VITE_BASE=/ npm run build` for a custom domain or root deploy.
- **Hash routing** — GitHub Pages has no SPA rewrite, so a history URL like `/sales/123` would 404 on
  refresh. The app uses `HashRouter`, making every route (`#/sales/123`) survive a reload and stay
  shareable. Routes are declared once in [`src/app/routes.ts`](src/app/routes.ts).

`dist/.nojekyll` is created during the workflow so Jekyll does not strip build output.

## Status

Project setup, the application shell (sidebar navigation, top bar, routing, footer) and the Dashboard
are in place. Products, Sales, Inventory, Customer Ledger and Settings still render placeholders.

Next milestone is the domain and data layer in
[specs/02](specs/02/02-domain-and-data-layer-spec.md): integer-centavo money, stock derived from an
inventory transaction log, repository interfaces and one coherent seed dataset. Locked product
decisions live in [docs/business/10-decisions.md](docs/business/10-decisions.md); the design
references are corrected by [specs/01/DESIGN-ERRATA.md](specs/01/DESIGN-ERRATA.md).
