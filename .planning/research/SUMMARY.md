# Research Summary: Expense Splitter v1.1 -- Sharing & Payments

**Domain:** URL state sharing, localStorage history, Venmo deep links for existing bill splitter
**Researched:** 2026-03-18
**Overall confidence:** HIGH

## Executive Summary

The v1.1 features (URL sharing, localStorage history, Venmo deep links, bill name) integrate cleanly into the existing Zustand 5 + React 19 architecture without modifying the calculation engine, the `useDraftCalculation` hook, or any existing component contracts. Each new feature operates at the boundary of the existing system: reading committed store state for serialization, writing full state snapshots for hydration, or deriving Venmo URLs from `PersonResult` output.

The only store modification is adding a `billName` field, a `setBillName` action, and a `resetBill` action to the existing `useBillStore`. All three new feature subsystems (URL encoding, history, Venmo) are independent of each other and communicate with the store through well-defined read/write boundaries. The single new dependency is `lz-string` (~4KB gzipped) for URL-safe state compression.

The key architectural decision is to NOT use Zustand's persist middleware for URL sharing. The persist middleware is designed for continuous sync (every mutation updates storage), which would cause constant hash updates, pollute browser history, and run compression on every keystroke. Instead, URL sharing uses a one-shot encode-on-share / decode-on-load pattern. For localStorage history, a separate manual subscription with debounce provides the multi-snapshot behavior needed (persist middleware only maintains a single entry).

Venmo deep links are the simplest feature: a pure function that converts `PersonResult.totalInCents` to a Venmo URL with pre-filled amount and note. No Venmo SDK or username collection is needed -- the generic URL format opens the Venmo app and lets the user select a recipient from their contacts.

## Key Findings

**Stack:** One new dependency (`lz-string@^1.5.0`). Everything else uses existing Zustand APIs, browser localStorage, and URL hash.

**Architecture:** Three independent subsystems (URL sharing, history, Venmo) that all read from the same Zustand store but do not depend on each other. No engine changes. No existing component contract changes.

**Critical pitfall:** Using Zustand persist middleware for URL hash sync -- it would break browser navigation and create constant URL flickering during editing. Use one-shot encode/decode instead.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Phase A: Store Extension + Bill Name** - Add `billName`, `setBillName`, `resetBill` to store; add name input to App header
   - Addresses: Bill identification for history and sharing
   - Avoids: Downstream features blocking on missing store field
   - Estimated scope: Small (1 file modified, 1 component updated)

2. **Phase B: URL State Sharing** - Create `urlState.ts` encoder/decoder with lz-string; add hydration on mount; add ShareButton
   - Addresses: Core milestone deliverable (shareable URLs)
   - Avoids: Persist middleware anti-pattern; establishes setState replacement pattern reused by history
   - Estimated scope: Medium (1 new utility, 1 new component, App.tsx modified)

3. **Phase C: localStorage History** - Create `billHistory.ts` with debounced auto-save; create HistoryDrawer; wire subscription
   - Addresses: Bill persistence and restoration
   - Avoids: Single-entry persist overwrite; excessive save frequency
   - Estimated scope: Medium (1 new utility, 1 new component, App.tsx modified)

4. **Phase D: Venmo Deep Links** - Create `venmoLink.ts` pure function; create VenmoButton; add to PersonResultCard
   - Addresses: Payment request workflow
   - Avoids: Venmo username collection burden; SDK complexity
   - Estimated scope: Small (1 new utility, 1 new component, PersonResultCard modified)

**Phase ordering rationale:**
- Bill name first because it is trivial and all other features use it for display context
- URL sharing before history because it is higher value and establishes the `setState` hydration pattern
- History after sharing because it reuses the same state replacement mechanism
- Venmo last because it is independent and simplest -- can also be built in parallel with Phase C

**Research flags for phases:**
- Phase B: Validate lz-string compression ratio on realistic bill data during implementation. Verify `history.replaceState` hash clearing works on iOS Safari.
- Phase D: Validate Venmo deep link behavior on Android (sources primarily document iOS). Verify generic URL format (no recipient username) opens Venmo app correctly.
- All other phases: Standard patterns, no additional research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | lz-string is well-documented (npm, official docs). Zustand persist/subscribe APIs verified via official docs. |
| Features | HIGH | Feature set is defined in PROJECT.md. All features are standard web patterns (URL hash, localStorage, anchor links). |
| Architecture | HIGH | Integration points verified against actual codebase. No engine or hook changes needed. Store changes are minimal. |
| Pitfalls | HIGH | Persist middleware anti-pattern well-documented. URL hash behavior well-understood. |
| Venmo deep links | MEDIUM | URL format documented by community sources (not official Venmo API). Stable for 5+ years but could change. |

## Gaps to Address

- **Venmo URL without recipient path segment:** The architecture recommends `https://venmo.com/?txn=charge&amount=X&note=Y` (no username). Some sources show `https://venmo.com/{username}?txn=charge...` as the standard format. Verify during Phase D which format works correctly on both iOS and Android.
- **iOS Safari hash behavior:** Verify that `history.replaceState(null, '', location.pathname)` correctly clears the hash on iOS Safari without triggering a page reload. If it doesn't, keep the hash but accept the cosmetic issue.
- **lz-string bundle size:** Documented as ~4KB gzipped. Verify with actual bundle analysis after installation -- tree-shaking should include only `compressToEncodedURIComponent` and `decompressFromEncodedURIComponent`.

---

## Sources

### Primary (HIGH confidence)
- [Zustand: Connect to state with URL hash](https://zustand.docs.pmnd.rs/guides/connect-to-state-with-url-hash)
- [Zustand persist middleware reference](https://zustand.docs.pmnd.rs/reference/middlewares/persist)
- [lz-string npm](https://www.npmjs.com/package/lz-string)
- [lz-string documentation](https://pieroxy.net/blog/pages/lz-string/index.html)
- [URL fragment length limits](https://www.codegenes.net/blog/maximum-length-of-url-fragments-hash/)

### Secondary (MEDIUM confidence)
- [Venmo deep linking - Alex Beals](https://blog.alexbeals.com/posts/venmo-deeplinking)
- [Venmo deep linking - Gabe O'Leary](https://gabeoleary.com/posts/venmo-deeplinking-including-from-web-apps)
- [Browser URL length limits](https://www.geeksforgeeks.org/computer-networks/maximum-length-of-a-url-in-different-browsers/)

---
*Research completed: 2026-03-18*
*Ready for roadmap: yes*
