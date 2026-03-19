# Phase 5: Bill Identity & URL Sharing - Research

**Researched:** 2026-03-19
**Domain:** URL state serialization, compression, clipboard API, Zustand store extension
**Confidence:** HIGH

## Summary

Phase 5 adds two features to the existing React/Zustand bill splitter: an optional bill name (click-to-edit in the header) and a Share button that encodes the full bill state into a compressed URL hash. The bill name is a trivial Zustand store addition following established click-to-edit patterns. URL sharing requires a new dependency (lz-string 1.5.0), a serialization layer with compact keys and schema versioning, clipboard API integration with a fallback modal, and a one-shot hydration flow on app mount.

The existing architecture research (ARCHITECTURE.md) and pitfalls research (PITFALLS.md) already cover this domain thoroughly. This phase-specific research verifies those findings against the actual codebase, confirms library versions, and produces actionable guidance scoped to BILL-01, SHARE-01, and SHARE-02 only. History (Phase 6) and Venmo (Phase 7) are out of scope.

**Primary recommendation:** Install lz-string, create `src/utils/urlState.ts` with encode/decode using `compressToEncodedURIComponent`, add `billName` to the store and AppState type, and wire a one-shot URL hydration in App.tsx useEffect on mount. Use URL hash (not query params) for the encoded payload.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Bill name: click-to-edit in header, placeholder "Tap to name this bill" below "Split the Bill" h1, commit on blur/Enter, trim whitespace, no character limit
- Share button placement: two entry points -- header icon (top-right, always visible) + full button at top of Results section
- Share feedback: toast "Link copied!" auto-dismiss ~2s; fallback modal with selectable text area when Clipboard API unavailable
- URL encoding: one-shot encode on Share tap (NOT Zustand persist middleware)
- URL is a snapshot at time of Share tap; does not update during editing
- Loading from URL: check URL params on app load, decode and hydrate store one-shot
- Malformed URL: silent fallback to empty bill, no error message
- After loading: URL stays in address bar unchanged (no history.replaceState cleanup)
- No "loaded from shared link" indicator; bill behaves identically to manually-created bill
- User can edit freely after loading from shared URL

### Claude's Discretion
- Exact compression/encoding format (base64url + lz-string, or URL-safe variant)
- UUID handling in encoded state (keep original or remap -- either fine if bill renders correctly)
- Toast component design and animation
- Modal design for clipboard fallback
- Exact positioning and styling of Share icon in header

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BILL-01 | User can optionally name the bill (displayed in history and shared URLs) | Store extension pattern (add `billName: string` + `setBillName` action); click-to-edit pattern already established in PersonRow/ItemRow; AppState type needs `billName` added |
| SHARE-01 | User can generate and copy a shareable URL encoding the full bill state | lz-string `compressToEncodedURIComponent` for URL-safe compression; compact key mapping for size reduction; Clipboard API with fallback; toast notification pattern |
| SHARE-02 | User can open a shared URL and have the full bill state loaded automatically | One-shot URL hash decode on mount via useEffect; schema validation on decode; silent fallback to empty state on failure |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| lz-string | 1.5.0 | URL state compression via `compressToEncodedURIComponent` / `decompressFromEncodedURIComponent` | Zero dependencies, 4KB gzipped, produces URL-safe output without manual base64 encoding, widely used for client-side state-in-URL patterns |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | 5.0.12 | State management -- add `billName` field and `setBillName` action | Store extension for bill name |
| react | 19.2.4 | UI -- click-to-edit component, toast, share button | All new UI components |
| vitest | 4.1.0 | Testing -- encode/decode round-trip tests | Validation of serialization |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| lz-string | pako (zlib) | pako is larger (~25KB) and requires manual base64url encoding; lz-string's `compressToEncodedURIComponent` is purpose-built for URLs |
| lz-string | No compression (raw JSON + base64url) | A 4-person, 8-item bill produces ~800 bytes JSON; base64 inflates by 33% to ~1,060 chars. lz-string compresses to ~400-500 chars. For larger bills, compression is essential to stay under SMS/sharing limits |

**Installation:**
```bash
npm install lz-string@1.5.0
```

**Note:** lz-string 1.5.0 includes TypeScript type declarations (ships its own `index.d.ts`). No separate `@types/lz-string` needed.

**Registry note:** STATE.md flags that npm registry may be blocked by Cloudflare. If install fails, use `--registry https://registry.yarnpkg.com`.

## Architecture Patterns

### Recommended Project Structure (new/modified files only)
```
src/
  store/
    billStore.ts          # MODIFY: add billName, setBillName
  types/
    models.ts             # MODIFY: add billName to AppState
  utils/
    urlState.ts           # NEW: encodeState(), decodeState()
  components/
    ShareButton.tsx       # NEW: encode + clipboard + toast
    Toast.tsx             # NEW: generic toast notification
    ShareFallbackModal.tsx # NEW: modal with selectable URL text
  App.tsx                 # MODIFY: header bill name, share icon, URL hydration on mount
  components/
    ResultsPanel.tsx      # MODIFY: add "Share this split" button at top
```

### Pattern 1: One-Shot URL State Serialization
**What:** Encode full bill state to compressed URL hash on explicit user action; decode and hydrate on page load.
**When to use:** User taps Share button (encode) or opens a shared URL (decode).
**Why:** Avoids the documented anti-pattern of continuous URL sync via Zustand persist middleware (causes hash flickering, breaks back button, runs compression on every keystroke).

```typescript
// src/utils/urlState.ts
import LZString from 'lz-string';

const SCHEMA_VERSION = 1;

interface CompactState {
  v: number;                          // schema version
  n: string;                          // billName
  p: Array<{ i: string; n: string }>; // people (id, name)
  t: Array<{                          // items
    i: string; d: string; c: number;  // id, description, priceInCents
    m: 'S' | 'A'; a: string[];       // splitMode, assignedTo
  }>;
  s: { tp: number; tx: number };      // settings (tipPercent, taxPercent)
  o: Record<string, number>;          // tipOverrides
}

export function encodeState(state: ShareableState): string {
  const compact = toCompact(state);
  const json = JSON.stringify(compact);
  return LZString.compressToEncodedURIComponent(json);
}

export function decodeState(hash: string): ShareableState | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(hash);
    if (!json) return null;
    const compact = JSON.parse(json);
    if (compact.v !== SCHEMA_VERSION) return null; // future: add migration
    return fromCompact(compact);
  } catch {
    return null;
  }
}
```

### Pattern 2: URL Hydration on Mount
**What:** Check `location.hash` once on mount; if valid encoded state, hydrate store; otherwise proceed with empty state.
**When to use:** App.tsx useEffect with empty dependency array.

```typescript
// In App.tsx
useEffect(() => {
  const hash = location.hash.slice(1);
  if (hash) {
    const decoded = decodeState(hash);
    if (decoded) {
      useBillStore.setState(decoded);
      // Per user decision: URL stays in address bar unchanged
    }
  }
}, []);
```

### Pattern 3: Click-to-Edit (Reuse Existing)
**What:** Local `useState` for edit mode, controlled input, commit on blur/Enter, trim on commit.
**When to use:** Bill name in header -- follows exact same pattern as PersonRow name editing and ItemRow description editing.
**Key detail:** Empty string after trim = unnamed bill (reverts to placeholder state).

### Pattern 4: Clipboard API with Fallback
**What:** Use `navigator.clipboard.writeText()` wrapped in try/catch; on failure, show a modal with the URL in a selectable textarea.
**When to use:** Share button action.

```typescript
async function handleShare() {
  const state = extractShareableState(useBillStore.getState());
  const encoded = encodeState(state);
  const url = `${location.origin}${location.pathname}#${encoded}`;

  try {
    await navigator.clipboard.writeText(url);
    showToast('Link copied!');
  } catch {
    showFallbackModal(url);
  }
}
```

### Anti-Patterns to Avoid
- **Zustand persist middleware for URL sharing:** Causes URL flickering on every keystroke, pollutes browser history. Use one-shot encode instead.
- **Converting integer cents to dollars in serialization:** Floating-point round-trip corruption. Always serialize `priceInCents` as integers.
- **No schema version in URL format:** Breaks all shared URLs on any state shape change. Include `v: 1` from the start.
- **Reactive URL hash reading:** Parsing hash on every render wastes CPU. Read once on mount.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL-safe compression | Custom base64url + zlib/deflate pipeline | `lz-string.compressToEncodedURIComponent()` | Produces URL-safe output directly; handles encoding edge cases; 4KB gzipped |
| UUID generation | Math.random-based IDs | `crypto.randomUUID()` (already used) | Cryptographically random, browser-native, no dependency |
| Clipboard access | Manual `document.execCommand('copy')` | `navigator.clipboard.writeText()` + fallback modal | execCommand is deprecated; Clipboard API is the standard |

**Key insight:** lz-string's `compressToEncodedURIComponent` / `decompressFromEncodedURIComponent` pair eliminates the need to manually handle base64url encoding, padding, or URL-unsafe characters. The output is directly usable in URL hash fragments.

## Common Pitfalls

### Pitfall 1: URL Length Exceeds Sharing Platform Limits
**What goes wrong:** Browser supports 80K+ char URLs, but SMS truncates at ~160 chars and messaging apps cut around 2,000 chars.
**Why it happens:** Testing in browser address bars, never via actual text messages.
**How to avoid:** Use compact keys (30% size reduction), lz-string compression (50%+ reduction), and short positional indices instead of full UUIDs in the compact format. Test with a realistic 6-person, 12-item bill and verify URL is under 2,000 chars.
**Warning signs:** URL grows visibly long with just a few test items.

### Pitfall 2: No Schema Version Breaks Future URLs
**What goes wrong:** App v1.2 changes state shape; URLs shared from v1.1 silently produce broken state.
**Why it happens:** URLs live forever in text message history unlike localStorage.
**How to avoid:** Include `v: 1` (schema version) as the first field of the compact format. On decode, check version and return null for unknown versions (future: add migration).
**Warning signs:** No version field in serialization; `JSON.parse()` without validation.

### Pitfall 3: Integer Cents Corrupted in Serialization
**What goes wrong:** Developer converts cents to dollars for "readability" in URL; `12.99 * 100 = 1298.9999...` breaks the engine's invariant.
**Why it happens:** Temptation to make URLs human-readable.
**How to avoid:** Serialize `priceInCents` as integer directly. Add round-trip invariant test: `decodeState(encodeState(state))` must produce byte-identical state. Validate `Number.isInteger()` on deserialized prices.
**Warning signs:** Any `/ 100` or `* 100` in serialization code.

### Pitfall 4: Clipboard API Fails on HTTP or Older Browsers
**What goes wrong:** `navigator.clipboard.writeText()` throws or is undefined on non-HTTPS origins or older browsers.
**Why it happens:** Clipboard API requires secure context (HTTPS or localhost).
**How to avoid:** Always wrap in try/catch. On failure, show the fallback modal with a selectable textarea containing the URL. During local dev (localhost), clipboard works fine.
**Warning signs:** No error handling around clipboard call; no fallback UI.

### Pitfall 5: Shared URL Replaces In-Progress Bill Without Warning
**What goes wrong:** User has a bill in progress, opens a shared link, loses their work.
**Why it happens:** URL hydration unconditionally overwrites store state.
**How to avoid:** Per CONTEXT.md decision, the URL loads silently (no confirmation modal). This is acceptable because the app is single-use-per-meal and the user intentionally navigated to the shared URL. However, this is a known tradeoff.
**Warning signs:** N/A -- this is an accepted behavior per user decisions.

## Code Examples

### Store Extension (billName)
```typescript
// Add to BillState interface in billStore.ts
billName: string;
setBillName: (name: string) => void;

// Add to create() initial state
billName: '',
setBillName: (name) => set({ billName: name }),
```

### AppState Type Extension
```typescript
// Add to AppState in types/models.ts
export interface AppState {
  billName: string;  // NEW
  people: Person[];
  items: Item[];
  settings: BillSettings;
  tipOverrides: Record<string, number>;
}
```

### Compact Key Mapping (encode direction)
```typescript
function toCompact(state: ShareableState): CompactState {
  return {
    v: SCHEMA_VERSION,
    n: state.billName,
    p: state.people.map(p => ({ i: p.id, n: p.name })),
    t: state.items.map(item => ({
      i: item.id,
      d: item.description,
      c: item.priceInCents,
      m: item.splitMode === 'shared' ? 'S' : 'A',
      a: item.assignedTo,
    })),
    s: { tp: state.settings.defaultTipPercent, tx: state.settings.defaultTaxPercent },
    o: state.tipOverrides,
  };
}
```

### Compact Key Mapping (decode direction)
```typescript
function fromCompact(c: CompactState): ShareableState {
  return {
    billName: c.n ?? '',
    people: c.p.map(p => ({ id: p.i, name: p.n })),
    items: c.t.map(item => ({
      id: item.i,
      description: item.d,
      priceInCents: item.c,
      splitMode: item.m === 'S' ? 'shared' : 'assigned',
      assignedTo: item.a,
    })),
    settings: { defaultTipPercent: c.s.tp, defaultTaxPercent: c.s.tx },
    tipOverrides: c.o,
  };
}
```

### Share Button Handler
```typescript
async function handleShare() {
  const { billName, people, items, settings, tipOverrides } = useBillStore.getState();
  const encoded = encodeState({ billName, people, items, settings, tipOverrides });
  const url = `${window.location.origin}${window.location.pathname}#${encoded}`;

  try {
    await navigator.clipboard.writeText(url);
    // Show toast: "Link copied!" for ~2s
  } catch {
    // Show fallback modal with URL in selectable textarea
  }
}
```

### URL Hydration on Mount
```typescript
// App.tsx useEffect
useEffect(() => {
  const hash = window.location.hash.slice(1);
  if (!hash) return;
  const decoded = decodeState(hash);
  if (!decoded) return;
  useBillStore.setState(decoded);
  // URL stays unchanged per user decision
}, []);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `document.execCommand('copy')` | `navigator.clipboard.writeText()` | Deprecated since ~2020 | Must use Clipboard API with fallback for older browsers |
| Standard Base64 (`btoa/atob`) for URL encoding | lz-string `compressToEncodedURIComponent` | lz-string has been stable since 2014 | Produces URL-safe output directly; no manual base64url conversion needed |
| Zustand persist to URL hash | One-shot encode/decode | Documented anti-pattern in Zustand community | Continuous sync causes flickering and back-button pollution |

**Deprecated/outdated:**
- `document.execCommand('copy')`: Deprecated, unreliable across browsers. Use Clipboard API.
- Standard `btoa()`/`atob()`: Not URL-safe (contains `+`, `/`, `=`). lz-string handles this internally.

## Open Questions

1. **UUID handling in encoded state**
   - What we know: Current store uses `crypto.randomUUID()` for person/item IDs. UUIDs are 36 chars each. Keeping them in the URL adds significant size.
   - What's unclear: Whether remapping to short indices (0, 1, 2...) on encode and back to new UUIDs on decode would break any references (e.g., `tipOverrides` keys reference person IDs, `assignedTo` arrays reference person IDs).
   - Recommendation: Keep original UUIDs in the encoded state. The compact key mapping + lz-string compression already keeps URLs short enough. Remapping adds complexity and the risk of broken cross-references. If URL size becomes an issue with very large bills, revisit.

2. **Maximum URL length safety threshold**
   - What we know: Chrome/Firefox support 80K+ chars in hash; Safari supports 65K+. SMS truncates at ~160 chars (but users share via messaging apps, not raw SMS). WhatsApp/iMessage handle ~2,000-4,000 chars.
   - What's unclear: Exact cutoff for all sharing surfaces.
   - Recommendation: Test with a 6-person, 12-item bill as the benchmark. If the encoded URL exceeds 2,000 chars, consider stripping UUIDs. Do NOT add a hard limit that blocks sharing -- instead, let it work and accept that very large bills may have URLs truncated by some platforms.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BILL-01 | Store `billName` field + `setBillName` action | unit | `npx vitest run src/store/__tests__/billStore.test.ts -x` | Exists (needs new tests added) |
| BILL-01 | Bill name renders in header, click-to-edit works | integration | `npx vitest run src/components/__tests__/BillName.test.tsx -x` | Wave 0 |
| SHARE-01 | `encodeState` produces valid compressed string | unit | `npx vitest run src/utils/__tests__/urlState.test.ts -x` | Wave 0 |
| SHARE-01 | Round-trip: `decodeState(encodeState(state))` equals original | unit | `npx vitest run src/utils/__tests__/urlState.test.ts -x` | Wave 0 |
| SHARE-01 | Integer cents preserved through round-trip (no float corruption) | unit | `npx vitest run src/utils/__tests__/urlState.test.ts -x` | Wave 0 |
| SHARE-01 | ShareButton copies URL to clipboard and shows toast | integration | `npx vitest run src/components/__tests__/ShareButton.test.tsx -x` | Wave 0 |
| SHARE-02 | `decodeState` returns null for malformed input | unit | `npx vitest run src/utils/__tests__/urlState.test.ts -x` | Wave 0 |
| SHARE-02 | App hydrates store from URL hash on mount | integration | `npx vitest run src/components/__tests__/App.test.tsx -x` | Wave 0 |
| SHARE-02 | Malformed URL hash falls back to empty bill | integration | `npx vitest run src/components/__tests__/App.test.tsx -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/utils/__tests__/urlState.test.ts` -- covers SHARE-01, SHARE-02 encode/decode
- [ ] `src/components/__tests__/ShareButton.test.tsx` -- covers SHARE-01 clipboard + toast
- [ ] `src/components/__tests__/App.test.tsx` -- covers SHARE-02 URL hydration on mount
- [ ] `src/components/__tests__/BillName.test.tsx` -- covers BILL-01 click-to-edit UI

## Sources

### Primary (HIGH confidence)
- lz-string npm registry -- version 1.5.0 confirmed current, includes TypeScript types
- Existing codebase -- `billStore.ts`, `models.ts`, `App.tsx`, `ResultsPanel.tsx` read directly
- ARCHITECTURE.md -- URL encoding flow, compact key format, hydration sequence
- PITFALLS.md -- URL length limits, schema versioning, integer cents corruption, clipboard fallback

### Secondary (MEDIUM confidence)
- lz-string `compressToEncodedURIComponent` API -- documented on pieroxy.net and npm page; produces URL-safe output using URI-component-safe character set
- Browser URL hash length limits -- Chrome/Firefox 80K+, Safari 65K+ (from multiple web sources)

### Tertiary (LOW confidence)
- Exact SMS/messaging app URL length truncation thresholds -- varies by platform and carrier; 2,000 chars used as conservative estimate

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- lz-string is stable (1.5.0, zero deps), verified on npm registry
- Architecture: HIGH -- patterns documented in ARCHITECTURE.md and verified against actual codebase; one-shot encode/decode is well-established
- Pitfalls: HIGH -- comprehensive coverage in PITFALLS.md; integer cents, URL length, schema versioning all identified with prevention strategies

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable domain, no fast-moving dependencies)
