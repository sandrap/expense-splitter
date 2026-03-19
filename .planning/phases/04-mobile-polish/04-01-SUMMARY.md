---
phase: 04-mobile-polish
plan: 01
subsystem: ui
tags: [react, hooks, useMemo, useCallback, zustand, live-recalculation]

# Dependency graph
requires:
  - phase: 03-tip-tax-and-results
    provides: calculateResults engine, ResultsPanel, PersonResultCard, SettingsPanel tip/tax inputs
provides:
  - useDraftCalculation hook for merging ephemeral draft values with store state
  - Live recalculation on every keystroke in all numeric inputs
  - Draft callback props wired through App to ItemRow, SettingsPanel, PersonResultCard
affects: [04-mobile-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [dual-track-state, draft-aggregation-hook, optional-callback-props]

key-files:
  created:
    - src/hooks/useDraftCalculation.ts
    - src/hooks/__tests__/useDraftCalculation.test.ts
  modified:
    - src/App.tsx
    - src/components/ResultsPanel.tsx
    - src/components/ItemRow.tsx
    - src/components/ItemsPanel.tsx
    - src/components/SettingsPanel.tsx
    - src/components/PersonResultCard.tsx

key-decisions:
  - "ResultsPanel falls back to computing results from store when props not passed, maintaining backward compatibility with existing tests"
  - "All draft callback props are optional (?:) so components work standalone in tests"

patterns-established:
  - "Dual-track state: ephemeral drafts in hook state, committed values in Zustand store"
  - "Draft aggregation: useDraftCalculation merges draft overrides into store state before calling calculateResults"
  - "Invalid-to-zero fallback: parseDollarsToCents returns null for invalid input, hook uses ?? 0; parseFloat NaN uses ternary to 0"

requirements-completed: []

# Metrics
duration: 3min
completed: 2026-03-18
---

# Phase 4 Plan 1: Live Recalculation Hook Summary

**useDraftCalculation hook with dual-track state: ephemeral drafts on keystroke, committed values on blur/Enter, invalid-to-zero fallback**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-19T00:38:14Z
- **Completed:** 2026-03-19T00:41:36Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Created useDraftCalculation hook that merges ephemeral draft values with Zustand store state and calls calculateResults() for instant recalculation
- Wired draft callbacks from App.tsx through to all numeric input components (ItemRow price, SettingsPanel tip/tax, PersonResultCard tip override)
- 11 new tests covering draft aggregation: no-draft baseline, item price drafts, tip/tax percent drafts, per-person tip drafts, cross-card recalculation, all clear/revert operations
- All 106 tests pass (95 existing + 11 new)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useDraftCalculation hook with tests** - `8505060` (feat) [TDD: RED -> GREEN]
2. **Task 2: Wire draft hook into App and all numeric-input components** - `aaa9e73` (feat)

_Note: TDD Task 1 had RED (tests fail, hook missing) then GREEN (hook created, all 11 pass) in a single commit._

## Files Created/Modified
- `src/hooks/useDraftCalculation.ts` - Draft aggregation hook merging ephemeral drafts with store state
- `src/hooks/__tests__/useDraftCalculation.test.ts` - 11 tests for draft aggregation behavior
- `src/App.tsx` - Imports useDraftCalculation, passes results and draft callbacks to child components
- `src/components/ItemsPanel.tsx` - Accepts and passes through onDraftPriceChange/onDraftPriceClear
- `src/components/ItemRow.tsx` - Fires onDraftPriceChange on keystroke, onDraftPriceClear on blur/Escape
- `src/components/SettingsPanel.tsx` - Fires onTipDraftChange/onTaxDraftChange on keystroke, clears on commit
- `src/components/ResultsPanel.tsx` - Accepts results/grandTotal as props, falls back to store computation
- `src/components/PersonResultCard.tsx` - Fires onTipDraftChange on keystroke, onTipDraftClear on commit/Escape

## Decisions Made
- ResultsPanel maintains backward compatibility by computing results from store when props not passed (allows existing tests to work without modification)
- All draft callback props use optional typing (`?:`) so components are independently testable

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ResultsPanel backward compatibility fallback**
- **Found during:** Task 2 (Wiring draft hook)
- **Issue:** Existing ResultsPanel tests render `<ResultsPanel />` without props, expecting it to compute results internally. Removing direct calculateResults() call broke 7 tests.
- **Fix:** Added fallback: when results/grandTotal props are undefined, compute from store using useMemo + calculateResults(). Props take priority when provided.
- **Files modified:** src/components/ResultsPanel.tsx
- **Verification:** All 106 tests pass
- **Committed in:** aaa9e73 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for backward compatibility. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Draft calculation infrastructure is complete, ready for remaining Phase 4 plans
- All numeric inputs now fire draft callbacks on every keystroke
- Results update instantly through the useDraftCalculation hook

---
*Phase: 04-mobile-polish*
*Completed: 2026-03-18*
