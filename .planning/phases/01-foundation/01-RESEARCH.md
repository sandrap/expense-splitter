# Phase 1: Foundation - Research

**Researched:** 2026-03-18
**Domain:** Data model, Zustand store, pure calculation engine with integer-cent arithmetic
**Confidence:** HIGH

## Summary

Phase 1 builds the correctness layer for the expense splitter: TypeScript types, a Zustand 5 store with named actions, and a pure calculation engine using integer-cent arithmetic with largest-remainder rounding. No UI is built in this phase. The entire phase is testable without a browser -- all outputs are pure functions and store actions validated through Vitest unit tests.

The primary technical challenges are: (1) implementing the largest-remainder method correctly so distributed shares always sum exactly to the item total, (2) getting the tip/tax calculation order right (both computed on pre-tax subtotal, not on each other), and (3) structuring the Zustand store so `PersonResult` is never stored -- only derived.

**Primary recommendation:** Build types first, then store with actions, then the calculation engine TDD-style. Every function in the calculation engine operates on integer cents. Convert from user-facing dollars only at input boundaries.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use **Vitest** as the test runner (native Vite integration, no extra config)
- **TDD approach**: write failing tests for `calculateResults()` before implementing
- **Scenario-based coverage**: cover key scenarios -- 2-way split, 3-way split, shared items among a subset, per-person tip, rounding edge cases (largest-remainder method)
- No exhaustive line coverage target -- correctness of core scenarios is the goal
- All arithmetic in **integer cents** -- floating-point is forbidden in the calculation engine
- **Largest-remainder method** for distributing rounding remainders so shares always sum exactly to the item total
- Tip calculated on **pre-tax subtotal** only (not on subtotal + tax)
- `calculateResults()` is a **pure function** -- takes state as input, returns `PersonResult[]` -- never stored in Zustand
- `Item.splitMode` is an explicit enum (`'shared' | 'assigned'`) -- not inferred from empty `assignedTo[]`
- `PersonResult` is derived on every render, never stored in state -- totals can never be stale

### Claude's Discretion
- Exact folder structure and file naming conventions
- ESLint/Prettier configuration details
- Zustand store slice organization (single store vs. slices)
- Deployment target configuration (Cloudflare Pages or equivalent)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

## Standard Stack

### Core (Phase 1 relevant)

| Library | Verified Version | Purpose | Why Standard |
|---------|-----------------|---------|--------------|
| TypeScript | 5.9.3 | Type safety for data model and calculation engine | Catches currency arithmetic bugs at compile time; zero runtime cost |
| Zustand | 5.0.12 | Global app state store | Lightweight, works outside React for testing, selector-based reactivity |
| Vitest | 4.1.0 | Unit test runner | Native Vite integration, same transform pipeline, fast |
| Vite | 8.0.0 | Build tool / dev server | Official React recommendation, scaffolds project with `create vite` |
| React | 19.2.4 | UI framework (scaffolded but not used in Phase 1) | Project requirement |

### Supporting (Phase 1)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jsdom | latest | Vitest browser environment | Only needed if testing React components; for pure function tests, not required |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single Zustand store | Zustand slices | Single store is simpler for this app's size; slices add indirection for < 20 state fields |
| Hand-rolled largest-remainder | `largest-remainder` npm package | Hand-rolling is recommended -- the algorithm is 15 lines, avoids a dependency, and is easier to test/debug |

**Installation (Phase 1 scaffold):**
```bash
npm create vite@latest expense-splitter -- --template react-ts
cd expense-splitter
npm install zustand
npm install -D vitest
```

**Version verification:** All versions confirmed via `npm view <pkg> version` on 2026-03-18.

## Architecture Patterns

### Recommended Project Structure

```
src/
  types/
    models.ts          # Person, Item, BillSettings, AppState, PersonResult interfaces
  store/
    billStore.ts       # Zustand store: state + named actions
  engine/
    calculate.ts       # calculateResults(state) -> PersonResult[]
    distribute.ts      # largestRemainderDistribute() helper
    cents.ts           # toCents(), fromCents() conversion helpers
  engine/__tests__/
    calculate.test.ts  # TDD tests for calculateResults
    distribute.test.ts # Tests for largest-remainder distribution
```

### Pattern 1: Zustand v5 Store with TypeScript

**What:** Define state interface and actions together, use `create` with named imports.

**Important Zustand v5 changes (verified via official migration guide):**
- Default exports removed -- use named imports only
- `useShallow` from `zustand/shallow` replaces the old second-argument equality function
- `setState` has stricter TypeScript overloads for the `replace` flag
- Requires React 18+ (we have 19)

```typescript
// src/store/billStore.ts
import { create } from 'zustand';
import type { Person, Item, BillSettings } from '../types/models';

interface BillState {
  people: Person[];
  items: Item[];
  settings: BillSettings;
  // Actions
  addPerson: (name: string) => void;
  removePerson: (id: string) => void;
  updatePerson: (id: string, updates: Partial<Person>) => void;
  addItem: (description: string, priceInCents: number) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<Item>) => void;
  updateSettings: (updates: Partial<BillSettings>) => void;
}

export const useBillStore = create<BillState>()((set) => ({
  people: [],
  items: [],
  settings: {
    defaultTipPercent: 18,
    defaultTaxPercent: 0,
  },
  addPerson: (name) =>
    set((state) => ({
      people: [...state.people, { id: crypto.randomUUID(), name, tipPercent: state.settings.defaultTipPercent }],
    })),
  removePerson: (id) =>
    set((state) => ({
      people: state.people.filter((p) => p.id !== id),
      // Also clean up item assignments referencing this person
      items: state.items.map((item) => ({
        ...item,
        assignedTo: item.assignedTo.filter((pid) => pid !== id),
      })),
    })),
  // ... other actions
}));
```

**Source:** [Zustand v5 migration guide](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5)

### Pattern 2: Pure Calculation Engine with Integer Cents

**What:** All monetary computation uses integer cents. Conversion happens only at boundaries.

```typescript
// src/engine/cents.ts
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

// src/engine/distribute.ts
export function largestRemainderDistribute(totalCents: number, count: number): number[] {
  if (count === 0) return [];
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  // Each person gets `base` cents; first `remainder` people get +1
  // Since all fractional remainders are equal in equal-split,
  // assign deterministically to first N people
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}
```

For unequal distributions (e.g., proportional tax), use the full largest-remainder algorithm:

```typescript
export function distributeProportional(totalCents: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) return weights.map(() => 0);

  const exactShares = weights.map((w) => (w / totalWeight) * totalCents);
  const floors = exactShares.map(Math.floor);
  let remaining = totalCents - floors.reduce((sum, f) => sum + f, 0);

  // Build index array sorted by fractional remainder descending
  const indices = exactShares
    .map((exact, i) => ({ i, remainder: exact - floors[i] }))
    .sort((a, b) => b.remainder - a.remainder);

  for (let j = 0; j < remaining; j++) {
    floors[indices[j].i]++;
  }

  return floors;
}
```

**Source:** [Largest remainder method (Wikipedia)](https://en.wikipedia.org/wiki/Largest_remainder_method), [JavaScript implementation gist](https://gist.github.com/scwood/e58380174bd5a94174c9f08ac921994f)

### Pattern 3: Derived Results via Selector

**What:** `PersonResult[]` is never stored. Computed inline via selector.

```typescript
// In a future component (Phase 2+):
const results = useBillStore((state) => calculateResults(state));
```

The calculation engine itself is a standalone function with no React or Zustand dependency:

```typescript
// src/engine/calculate.ts
export function calculateResults(state: AppState): PersonResult[] { ... }
```

### Anti-Patterns to Avoid

- **Storing computed totals in Zustand:** Never add `personTotal` or `tipAmount` to the store. Always derive from raw inputs.
- **Floating-point arithmetic in the engine:** Never use raw division for money. `10.00 / 3 = 3.3333...` is forbidden. Use `toCents(10.00) = 1000`, then `largestRemainderDistribute(1000, 3) = [334, 333, 333]`.
- **Inferring splitMode from assignedTo length:** `assignedTo: []` does NOT mean "shared with everyone." It means "not yet assigned." Use the explicit `splitMode` enum.
- **Applying tip to post-tax amount:** Tip is on pre-tax subtotal only. `total = subtotal + tax + tip` where `tax = subtotal * taxRate` and `tip = subtotal * tipRate`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUIDs | Custom ID generator | `crypto.randomUUID()` | Built into all modern browsers and Node 19+; cryptographically unique |
| Currency formatting | Manual string concatenation | `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` | Handles edge cases, locale-aware |
| State management | React Context + useReducer | Zustand 5 | Zustand handles selector-based re-renders, works outside React for testing |

**Key insight:** The largest-remainder algorithm IS worth hand-rolling (15 lines). It is the core of the app's correctness guarantee and must be fully understood and tested.

## Common Pitfalls

### Pitfall 1: Floating-Point Creep at Boundaries
**What goes wrong:** Converting between dollars and cents introduces floating-point error. `1.1 * 100 = 110.00000000000001` in JavaScript.
**Why it happens:** IEEE 754 double-precision cannot represent all decimal fractions exactly.
**How to avoid:** Always use `Math.round()` when converting dollars to cents: `Math.round(dollars * 100)`. Never truncate.
**Warning signs:** Unit tests that fail with off-by-one cent errors on specific price values.

### Pitfall 2: Remainder Distribution Off-By-One
**What goes wrong:** The largest-remainder method distributes N-1 or N+1 cents instead of the exact remainder.
**Why it happens:** Confusing `Math.floor` with `Math.trunc` for negative numbers, or miscounting the delta.
**How to avoid:** Assert in every test: `shares.reduce((a, b) => a + b, 0) === totalCents`. This invariant must hold for ALL inputs.
**Warning signs:** Sum-check assertions failing.

### Pitfall 3: Removing a Person Leaves Stale Assignments
**What goes wrong:** A person is deleted but their ID still appears in `item.assignedTo[]`. The calculation engine tries to compute their share, producing ghost results.
**Why it happens:** The `removePerson` action only removes from `people[]` and forgets to clean `items[]`.
**How to avoid:** The `removePerson` store action MUST also filter that person's ID out of every item's `assignedTo` array. Test this explicitly.
**Warning signs:** `PersonResult` appearing for a person who no longer exists.

### Pitfall 4: Division by Zero on Empty Assignments
**What goes wrong:** An item with `splitMode: 'assigned'` and `assignedTo: []` causes division by zero.
**Why it happens:** No guard in the split logic.
**How to avoid:** Guard every division: `if (assignees.length === 0) return []`. An item with no assignees contributes zero to all people. Log or warn about unassigned items.
**Warning signs:** `Infinity` or `NaN` in test output.

### Pitfall 5: Tip/Tax Calculation Order
**What goes wrong:** Tip is computed on `subtotal + tax` instead of on `subtotal` alone.
**Why it happens:** Natural instinct to compute tip on "what you owe so far."
**How to avoid:** Lock the formula: `tax = subtotal * taxRate`, `tip = subtotal * tipRate`, `total = subtotal + tax + tip`. Both tax and tip are independent functions of subtotal.
**Warning signs:** Manual spot-check fails: $10 item, 10% tax, 20% tip should yield $13.00, not $13.20.

## Code Examples

### Complete Type Definitions

```typescript
// src/types/models.ts

export interface Person {
  id: string;
  name: string;
}

export interface Item {
  id: string;
  description: string;
  priceInCents: number;       // ALWAYS integer cents
  splitMode: 'shared' | 'assigned';
  assignedTo: string[];       // Person IDs
}

export interface BillSettings {
  defaultTipPercent: number;  // e.g., 18 means 18%
  defaultTaxPercent: number;  // e.g., 8.875 means 8.875%
}

export interface AppState {
  people: Person[];
  items: Item[];
  settings: BillSettings;
}

export interface ItemLine {
  itemId: string;
  description: string;
  shareInCents: number;
}

export interface PersonResult {
  personId: string;
  name: string;
  itemLines: ItemLine[];
  subtotalInCents: number;
  tipInCents: number;
  taxInCents: number;
  totalInCents: number;
}
```

**Design notes:**
- `Item.priceInCents` stores cents directly. User input is converted at the boundary via `toCents()`.
- `Person` is deliberately minimal -- no tip/tax fields. Per-person tip is a v1 feature (TIP-01) but the percent lives on `Person` only when that UI exists. For Phase 1, the engine accepts tip percent as a parameter per person.
- `BillSettings` stores percentages as human-readable numbers (18 = 18%). The engine converts: `Math.round(subtotalCents * tipPercent / 100)`.

### TDD Test Skeleton

```typescript
// src/engine/__tests__/calculate.test.ts
import { describe, it, expect } from 'vitest';
import { calculateResults } from '../calculate';
import type { AppState } from '../../types/models';

describe('calculateResults', () => {
  it('splits a single item equally between 2 people', () => {
    const state: AppState = {
      people: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ],
      items: [
        { id: 'i1', description: 'Pizza', priceInCents: 2000, splitMode: 'shared', assignedTo: [] },
      ],
      settings: { defaultTipPercent: 0, defaultTaxPercent: 0 },
    };
    const results = calculateResults(state);
    expect(results).toHaveLength(2);
    expect(results[0].subtotalInCents).toBe(1000);
    expect(results[1].subtotalInCents).toBe(1000);
    expect(results[0].totalInCents + results[1].totalInCents).toBe(2000);
  });

  it('uses largest-remainder for 3-way split of $10.00', () => {
    const state: AppState = {
      people: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
        { id: '3', name: 'Carol' },
      ],
      items: [
        { id: 'i1', description: 'Appetizer', priceInCents: 1000, splitMode: 'shared', assignedTo: [] },
      ],
      settings: { defaultTipPercent: 0, defaultTaxPercent: 0 },
    };
    const results = calculateResults(state);
    const totalCents = results.reduce((sum, r) => sum + r.totalInCents, 0);
    expect(totalCents).toBe(1000); // Must sum exactly
    // One person gets 334, two get 333 (or similar valid distribution)
    const shares = results.map((r) => r.subtotalInCents).sort();
    expect(shares).toEqual([333, 333, 334]);
  });

  it('computes tip on pre-tax subtotal only', () => {
    const state: AppState = {
      people: [{ id: '1', name: 'Alice' }],
      items: [{ id: 'i1', description: 'Meal', priceInCents: 1000, splitMode: 'assigned', assignedTo: ['1'] }],
      settings: { defaultTipPercent: 20, defaultTaxPercent: 10 },
    };
    const results = calculateResults(state);
    expect(results[0].subtotalInCents).toBe(1000);
    expect(results[0].taxInCents).toBe(100);    // 10% of 1000
    expect(results[0].tipInCents).toBe(200);     // 20% of 1000 (NOT 20% of 1100)
    expect(results[0].totalInCents).toBe(1300);  // 1000 + 100 + 200
  });

  it('handles shared item assigned to subset of people', () => {
    const state: AppState = {
      people: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
        { id: '3', name: 'Carol' },
      ],
      items: [
        { id: 'i1', description: 'Shared App', priceInCents: 1500, splitMode: 'shared', assignedTo: ['1', '2'] },
      ],
      settings: { defaultTipPercent: 0, defaultTaxPercent: 0 },
    };
    const results = calculateResults(state);
    const alice = results.find((r) => r.personId === '1')!;
    const bob = results.find((r) => r.personId === '2')!;
    const carol = results.find((r) => r.personId === '3')!;
    expect(alice.subtotalInCents).toBe(750);
    expect(bob.subtotalInCents).toBe(750);
    expect(carol.subtotalInCents).toBe(0);
  });

  it('returns empty array when no people', () => {
    const state: AppState = {
      people: [],
      items: [{ id: 'i1', description: 'Pizza', priceInCents: 2000, splitMode: 'shared', assignedTo: [] }],
      settings: { defaultTipPercent: 18, defaultTaxPercent: 8 },
    };
    const results = calculateResults(state);
    expect(results).toEqual([]);
  });
});
```

### Vitest Configuration

```typescript
// vitest.config.ts (or inside vite.config.ts)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // No jsdom needed for Phase 1 -- all tests are pure function tests
    // environment: 'jsdom',  // Enable in Phase 2 when testing React components
    include: ['src/**/*.test.ts'],
  },
});
```

**Source:** [Vitest configuration docs](https://vitest.dev/config/), [Vitest 4.1 release notes](https://vitest.dev/blog/vitest-4-1)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zustand v4 default export | Zustand v5 named imports only | Late 2024 | Must use `import { create } from 'zustand'` |
| Zustand v4 shallow second arg | Zustand v5 `useShallow` hook | Late 2024 | Import from `zustand/shallow` |
| Vitest 2.x | Vitest 4.1.0 | 2025-2026 | Supports Vite 8, uses installed Vite instead of bundled |
| Vite 6.x | Vite 8.0.0 | 2026 | Rolldown-powered; same config API |
| `tailwind.config.js` | Tailwind v4 `@tailwindcss/vite` plugin | 2025 | No config file needed; CSS-first configuration |

**Deprecated/outdated:**
- Create React App: officially dead (Feb 2025). Do not use.
- Zustand default exports: removed in v5.
- Zustand `create(fn, equalityFn)` pattern: removed in v5; use `useShallow` instead.

## Open Questions

1. **`shared` items with non-empty `assignedTo`**
   - What we know: `splitMode: 'shared'` means split among a group. `assignedTo: []` means everyone.
   - What's unclear: When `splitMode: 'shared'` AND `assignedTo` has specific IDs, does it split among that subset? The ARCHITECTURE.md implies yes ("shared appetizer split between Sarah and Mike only").
   - Recommendation: Treat `shared` + `assignedTo: ['1', '2']` as "split among those 2 people." Treat `shared` + `assignedTo: []` as "split among all people." This aligns with ITEMS-04 requirement.

2. **Per-person tip in Phase 1 data model**
   - What we know: TIP-01 requires per-person tip. The calculation engine needs to support this.
   - What's unclear: Should `Person` have a `tipPercent` field now, or should the engine accept tip config separately?
   - Recommendation: Keep `Person` minimal (id + name). Pass tip configuration to `calculateResults` as a separate map or use `BillSettings.defaultTipPercent` for all people. Add per-person tip fields when the TIP-01 UI is built in Phase 3. The engine should accept both patterns.

3. **`assigned` vs `shared` semantic difference for the engine**
   - What we know: `assigned` = specific people ordered this item. `shared` = a group shares it.
   - What's unclear: Is there any calculation difference between `assigned` to IDs [1,2] and `shared` among IDs [1,2]?
   - Recommendation: For v1 calculation purposes, both split equally among their respective person lists. The semantic difference matters for UI (Phase 2) not math. The engine can treat them identically: divide `priceInCents` among the resolved person list.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` (or `test` block in `vite.config.ts`) -- see Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map

Phase 1 is constraint-driven (no specific REQ-IDs), so tests validate correctness invariants:

| Invariant | Behavior | Test Type | Automated Command | File Exists? |
|-----------|----------|-----------|-------------------|-------------|
| CENT-EXACT | Sum of distributed shares === item total in cents | unit | `npx vitest run src/engine/__tests__/distribute.test.ts -t "sum"` | No -- Wave 0 |
| CALC-SPLIT-2 | 2-way equal split produces correct shares | unit | `npx vitest run src/engine/__tests__/calculate.test.ts -t "2 people"` | No -- Wave 0 |
| CALC-SPLIT-3 | 3-way split with remainder uses largest-remainder | unit | `npx vitest run src/engine/__tests__/calculate.test.ts -t "3-way"` | No -- Wave 0 |
| CALC-SUBSET | Shared item among subset only charges that subset | unit | `npx vitest run src/engine/__tests__/calculate.test.ts -t "subset"` | No -- Wave 0 |
| CALC-TIP-ORDER | Tip computed on pre-tax subtotal, not post-tax | unit | `npx vitest run src/engine/__tests__/calculate.test.ts -t "pre-tax"` | No -- Wave 0 |
| CALC-TAX | Tax proportional to person's subtotal share | unit | `npx vitest run src/engine/__tests__/calculate.test.ts -t "tax"` | No -- Wave 0 |
| CALC-EMPTY | Empty people array returns empty results | unit | `npx vitest run src/engine/__tests__/calculate.test.ts -t "no people"` | No -- Wave 0 |
| STORE-ADD | addPerson/addItem actions produce correct state | unit | `npx vitest run src/store/__tests__/billStore.test.ts -t "add"` | No -- Wave 0 |
| STORE-REMOVE | removePerson cleans up item assignments | unit | `npx vitest run src/store/__tests__/billStore.test.ts -t "remove"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` -- Vitest configuration file
- [ ] `src/engine/__tests__/calculate.test.ts` -- core calculation tests (TDD-first)
- [ ] `src/engine/__tests__/distribute.test.ts` -- largest-remainder distribution tests
- [ ] `src/store/__tests__/billStore.test.ts` -- store action tests
- [ ] Framework install: `npm install -D vitest`
- [ ] Project scaffold: `npm create vite@latest` with react-ts template

## Sources

### Primary (HIGH confidence)
- npm registry -- verified versions: zustand 5.0.12, vitest 4.1.0, vite 8.0.0, react 19.2.4, typescript 5.9.3, tailwindcss 4.2.2
- [Zustand v5 migration guide](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5) -- API changes, TypeScript typing, useShallow
- [Vitest configuration docs](https://vitest.dev/config/) -- setup and config file patterns
- [Vitest 4.1 release notes](https://vitest.dev/blog/vitest-4-1) -- Vite 8 support confirmed
- [Largest remainder method (Wikipedia)](https://en.wikipedia.org/wiki/Largest_remainder_method) -- algorithm definition

### Secondary (MEDIUM confidence)
- [Vitest + React Testing Library setup guides](https://dev.to/pacheco/configure-vitest-with-react-testing-library-5cbb) -- verified against multiple community sources
- [Largest remainder JS implementation](https://gist.github.com/scwood/e58380174bd5a94174c9f08ac921994f) -- reference implementation

### Tertiary (LOW confidence)
- None -- all findings verified against primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified against npm registry on 2026-03-18
- Architecture: HIGH -- patterns drawn from project's own ARCHITECTURE.md research, cross-referenced with Zustand v5 official docs
- Pitfalls: HIGH -- floating-point arithmetic and rounding distribution are well-established computer science; verified against project PITFALLS.md
- Calculation engine design: HIGH -- algorithm is well-documented (Wikipedia, multiple implementations)

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable domain, 30-day validity)
