# Hardware Store Management System

Client-side POC for a single hardware store: dashboard, product lookup, POS, inventory and customer ledger.
Frontend only — no backend, no authentication, no cloud sync. See [docs/PRD.md](docs/PRD.md), the
[developer handbook](docs/product/00-developer-handbook.md) and [specs/01](specs/01/dashboard-functional-spec.md).

## Stack

React 18 · TypeScript · Vite 5 · Tailwind CSS 3 · React Router 6 · Zustand · React Hook Form · Zod · Lucide · Vitest

Versions are pinned to majors that support Node 18 (the local toolchain here is Node 18.15).

## Getting started

```bash
npm install
npm run dev
```

The dev server prints a URL that already includes the Pages base path (`/olaer-store/`).

| Script              | Purpose                                           |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | Vite dev server with HMR                          |
| `npm run build`     | Typecheck, then build to `dist/`                  |
| `npm run preview`   | Serve the production build locally                |
| `npm run typecheck` | `tsc` over `src` and the Vite config              |
| `npm run lint`      | ESLint, zero warnings allowed                     |
| `npm run test`      | Vitest (single run) — `test:watch` for watch mode |

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

Published at `https://neomill.github.io/olaer-store/`.

Two details make the static host work:

- **Base path** — `vite.config.ts` sets `base` to `/olaer-store/` so assets resolve under the
  project-site subpath. Override with `VITE_BASE=/ npm run build` for a custom domain or root deploy.
- **Hash routing** — GitHub Pages has no SPA rewrite, so a history URL like `/sales/123` would 404 on
  refresh. The app uses `HashRouter`, making every route (`#/sales/123`) survive a reload and stay
  shareable. Routes are declared once in [`src/app/routes.ts`](src/app/routes.ts).

`dist/.nojekyll` is created during the workflow so Jekyll does not strip build output.

## Status

Project setup and the application shell (sidebar navigation, top bar, routing, footer) are in place.
Feature modules render placeholders; the dashboard specified in
[specs/01](specs/01/dashboard-functional-spec.md) is the next milestone.
