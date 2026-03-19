# Phase 7: Venmo Payments - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a Venmo request button to each person's result card that opens the Venmo app (or venmo.com) with the correct dollar amount and a note pre-filled. Button is hidden when a person owes $0.00. No recipient username collection — amount and note only.

</domain>

<decisions>
## Implementation Decisions

### Button placement
- Button appears **always visible below the total amount** on the collapsed card — not gated behind expanding the breakdown
- Full-width button spanning the card width, below the dollar amount
- Label: **"Pay with Venmo"**
- Hidden entirely (not disabled, not greyed out) when `result.totalInCents === 0`

### Venmo note content
- Note pre-fills with the **bill name** (from Zustand state, set in Phase 5)
- Fallback when bill has no name: **"Split bill"**
- No person name in the note — bill name only

### Deep link strategy
- Use `venmo://paycharge?txn=charge&recipients=&amount=X&note=Y` as the primary deep link
- **Web fallback:** `https://venmo.com/...` for devices without the Venmo app
- Implementation: render as an `<a>` tag with `href` pointing to the deep link; the web fallback handles the "app not installed" case naturally when using universal links or by constructing a fallback URL
- Opens in a **new tab** (`target="_blank"`, `rel="noopener noreferrer"`) so user returns to the bill after Venmo opens
- Amount: `result.totalInCents / 100` formatted as decimal dollars (e.g., `42.50`)

### $0 handling
- When `result.totalInCents === 0`: button is not rendered at all (no empty space, no disabled state)

### Claude's Discretion
- Exact Venmo URL format details (venmo:// vs universal link vs web URL construction — research the current working format)
- Button visual styling within the established Tailwind palette (blue accent consistent with existing app buttons is fine)
- Whether to extract a `buildVenmoUrl` utility function or inline the logic

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above.

### Requirements
- `.planning/REQUIREMENTS.md` — PAY-01, PAY-02 (Venmo button requirements)

### Existing integration point
- `src/components/PersonResultCard.tsx` — file being modified; read current structure before editing
- `src/store/billStore.ts` — Zustand store; read to confirm how bill name is accessed (likely `useBillStore(state => state.billName)`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PersonResultCard.tsx`: Integration target — button goes inside the card's top section, below the name/amount row. Card uses `border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800`.
- `formatCents`: Existing utility for display, but Venmo URL needs raw decimal — use `(result.totalInCents / 100).toFixed(2)` directly.
- Button tap target pattern: `min-h-[44px] flex items-center justify-center` — established project convention.

### Established Patterns
- Dark mode: all new elements need `dark:` variants
- 44px minimum tap target: non-negotiable (Phase 4 decision)
- External links: no existing pattern yet — establish `target="_blank" rel="noopener noreferrer"`

### Integration Points
- `PersonResultCard.tsx` receives `result: PersonResult` (has `totalInCents`, `name`) — needs bill name passed as a new prop OR accessed directly from Zustand store inside the component
- Bill name lives in Zustand: `useBillStore(state => state.billName)` — component can call this hook directly (no prop drilling needed)

</code_context>

<specifics>
## Specific Ideas

No specific references — standard Venmo deep link approach.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-venmo-payments*
*Context gathered: 2026-03-19*
