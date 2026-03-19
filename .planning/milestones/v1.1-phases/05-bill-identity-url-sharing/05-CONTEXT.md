# Phase 5: Bill Identity & URL Sharing - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Add an optional bill name and a Share button that encodes the full bill state into a compressed URL. Users can open a shared URL to load the bill and edit it freely. Creating, copying, and loading the URL is fully client-side — no backend required.

Requirements: BILL-01, SHARE-01, SHARE-02

</domain>

<decisions>
## Implementation Decisions

### Bill Name — Entry & Display
- Click-to-edit in the header — consistent with how person names and item descriptions work
- Unnamed state: placeholder text "Tap to name this bill" below the "Split the Bill" heading
- Named state: "Split the Bill" stays as the app title (h1); bill name appears below it as a smaller subtitle (click-to-edit)
- Commit on blur/Enter (same pattern as other editable fields)
- Trim leading/trailing whitespace on commit — empty string after trim = unnamed bill
- No hard character limit

### Share Button — Placement
- Two entry points:
  1. Share icon in the header (top-right) — always visible
  2. Full "Share this split" button at the top of the Results section — contextually placed near the totals
- Both trigger the same action: encode current bill state → copy to clipboard

### Share Button — Feedback
- Success: toast notification at the bottom of the screen — "Link copied!" — auto-dismisses after ~2s
- Clipboard API unavailable (non-HTTPS, older browser): show a modal containing the URL in a selectable text area with a manual copy affordance

### URL Encoding Strategy
- One-shot encode on Share tap (NOT Zustand persist middleware — causes URL flickering, documented in STATE.md)
- URL is a snapshot of the moment Share was tapped — it does not update as the user edits
- To share an updated bill, the user taps Share again to get a new URL
- Compression library: lz-string (verify compression ratio on realistic bill data during research — flagged in STATE.md)

### Loading from a Shared URL
- On app load: check URL params; if present, decode and hydrate the Zustand store one-shot
- Fresh load (no params): normal empty bill state — no change from current behavior
- Malformed or undecodable URL: silent fallback to empty bill — no error message shown
- After loading: URL stays in the browser address bar unchanged (no history.replaceState cleanup)
- No "loaded from shared link" indicator — the bill behaves identically to a manually-created bill
- User can edit, add items, change names freely after loading

### Claude's Discretion
- Exact compression/encoding format (base64url + lz-string, or URL-safe variant)
- How UUIDs in the encoded state are handled (keep original or remap to new IDs on load — either is fine as long as the bill renders correctly)
- Toast component design and animation
- Modal design for clipboard fallback
- Exact positioning and styling of the Share icon in the header

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements are fully captured in decisions above.

### Project requirements
- `.planning/REQUIREMENTS.md` — BILL-01, SHARE-01, SHARE-02 requirement definitions
- `.planning/ROADMAP.md` — Phase 5 success criteria (4 observable conditions)

### Prior phase context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Established patterns: integer-cent arithmetic, Zustand store shape, data types (Person, Item, BillSettings, tipOverrides)
- `.planning/phases/04-mobile-polish/04-CONTEXT.md` — Dual-track draft pattern, click-to-edit established, min-h-[44px] tap target standard

### Research (if needed)
- `.planning/research/ARCHITECTURE.md` — Store shape and AppState type (used for serialization schema)
- `.planning/research/PITFALLS.md` — Integer-cent arithmetic constraints (must be preserved in serialized state)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/store/billStore.ts` — Zustand store with `people`, `items`, `settings`, `tipOverrides`. Serialization targets these 4 fields. Store needs a new `billName: string` field and `setBillName` action.
- `src/types/models.ts` — `AppState` type already defined (`people`, `items`, `settings`, `tipOverrides`) — use as serialization schema. Add `billName` to it.
- `src/utils/parseDollars.ts`, `src/utils/formatCents.ts` — Utility pattern: small focused utility files. New `encodeState.ts` / `decodeState.ts` utils should follow the same pattern.
- Click-to-edit pattern — already implemented in `PersonRow` (person name), `ItemRow` (description, price). Bill name click-to-edit follows the same local-state + blur/Enter commit pattern.

### Established Patterns
- **Click-to-edit**: local `useState` for edit mode, commit on blur/Enter, trim on commit. Bill name field follows this exactly.
- **min-h-[44px]**: tap target standard — apply to Share button and bill name edit affordance.
- **Tailwind CSS v4**: styling approach — no config, `@import` only.
- **`dark:` classes**: every component has dark mode variants — Share button and toast must include `dark:` classes.

### Integration Points
- `src/App.tsx` — Header `<h1>` is currently hardcoded "Split the Bill". The bill name subtitle and Share icon slot into this header. URL param reading on mount belongs in `App.tsx` (or a dedicated `useShareUrl` hook called from App).
- `src/components/ResultsPanel.tsx` — The full "Share this split" button lives at the top of this component, before the per-person cards.
- Zustand store (`billStore.ts`) — Add `billName: string` field + `setBillName(name: string)` action.

</code_context>

<specifics>
## Specific Ideas

No specific references — open to standard approaches within the constraints above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-bill-identity-url-sharing*
*Context gathered: 2026-03-19*
