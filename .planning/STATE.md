---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 02-01-PLAN.md
last_updated: "2026-03-18T22:03:06.619Z"
last_activity: 2026-03-18 — Completed Plan 02-01 (People panel with Tailwind v4, testing-library, add/edit/remove)
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 4
  completed_plans: 3
  percent: 75
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-18)

**Core value:** Every person pays exactly what they owe — no more, no less — even when shared appetizers, per-person tip preferences, and tax make it complicated.
**Current focus:** Phase 2 — People and Items UI

## Current Position

Phase: 2 of 4 (People and Items UI)
Plan: 1 of 2 in current phase (02-01 complete)
Status: In progress
Last activity: 2026-03-18 — Completed Plan 02-01 (People panel with Tailwind v4, testing-library, add/edit/remove)

Progress: [████████░░] 75%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 3 min
- Total execution time: 0.1 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
| --- | --- | --- | --- |
| 01-foundation | 2 | 6 min | 3 min |
| 02-people-and-items-ui | 1 | 2 min | 2 min |

**Recent Trend:**
- Last 5 plans: 4 min, 2 min, 2 min
- Trend: fast

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- All phases: integer-cent arithmetic is non-negotiable — floating-point forbidden in calculation engine
- All phases: client-side only, no backend, no persistence, static deployment
- Phase 1: `Item.splitMode` is an explicit enum ('shared' | 'assigned'), not inferred from empty assignedTo[]
- Phase 1: `PersonResult` is derived, never stored in state — totals can never be stale
- Phase 1 (01-01): Zustand v5 setState(obj, true) replaces entire store including actions — use merge mode in tests to reset only data fields
- Phase 1 (01-01): npm registry blocked by Cloudflare; yarnpkg.com used as alternative registry
- [Phase 01-foundation]: shared+empty-assignedTo=all-people; shared+IDs=subset; assigned+empty=skip-item (div-by-zero guard); assigned+IDs=those-people
- [Phase 01-foundation]: Tax distributed proportionally by subtotal weights via distributeProportional — sum of individual taxes equals total tax exactly
- [Phase 01-foundation]: Tip = subtotal * tipRate only (pre-tax) — both tip and tax are independent functions of subtotal
- [Phase 02-01]: Exclude test files from tsconfig.app.json build target rather than adding vitest types globally

### Pending Todos

None yet.

### Blockers/Concerns

- Cloudflare Pages SPA routing: verify `_redirects` config before deployment
- npm registry blocked by Cloudflare; use yarnpkg.com registry for all npm installs in this environment

## Session Continuity

Last session: 2026-03-18T22:03:06.616Z
Stopped at: Completed 02-01-PLAN.md
Resume file: None
