# Feature Research

**Domain:** Bill-splitting app -- sharing, history, and payment features (v1.1 milestone)
**Researched:** 2026-03-18
**Confidence:** HIGH

> **Context:** v1.0 is shipped (2,801 LOC). All core splitting features are built and working:
> people management, item assignment, per-person tip overrides, proportional tax,
> expandable itemized results, live recalculation, dark mode, mobile UX.
> This research covers only the v1.1 milestone: URL sharing, localStorage history,
> Venmo deep links, and optional bill name.

---

## Feature Landscape

### Table Stakes (Users Expect These)

For a "share your split and request payment" feature set, these are baseline. Missing any of these makes the sharing flow feel broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Copy-shareable URL with full bill state | The whole point of sharing. Recipient must see the exact same bill. Every link-sharing feature in competing apps works with one tap. | MEDIUM | Serialize `AppState` (people, items, settings, tipOverrides) to JSON, compress with lz-string, encode as URL-safe hash fragment. Hash fragments never leave the client, preserving no-backend constraint. Depends on: existing `AppState` type in `src/types/models.ts`. |
| Shared URL opens with full edit capability | Users expect to tweak the bill after opening (fix a typo, adjust tip). Read-only links frustrate. PROJECT.md explicitly requires "open a shared URL and edit the bill." | LOW | On mount, detect hash fragment, decompress, hydrate Zustand store via a new `loadState` action. Same app, same edit UX -- no separate "view mode" needed. Depends on: `useBillStore` in `src/store/billStore.ts`. |
| One-tap copy to clipboard with confirmation | Users share via text message at the table. `navigator.clipboard.writeText()` is universal. Must show brief visual feedback (toast or checkmark). | LOW | Avoid native share-sheet complexity. Clipboard copy works on all target platforms (mobile Safari, Chrome). Simple "Copied!" toast that auto-dismisses. No new dependencies. |
| Auto-save current bill to localStorage | Users accidentally close tabs, refresh, or switch apps on mobile. Losing a bill mid-entry is infuriating. Every form-heavy web app auto-saves. | LOW | Subscribe to Zustand store changes, debounce writes (500ms). Save current working bill as a single namespaced localStorage key. Restore on mount only if no URL hash is present (URL takes priority). Depends on: Zustand store subscription API. |
| History list of recent bills | Users split bills weekly. Being able to pull up "last Friday's dinner" is expected once any persistence exists. Without it, auto-save feels like a hidden feature. | MEDIUM | Store array of `HistoryEntry` objects: `{id, name, date, totalCents, peopleCount, snapshot}`. Cap at 20 entries (well within 5MB localStorage limit). Display as a simple list with name/date/total. Depends on: auto-save mechanism, optional bill name for display labels. |
| Restore a past bill from history | Viewing history without restore is pointless. Tap-to-restore is baseline. | LOW | Hydrate Zustand store from saved snapshot. Show confirm dialog if current bill has data (prevent accidental overwrite). Depends on: history list, `loadState` store action. |
| Optional bill name/title | Without a name, history entries are indistinguishable ("3/18 bill" vs "3/17 bill"). Also helps recipients identify what a shared URL is for. | LOW | Single text input field at the top of the app. Defaults to empty string. Used in: history list display label, shared URL header, Venmo note context, browser tab title. Falls back to date string if unnamed. Depends on: nothing (add `billName: string` to store). |
| Per-person Venmo "Request $X" deep link | The natural next step after "here is what you owe" is "pay me." Venmo is the dominant P2P payment app in the US for restaurant splits among friends. | MEDIUM | Web format: `https://venmo.com/{requesterUsername}?txn=charge&amount=X.XX&note=Y`. Requires the requesting user to configure their Venmo username once (persisted in localStorage). Amount from `PersonResult.totalInCents` converted to dollars. Depends on: Venmo username config, calculated results from v1.0 engine. |

### Differentiators (Competitive Advantage)

The v1.0 app already differentiates on fairness (proportional tax, per-person tip, integer-cent arithmetic, no account required). These v1.1 features compound that advantage by completing the "bill arrives to everyone has paid" workflow.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Self-contained compressed URL (no backend, no account) | Most bill-splitting apps (Splitwise, Tab, Plates) require accounts and backends for sharing. A URL that encodes the entire bill and works via text message is rare and eliminates all friction. No install, no sign-up, no server. | MEDIUM | lz-string `compressToEncodedURIComponent()` achieves 40-60% compression on JSON. A realistic bill (6 people, 12 items, tip overrides) serializes to ~1.5KB JSON. With ID shortening (replace UUIDs with integers) and compression, this becomes ~600-900 chars in the URL -- well under the safe 2000-char sharing limit. Must test worst-case (10+ people, 20+ items). |
| Pre-filled Venmo note with bill context | Competing apps just link to Venmo profiles. Pre-filling the note with "Dinner at Mario's - your share" helps both payer and requester track the transaction later. | LOW | URL-encode the note. Keep under ~50 chars (Venmo truncates long notes in some views). Include bill name if set, fall back to "Bill split" if unnamed. |
| Version-stamped URL format | Prefix encoded data with a version byte (`v1:...`). Future schema changes (new fields, renamed fields) can be handled gracefully without breaking old shared URLs. | LOW | Trivial to implement, prevents a rewrite-level pitfall later. Decode checks version, applies migration if needed. |
| Smart session-based history dedup | Naive auto-save creates near-duplicate entries on every keystroke (debounced). Using a session ID to update-in-place within a single session avoids cluttering the history list. | LOW | Generate session ID on fresh page load. Same session overwrites the same history entry. New page load = new session = new entry. |
| Delete individual history entries | Users accumulate old bills over weeks. Swipe-to-delete or a delete icon per entry keeps the list manageable. | LOW | Remove from localStorage array by ID, re-render. Standard pattern. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time collaborative editing | "Everyone should edit on their own phone simultaneously" | Requires WebSocket backend or CRDT library, breaks the no-server constraint, introduces merge conflicts. Massive complexity for a 2-minute workflow where one person enters the bill. | One person enters the bill, shares URL. Recipient can edit their own copy independently. No sync needed. |
| QR code for sharing | "Scan to open" feels premium | QR codes encoding long URLs become dense and hard to scan. Adds a QR library dependency (~50KB+). At the table, everyone is already in a group text -- pasting a link is faster than scanning. | Copy-to-clipboard. If QR is ever added later, use a URL shortener first (separate concern). |
| Export to PDF/image | "I want a receipt printout" | Adds html2canvas or jsPDF dependency (100KB+). The shared URL already serves as a permanent record. Very rare use case. | The shared URL is the receipt. Browser print (Cmd+P) works for the rare user who needs paper. |
| Multiple payment apps (Cash App, Zelle, PayPal) | "Not everyone uses Venmo" | Each app has different deep link formats, some undocumented or unreliable. Zelle has no deep link at all. Multiplies both UI complexity (per-person app picker) and maintenance burden. | Start with Venmo only (dominant in US restaurant splitting demographic). The username config could generalize to a payment-app selector in v2 if demand materializes. |
| Cloud sync / user accounts | "I want history on all my devices" | Requires backend, authentication, database. Transforms the architecture from a static site to a full-stack app. Violates the core no-server constraint. | localStorage is per-device. The shareable URL is the cross-device transfer mechanism -- open a URL on any device to access that bill. |
| URL shortener integration | "The URL is long" | Adds external API dependency (bit.ly), requires API keys, introduces latency and a single point of failure. Some shorteners strip URL fragments entirely. | Keep URLs short via compression and ID shortening. 600-900 chars works fine in iMessage/SMS (which handle long URLs gracefully with link previews). Monitor real-world lengths and revisit only if proven problematic. |
| Venmo in-app payment (Braintree SDK) | "Complete payment without leaving the app" | Requires Braintree merchant account, backend for payment processing, PCI compliance considerations. Enormous scope increase for marginal UX improvement over a deep link. | Deep link opens Venmo app directly. User completes payment there. Two taps total. |

---

## Feature Dependencies

```
[Optional Bill Name]
    |
    +--enhances--> [URL Sharing] (name shown in shared bill header)
    +--enhances--> [History List] (name used as display label)
    +--enhances--> [Venmo Note] (name included in payment note)

[URL Sharing (encode/decode in hash fragment)]
    +--depends on--> existing AppState types (v1.0)
    +--depends on--> new loadState action on Zustand store

[localStorage Auto-Save]
    +--soft-dep--> [Optional Bill Name] (unnamed bills get date-based labels)
    +--enables--> [History List]

[History List]
    +--requires--> [localStorage Auto-Save] (entries populated by auto-save)
    +--enables--> [Restore Past Bill]

[Restore Past Bill]
    +--requires--> [History List] (UI to browse and select)
    +--requires--> loadState action (same as URL sharing)

[Venmo Username Config]
    +--persisted in--> localStorage (entered once, reused across sessions)

[Venmo Deep Links]
    +--requires--> [Venmo Username Config] (requester's username in URL path)
    +--requires--> PersonResult.totalInCents (v1.0 engine output)
    +--enhanced by--> [Optional Bill Name] (included in payment note)
```

### Dependency Notes

- **URL Sharing and History are independent.** URL encodes state in the link; history stores state in localStorage. They share a `loadState` store action but do not depend on each other. Can be built in parallel.
- **History requires auto-save.** The history list is populated by the auto-save mechanism. Build auto-save first, then the history browsing UI.
- **Venmo deep links require a username config.** The user must enter their Venmo username once. Persist in localStorage (user-level config, not per-bill state). Without it, Venmo buttons cannot render -- show a "Set up Venmo" prompt instead.
- **Bill Name enhances everything but blocks nothing.** It improves history labels, shared URL context, and Venmo notes. If absent, fall back to date strings. Build it first because it is trivial and makes all downstream features better.
- **`loadState` store action is shared infrastructure.** Both URL hydration and history restore need to replace the entire Zustand store state. Build this action once, use it for both features.

---

## MVP Definition

### Launch With (v1.1 -- all items in milestone scope)

- [x] Optional bill name -- trivial, improves every downstream feature
- [x] URL sharing (encode + decode + copy button) -- core milestone deliverable
- [x] localStorage auto-save of current bill -- prevents data loss
- [x] History list with restore -- makes the app feel like a tool you return to
- [x] Venmo username config (persisted in localStorage) -- prerequisite for payment links
- [x] Per-person Venmo "Request $X" deep link -- completes the bill-to-payment workflow

### Add After Validation (v1.x)

- [ ] Pre-filled Venmo note with bill context -- low effort, add if users find bare notes confusing
- [ ] Delete individual history entries -- add when history list feels cluttered (likely after a few weeks of use)
- [ ] "Request All" batch Venmo summary view -- add if users request from 5+ people per bill regularly

### Future Consideration (v2+)

- [ ] Cash App deep links -- if user feedback shows significant non-Venmo usage
- [ ] QR code sharing -- if URL length proves problematic in practice
- [ ] Cloud sync / accounts -- only if strong demand for cross-device history

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Depends On |
|---------|------------|---------------------|----------|------------|
| Optional bill name | MEDIUM | LOW | P1 | Nothing |
| `loadState` store action | HIGH (infra) | LOW | P1 | Nothing |
| URL encode/decode state | HIGH | MEDIUM | P1 | `loadState` action |
| Copy link button + toast | HIGH | LOW | P1 | URL encoding |
| localStorage auto-save | HIGH | LOW | P1 | Nothing |
| History list UI | MEDIUM | MEDIUM | P1 | Auto-save |
| Restore past bill | MEDIUM | LOW | P1 | History list, `loadState` |
| Venmo username config | MEDIUM | LOW | P1 | Nothing |
| Per-person Venmo deep link | HIGH | MEDIUM | P1 | Username config, v1.0 results |
| Version-stamped URL format | LOW (insurance) | LOW | P1 | URL encoding |
| Session-based history dedup | MEDIUM | LOW | P2 | Auto-save |
| Pre-filled Venmo note | MEDIUM | LOW | P2 | Bill name, Venmo links |
| Delete history entries | LOW | LOW | P2 | History list |

---

## Competitor Feature Analysis

| Feature | Splitwise | Tab | Plates | Our Approach (v1.1) |
|---------|-----------|-----|--------|---------------------|
| Sharing mechanism | Account-based, invite by email/phone | Join code within app | Account-based groups | Self-contained URL, no account needed |
| Login required | Yes | Yes | Yes | No -- zero friction |
| Payment integration | Venmo/PayPal in-app (Braintree) | Venmo in-app | Venmo/PayPal in-app | Venmo deep link (opens Venmo app directly) |
| Bill history | Cloud-synced (requires account) | In-app (requires account) | Cloud-synced | localStorage per-device, URL as cross-device transfer |
| Proportional tax/tip | Splitwise Pro only ($) | Yes | Limited | Yes, built into v1.0 engine (free) |
| Offline capable | No (requires server) | Partial | No | Yes -- fully client-side, works without network |
| Bill naming | Yes (group names) | Yes | Yes (group names) | Yes (optional text field) |
| Install required | App store download | App store download | App store download | No -- open URL in any browser |

**Key competitive advantage:** No account, no install, no backend. One person enters the bill, copies a URL, pastes in group chat. Everyone sees their share instantly. Venmo link lets them pay in two taps. The entire flow from "check arrives" to "everyone has paid" happens in under 5 minutes with zero friction. No competitor matches this simplicity.

---

## Implementation Notes for Downstream Phases

### URL State Encoding Strategy

The serialization target is the `AppState` interface from `src/types/models.ts`:
```
{ people: Person[], items: Item[], settings: BillSettings, tipOverrides: Record<string, number> }
```

Plus the new `billName: string` field.

Key implementation decisions:

1. **Strip UUIDs for compression.** Replace `crypto.randomUUID()` IDs with short integers (0, 1, 2...) in the serialized form. Map `assignedTo` arrays and `tipOverrides` keys to these short IDs. This alone cuts JSON size by ~60%.
2. **Use lz-string `compressToEncodedURIComponent`.** Produces URL-safe output without additional encoding. ~13KB gzipped bundle addition (acceptable for the value).
3. **Store in hash fragment (`#data=...`).** Fragments are never sent to the server, preserving privacy and working correctly on static hosts like Cloudflare Pages. No server-side URL parsing issues.
4. **Version the format.** Prefix with `v1:` so future schema changes can be migrated gracefully. Decoding checks the version prefix and applies transforms if needed.
5. **Handle malformed URLs gracefully.** Wrap decompression and JSON parsing in try/catch. Corrupted URLs show the empty app with an error toast -- never crash.
6. **URL takes priority over auto-save on mount.** If both a hash fragment and a localStorage auto-save exist, the hash fragment wins (user explicitly opened a shared link).

### localStorage Key Schema

```
"expense-splitter:current"      -> serialized AppState (auto-save, overwritten on changes)
"expense-splitter:history"      -> JSON array of HistoryEntry[] (capped at 20)
"expense-splitter:session-id"   -> string (generated on fresh load, used for dedup)
"expense-splitter:venmo-user"   -> string (requester's Venmo username)
```

Namespace all keys with `expense-splitter:` to avoid collisions on shared origins.

### Venmo Deep Link Format (MEDIUM confidence -- undocumented API)

```
https://venmo.com/{requesterUsername}?txn=charge&amount={dollars.cents}&note={urlEncodedNote}
```

- `txn=charge` opens the "Request" flow (the recipient sees a payment request)
- `amount` is decimal dollars without `$` sign (e.g., `12.50`)
- `note` is URL-encoded (e.g., `Dinner%20at%20Mario's%20-%20your%20share`)
- On mobile: opens the Venmo app directly (if installed) or Venmo mobile web
- On desktop: opens Venmo website but cannot complete the transaction (Venmo requires mobile for P2P)
- The requester's username appears in the URL path -- without it, the link cannot be constructed

**Confidence caveat:** These deep links are undocumented by Venmo and community-maintained. They have been stable for 5+ years based on multiple independent sources (Alex Beals blog, Gabe O'Leary blog, numerous GitHub projects). However, Venmo could change or remove them without notice. The official Venmo developer page (venmo.com/developers) focuses on merchant integrations, not person-to-person deep links.

---

## Sources

- [Venmo Deeplinking - Alex Beals](https://blog.alexbeals.com/posts/venmo-deeplinking) -- most comprehensive reference for Venmo URL format
- [Venmo Deeplinking from Web - Gabe O'Leary](https://gabeoleary.com/posts/venmo-deeplinking-including-from-web-apps) -- confirms web-to-app behavior
- [Venmo Payment Links (Official)](https://venmo.com/paymentlinks/) -- official developer page
- [lz-string on npm](https://www.npmjs.com/package/lz-string) -- compression library for URL state
- [lz-string documentation](https://pieroxy.net/blog/pages/lz-string/index.html) -- performance and API reference
- [URL Fragment Length Limits](https://www.codegenes.net/blog/maximum-length-of-url-fragments-hash/) -- browser hash fragment limits
- [URL Length Limits by Browser](https://www.codegenes.net/blog/what-is-the-maximum-length-of-a-url-in-different-browsers/) -- practical URL length guidelines
- [Persisting App State in URLs - DEV Community](https://dev.to/prabhu66/persisting-and-sharing-your-applications-state-local-url-and-beyond-4527) -- URL state patterns
- [Store App State in URL - Hacker News](https://news.ycombinator.com/item?id=34312546) -- community discussion on URL state approaches
- [Best Bill Splitting Apps 2026 - splitty](https://splittyapp.com/learn/best-bill-splitting-apps/) -- competitor comparison
- [Splitwise Alternatives 2026 - PartyTab](https://partytab.app/blog/best-splitwise-alternatives) -- competitor landscape
- [localStorage Best Practices - RxDB](https://rxdb.info/articles/localstorage.html) -- localStorage patterns and limitations
- Existing codebase: `src/types/models.ts`, `src/store/billStore.ts` -- current AppState shape and store API

---
*Feature research for: Expense Splitter v1.1 Sharing and Payments*
*Researched: 2026-03-18*
