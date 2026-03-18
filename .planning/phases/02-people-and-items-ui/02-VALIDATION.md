---
phase: 2
slug: people-and-items-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1 + @testing-library/react |
| **Config file** | vitest.config.ts (update to add jsdom + setup file) |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run --coverage` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run`
- **After every plan wave:** Run `npm run test -- --run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| install-tailwind | 01 | 1 | constraint | build | `npm run build` | ❌ W0 | ⬜ pending |
| people-panel | 01 | 1 | PEOPLE-01, PEOPLE-02 | component | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| items-panel | 02 | 2 | ITEMS-01, ITEMS-02 | component | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| assignment-chips | 02 | 2 | PEOPLE-03, ITEMS-03, ITEMS-04 | component | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| unassigned-flag | 02 | 2 | ITEMS-04 | component | `npm run test -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` installed
- [ ] `vitest.config.ts` updated: `environment: 'jsdom'` + setup file for jest-dom matchers
- [ ] `src/test/setup.ts` — jest-dom setup file

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Touch targets are 44px minimum | constraint | Visual/device check | Open on mobile or DevTools device sim, tap chips and buttons, verify no mis-taps |
| iOS keyboard doesn't push layout | constraint | Device behavior | Open on iOS Safari, tap price input, verify layout doesn't break when keyboard appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
