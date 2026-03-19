---
phase: 7
slug: venmo-payments
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 0 | PAY-01 | unit | `npx vitest run src/utils/__tests__/buildVenmoUrl.test.ts -x` | ❌ W0 | ⬜ pending |
| 7-01-02 | 01 | 0 | PAY-01, PAY-02 | unit | `npx vitest run src/components/__tests__/VenmoButton.test.tsx -x` | ❌ W0 | ⬜ pending |
| 7-01-03 | 01 | 1 | PAY-01 | unit | `npx vitest run src/utils/__tests__/buildVenmoUrl.test.ts -x` | ✅ W0 | ⬜ pending |
| 7-01-04 | 01 | 1 | PAY-01, PAY-02 | unit | `npx vitest run src/components/__tests__/VenmoButton.test.tsx -x` | ✅ W0 | ⬜ pending |
| 7-01-05 | 01 | 1 | PAY-01 | unit | `npx vitest run --reporter=verbose` | ✅ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/utils/__tests__/buildVenmoUrl.test.ts` — stubs for PAY-01 URL construction (correct URL format, "Split bill" fallback, amount formatting)
- [ ] `src/components/__tests__/VenmoButton.test.tsx` — stubs for PAY-01 (renders anchor, correct href, aria-label, target="_blank") and PAY-02 (returns null when $0)

*Existing infrastructure (Vitest, @testing-library/react) covers all phase requirements — no new framework installation needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Venmo app opens on iOS mobile with correct amount and note | PAY-01 | Requires physical device with Venmo installed; universal links cannot be tested in browser | Tap "Pay with Venmo" button on mobile device; verify Venmo app opens with pre-filled amount and note matching bill name |
| Venmo app opens on Android mobile with correct amount and note | PAY-01 | Requires physical device with Venmo installed; app links cannot be simulated in unit tests | Same as above on Android device |
| Button not shown for $0 person visually | PAY-02 | Verify DOM absence in rendered UI | Check results page — person who owes $0.00 should have no Venmo button visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
