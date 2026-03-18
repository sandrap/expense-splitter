---
phase: 03
slug: tip-tax-and-results
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x + @testing-library/react |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | TIP-01, TAX-01 | unit | `npm test -- --run src/store` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | RESULTS-01, RESULTS-02 | unit | `npm test -- --run src/store` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | TIP-01, TAX-01 | component | `npm test -- --run src/components/__tests__/SettingsPanel` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | RESULTS-01, RESULTS-02 | component | `npm test -- --run src/components/__tests__/ResultsPanel` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/store/__tests__/store.tip-tax.test.ts` — stubs for TIP-01, TAX-01
- [ ] `src/store/__tests__/store.results.test.ts` — stubs for RESULTS-01, RESULTS-02
- [ ] `src/components/__tests__/SettingsPanel.test.tsx` — stubs for TIP-01, TAX-01
- [ ] `src/components/__tests__/ResultsPanel.test.tsx` — stubs for RESULTS-01, RESULTS-02

*Existing infrastructure (vitest, testing-library, test-setup.ts) covers all phase requirements — no new framework installation needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tip preset button visual active state (blue highlight) | TIP-01 | CSS class presence is testable but visual correctness requires eye | Click each tip preset; confirm selected button turns blue |
| Expandable card open/close animation | RESULTS-02 | Transition/animation not observable in jsdom | Click person card; confirm expand/collapse renders breakdown |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
