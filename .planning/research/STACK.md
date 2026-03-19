# Stack Research

**Domain:** URL sharing, localStorage persistence, and Venmo deep links for bill-splitting app
**Researched:** 2026-03-19
**Confidence:** HIGH

## Context

This is a v1.1 milestone research. The existing stack is locked and validated:
- Vite 8 + React 19 + TypeScript + Zustand 5 + Tailwind CSS v4 + Vitest 4
- Client-side only, static hosting (Cloudflare Pages), integer-cent arithmetic engine

This document covers ONLY what is needed for the three new features:
1. URL state encoding (shareable bill links)
2. localStorage history (auto-save and restore past bills)
3. Per-person Venmo deep link buttons

## Recommended Stack Additions

### New Dependencies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| lz-string | 1.5.0 | Compress bill state into URL-safe strings | The only new dependency needed. Synchronous API, tiny (5KB gzipped), ships TypeScript typings since 1.5.0 (`typings/lz-string.d.ts`), has `compressToEncodedURIComponent` which produces URL-safe output without additional encoding. The native CompressionStream API is async-only and requires manual base64+URL-encoding -- overkill for small JSON payloads. lz-string is the de facto standard for client-side URL state compression (40M+ weekly npm downloads). |

### Already Available (no install needed)

| Technology | Source | Purpose | Notes |
|------------|--------|---------|-------|
| Zustand persist middleware | `zustand/middleware` (bundled with zustand 5) | localStorage auto-persistence for history store | Import `persist` and `createJSONStorage` from `zustand/middleware`. No additional package. |
| `window.location.hash` | Browser API | Read/write compressed bill state in URL | No routing library needed. |
| `localStorage` | Browser API | Persist bill history | Accessed through Zustand persist middleware. |
| `URL` / `URLSearchParams` | Browser API | Construct Venmo deep link URLs | Native string construction is sufficient. |
| `encodeURIComponent` | Browser API | URL-encode Venmo note text | Standard encoding for the note parameter. |
| `navigator.clipboard.writeText` | Browser API | Copy share URL to clipboard | Async API, works on HTTPS (which Cloudflare Pages provides). Requires secure context. |

## Installation

```bash
# Single new dependency
npm install lz-string@1.5.0
```

One package. That is the entire installation.

## Feature-by-Feature Stack Decisions

### 1. URL State Encoding

**Approach:** Serialize bill data to JSON, compress with lz-string, store in URL hash fragment.

**Why URL hash (`#`) not query param (`?`):**
- Hash fragments are never sent to the server -- pure client-side, matching the no-backend architecture
- No server-side URL length limits apply (Cloudflare Pages serves the same `index.html` regardless of hash)
- Avoids any interaction with Cloudflare Pages SPA routing or `_redirects` configuration
- Hash changes do not trigger page reloads

**Why lz-string over alternatives:**

| Option | Verdict | Reason |
|--------|---------|--------|
| lz-string `compressToEncodedURIComponent` | **Chosen** | Synchronous, produces URL-safe output directly, typically 40-60% compression on JSON. A 3KB bill compresses to ~1.2-1.8KB URL-safe string -- well within browser URL limits. |
| Raw JSON + base64 in URL | Rejected | A 10-person, 15-item bill JSON is ~3-4KB. Base64 encodes to ~5KB. Works for small bills but fragile at scale and wastes URL space. |
| Native CompressionStream (gzip/deflate) | Rejected | Async-only (returns ReadableStream), requires manual base64 + URL-encoding after decompression. More code for worse DX. Designed for large payloads, not small JSON. |
| json-url | Rejected | Last updated 2020, unmaintained. Internally bundles msgpack and lz-string anyway. |

**State shape to serialize:** Only the data portion of `BillState` -- `people`, `items`, `settings`, `tipOverrides`, plus the new `billName` field. Action functions are excluded (Zustand serialization naturally handles this via `getState()` and picking data keys).

**URL length budget:** Modern mobile browsers (Chrome, Safari, Firefox) handle 8,000+ character URLs. With lz-string compression, a bill with 10 people and 20 items stays well under 2,000 characters. Comfortable margin.

**lz-string API usage:**
```typescript
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

// Encode: state -> URL hash
const compressed = compressToEncodedURIComponent(JSON.stringify(billData));
window.location.hash = compressed;

// Decode: URL hash -> state
const hash = window.location.hash.slice(1);
const billData = JSON.parse(decompressFromEncodedURIComponent(hash));
```

### 2. localStorage History

**Approach:** A separate Zustand store with built-in `persist` middleware for bill history.

**Two stores, not one:**

1. **`useBillStore` (existing)** -- Do NOT add persist middleware here. The current bill is ephemeral and must be loadable from a shared URL. Persisting it would cause stale-state conflicts when a recipient opens a shared link.

2. **`useHistoryStore` (new)** -- Separate Zustand store with `persist` middleware. Maintains an array of saved bill snapshots with metadata (name, date, summary).

**Why not persist the main store:**
- A shared URL must load fresh state from the URL hash, not from the recipient's localStorage
- Separating concerns keeps the main store simple and testable (proven in v1.0)
- History is a distinct feature with its own UI (browse, restore, delete)

**Zustand persist middleware API (already in zustand 5):**
- `name: 'expense-splitter-history'` -- localStorage key
- `storage: createJSONStorage(() => localStorage)` -- explicit default
- `partialize` -- persist only the bills array, not UI state like "which bill is selected"
- `version: 1` -- enables schema migration if bill snapshot format changes later

**localStorage size budget:** 5-10MB per origin (browser-dependent). Each bill snapshot is ~1-3KB JSON. Even 500 saved bills use under 1.5MB. No storage concern.

### 3. Venmo Deep Links

**Approach:** Construct web URLs using the undocumented but widely-used Venmo web deep link format. No library, no SDK.

**URL format:**
```
https://venmo.com/?txn=charge&amount={dollars}&note={encodedNote}
```

**Key details:**
- `txn=charge` means "request money" (vs `txn=pay` which sends money)
- `amount` is a decimal dollar value without `$` sign (e.g., `10.50`)
- `note` must be URL-encoded via `encodeURIComponent`
- Username path segment is intentionally omitted -- the bill splitter does not know Venmo usernames. The person sharing the bill taps the button, Venmo opens pre-filled with amount/note, and the user searches for the person in-app. This matches real-world usage at a table.
- On mobile: Venmo app intercepts the `venmo.com` link and opens with pre-filled amount/note
- On desktop: redirects to Venmo website, but Venmo **no longer allows initiating transactions from the web** -- the user will see a prompt to use the mobile app

**Mobile-only behavior (important caveat):** Venmo web deep links only work end-to-end on mobile where the Venmo app is installed. On desktop or without the app, the link lands on venmo.com but cannot complete the transaction. The UI should communicate this -- e.g., "Opens in Venmo app" label on the button. The amount is always visible in the result card regardless, so desktop users can manually enter it.

**Amount conversion from integer cents:**
```typescript
const amountDollars = (totalInCents / 100).toFixed(2);
```

This conversion happens only at the Venmo URL construction boundary. The engine remains in integer cents.

**Note format:** `"{billName} - {personName}'s share"` -- sensible default, no configuration needed.

**Confidence assessment:** MEDIUM. Venmo deep links are not officially documented by Venmo. They have worked reliably for 5+ years (confirmed by multiple independent sources from 2020-2025), but Venmo could change them at any time. The `venmo.com/?txn=charge` format without username is confirmed working by multiple sources. Treat as a convenience feature -- if Venmo is not installed or the link format changes, the user still sees the dollar amount to enter manually.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| lz-string for URL compression | Raw base64 (no compression) | Only if bills are guaranteed tiny (fewer than 3 people, fewer than 5 items). Not a safe assumption. |
| lz-string for URL compression | Native CompressionStream API | If compressing large payloads (100KB+) where async is acceptable. Not this use case. |
| Separate history store with persist | Persist middleware on main bill store | If the app had user accounts and no URL sharing. Conflicts with URL-based state loading. |
| Venmo web deep links (no SDK) | Braintree/Venmo SDK | If processing actual payments or verifying transaction status. We only generate request links. |
| URL hash fragment (`#`) | URL query parameter (`?`) | If a server needs to see the state (analytics, SSR). We have no server. |
| `navigator.clipboard.writeText` | `document.execCommand('copy')` | Never -- `execCommand('copy')` is deprecated. The Clipboard API is the standard. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| react-router / wouter / any router | Single-view app. URL hash stores state, not routes. A router adds bundle size and complexity for zero benefit. | `window.location.hash` + `hashchange` event listener |
| Braintree / Venmo SDK | Massive payment processing SDK. We construct one URL string. | Template literal: `` `https://venmo.com/?txn=charge&amount=${amount}&note=${encodeURIComponent(note)}` `` |
| idb / localForage / IndexedDB wrappers | Over-engineered for storing small JSON blobs. IndexedDB is for large structured data or binary blobs. | localStorage via Zustand persist middleware |
| use-query-params / nuqs | Query param state sync libraries assume routing. Adds a dependency for something achievable in 10 lines of code. | Direct hash read on mount |
| @types/lz-string | lz-string 1.5.0 ships its own TypeScript type definitions (`typings/lz-string.d.ts`). A separate `@types` package is unnecessary and may conflict. | lz-string (types included) |
| Base64 polyfills | `btoa`/`atob` are available in all target browsers. lz-string handles its own encoding. | lz-string `compressToEncodedURIComponent` |

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| lz-string@1.5.0 | Vite 8, TypeScript 5.x, ESM | Ships ESM and CJS. TypeScript typings included. Tree-shakeable -- only `compressToEncodedURIComponent` and `decompressFromEncodedURIComponent` are used. |
| zustand@5 persist middleware | zustand@5.0.12 (already installed) | Import `persist` and `createJSONStorage` from `zustand/middleware`. No version conflict possible -- same package. |

## Integration Points with Existing Code

| Existing Code | How It Integrates | Change Required |
|---------------|-------------------|-----------------|
| `BillState` in `billStore.ts` | Add `billName?: string` field and `setBillName` action | Small addition to existing interface and store |
| `useBillStore` store | Extract snapshot via `getState()` for serialization; add `loadBill(data)` action to hydrate from URL or history | New action, no changes to existing actions |
| Integer-cent arithmetic engine | Venmo amount uses `(cents / 100).toFixed(2)` at URL construction boundary only | Engine stays in cents, conversion is isolated |
| Tailwind CSS v4 | Share button, copy-to-clipboard feedback, Venmo button styling | No config changes, just new utility classes in new components |
| Vitest 4 | Test round-trip serialization, URL encoding/decoding, history CRUD, Venmo URL construction | No new test tooling needed |

## Sources

- [lz-string npm](https://www.npmjs.com/package/lz-string) -- Version 1.5.0 confirmed via `npm view`, includes `typings/lz-string.d.ts` (HIGH confidence)
- [lz-string GitHub](https://github.com/pieroxy/lz-string) -- Library source, TypeScript rewrite confirmed (HIGH confidence)
- [Zustand persist middleware docs](https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data) -- Official persist API with partialize, version, storage options (HIGH confidence)
- [Venmo Deeplinking - Alex Beals](https://blog.alexbeals.com/posts/venmo-deeplinking) -- Venmo URL format with parameters, confirms no-username variant (MEDIUM confidence -- undocumented API)
- [Venmo Deeplinking - Gabe O'Leary](https://gabeoleary.com/posts/venmo-deeplinking-including-from-web-apps) -- Confirms web deep link format works from mobile web, notes desktop limitation (MEDIUM confidence)
- [CompressionStream MDN](https://developer.mozilla.org/en-US/docs/Web/API/CompressionStream) -- Native compression API, rejected for this use case (HIGH confidence)

---
*Stack research for: Expense Splitter v1.1 -- Sharing and Payments*
*Researched: 2026-03-19*
