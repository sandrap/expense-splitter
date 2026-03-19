---
phase: 6
slug: history
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vite.config.ts |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | HIST-01 | unit | `npm test -- --run src/__tests__/history` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | HIST-01 | unit | `npm test -- --run src/__tests__/history` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | HIST-02 | unit | `npm test -- --run src/__tests__/history` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 2 | HIST-03 | unit | `npm test -- --run src/__tests__/history` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/history.test.ts` — stubs for HIST-01, HIST-02, HIST-03
- [ ] Stubs: auto-save debounce, history list retrieval, bill restore, cross-session persistence

*Existing vitest + jsdom infrastructure covers all requirements — no new installs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| History panel UI appearance | HIST-02 | Visual layout and mobile responsiveness | Open app, click history button, verify panel shows bill name/date/total |
| Cross-session persistence | HIST-01 | Requires real browser reload | Edit bill, close tab, reopen, verify history entry present |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
