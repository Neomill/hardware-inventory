# Olaer Store

# Developer Handbook

Status: Living Document

---

# 1. Purpose

This handbook defines the engineering standards, architecture principles, design philosophy, and development workflow for the Olaer Store.

Every developer and AI coding assistant must follow this handbook before implementing any feature.

This document is the source of truth for all engineering decisions.

---

# 2. Product Vision

Build a simple, reliable, offline-first Olaer Store that replaces paper-based workflows without disrupting the store's existing operations.

The software should be intuitive enough that a cashier with little computer experience can learn it in less than one day.

The first release prioritizes simplicity, reliability, and business value over feature completeness.

---

# 3. Product Goals

The application should help the hardware store:

• Eliminate paper inventory tracking
• Process sales faster
• Reduce inventory mistakes
• Track customer credit
• Generate sales reports automatically
• Work even without internet
• Prepare for future expansion

---

# 4. Target Users

## Owner

Responsibilities

- Monitor business performance
- Manage inventory
- Review reports
- Manage products
- Review customer balances

Technical Skill

Low to Medium

---

## Cashier

Responsibilities

- Process sales
- Search products
- Receive payments
- Record credit sales
- Receive stock deliveries

Technical Skill

Low

---

## Helper

Version 1

No application access.

Helpers continue preparing products.

---

# 5. Product Philosophy

The application should never feel like accounting software.

It should feel like using a modern POS system.

Priorities:

1. Fast
2. Simple
3. Large touch targets
4. Few clicks
5. Easy to learn

---

# 6. MVP Scope

The prototype focuses only on the following modules.

- Dashboard
- Product Search
- Sales (POS)
- Inventory
- Customer Ledger

Everything else is intentionally excluded.

---

# 7. Technology Stack

Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Zustand
- React Hook Form
- Zod
- TanStack Table

Backend (Future)

- NestJS
- PostgreSQL

Offline (Future)

- SQLite

Cloud Sync (Future)

- Background synchronization

# 8. Architecture Principles

The application follows Feature-Based Architecture.

Each feature owns:

- Components
- Hooks
- Types
- Mock Data
- Services

Features should be isolated whenever possible.

Business logic should never exist inside UI components.

---

# 9. Coding Principles

Always use TypeScript.

Never use "any".

Prefer composition over inheritance.

Prefer functional programming.

Avoid duplicate code.

Keep components focused on a single responsibility.

Extract reusable UI.

Separate UI from business logic.

Use descriptive variable names.

---

# 10. File Size Guidelines

Component

Maximum 250 lines

Hook

Maximum 150 lines

Service

Maximum 200 lines

If larger, refactor.

---

# 11. Naming Conventions

Components

PascalCase

Example

ProductCard.tsx

Hooks

camelCase

useProducts.ts

Types

Product.ts

Constants

UPPER_CASE

Routes

kebab-case

---

# 12. State Management

Prototype

Zustand

Future

Server State

TanStack Query

Do not use Context for global business state.

---

# 13. Mock Data Strategy

The prototype does not connect to a backend.

All features use mocked data.

Mock data should simulate:

Products

Customers

Inventory

Suppliers

Sales

Ledger

Inventory Transactions

Dashboard Metrics

---

# 14. UI Philosophy

Tablet First

Large buttons

Large typography

Minimal typing

Clear hierarchy

High contrast

Minimal scrolling

Simple navigation

One primary action per screen

---

# 15. Design Language

Style

Modern

Clean

Professional

Industrial

Minimal

Avoid visual clutter.

Avoid unnecessary animations.

Use whitespace generously.

---

# 16. Accessibility

Buttons must be touch friendly.

Interactive elements should be easy to tap.

Readable typography.

Clear error messages.

Visible focus states.

---

# 17. Error Handling

Never silently fail.

Display understandable messages.

Always preserve user data.

Confirm destructive actions.

---

# 18. Business Rules

Inventory changes only through transactions.

Never edit stock directly.

Sales reduce inventory.

Receiving stock increases inventory.

Cancelled sales remain in history.

Customer credit supports partial payments.

Customers may have multiple unpaid balances.

Every inventory change must have a reason.

---

# 19. Git Commit Style

Examples

feat(pos): implement checkout workflow

feat(inventory): receive stock flow

fix(dashboard): update KPI calculations

refactor(products): simplify product search

---

# 20. AI Development Rules

Every AI coding session must:

Read:

- PRD.md
- Developer Handbook

Follow:

- Architecture
- Coding Standards
- UI Principles

Do not:

- Invent features
- Change architecture
- Ignore business rules

Implement only the requested feature.

---

# 21. Definition of Done

A feature is complete only when every item below holds. Agents and people use the same list.

## Before building

✓ A written spec exists in `specs/` and the owner has approved it (for anything not already
  designed or specified)

## Code

✓ Matches PRD, the spec and `specs/01/DESIGN-ERRATA.md`

✓ Business rules respected, and enforced in `src/domain/` or the store, not only in the UI

✓ Uses shared components from `src/components/common` instead of local copies

✓ Uses store data; no figures or text copied from the design screenshots

✓ Follows coding standards and is formatted with Prettier

## Verification

✓ `npm run verify` passes: format, lint (zero warnings), typecheck, unit tests with coverage
  thresholds on `src/domain/` and `src/stores/`, build

✓ New pure logic has unit tests; changed rules have a test that fails without the change

✓ The end-to-end test for the affected flow is added or updated, and `npm run test:e2e` passes

✓ Works with no horizontal scroll or clipped figures at 390, 768 and 1280 px wide (tablet first)

✓ Accessible: every control has a label, works by keyboard, dialogs manage focus, and meaning
  never relies on colour alone

✓ No console errors

## Review

✓ Reviewed by the `code-reviewer` agent, with every finding fixed or explicitly accepted

✓ Signed off by the `qa-engineer` agent against the business rules

✓ Built on a branch and merged into `main` by the owner, never pushed to `main` directly

---
