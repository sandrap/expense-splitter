# Phase 7: Venmo Payments - Research

**Researched:** 2026-03-19
**Domain:** Venmo deep linking from web apps, mobile browser URL scheme handling
**Confidence:** HIGH

## Summary

Phase 7 adds a "Pay with Venmo" button to each person's result card. The implementation is straightforward: construct a URL pointing to `https://venmo.com/` with query parameters for transaction type, amount, and note, then render it as an `<a>` tag. On mobile devices with Venmo installed, the OS intercepts the HTTPS link and opens the native app. On desktop or without Venmo, the browser navigates to venmo.com (though Venmo no longer allows initiating transactions from their website -- the user would need the app).

The technical surface area is small: one utility function (`buildVenmoUrl`), one presentational component (`VenmoButton`), and a minor modification to `PersonResultCard`. No new dependencies required. The existing project stack (React 19, Tailwind 4, Zustand 5, Vitest 4) handles everything needed.

**Primary recommendation:** Use `https://venmo.com/?txn=charge&note={encodedNote}&amount={amount}` format (no username in path). Extract `buildVenmoUrl` as a pure utility function for easy unit testing.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Button appears always visible below the total amount on the collapsed card -- not gated behind expanding the breakdown
- Full-width button spanning the card width, below the dollar amount
- Label: "Pay with Venmo"
- Hidden entirely (not disabled, not greyed out) when `result.totalInCents === 0`
- Note pre-fills with the bill name (from Zustand state, set in Phase 5)
- Fallback when bill has no name: "Split bill"
- No person name in the note -- bill name only
- Use `venmo://paycharge?txn=charge&recipients=&amount=X&note=Y` as the primary deep link (NOTE: research recommends `https://venmo.com/` web URL instead -- see Architecture Patterns)
- Web fallback: `https://venmo.com/...` for devices without the Venmo app
- Render as `<a>` tag with `href`
- Opens in a new tab (`target="_blank"`, `rel="noopener noreferrer"`)
- Amount: `result.totalInCents / 100` formatted as decimal dollars (e.g., `42.50`)

### Claude's Discretion
- Exact Venmo URL format details (venmo:// vs universal link vs web URL construction -- research the current working format)
- Button visual styling within the established Tailwind palette (blue accent consistent with existing app buttons is fine)
- Whether to extract a `buildVenmoUrl` utility function or inline the logic

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PAY-01 | Each person's result card shows a Venmo deep link button to request their share | Venmo web URL format verified; `buildVenmoUrl` utility + `VenmoButton` component pattern documented; integration point in `PersonResultCard` identified |
| PAY-02 | Venmo button is hidden when a person owes $0.00 | Conditional render pattern: `if (totalInCents === 0) return null` -- no DOM output, no empty space |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.4 | UI rendering | Already installed, project foundation |
| Tailwind CSS | 4.2.2 | Styling | Already installed, project convention |
| Zustand | 5.0.12 | State (billName access) | Already installed, used throughout |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 4.1.0 | Testing | Unit tests for `buildVenmoUrl`, component tests for `VenmoButton` |
| @testing-library/react | 16.3.2 | Component testing | Render tests for conditional visibility |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Web URL (`https://venmo.com/`) | Native scheme (`venmo://`) | Native scheme does NOT work from web browsers -- only from native apps. Web URL is correct for this use case. |

**Installation:** No new packages needed. All dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
  utils/
    buildVenmoUrl.ts          # Pure utility function
    __tests__/
      buildVenmoUrl.test.ts   # Unit tests for URL construction
  components/
    VenmoButton.tsx            # Presentational anchor component
    PersonResultCard.tsx       # Modified to include VenmoButton
    __tests__/
      VenmoButton.test.tsx     # Component render tests
```

### Pattern 1: Venmo Web URL Construction
**What:** Use `https://venmo.com/` with query parameters (not `venmo://` scheme)
**When to use:** Always, for web-based Venmo deep links
**Why:** The `venmo://` scheme only works from native apps. From web browsers, `https://venmo.com/` URLs are intercepted by the OS on mobile (universal links / app links) and open the Venmo app directly. On desktop, the URL navigates to venmo.com.

**Verified URL format:**
```
https://venmo.com/?txn=charge&note={encodedNote}&amount={amount}
```

**Parameters:**
- `txn=charge` -- always "charge" (requesting money, not paying)
- `note` -- URL-encoded bill name, fallback "Split bill"
- `amount` -- decimal dollars, e.g. `42.50`
- No `recipients` parameter -- user selects recipient in Venmo app

**Example:**
```typescript
// Source: https://venmo.com/paymentlinks/ + https://goleary.com/posts/venmo-deeplinking-including-from-web-apps
function buildVenmoUrl(amountInCents: number, note: string): string {
  const amount = (amountInCents / 100).toFixed(2);
  const params = new URLSearchParams({
    txn: 'charge',
    note: note || 'Split bill',
    amount,
  });
  return `https://venmo.com/?${params.toString()}`;
}
```

**IMPORTANT NOTE on CONTEXT.md deep link decision:** The CONTEXT.md mentions `venmo://paycharge?txn=charge&...` as the primary deep link. Research confirms this scheme does NOT work from web browsers. The CONTEXT.md also grants Claude's discretion on "Exact Venmo URL format details (venmo:// vs universal link vs web URL construction)." The `https://venmo.com/` web URL is the correct choice for a web app -- it triggers the native app on mobile via universal links and falls back to the website on desktop.

### Pattern 2: Conditional Render for $0 Amounts
**What:** Return `null` from `VenmoButton` when amount is zero
**When to use:** When `totalInCents === 0`
**Example:**
```typescript
if (result.totalInCents === 0) return null;
// ... render button
```

### Pattern 3: Zustand Direct Access (No Prop Drilling)
**What:** Access `billName` directly from Zustand inside the component
**When to use:** When a deeply nested component needs store data
**Example:**
```typescript
const billName = useBillStore((state) => state.billName);
```
This is already the established project pattern (see `ShareButton` component).

### Anti-Patterns to Avoid
- **Using `venmo://` scheme from web:** Does not work in browsers. Use `https://venmo.com/` instead.
- **Using `<button>` with onClick for navigation:** This is a link, not an action. Use `<a>` tag for semantic correctness and accessibility.
- **Prop drilling billName through ResultsPanel -> PersonResultCard:** Access Zustand directly -- cleaner and matches project convention.
- **Using `window.open()` instead of `<a>` tag:** Anchor tags are more accessible, work without JavaScript, and are the established pattern for external links.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL parameter encoding | Manual string concatenation | `URLSearchParams` | Handles encoding edge cases (special chars, spaces, unicode in bill names) |
| Amount formatting | Custom rounding logic | `(cents / 100).toFixed(2)` | Standard JS decimal formatting is sufficient for currency display in URLs |

**Key insight:** This phase is intentionally simple. The Venmo URL is just string construction with `URLSearchParams`. No SDK, no API calls, no OAuth.

## Common Pitfalls

### Pitfall 1: Using venmo:// scheme from web browsers
**What goes wrong:** Link does nothing or shows "cannot open" error on mobile browsers
**Why it happens:** Custom URL schemes (venmo://) are only registered for native-to-native communication. Web browsers cannot resolve them.
**How to avoid:** Use `https://venmo.com/` format which triggers universal links on iOS and app links on Android
**Warning signs:** Testing only on desktop where both formats fail silently

### Pitfall 2: Not URL-encoding the note parameter
**What goes wrong:** Bill names with special characters (& = ? #) break the URL
**Why it happens:** Manual string concatenation doesn't handle reserved URL characters
**How to avoid:** Use `URLSearchParams` which automatically encodes values
**Warning signs:** URLs with `&` in bill name create phantom parameters

### Pitfall 3: Floating-point amount formatting
**What goes wrong:** `4250 / 100` gives `42.5` not `42.50` (missing trailing zero)
**Why it happens:** JavaScript number-to-string drops trailing zeros
**How to avoid:** Always use `.toFixed(2)` for the amount parameter
**Warning signs:** Amounts like `$10.10` appearing as `10.1` in Venmo

### Pitfall 4: Forgetting dark mode variants
**What goes wrong:** Button looks correct in light mode but wrong in dark mode
**Why it happens:** New elements miss `dark:` class variants
**How to avoid:** Follow UI-SPEC color contract exactly: `bg-blue-500 dark:bg-blue-600`, `hover:bg-blue-600 dark:hover:bg-blue-700`
**Warning signs:** Visual inconsistency when toggling system color scheme

### Pitfall 5: Button rendered for $0 amounts
**What goes wrong:** User sees "Pay with Venmo" for someone who owes nothing
**Why it happens:** Missing or incorrect conditional check
**How to avoid:** Guard on `totalInCents === 0` returning null BEFORE any rendering
**Warning signs:** Venmo button visible on cards showing $0.00

## Code Examples

Verified patterns from official sources and project codebase:

### buildVenmoUrl Utility
```typescript
// Source: Venmo payment links documentation + research verification
// File: src/utils/buildVenmoUrl.ts

export function buildVenmoUrl(amountInCents: number, note: string): string {
  const amount = (amountInCents / 100).toFixed(2);
  const params = new URLSearchParams({
    txn: 'charge',
    note: note || 'Split bill',
    amount,
  });
  return `https://venmo.com/?${params.toString()}`;
}
```

### VenmoButton Component
```typescript
// File: src/components/VenmoButton.tsx
// Follows project conventions: 44px tap target, dark mode, blue accent

interface VenmoButtonProps {
  amountInCents: number;
  note: string;
  personName: string;
}

// Renders <a> tag, returns null when amountInCents === 0
// aria-label: "Pay {personName} {formattedAmount} with Venmo"
// Classes: w-full min-h-[44px] flex items-center justify-center gap-2
//          bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700
//          text-white text-sm font-bold rounded-lg
//          active:scale-95 transition-transform
//          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500
// target="_blank" rel="noopener noreferrer"
```

### PersonResultCard Integration Point
```typescript
// In PersonResultCard.tsx, after the name/amount row, before the expandable breakdown:
// 1. Import VenmoButton
// 2. Access billName: const billName = useBillStore((state) => state.billName);
// 3. Render: <VenmoButton amountInCents={result.totalInCents} note={billName} personName={result.name} />
// VenmoButton handles the $0 check internally (returns null)
```

### Inline SVG Venmo Icon
```typescript
// 16x16 Venmo "V" logo, fill="currentColor" for white-on-blue
// Simple inline SVG -- no icon library needed (project convention)
<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  <path d="M19.27 2c.94 1.55 1.37 3.15 1.37 5.17 0 6.44-5.5 14.81-9.97 20.67H3.24L.36 3.3l7.05-.65 1.83 14.68c1.7-2.77 3.8-7.14 3.8-10.13 0-1.92-.33-3.23-.93-4.28L19.27 2z" />
</svg>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `venmo://paycharge` native scheme | `https://venmo.com/` web URLs | Universal links became standard ~2020 | Web apps MUST use HTTPS URLs; native scheme only works app-to-app |
| Venmo web transactions | App-only transactions | ~2023 | Venmo website no longer initiates transactions; links redirect to app install or app open |

**Deprecated/outdated:**
- `venmo://paycharge?...` from web browsers -- never worked from web, only native apps
- Venmo website transaction initiation -- Venmo removed this capability; website links now just redirect to app

## Open Questions

1. **Venmo link behavior without the app on mobile**
   - What we know: On mobile without Venmo installed, the `https://venmo.com/` link opens in the browser and shows the Venmo website (which may prompt app install)
   - What's unclear: Exact behavior varies by OS and browser -- may show app store, may show website, may show nothing useful
   - Recommendation: This is acceptable graceful degradation. No action needed -- the `<a>` tag with `target="_blank"` handles all cases.

2. **URL parameter persistence in Venmo app**
   - What we know: `txn`, `amount`, and `note` parameters are documented and widely used
   - What's unclear: Venmo could change parameter handling at any time (no official API contract)
   - Recommendation: Accept the risk. This is the universally used format. If it breaks, it's a one-line URL format fix.

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
| PAY-01 | buildVenmoUrl constructs correct URL with amount and note | unit | `npx vitest run src/utils/__tests__/buildVenmoUrl.test.ts -x` | No -- Wave 0 |
| PAY-01 | buildVenmoUrl uses "Split bill" fallback for empty note | unit | `npx vitest run src/utils/__tests__/buildVenmoUrl.test.ts -x` | No -- Wave 0 |
| PAY-01 | VenmoButton renders anchor with correct href | unit | `npx vitest run src/components/__tests__/VenmoButton.test.tsx -x` | No -- Wave 0 |
| PAY-01 | VenmoButton has correct aria-label with person name and amount | unit | `npx vitest run src/components/__tests__/VenmoButton.test.tsx -x` | No -- Wave 0 |
| PAY-01 | VenmoButton opens in new tab (target="_blank") | unit | `npx vitest run src/components/__tests__/VenmoButton.test.tsx -x` | No -- Wave 0 |
| PAY-02 | VenmoButton returns null when totalInCents is 0 | unit | `npx vitest run src/components/__tests__/VenmoButton.test.tsx -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/utils/__tests__/buildVenmoUrl.test.ts` -- covers PAY-01 URL construction
- [ ] `src/components/__tests__/VenmoButton.test.tsx` -- covers PAY-01 rendering, PAY-02 conditional hide

## Sources

### Primary (HIGH confidence)
- [Venmo Payment Links (official)](https://venmo.com/paymentlinks/) -- official documentation of URL format and parameters
- [Venmo Deeplinking - Vox Silva](https://blog.alexbeals.com/posts/venmo-deeplinking) -- comprehensive reverse-engineering of venmo:// scheme; confirms native scheme does not work from web
- [Venmo Deeplinking from Web Apps - Gabe O'Leary](https://goleary.com/posts/venmo-deeplinking-including-from-web-apps) -- confirms `https://venmo.com/` format with query params for web apps; documents no-username variant

### Secondary (MEDIUM confidence)
- Project codebase analysis -- `PersonResultCard.tsx`, `billStore.ts`, `ShareButton.test.tsx` patterns verified by direct code inspection

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, entirely existing project stack
- Architecture: HIGH -- pure function + presentational component is trivial; Venmo URL format verified from multiple sources
- Pitfalls: HIGH -- pitfalls are well-documented and straightforward to avoid

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (Venmo URL format is stable; has been unchanged for years)
