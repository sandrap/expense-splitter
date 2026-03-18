# Phase 3: Tip, Tax, and Results - Research

**Researched:** 2026-03-18
**Domain:** React UI components + calculation engine modification (per-person tip overrides, settings panel, results display)
**Confidence:** HIGH

## Summary

Phase 3 adds three new UI sections (Tip & Tax settings panel, Results panel with expandable person cards, Grand Total row) and one engine modification (per-person tip overrides). The existing codebase is well-structured: the `calculateResults()` pure function in `src/engine/calculate.ts` already computes subtotals, tip, and tax from `AppState`. The primary engine change is accepting per-person tip overrides via a `tipOverrides: Record<string, number>` field in the store, which `calculateResults()` uses in place of `defaultTipPercent` when present.

The UI work is the larger effort. Three new components are needed: `SettingsPanel` (tip presets + tax input), `ResultsPanel` (list of person cards), and `PersonResultCard` (collapsed/expanded breakdown with inline tip override editing). These follow patterns already established in Phase 2 (inline editing, Zustand store subscriptions, Tailwind utility classes). No new dependencies are required.

**Primary recommendation:** Split into two plans -- (1) engine modification + store changes + unit tests for tip overrides, then (2) three UI components wired to the store with component tests.

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
      calculate.test.ts       # ADD: tests for per-person tip override behavior
  store/
    billStore.ts              # MODIFY: add tipOverrides + actions
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

### Anti-Patterns to Avoid
- **Storing PersonResult in the store:** Results are always derived from `calculateResults()`. Never cache them in Zustand -- this is a locked Phase 1 decision.
- **Floating-point money math:** All monetary values are integer cents. The `formatCents()` utility handles display conversion. This is a locked project-wide decision.
- **Using `onChange` for tip/tax inputs with immediate store update:** This causes thrashing. Use `onBlur` or `Enter` to commit values, matching the Phase 2 inline edit pattern.
- **Separate Zustand slice for settings:** The `updateSettings` action already handles `BillSettings` updates with `Partial<BillSettings>`. Use it for global tip/tax changes.

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

### Pitfall 4: Results Panel Showing When Data is Incomplete
**What goes wrong:** Results panel renders with zero people or zero items, showing empty/broken cards.
**Why it happens:** No guard check on pre-conditions.
**How to avoid:** ResultsPanel should only render when `people.length > 0 && items.length > 0`. Show appropriate empty state messages per the UI spec copywriting contract.
**Warning signs:** Empty results section visible before user enters data.

### Pitfall 5: Grand Total Rounding Discrepancy
**What goes wrong:** Grand total computed independently doesn't match the sum of individual person totals due to rounding.
**Why it happens:** Computing grand total separately from individual totals.
**How to avoid:** Grand total MUST be the sum of `PersonResult.totalInCents` values, never independently calculated. This preserves the penny-exact invariant.
**Warning signs:** Grand total differs from manual sum of person totals by 1-2 cents.

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
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Item lines, subtotal, tip (with inline edit), tax, total */}
        </div>
      )}
    </div>
  );
}
```

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

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TIP-01 | User can set a tip percentage per person (each person's tip applies to their own subtotal) | Store gets `tipOverrides: Record<string, number>` + `setPersonTipOverride`/`clearPersonTipOverride` actions. `calculateResults()` uses override when present, falls back to `defaultTipPercent`. SettingsPanel sets global default, PersonResultCard expanded view has inline-editable tip percentage. |
| TAX-01 | User can set a single tax percentage applied to the whole bill, split proportionally | SettingsPanel has a single tax percentage input updating `settings.defaultTaxPercent` via existing `updateSettings` action. `calculateResults()` already distributes tax proportionally via `distributeProportional()` -- no engine change needed for tax. |
| RESULTS-01 | App displays the final amount each person owes | ResultsPanel renders `PersonResult[]` from `calculateResults()`. Each PersonResultCard shows person name and total amount prominently at display size (28px/700). Grand Total row shows sum of all person totals. |
| RESULTS-02 | App displays an itemized breakdown per person showing what they had, their share of tax, and their tip | PersonResultCard expanded state shows: item lines (from `itemLines[]`), subtotal, tip (with percentage and amount), tax amount, and total. Uses existing `PersonResult` interface which already contains all needed fields (`itemLines`, `subtotalInCents`, `tipInCents`, `taxInCents`, `totalInCents`). |
</phase_requirements>

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
| TAX-01 | Tax input updates settings and results recalculate | component | `npx vitest run src/components/__tests__/SettingsPanel.test.tsx -x` | Wave 0 |
| RESULTS-01 | Person result cards display name and total | component | `npx vitest run src/components/__tests__/ResultsPanel.test.tsx -x` | Wave 0 |
| RESULTS-02 | Expanded card shows itemized breakdown | component | `npx vitest run src/components/__tests__/ResultsPanel.test.tsx -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/__tests__/SettingsPanel.test.tsx` -- covers TIP-01 (UI), TAX-01
- [ ] `src/components/__tests__/ResultsPanel.test.tsx` -- covers RESULTS-01, RESULTS-02
- [ ] New test cases in `src/engine/__tests__/calculate.test.ts` -- covers TIP-01 (engine: per-person tip override)
- [ ] New test cases in `src/store/__tests__/billStore.test.ts` -- covers TIP-01 (store: tipOverrides actions)

## Sources

### Primary (HIGH confidence)
- Project source code: `src/types/models.ts`, `src/engine/calculate.ts`, `src/store/billStore.ts`, `src/components/ItemRow.tsx` -- direct code inspection
- Phase 3 UI-SPEC: `.planning/phases/03-tip-tax-and-results/03-UI-SPEC.md` -- interaction and visual contracts
- Project STATE.md: locked decisions on integer-cent arithmetic, derived PersonResult, pre-tax tip calculation

### Secondary (MEDIUM confidence)
- None needed -- all patterns are internal to the existing codebase

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, entire stack already installed and working
- Architecture: HIGH -- all patterns derived from existing codebase (Phase 1/2 code directly inspected)
- Pitfalls: HIGH -- identified from direct code review of current `calculateResults()`, store actions, and UI-SPEC contracts

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable -- all internal project patterns, no external dependency concerns)
