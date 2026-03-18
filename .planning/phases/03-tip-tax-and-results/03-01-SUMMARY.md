---
phase: 03-tip-tax-and-results
plan: 01
subsystem: engine
tags: [zustand, vitest, tdd, tip-calculation, per-person-override]

requires:
  - phase: 01-foundation
    provides: AppState interface, calculateResults engine, billStore with Zustand
provides:
  - tipOverrides field on AppState for per-person tip percentages
  - setPersonTipOverride and clearPersonTipOverride store actions
  - Per-person tip override logic in calculateResults engine
affects: [03-02, 03-03, tip-ui-components]

tech-stack:
  added: []
  patterns:
    - "tipOverrides as Record<string, number> with optional chaining fallback in engine"
    - "removePerson cascades cleanup to tipOverrides (same pattern as assignedTo cleanup)"

key-files:
  created: []
  modified:
    - src/types/models.ts
    - src/store/billStore.ts
    - src/engine/calculate.ts
    - src/store/__tests__/billStore.test.ts
    - src/engine/__tests__/calculate.test.ts

key-decisions:
  - "tipOverrides uses optional chaining (?.) with nullish coalescing (??) for safe fallback to defaultTipPercent"
  - "Zero tip (tipOverrides[id] = 0) is a valid override, not treated as falsy/missing"

patterns-established:
  - "Per-person overrides pattern: Record<string, number> on state, optional chaining in engine, cleanup on removePerson"

requirements-completed: [TIP-01, TAX-01]

duration: 2min
completed: 2026-03-18
---

# Phase 3 Plan 1: Tip Overrides Summary

**Per-person tip override support in AppState, Zustand store actions, and calculateResults engine with TDD**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T23:03:11Z
- **Completed:** 2026-03-18T23:05:19Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added tipOverrides: Record<string, number> to AppState interface
- Added setPersonTipOverride/clearPersonTipOverride store actions with removePerson cleanup
- Updated calculateResults to use per-person tip override with fallback to defaultTipPercent
- All 71 tests passing (14 store tests, 16 engine tests, 41 UI tests), zero TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add tipOverrides to AppState, store actions, and removePerson cleanup** - `abde373` (feat)
2. **Task 2: Update calculateResults to use per-person tip overrides** - `2ceea70` (feat)

_Both tasks followed TDD: RED (failing tests) -> GREEN (implementation) -> verified_

## Files Created/Modified
- `src/types/models.ts` - Added tipOverrides: Record<string, number> to AppState interface
- `src/store/billStore.ts` - Added tipOverrides state, setPersonTipOverride/clearPersonTipOverride actions, removePerson cleanup
- `src/engine/calculate.ts` - Added tipRate lookup from tipOverrides with fallback to defaultTipPercent
- `src/store/__tests__/billStore.test.ts` - Added 5 new tests for tipOverrides store behavior
- `src/engine/__tests__/calculate.test.ts` - Added tipOverrides: {} to 11 existing fixtures, added 4 new override tests

## Decisions Made
- Used optional chaining (`state.tipOverrides?.[person.id]`) with nullish coalescing (`??`) so zero tip override is respected (not treated as falsy)
- tipOverrides cleanup in removePerson uses destructuring rest pattern, consistent with existing store patterns

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- tipOverrides foundation ready for Plan 02 (UI components for per-person tip input)
- Plan 03 (results display) can consume the updated calculateResults output
- All interfaces stable, no breaking changes to existing consumers

---
*Phase: 03-tip-tax-and-results*
*Completed: 2026-03-18*
