# Phase 4: Mobile Polish - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the app fast and error-free on a real phone at a restaurant table. This phase delivers: keyboard-occlusion handling (inputs scroll into view when the mobile keyboard appears), tap targets large enough for one-handed use, instant live recalculation as the user types, resilient edge-case behavior (zero people, one person, all items unassigned, empty bill), and dark mode wired to system preference. No new features — this phase polishes what Phases 1–3 built.

</domain>

<decisions>
## Implementation Decisions

### Instant Recalculation
- Totals update **on every keystroke** — not on blur/Enter, not debounced
- **All numeric inputs** get live recalculation: item prices, the default tip % in SettingsPanel, the default tax % in SettingsPanel, and per-person tip overrides in PersonResultCard
- Invalid or blank draft values (empty string, `"."`, `"1."`, `NaN`) are **treated as zero** for live calculation — results always show a valid number, never a dash or error state
- **Dual-track pattern**: local component state holds the draft value and drives live calculation; `blur`/`Enter` commits the validated value to the Zustand store (no change to persistence semantics)
- **Architecture**: draft values flow up via callback/shared state — NOT via a store shadow field. ResultsPanel (or a parent above it) receives draft-aware overrides and merges them before calling `calculateResults()`
- Per-person tip draft updates **all cards' totals** — a tip change for one person affects tax proportion for everyone, so the full cross-card live update is required (not a local-only estimate)

### Keyboard Occlusion
- Claude's discretion: implement so active inputs scroll into view when the mobile keyboard appears (CSS `scroll-padding-bottom`, `scrollIntoView()` on focus, or equivalent). Prioritize item price inputs and tip override inputs as the most-used fields at the table.

### Tap Target Completeness
- The established pattern is `min-h-[44px]` (already on Remove Person button and tip preset buttons). Apply consistently to all interactive elements: AssignmentChips, click-to-edit spans (person names, item descriptions/prices), expand/collapse arrows in PersonResultCard, and per-person tip edit affordance.
- Claude's discretion on exact implementation (padding vs. min-height, touch target wrappers).

### Dark Mode
- Auto-follow system preference via `prefers-color-scheme` media query — no manual toggle. Dark mode classes are already in all components; this phase wires the Tailwind `dark` class to the `<html>` element or uses Tailwind's `media` dark mode strategy. Claude's discretion on implementation.

### Edge Cases
- Zero people + zero items: already handled (ResultsPanel shows "Add people and items above to see what everyone owes")
- People with no items, items with no people: already handled by ResultsPanel empty states
- All items unassigned (assigned mode, no assignedTo): calculation engine already handles this (skip-item guard); UI should not show a broken/blank results section — Claude's discretion on messaging
- Single person: no special UI needed — results panel shows that one person naturally
- Empty bill (all items at $0): treated as zero, results show $0.00 per person — no error state

### Claude's Discretion
- Exact scroll-into-view implementation (CSS vs JS approach)
- Touch target wrapper strategy for click-to-edit spans
- Tailwind dark mode configuration (`media` strategy vs `class` strategy)
- Any missing `dark:` classes on components not yet covered

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Calculation engine
- `.planning/research/ARCHITECTURE.md` — Data model, `calculateResults()` signature, PersonResult shape (read before designing draft-merge architecture)
- `.planning/research/PITFALLS.md` — Floating-point pitfalls, rounding (integer-cent arithmetic must be preserved in live-draft path)

### Project requirements
- `.planning/REQUIREMENTS.md` — v1 requirements (Phase 4 is constraint-driven, no REQ-IDs)
- `.planning/ROADMAP.md` — Phase 4 success criteria (5 observable conditions)

### Prior phase context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Established patterns: integer-cent arithmetic, pure `calculateResults()`, Zustand store shape

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/engine/calculate.ts` — Pure `calculateResults({ people, items, settings, tipOverrides })` → `PersonResult[]`. The draft-merge approach will pass modified `tipOverrides` and `items` (with draft prices) into this same function.
- `src/utils/parseDollars.ts` — `parseDollarsToCents()` already exists for converting string input to cents. Use this in the live-draft path (returns `NaN` for invalid input → treat as 0 cents).
- `src/utils/formatCents.ts` — `formatCents()` for displaying calculated totals.

### Established Patterns
- Inputs use **local `useState` draft + commit on blur/Enter**: `PersonRow`, `ItemRow`, `PersonResultCard`, `SettingsPanel` all follow this pattern. Live recalculation extends this pattern — drafts now also feed upward for calculation, not just local display.
- **`min-h-[44px]`** is the established tap target size (used on Remove Person button, SettingsPanel preset buttons). Extend to all interactive elements.
- **`dark:` Tailwind classes** are already present in every component (`dark:bg-gray-900`, `dark:border-gray-700`, etc.). Dark mode is visually complete — it just needs the trigger wired up.
- `calculateResults()` is called inline in `ResultsPanel` with values from `useBillStore()`. The live-draft architecture needs to intercept this call with merged draft values.

### Integration Points
- `ResultsPanel` is where `calculateResults()` is called — this is the primary integration point for the live-draft merge
- `PersonResultCard` holds per-person `tipDraft` in local state — this draft needs to flow up to wherever `calculateResults()` is called
- `ItemRow` holds `draftPrice` in local state — same requirement
- `SettingsPanel` holds `customDraft` (tip %) and `taxDraft` — same requirement
- App-level or a new context/hook above ResultsPanel is the natural aggregation point for all draft overrides

</code_context>

<specifics>
## Specific Ideas

- No specific references — open to standard approaches within the constraints above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-mobile-polish*
*Context gathered: 2026-03-18*
