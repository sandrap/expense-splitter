# Phase 1: Foundation - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Scaffold the Vite + React + TypeScript project, define all data types, set up the Zustand store with named actions, and implement a pure calculation engine with integer-cent arithmetic. Unit tests for the engine are written TDD-first. No UI components — this phase delivers the correctness layer everything else builds on.

</domain>

<decisions>
## Implementation Decisions

### Testing
- Use **Vitest** as the test runner (native Vite integration, no extra config)
- **TDD approach**: write failing tests for `calculateResults()` before implementing
- **Scenario-based coverage**: cover key scenarios — 2-way split, 3-way split, shared items among a subset, per-person tip, rounding edge cases (largest-remainder method)
- No exhaustive line coverage target — correctness of core scenarios is the goal

### Calculation Engine (from project research)
- All arithmetic in **integer cents** — floating-point is forbidden in the calculation engine
- **Largest-remainder method** for distributing rounding remainders so shares always sum exactly to the item total
- Tip calculated on **pre-tax subtotal** only (not on subtotal + tax)
- `calculateResults()` is a **pure function** — takes state as input, returns `PersonResult[]` — never stored in Zustand

### Data Model (from research decisions)
- `Item.splitMode` is an explicit enum (`'shared' | 'assigned'`) — not inferred from empty `assignedTo[]`
- `PersonResult` is derived on every render, never stored in state — totals can never be stale

### Claude's Discretion
- Exact folder structure and file naming conventions
- ESLint/Prettier configuration details
- Zustand store slice organization (single store vs. slices)
- Deployment target configuration (Cloudflare Pages or equivalent)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements are fully captured in decisions above and the research files below.

### Research (read these)
- `.planning/research/STACK.md` — Verified stack: React 19, Vite 6, Zustand 5, Tailwind CSS 4, TypeScript
- `.planning/research/ARCHITECTURE.md` — Data model definitions, calculation engine design, build order
- `.planning/research/PITFALLS.md` — Floating-point pitfalls, rounding distribution, tip/tax formula order

### Project requirements
- `.planning/REQUIREMENTS.md` — v1 requirements; Phase 1 is constraint-driven (no REQ-IDs)
- `.planning/ROADMAP.md` — Phase 1 success criteria (5 observable conditions)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — this is a greenfield project with no existing code

### Established Patterns
- None yet — Phase 1 establishes the patterns all subsequent phases will follow

### Integration Points
- Phase 2 (People and Items UI) will consume the Zustand store's actions and types directly
- Phase 3 (Tip, Tax, Results) will call `calculateResults()` to derive display values

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the constraints above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-18*
