# Phase 6: History - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Auto-save the current bill to localStorage as the user edits, and provide a slide-in history panel for browsing and restoring past splits. No new bill capabilities — this phase is purely about persistence and retrieval.

Requirements: HIST-01, HIST-02, HIST-03

</domain>

<decisions>
## Implementation Decisions

### Save trigger & deduplication
- Debounce window: 2 seconds after the last edit before saving to localStorage
- Session-based deduplication: on app load, assign a session ID (in memory only). All saves during that session overwrite the same history entry.
- One entry per session — never force a new entry mid-session (not on rename, not on large change)
- New tab / page reload = new session = new history entry

### History capacity & overflow
- Maximum 10 entries in localStorage
- Eviction: oldest entry first (FIFO) — the 11th session pushes out the 1st
- No user prompt on eviction — silent and automatic

### History panel UI
- Access: history icon button in the header (top-left or left side of header). Tapping opens a full-height slide-in drawer from the left side.
- Each entry displays: bill name + date + total. Unnamed bills show placeholder "Unnamed bill".
- Empty state: simple text — "No saved bills yet. Bills are auto-saved as you edit."
- Dark mode `dark:` classes required on all panel elements
- All interactive elements min-h-[44px] tap targets

### Restore behavior
- Tapping a history entry shows a confirmation dialog: "Load this bill?" with Load / Cancel buttons
- On confirm: close drawer, load the restored bill into the editor, start a new session (restored bill's edits will update a new history slot going forward)
- On cancel: dismiss dialog, stay on current bill

### Claude's Discretion
- Exact history icon (clock icon, history icon, or similar — any recognizable icon)
- Drawer animation specifics (slide transition speed/easing)
- Dialog styling and exact positioning
- localStorage key name for history array
- How the session ID is stored (module-level variable is fine — not in Zustand, not in localStorage)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements are fully captured in decisions above.

### Project requirements
- `.planning/REQUIREMENTS.md` — HIST-01, HIST-02, HIST-03 requirement definitions
- `.planning/ROADMAP.md` — Phase 6 success criteria (4 observable conditions)

### Prior phase context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Established patterns: integer-cent arithmetic, Zustand store shape, data types (Person, Item, BillSettings, tipOverrides)
- `.planning/phases/04-mobile-polish/04-CONTEXT.md` — min-h-[44px] tap target standard, dark mode requirement
- `.planning/phases/05-bill-identity-url-sharing/05-CONTEXT.md` — Serialization decisions: ShareableState shape, lz-string compression, one-shot encode/decode pattern

### Serialization (reuse Phase 5's implementation)
- `src/utils/urlState.ts` — ShareableState, toCompact(), fromCompact(), encode/decode — history snapshots reuse this EXACT format
- `src/store/billStore.ts` — Current store shape (billName, people, items, settings, tipOverrides) — history snapshots cover these fields

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/utils/urlState.ts` — `ShareableState`, `toCompact()`, `fromCompact()` already encode/decode the full bill state. History entries use the SAME compact format — no new serialization needed.
- `src/store/billStore.ts` — Zustand store with `billName`, `people`, `items`, `settings`, `tipOverrides`. History snapshots are taken directly from these fields.
- `src/components/Toast.tsx` — Existing toast component for non-blocking feedback. May be reusable for "Bill loaded" confirmation after restore.
- `src/components/ShareFallbackModal.tsx` — Existing modal pattern. The restore confirmation dialog can follow the same modal pattern.

### Established Patterns
- **Manual localStorage subscription**: subscribe to Zustand store changes, debounce writes. Phase 5 STATE.md notes this was chosen over Zustand persist middleware specifically because history needs multi-snapshot (not single-entry persist).
- **Dark mode**: every component has `dark:` class variants — history drawer and confirm dialog must include these.
- **min-h-[44px]**: tap target standard — apply to history entries, Load/Cancel buttons, close button.
- **Tailwind CSS v4**: styling approach — no config, `@import` only.

### Integration Points
- `src/App.tsx` — History icon button added to header. Zustand store subscription + debounce + localStorage write belongs in a new `useHistory` hook called from App (or a dedicated module).
- `src/store/billStore.ts` — A new `loadBill(state: ShareableState)` action needed for restore. Takes a full ShareableState and replaces all store fields atomically.
- New components needed: `HistoryPanel.tsx` (drawer), `HistoryEntry.tsx` (row), `RestoreConfirmDialog.tsx` (or inline in HistoryPanel)

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

*Phase: 06-history*
*Context gathered: 2026-03-19*
