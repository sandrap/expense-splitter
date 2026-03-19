# Expense Splitter

## What This Is

A mobile-first web app for splitting restaurant bills fairly among friends. Users add people, enter receipt items, assign who had what (including shared dishes), set per-person tip rates, and get a clear per-person breakdown with itemized detail — updating live on every keystroke. Designed to be used at the table on a phone, no install required.

## Core Value

Every person pays exactly what they owe — no more, no less — even when shared appetizers, different tip preferences, and tax make it complicated.

## Requirements

### Validated

- ✓ Add people to the bill by name, edit and remove them — v1.0
- ✓ Add receipt items with prices, edit and delete them — v1.0
- ✓ Assign items to one or more specific people using tap-toggle chips — v1.0
- ✓ Mark items as shared among a chosen subset (e.g. appetizer split between Sarah and Mike only) — v1.0
- ✓ Allow each person to set their own tip percentage (per-person override) — v1.0
- ✓ Handle tax as a single bill-wide percentage, split proportionally — v1.0
- ✓ Show final per-person totals, updating live on every keystroke — v1.0
- ✓ Show expandable itemized breakdown per person (what they had, tip, tax) — v1.0

### Active

*(none — next milestone to be defined)*

### Out of Scope

- Native mobile app (iOS/Android) — web-first covers the use case; PWA if needed later
- User accounts / saving sessions — single-use per meal, no persistence needed
- Payment integration (Venmo, etc.) — show what's owed, not how to pay
- Bill scanning / OCR — manual entry for v1; could revisit if user feedback demands it
- Bill-wide tip (single rate for all) — per-person override ships first; bill-wide is a v2 candidate
- Real-time multi-user collaboration — adds backend complexity; one person enters for the table

## Context

**Shipped v1.0 with 2,801 LOC TypeScript/TSX.**
Tech stack: Vite 8 + React 19 + TypeScript + Zustand 5 + Tailwind CSS v4 + Vitest 4.

**Architecture decisions proven:**
- Integer-cent arithmetic throughout — floating-point bugs are impossible by design
- Largest-remainder rounding ensures distributed shares always sum exactly to item total
- `useDraftCalculation` dual-track pattern (ephemeral drafts + Zustand store) enables live recalculation without coupling UI inputs to committed state
- Client-side only — no backend, static deployment (Cloudflare Pages or similar)

**Known tech debt from v1.0:**
- `PersonResultCard` Escape key on tip edit deletes committed override instead of cancelling (medium)
- `PersonResultCard` tip commit missing `val <= 100` cap (low)
- Cloudflare Pages SPA routing: verify `_redirects` before first deploy

## Constraints

- **Tech stack**: Vite + React + TypeScript (locked in)
- **Deployment**: Static hosting, no server required
- **Performance**: Instant calculation — `useDraftCalculation` hook, no Calculate button
- **Arithmetic**: Integer cents only — no floats in engine, ever

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Mobile-first web over native app | Same use case, fraction of the complexity | ✓ Good — works well on phone at table |
| Client-side only, no backend | Bill splitting needs no persistence or auth | ✓ Good — simple deploy, no infra |
| Integer-cent arithmetic | Floating-point rounding errors in money are unacceptable | ✓ Good — engine is provably correct |
| Largest-remainder rounding | Distributed shares must sum exactly to item total | ✓ Good — 12 edge-case tests pass |
| Per-person tip over bill-wide tip first | Most common pain point at restaurants | ✓ Good — bill-wide tip deferred to v2 |
| `useDraftCalculation` dual-track state | Live recalculation without committing partial input to store | ✓ Good — clean separation, optional callback props keep tests simple |
| Zustand v5 named import | v5 changed API vs v4 | ✓ Good — store tests use merge mode for stability |
| `Item.splitMode` as explicit enum | Avoid inferring from empty `assignedTo` (ambiguous) | ✓ Good — unambiguous in engine |
| Tax proportional by subtotal weight | Fairest distribution; matches how restaurants charge | ✓ Good — sum invariant guaranteed |
| Tailwind v4 `@import` only | v4 media dark mode enabled by default — no config needed | ✓ Good — dark mode works with zero extra code |

---
*Last updated: 2026-03-19 after v1.0 milestone*
