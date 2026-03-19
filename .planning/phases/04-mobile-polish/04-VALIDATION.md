---
phase: 4
slug: mobile-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 + @testing-library/react 16.3.2 |
| **Config file** | vite.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Success Criteria | Test Type | Automated Command | File Exists | Status |
|---------|------|------|------------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 0 | SC-3 | unit | `npx vitest run src/hooks/__tests__/useDraftCalculation.test.ts -x` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 0 | SC-4 | unit | `npx vitest run src/engine/__tests__/calculate.test.ts -x` | ✅ (extend) | ⬜ pending |
| 4-02-01 | 02 | 1 | SC-3 | unit | `npx vitest run src/hooks/__tests__/useDraftCalculation.test.ts -x` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 1 | SC-2 | unit | `npx vitest run src/components/__tests__/TapTargets.test.tsx -x` | ❌ W0 | ⬜ pending |
| 4-03-01 | 03 | 1 | SC-1 | manual | N/A | N/A | ⬜ pending |
| 4-03-02 | 03 | 1 | SC-5 | manual | N/A | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/hooks/__tests__/useDraftCalculation.test.ts` — stubs for SC-3 (live recalculation with draft merging, invalid input fallback to zero, cross-card update)
- [ ] Extend `src/engine/__tests__/calculate.test.ts` with edge case tests for SC-4 (zero people, all-unassigned items, empty bill at $0, one person)
- [ ] `src/components/__tests__/TapTargets.test.tsx` — stubs for SC-2 (verify min-h-[44px] present on all interactive elements)

*Wave 0 must complete before any Wave 1 tasks begin.*

---

## Manual-Only Verifications

| Behavior | Success Criteria | Why Manual | Test Instructions |
|----------|-----------------|------------|-------------------|
| Active input scrolls into view on mobile keyboard | SC-1 | Requires real mobile keyboard on device; can't be simulated in jsdom | Open app on iPhone Safari, focus an item price input, verify the field stays visible above keyboard |
| Dark mode follows system preference | SC-5 | Requires visual verification with OS dark mode enabled | Toggle iOS dark mode in Settings, open app, verify all backgrounds/text use dark: color values |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
