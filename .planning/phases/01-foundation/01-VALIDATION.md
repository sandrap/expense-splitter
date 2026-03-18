---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | vitest.config.ts (created in Wave 0) |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run --coverage` |
| **Estimated runtime** | ~5 seconds |

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
| scaffold | 01 | 1 | constraint | build | `npm run dev -- --port 3000` | ❌ W0 | ⬜ pending |
| types | 01 | 1 | constraint | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| store | 01 | 1 | constraint | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| engine | 01 | 1 | constraint | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/calculateResults.test.ts` — TDD stubs for all calculation scenarios
- [ ] `vitest.config.ts` — Vitest configuration
- [ ] Vitest installed: `npm install -D vitest`

*Wave 0 creates test stubs before implementation begins (TDD approach).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `npm run dev` opens in browser | constraint | Browser check | Run `npm run dev`, open localhost:5173, verify blank React app loads |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
