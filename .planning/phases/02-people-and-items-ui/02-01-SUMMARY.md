---
phase: 02-people-and-items-ui
plan: 01
subsystem: ui
tags: [react, tailwind-v4, vitest, testing-library, zustand, jsdom]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Zustand store with Person type, addPerson/removePerson/updatePerson actions
provides:
  - PeoplePanel component with add form, person list, empty state
  - PersonRow component with inline edit and delete
  - Tailwind CSS v4 configured with @tailwindcss/vite plugin
  - Vitest configured for JSX component tests with jsdom and jest-dom
  - formatCents and parseDollarsToCents utility functions
  - App shell with "Split the Bill" header
affects: [02-people-and-items-ui, 03-calculation-display, 04-polish-deploy]

# Tech tracking
tech-stack:
  added: [tailwindcss, @tailwindcss/vite, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, jsdom]
  patterns: [Zustand selector pattern for components, controlled input inline edit, testing-library userEvent for component tests]

key-files:
  created: [src/components/PeoplePanel.tsx, src/components/PersonRow.tsx, src/components/__tests__/PeoplePanel.test.tsx, src/test-setup.ts, src/utils/formatCents.ts, src/utils/parseDollars.ts]
  modified: [vite.config.ts, vitest.config.ts, src/index.css, src/App.tsx, tsconfig.app.json, package.json]

key-decisions:
  - "Exclude test files from tsconfig.app.json build target rather than adding vitest types globally"
  - "Placeholder PeoplePanel created in Task 1 for build pass, replaced in Task 2 with full implementation"

patterns-established:
  - "Zustand selector pattern: useBillStore((s) => s.specificField) for render optimization"
  - "Inline edit pattern: useState for editing/draft, Enter saves, Escape cancels, onBlur saves"
  - "Component test pattern: reset store in beforeEach, use userEvent.setup() for interactions"

requirements-completed: [PEOPLE-01, PEOPLE-02, PEOPLE-03]

# Metrics
duration: 2min
completed: 2026-03-18
---

# Phase 2 Plan 1: People Panel Summary

**Tailwind v4 + testing-library infrastructure with PeoplePanel/PersonRow components supporting add, inline edit, and remove with 7 passing component tests**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T21:59:23Z
- **Completed:** 2026-03-18T22:01:41Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Tailwind CSS v4 configured with @tailwindcss/vite plugin and @import "tailwindcss" entry
- Vitest configured for JSX component tests with jsdom environment and jest-dom matchers
- App shell replaced Vite scaffold with "Split the Bill" header and PeoplePanel
- PeoplePanel with add form (input + button), person list, and empty state
- PersonRow with click-to-edit inline editing and remove button
- 7 component tests covering all PEOPLE requirements (add by click/Enter, empty guard, remove, edit, cancel)
- formatCents and parseDollarsToCents utility functions ready for Items panel

## Task Commits

Each task was committed atomically:

1. **Task 1: Install deps, configure Tailwind/vitest, create utilities, replace App shell** - `90916be` (feat)
2. **Task 2: Build PeoplePanel/PersonRow with inline edit and component tests** - `141fdec` (feat)

## Files Created/Modified
- `vite.config.ts` - Added @tailwindcss/vite plugin
- `vitest.config.ts` - Added jsdom environment, setupFiles, .tsx include
- `src/test-setup.ts` - jest-dom/vitest matcher setup
- `src/index.css` - Replaced with @import "tailwindcss"
- `src/App.tsx` - Expense splitter shell with PeoplePanel
- `src/App.css` - Deleted (all styling now Tailwind)
- `src/utils/formatCents.ts` - Cents-to-dollar display formatting
- `src/utils/parseDollars.ts` - Dollar-string-to-cents parsing
- `src/components/PeoplePanel.tsx` - People section with add form and person list
- `src/components/PersonRow.tsx` - Single person row with inline edit and delete
- `src/components/__tests__/PeoplePanel.test.tsx` - 7 component tests for PEOPLE-01/02/03
- `tsconfig.app.json` - Excluded test files from build target
- `package.json` - Added tailwindcss, testing-library, jsdom dependencies

## Decisions Made
- Excluded test files from tsconfig.app.json build target rather than adding vitest types globally -- cleaner separation of app and test code
- Created placeholder PeoplePanel in Task 1 to satisfy App.tsx import for build verification, replaced with full implementation in Task 2

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Excluded test files from tsconfig.app.json**
- **Found during:** Task 2 (component tests)
- **Issue:** TypeScript build failed because test files use vitest globals (describe, it, expect) not recognized by tsconfig.app.json
- **Fix:** Added exclude array for *.test.ts, *.test.tsx, and test-setup.ts to tsconfig.app.json
- **Files modified:** tsconfig.app.json
- **Verification:** npm run build succeeds
- **Committed in:** 141fdec (Task 2 commit)

**2. [Rule 3 - Blocking] Installed jsdom as dev dependency**
- **Found during:** Task 1 (vitest jsdom config)
- **Issue:** jsdom needed for vitest environment but not listed in plan's install command
- **Fix:** Added jsdom to the testing-library install command
- **Files modified:** package.json, package-lock.json
- **Verification:** vitest runs with jsdom environment
- **Committed in:** 90916be (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for build and test infrastructure to work. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- PeoplePanel and PersonRow are complete and tested, ready for Items panel in Plan 02
- Tailwind v4 and testing-library infrastructure established for all future UI components
- formatCents and parseDollarsToCents utilities ready for Items panel price handling

## Self-Check: PASSED

All created files verified present. Both task commits (90916be, 141fdec) confirmed in git log. App.css confirmed deleted. Build and all 47 tests pass.

---
*Phase: 02-people-and-items-ui*
*Completed: 2026-03-18*
