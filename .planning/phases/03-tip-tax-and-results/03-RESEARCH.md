# Phase 3: Tip, Tax, and Results - Research

**Researched:** 2026-03-18
**Domain:** React UI components + calculation engine modification (per-person tip overrides, settings panel, results display)
**Confidence:** HIGH

## Summary

Phase 3 adds three new UI sections (Tip & Tax settings panel, Results panel with expandable person cards, Grand Total row) and one engine modification (per-person tip overrides). The existing codebase is well-structured: the `calculateResults()` pure function in `src/engine/calculate.ts` already computes subtotals, tip, and tax from `AppState`. The primary engine change is accepting per-person tip overrides via a `tipOverrides: Record<string, number>` field in the store, which `calculateResults()` uses in place of `defaultTipPercent` when present.

The UI work is the larger effort. Three new components are needed: `SettingsPanel` (tip presets + tax input), `ResultsPanel` (list of person cards), and `PersonResultCard` (collapsed/expanded breakdown with inline tip override editing). These follow patterns already established in Phase 2 (inline editing, Zustand store subscriptions, Tailwind utility classes). No new dependencies are required.

**Primary recommendation:** Split into at least two plans -- (1) engine modification + store changes + unit tests for tip overrides, then (2) UI components wired to the store with component tests. Additional plans may cover integration testing, edge-case hardening, and section spacing adjustments.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TIP-01 | User can set a tip percentage per person (each person's tip applies to their own subtotal) | Store gets `tipOverrides: Record<string, number>` + `setPersonTipOverride`/`clearPersonTipOverride` actions. `calculateResults()` uses override when present, falls back to `defaultTipPercent`. SettingsPanel sets global default, PersonResultCard expanded view has inline-editable tip percentage. |
| TAX-01 | User can set a single tax percentage applied to the whole bill, split proportionally | SettingsPanel has a single tax percentage input updating `settings.defaultTaxPercent` via existing `updateSettings` action. `calculateResults()` already distributes tax proportionally via `distributeProportional()` -- no engine change needed for tax. |
| RESULTS-01 | App displays the final amount each person owes | ResultsPanel renders `PersonResult[]` from `calculateResults()`. Each PersonResultCard shows person name and total amount prominently at display size (28px/700). Grand Total row shows sum of all person totals. |
| RESULTS-02 | App displays an itemized breakdown per person showing what they had, their share of tax, and their tip | PersonResultCard expanded state shows: item lines (from `itemLines[]`), subtotal, tip (with percentage and amount), tax amount, and total. Uses existing `PersonResult` interface which already contains all needed fields (`itemLines`, `subtotalInCents`, `tipInCents`, `taxInCents`, `totalInCents`). |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.4 | UI framework | Already installed |
| Zustand | ^5.0.12 | State management | Already installed, store exists |
| Tailwind CSS | ^4.2.2 | Styling | Already installed, all Phase 2 components use it |
| Vitest | ^4.1.0 | Testing | Already installed with jsdom environment |
| @testing-library/react | ^16.3.2 | Component testing | Already installed, used in Phase 2 tests |
| @testing-library/user-event | ^14.6.1 | User interaction simulation | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/jest-dom | ^6.9.1 | DOM matchers (toBeInTheDocument, etc.) | Already in test-setup.ts |

### Alternatives Considered
None -- no new dependencies needed for this phase. All required functionality is achievable with the existing stack.

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    SettingsPanel.tsx         # Tip preset buttons + tax input
    ResultsPanel.tsx          # Results section with PersonResultCard list + Grand Total
    PersonResultCard.tsx      # Expandable card: collapsed (name + total), expanded (itemized breakdown)
    __tests__/
      SettingsPanel.test.tsx
      ResultsPanel.test.tsx
  engine/
    calculate.ts              # MODIFY: accept tipOverrides param
    __tests__/
      calculate.test.ts       # MODIFY: add tipOverrides:{} to all 11 existing fixtures + new override tests
  store/
    billStore.ts              # MODIFY: add tipOverrides + actions
    __tests__/
      billStore.test.ts       # MODIFY: add tipOverrides:{} to beforeEach + new action tests
  types/
    models.ts                 # MODIFY: add tipOverrides to AppState
```

### Pattern 1: Zustand Store Extension for tipOverrides
**What:** Add `tipOverrides: Record<string, number>` to the store alongside new actions `setPersonTipOverride` and `clearPersonTipOverride`.
**When to use:** When per-person tip data needs to persist in global state and flow into `calculateResults()`.
**Example:**
```typescript
// In billStore.ts -- add to BillState interface and implementation
tipOverrides: Record<string, number>;
setPersonTipOverride: (personId: string, tipPercent: number) => void;
clearPersonTipOverride: (personId: string) => void;
```
**Key detail:** When `removePerson` is called, it must also clean up `tipOverrides[id]` to prevent stale data.

### Pattern 2: Derived Results via Selector
**What:** Call `calculateResults()` inside a Zustand selector so results auto-update on any state change.
**When to use:** In `ResultsPanel` to get live `PersonResult[]`.
**Example:**
```typescript
// In component
const results = useBillStore((state) => calculateResults({
  people: state.people,
  items: state.items,
  settings: state.settings,
  tipOverrides: state.tipOverrides,
}));
```
**Important:** `PersonResult` is derived, never stored. This is a locked decision from Phase 1.

**Performance note on selector approach:** Calling `calculateResults()` inside a Zustand selector means it runs on every state change. For this app's scale (restaurant bills with <20 people), this is negligible. However, the selector will create a new array reference on every call, causing re-renders. If needed, `useMemo` or a shallow equality check can optimize, but premature optimization is not warranted here.

### Pattern 3: Inline Edit for Per-Person Tip (Phase 2 Pattern Reuse)
**What:** The same click-to-edit pattern used in `ItemRow.tsx` for description/price editing. A display span is clickable; clicking swaps to an input. Enter saves, Escape cancels, blur saves.
**When to use:** For the per-person tip percentage override in the expanded breakdown.
**Example:** See `ItemRow.tsx` lines 14-71 for the exact pattern (useState for editing flag + draft value, handleSave/handleCancel/handleKeyDown functions).

### Pattern 4: Expand/Collapse with Local State
**What:** Use `useState<Set<string>>` in `ResultsPanel` to track which person cards are expanded. This is purely UI state -- not stored in Zustand.
**When to use:** For the expandable person result cards.
**Example:**
```typescript
const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
const toggle = (id: string) => {
  setExpandedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};
```

### Pattern 5: Tip Preset RadioGroup
**What:** A row of preset tip buttons (15%, 18%, 20%, 25%, Custom %) using ARIA radiogroup semantics. Only one can be active at a time. Selecting "Custom %" shows an inline decimal input.
**When to use:** In SettingsPanel for global tip rate selection.
**Key accessibility details from UI-SPEC:**
- Container: `role="radiogroup"` with `aria-label="Tip percentage"`
- Each button: `role="radio"` with `aria-checked`
- Touch targets: `min-h-[44px]` per WCAG 2.5.5
- Selected: `bg-blue-500 text-white`, Unselected: `bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300`

### Anti-Patterns to Avoid
- **Storing PersonResult in the store:** Results are always derived from `calculateResults()`. Never cache them in Zustand -- this is a locked Phase 1 decision.
- **Floating-point money math:** All monetary values are integer cents. The `formatCents()` utility handles display conversion. This is a locked project-wide decision.
- **Using `onChange` for tip/tax inputs with immediate store update:** This causes thrashing. Use `onBlur` or `Enter` to commit values, matching the Phase 2 inline edit pattern.
- **Separate Zustand slice for settings:** The `updateSettings` action already handles `BillSettings` updates with `Partial<BillSettings>`. Use it for global tip/tax changes.
- **Computing grand total independently:** Grand total MUST be `results.reduce((sum, r) => sum + r.totalInCents, 0)` -- never a separate calculation. This preserves penny-exact invariant.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Currency formatting | Custom string builder | `formatCents()` from `src/utils/formatCents.ts` | Already handles "$X.XX" format with cents-to-dollars conversion |
| Dollar string parsing | Custom parser | `parseDollarsToCents()` from `src/utils/parseDollars.ts` | Handles $, commas, validation, returns null for invalid |
| Proportional distribution | Custom rounding | `distributeProportional()` from `src/engine/distribute.ts` | Largest-remainder ensures exact-sum invariant |
| Equal distribution | Custom division | `largestRemainderDistribute()` from `src/engine/distribute.ts` | Handles remainder cents correctly |

**Key insight:** The entire calculation engine and utility layer already exists. Phase 3 UI components should call these utilities directly -- no new math code needed except the per-person tip override wiring in `calculateResults()`.

## Common Pitfalls

### Pitfall 1: Forgetting to Clean Up tipOverrides on Person Removal
**What goes wrong:** A person is removed but their tip override entry remains in `tipOverrides`. If a new person gets the same ID (unlikely with UUID but conceptually messy), they inherit a stale tip rate.
**Why it happens:** `removePerson` in the store currently only cleans up `people[]` and `items[].assignedTo`.
**How to avoid:** Extend `removePerson` to also delete `tipOverrides[id]`.
**Warning signs:** Stale keys in `tipOverrides` after person deletion.

### Pitfall 2: Percentage Input Parsing Edge Cases
**What goes wrong:** User types "8.875" for NYC tax or "18.5" for custom tip. Naive `parseInt` truncates decimals.
**Why it happens:** Tax and tip percentages are not always whole numbers.
**How to avoid:** Use `parseFloat` and validate the result. Store as a number (not integer). The conversion to cents happens in `calculateResults()` via `Math.round(subtotal * rate / 100)`.
**Warning signs:** Tax amounts off by a few cents from expected values.

### Pitfall 3: AppState Interface Mismatch After Adding tipOverrides
**What goes wrong:** `calculateResults()` expects `AppState` but `AppState` in `models.ts` doesn't include `tipOverrides`. Tests break or tip overrides silently ignored.
**Why it happens:** The `AppState` interface and `calculateResults` signature must both be updated together.
**How to avoid:** Update `AppState` in `models.ts` first, then update `calculateResults()` signature, then update all test fixtures.
**Warning signs:** TypeScript errors in test files or `tipOverrides` always undefined.

### Pitfall 4: Existing Test Fixture Migration (11 tests need tipOverrides: {})
**What goes wrong:** After adding `tipOverrides` to `AppState`, all 11 existing `calculate.test.ts` fixtures fail TypeScript compilation because they lack the new required field.
**Why it happens:** `AppState` is a required-fields interface. Adding a new field breaks all existing usages.
**How to avoid:** Batch-update all existing test fixtures to include `tipOverrides: {}` in the same commit as the models change. Also update `PeoplePanel.test.tsx` beforeEach which uses `useBillStore.setState()`.
**Warning signs:** TypeScript compilation errors across test files.
**Affected files:**
- `src/engine/__tests__/calculate.test.ts` -- 11 test fixtures
- `src/components/__tests__/PeoplePanel.test.tsx` -- beforeEach setState call (line 8-11)
- `src/components/__tests__/ItemsPanel.test.tsx` -- if it has setState calls
- `src/store/__tests__/billStore.test.ts` -- beforeEach setState call

### Pitfall 5: Results Panel Showing When Data is Incomplete
**What goes wrong:** Results panel renders with zero people or zero items, showing empty/broken cards.
**Why it happens:** No guard check on pre-conditions.
**How to avoid:** ResultsPanel should only render when `people.length > 0 && items.length > 0`. Show appropriate empty state messages per the UI spec copywriting contract (three distinct states).
**Warning signs:** Empty results section visible before user enters data.

### Pitfall 6: Grand Total Rounding Discrepancy
**What goes wrong:** Grand total computed independently doesn't match the sum of individual person totals due to rounding.
**Why it happens:** Computing grand total separately from individual totals.
**How to avoid:** Grand total MUST be the sum of `PersonResult.totalInCents` values, never independently calculated. This preserves the penny-exact invariant.
**Warning signs:** Grand total differs from manual sum of person totals by 1-2 cents.

### Pitfall 7: Click Event Propagation in Expanded Card
**What goes wrong:** Clicking the inline tip edit input inside an expanded card triggers the card's toggle handler, collapsing the card.
**Why it happens:** The card container has an onClick for expand/collapse, and the tip edit input is a child element.
**How to avoid:** Use `e.stopPropagation()` on the expanded breakdown container's onClick handler to prevent bubbling to the card toggle.
**Warning signs:** Card collapses when user tries to edit the tip percentage.

### Pitfall 8: Section Spacing Mismatch
**What goes wrong:** UI-SPEC calls for `xl (32px)` gap between major sections (Items -> Settings -> Results), but App.tsx currently uses `space-y-6` (24px).
**Why it happens:** Phase 2 established `space-y-6` which is close but not exact.
**How to avoid:** Either update App.tsx `<main>` to `space-y-8` (32px) when adding new sections, or accept the 24px gap as consistent with Phase 2. Plan 03-02 noted this tradeoff.
**Warning signs:** Visual spacing inconsistency between spec and implementation.

## Code Examples

### Modifying calculateResults() for Per-Person Tip Overrides
```typescript
// In calculate.ts -- the tip computation changes from:
const tipInCents = Math.round(subtotalInCents * settings.defaultTipPercent / 100);

// To:
const tipRate = state.tipOverrides?.[person.id] ?? settings.defaultTipPercent;
const tipInCents = Math.round(subtotalInCents * tipRate / 100);
```

### Store Actions for Tip Overrides
```typescript
// Add to billStore.ts
tipOverrides: {},

setPersonTipOverride: (personId, tipPercent) =>
  set((state) => ({
    tipOverrides: { ...state.tipOverrides, [personId]: tipPercent },
  })),

clearPersonTipOverride: (personId) =>
  set((state) => {
    const { [personId]: _, ...rest } = state.tipOverrides;
    return { tipOverrides: rest };
  }),

// Extend removePerson to clean up tipOverrides
removePerson: (id) =>
  set((state) => {
    const { [id]: _, ...remainingOverrides } = state.tipOverrides;
    return {
      people: state.people.filter((p) => p.id !== id),
      items: state.items.map((item) => ({
        ...item,
        assignedTo: item.assignedTo.filter((pid) => pid !== id),
      })),
      tipOverrides: remainingOverrides,
    };
  }),
```

### Tip Preset Button Group (RadioGroup Pattern)
```typescript
// SettingsPanel.tsx -- tip presets with accessibility
const PRESETS = [15, 18, 20, 25] as const;
const [isCustom, setIsCustom] = useState(false);

<div role="radiogroup" aria-label="Tip percentage">
  {PRESETS.map((pct) => (
    <button
      key={pct}
      role="radio"
      aria-checked={!isCustom && settings.defaultTipPercent === pct}
      onClick={() => { setIsCustom(false); updateSettings({ defaultTipPercent: pct }); }}
      className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium ${
        !isCustom && settings.defaultTipPercent === pct
          ? 'bg-blue-500 text-white'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
      }`}
    >
      {pct}%
    </button>
  ))}
  <button
    role="radio"
    aria-checked={isCustom}
    onClick={() => setIsCustom(true)}
    className={/* same pattern */}
  >
    Custom %
  </button>
</div>
```

### Expandable Person Result Card
```typescript
// PersonResultCard.tsx
function PersonResultCard({ result, isExpanded, onToggle, tipOverride, defaultTip, onTipOverride }: Props) {
  return (
    <div
      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800 cursor-pointer"
      onClick={onToggle}
    >
      <div className="flex items-center justify-between">
        <span className="text-base">{result.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-[28px] font-bold leading-[1.2]">
            {formatCents(result.totalInCents)}
          </span>
          <button
            aria-expanded={isExpanded}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
              &#9654; {/* right-pointing triangle */}
            </span>
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
             onClick={(e) => e.stopPropagation()}>
          {/* Item lines, subtotal, tip (with inline edit), tax, total */}
        </div>
      )}
    </div>
  );
}
```

### Empty State Handling in ResultsPanel
```typescript
// Three distinct empty states from UI-SPEC copywriting contract
if (people.length === 0 && items.length === 0) {
  return (
    <section>
      <h2 className="text-[20px] font-bold leading-[1.2]">No results yet</h2>
      <p>Add people and items above to see what everyone owes.</p>
    </section>
  );
}
if (people.length > 0 && items.length === 0) {
  return <p>Add items to the bill to calculate results.</p>;
}
if (people.length === 0 && items.length > 0) {
  return <p>Add people to split the bill with.</p>;
}
```

## Gap Analysis: What Existing Plans Cover vs. What Remains

### Covered by Plan 03-01 (Engine + Store)
- `tipOverrides` field added to `AppState` in `models.ts`
- Store actions: `setPersonTipOverride`, `clearPersonTipOverride`
- `removePerson` cleanup of `tipOverrides`
- `calculateResults()` per-person tip override logic
- Unit tests for store actions and engine override behavior
- Migration of existing `calculate.test.ts` fixtures to include `tipOverrides: {}`

### Covered by Plan 03-02 (UI Components)
- `SettingsPanel` with tip presets and tax input
- `ResultsPanel` with `PersonResultCard` list and Grand Total row
- `PersonResultCard` with expand/collapse and inline tip override editing
- Component tests for SettingsPanel and ResultsPanel
- App.tsx wiring (adding both new components after ItemsPanel)
- Empty state handling (three distinct states)

### Potential Gaps for Additional Plans

1. **Existing test fixture migration outside engine tests:** Plan 03-01 updates `calculate.test.ts` fixtures but the `PeoplePanel.test.tsx` beforeEach (line 8-11) and `ItemsPanel.test.tsx` setState calls also pass state objects that will need `tipOverrides: {}` after the AppState change. If these tests break after Plan 01, Plan 02 execution will be blocked.

2. **Integration flow testing:** No plan tests the end-to-end flow: "user adds people + items, sets tip/tax in settings, sees results update, overrides one person's tip, verifies grand total adjusts." This is a cross-component integration test that validates TIP-01 + TAX-01 + RESULTS-01 + RESULTS-02 together.

3. **Input validation hardening:** The UI-SPEC states "If input is empty or invalid, revert to previous valid value" for tax. Plan 02 mentions this but doesn't have dedicated edge-case tests: empty string, negative numbers, NaN, very large percentages, leading/trailing whitespace. Same for custom tip input.

4. **Section spacing adjustment:** UI-SPEC calls for `xl (32px)` between major sections. App.tsx uses `space-y-6` (24px). Plan 02 acknowledges this but defers. A dedicated task could update to `space-y-8`.

5. **Tip preset state edge case -- non-preset initial value:** If `defaultTipPercent` is already a non-preset value (e.g., 22) when SettingsPanel mounts, none of the preset buttons should appear selected, and `isCustom` should be initialized to `true`. Plan 02 initializes `isCustom` as `false`, which would show no selected button but also no custom input.

6. **Accessibility audit:** UI-SPEC requires `aria-labelledby` referencing the person name on expanded breakdown content. Plan 02 doesn't explicitly implement this. The expand button needs an `aria-label` or `aria-labelledby` for screen readers.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global tip only | Per-person tip override via `tipOverrides` Record | Phase 3 (new) | Enables TIP-01 requirement |
| No results display | Derived PersonResult[] rendered in expandable cards | Phase 3 (new) | Enables RESULTS-01, RESULTS-02 |

**Nothing deprecated** -- all Phase 1 and 2 patterns remain valid and reused.

## Open Questions

1. **Tip override persistence when global tip changes**
   - What we know: Each person can override their tip. The global default applies when no override exists.
   - What's unclear: If a user sets person A's tip to 20%, then changes the global from 18% to 25%, should person A's override persist at 20%?
   - Recommendation: Yes, keep the override. The override is explicit user intent. The UI spec confirms this -- override persists until explicitly cleared (Escape reverts to global default).

2. **Custom tip preset state tracking**
   - What we know: The UI spec says "Custom %" deselects all presets and shows an inline input.
   - What's unclear: If user types "22" in custom, then clicks the "20%" preset, should custom input disappear?
   - Recommendation: Yes. `isCustom` is local component state. Clicking a preset sets `isCustom = false` and hides the custom input.

3. **Initial isCustom state when defaultTipPercent is non-preset**
   - What we know: Default is 18% (a preset value).
   - What's unclear: If somehow the initial `defaultTipPercent` doesn't match any preset, should the Custom input be shown on mount?
   - Recommendation: Initialize `isCustom` by checking `!PRESETS.includes(settings.defaultTipPercent)`. This handles edge cases gracefully.

4. **Test fixture migration scope**
   - What we know: Plan 01 updates `calculate.test.ts` fixtures. The `AppState` type change is breaking.
   - What's unclear: Whether component test files (`PeoplePanel.test.tsx`, `ItemsPanel.test.tsx`, `ItemRow.test.tsx`) also pass `AppState`-shaped objects that will break.
   - What we found: `PeoplePanel.test.tsx` line 8-11 calls `useBillStore.setState()` with `{ people, items, settings }` -- this is a partial update via Zustand's `setState`, so it WON'T break because Zustand merges partial state. The store's initial state already has `tipOverrides: {}` after Plan 01. No migration needed for component test files.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TIP-01 | Per-person tip override applied in calculation | unit | `npx vitest run src/engine/__tests__/calculate.test.ts -x` | Needs new tests in existing file |
| TIP-01 | Store setPersonTipOverride / clearPersonTipOverride actions | unit | `npx vitest run src/store/__tests__/billStore.test.ts -x` | Needs new tests in existing file |
| TIP-01 | Tip preset selection and custom input in SettingsPanel | component | `npx vitest run src/components/__tests__/SettingsPanel.test.tsx -x` | Wave 0 |
| TIP-01 | Per-person tip override inline edit in PersonResultCard | component | `npx vitest run src/components/__tests__/ResultsPanel.test.tsx -x` | Wave 0 |
| TAX-01 | Tax input updates settings and results recalculate | component | `npx vitest run src/components/__tests__/SettingsPanel.test.tsx -x` | Wave 0 |
| RESULTS-01 | Person result cards display name and total | component | `npx vitest run src/components/__tests__/ResultsPanel.test.tsx -x` | Wave 0 |
| RESULTS-02 | Expanded card shows itemized breakdown | component | `npx vitest run src/components/__tests__/ResultsPanel.test.tsx -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/__tests__/SettingsPanel.test.tsx` -- covers TIP-01 (UI), TAX-01
- [ ] `src/components/__tests__/ResultsPanel.test.tsx` -- covers RESULTS-01, RESULTS-02, TIP-01 (per-person override)
- [ ] New test cases in `src/engine/__tests__/calculate.test.ts` -- covers TIP-01 (engine: per-person tip override)
- [ ] New test cases in `src/store/__tests__/billStore.test.ts` -- covers TIP-01 (store: tipOverrides actions)

## Sources

### Primary (HIGH confidence)
- Project source code: `src/types/models.ts`, `src/engine/calculate.ts`, `src/store/billStore.ts`, `src/components/ItemRow.tsx`, `src/App.tsx` -- direct code inspection
- Phase 3 UI-SPEC: `.planning/phases/03-tip-tax-and-results/03-UI-SPEC.md` -- interaction and visual contracts
- Project STATE.md: locked decisions on integer-cent arithmetic, derived PersonResult, pre-tax tip calculation
- Existing test files: `calculate.test.ts` (11 fixtures), `PeoplePanel.test.tsx`, `billStore.test.ts` -- test patterns and fixture shapes

### Secondary (MEDIUM confidence)
- None needed -- all patterns are internal to the existing codebase

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, entire stack already installed and working
- Architecture: HIGH -- all patterns derived from existing codebase (Phase 1/2 code directly inspected)
- Pitfalls: HIGH -- identified from direct code review of current `calculateResults()`, store actions, test fixtures, and UI-SPEC contracts
- Gap analysis: HIGH -- based on line-by-line review of existing Plan 01 and Plan 02

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable -- all internal project patterns, no external dependency concerns)
