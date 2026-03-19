# Phase 6: History - Research

**Researched:** 2026-03-19
**Domain:** localStorage persistence, debounced auto-save, slide-in drawer UI
**Confidence:** HIGH

## Summary

Phase 6 adds auto-save and history browsing to the expense splitter. The technical surface is narrow: debounced Zustand store subscription writes snapshots to localStorage, a slide-in drawer displays them, and tapping an entry restores it after confirmation. No new dependencies are needed -- the existing stack (React 19, Zustand 5, Tailwind CSS 4, lz-string) covers everything.

The key reuse point is `src/utils/urlState.ts` which already provides `ShareableState`, `toCompact()`, and `fromCompact()` for full bill serialization. History entries store the same compact JSON format. The only new serialization concern is adding metadata (date, session ID) alongside the compact state.

**Primary recommendation:** Build a `useHistorySync` hook that subscribes to Zustand outside React (via `useBillStore.subscribe`), debounces 2s, and writes to localStorage. Keep the history array as a simple JSON array of `{sessionId, timestamp, name, totalInCents, state: CompactState}` objects under a single localStorage key.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Debounce window: 2 seconds after the last edit before saving to localStorage
- Session-based deduplication: on app load, assign a session ID (in memory only). All saves during that session overwrite the same history entry.
- One entry per session -- never force a new entry mid-session (not on rename, not on large change)
- New tab / page reload = new session = new history entry
- Maximum 10 entries in localStorage
- Eviction: oldest entry first (FIFO) -- the 11th session pushes out the 1st
- No user prompt on eviction -- silent and automatic
- History icon button in the header (top-left or left side of header). Tapping opens a full-height slide-in drawer from the left side
- Each entry displays: bill name + date + total. Unnamed bills show placeholder "Unnamed bill"
- Empty state: simple text -- "No saved bills yet. Bills are auto-saved as you edit."
- Dark mode `dark:` classes required on all panel elements
- All interactive elements min-h-[44px] tap targets
- Tapping a history entry shows a confirmation dialog: "Load this bill?" with Load / Cancel buttons
- On confirm: close drawer, load the restored bill into the editor, start a new session
- On cancel: dismiss dialog, stay on current bill

### Claude's Discretion
- Exact history icon (clock icon, history icon, or similar -- any recognizable icon)
- Drawer animation specifics (slide transition speed/easing)
- Dialog styling and exact positioning
- localStorage key name for history array
- How the session ID is stored (module-level variable is fine -- not in Zustand, not in localStorage)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HIST-01 | App auto-saves recent bills to localStorage as the bill is edited | Debounced Zustand subscription + localStorage write; session-based deduplication; FIFO eviction at 10 entries |
| HIST-02 | User can browse recent bills in a history panel (showing name, date, total) | Slide-in drawer component reading from localStorage; each entry shows billName (or "Unnamed bill"), timestamp, grandTotal |
| HIST-03 | User can restore a past bill from history into the editor | Confirmation dialog + `loadBill` Zustand action that atomically replaces store state; starts new session post-restore |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.12 | State management + `subscribe()` for side effects | Already in project; vanilla subscribe provides non-React access for debounced writes |
| lz-string | ^1.5.0 | Compact serialization (reuse `toCompact`/`fromCompact`) | Already in project; history reuses same compact format as URL sharing |
| react | ^19.2.4 | UI components | Already in project |
| tailwindcss | ^4.2.2 | Styling (drawer, dialog, dark mode) | Already in project |

### Supporting
No new dependencies needed. The browser `localStorage` API, `crypto.randomUUID()`, and `Date.now()` cover all requirements.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual localStorage | Zustand persist middleware | Persist is single-snapshot; history needs multi-entry array. Decision locked: manual subscription. |
| Raw JSON in localStorage | IndexedDB / idb-keyval | Overkill for 10 small entries; localStorage is simpler and synchronous |
| Custom debounce | lodash.debounce | Adding a dependency for one function is unnecessary; 5-line custom debounce suffices |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  hooks/
    useHistorySync.ts     # Zustand subscribe + debounce + localStorage write
  components/
    HistoryButton.tsx      # Header icon button (opens drawer)
    HistoryDrawer.tsx      # Full-height slide-in panel with entry list
    RestoreConfirmDialog.tsx # "Load this bill?" modal
  utils/
    history.ts             # Pure functions: loadHistory, saveHistory, pruneHistory
    urlState.ts            # (existing) ShareableState, toCompact, fromCompact
  store/
    billStore.ts           # (existing) + new loadBill action
```

### Pattern 1: Zustand External Subscription for Side Effects
**What:** Subscribe to store changes outside React using `useBillStore.subscribe()`, debounce writes to localStorage.
**When to use:** When a side effect (persistence) should run on every state change but not block rendering.
**Example:**
```typescript
// src/hooks/useHistorySync.ts
import { useEffect } from 'react';
import { useBillStore } from '../store/billStore';
import { saveCurrentBill } from '../utils/history';

// Module-level session ID -- new on every page load
const SESSION_ID = crypto.randomUUID();

export function useHistorySync() {
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const unsubscribe = useBillStore.subscribe((state) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        saveCurrentBill(SESSION_ID, state);
      }, 2000);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);
}
```

### Pattern 2: History Entry Shape
**What:** Each history entry stores compact bill state plus display metadata.
**Example:**
```typescript
// src/utils/history.ts
interface HistoryEntry {
  sessionId: string;
  timestamp: number;       // Date.now()
  name: string;            // billName or ''
  totalInCents: number;    // grandTotal for display
  state: CompactState;     // from toCompact() -- same as URL sharing
}

const HISTORY_KEY = 'expense-splitter-history';
const MAX_ENTRIES = 10;
```

### Pattern 3: Atomic Store Load for Restore
**What:** A single Zustand action that replaces all bill fields atomically from a `ShareableState`.
**When to use:** When restoring a bill from history (or URL). Prevents partial state where some fields are old and others are new.
**Example:**
```typescript
// Added to billStore.ts
loadBill: (bill: ShareableState) => set({
  billName: bill.billName,
  people: bill.people,
  items: bill.items,
  settings: bill.settings,
  tipOverrides: bill.tipOverrides,
}),
```
Note: The existing `App.tsx` already does `useBillStore.setState(decoded)` for URL loading. A dedicated `loadBill` action is cleaner and can be called from both URL hydration and history restore.

### Pattern 4: Slide-in Drawer with Tailwind
**What:** Full-height drawer from left using CSS transform + transition.
**Example:**
```typescript
// Drawer container pattern
<div className={`fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-white dark:bg-gray-800
  shadow-xl transform transition-transform duration-300 ease-in-out
  ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
  {/* drawer content */}
</div>
// Backdrop
{isOpen && <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />}
```

### Anti-Patterns to Avoid
- **Storing full JSON state (not compact):** Use `toCompact()` to keep localStorage small. 10 full-JSON entries could approach localStorage limits for large bills.
- **Computing grandTotal on read from history:** Store `totalInCents` at save time. Avoids importing calculation engine into history display.
- **Debounce inside React render:** The debounce timer must live outside the render cycle (in a `useEffect` cleanup or module scope) to avoid being reset on re-renders.
- **Saving empty bills:** Don't create history entries when the bill has no people and no items. Check for meaningful content before writing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bill serialization | Custom JSON schema | `toCompact()` / `fromCompact()` from urlState.ts | Already tested, handles all fields, compact format |
| Grand total calculation | Manual sum in history module | `calculateResults()` from engine/calculate.ts | Already handles tip/tax/rounding correctly |
| UUID generation | Custom ID generator | `crypto.randomUUID()` | Browser-native, already used throughout project |
| Modal/dialog pattern | Custom overlay from scratch | Follow `ShareFallbackModal.tsx` pattern | Existing backdrop + Escape-key + dark mode pattern |

**Key insight:** The Phase 5 serialization work (`toCompact`/`fromCompact`) eliminates the hardest part of this phase. History is essentially "URL sharing but to localStorage instead of a URL."

## Common Pitfalls

### Pitfall 1: localStorage Quota Exceeded
**What goes wrong:** Writing to localStorage throws `QuotaExceededError` when storage is full (typically 5-10MB per origin).
**Why it happens:** Other scripts on the same origin, or accumulated data over time.
**How to avoid:** Wrap `localStorage.setItem` in a try/catch. On failure, evict oldest entries and retry. Use compact format to minimize size.
**Warning signs:** Uncaught DOMException in production.

### Pitfall 2: Debounce Not Cancelled on Unmount
**What goes wrong:** Timer fires after component unmounts, writing stale state or causing errors.
**Why it happens:** `setTimeout` persists after React component cleanup.
**How to avoid:** Clear the timeout in the `useEffect` cleanup function. The pattern shown above handles this.
**Warning signs:** Console warnings about state updates on unmounted components.

### Pitfall 3: Session ID Regenerated on Hot Module Reload
**What goes wrong:** During development, HMR re-executes the module, generating a new session ID, creating duplicate history entries.
**Why it happens:** Module-level `const SESSION_ID = crypto.randomUUID()` re-runs on HMR.
**How to avoid:** Accept this as dev-only behavior. Alternatively, use `globalThis.__historySessionId ??= crypto.randomUUID()` but this is optional polish.
**Warning signs:** Multiple entries appearing during dev for the same editing session.

### Pitfall 4: Race Condition on Restore + Auto-Save
**What goes wrong:** User restores a bill, auto-save fires with old session ID before new session starts, corrupting the restored bill's history entry.
**Why it happens:** Debounced save from pre-restore editing fires after restore.
**How to avoid:** When restoring, (1) cancel any pending debounce timer, (2) generate new session ID, (3) then load the bill. The new session ID ensures the restored state saves to a fresh slot.
**Warning signs:** History entry showing mixed state from old and restored bills.

### Pitfall 5: Empty Bill Saved to History
**What goes wrong:** History fills with empty/default state entries from page loads where user didn't edit.
**Why it happens:** Zustand subscribe fires on initial mount or trivial changes.
**How to avoid:** Gate saves: only write to history if the bill has at least one person OR one item. Skip saving the default empty state.
**Warning signs:** History panel full of "Unnamed bill" entries with $0.00 total.

### Pitfall 6: Stale History Display After Restore
**What goes wrong:** History drawer shows old data after a bill is restored and auto-saved.
**Why it happens:** History list was read once on drawer open but not updated.
**How to avoid:** Re-read localStorage when opening the drawer, or keep a React state that syncs after saves.
**Warning signs:** Restored bill not appearing as the latest entry in history.

## Code Examples

### Reading/Writing History from localStorage
```typescript
// src/utils/history.ts
export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // QuotaExceededError -- evict oldest and retry
    if (entries.length > 1) {
      saveHistory(entries.slice(1));
    }
  }
}

export function upsertEntry(
  history: HistoryEntry[],
  sessionId: string,
  entry: Omit<HistoryEntry, 'sessionId'>
): HistoryEntry[] {
  const idx = history.findIndex((e) => e.sessionId === sessionId);
  const newEntry = { ...entry, sessionId };
  let updated: HistoryEntry[];
  if (idx >= 0) {
    // Update existing session entry in place
    updated = [...history];
    updated[idx] = newEntry;
  } else {
    // Append new entry, evict oldest if at capacity
    updated = [...history, newEntry];
    if (updated.length > MAX_ENTRIES) {
      updated = updated.slice(updated.length - MAX_ENTRIES);
    }
  }
  return updated;
}
```

### Computing Total for History Display
```typescript
// At save time, compute grandTotal from current store state
import { calculateResults } from '../engine/calculate';

function computeTotal(state: BillState): number {
  const results = calculateResults(
    state.people, state.items, state.settings, state.tipOverrides
  );
  return results.reduce((sum, r) => sum + r.totalInCents, 0);
}
```

### Confirmation Dialog (following ShareFallbackModal pattern)
```typescript
// RestoreConfirmDialog.tsx -- follows existing modal pattern
export function RestoreConfirmDialog({
  onConfirm, onCancel
}: { onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onCancel} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70]
        bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-[calc(100%-32px)] shadow-xl">
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
          Load this bill?
        </p>
        <div className="flex justify-end gap-4">
          <button onClick={onCancel}
            className="min-h-[44px] px-4 text-base font-bold text-gray-500 dark:text-gray-400">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="min-h-[44px] px-4 text-base font-bold text-blue-500 dark:text-blue-400">
            Load
          </button>
        </div>
      </div>
    </>
  );
}
```

### Formatting Date for History Entry Display
```typescript
function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  }).format(new Date(timestamp));
}
// "Mar 19, 4:30 PM"
```

### Formatting Cents for Display
```typescript
function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zustand persist middleware for history | Manual subscribe + localStorage | Project decision (v1.1 roadmap) | Persist is single-snapshot; manual approach allows multi-entry history array |
| Store full JSON in localStorage | Store compact format via toCompact() | Phase 5 established pattern | ~60% smaller storage footprint |

**Deprecated/outdated:**
- Zustand `persist` middleware: Not deprecated, but explicitly rejected for this use case (multi-snapshot requirement).

## Open Questions

1. **Should restoring a bill trigger a toast notification?**
   - What we know: `Toast.tsx` exists and is reusable. CONTEXT.md mentions it as "may be reusable for 'Bill loaded' confirmation."
   - What's unclear: Not explicitly required, but good UX.
   - Recommendation: Add a "Bill loaded" toast after restore -- minimal effort, good feedback. Leave to implementer discretion.

2. **Should history entries store the compact state or the full ShareableState?**
   - What we know: Compact is smaller; full is easier to restore directly.
   - Recommendation: Store compact (via `toCompact()`). Use `fromCompact()` on restore. Matches the URL sharing pattern exactly and keeps localStorage small.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HIST-01 | Auto-save debounces and writes to localStorage | unit | `npx vitest run src/utils/__tests__/history.test.ts -t "save" --reporter=verbose` | No -- Wave 0 |
| HIST-01 | Session deduplication (same session overwrites) | unit | `npx vitest run src/utils/__tests__/history.test.ts -t "session" --reporter=verbose` | No -- Wave 0 |
| HIST-01 | FIFO eviction at 10 entries | unit | `npx vitest run src/utils/__tests__/history.test.ts -t "eviction" --reporter=verbose` | No -- Wave 0 |
| HIST-01 | Empty bills not saved | unit | `npx vitest run src/utils/__tests__/history.test.ts -t "empty" --reporter=verbose` | No -- Wave 0 |
| HIST-02 | History drawer renders entries with name/date/total | unit | `npx vitest run src/components/__tests__/HistoryDrawer.test.tsx --reporter=verbose` | No -- Wave 0 |
| HIST-02 | Empty state message displayed when no history | unit | `npx vitest run src/components/__tests__/HistoryDrawer.test.tsx -t "empty" --reporter=verbose` | No -- Wave 0 |
| HIST-03 | Restore loads full bill state into store | unit | `npx vitest run src/store/__tests__/billStore.test.ts -t "loadBill" --reporter=verbose` | No -- Wave 0 |
| HIST-03 | Restore starts new session | unit | `npx vitest run src/hooks/__tests__/useHistorySync.test.ts --reporter=verbose` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/utils/__tests__/history.test.ts` -- covers HIST-01 (save, dedup, eviction, empty-guard)
- [ ] `src/components/__tests__/HistoryDrawer.test.tsx` -- covers HIST-02 (render entries, empty state)
- [ ] `src/store/__tests__/billStore.test.ts` -- extend existing file with `loadBill` tests for HIST-03

Note: `localStorage` is available in jsdom (the project's test environment). No additional mocking infrastructure needed -- jsdom provides a working `localStorage` implementation.

## Sources

### Primary (HIGH confidence)
- `src/utils/urlState.ts` -- ShareableState, toCompact(), fromCompact(), encodeState(), decodeState()
- `src/store/billStore.ts` -- Zustand store shape, all actions
- `src/App.tsx` -- Current header layout, URL hydration pattern
- `src/components/ShareFallbackModal.tsx` -- Modal/dialog pattern (backdrop, Escape key, dark mode)
- `src/components/Toast.tsx` -- Toast notification pattern
- `package.json` -- All dependency versions verified from project file

### Secondary (MEDIUM confidence)
- Zustand `subscribe()` API -- well-documented, stable across v4/v5
- `localStorage` API -- web standard, universally supported
- `Intl.DateTimeFormat` -- web standard for locale-aware date formatting

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing libraries verified from package.json
- Architecture: HIGH -- patterns follow existing project conventions (urlState reuse, modal pattern, Zustand subscribe)
- Pitfalls: HIGH -- localStorage and debounce pitfalls are well-documented browser API concerns

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable domain, no fast-moving dependencies)
