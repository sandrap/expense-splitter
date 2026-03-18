---
phase: 01-foundation
plan: 02
subsystem: engine
tags: [typescript, vitest, integer-cents, largest-remainder, pure-function, tdd]

# Dependency graph
requires:
  - phase: 01-foundation plan 01
    provides: "AppState, PersonResult, ItemLine TypeScript interfaces from src/types/models.ts"
provides:
  - toCents/fromCents conversion helpers with Math.round float-safety
  - largestRemainderDistribute: equal-split distribution with sum invariant guarantee
  - distributeProportional: weighted split using full largest-remainder algorithm
  - calculateResults(state: AppState): PersonResult[] — pure calculation engine
  - 40 Vitest unit tests covering all distribution and calculation scenarios
affects:
  - All UI phases (consume calculateResults to render per-person totals)
  - 01-03+ (any future plan consuming the calculation engine)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Integer-cent arithmetic enforced throughout engine (no parseFloat, no toFixed)
    - Largest-remainder method for both equal and proportional distributions
    - TDD RED-GREEN-REFACTOR cycle for calculation engine
    - Pure function engine: calculateResults takes AppState, returns PersonResult[], no side effects
    - Tax distributed proportionally by subtotal weight (not flat per-person)
    - Tip computed on pre-tax subtotal only — not on subtotal+tax

key-files:
  created:
    - src/engine/cents.ts
    - src/engine/distribute.ts
    - src/engine/calculate.ts
    - src/engine/__tests__/distribute.test.ts
    - src/engine/__tests__/calculate.test.ts
  modified: []

key-decisions:
  - "shared + empty assignedTo = split among ALL people; shared + IDs = split among that subset only"
  - "assigned + empty assignedTo = skip item (no division by zero); assigned + IDs = those people only"
  - "Tax uses distributeProportional by subtotal weights — ensures sum of individual taxes = total tax exactly"
  - "Tip = Math.round(subtotal * tipRate / 100) per person — independent of tax, computed on pre-tax subtotal"
  - "validAssignees filter applied: IDs in assignedTo that no longer exist in people[] are silently ignored"

patterns-established:
  - "Pattern: largestRemainderDistribute for equal splits, distributeProportional for weighted splits"
  - "Pattern: All money values traverse the engine as integer cents — toCents() only at input boundary"
  - "Pattern: TDD — write failing tests first, verify RED, then implement minimum code to pass GREEN"
  - "Pattern: Sum invariant assertion in every distribution test case"

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-03-18
---

# Phase 1 Plan 02: Calculation Engine Summary

**Integer-cent calculation engine (calculateResults) with largest-remainder distribution, tip-on-pretax formula, and 40 passing Vitest tests covering all split scenarios**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T21:04:31Z
- **Completed:** 2026-03-18T21:06:40Z
- **Tasks:** 2 of 2
- **Files modified:** 5

## Accomplishments
- Implemented toCents/fromCents with Math.round to prevent floating-point creep at conversion boundaries
- Implemented largestRemainderDistribute (equal split) and distributeProportional (weighted split) with sum invariant guaranteed for all inputs
- Implemented calculateResults as a pure function: takes AppState, returns PersonResult[] with correct subtotal/tip/tax/total for all split scenarios
- 40 unit tests passing: 19 for distribution helpers, 12 for calculation engine, 9 pre-existing store tests

## Task Commits

Each task was committed atomically:

1. **Task 1: TDD cents helpers and largest-remainder distribution** - `62a715c` (feat)
2. **Task 2: TDD calculateResults core calculation engine** - `502e6b9` (feat)

## Files Created/Modified
- `src/engine/cents.ts` - toCents and fromCents conversion helpers using Math.round
- `src/engine/distribute.ts` - largestRemainderDistribute (equal) and distributeProportional (weighted) functions
- `src/engine/calculate.ts` - calculateResults pure function: AppState -> PersonResult[]
- `src/engine/__tests__/distribute.test.ts` - 19 tests: toCents, fromCents, largestRemainderDistribute, distributeProportional
- `src/engine/__tests__/calculate.test.ts` - 12 tests: all split scenarios, tip/tax order, edge cases

## Decisions Made
- `shared + empty assignedTo` splits among all people; `shared + specific IDs` splits among that subset — aligns with RESEARCH.md Open Question 1 recommendation
- `assigned + empty assignedTo` skips the item entirely (no one charged, no division by zero) — Pitfall 4 guard
- Tax is distributed proportionally by each person's subtotal weight using `distributeProportional`, ensuring the sum of individual tax shares equals the total computed tax exactly (no penny leak)
- Assignee IDs that no longer exist in `people[]` are silently filtered out via `validAssignees` — prevents ghost results from stale assignments reaching the engine

## Deviations from Plan

None - plan executed exactly as written. TDD cycle followed: RED (failing tests), GREEN (minimal implementation), no REFACTOR needed.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Calculation engine complete and fully tested
- calculateResults is ready to be wired into any React component via Zustand selector: `useBillStore(state => calculateResults(state))`
- No blockers for Phase 1 Plan 03 or any UI phase

---
*Phase: 01-foundation*
*Completed: 2026-03-18*

## Self-Check: PASSED

- FOUND: src/engine/cents.ts
- FOUND: src/engine/distribute.ts
- FOUND: src/engine/calculate.ts
- FOUND: src/engine/__tests__/distribute.test.ts
- FOUND: src/engine/__tests__/calculate.test.ts
- FOUND: .planning/phases/01-foundation/01-02-SUMMARY.md
- FOUND commit: 62a715c (Task 1 — cents helpers and distribution)
- FOUND commit: 502e6b9 (Task 2 — calculateResults)
- Tests: 40/40 passing
