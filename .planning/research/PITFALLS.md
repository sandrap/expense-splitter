# Pitfalls Research

**Domain:** URL state encoding, localStorage persistence, and Venmo deep links for a React/Zustand bill-splitting app
**Researched:** 2026-03-18
**Confidence:** HIGH (verified against Zustand docs, Venmo deep link reverse-engineering posts, and browser URL/storage specifications)

**Scope note:** This research covers pitfalls specific to the v1.1 milestone (sharing, persistence, payment links). The v1.0 pitfalls (floating-point arithmetic, rounding distribution, tip/tax order of operations) are already solved in the shipped codebase via integer-cent arithmetic and largest-remainder rounding.

---

## Critical Pitfalls

### Pitfall 1: URL length exceeds sharing platform limits long before browser limits

**What goes wrong:**
A bill with 6 people and 12 items serialized as JSON and Base64-encoded easily exceeds 2,000 characters. While Chrome supports 512K+ character URLs, the real limit is the sharing surface: SMS segments truncate around 160 characters, iMessage and WhatsApp preview parsers cut around 2,000 characters, and URL shorteners like bit.ly cap at 2,048. The URL "works in the browser" but breaks when texted to the table -- which is the entire point of the feature.

**Why it happens:**
Developers test by pasting URLs into browser address bars, never by actually texting a link from one phone to another. The current store uses `crypto.randomUUID()` IDs (36 characters each). With 6 people and 12 items, that alone is 648 characters of UUIDs before any actual data. Naive JSON + Base64 encoding inflates payload size by approximately 33%.

**How to avoid:**
1. Use compact serialization: replace UUIDs with short positional indices (0, 1, 2...) in the serialized format. IDs are only meaningful within a session.
2. Use array-of-arrays with implicit field positions instead of key-value JSON objects.
3. Compress with `pako.deflateRaw()` then Base64URL-encode. This typically achieves 40-50% compression on JSON.
4. Set a hard ceiling (2,000 characters) and show a warning if a bill is too large to share.
5. Test the critical path: encode a 6-person, 12-item bill and verify the URL is under 2,000 characters.

**Warning signs:**
- URL grows visibly long during development with just a few test items
- All testing happens in browser address bars, never via actual SMS or messaging app

**Phase to address:**
URL encoding -- the serialization format must be designed with size constraints from the start. Changing the format after shipping means breaking all previously shared URLs.

---

### Pitfall 2: Shared URL has no schema version, breaking all links on any state shape change

**What goes wrong:**
User A shares a URL encoding v1.1 state. The app later ships v1.2 which adds a `billName` field or changes the `splitMode` enum. User B opens the old URL -- deserialized state is missing fields or has incompatible values. The app crashes, silently produces wrong calculations, or shows a blank screen.

**Why it happens:**
Unlike localStorage (where the app controls the lifecycle), shared URLs live forever in text message history. A URL shared today will be opened weeks or months from now against a newer version of the app. Developers forget that the URL format IS the API contract with all past versions.

**How to avoid:**
1. Include a schema version number as the first byte/field of the encoded payload.
2. Write a `deserialize(payload)` function that checks the version and applies migrations.
3. Fail gracefully: if deserialization fails, show "This bill link is outdated or invalid" with a button to start fresh. Never silently load partial state.
4. Write round-trip tests: encode state with version N, decode with version N+1 migration.

**Warning signs:**
- No version field in the serialization format
- Deserialization uses `JSON.parse()` directly without validation or version checking
- No error boundary around URL state loading

**Phase to address:**
URL encoding -- the version byte must be present in the very first iteration. Adding it later means every existing URL is version-less and requires special-case handling forever.

---

### Pitfall 3: Zustand persist hydration overwrites URL-loaded state (race condition)

**What goes wrong:**
User opens a shared URL. The app deserializes the URL state and loads it into the Zustand store. Then Zustand's persist middleware hydrates from localStorage and overwrites the URL state with the user's own previous bill. The shared bill vanishes, replaced by whatever was in localStorage.

**Why it happens:**
Zustand persist hydration happens after the initial render. If URL state is loaded into the store during initialization, persist's rehydrate step merges or replaces it with localStorage data. The timing is non-deterministic -- sometimes URL state wins, sometimes localStorage wins. This is documented in Zustand's persist middleware docs as a known consideration.

**How to avoid:**
1. Do NOT use Zustand's built-in `persist` middleware for the active bill store. Instead, build a separate history mechanism that explicitly saves/loads snapshots to localStorage as a side effect.
2. If using persist, check for URL state AFTER hydration completes using the `onRehydrateStorage` callback, then override with URL state.
3. Establish a clear priority rule enforced in one place: URL params > localStorage > defaults.

**Warning signs:**
- Opening a shared URL sometimes shows your own previous bill instead of the shared one
- The behavior is intermittent (classic race condition symptom)
- Store initialization code has no explicit priority between URL state and localStorage state

**Phase to address:**
Architecture decision -- must be resolved before implementing either URL sharing or localStorage persistence. This is a design decision about state loading priority, not a bug to fix after the fact.

---

### Pitfall 4: Integer cents corrupted during URL serialization round-trip

**What goes wrong:**
The v1.0 engine guarantees all prices are integer cents (e.g., 1299 for $12.99). During URL serialization, a developer converts to dollars for "readability" (12.99), which introduces floating-point representation. On deserialization, `12.99 * 100` becomes 1298.9999999... which rounds to 1299 or truncates to 1298 depending on the conversion. The largest-remainder rounding invariant (shares sum exactly to item total) breaks.

**Why it happens:**
The temptation to make URLs "human-readable" is strong. The entire v1.0 engine is built on the guarantee that values are always integer cents. One conversion to float and back can silently violate this invariant.

**How to avoid:**
1. Serialize integer cents directly -- never convert to dollars in the serialization layer.
2. Add a round-trip invariant test: `deserialize(serialize(state))` must produce byte-identical state.
3. Validate deserialized prices with `Number.isInteger()` before loading into the store.
4. Grep for `/ 100` and `* 100` in serialization code during code review.

**Warning signs:**
- Any `/ 100` or `* 100` in serialization/deserialization code
- Test bills where totals are off by 1 cent after sharing and reopening
- `typeof price === 'number' && !Number.isInteger(price)` after deserialization

**Phase to address:**
URL encoding -- enforce in the serialization function from day one.

---

### Pitfall 5: Venmo deep links require username that users do not have at the table

**What goes wrong:**
The Venmo deep link format is `https://venmo.com/{username}?txn=charge&amount={X}&note={Y}`. The app needs each person's Venmo username to generate the link. But at a restaurant table, people know each other's names ("Sarah"), not their Venmo handles ("sarah-jones-42"). The feature ships but nobody can use it because there is no practical way to collect Venmo usernames from 6 people.

**Why it happens:**
Developers test with their own Venmo username hardcoded. The UX of collecting usernames at a noisy restaurant table is an unsolved problem that gets deferred until it is too late.

**How to avoid:**
1. Make Venmo username an optional field per person. Show the deep link button only when a username is provided.
2. Support the no-username fallback: `https://venmo.com/?txn=charge&amount={X}&note={Y}` opens Venmo and lets the requester search for the recipient manually. This is the more realistic flow.
3. Pre-fill a useful note (e.g., "Dinner at Luigi's - Sarah's share: $23.47") so even the manual search flow provides context.
4. Do NOT make Venmo username required when adding a person -- it would break the existing fast "add name, assign items" workflow.

**Warning signs:**
- Deep link button appears but only works with hardcoded test usernames
- No fallback path when username is empty

**Phase to address:**
Venmo deep link phase -- design the username collection UX (and the no-username fallback) before building link generation.

---

### Pitfall 6: Venmo deep links fail silently on desktop browsers

**What goes wrong:**
User opens the bill on a laptop, clicks "Request via Venmo," and gets redirected to venmo.com which shows a generic page. Venmo no longer supports initiating transactions from the web -- this only works when the Venmo mobile app intercepts the universal link. The user thinks the feature is broken.

**Why it happens:**
The `https://venmo.com/...?txn=charge` URL works as a universal link on mobile (the Venmo app registers for it) but on desktop it just loads the Venmo website, which cannot process the transaction. There is no official Venmo web API for payment requests without the Braintree SDK.

**How to avoid:**
1. Label the button "Open in Venmo" (not "Send Request") to set expectations.
2. On desktop user agents, either hide the Venmo button entirely or show it disabled with a tooltip: "Works on mobile devices only."
3. Consider making "Copy share link" the primary desktop action, so the recipient opens the link on their phone where Venmo works.

**Warning signs:**
- No user-agent or feature detection around Venmo buttons
- Testing only on mobile or in mobile emulators, never on actual desktop

**Phase to address:**
Venmo deep link phase -- mobile detection is part of the button component, not a separate task.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `JSON.stringify` for URL state (no compression) | Simple to implement | URLs too long for SMS sharing with moderate-size bills | Never -- compression is cheap to add upfront and the URL format is permanent |
| Using Zustand `persist` for both active bill and history | One middleware handles everything | Hydration race with URL state; unclear what gets persisted when | Never -- separate the active bill from history storage |
| Full UUIDs in URL payload | No ID remapping needed | Wastes ~30 chars per entity; easily doubles URL length | Only if you also compress, but short indices are strictly better |
| No schema version in URL format | One less field to worry about | Every format change breaks all previously shared links | Never -- costs 1-2 characters, saves unbounded future pain |
| localStorage save on every Zustand `subscribe` callback | Always up to date | Performance drag during rapid keystroke input; quota thrashing | Only if debounced (500ms minimum). Raw subscribe fires on every keystroke via useDraftCalculation |
| Skipping try/catch on localStorage calls | Cleaner code | App crashes in Safari private mode, when quota is exceeded, or when storage is disabled | Never -- all localStorage access must be wrapped |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Venmo deep links | Using `venmo://` custom scheme which fails silently if app is not installed | Use `https://venmo.com/` universal links which fall back to the website on desktop and open the app on mobile |
| Venmo deep links | Not URL-encoding the `note` parameter | Always `encodeURIComponent()` the note -- restaurant names with `&`, `#`, or `%` break the URL query string |
| Venmo deep links | Sending amount as integer cents (2347) | Venmo expects dollar amounts as decimal strings: `amount=23.47` |
| Venmo deep links | Omitting the `txn` parameter | Without `txn=charge`, Venmo defaults to pay (sending money) instead of requesting. Always specify `txn=charge` |
| localStorage | Calling `setItem()` without try/catch | Always wrap in try/catch. Private browsing, quota exceeded, and disabled storage all throw different errors across browsers |
| localStorage | Assuming availability in all contexts | Safari private browsing throws on `setItem`. Use an `isStorageAvailable()` check at app startup and degrade gracefully |
| URL hash state | Using `window.location.hash` setter to update the URL | This triggers `hashchange` events and potentially re-renders. Use `history.replaceState()` to update the URL silently |
| URL hash state | Using standard Base64 (`btoa`) for URL encoding | Standard Base64 contains `+`, `/`, and `=` which are not URL-safe. Use Base64URL encoding (replace `+` with `-`, `/` with `_`, strip `=` padding) |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Saving to localStorage on every Zustand state change | Jank during rapid typing, dropped keystrokes on low-end phones | Debounce localStorage writes by 500-1000ms. Only save committed state, not draft input state | Noticeable with 5+ items on mid-range Android phones |
| Re-encoding URL hash reactively on state changes | URL bar flickers on every keystroke, unnecessary CPU work | Only generate the URL on explicit user action ("Copy Link" button), never reactively | Immediate on any device |
| Parsing URL state on every render | Double-render on mount, slow initial load | Parse URL state once on app mount, load into store, clear the hash fragment. Never re-read hash on subsequent renders | Immediate if implemented as a reactive effect |
| Serializing the entire store including computed results | Bloated URL payload, redundant data | Only serialize source-of-truth data (people, items, settings, tipOverrides). Recompute results from the calculation engine after deserialization | Adds 30-50% to URL length unnecessarily |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Including Venmo usernames in the shared URL | Leaks personal financial identifiers to anyone with the link -- URLs get forwarded, posted in group chats, indexed by link preview services | Store Venmo usernames only in the local session or localStorage, never in the shared URL payload |
| No input validation on deserialized URL state | Malicious URLs could inject oversized strings or unexpected values into person names/item descriptions that get rendered | Sanitize all string fields on deserialization: strip HTML tags, enforce max length (100 chars), validate numeric fields with `Number.isFinite()` |
| Trusting serialized computed totals without recalculation | A tampered URL could show manipulated per-person amounts | Never serialize computed results (totals, shares). Always recalculate from raw bill data after loading URL state |
| Storing Venmo usernames in localStorage history entries | Another user of the same device/browser sees financial identifiers | Only persist bill data (names, items, amounts) in history. Venmo usernames are session-only |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Auto-loading URL state without confirmation when user has an in-progress bill | Current bill silently replaced; user loses work | Show a confirmation modal: "Load shared bill? Your current bill will be replaced." with Cancel and Load options |
| No visual feedback after copying share URL | User clicks "Copy Link," nothing happens, clicks again repeatedly | Show a brief "Copied!" toast or change the button text to a checkmark for 2 seconds |
| Venmo button opens Venmo but user forgets who they are requesting from | Context is lost when switching apps | Include person name and bill context in the Venmo note: "Dinner at Luigi's - Sarah's share" |
| History list shows only timestamps with no bill context | "Bill from 3/18 6:42 PM" is meaningless | Show bill name (if set), number of people, total amount, and first few person names in the history preview |
| Restoring a history bill replaces current bill without warning | Accidental tap loses in-progress work | Require confirmation before replacing. Consider auto-saving the current bill to history before loading a different one |
| "Share" button available when bill is empty or incomplete | User shares a link to a blank or invalid bill | Disable or hide the share button when there are zero people or zero items |

## "Looks Done But Isn't" Checklist

- [ ] **URL sharing:** Works when pasted in browser, but fails when shared via SMS/iMessage due to URL length -- test by actually texting a link to yourself on a real phone
- [ ] **URL sharing:** Encodes current state, but does not handle the case where the URL is opened when the app already has a bill in progress -- test the "already has data" flow
- [ ] **URL sharing:** Works with ASCII names, but breaks with emoji or non-Latin characters (accented names like "Jose", CJK characters) -- test Unicode round-trip
- [ ] **URL sharing:** Includes a version byte and the deserializer validates it -- test with a manually corrupted or truncated URL
- [ ] **localStorage history:** Saves and loads correctly in normal browsing, but throws in Safari private mode -- test in private/incognito on Safari, Chrome, Firefox
- [ ] **localStorage history:** No handling for localStorage quota exceeded (5MB limit) -- mock `QuotaExceededError` and verify the app continues working
- [ ] **localStorage history:** Old history entries with a different schema version are handled (migrated or discarded gracefully) -- bump the version and test with stale data
- [ ] **Venmo deep link:** Opens Venmo on mobile, but does nothing useful on desktop -- test on an actual laptop browser
- [ ] **Venmo deep link:** Amount is formatted as dollars (23.47), not cents (2347) -- verify the conversion in the link builder
- [ ] **Venmo deep link:** The `note` parameter with special characters (`&`, `#`, `%`, emoji) does not break the URL -- test with "Taco Bell - Mike's 1/2"
- [ ] **URL + localStorage interaction:** Opening a shared URL does not save the shared bill to the opener's history before the user interacts with it -- verify save-to-history trigger timing
- [ ] **URL + localStorage interaction:** URL state takes priority over localStorage hydration -- test opening a shared URL when localStorage has a different bill saved

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| URL format shipped without version byte | MEDIUM | Add version byte to new format. Treat all version-less URLs as "v0" in the deserializer. Maintain v0 migration code indefinitely. |
| Hydration race (localStorage overwrites URL state) | LOW | Add URL-detection check in `onRehydrateStorage` or split into separate stores. No data loss, code restructure only. |
| Integer cents corrupted by float conversion in URLs | HIGH | Already-shared broken URLs cannot be fixed retroactively. Users with saved links see wrong totals. Must fix serialization AND add a warning/migration for old links. |
| localStorage schema change without migration | MEDIUM | Bump version, add `migrate` function. Old history data is lost but new saves work. Users lose history (annoying, not catastrophic). |
| Venmo note truncated by encoding issues | LOW | Fix `encodeURIComponent` usage. No persistent damage -- users just re-tap the button. |
| URL too long for SMS | MEDIUM | Requires changing the serialization format (compression, compact encoding). All previously shared uncompressed URLs still need to be supported. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| URL too long for SMS (Pitfall 1) | URL encoding -- serialization format design | Encode a 6-person, 12-item bill; verify URL under 2,000 chars |
| No schema version (Pitfall 2) | URL encoding -- first implementation | Version byte present in all generated URLs; migration test v0 to v1 |
| Hydration race condition (Pitfall 3) | Architecture -- state loading priority design | Open shared URL with existing localStorage data; URL state wins every time |
| Integer cents corrupted (Pitfall 4) | URL encoding -- serialization function | Round-trip test: `deserialize(serialize(state))` produces identical state |
| Venmo username UX (Pitfall 5) | Venmo deep links -- UI design | Generate Venmo link with no username set; no-username fallback opens Venmo search |
| Venmo fails on desktop (Pitfall 6) | Venmo deep links -- button component | Venmo button on desktop shows mobile-only messaging or is hidden |
| localStorage quota exceeded | localStorage history -- save logic | Mock `QuotaExceededError`; app continues without crashing |
| localStorage unavailable (private browsing) | localStorage history -- initialization | Mock `localStorage` throwing; history feature degrades gracefully |
| Shared URL replaces in-progress bill | URL loading -- UX flow | Load URL when store has existing data; confirmation modal appears |
| Non-ASCII characters in URL payload | URL encoding -- serialization function | Round-trip bill with emoji and accented names; all characters preserved |
| Venmo note with special characters | Venmo deep links -- link builder | Generate link with `&`, `#`, `%` in bill name; URL is valid |

## Sources

- [Venmo Deeplinking - Alex Beals](https://blog.alexbeals.com/posts/venmo-deeplinking) - Reverse-engineered Venmo deep link parameters and behavior
- [Venmo Deeplinking from web - Gabe O'Leary](https://gabeoleary.com/posts/venmo-deeplinking-including-from-web-apps) - Web-to-native deep link behavior and desktop fallback limitations
- [Zustand Persist Middleware - Official Docs](https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data) - Hydration timing, versioning, migration, shallow merge behavior
- [Zustand Persist Migration - DEV Community](https://dev.to/diballesteros/how-to-migrate-zustand-local-storage-store-to-a-new-version-njp) - Practical migration patterns for versioned persist stores
- [Zustand Persist Rehydration Issue - DEV Community](https://dev.to/atsyot/solving-zustand-persisted-store-re-hydtration-merging-state-issue-1abk) - Shallow merge and hydration timing problems
- [URL Length Limits - codegenes.net](https://www.codegenes.net/blog/what-is-the-maximum-length-of-a-url-in-different-browsers/) - Browser URL character limits and practical sharing constraints
- [Storing state in URL with pako - mfyz.com](https://mfyz.com/storing-large-web-app-state-in-url-using-pako/) - Compression approach for URL state encoding
- [localStorage Quota Handling - Matteo Mazzarolo](https://mmazzarolo.com/blog/2022-06-25-local-storage-status/) - Graceful degradation for quota exceeded errors
- [localStorage Errors - TrackJS](https://trackjs.com/javascript-errors/failed-to-execute-setitem-on-storage/) - Cross-browser error handling patterns

---
*Pitfalls research for: URL state encoding, localStorage persistence, and Venmo deep links in a React/Zustand bill-splitting app (v1.1 milestone)*
*Researched: 2026-03-18*
