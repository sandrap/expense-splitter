# Project Research Summary

**Project:** Expense Splitter
**Domain:** Mobile-first restaurant bill splitting web app (single-session, at-table use)
**Researched:** 2026-03-18
**Confidence:** HIGH

## Executive Summary

This is a client-side-only single-page application for splitting restaurant bills at the table. The expert approach is a static SPA with no backend, no accounts, and no persistence — state lives only in memory for the duration of one session. The recommended stack (React 19 + Vite 6 + Zustand 5 + Tailwind CSS 4) is a well-validated combination with official documentation support for each component. React 19's Actions and React Compiler provide production-grade performance without manual optimization. The app has no server, no routing, and no authentication surface area — this is a deliberate scope constraint that keeps the architecture clean and the deployment trivial (static CDN, no origin server required).

The architecture centers on a strict separation: a pure-function calculation engine that is independently testable, a Zustand store as the single source of truth for mutable state, and React components as a read-only rendering layer for derived results. The critical correctness constraint is integer-cent arithmetic throughout all money calculations — floating-point is explicitly forbidden in the calculation engine. The key differentiator over competitors is per-person tip and tax percentages, which the research confirms is absent in most existing tools. This feature is complex enough to warrant building it in the MVP rather than deferring it.

The primary risks are: (1) floating-point arithmetic producing incorrect totals — mitigated by integer-cent math from day one; (2) a UX assignment flow that is too slow at the table — mitigated by inline toggle chips rather than modals; (3) state management complexity growing uncontrolled as features compound — mitigated by defining the complete state shape and pure calculation interface before building any UI. All three risks are architectural decisions that must be made in Phase 1 before any feature work begins.

---

## Key Findings

### Recommended Stack

The stack is built entirely around static deployment with no server component. React 19.2 (stable, officially documented) combined with Vite 6 (the tool explicitly recommended by react.dev for scratch builds) is the correct scaffold. Tailwind CSS v4.1 (stable, released April 2025) replaces PostCSS configuration with a cleaner Vite plugin model, directly matching the mobile-first responsive requirement. Zustand 5 handles global bill state with minimal boilerplate and a selector model that prevents unnecessary re-renders during rapid input changes. React Compiler 1.0 (stable October 2025) is added at setup time as a build-time optimizer, eliminating manual `useMemo`/`useCallback` in calculation-heavy components.

Create React App is dead (deprecated February 2025). Next.js is explicitly wrong for this use case — SSR complexity with zero benefit for a client-only app. CSS-in-JS is explicitly excluded (runtime cost, declining ecosystem). There is no routing library because this is a single-view application.

**Core technologies:**
- React 19.2: UI rendering — first-class Actions and concurrent features, largest ecosystem, React Compiler compatible
- Vite 6: Build tooling — officially recommended by React docs, fastest HMR, produces static files for CDN deployment
- TypeScript 5.x: Type safety — catches floating-point and currency arithmetic bugs at compile time
- Zustand 5: State management — no boilerplate, selector model, works outside React for pure calculation logic
- Tailwind CSS 4.1: Styling — utility-first, mobile-first breakpoints, Vite plugin integration, zero runtime
- React Compiler 1.0: Build-time optimizer — eliminates manual memoization, proven at Meta
- Vitest 2.x + Testing Library 16.x: Testing — required for calculation engine correctness verification

### Expected Features

The research draws a clear line between table-stakes features (users abandon without them) and differentiators (move the app from adequate to recommended). The key insight is that per-person tip percentage is the stated differentiator and must ship in MVP — not deferred — because it is the feature that distinguishes this app from every major competitor.

**Must have (table stakes):**
- Add multiple people by name — core of the use case
- Add line items with prices — required for item-based splitting
- Assign items to one or more people — the fundamental split mechanic
- "Shared by everyone" shortcut for appetizers and common items
- Proportional tax calculation applied to each person's subtotal
- Single bill-wide tip percentage, split proportionally
- Per-person total prominently displayed — the goal of the entire session
- Expandable itemized breakdown per person — users want to verify the math
- Instant recalculation on every input change — no "Calculate" button
- Deterministic penny rounding that sums to the bill total
- Mobile-optimized touch UI with large tap targets

**Should have (competitive differentiators):**
- Per-person tip percentage — the #1 unmet need in most competitor tools; build in MVP
- Per-person tax override — power-user correctness; can follow MVP
- Unassigned-item running counter — reduces "did I forget anything?" anxiety
- Rounding transparency note — builds trust when a penny is distributed
- Copy/share formatted per-person amounts — completes the workflow without a screenshot
- Dark mode — expected in 2026, low-light restaurant use case

**Defer to v2+:**
- Shareable URL / session link — high complexity (URL state serialization), not blocking core value
- Item quantity field — low complexity, not blocking correctness
- Coupon/discount line item — common but not core-path blocking
- Per-item tax rates — moderate complexity, v1 uses proportional approximation

**Do not build:**
- User accounts, login, or persistent history
- Payment processing or Venmo/PayPal integration
- OCR receipt scanning
- Native iOS/Android apps
- Multi-currency support
- Split-by-percentage mode

### Architecture Approach

The architecture is three clean layers with strict separation: (1) an ephemeral Zustand store holding `people[]`, `items[]`, and `settings` as the single mutable truth; (2) a pure-function calculation engine (`calculateResults(AppState) → PersonResult[]`) with no React or store dependencies, testable in isolation; (3) read-only React components that consume derived results and dispatch named store actions for mutations. Derived results (`PersonResult[]`) are never stored back in state — they are computed fresh on every render via a selector. This eliminates an entire class of synchronization bugs.

**Major components:**
1. Zustand store (`useBillStore`) — holds `people[]`, `items[]`, `settings`; exposes named action functions
2. Calculation engine (`calculateResults`) — pure function, integer-cent arithmetic, largest-remainder rounding
3. `PeoplePanel` / `PersonCard` — add/remove/edit people and per-person tip/tax settings
4. `ItemsPanel` / `ItemRow` — add/remove/edit items, inline assignment picker, shared flag
5. `TipTaxPanel` — bill-wide percentages and mode toggles (shared vs per-person)
6. `ResultsPanel` / `PersonResult` / `SummaryRow` — read-only derived output, expandable breakdowns

**Key data model decisions:**
- `Item.splitMode: 'shared' | 'assigned'` is an explicit enum, not inferred from empty `assignedTo[]` — prevents "not yet assigned" from being treated as "shared"
- `Item.assignedTo: string[]` holds Person IDs, not object references — prevents stale reference bugs on person removal
- `Person.tipMode: 'bill' | 'custom'` and `Person.taxMode: 'bill' | 'custom'` — explicit flags drive calculation branching
- `PersonResult` is derived, never stored — totals can never be stale

### Critical Pitfalls

1. **Floating-point arithmetic for money** — Work in integer cents throughout the entire calculation engine. Convert inputs to cents on entry (`Math.round(parseFloat(input) * 100)`), convert to display strings only at render. Never use raw floats in addition or division. This is non-negotiable and must be implemented in Phase 1 before any UI exists.

2. **Rounding distribution leaves cents unaccounted** — A $10.00 item split 3 ways produces $9.99 if each share is independently rounded. Use the largest remainder method: compute floor of each share in cents, assign remainder cents one-by-one to the people with the largest fractional parts. Unit-test that `sum(personShares) === itemTotalCents` for 3-way, 7-way, and odd-cent splits.

3. **Wrong tip/tax order of operations** — Tip is calculated on the pre-tax subtotal, not on `subtotal + tax`. The correct formula is `total = subtotal + (subtotal * taxRate) + (subtotal * tipRate)`. Lock this in code comments before building any tip/tax UI controls. Verify: $10 item, 10% tax, 20% tip should produce tax $1.00, tip $2.00, total $13.00.

4. **Assignment UX is too slow at the table** — Item assignment must be inline tap-toggle chips, not a modal per item. Default every new item to "shared by everyone" — users remove people who didn't have it rather than adding everyone who did (fewer taps for the majority case). Target: assign a shared appetizer to 4 of 6 people in 4 taps or fewer.

5. **Per-person tip mode creates silent errors** — When tip mode switches from shared to per-person, make each person's current tip rate unambiguous in the summary (`Tip: 18% (shared)` vs `Tip: 20% (custom)`). Default to shared; make per-person override a deliberate, labeled action.

---

## Implications for Roadmap

Based on the combined research, the architecture and calculation correctness must be established before any UI is built. The component build order from ARCHITECTURE.md directly suggests the phase structure below.

### Phase 1: Foundation — Data Model, Store, and Calculation Engine

**Rationale:** Floating-point correctness and integer-cent arithmetic must exist before any UI. The calculation engine is the product's core correctness guarantee. Building it first, independently of React, means it can be unit-tested exhaustively before any component depends on it. The state shape must be finalized here to avoid the state management complexity pitfall (Pitfall 8).

**Delivers:** TypeScript interfaces (`Person`, `Item`, `BillSettings`, `PersonResult`); Zustand store with all named actions; pure `calculateResults()` function with integer-cent arithmetic and largest-remainder rounding; unit test suite covering all split scenarios.

**Addresses:** Add people, add items, item assignment data model; tip/tax data model including per-person modes.

**Avoids:** Pitfalls 1 (floating-point), 2 (rounding), 8 (state complexity) — all must be resolved here, not retrofitted.

**Research flag:** Standard patterns — well-documented. Skip phase research.

---

### Phase 2: People and Item Entry UI

**Rationale:** People must exist before items can be assigned. This phase builds the two input panels in dependency order. Item assignment UI is the highest-complexity UX decision (Pitfall 4) — the tap flow must be prototyped before coding, not after.

**Delivers:** `PeoplePanel` + `PersonCard` (add/remove/rename people); `ItemsPanel` + `ItemRow` (add/remove/edit items, inline assignment toggle chips, shared flag); real-time store integration; input validation guarding against NaN and division by zero (Pitfall 7).

**Addresses:** Table-stakes features: add people, add items, assign items, shared-by-everyone shortcut, unassigned-item counter.

**Avoids:** Pitfall 4 (modal overload for assignment — use inline chips); Pitfall 7 (NaN from zero-assignee items or invalid prices); Pitfall 10 (no edit-after-review — single continuous view from day one, no wizard).

**Research flag:** Standard React/Zustand patterns. Skip phase research.

---

### Phase 3: Tip, Tax, and Per-Person Settings

**Rationale:** Tip and tax depend on the item subtotals established in Phase 2. Per-person tip is the stated differentiator and the calculation formula must be locked in before UI controls are built. This phase also builds the `TipTaxPanel` and activates per-person tip/tax overrides on `PersonCard`.

**Delivers:** `TipTaxPanel` (bill-wide tip %, tax %, mode toggles); per-person tip/tax rate inputs on `PersonCard`; calculation engine wired to per-person mode logic; formula documented in code.

**Addresses:** Bill-wide tip and tax (table stakes); per-person tip percentage (key differentiator — build in MVP).

**Avoids:** Pitfall 3 (tip/tax order of operations — lock formula before building controls); Pitfall 5 (silent per-person tip mode confusion — show mode label in UI); Pitfall 13 (invalid tip % values — validate range 0–100).

**Research flag:** Standard patterns for the UI; the per-person tip calculation is project-specific logic already fully specified in FEATURES.md and ARCHITECTURE.md. Skip phase research.

---

### Phase 4: Results Display

**Rationale:** Results depend on all prior state being correct. `ResultsPanel` is read-only — it consumes `PersonResult[]` derived from the calculation engine. This phase completes the core user journey: enter a bill, see what everyone owes.

**Delivers:** `ResultsPanel` with expandable per-person breakdowns; `SummaryRow` (grand total sanity check vs sum of person totals); rounding transparency note; copy/share formatted amounts.

**Addresses:** Per-person totals (table stakes), itemized breakdown per person, rounding transparency, copy/share amounts.

**Avoids:** Anti-pattern of storing derived totals in state (always compute from canonical state); Pitfall 2 (rounding — verify sum of person totals equals bill total on screen).

**Research flag:** Standard React rendering patterns. Skip phase research.

---

### Phase 5: Mobile Polish and Edge Cases

**Rationale:** The app is used on phones at restaurant tables. Mobile keyboard occlusion (Pitfall 9) and touch target sizing are invisible in desktop development and must be addressed in a dedicated pass on real hardware. Edge cases (zero people, one person, unassigned items, empty bill) need explicit UI treatment.

**Delivers:** `scrollIntoView` on input focus; `scroll-padding-bottom` CSS for keyboard clearance; dark mode (CSS media query); empty state screens; one-person degenerate case handling; locale-aware currency display via `Intl.NumberFormat`; final QA pass on real iOS and Android devices.

**Addresses:** Dark mode, currency locale handling (Pitfall 11), no visual confirmation of unassigned items (Pitfall 12).

**Avoids:** Pitfall 9 (keyboard occlusion — test on real phone, not DevTools); degenerate edge cases causing NaN or Infinity.

**Research flag:** Well-documented mobile web patterns. Skip phase research.

---

### Phase Ordering Rationale

- Calculation engine before UI because correctness cannot be retrofitted — integer-cent arithmetic and largest-remainder rounding must be tested in isolation before any component depends on them.
- People before items because `Item.assignedTo` holds Person IDs — the store must have people before items can reference them.
- Tip/tax after items because tip and tax apply to item subtotals — the subtotal calculation must be correct first.
- Results last because they are purely derived from all prior state — any error in prior phases would surface incorrectly in results.
- Polish last because mobile-specific issues are impossible to discover until the core flows exist on real devices.

### Research Flags

Phases with standard patterns (skip `/gsd:research-phase`):
- **All phases:** The technology choices are well-documented and the domain logic is fully specified across the four research files. No phase has novel integrations, external APIs, or sparse documentation areas that would benefit from additional research before implementation.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | React 19.2, Tailwind CSS 4.1, and React Compiler 1.0 verified via official blogs fetched during research. Vite 6 confirmed via React docs. Zustand v5 version number from community sources — verify with `npm info zustand version` before setup. |
| Features | MEDIUM | Table-stakes features are HIGH confidence (universally present across all reviewed tools). Per-person tip as differentiator is MEDIUM — confirmed absent in most tools as of training cutoff August 2025, but app store landscape should be validated before finalizing competitive claims. |
| Architecture | HIGH | All patterns are established React SPA patterns with no experimental dependencies. Unidirectional data flow, pure function calculation engine, and Zustand store patterns are extensively documented. |
| Pitfalls | HIGH | Floating-point and integer-cent arithmetic are stable, well-documented topics (IEEE 754, ECMAScript spec). Mobile keyboard occlusion and UX pitfalls are MEDIUM — widely documented but behavior varies by OS version. |

**Overall confidence:** HIGH

### Gaps to Address

- **Zustand version:** `npm info zustand version` at project start to confirm Zustand 5.x is current. ARCHITECTURE.md patterns are compatible with Zustand 4 as a fallback but v5 is preferred for React 19 compatibility.
- **Competitor landscape validation:** The per-person tip differentiator claim is based on training data (cutoff August 2025). Before investing in the feature as a marketing claim, validate against current App Store and web app landscape. The feature is still valuable regardless — the competitive angle is the claim at risk.
- **Per-item tax rate extensibility:** v1 uses proportional tax distribution by subtotal. The data model should be designed to support a `taxRate` field on `Item` for a future v2 addition without a migration — ARCHITECTURE.md's `Item` interface should reserve this even if unused.
- **Deployment platform SPA routing:** Cloudflare Pages `_redirects` configuration was not verified against current docs in this research session. Confirm SPA fallback routing before deployment.

---

## Sources

### Primary (HIGH confidence)
- https://react.dev/blog/2024/12/05/react-19 — React 19 stable announcement
- https://react.dev/blog (fetched 2026-03-18) — React 19.2 confirmation
- https://react.dev/learn/build-a-react-app-from-scratch — Vite as official recommendation
- https://tailwindcss.com/blog (fetched 2026-03-18) — Tailwind CSS v4.1 stable release
- https://tailwindcss.com/docs/installation — Vite plugin integration
- https://react.dev/blog/2025/04/21/react-compiler-rc — React Compiler 1.0 stable
- IEEE 754 / ECMAScript specification — floating-point behavior
- MDN Web Docs — `Intl.NumberFormat`, `scrollIntoView`

### Secondary (MEDIUM confidence)
- Community sources — Zustand v5 React 19 compatibility
- Training data (cutoff August 2025) — Splitwise, Tab, Billr, iOS split-bill feature analysis for feature landscape
- US restaurant industry convention — tip-on-pretax-subtotal calculation order

### Tertiary (needs validation)
- Cloudflare Pages SPA routing — verify `_redirects` configuration against current docs before deployment
- Competitor app store landscape — validate per-person tip differentiator claim against current offerings

---
*Research completed: 2026-03-18*
*Ready for roadmap: yes*
