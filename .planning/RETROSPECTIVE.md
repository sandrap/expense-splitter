# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-19
**Phases:** 4 | **Plans:** 9 | **Sessions:** 1

### What Was Built
- Pure calculation engine with integer-cent arithmetic and largest-remainder rounding — no floating-point errors possible by design
- Full people + items CRUD UI: add/edit/remove people and items, tap-toggle assignment chips, unassigned-item amber warning
- Per-person tip overrides, proportional tax, expandable itemized result cards with grand total
- `useDraftCalculation` hook: live recalculation on every keystroke across all numeric inputs without committing partial state
- Mobile UX polish: 44px tap targets, keyboard scroll-into-view, dark mode via system preference, edge case resilience
- 116 tests: engine unit tests, store action tests, component tests, integration tests, tap target compliance

### What Worked
- **TDD for the engine first** — building and fully testing `calculateResults` before any UI made all subsequent phases faster. UI bugs never confused calculation bugs.
- **Integer-cent arithmetic as a hard constraint** — encoding this in types and enforcing it in the engine eliminated an entire class of correctness bugs upfront.
- **Wave-based parallel execution** — phases with no inter-plan dependencies executed multiple plans in parallel, compressing calendar time.
- **`useDraftCalculation` dual-track pattern** — separating ephemeral draft state from committed Zustand state kept live recalculation clean and testable; optional callback props meant existing tests needed no changes.
- **Explicit `splitMode` enum on items** — avoided the ambiguity of inferring mode from empty `assignedTo` array; engine logic stayed simple and unambiguous.

### What Was Inefficient
- **ROADMAP.md tracking bug on Phase 2** — Phase 2 completed successfully but ROADMAP.md progress table showed "Not started". Tracking state wasn't updated during Phase 2 execution; caught during milestone audit. Cosmetic only, but noisy.
- **`useMemo` after early returns in `ResultsPanel`** — introduced a React Rules of Hooks violation that caused a blank-screen crash when adding the first item. Found during human verification checkpoint, not automated testing. A pre-commit lint rule for exhaustive hooks would catch this.
- **Per-person tip escape key bug** — `PersonResultCard` Escape deletes committed tip override instead of cancelling the edit. Introduced in Phase 4, found during integration audit. Pattern mismatch with `SettingsPanel` escape behavior.

### Patterns Established
- **Integer-cent arithmetic**: `parseDollarsToCents` on input, `formatCents` on display, cents everywhere in state and engine
- **Largest-remainder for all distributions**: equal-split and proportional distributions both use the same rounding invariant
- **Dual-track draft state**: ephemeral drafts in hook state + committed values in Zustand; merge at `calculateResults` call site
- **Optional callback props on all components**: `onXxx?.(...)` so components work standalone in tests and wired in production
- **`scrollIntoView?.()` with optional chaining**: safe for jsdom test environment

### Key Lessons
1. **Build the engine test-first before any UI exists.** It sets the correctness baseline that all UI phases inherit. Debugging a calculation bug through a UI is significantly harder.
2. **Rules of Hooks violations don't fail build or tests** — they crash at runtime on specific state transitions. A conditional `useMemo` after an early return is invisible until the user hits that exact path. Consider an eslint-plugin-react-hooks pre-commit check.
3. **Human verification checkpoints are valuable but require clear exit criteria.** The checkpoint for Phase 4 correctly caught the blank-screen bug during manual testing. Define "approved means X is true" before the checkpoint, not during it.
4. **Integration audit after all phases reveals cross-component contract mismatches.** The Escape key bug pattern mismatch between `PersonResultCard` and `SettingsPanel` was invisible at the individual phase level; only visible when comparing both components side-by-side.

### Cost Observations
- Model mix: ~70% Opus (execution agents), ~30% Sonnet (verifier, integration checker, audit)
- Sessions: 1 continuous session
- Notable: Wave-based parallelization kept orchestrator context lean (~10-15%); fresh 200k context per executor subagent meant no context degradation across phases

---

## Milestone: v1.1 — Sharing & Payments

**Shipped:** 2026-03-19
**Phases:** 3 (5–7) | **Plans:** 5 | **Sessions:** 1

### What Was Built
- lz-string URL serialization with schema-versioned compact format — full bill state (people, items, assignments, tip overrides, bill name) encoded in a shareable URL hash
- BillName click-to-edit header component + ShareButton with Clipboard API + fallback modal + URL hydration on app mount
- History persistence layer: pure utility functions (save/load/upsert/shouldSave/createSnapshot), session UUID dedup, FIFO eviction at 20 entries, `loadBill` atomic restore action
- HistoryDrawer slide-in panel + `useHistorySync` Zustand subscribe hook with 2s debounce + RestoreConfirmDialog
- `buildVenmoUrl` pure utility (URLSearchParams, cents-to-dollars, fallback note) + `VenmoButton` conditional component with $0 guard + integrated into PersonResultCard
- 14 new tests; total suite: 177 passing

### What Worked
- **Zustand subscribe for side effects** — using `useBillStore.subscribe` for history auto-save completely decoupled persistence from the React render cycle. No re-renders, no `useEffect` dependencies to manage, imperceptible performance impact.
- **Reusing the URL serialization layer in Phase 6** — exporting `CompactState`, `toCompact`, `fromCompact` from Phase 5's `urlState.ts` gave Phase 6 history persistence for free. No second encoding format needed.
- **TDD for pure utility functions** — `buildVenmoUrl` and `urlState` encode/decode were both built test-first. The tests made URL edge cases (special characters, empty bill name, trailing zeros) concrete before implementation.
- **Zustand direct access in leaf components** — `VenmoButton` and `ShareButton` reading from the store directly (rather than via props) matched the established project pattern and kept `PersonResultCard` and `ResultsPanel` clean.
- **Research-first on Venmo URL format** — the CONTEXT.md mentioned `venmo://paycharge` but research confirmed this scheme doesn't work from web browsers. Catching this before planning saved a broken implementation.

### What Was Inefficient
- **Phase 5 ROADMAP checkbox stale** — Phase 5 completed with verified status but its ROADMAP.md checkbox showed `[ ]`. The `phase complete` CLI command was skipped during Phase 5 execution, so ROADMAP tracking wasn't updated. Caught during milestone audit. Pattern: always run `phase complete` in execute-phase close step.
- **No automated E2E test for cross-phase round-trip** — the multi-phase flow (name bill → share URL → open URL → auto-save to history → restore) was only tested at unit/component level per phase. An integration test for the full chain would catch regressions across milestones.
- **Nyquist VALIDATION.md sign-off deferred** — VALIDATION.md files were drafted at plan time but `nyquist_compliant: false` was never flipped after test suites passed. The compliance check is a documentation step (run `/gsd:validate-phase N`), not a functionality concern, but leaving it pending adds audit noise.

### Patterns Established
- **Zustand subscribe + debounce for localStorage sync**: `store.subscribe(state => { debounce(() => saveHistory(createSnapshot(state)), 2000) })` — clean, zero-render-coupling persistence
- **Session UUID for upsert dedup**: generate UUID on app mount; history upsert uses UUID as the dedup key so edits update the same entry rather than creating duplicates
- **Schema-versioned compact URL format**: always include `v:1` key in compact object so future decoders can detect and migrate old URLs
- **URLSearchParams for all URL construction**: never manually concatenate URL parameters; special characters in bill names silently break hand-rolled concatenation

### Key Lessons
1. **Always run `phase complete` at the end of execute-phase, not just verify.** The CLI advances STATE.md and marks the ROADMAP checkbox. Skipping it leaves stale tracking that creates audit noise.
2. **Research the external service URL format before planning, not during implementation.** The `venmo://` vs `https://venmo.com/` question was decided correctly because research ran first. Getting this wrong would have shipped non-functional deep links.
3. **Reusable exports from earlier phases compound value.** Phase 5's serialization layer (`toCompact`/`fromCompact`) was directly reused by Phase 6 with zero modification. Designing Phase 5's exports with reuse in mind (even one phase ahead) paid off immediately.
4. **Unit tests at the utility function level make integration obvious.** Because `buildVenmoUrl` and `urlState` were fully unit-tested in isolation, the integration into components was a mechanical wiring step — the hard logic was already verified.

### Cost Observations
- Model mix: ~70% Opus (executor, planner, researcher), ~30% Sonnet (verifier, plan checker, integration checker)
- Sessions: 1 continuous session
- Notable: 3-phase milestone with 5 plans completed in a single session; research-first pattern added one agent round-trip per phase but prevented implementation rework

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 MVP | 1 | 4 | Initial — baseline established |
| v1.1 Sharing & Payments | 1 | 3 | Research-first per phase; Zustand subscribe pattern for side effects |

### Cumulative Quality

| Milestone | Tests | Zero-Dep Additions |
|-----------|-------|--------------------|
| v1.0 | 116 | 0 (no unnecessary deps) |
| v1.1 | 177 (+61) | 1 (lz-string — URL compression) |
