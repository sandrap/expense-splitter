# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-18)

**Core value:** Every person pays exactly what they owe — no more, no less — even when shared appetizers, per-person tip preferences, and tax make it complicated.
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 4 (Foundation)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-03-18 — Roadmap created

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- All phases: integer-cent arithmetic is non-negotiable — floating-point forbidden in calculation engine
- All phases: client-side only, no backend, no persistence, static deployment
- Phase 1: `Item.splitMode` is an explicit enum ('shared' | 'assigned'), not inferred from empty assignedTo[]
- Phase 1: `PersonResult` is derived, never stored in state — totals can never be stale

### Pending Todos

None yet.

### Blockers/Concerns

- Verify Zustand version: run `npm info zustand version` at project start to confirm v5.x is current
- Cloudflare Pages SPA routing: verify `_redirects` config before deployment

## Session Continuity

Last session: 2026-03-18
Stopped at: Roadmap and STATE.md created — ready to plan Phase 1
Resume file: None
