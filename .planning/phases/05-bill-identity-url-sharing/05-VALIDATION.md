---
phase: 5
slug: bill-identity-url-sharing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vite.config.ts |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 0 | BILL-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | BILL-01 | unit | `npx vitest run` | ✅ | ⬜ pending |
| 05-02-01 | 02 | 0 | SHARE-01, SHARE-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | SHARE-01 | unit | `npx vitest run` | ✅ | ⬜ pending |
| 05-02-03 | 02 | 1 | SHARE-01, SHARE-02 | unit | `npx vitest run` | ✅ | ⬜ pending |
| 05-02-04 | 02 | 2 | SHARE-02 | unit | `npx vitest run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/store/__tests__/billName.test.ts` — stubs for BILL-01 (billName state)
- [ ] `src/utils/__tests__/urlEncoding.test.ts` — stubs for SHARE-01, SHARE-02 (encode/decode round-trip, schema version, integer cents)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Clipboard copy works on mobile Safari | SHARE-01 | navigator.clipboard requires real browser + HTTPS | Open share URL on iOS Safari, tap Share, verify clipboard |
| Fallback modal appears when clipboard API fails | SHARE-01 | Cannot mock clipboard failure reliably in jsdom | Block clipboard API in devtools, tap Share, verify modal |
| URL survives SMS truncation (<2000 chars) | SHARE-01 | Platform-specific behavior | Generate max-size bill, copy URL, check length in console |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
