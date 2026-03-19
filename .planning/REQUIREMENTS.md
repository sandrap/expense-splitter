# Requirements: Expense Splitter

**Defined:** 2026-03-19
**Core Value:** Every person pays exactly what they owe -- no more, no less -- even when shared appetizers, different tip preferences, and tax make it complicated.

## v1.1 Requirements (Sharing & Payments)

### Bill Identity

- [x] **BILL-01**: User can optionally name the bill (displayed in history and shared URLs)

### URL Sharing

- [x] **SHARE-01**: User can generate and copy a shareable URL encoding the full bill state
- [x] **SHARE-02**: User can open a shared URL and have the full bill state loaded automatically

### History

- [ ] **HIST-01**: App auto-saves recent bills to localStorage as the bill is edited
- [ ] **HIST-02**: User can browse recent bills in a history panel (showing name, date, total)
- [ ] **HIST-03**: User can restore a past bill from history into the editor

### Payments

- [ ] **PAY-01**: Each person's result card shows a Venmo deep link button to request their share
- [ ] **PAY-02**: Venmo button is hidden when a person owes $0.00

## v1.0 Requirements (Shipped)

All shipped and validated. See `.planning/milestones/v1.0-ROADMAP.md` for full details.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Clear URL after load | Nice-to-have cosmetic; adds complexity for minimal value |
| Reset bill action | Refresh achieves the same result; deferred to v2 |
| Multi-recipient Venmo batch request | Requires recipient username collection; adds complexity |
| Real-time collaboration | Backend required; out of scope for client-side-only app |
| Bill scanning / OCR | Manual entry for v1 |
| Native mobile app | Web-first covers the use case |
| User accounts | No persistence/auth needed; single-use per meal |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BILL-01 | Phase 5 | Complete |
| SHARE-01 | Phase 5 | Complete |
| SHARE-02 | Phase 5 | Complete |
| HIST-01 | Phase 6 | Pending |
| HIST-02 | Phase 6 | Pending |
| HIST-03 | Phase 6 | Pending |
| PAY-01 | Phase 7 | Pending |
| PAY-02 | Phase 7 | Pending |

**Coverage:**
- v1.1 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after roadmap creation*
