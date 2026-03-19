# Architecture Patterns: v1.1 Sharing & Payments Integration

**Domain:** URL state sharing, localStorage history, Venmo deep links for existing Zustand + React bill splitter
**Researched:** 2026-03-18
**Overall confidence:** HIGH

## Recommended Architecture

The v1.1 features integrate into the existing architecture through three independent subsystems, each touching the Zustand store at well-defined boundaries. None of the new features require modifying the calculation engine (`calculateResults`), the `useDraftCalculation` hook, or the existing component props contracts. The core principle: **new features read from and write to the existing `BillState` shape** -- they do not introduce a parallel state tree.

### Architecture Overview

```
                          +------------------+
                          |   URL Hash       |
                          | (encoded state)  |
                          +--------+---------+
                                   |
                        encode/decode (lz-string)
                                   |
    +------------------+   +-------v--------+   +------------------+
    | localStorage     |<--+  useBillStore  +-->|  Venmo Deep Link |
    | (bill history)   |   |  (Zustand 5)   |   |  Generator       |
    +------------------+   +---+----+---+---+   +------------------+
                               |    |   |
                     +---------+    |   +----------+
                     |              |              |
              +------v---+  +------v------+ +-----v-------+
              | PeopleP. |  | ItemsPanel  | | ResultsPanel|
              +----------+  +-------------+ +--+----------+
                                               |
                                        +------v-----------+
                                        | PersonResultCard |
                                        | + VenmoButton    |
                                        +------------------+
```

### Integration Point Summary

| Feature | Touches Store? | Touches Engine? | Touches Existing Components? | New Files |
|---------|---------------|-----------------|------------------------------|-----------|
| Bill name | YES (new field) | NO | YES (App header) | 0 new, 2 modified |
| URL sharing | READ-ONLY | NO | YES (App.tsx init) | `src/utils/urlState.ts`, share button in App |
| localStorage history | READ-ONLY + WRITE | NO | NO | `src/utils/billHistory.ts`, `src/components/HistoryDrawer.tsx` |
| Venmo deep links | NO (reads PersonResult) | NO | YES (PersonResultCard) | `src/utils/venmoLink.ts`, `src/components/VenmoButton.tsx` |

---

## Component Boundaries

### New Components

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `VenmoButton` | Renders a "Request via Venmo" link for one person | Receives `PersonResult` + optional Venmo username as props |
| `HistoryDrawer` | Lists saved bills, allows restore/delete | Reads from `billHistory` utility; calls `useBillStore.setState()` to restore |
| `ShareButton` | Encodes current state to URL, copies to clipboard | Reads full state from `useBillStore.getState()`; writes to `location.hash` |

### Modified Components

| Component | Change | Why |
|-----------|--------|-----|
| `App.tsx` | Add bill name input in header; add ShareButton; add HistoryDrawer toggle; add URL hydration on mount | App is the top-level orchestrator |
| `PersonResultCard.tsx` | Add VenmoButton below total in expanded view | Natural placement for payment action |
| `billStore.ts` | Add `billName: string` field + `setBillName` action + `resetBill` action | Required for bill identification in history and URL |

### Unchanged (Explicitly)

| Component/Module | Why Unchanged |
|-----------------|---------------|
| `calculateResults` (engine) | New features do not affect calculation logic |
| `useDraftCalculation` hook | Draft state is ephemeral; sharing encodes committed store state only |
| `PeoplePanel`, `ItemsPanel`, `SettingsPanel` | No new props or behavior needed |
| `distribute.ts`, `cents.ts` | Pure math, no feature coupling |

---

## Data Flow

### 1. URL State Sharing

**Encoding flow (user taps "Share"):**
```
useBillStore.getState() -> extract data slice -> JSON.stringify -> lz-string compress -> base64 URL-safe -> location.hash
                                                                                                          |
                                                                                                   navigator.clipboard.writeText(url)
```

**Decoding flow (user opens shared URL):**
```
location.hash -> base64 decode -> lz-string decompress -> JSON.parse -> validate schema -> useBillStore.setState(decoded)
                                                                                            |
                                                                                     clear hash (optional)
```

**What gets encoded:** The serializable data slice of `BillState` only -- not action functions. This maps to the existing `AppState` type in `types/models.ts`, plus the new `billName` field.

```typescript
// src/utils/urlState.ts -- the serializable shape
interface ShareableState {
  billName: string;
  people: Person[];
  items: Item[];
  settings: BillSettings;
  tipOverrides: Record<string, number>;
}
```

**Key decision: Use URL hash, not search params.** Hash fragments are never sent to the server (important for static hosting on Cloudflare Pages), have no practical length limit in modern browsers (Chrome/Firefox handle 80K+ characters; Safari 65K+), and do not trigger page reloads when changed. This is also the pattern documented in Zustand's official guides.

**Key decision: Use lz-string compression, not raw JSON.** A typical bill with 4 people, 8 items produces ~800 bytes of JSON. With `lz-string.compressToEncodedURIComponent()`, this compresses to ~400-500 URL-safe characters in the hash -- well within limits even for large bills (20 people, 50 items). Use short keys in the serialized format to reduce size further.

**Key decision: Use short keys in the compact format.** Mapping `billName` to `n`, `people` to `p`, etc. reduces JSON size by ~30% before compression. The encode/decode functions handle the mapping transparently.

```typescript
// Compact format for URL encoding (short keys save bytes)
interface CompactState {
  n: string;                          // billName
  p: Array<{ i: string; n: string }>; // people (id, name)
  t: Array<{                          // items
    i: string; d: string; c: number;  // id, description, priceInCents
    m: 'S' | 'A'; a: string[];       // splitMode, assignedTo
  }>;
  s: { tp: number; tx: number };      // settings (tipPercent, taxPercent)
  o: Record<string, number>;          // tipOverrides
}
```

**Key decision: Do NOT use Zustand persist middleware for URL sharing.** The persist middleware is designed for continuous sync (every state change updates storage). This would cause constant hash updates during editing, pollute browser back/forward history, and run compression on every keystroke. Instead, use a one-shot encode-on-share / decode-on-load pattern.

### 2. localStorage Bill History

**Auto-save flow (on meaningful state changes):**
```
useBillStore.subscribe() -> debounce(2000ms) -> check minimum content -> extract data + metadata -> save to localStorage
```

**Restore flow (user picks from history):**
```
HistoryDrawer reads localStorage -> user selects bill -> useBillStore.setState(savedBill) -> HistoryDrawer closes
```

**Storage schema:**
```typescript
// src/utils/billHistory.ts
interface SavedBill {
  id: string;              // crypto.randomUUID()
  savedAt: number;         // Date.now() timestamp
  billName: string;        // from store, or "Untitled" fallback
  peopleCount: number;     // for display in list without full deserialization
  grandTotalCents: number; // for display in list without full deserialization
  state: ShareableState;   // the full restorable state
}
```

**Key decision: Use Zustand `subscribe()` with debounce, not persist middleware.** The persist middleware saves a single entry, overwriting on every change. The history feature needs *multiple* saved snapshots. A manual subscription with debounce gives control over when entries are created (save after 2 seconds of inactivity, only when bill has content).

**Key decision: Store display metadata separately from full state.** The history list UI needs `billName`, `peopleCount`, `grandTotalCents`, and `savedAt` for rendering without parsing the full state blob. These are top-level fields on `SavedBill`, computed at save time.

**Key decision: Cap at 20 entries, FIFO eviction.** A single bill state is ~1-2KB of JSON. 20 entries = ~40KB worst case. The 5MB localStorage limit leaves ample headroom. When a 21st entry would be added, evict the oldest.

**Key decision: Deduplicate by content hash.** To avoid saving 20 copies of the same bill after the user leaves the tab open, compute a simple hash of the state and skip saving if the most recent entry has the same hash.

### 3. Venmo Deep Links

**Generation flow:**
```
PersonResult.totalInCents -> convert to dollars -> build Venmo URL -> render as <a href>
```

**Venmo URL format (MEDIUM confidence -- see sources):**
```
https://venmo.com/?txn=charge&amount={dollars}&note={encodedNote}
```

Where:
- `txn=charge` means "request money" (the person tapping the link is requesting payment)
- `amount` is a decimal number without `$` sign (e.g., `12.50`)
- `note` is URL-encoded text (e.g., `Split%20bill%20-%20Sarah%27s%20share`)

**Key decision: Use the generic Venmo URL without a recipient username.** The app does not collect Venmo usernames. The URL `https://venmo.com/?txn=charge&amount=12.50&note=...` opens the Venmo app on mobile and prompts the user to select a recipient. This avoids requiring Venmo handles for every person at the table -- a significant UX burden for a secondary feature.

**Key decision: Open in new tab with `target="_blank" rel="noopener noreferrer"`.** Preserves the bill state in the original tab. The user may need to come back and tap Venmo for multiple people.

**Where the button lives:** Inside `PersonResultCard`, below the total in the expanded breakdown view. The button is contextual to each person's result -- it only makes sense after the user sees the itemized amount.

```typescript
// src/utils/venmoLink.ts -- pure function, fully testable
export function buildVenmoLink(
  totalCents: number,
  personName: string,
  billName?: string
): string {
  const dollars = (totalCents / 100).toFixed(2);
  const note = billName
    ? `${billName} - ${personName}'s share`
    : `Bill split - ${personName}'s share`;
  return `https://venmo.com/?txn=charge&amount=${dollars}&note=${encodeURIComponent(note)}`;
}
```

---

## Patterns to Follow

### Pattern 1: One-Shot State Serialization (URL Sharing)

**What:** Encode the full Zustand data state to a compressed URL hash on explicit user action; decode and hydrate on page load if hash is present.

**When:** User taps "Share" button or opens a shared URL.

**Why not continuous sync:** Continuous hash updates during editing would (a) create browser history entries on some browsers, breaking the back button; (b) run compression on every keystroke; (c) make the URL constantly change during editing, confusing users.

**Implementation shape:**
```typescript
// src/utils/urlState.ts
import LZString from 'lz-string';

export function encodeState(state: ShareableState): string {
  const compact = toCompact(state); // map to short keys
  const json = JSON.stringify(compact);
  return LZString.compressToEncodedURIComponent(json);
}

export function decodeState(hash: string): ShareableState | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(hash);
    if (!json) return null;
    const compact = JSON.parse(json);
    return validateAndExpand(compact); // validate types + map back to full keys
  } catch {
    return null;
  }
}
```

**Critical: Validation on decode.** Never trust URL input. Validate every field type and range after parsing. Return `null` on any schema mismatch rather than throwing. Malformed URLs should silently fall back to empty state.

### Pattern 2: Debounced Subscription for Auto-Save (History)

**What:** Subscribe to Zustand store changes; debounce 2 seconds; save snapshot to localStorage with metadata.

**When:** After 2 seconds of no state changes, if the bill has at least one person and one item.

**Why debounce:** Without debounce, every keystroke in a price field triggers a save. A 2-second debounce means saves happen during natural pauses, not during active typing.

```typescript
// src/utils/billHistory.ts
const DEBOUNCE_MS = 2000;
const MAX_HISTORY = 20;
const STORAGE_KEY = 'bill-history';

export function initAutoSave(store: typeof useBillStore) {
  let timer: ReturnType<typeof setTimeout>;

  return store.subscribe((state) => {
    clearTimeout(timer);
    if (state.people.length === 0 && state.items.length === 0) return;

    timer = setTimeout(() => {
      const saveable = extractSaveable(state);
      saveToHistory(saveable);
    }, DEBOUNCE_MS);
  });
}
```

### Pattern 3: Pure Function Link Builder (Venmo)

**What:** A pure function that takes cents, person name, and bill name, returns a URL string. No side effects, no hooks, fully testable.

**When:** Called during render of each PersonResultCard.

**Why pure:** The Venmo URL is derived data. Making it a pure function means it can be unit tested with simple assertions, no component rendering required.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Zustand Persist Middleware for URL Hash

**What:** Using `persist({ storage: createJSONStorage(() => hashStorage) })` to continuously sync store state to the URL hash.

**Why bad:** Every state mutation updates the hash, which (a) creates a new browser history entry on some browsers, breaking the back button; (b) runs compression on every keystroke during price editing; (c) makes the URL constantly flicker during editing. The Zustand docs show this pattern for demonstration -- it is not appropriate for a production share-by-URL feature where the user explicitly chooses to share.

**Instead:** Use one-shot encode on explicit "Share" action, one-shot decode on page load.

### Anti-Pattern 2: Deserializing All History Entries for List Display

**What:** Parsing all 20 saved bill states to render the history drawer.

**Why bad:** Parsing 20 bills of JSON on every render of the history drawer is wasteful. The list only needs name, date, people count, and total.

**Instead:** Store metadata (`billName`, `savedAt`, `peopleCount`, `grandTotalCents`) as top-level fields on each `SavedBill` entry. Only deserialize the full `state` when the user actually restores a bill.

### Anti-Pattern 3: Collecting Venmo Usernames Per Person

**What:** Adding a "Venmo username" field to each Person in the store.

**Why bad:** Most users at the table do not know each other's exact Venmo handles. Requiring this adds friction to the core bill-entry flow for a secondary feature. The generic Venmo URL (no recipient) opens the app and lets the sender pick from their contacts -- faster for the common case.

**Instead:** Use `https://venmo.com/?txn=charge&amount=X&note=Y` without a recipient. The Venmo app handles recipient selection.

### Anti-Pattern 4: Modifying the Calculation Engine for New Features

**What:** Adding URL encoding, history saving, or Venmo link generation inside `calculateResults` or `useDraftCalculation`.

**Why bad:** These are I/O and side-effect concerns. The engine is a pure function; the hook manages ephemeral draft state. Mixing serialization or external links into either violates the separation that makes the v1.0 architecture clean and testable.

**Instead:** All new features operate on the *output* of the existing architecture (reading committed store state or `PersonResult` data). They never inject into the calculation pipeline.

### Anti-Pattern 5: Using Zustand Persist for localStorage History

**What:** Wrapping the bill store with `persist({ name: 'bill-history' })` middleware.

**Why bad:** Persist middleware maintains a single persisted copy of the store. The history feature needs *multiple* independent snapshots. Persist would overwrite the previous bill every time the user starts a new one.

**Instead:** Manual `subscribe()` + debounce + append to a `SavedBill[]` array in localStorage.

---

## Store Changes

The only store modification is adding two fields and two actions:

```typescript
// Additions to BillState interface in billStore.ts
interface BillState {
  // ... all existing fields unchanged ...
  billName: string;                         // NEW -- defaults to ''
  setBillName: (name: string) => void;      // NEW
  resetBill: () => void;                    // NEW -- clears all state for new bill / restore
}
```

`resetBill` is needed for two flows: (1) restoring a bill from history, which should cleanly replace all state; (2) starting a new bill from the header. Implementation: call `set()` with the full initial state object.

The `AppState` type in `types/models.ts` should also gain `billName: string` to keep it aligned with the serializable slice.

---

## Hydration Sequence (App Startup)

On app load, this sequence determines initial state:

```
1. App mounts
2. Check location.hash
   - If hash present and valid:
     a. Decode compressed state
     b. Validate schema
     c. Call useBillStore.setState(decoded)
     d. Clear location.hash (clean URL after hydration)
     e. Skip to step 4
   - If hash present but invalid: log warning, continue to step 3
   - If no hash: continue to step 3
3. Initialize with empty state (current default behavior)
4. Start auto-save subscription (billHistory.initAutoSave)
```

**Critical: URL state takes priority over auto-save.** When someone opens a shared link, they expect to see the shared bill, not a stale auto-saved bill. The auto-save subscription must not fire during the initial hydration from URL (delay subscription start until after the useEffect completes).

This logic lives in `App.tsx` as a `useEffect` with an empty dependency array, running once on mount:

```typescript
useEffect(() => {
  const hash = location.hash.slice(1);
  if (hash) {
    const decoded = decodeState(hash);
    if (decoded) {
      useBillStore.setState(decoded);
      history.replaceState(null, '', location.pathname);
    }
  }
  const unsub = initAutoSave(useBillStore);
  return unsub;
}, []);
```

---

## Suggested Build Order

The features have this dependency chain:

```
billName (store change) --> URL Sharing (uses billName in encoded state)
                        --> History (uses billName for list display)
                        --> Venmo Links (uses billName in payment note)
```

### Phase A: Store Extension + Bill Name UI
1. Add `billName`, `setBillName`, `resetBill` to `billStore.ts`
2. Add `billName: string` to `AppState` type in `types/models.ts`
3. Add bill name input field in `App.tsx` header
4. Unit test store changes

**Rationale:** All subsequent features depend on the `billName` field existing. This is the smallest possible change and unblocks everything else.

### Phase B: URL State Sharing
1. Install `lz-string` dependency
2. Create `src/utils/urlState.ts` (encode/decode with lz-string, compact key mapping, schema validation)
3. Add URL hydration logic in `App.tsx` useEffect (on mount)
4. Create `ShareButton` component (encode + clipboard copy + toast feedback)
5. Unit test encode/decode roundtrip with edge cases (empty bill, max-size bill, malformed input)
6. Integration test: share URL, open in new tab, verify state matches

**Rationale:** URL sharing is the highest-value feature (enables the core "share the split with everyone" use case). It establishes the `setState` replacement pattern that history restore also uses.

### Phase C: localStorage History
1. Create `src/utils/billHistory.ts` (save/load/delete/list, FIFO eviction, content deduplication)
2. Create `src/components/HistoryDrawer.tsx` (list UI with restore/delete actions)
3. Wire auto-save subscription in `App.tsx` useEffect
4. Add history toggle button to App header
5. Test: create bill, reload page, find in history, restore, verify state

**Rationale:** More complex than sharing (list management, eviction, drawer UI) but lower priority for the stated v1.1 goal. Depends on `resetBill` from Phase A and reuses the `setState` pattern from Phase B.

### Phase D: Venmo Deep Links
1. Create `src/utils/venmoLink.ts` (pure function: cents + name + billName -> URL)
2. Create `src/components/VenmoButton.tsx` (styled anchor tag)
3. Add VenmoButton to `PersonResultCard` expanded view
4. Unit test URL generation with edge cases (special characters in names, zero amount, very large amounts)
5. Manual test on iOS and Android: tap button, verify Venmo app opens with correct amount and note

**Rationale:** Fully independent of sharing and history. Placed last because it is the simplest feature (one pure function + one presentational component) and can be built in parallel with Phase C if desired.

---

## New Dependencies

| Package | Version | Purpose | Size Impact |
|---------|---------|---------|-------------|
| `lz-string` | ^1.5.0 | URL state compression via `compressToEncodedURIComponent` | ~4KB gzipped, zero transitive dependencies |

No other new dependencies. History uses `localStorage` API directly. Venmo generates plain URLs. No routing library needed.

---

## Scalability Considerations

| Concern | Typical bill (4 people, 8 items) | Large bill (20 people, 50 items) | Extreme (50 people, 100 items) |
|---------|----------------------------------|----------------------------------|-------------------------------|
| URL hash size (compressed) | ~400 chars | ~2,000 chars | ~5,000 chars (safe in all browsers) |
| localStorage per bill | ~1KB | ~5KB | ~12KB |
| History storage (20 bills) | ~20KB | ~100KB | ~240KB (well under 5MB limit) |
| Encode/decode time | <1ms | <5ms | <15ms |

No scalability concern for any realistic bill splitting scenario.

---

## Sources

### Primary (HIGH confidence)
- [Zustand official guide: Connect to state with URL hash](https://zustand.docs.pmnd.rs/guides/connect-to-state-with-url-hash) -- hashStorage pattern, createJSONStorage API, StateStorage interface
- [Zustand persist middleware reference](https://zustand.docs.pmnd.rs/reference/middlewares/persist) -- persist API, partialize, version, migrate options
- [lz-string documentation](https://pieroxy.net/blog/pages/lz-string/index.html) -- compressToEncodedURIComponent API and compression characteristics
- [lz-string npm package](https://www.npmjs.com/package/lz-string) -- version, size, zero dependencies

### Secondary (MEDIUM confidence)
- [Venmo deep linking - Alex Beals](https://blog.alexbeals.com/posts/venmo-deeplinking) -- Venmo URL format with txn, amount, note, recipients parameters
- [Venmo deep linking - Gabe O'Leary](https://gabeoleary.com/posts/venmo-deeplinking-including-from-web-apps) -- Web-based Venmo link behavior, mobile vs web differences
- [URL fragment length limits](https://www.codegenes.net/blog/maximum-length-of-url-fragments-hash/) -- Browser hash length limits (Chrome 80K+, Firefox 80K+, Safari 65K+)
- [Browser URL length limits](https://www.geeksforgeeks.org/computer-networks/maximum-length-of-a-url-in-different-browsers/) -- Cross-browser URL max lengths

### Needs Validation (LOW confidence)
- Venmo deep link behavior on Android -- sources primarily document iOS; verify on Android during Phase D testing
- Venmo URL without recipient in path -- verify that `https://venmo.com/?txn=charge&amount=X&note=Y` correctly opens the Venmo app and prompts for recipient selection on both platforms

---
*Research completed: 2026-03-18*
