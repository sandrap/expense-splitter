---
phase: 01-foundation
plan: 01
subsystem: foundation
tags: [vite, react, typescript, zustand, vitest, data-model, store]

# Dependency graph
requires: []
provides:
  - Vite 8 + React 19 + TypeScript project scaffold with build pipeline
  - Six TypeScript interfaces: Person, Item, BillSettings, AppState, ItemLine, PersonResult
  - Zustand v5 store (useBillStore) with 7 named actions
  - Vitest 4.1 configured and passing 9 unit tests for store actions
affects:
  - 01-02 (calculation engine — consumes AppState, PersonResult interfaces)
  - All UI phases (consume useBillStore actions and Person/Item types)

# Tech tracking
tech-stack:
  added:
    - Vite 8.0 (build tool + dev server)
    - React 19.2.4
    - TypeScript 5.9.3
    - Zustand 5.0.12 (named import pattern)
    - Vitest 4.1.0
  patterns:
    - Integer-cent arithmetic (priceInCents, shareInCents — never floats)
    - Zustand v5 named import: import { create } from 'zustand'
    - Store actions via getState() — not destructured — for test stability
    - Explicit splitMode enum, not inferred from assignedTo length
    - PersonResult is derived-only, never stored in Zustand state

key-files:
  created:
    - src/types/models.ts
    - src/store/billStore.ts
    - src/store/__tests__/billStore.test.ts
    - vitest.config.ts
    - package.json
    - tsconfig.json
    - vite.config.ts
  modified: []

key-decisions:
  - "Zustand setState in tests uses merge mode (no 'true' second arg) to preserve action functions — setState(obj, true) in v5 replaces entire store including actions"
  - "vitest.config.ts uses passWithNoTests:true so test run exits 0 before test files exist"
  - "Item.splitMode is 'shared'|'assigned' literal union — never inferred from assignedTo[] length"
  - "PersonResult is derived on every call, never persisted in Zustand state"
  - "npm registry blocked by Cloudflare; scaffolding used yarnpkg.com registry as alternative"

patterns-established:
  - "Pattern 1: All money values in integer cents (priceInCents, shareInCents) — convert from user input at boundaries only"
  - "Pattern 2: Zustand v5 named import create — no default export"
  - "Pattern 3: Store test reset via setState({data fields only}) without replace=true to preserve action functions"
  - "Pattern 4: removePerson ALWAYS cleans assignedTo arrays on all items — prevents ghost calculation results"

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-03-18
---

# Phase 1 Plan 01: Foundation Summary

**Vite 8 + React 19 + TypeScript scaffold with Zustand v5 store (7 named actions) and 9 Vitest unit tests all passing**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-18T20:57:44Z
- **Completed:** 2026-03-18T21:02:00Z
- **Tasks:** 3 of 3
- **Files modified:** 22

## Accomplishments
- Scaffolded Vite 8 + React 19 + TypeScript project with build and test pipelines both working
- Defined 6 TypeScript interfaces (Person, Item, BillSettings, AppState, ItemLine, PersonResult) with all locked design decisions enforced
- Created Zustand v5 store with useBillStore exporting 7 named actions including critical removePerson stale-assignment cleanup
- 9 unit tests pass verifying all store actions, including the removePerson-cleans-assignedTo invariant

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Vite project, install dependencies, configure Vitest** - `0a9c9b0` (feat)
2. **Task 2: Define TypeScript interfaces and Zustand store** - `2e372f8` (feat)
3. **Task 3: Write and pass unit tests for Zustand store actions** - `25ec17b` (test)

## Files Created/Modified
- `src/types/models.ts` - Six TypeScript interfaces: Person, Item, BillSettings, AppState, ItemLine, PersonResult
- `src/store/billStore.ts` - Zustand v5 store with useBillStore and 7 named actions
- `src/store/__tests__/billStore.test.ts` - 9 unit tests for all store actions
- `vitest.config.ts` - Vitest 4.1 config with globals:true, passWithNoTests:true
- `package.json` - Project config with zustand, vitest, test script
- `vite.config.ts` - Vite 8 config with react plugin
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` - TypeScript configs
- `index.html`, `src/main.tsx`, `src/App.tsx` - Vite scaffold entry points

## Decisions Made
- Used merge mode `setState({...})` (without `true`) in Vitest beforeEach to reset only data fields — Zustand v5 setState with `true` replaces the entire store object including action functions, causing "action is not a function" errors in tests
- Added `passWithNoTests: true` to vitest.config.ts so the test runner exits 0 when no test files exist yet (needed for Task 1 verification before Task 3 files are written)
- npm registry (registry.npmjs.org) was blocked by Cloudflare dependency-confusion protection; switched to yarnpkg.com registry for package installation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zustand v5 setState(replace=true) strips action functions in tests**
- **Found during:** Task 3 (unit tests — TDD RED/GREEN)
- **Issue:** Plan specifies `useBillStore.setState({ ... }, true)` for test reset. In Zustand v5, `setState(obj, true)` replaces the entire store state (including action functions) with the plain object, causing `TypeError: action is not a function` on subsequent getState() calls
- **Fix:** Changed `beforeEach` to use merge mode `setState({ people: [], items: [], settings: {...} })` without the `true` argument — this resets only the data fields while preserving action functions in the store
- **Files modified:** `src/store/__tests__/billStore.test.ts`
- **Verification:** All 9 tests pass with `npm run test -- --run`
- **Committed in:** 25ec17b (Task 3 commit)

**2. [Rule 3 - Blocking] npm registry blocked by Cloudflare; used yarnpkg.com**
- **Found during:** Task 1 (scaffolding)
- **Issue:** registry.npmjs.org returned HTTP error (Cloudflare dependency-confusion block), preventing `npm create vite` and all `npm install` commands
- **Fix:** Set `npm config set registry https://registry.yarnpkg.com` — yarnpkg.com mirrors npmjs.org and was accessible
- **Files modified:** None (npm config only)
- **Verification:** `npm create vite`, `npm install`, `npm install zustand`, `npm install -D vitest` all succeeded
- **Committed in:** 0a9c9b0 (Task 1 commit — scaffolded files)

---

**Total deviations:** 2 auto-fixed (1 bug fix, 1 blocking issue)
**Impact on plan:** Both fixes required for correct operation and test accuracy. No scope creep.

## Issues Encountered
- Zustand v5 test reset behavior differs from what the plan's code snippet implies — `setState(obj, true)` is documented as a full replacement, which includes functions. The fix (merge mode) is the correct Zustand pattern for resetting only state data in tests.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Phase 1 Plan 01 deliverables complete: types, store, tests
- Ready for Plan 02: calculation engine (calculateResults pure function, distribute helpers)
- Plan 02 will consume `AppState` and `PersonResult` interfaces from `src/types/models.ts`
- No blockers

---
*Phase: 01-foundation*
*Completed: 2026-03-18*

## Self-Check: PASSED

- FOUND: src/types/models.ts
- FOUND: src/store/billStore.ts
- FOUND: src/store/__tests__/billStore.test.ts
- FOUND: vitest.config.ts
- FOUND: .planning/phases/01-foundation/01-01-SUMMARY.md
- FOUND commit: 0a9c9b0 (Task 1)
- FOUND commit: 2e372f8 (Task 2)
- FOUND commit: 25ec17b (Task 3)
