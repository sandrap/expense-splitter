# Roadmap: Expense Splitter

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-03-19)
- 🚧 **v1.1 Sharing & Payments** — Phases 5-7 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED 2026-03-19</summary>

- [x] **Phase 1: Foundation** — Data model, Zustand store, pure calculation engine with integer-cent arithmetic (completed 2026-03-18)
- [x] **Phase 2: People and Items UI** — Complete input surface for adding people, items, and assigning who had what (completed 2026-03-18)
- [x] **Phase 3: Tip, Tax, and Results** — Per-person tip, proportional tax, and itemized per-person totals (completed 2026-03-18)
- [x] **Phase 4: Mobile Polish** — Touch UX, keyboard occlusion, live recalculation, dark mode, edge case QA (completed 2026-03-19)

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 Sharing & Payments (In Progress)

**Milestone Goal:** Make it easy to share the split with everyone at the table and request payment via Venmo.

**Phase Numbering:**
- Integer phases (5, 6, 7): Planned milestone work
- Decimal phases (5.1, 5.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 5: Bill Identity & URL Sharing** — Name bills and share them via compressed URL
- [ ] **Phase 6: History** — Auto-save bills to localStorage and restore past splits
- [ ] **Phase 7: Venmo Payments** — One-tap Venmo request links on each person's result card

## Phase Details

### Phase 5: Bill Identity & URL Sharing
**Goal**: Users can name a bill and share it with anyone via a single URL
**Depends on**: Phase 4 (v1.0 complete)
**Requirements**: BILL-01, SHARE-01, SHARE-02
**Success Criteria** (what must be TRUE):
  1. User can type an optional name for the bill and see it displayed in the app header
  2. User can tap a Share button and get a URL copied to clipboard that encodes the full bill state
  3. User can open a shared URL in a new browser and see the complete bill loaded with all people, items, assignments, and tip overrides intact
  4. User can edit a bill loaded from a shared URL (it behaves identically to a manually-created bill)
**Plans**: 2 plans

Plans:
- [ ] 05-01-PLAN.md — Extend store/types with billName; implement urlState encode/decode utility with tests
- [ ] 05-02-PLAN.md — Build BillName, ShareButton, Toast, ShareFallbackModal components; wire into App.tsx and ResultsPanel.tsx; URL hydration on mount

### Phase 6: History
**Goal**: Users never lose a bill -- recent splits are auto-saved and can be browsed and restored
**Depends on**: Phase 5 (reuses state serialization pattern)
**Requirements**: HIST-01, HIST-02, HIST-03
**Success Criteria** (what must be TRUE):
  1. App auto-saves the current bill to localStorage as the user edits (without noticeable lag)
  2. User can open a history panel showing recent bills with name, date, and total
  3. User can tap a past bill in history and have it fully restored into the editor
  4. History entries persist across browser sessions (closing and reopening the tab)
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

### Phase 7: Venmo Payments
**Goal**: Users can request payment from each person at the table with one tap
**Depends on**: Phase 5 (uses bill name for Venmo note context; otherwise independent)
**Requirements**: PAY-01, PAY-02
**Success Criteria** (what must be TRUE):
  1. Each person's result card shows a Venmo button that opens the Venmo app with the correct dollar amount and a descriptive note pre-filled
  2. Venmo button is not shown when a person owes $0.00
  3. Venmo button works on both iOS and Android mobile browsers (opens native app or app store)
**Plans**: TBD

Plans:
- [ ] 07-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 5 -> 5.1 -> 5.2 -> 6 -> 7

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 2/2 | Complete | 2026-03-18 |
| 2. People and Items UI | v1.0 | 2/2 | Complete | 2026-03-18 |
| 3. Tip, Tax, and Results | v1.0 | 3/3 | Complete | 2026-03-18 |
| 4. Mobile Polish | v1.0 | 2/2 | Complete | 2026-03-19 |
| 5. Bill Identity & URL Sharing | v1.1 | 0/2 | Not started | - |
| 6. History | v1.1 | 0/2 | Not started | - |
| 7. Venmo Payments | v1.1 | 0/1 | Not started | - |
