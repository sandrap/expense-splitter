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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 MVP | 1 | 4 | Initial — baseline established |

### Cumulative Quality

| Milestone | Tests | Zero-Dep Additions |
|-----------|-------|--------------------|
| v1.0 | 116 | 0 (no unnecessary deps) |
