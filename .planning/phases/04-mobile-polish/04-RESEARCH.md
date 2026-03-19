# Phase 4: Mobile Polish - Research

**Researched:** 2026-03-18
**Domain:** Mobile UX polish (keyboard handling, touch targets, live recalculation, dark mode, edge cases)
**Confidence:** HIGH

## Summary

Phase 4 is a polish phase with no new features. It addresses five success criteria: keyboard occlusion handling, tap target sizing, instant live recalculation on keystroke, edge case resilience, and dark mode wired to system preference. The codebase is well-structured with clear integration points for each concern.

The most architecturally significant work is the **live recalculation (dual-track draft) system**, which requires a new aggregation layer above `ResultsPanel` to collect draft values from `ItemRow`, `SettingsPanel`, and `PersonResultCard` and merge them before calling `calculateResults()`. All other work (dark mode, tap targets, keyboard scroll, edge cases) is incremental CSS and small behavioral additions.

**Primary recommendation:** Implement a `useDraftCalculation` custom hook (or equivalent context/callback pattern) that aggregates draft overrides from all numeric input components, merges them with store state, and feeds the merged state to `calculateResults()`. Dark mode requires zero configuration -- Tailwind v4 defaults to `prefers-color-scheme` media strategy and all `dark:` classes are already in place. The keyboard occlusion fix is `scrollIntoView({ block: 'center', behavior: 'smooth' })` on focus with CSS `scroll-padding-bottom`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Totals update **on every keystroke** -- not on blur/Enter, not debounced
- **All numeric inputs** get live recalculation: item prices, default tip %, default tax %, per-person tip overrides
- Invalid or blank draft values (empty string, `"."`, `"1."`, `NaN`) are **treated as zero** for live calculation -- results always show a valid number, never a dash or error state
- **Dual-track pattern**: local component state holds draft value and drives live calculation; `blur`/`Enter` commits validated value to Zustand store (no change to persistence semantics)
- **Architecture**: draft values flow up via callback/shared state -- NOT via a store shadow field. ResultsPanel (or a parent above it) receives draft-aware overrides and merges them before calling `calculateResults()`
- Per-person tip draft updates **all cards' totals** -- a tip change for one person affects tax proportion for everyone, so full cross-card live update is required
- Established tap target pattern is `min-h-[44px]` -- apply consistently to all interactive elements
- Dark mode auto-follows system preference via `prefers-color-scheme` -- no manual toggle
- Zero people + zero items: already handled
- People with no items, items with no people: already handled
- All items unassigned: calculation engine already handles (skip-item guard)
- Single person: no special UI needed
- Empty bill (all items at $0): treated as zero, show $0.00 per person

### Claude's Discretion
- Exact scroll-into-view implementation (CSS vs JS approach)
- Touch target wrapper strategy for click-to-edit spans
- Tailwind dark mode configuration (`media` strategy vs `class` strategy)
- Any missing `dark:` classes on components not yet covered

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

## Standard Stack

No new libraries are needed. Phase 4 uses only what is already installed.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.4 | Component framework | Already installed |
| Zustand | 5.0.12 | State management | Already installed |
| Tailwind CSS | 4.2.2 | Styling (including dark mode) | Already installed |
| Vitest | 4.1.0 | Test framework | Already installed |

### Supporting
No additional libraries needed. All work is CSS adjustments, React patterns, and behavioral hooks.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom draft aggregation hook | React Context | Context would cause broader re-renders; callback props + hook is more targeted |
| `scrollIntoView` on focus | `VirtualKeyboard` API | VirtualKeyboard API is not supported on iOS Safari; scrollIntoView is universal |

## Architecture Patterns

### Recommended Project Structure

No new files needed beyond one custom hook. Modifications touch existing components.

```
src/
  hooks/
    useDraftCalculation.ts    # NEW: aggregates drafts, merges with store, calls calculateResults()
  components/
    ResultsPanel.tsx          # MODIFY: use hook instead of direct calculateResults() call
    ItemRow.tsx               # MODIFY: add onDraftPriceChange callback, tap targets, scrollIntoView
    PersonResultCard.tsx      # MODIFY: add onTipDraftChange callback, tap targets, scrollIntoView
    SettingsPanel.tsx         # MODIFY: add onDraftChange callbacks, scrollIntoView
    PersonRow.tsx             # MODIFY: tap targets on click-to-edit name
    AssignmentChips.tsx       # VERIFY: already has min-h/min-w [44px]
    App.tsx                   # MODIFY: host draft state, pass callbacks down (or use context)
  index.css                   # NO CHANGE: Tailwind v4 media dark mode is already default
```

### Pattern 1: Dual-Track Draft Aggregation

**What:** Each numeric input component holds a local `useState` draft string. On every keystroke, it calls a callback prop (e.g., `onDraftPriceChange(itemId, draftString)`) that flows up to a parent-level aggregator. The aggregator parses the draft to cents (treating invalid values as 0), merges with store state, and passes the merged state to `calculateResults()`.

**When to use:** All numeric inputs that feed into results: item prices, tip %, tax %, per-person tip overrides.

**Example:**
```typescript
// useDraftCalculation.ts
import { useMemo, useState, useCallback } from 'react';
import { useBillStore } from '../store/billStore';
import { calculateResults } from '../engine/calculate';
import { parseDollarsToCents } from '../utils/parseDollars';
import type { PersonResult } from '../types/models';

interface DraftOverrides {
  itemPrices: Record<string, string>;      // itemId -> draft string
  tipPercent: string | null;               // custom tip draft
  taxPercent: string | null;               // tax draft
  personTips: Record<string, string>;      // personId -> tip draft string
}

export function useDraftCalculation() {
  const people = useBillStore((s) => s.people);
  const items = useBillStore((s) => s.items);
  const settings = useBillStore((s) => s.settings);
  const tipOverrides = useBillStore((s) => s.tipOverrides);

  const [drafts, setDrafts] = useState<DraftOverrides>({
    itemPrices: {},
    tipPercent: null,
    taxPercent: null,
    personTips: {},
  });

  // Merge drafts into state for calculation
  const results: PersonResult[] = useMemo(() => {
    const mergedItems = items.map((item) => {
      const draft = drafts.itemPrices[item.id];
      if (draft === undefined) return item;
      const parsed = parseDollarsToCents(draft);
      return { ...item, priceInCents: parsed ?? 0 };
    });

    const mergedSettings = { ...settings };
    if (drafts.tipPercent !== null) {
      const val = parseFloat(drafts.tipPercent);
      mergedSettings.defaultTipPercent = isNaN(val) ? 0 : val;
    }
    if (drafts.taxPercent !== null) {
      const val = parseFloat(drafts.taxPercent);
      mergedSettings.defaultTaxPercent = isNaN(val) ? 0 : val;
    }

    const mergedTipOverrides = { ...tipOverrides };
    for (const [personId, draft] of Object.entries(drafts.personTips)) {
      const val = parseFloat(draft);
      mergedTipOverrides[personId] = isNaN(val) ? 0 : val;
    }

    return calculateResults({
      people,
      items: mergedItems,
      settings: mergedSettings,
      tipOverrides: mergedTipOverrides,
    });
  }, [people, items, settings, tipOverrides, drafts]);

  const setItemPriceDraft = useCallback((itemId: string, draft: string) => {
    setDrafts((prev) => ({
      ...prev,
      itemPrices: { ...prev.itemPrices, [itemId]: draft },
    }));
  }, []);

  const clearItemPriceDraft = useCallback((itemId: string) => {
    setDrafts((prev) => {
      const { [itemId]: _, ...rest } = prev.itemPrices;
      return { ...prev, itemPrices: rest };
    });
  }, []);

  // Similar setters for tipPercent, taxPercent, personTips...

  return { results, drafts, setItemPriceDraft, clearItemPriceDraft, /* ... */ };
}
```

### Pattern 2: scrollIntoView on Focus

**What:** On mobile, the virtual keyboard can occlude the focused input. Call `scrollIntoView()` on focus to ensure visibility.

**When to use:** All inputs with `inputMode="decimal"` or `inputMode="text"` -- item prices, tip inputs, tax input, person name edit.

**Example:**
```typescript
const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  // Small delay lets the keyboard animation start before scrolling
  setTimeout(() => {
    e.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, 100);
};

// On the input element:
<input onFocus={handleFocus} inputMode="decimal" ... />
```

**Why the setTimeout:** iOS Safari scrolls the page when the keyboard appears, but the scroll happens asynchronously. A small delay (100ms) ensures `scrollIntoView` fires after the browser's initial adjustment.

### Pattern 3: CSS scroll-padding-bottom for Keyboard Space

**What:** Add `scroll-padding-bottom` to the scroll container so that `scrollIntoView` accounts for keyboard height.

**Example:**
```css
/* In index.css or on the <main> element via Tailwind */
main {
  scroll-padding-bottom: 40vh;
}
```

Or via Tailwind utility: `scroll-pb-[40vh]` on the `<main>` element.

### Anti-Patterns to Avoid
- **Store shadow fields for drafts:** Do NOT add `draftItemPrices` to the Zustand store. Drafts are ephemeral UI state that should live in React state, flowing up via callbacks. Putting them in the store couples UI typing behavior to global state.
- **Debounced recalculation:** The decision is explicit -- every keystroke triggers recalculation. Do not debounce. The calculation engine is O(people * items) with integer math, which is instant for any realistic restaurant bill.
- **Effect-based draft sync:** Do NOT use `useEffect` to sync drafts to a calculation. Use `useMemo` -- the calculation derives directly from drafts + store state, re-running whenever either changes. Effects add unnecessary render cycles.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dark mode detection | Custom `matchMedia` listener + state toggle | Tailwind v4 default `media` strategy | Tailwind v4 uses `prefers-color-scheme` by default with zero config. All `dark:` classes already exist in every component. |
| Keyboard height detection | Custom `visualViewport` resize observer | `scrollIntoView({ block: 'center' })` + `scroll-padding-bottom` | Cross-browser reliable, handles iOS Safari quirks, no need to compute keyboard height |
| Currency parsing | New parser | Existing `parseDollarsToCents()` from `src/utils/parseDollars.ts` | Already handles `$`, commas, returns `null` for invalid. For draft-to-zero fallback: `parseDollarsToCents(draft) ?? 0` |
| Currency formatting | New formatter | Existing `formatCents()` from `src/utils/formatCents.ts` | Already used everywhere |

**Key insight:** This phase adds no new infrastructure. Every tool needed already exists in the codebase. The work is wiring, not building.

## Common Pitfalls

### Pitfall 1: Draft State Causes Stale Closures
**What goes wrong:** Callback functions passed to child components capture stale draft state from a previous render. When a user types quickly, calculations lag behind or use outdated values.
**Why it happens:** Creating callbacks inline without `useCallback` or without proper dependency arrays.
**How to avoid:** Use `useCallback` with correct deps for draft setters. Since draft setters use functional `setState` (prevState => ...), they have no external dependencies and are stable references.
**Warning signs:** Results flicker or show intermediate wrong values during fast typing.

### Pitfall 2: scrollIntoView Fires Before Keyboard Appears
**What goes wrong:** `scrollIntoView` is called synchronously on focus, but iOS Safari hasn't yet resized the viewport for the keyboard. The element scrolls to a position that's still behind the keyboard.
**Why it happens:** The keyboard animation and viewport resize are asynchronous on iOS.
**How to avoid:** Wrap `scrollIntoView` in a `setTimeout(() => ..., 100)` to let the keyboard animation begin first. The 100ms delay is a well-established workaround.
**Warning signs:** Input appears visible briefly, then keyboard covers it.

### Pitfall 3: parseDollarsToCents Returns null for Intermediate Drafts
**What goes wrong:** Typing "1." produces `parseDollarsToCents("1.")` which returns `100` (parseFloat("1.") is 1). This is fine. But typing just `"."` produces `parseDollarsToCents(".")` which returns `null` (parseFloat(".") is NaN). The fallback to 0 is correct per the locked decision.
**Why it happens:** Intermediate typing states produce strings that aren't valid numbers yet.
**How to avoid:** Always use `parseDollarsToCents(draft) ?? 0` in the draft calculation path. Never let `null` propagate into `calculateResults()`.
**Warning signs:** NaN appearing in results during typing.

### Pitfall 4: Dark Mode Requires No Config But May Have Missing Classes
**What goes wrong:** Tailwind v4 defaults to `media` dark mode strategy. All components reportedly have `dark:` classes. But some elements might be missing them -- e.g., input backgrounds, error text, or the unassigned warning.
**Why it happens:** Dark classes were added incrementally across phases; edge cases get missed.
**How to avoid:** Do a visual audit in dark mode after wiring. Check every component systematically. The UI-SPEC dark mode color table documents the expected values.
**Warning signs:** White/bright elements on a dark background, invisible text.

### Pitfall 5: Per-Person Tip Draft Must Trigger Full Recalculation
**What goes wrong:** Developer implements per-person tip draft as a local-only calculation (just adjusting that one card's total). But changing one person's tip affects tax distribution proportions across all people.
**Why it happens:** Tax is distributed proportionally by subtotal weights. When tip changes, `calculateResults()` needs to re-run for all people.
**How to avoid:** Per-person tip drafts flow up to the same aggregation hook and trigger a full `calculateResults()` call. The locked decision is explicit: "full cross-card live update is required."
**Warning signs:** One person's tip change doesn't affect other people's totals.

## Code Examples

### Dark Mode: Zero Configuration Required

Tailwind v4 uses `prefers-color-scheme` media query by default. The project's `src/index.css` contains only `@import "tailwindcss"` which activates this default. No changes needed.

```css
/* src/index.css -- NO CHANGES NEEDED */
@import "tailwindcss";
/* dark: variants automatically use @media (prefers-color-scheme: dark) */
```

Source: [Tailwind CSS v4 Dark Mode Docs](https://tailwindcss.com/docs/dark-mode)

### Tap Target Sizing for Click-to-Edit Spans

```typescript
// PersonRow.tsx -- add min-h-[44px] to the clickable span
<span
  onClick={() => setEditing(true)}
  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 min-h-[44px] inline-flex items-center"
>
  {person.name}
</span>
```

### Invalid Draft Fallback to Zero

```typescript
// In the draft aggregation hook, parsing draft to cents for calculation:
function draftToCents(draft: string): number {
  const parsed = parseDollarsToCents(draft);
  return parsed ?? 0; // null (invalid) -> 0 cents
}

// For percentage drafts:
function draftToPercent(draft: string): number {
  const val = parseFloat(draft);
  return isNaN(val) ? 0 : val; // NaN -> 0%
}
```

### Edge Case: All Items Unassigned in Assigned Mode

The calculation engine already handles this with a `continue` guard:
```typescript
// In calculate.ts (already implemented):
if (item.splitMode === 'assigned' && item.assignedTo.length === 0) {
  continue; // skip item, no division by zero
}
```

Results show $0.00 per person naturally. No additional UI messaging needed beyond the existing amber "Not assigned to anyone" warning on each item.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 `darkMode: 'media'` in config.js | Tailwind v4: `media` is default, no config file | Tailwind v4 (2025) | Zero config needed for this project |
| `window.innerHeight` for keyboard detection | `visualViewport` API + `scrollIntoView` | 2022+ (wide support) | More reliable keyboard-aware scrolling |
| Debounced live calculation | Immediate recalculation per keystroke | Project decision | No perf concern for restaurant-scale data |

**Deprecated/outdated:**
- Tailwind v3 `tailwind.config.js` for dark mode: Not applicable. This project uses Tailwind v4 CSS-first config via `@tailwindcss/vite` plugin.
- `VirtualKeyboard` API: Not supported on iOS Safari. Do not use for cross-platform mobile web.

## Open Questions

1. **Draft aggregation: hook vs context vs lifted state?**
   - What we know: The CONTEXT.md says "callback/shared state -- NOT via a store shadow field." A custom hook called in App.tsx that holds draft state and passes setters via props is the simplest approach. React Context is an alternative but causes broader re-renders.
   - Recommendation: Use a custom hook (`useDraftCalculation`) in `App.tsx`. Pass draft setters as props through the component tree. The tree is shallow (App -> Panel -> Row), so prop drilling is manageable.

2. **Spacing scale migration (p-3 to p-4)?**
   - What we know: The UI-SPEC notes that `p-3`/`px-3`/`gap-3` (12px) must be updated to `p-4`/`px-4`/`gap-4` (16px) to conform to the 4px-multiple spacing scale. ItemRow currently uses `p-3`.
   - Recommendation: Update during tap target pass since both involve touching the same elements.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 + @testing-library/react 16.3.2 |
| Config file | vite.config.ts (Vitest uses Vite config) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map

Phase 4 is constraint-driven (no REQ-IDs). Tests map to the 5 success criteria:

| Criteria | Behavior | Test Type | Automated Command | File Exists? |
|----------|----------|-----------|-------------------|-------------|
| SC-1 | Active input scrolls into view on focus | manual-only | N/A (requires real mobile keyboard) | N/A |
| SC-2 | Tap targets >= 44px | unit | `npx vitest run src/components/__tests__/TapTargets.test.tsx -x` | No - Wave 0 |
| SC-3 | Totals recalculate instantly on keystroke | unit | `npx vitest run src/hooks/__tests__/useDraftCalculation.test.ts -x` | No - Wave 0 |
| SC-4 | Edge cases produce no broken states | unit | `npx vitest run src/engine/__tests__/calculate.test.ts -x` | Yes (partial) |
| SC-5 | Dark mode supported | manual-only | N/A (requires visual verification with system dark mode) | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/hooks/__tests__/useDraftCalculation.test.ts` -- covers SC-3 (live recalculation with draft merging, invalid input fallback to zero)
- [ ] Extend `src/engine/__tests__/calculate.test.ts` with edge case tests for SC-4 (zero people, all-unassigned items, empty bill at $0)
- [ ] SC-1 (keyboard scroll) and SC-5 (dark mode) are manual verification -- no automated test needed

## Sources

### Primary (HIGH confidence)
- [Tailwind CSS v4 Dark Mode Documentation](https://tailwindcss.com/docs/dark-mode) -- Confirmed: `media` strategy is default in v4, zero configuration needed
- Project source code: `src/index.css`, `src/components/*.tsx`, `src/engine/calculate.ts` -- direct codebase inspection

### Secondary (MEDIUM confidence)
- [MDN VisualViewport API](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) -- visualViewport resize events for keyboard detection
- [MDN VirtualKeyboard API](https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API) -- confirmed NOT supported on iOS Safari
- [The Eccentric Ways of iOS Safari with the Keyboard](https://blog.opendigerati.com/the-eccentric-ways-of-ios-safari-with-the-keyboard-b5aa3f34228d) -- iOS Safari keyboard behavior, scrollIntoView limitations
- [Fix mobile keyboard overlap with VisualViewport](https://dev.to/franciscomoretti/fix-mobile-keyboard-overlap-with-visualviewport-3a4a) -- practical workarounds

### Tertiary (LOW confidence)
- None. All findings verified against primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all existing
- Architecture (draft aggregation): HIGH -- well-understood React callback/hook pattern; locked decisions from CONTEXT.md are clear
- Dark mode: HIGH -- verified against official Tailwind v4 docs; default media strategy requires zero config
- Keyboard handling: MEDIUM -- scrollIntoView + setTimeout workaround is widely documented but iOS Safari behavior varies by version
- Pitfalls: HIGH -- all derived from direct codebase inspection and locked decisions

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable domain, no fast-moving dependencies)
