# Project Initialization Specification

**Project:** Olaer Store\
**Phase:** 1 --- Project Initialization\
**Scope:** Setup only\
**Status:** Initial project setup\
**Backend:** Not included\
**Data:** Mock/client-side only

---

## 1. Objective

Initialize a clean, production-oriented React frontend project that will
serve as the foundation for the Olaer Store POC.

This phase must establish:

- Development environment
- TypeScript configuration
- React application
- Routing foundation
- Tailwind CSS
- shadcn/ui
- State management
- Form/validation libraries
- Icon library
- Basic project structure
- Environment configuration
- Code quality tooling
- Git hygiene

Do **not** implement Dashboard, Products, Sales, Inventory, or Customer
Ledger functionality in this phase.

---

## 2. Existing Source of Truth

The repository already contains project documentation:

```text
docs/
├── 01-business-overview.md
├── 02-current-workflow.md
├── 03-pain-points.md
├── 04-business-rules.md
├── 05-user-roles.md
├── 06-business-processes.md
├── 07-glossary.md
├── 08-observations.md
├── 09-open-questions.md
└── PRD.md
```

Do not modify these documents during project initialization unless
required by an actual discovery.

The application implementation should treat these documents as the
project requirements source of truth.

---

# 3. Technology Stack

Use the following stack:

Area Technology

---

Framework React
Language TypeScript
Build Tool Vite
Styling Tailwind CSS
Component System shadcn/ui
Routing React Router
State Management Zustand
Forms React Hook Form
Validation Zod
Tables TanStack Table
Icons Lucide React

Do not introduce additional application frameworks during this phase.

---

# 4. Project Initialization

Initialize a Vite React TypeScript project.

The application must start successfully with:

```bash
npm install
npm run dev
```

A production build must work with:

```bash
npm run build
```

The production build must complete without TypeScript errors.

---

# 5. Package Requirements

Install and configure:

```text
react
react-dom
react-router-dom
zustand
react-hook-form
zod
@hookform/resolvers
@tanstack/react-table
lucide-react
```

Configure:

```text
Tailwind CSS
shadcn/ui
```

Use the repository's current supported versions rather than blindly
copying outdated installation commands.

---

# 6. TypeScript

Use strict TypeScript.

Required configuration:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

The project must not rely on:

```ts
any;
```

unless there is a documented and justified reason.

Do not disable strict TypeScript rules simply to make the build pass.

---

# 7. Source Structure

Create the initial structure:

```text
src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   └── providers.tsx
│
├── components/
│   └── ui/
│
├── features/
│
├── stores/
│
├── domain/
│
├── lib/
│
├── routes/
│
├── data/
│   └── mock/
│
├── hooks/
│
├── types/
│
├── assets/
│
├── styles/
│   └── globals.css
│
└── main.tsx
```

At this stage these folders are only structural foundations.

Do not create unnecessary feature implementations.

---

# 8. Application Entry Point

`main.tsx` should be responsible for bootstrapping the application.

Expected conceptual flow:

```text
main.tsx
    ↓
App / Providers
    ↓
Router
    ↓
Application routes
```

Do not put business logic in `main.tsx`.

---

# 9. Application Providers

Create a provider boundary for application-wide configuration.

Example responsibilities:

```text
App Providers
├── Router
├── Future global providers
└── Future state/configuration providers
```

Do not create providers that are not currently required.

---

# 10. Routing Foundation

Configure React Router.

Create placeholder routes for the major application areas:

```text
/
 /dashboard
 /products
 /sales
 /inventory
 /ledger
 /settings
```

The routes only need to render simple placeholder pages during this
phase.

Example:

```text
Dashboard
Products
Sales
Inventory
Customer Ledger
Settings
```

No actual feature functionality should be implemented yet.

---

# 11. Route Behavior

The root route should redirect to:

```text
/dashboard
```

Unknown routes should have a basic:

```text
404 Not Found
```

route.

Routing must be centralized rather than scattered across components.

---

# 12. Zustand Setup

Install Zustand and establish the store location:

```text
src/stores/
```

Do not create feature stores yet unless required by the initialization.

The purpose of this phase is to prove that Zustand can be imported and
used correctly.

Future stores will include:

```text
products
sales
inventory
customers
notes
```

but their business logic belongs to later phases.

---

# 13. Form and Validation Setup

Configure:

```text
React Hook Form
Zod
@hookform/resolvers
```

No real forms need to be implemented yet.

The purpose is to establish the approved form/validation stack before
feature development begins.

Future workflows will use:

```text
React Hook Form
        ↓
Zod schema
        ↓
Validated domain input
```

---

# 14. shadcn/ui Setup

Initialize shadcn/ui.

The project must be able to add components using the repository's
configured shadcn workflow.

Do not install every shadcn component during initialization.

Only establish the system.

Future components will be added when a feature requires them.

---

# 15. Tailwind Setup

Configure Tailwind according to the current repository/tooling setup.

Tailwind should be available globally to application components.

Do not build the final visual design in this phase.

The existing design references will be applied during feature
implementation.

---

# 16. Design Tokens

Do not fully implement the application's visual design yet.

However, leave the styling architecture capable of supporting the
project's established brand system.

The current intended brand direction is:

```text
Primary Navy: #163A5F
Burnt Orange: #C65A1E
Light Background: #F8FAFC
Surface: #FFFFFF
```

These values should not be spread as random hardcoded values throughout
components.

When the design system is implemented, centralize them appropriately.

---

# 17. Environment Configuration

Create:

```text
.env.example
```

Only include variables that are actually required.

For example:

```text
VITE_APP_NAME=
```

Do not put:

- Database credentials
- API secrets
- Private keys
- Authentication secrets

in frontend environment variables.

Remember that Vite `VITE_*` variables are exposed to the client.

---

# 18. Data Layer Preparation

Do not connect to a backend.

Create the architectural boundary that will eventually allow:

```text
UI
 ↓
Application logic
 ↓
Repository
 ↓
Local storage / IndexedDB / API
```

The goal is to prevent UI components from becoming tightly coupled to a
future database implementation.

No real repository implementation is required yet beyond whatever
minimal setup is necessary.

---

# 19. Mock Data Policy

Do not create large mock datasets during initialization.

Mock data will be introduced when the first feature is implemented.

Future mock data should live under:

```text
src/data/mock/
```

Do not place mock business data directly inside UI components.

---

# 20. Code Quality

Configure the project so that:

```bash
npm run build
```

passes successfully.

If the repository uses ESLint, configure it for the React + TypeScript
project.

Avoid:

- unused imports
- unused variables
- implicit `any`
- duplicated configuration
- dead files
- placeholder code that produces warnings

---

# 21. Scripts

The project should provide at minimum:

```json
{
  "scripts": {
    "dev": "...",
    "build": "...",
    "lint": "..."
  }
}
```

If a preview script is generated by Vite, keep it.

Expected commands:

```bash
npm run dev
npm run build
npm run lint
```

All should execute successfully.

---

# 22. Git Setup

Ensure the repository ignores:

```text
node_modules/
dist/
.env
.env.local
```

Do not commit secrets.

Keep:

```text
.env.example
```

in the repository.

---

# 23. Initial Verification

Before considering initialization complete, verify:

### Installation

```bash
npm install
```

passes.

### Development

```bash
npm run dev
```

starts successfully.

### TypeScript / Build

```bash
npm run build
```

passes.

### Lint

```bash
npm run lint
```

passes.

### Routes

Verify:

```text
/dashboard
/products
/sales
/inventory
/ledger
/settings
```

all render.

### 404

Verify an invalid URL renders the 404 page.

### Browser

Verify the application opens without:

- Console errors
- React warnings
- TypeScript runtime issues

---

# 24. Initialization Definition of Done

The phase is complete when:

- [ ] Vite React TypeScript project is initialized
- [ ] TypeScript strict mode is enabled
- [ ] Tailwind CSS is configured
- [ ] shadcn/ui is configured
- [ ] React Router is configured
- [ ] Zustand is installed
- [ ] React Hook Form is installed
- [ ] Zod is installed
- [ ] TanStack Table is installed
- [ ] Lucide React is installed
- [ ] Initial source structure exists
- [ ] Application entry point is clean
- [ ] Router is centralized
- [ ] Required placeholder routes work
- [ ] 404 route works
- [ ] Environment example exists
- [ ] Git ignore is configured
- [ ] ESLint/linting works
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] No business feature has been implemented
- [ ] No backend has been added
- [ ] No production credentials/secrets exist in the repository

---

# 25. What Comes After Initialization

Do not implement these during this phase.

The next development phase should begin only after initialization is
verified.

Recommended sequence:

```text
Phase 1
Project Initialization
        ↓
Phase 2
Application Shell / Routing
        ↓
Phase 3
Domain Models + Mock Data
        ↓
Phase 4
Dashboard
        ↓
Phase 5
Products
        ↓
Phase 6
Sales / POS
        ↓
Phase 7
Inventory / Receive Stock
        ↓
Phase 8
Customer Ledger
        ↓
Phase 9
Cross-feature integration
        ↓
Phase 10
Offline persistence
```

Each phase should be implemented, tested, reviewed, and committed before
moving to the next phase.

---

# 26. Vibe-Coding Instruction

When using an AI coding agent, give it this specification as the scope
boundary.

The agent must:

1.  Read the existing `docs/` and `PRD.md`.
2.  Understand that this task is **project initialization only**.
3.  Initialize the requested stack.
4.  Configure the project.
5.  Create the requested structure.
6.  Verify the build and lint commands.
7.  Verify the routes.
8.  Stop.

The agent must **not**:

- Build the Dashboard.
- Build the POS.
- Build Products.
- Build Inventory.
- Build Customer Ledger.
- Invent business rules.
- Add a backend.
- Add authentication.
- Add unnecessary dependencies.
- Create a large mock dataset.
- Implement visual designs from screenshots.
- Modify the PRD to make implementation easier.

The objective is to leave the repository with a clean, working
foundation ready for the next phase.
