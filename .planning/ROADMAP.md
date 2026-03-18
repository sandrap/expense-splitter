# Roadmap: Expense Splitter

## Overview

Four phases deliver a correct, fast, mobile-friendly bill splitter. The calculation engine is built and tested first so correctness is guaranteed before any UI exists. People and item entry follow as the primary input surface. Tip, tax, and results complete the core user journey. A final mobile polish pass ensures the app is actually usable on a phone at a restaurant table — which is the entire point.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Data model, Zustand store, and pure calculation engine with integer-cent arithmetic (completed 2026-03-18)
- [ ] **Phase 2: People and Items UI** - Complete input surface for adding people, items, and assigning who had what
- [ ] **Phase 3: Tip, Tax, and Results** - Per-person tip, proportional tax, and itemized per-person totals
- [ ] **Phase 4: Mobile Polish** - Touch UX, keyboard occlusion, edge cases, and real-device QA

## Phase Details

### Phase 1: Foundation
**Goal**: The calculation engine is correct, tested, and ready for any UI to consume
**Depends on**: Nothing (first phase)
**Requirements**: None (constraint-driven — enables correctness for all v1 requirements)
**Success Criteria** (what must be TRUE):
  1. TypeScript interfaces exist for Person, Item, BillSettings, and PersonResult
  2. The Zustand store holds people, items, and settings with named action functions
  3. `calculateResults()` produces correct totals in integer-cent arithmetic for any split scenario
  4. Unit tests pass for 2-way, 3-way, and 7-way splits, verifying that per-person shares always sum to the item total (largest-remainder rounding)
  5. The project runs locally with `npm run dev` and deploys as static files
**Plans:** 2/2 plans complete

Plans:
- [x] 01-01-PLAN.md — Scaffold project, define types, create Zustand store with tested actions
- [ ] 01-02-PLAN.md — TDD calculation engine: cents helpers, distribution, calculateResults()

### Phase 2: People and Items UI
**Goal**: Users can enter everyone at the table and every item on the receipt, with assignments, before calculating anything
**Depends on**: Phase 1
**Requirements**: PEOPLE-01, PEOPLE-02, PEOPLE-03, ITEMS-01, ITEMS-02, ITEMS-03, ITEMS-04
**Success Criteria** (what must be TRUE):
  1. User can add a person by name, edit that name, and remove them from the bill
  2. User can add a receipt item with a name and price, then edit or delete it
  3. User can assign an item to one or more specific people using inline tap-toggle chips (no modal required)
  4. User can mark an item as shared among a chosen subset of people (e.g., appetizer split between two people only)
  5. Unassigned items are visually flagged so the user knows nothing is forgotten before calculating
**Plans**: TBD

### Phase 3: Tip, Tax, and Results
**Goal**: Users see exactly what each person owes, with itemized proof, after applying tip and tax
**Depends on**: Phase 2
**Requirements**: TIP-01, TAX-01, RESULTS-01, RESULTS-02
**Success Criteria** (what must be TRUE):
  1. User can set a per-person tip percentage and each person's tip applies to their own subtotal only
  2. User can set a single tax percentage for the whole bill, split proportionally across everyone
  3. The app displays the final amount each person owes, prominently
  4. Each person's row expands to show an itemized breakdown: what they had, their share of tax, and their tip amount
**Plans**: TBD

### Phase 4: Mobile Polish
**Goal**: The app is fast and error-free on a real phone at a restaurant table
**Depends on**: Phase 3
**Requirements**: None (constraint-driven — fulfills mobile-first and instant-calculation constraints)
**Success Criteria** (what must be TRUE):
  1. Active input fields scroll into view when the mobile keyboard appears (no keyboard occlusion)
  2. All tap targets are large enough to operate one-handed on a phone screen
  3. Totals recalculate instantly as the user edits any value (no Calculate button required)
  4. Edge cases produce no broken states: zero people, one person, all items unassigned, empty bill
  5. Dark mode is supported for low-light restaurant environments
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
| --- | --- | --- | --- |
| 1. Foundation | 2/2 | Complete   | 2026-03-18 |
| 2. People and Items UI | 0/TBD | Not started | - |
| 3. Tip, Tax, and Results | 0/TBD | Not started | - |
| 4. Mobile Polish | 0/TBD | Not started | - |
