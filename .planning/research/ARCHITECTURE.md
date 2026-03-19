# Architecture Patterns

**Domain:** Client-side bill splitting web app
**Researched:** 2026-03-18
**Confidence:** HIGH (well-established React SPA patterns; no novel or experimental dependencies)

---

## Recommended Architecture

A single-page React application with a centralized state store. All business logic lives in a pure calculation layer, completely decoupled from UI components. No backend. No persistence. State is ephemeral per session.

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (SPA)                        │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │                  UI Layer (React)                  │  │
│  │                                                    │  │
│  │  PeoplePanel   ItemsPanel   ResultsPanel          │  │
│  │       │             │            │                │  │
│  │       └─────────────┴────────────┘                │  │
│  │                     │                             │  │
│  └─────────────────────┼─────────────────────────────┘  │
│                        │ dispatch / read                  │
│  ┌─────────────────────┼─────────────────────────────┐  │
│  │              State Layer (Zustand)                 │  │
│  │                     │                             │  │
│  │   people[]    items[]    billSettings             │  │
│  └─────────────────────┼─────────────────────────────┘  │
│                        │ inputs                          │
│  ┌─────────────────────▼─────────────────────────────┐  │
│  │           Calculation Engine (pure functions)      │  │
│  │                                                    │  │
│  │   calculatePersonTotal()   applyTipAndTax()       │  │
│  │   splitSharedItems()       buildBreakdown()       │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Data Models

### Person

```typescript
interface Person {
  id: string;          // uuid
  name: string;        // display name
  tipMode: 'bill'      // uses bill-wide tip percentage
         | 'custom';  // has own tip percentage
  tipPercent: number;  // used when tipMode === 'custom'
  taxMode: 'bill'      // uses bill-wide tax percentage
         | 'custom';
  taxPercent: number;
}
```

### Item

```typescript
interface Item {
  id: string;
  description: string;
  price: number;           // total price of the item
  splitMode: 'assigned'    // divided among specific people
           | 'shared';    // divided among everyone present
  assignedTo: string[];    // Person IDs; empty means all (when splitMode === 'shared')
}
```

### Bill Settings (top-level)

```typescript
interface BillSettings {
  defaultTipPercent: number;   // bill-wide default
  defaultTaxPercent: number;   // bill-wide default
  tipMode: 'bill' | 'per-person';
  taxMode: 'bill' | 'per-person';
}
```

### App State (store root)

```typescript
interface AppState {
  people: Person[];
  items: Item[];
  settings: BillSettings;
}
```

### Derived: Per-Person Result (computed, never stored)

```typescript
interface PersonResult {
  personId: string;
  name: string;
  itemLines: {
    itemId: string;
    description: string;
    shareAmount: number;   // this person's portion of the item price
  }[];
  subtotal: number;
  tipAmount: number;
  taxAmount: number;
  total: number;
}
```

`PersonResult` is never stored in state — it is derived fresh from `AppState` on every render via a selector or `useMemo`. This is the most important architectural constraint: **results are always computed, never cached in state**.

---

## Component Boundaries

| Component | Responsibility | Reads From | Writes To |
| --- | --- | --- | --- |
| `App` | Layout shell, routing between entry and results view | `people.length`, `items.length` | — |
| `PeoplePanel` | Add/remove/edit people, configure per-person tip/tax | `people[]`, `settings` | `people[]` |
| `PersonCard` | Single person's name, tip/tax settings | one `Person` | `people[]` via actions |
| `ItemsPanel` | Add/remove/edit receipt items, assign people | `items[]`, `people[]` | `items[]` |
| `ItemRow` | Single item, price, assignment picker | one `Item`, `people[]` | `items[]` via actions |
| `TipTaxPanel` | Bill-wide tip %, tax %, mode toggles | `settings` | `settings` |
| `ResultsPanel` | Per-person totals, expandable breakdowns | `PersonResult[]` (derived) | — |
| `PersonResult` | One person's total with expandable itemization | one `PersonResult` | — |
| `SummaryRow` | Grand total, sanity check vs receipt sum | all `PersonResult[]` | — |

**Key boundary rule:** `ResultsPanel` and all its children are read-only. They consume derived data only. They never dispatch mutations.

---

## Data Flow

Data flows in one direction. Mutations happen only through store actions.

```
User interaction
      │
      ▼
Store action (addPerson, updateItem, setTip, etc.)
      │
      ▼
AppState mutates (Zustand)
      │
      ▼
React re-renders affected components
      │
      ▼
ResultsPanel triggers calculation engine
      │
      ▼
PersonResult[] derived (pure function, no side effects)
      │
      ▼
Results rendered to screen
```

**No derived state is stored back into the store.** The calculation engine is a pure function: `calculateResults(AppState) → PersonResult[]`.

---

## Calculation Engine Architecture

The calculation engine is the core of the product. It must be isolated as pure functions with no React or store dependencies — this makes it independently testable.

### Calculation order (strict sequence)

```
1. Resolve each item's per-person share
   - For 'assigned' items: price / assignedTo.length per person
   - For 'shared' items: price / people.length per person

2. Sum subtotals per person
   - Aggregate all item shares for each person

3. Apply tax per person
   - If settings.taxMode === 'bill': each person's share = subtotal * (defaultTaxPercent / 100)
   - If settings.taxMode === 'per-person': use person.taxPercent

4. Apply tip per person
   - If settings.tipMode === 'bill': each person's share = subtotal * (defaultTipPercent / 100)
   - If settings.tipMode === 'per-person': use person.tipPercent

5. Build PersonResult for each person
   - itemLines, subtotal, taxAmount, tipAmount, total
```

### Floating point handling

Currency arithmetic must use integer math (cents) or a decimal library. Do NOT use floating-point arithmetic for money calculations.

```typescript
// Correct: work in cents
const priceInCents = Math.round(item.price * 100);
const shareInCents = Math.floor(priceInCents / assignees.length);
const remainderCents = priceInCents - (shareInCents * assignees.length);
// Assign remainder cents to first person in list (deterministic)
```

This is a critical correctness constraint and should be baked into the calculation engine from day one.

---

## Patterns to Follow

### Pattern 1: Derived results via selector, not stored state

**What:** `PersonResult[]` is computed inline via a selector function or `useMemo`, not stored in Zustand.

**When:** Every render that needs results.

**Example:**
```typescript
// In ResultsPanel
const results = useBillStore(state => calculateResults(state));
```

**Why:** Prevents stale derived state, eliminates synchronization bugs between input state and result state.

---

### Pattern 2: Store actions are the only mutation path

**What:** All state changes go through named Zustand actions. No component calls `setState` on raw data.

**When:** Any user interaction that changes people, items, or settings.

**Example:**
```typescript
const { addPerson, updateItem, removePerson } = useBillStore();
```

**Why:** Makes state transitions traceable; enables easy undo if needed later.

---

### Pattern 3: Item assignment as ID arrays, not object references

**What:** `Item.assignedTo` holds `Person.id[]`, not Person object references.

**When:** Modeling assignments.

**Why:** Prevents stale reference bugs. When a person is removed, the calculation engine gracefully skips missing IDs (or the store action cleans them up).

---

### Pattern 4: Shared vs assigned items as a first-class enum

**What:** `Item.splitMode` is an explicit `'shared' | 'assigned'` field, not inferred from empty `assignedTo`.

**When:** Modeling items.

**Why:** Prevents ambiguity between "not yet assigned" and "shared among everyone." These are distinct states with different calculation behavior.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing computed totals in state

**What:** Saving `personTotal` or `personTip` fields on the `Person` object.

**Why bad:** Creates synchronization problem — input data and derived data can diverge. Any time items change, you must remember to recompute and persist totals. This is a perpetual source of bugs.

**Instead:** Compute totals fresh on every render from raw inputs.

---

### Anti-Pattern 2: Floating-point arithmetic for money

**What:** Using `item.price / assignees.length` directly in JavaScript.

**Why bad:** `0.1 + 0.2 === 0.30000000000000004`. A $30.00 appetizer split 3 ways shows $9.999999999... for the first person.

**Instead:** Integer cent arithmetic throughout the calculation engine. Convert to display strings only at render time.

---

### Anti-Pattern 3: Tight coupling between ItemRow and PersonCard

**What:** Having `ItemRow` directly import or call `PersonCard` state, or vice versa.

**Why bad:** Item editing and person editing are independent concerns. Coupling them makes both harder to refactor.

**Instead:** Both panels read from the same store independently. `ItemsPanel` reads `people[]` only to render the assignment picker — it does not own or mutate person state.

---

### Anti-Pattern 4: One monolithic component

**What:** Building the entire UI in a single `App.tsx` with inline state.

**Why bad:** Unmanageable at any size beyond prototype. Assignment logic, tip settings, and results rendering all in one file = impossible to test or iterate.

**Instead:** Follow component boundary table above. Each panel owns its own display concerns.

---

## Component Build Order (dependency sequence)

Build in this order — each phase depends on what came before:

```
Phase 1: Data foundation
  └── AppState types + Zustand store (people, items, settings)
  └── Calculation engine as pure functions (no React yet)
  └── Unit tests for calculation engine

Phase 2: People management
  └── PeoplePanel + PersonCard
  └── Add/remove/edit names
  └── (Tip/tax per-person settings can come later)

Phase 3: Item entry + assignment
  └── ItemsPanel + ItemRow
  └── Add/remove/edit items
  └── Assignment picker (who had this?)
  └── Shared flag

Phase 4: Tip and tax settings
  └── TipTaxPanel
  └── Bill-wide default percentages
  └── Per-person mode toggle

Phase 5: Results display
  └── ResultsPanel (read-only, pure derived data)
  └── PersonResult with expandable breakdown
  └── SummaryRow (grand total, sanity check)

Phase 6: Polish
  └── Mobile layout refinement
  └── Touch targets, keyboard handling
  └── Edge cases (empty state, one person, etc.)
```

**Why this order:**
- Calculation engine before UI means you can verify math correctness independently before any component exists
- People before items because items reference people IDs
- Items before results because results require items
- Tip/tax panel is independent of people and items but feeds the calculation — can be built in parallel with Phase 3
- Results last because they depend on all other state being correct

---

## Scalability Considerations

This is a single-session, single-device tool. Scalability concerns are narrow:

| Concern | At typical use (2-10 people, 5-20 items) | At stress (50 people, 200 items) |
| --- | --- | --- |
| Calculation performance | Instant, no concern | Still fast — O(people * items) |
| Re-render frequency | Fine with basic React memoization | May need `useMemo` on results selector |
| State size | Trivial | Still trivial for in-memory |
| Bundle size | Keep it lean — no heavy libs needed | N/A |

The only genuine scalability concern is **floating-point correctness at scale** (more items = more accumulated rounding error). Integer cent arithmetic resolves this permanently.

---

## Sources

- React unidirectional data flow: well-established, HIGH confidence (core React model since 2013)
- Zustand as lightweight store: HIGH confidence based on documented patterns (zustand.docs.pmnd.rs)
- Integer arithmetic for currency: HIGH confidence — standard practice in financial software, documented in numerous resources including MDN floating point notes
- Component boundary recommendations: derived from project requirements analysis + standard SPA decomposition patterns, HIGH confidence
- Calculation engine isolation (pure functions): standard functional architecture principle, HIGH confidence
