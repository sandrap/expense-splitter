---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in-progress
stopped_at: Completed 03-01-PLAN.md
last_updated: "2026-03-18T23:05:55.786Z"
last_activity: 2026-03-18 — Completed Plan 03-01 (Per-person tip overrides in model, store, and engine)
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 7
  completed_plans: 5
  percent: 71
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-18)

**Core value:** Every person pays exactly what they owe — no more, no less — even when shared appetizers, per-person tip preferences, and tax make it complicated.
**Current focus:** Phase 3 in progress — tip, tax, and results

## Current Position

Phase: 3 of 4 (Tip, Tax, and Results)
Plan: 1 of 3 in current phase (03-01 complete)
Status: Phase 3 in progress
Last activity: 2026-03-18 — Completed Plan 03-01 (Per-person tip overrides in model, store, and engine)

Progress: [███████░░░] 71%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 3 min
- Total execution time: 0.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
| --- | --- | --- | --- |
| 01-foundation | 2 | 6 min | 3 min |
| 02-people-and-items-ui | 2 | 4 min | 2 min |

**Recent Trend:**
- Last 5 plans: 4 min, 2 min, 2 min, 2 min
- Trend: fast

*Updated after each plan completion*
| Phase 02-people-and-items-ui P02 | 2 min | 2 tasks | 6 files |
| Phase 03-tip-tax-and-results P01 | 2 min | 2 tasks | 5 files |

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
- [Phase 02-people-and-items-ui]: ItemRow 'Remove' button text kept short to fit inline layout; AssignmentChips is pure presentational component with people/assignedTo/onToggle props
- [Phase 03-01]: tipOverrides uses optional chaining with nullish coalescing so zero tip override is valid (not treated as falsy)
- [Phase 03-01]: Per-person overrides pattern: Record<string, number> on state, cleanup on removePerson

### Pending Todos

None yet.

### Blockers/Concerns

- Cloudflare Pages SPA routing: verify `_redirects` config before deployment
- npm registry blocked by Cloudflare; use yarnpkg.com registry for all npm installs in this environment

## Session Continuity

Last session: 2026-03-18T23:05:19Z
Stopped at: Completed 03-01-PLAN.md
Resume file: .planning/phases/03-tip-tax-and-results/03-02-PLAN.md
