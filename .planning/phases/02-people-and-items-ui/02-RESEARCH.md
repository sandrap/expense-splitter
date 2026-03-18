# Phase 2: People and Items UI - Research

**Researched:** 2026-03-18
**Domain:** React component development, mobile-first form handling, Tailwind CSS v4, Zustand integration
**Confidence:** HIGH

## Summary

Phase 2 builds the primary input surface for the expense splitter: adding/editing/removing people, adding/editing/removing receipt items, and assigning items to people via inline tap-toggle chips. The foundation layer (Phase 1) already provides TypeScript interfaces (`Person`, `Item`), a Zustand store with all CRUD actions (`addPerson`, `removePerson`, `updatePerson`, `addItem`, `removeItem`, `updateItem`), and a tested calculation engine. The UI layer consumes these directly.

The core technical challenges are: (1) Tailwind CSS v4 must be installed and configured (it is NOT yet in the project), (2) inline editing for names and prices needs clean controlled-input patterns, (3) the chip-toggle assignment UI must be tap-friendly on mobile (minimum 44px touch targets), and (4) unassigned items need clear visual flagging. No third-party component libraries are needed -- all UI is achievable with Tailwind utility classes on native HTML elements.

**Primary recommendation:** Install Tailwind CSS v4 + `@tailwindcss/vite`, install `@testing-library/react` + `@testing-library/user-event` for component tests, then build components in dependency order: PeoplePanel first (no dependencies on items), then ItemsPanel with assignment chips (depends on people existing).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PEOPLE-01 | User can add a person to the bill by entering their name | Store has `addPerson(name)`. Build `PeoplePanel` with text input + add button. |
| PEOPLE-02 | User can remove a person from the bill | Store has `removePerson(id)` which also cleans up item assignments. Build delete button on `PersonRow`. |
| PEOPLE-03 | User can edit a person's name after adding them | Store has `updatePerson(id, { name })`. Build inline-edit pattern on `PersonRow`. |
| ITEMS-01 | User can add a receipt item with a name and price | Store has `addItem(description, priceInCents)`. Build `ItemsPanel` with description input + price input + add button. Parse dollar input to cents on submission. |
| ITEMS-02 | User can edit or delete an item after adding it | Store has `updateItem(id, updates)` and `removeItem(id)`. Build inline-edit and delete on `ItemRow`. |
| ITEMS-03 | User can assign an item to one or more specific people | Store has `updateItem(id, { assignedTo, splitMode: 'assigned' })`. Build inline person-chip toggles on each `ItemRow`. |
| ITEMS-04 | User can mark an item as shared among a chosen subset of people | Store has `updateItem(id, { assignedTo: [...ids], splitMode: 'shared' })`. Shared mode with specific people = subset sharing. UI: toggle between shared/assigned mode, then pick people. |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| React | 19.2.4 | UI rendering | Installed |
| TypeScript | 5.9.3 | Type safety | Installed |
| Zustand | 5.0.12 | State management | Installed |
| Vite | 8.0.0 | Build tool | Installed |
| Vitest | 4.1.0 | Unit testing | Installed |

### To Install
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| tailwindcss | 4.2.2 | Utility-first CSS | Mobile-first styling, no config file needed in v4 |
| @tailwindcss/vite | 4.2.2 | Vite integration | First-party plugin, replaces PostCSS config |
| @testing-library/react | 16.3.2 | Component testing | Test user interactions (add person, assign item) |
| @testing-library/user-event | 14.6.1 | Simulated user events | Type in inputs, click buttons, toggle chips |
| @testing-library/jest-dom | 6.9.1 | DOM matchers | `toBeInTheDocument()`, `toHaveClass()` assertions |

### Not Needed
| Library | Why Not |
|---------|---------|
| Any chip/tag component library | Chips are trivial with Tailwind -- a button with `rounded-full` and conditional bg color |
| React Hook Form | Overkill for 2-field inline forms; plain controlled inputs suffice |
| Headless UI / Radix | No modals, dropdowns, or complex widgets needed in this phase |
| React Router | Single-page app, no navigation |

**Installation:**
```bash
npm install tailwindcss @tailwindcss/vite
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

## Architecture Patterns

### Component Structure for Phase 2
```
src/
  components/
    PeoplePanel.tsx        # People section: list + add form
    PersonRow.tsx           # Single person: name display/edit + delete
    ItemsPanel.tsx          # Items section: list + add form
    ItemRow.tsx             # Single item: description, price, assignment chips
    AssignmentChips.tsx     # Inline person-toggle chips for an item
  utils/
    formatCents.ts          # Convert cents to "$X.XX" display string
    parseDollars.ts         # Convert "$X.XX" string input to integer cents
  store/
    billStore.ts            # (exists) Zustand store
  engine/
    calculate.ts            # (exists) Calculation engine
    distribute.ts           # (exists) Distribution helpers
  types/
    models.ts               # (exists) TypeScript interfaces
```

### Pattern 1: Controlled Input with Inline Edit

**What:** Person names and item descriptions display as text, switch to an input on click/tap, and save on blur or Enter.

**When to use:** For PEOPLE-03 and ITEMS-02 (edit after adding).

**Example:**
```typescript
// Inline edit pattern - no library needed
function InlineEdit({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <span
        onClick={() => setEditing(true)}
        className="cursor-pointer hover:bg-gray-100 rounded px-1"
      >
        {value}
      </span>
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { onSave(draft); setEditing(false); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { onSave(draft); setEditing(false); }
        if (e.key === 'Escape') { setDraft(value); setEditing(false); }
      }}
      className="border rounded px-1 py-0.5 text-sm"
    />
  );
}
```

### Pattern 2: Inline Chip Toggle for Person Assignment

**What:** Each item row shows one chip per person. Tapping a chip toggles that person on/off for the item. No modal, no dropdown.

**When to use:** For ITEMS-03 and ITEMS-04.

**Example:**
```typescript
// Chip toggle for assigning people to an item
function AssignmentChips({
  people,
  assignedTo,
  onToggle,
}: {
  people: Person[];
  assignedTo: string[];
  onToggle: (personId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {people.map((person) => {
        const isAssigned = assignedTo.includes(person.id);
        return (
          <button
            key={person.id}
            onClick={() => onToggle(person.id)}
            className={`
              min-h-[44px] min-w-[44px] px-3 py-1.5
              rounded-full text-sm font-medium
              transition-colors
              ${isAssigned
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }
            `}
          >
            {person.name}
          </button>
        );
      })}
    </div>
  );
}
```

### Pattern 3: Zustand Selector Usage (Prevent Re-renders)

**What:** Use fine-grained selectors to read only the state each component needs.

**When to use:** Every component that reads from the store.

**Example:**
```typescript
// Good: fine-grained selectors
const people = useBillStore((state) => state.people);
const addPerson = useBillStore((state) => state.addPerson);

// Good: selecting a derived value
const hasUnassignedItems = useBillStore((state) =>
  state.items.some(
    (item) => item.splitMode === 'assigned' && item.assignedTo.length === 0
  )
);

// Bad: destructuring entire store (causes re-render on any state change)
// const { people, items, addPerson } = useBillStore();
```

### Pattern 4: Dollar-to-Cents Input Parsing

**What:** Users type dollars (e.g., "12.50"). The store expects integer cents (1250). Parse on form submit, not on every keystroke.

**When to use:** Every price input (ITEMS-01, ITEMS-02).

**Example:**
```typescript
// parseDollars.ts
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[$,]/g, '').trim();
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

// formatCents.ts
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
```

### Pattern 5: Unassigned Item Visual Flagging

**What:** Items with `splitMode === 'assigned'` and `assignedTo.length === 0` get a visual warning.

**When to use:** For success criterion 5 -- unassigned items are visually flagged.

**Example:**
```typescript
const isUnassigned = item.splitMode === 'assigned' && item.assignedTo.length === 0;

// In JSX:
<div className={`border rounded-lg p-3 ${isUnassigned ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200'}`}>
  {isUnassigned && (
    <span className="text-xs text-amber-600 font-medium">Not assigned to anyone</span>
  )}
</div>
```

### Anti-Patterns to Avoid

- **Modals for assignment:** The success criteria explicitly say "no modal required." Use inline chip toggles.
- **Storing formatted prices in state:** Store integer cents only. Format at render time.
- **Reading entire store in every component:** Use selectors. Destructuring the whole store causes cascade re-renders.
- **Building a separate "edit mode" page:** All editing happens inline. No wizard flow.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS framework | Custom utility classes | Tailwind CSS v4 | Pre-built responsive utilities, dark mode, mobile-first |
| Component test harness | Manual DOM queries | @testing-library/react + user-event | Accessibility-first queries, realistic user simulation |
| UUID generation | Custom ID generator | `crypto.randomUUID()` | Already used in store, built into all modern browsers |
| Currency formatting | Custom toFixed logic | `formatCents()` helper + `Intl.NumberFormat` if needed | Edge cases with locale, negative values |

## Common Pitfalls

### Pitfall 1: Price Input Loses Cents Precision
**What goes wrong:** User types "12.5" meaning $12.50 but `parseFloat("12.5") * 100` yields 1250 which is correct -- however "12.555" yields 1255.5 and `Math.round` makes it 1256 cents. The real danger is inputs like "0.1" + "0.2" in accumulated calculations.
**Why it happens:** Parsing happens at multiple points inconsistently.
**How to avoid:** Parse to cents exactly once at form submission using `Math.round(parseFloat(input) * 100)`. Store only integer cents. Never parse cents back to float for math.
**Warning signs:** Prices that don't round-trip cleanly through display/edit cycles.

### Pitfall 2: Removing a Person Orphans Item Assignments
**What goes wrong:** User removes a person but items still reference their ID in `assignedTo`.
**Why it happens:** Forgetting to clean up cross-references.
**How to avoid:** Already handled -- `removePerson` in the store cleans up `assignedTo` arrays. Verify this in tests.
**Warning signs:** Ghost chips showing "[undefined]" in the assignment list.

### Pitfall 3: Shared vs Assigned Mode Confusion in UI
**What goes wrong:** User doesn't understand the difference between "shared" and "assigned." They set an item to "assigned" but don't pick anyone, so it gets skipped in calculation.
**Why it happens:** The distinction is engine-level but must be communicated visually.
**How to avoid:** Default new items to `splitMode: 'shared'` (already done in store). Show "Split equally among everyone" as the default state. Only show assignment chips when user explicitly switches to assign specific people. Flag unassigned items visually (amber warning).
**Warning signs:** Users confused why an item doesn't show up in anyone's total.

### Pitfall 4: Mobile Keyboard Covers Price Input
**What goes wrong:** On iOS, the virtual keyboard pushes the viewport up or covers inputs near the bottom.
**Why it happens:** Desktop-first testing misses this entirely.
**How to avoid:** Use `inputMode="decimal"` on price fields to get the numeric keyboard. Keep add-item forms near the top of their section. Use `scrollIntoView({ behavior: 'smooth', block: 'center' })` on focus. Test on a real phone.
**Warning signs:** Users can't see what they're typing in price fields.

### Pitfall 5: Tailwind v4 Setup Differs from v3
**What goes wrong:** Developer follows v3 tutorials: creates `tailwind.config.js`, adds `@tailwind base; @tailwind components; @tailwind utilities;` directives.
**Why it happens:** Most tutorials online are for v3.
**How to avoid:** Tailwind v4 uses `@import "tailwindcss"` in CSS and the `@tailwindcss/vite` plugin. No config file. No PostCSS config. No `@tailwind` directives.
**Warning signs:** Tailwind classes not applying; config file being created unnecessarily.

## Code Examples

### Tailwind CSS v4 Setup (verified via official docs)

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

**src/index.css** (replace existing content):
```css
@import "tailwindcss";
```

No `tailwind.config.js` needed. No `postcss.config.js` needed.

### Vitest Component Test Setup

**vitest.config.ts** (update existing):
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/test-setup.ts'],
    passWithNoTests: true,
  },
});
```

**src/test-setup.ts** (new file):
```typescript
import '@testing-library/jest-dom/vitest';
```

### Component Test Example: Adding a Person

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PeoplePanel } from '../components/PeoplePanel';
import { useBillStore } from '../store/billStore';

beforeEach(() => {
  useBillStore.setState({ people: [], items: [], settings: { defaultTipPercent: 18, defaultTaxPercent: 0 } });
});

test('adds a person when name is submitted', async () => {
  const user = userEvent.setup();
  render(<PeoplePanel />);

  await user.type(screen.getByPlaceholderText(/name/i), 'Alice');
  await user.click(screen.getByRole('button', { name: /add/i }));

  expect(screen.getByText('Alice')).toBeInTheDocument();
});
```

### App Layout Shell

```typescript
// App.tsx replacement structure
function App() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="p-4 text-center border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold">Split the Bill</h1>
      </header>
      <main className="max-w-lg mx-auto p-4 space-y-6">
        <PeoplePanel />
        <ItemsPanel />
      </main>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 with PostCSS + config file | Tailwind v4 with `@tailwindcss/vite` plugin, no config | Jan 2025 (v4.0) | Simpler setup, no config file, `@import "tailwindcss"` replaces `@tailwind` directives |
| `@tailwind base; @tailwind components; @tailwind utilities;` | `@import "tailwindcss";` | Jan 2025 (v4.0) | Single import replaces three directives |
| Manual `useMemo`/`useCallback` | React Compiler auto-memoization | Oct 2025 (RC stable) | Not installed in this project yet; can add later in Phase 4 polish |
| `jest` + `@testing-library/react` | `vitest` + `@testing-library/react` | 2024 | Vitest is already set up; just need to add testing-library packages |

## Open Questions

1. **Tailwind CSS dark mode strategy**
   - What we know: Tailwind v4 supports `dark:` variant by default using `prefers-color-scheme`. Phase 4 success criteria requires dark mode.
   - What's unclear: Whether we need class-based dark mode toggle or just `prefers-color-scheme`.
   - Recommendation: Use `prefers-color-scheme` (automatic) for now. Phase 4 can add a manual toggle if needed.

2. **Empty state UX for zero people**
   - What we know: The calculation engine handles zero people (returns empty results).
   - What's unclear: What the items panel should show when no people exist yet (can't assign anyone).
   - Recommendation: Show items panel always, but disable/hide assignment chips when people list is empty. Show a hint: "Add people first to assign items."

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` (exists, needs `environment: 'jsdom'` and `setupFiles` added) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PEOPLE-01 | Add person by name | component | `npx vitest run src/components/__tests__/PeoplePanel.test.tsx -t "add"` | Wave 0 |
| PEOPLE-02 | Remove person from bill | component | `npx vitest run src/components/__tests__/PeoplePanel.test.tsx -t "remove"` | Wave 0 |
| PEOPLE-03 | Edit person name | component | `npx vitest run src/components/__tests__/PeoplePanel.test.tsx -t "edit"` | Wave 0 |
| ITEMS-01 | Add item with name and price | component | `npx vitest run src/components/__tests__/ItemsPanel.test.tsx -t "add"` | Wave 0 |
| ITEMS-02 | Edit or delete item | component | `npx vitest run src/components/__tests__/ItemsPanel.test.tsx -t "edit\|delete"` | Wave 0 |
| ITEMS-03 | Assign item to people via chips | component | `npx vitest run src/components/__tests__/ItemRow.test.tsx -t "assign"` | Wave 0 |
| ITEMS-04 | Mark item as shared among subset | component | `npx vitest run src/components/__tests__/ItemRow.test.tsx -t "shared"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/test-setup.ts` -- jest-dom matchers setup file
- [ ] Update `vitest.config.ts` -- add `environment: 'jsdom'`, `setupFiles`, and `.tsx` includes
- [ ] `npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom` -- component test deps
- [ ] `npm install tailwindcss @tailwindcss/vite` -- styling deps
- [ ] Update `vite.config.ts` -- add tailwindcss plugin
- [ ] Replace `src/index.css` -- swap Vite default CSS for `@import "tailwindcss"`
- [ ] `src/components/__tests__/PeoplePanel.test.tsx` -- covers PEOPLE-01, PEOPLE-02, PEOPLE-03
- [ ] `src/components/__tests__/ItemsPanel.test.tsx` -- covers ITEMS-01, ITEMS-02
- [ ] `src/components/__tests__/ItemRow.test.tsx` -- covers ITEMS-03, ITEMS-04

## Sources

### Primary (HIGH confidence)
- Project source code: `src/types/models.ts`, `src/store/billStore.ts`, `src/engine/calculate.ts` -- verified existing interfaces and store actions
- `package.json` -- verified installed package versions (React 19.2.4, Zustand 5.0.12, Vite 8.0.0, Vitest 4.1.0)
- npm registry -- verified current versions: tailwindcss 4.2.2, @tailwindcss/vite 4.2.2, @testing-library/react 16.3.2, @testing-library/user-event 14.6.1, @testing-library/jest-dom 6.9.1
- [Tailwind CSS v4 Vite installation](https://tailwindcss.com/docs) -- official installation guide
- [Tailwind CSS v4.0 release blog](https://tailwindcss.com/blog/tailwindcss-v4) -- v4 migration details

### Secondary (MEDIUM confidence)
- [Zustand v5 selector best practices](https://github.com/pmndrs/zustand/discussions/2867) -- community discussion on selector patterns
- [React Testing Library + Vitest setup guides](https://dev.to/kevinccbsg/react-testing-setup-vitest-typescript-react-testing-library-42c8) -- multiple sources agree on jsdom + setupFiles pattern
- [React 19 form handling](https://react.dev/reference/react-dom/components/input) -- controlled input patterns

### Tertiary (LOW confidence)
- Mobile 44px touch target size -- based on WCAG 2.5.5 and Apple HIG training data, not verified against current docs in this session

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified against npm registry and project package.json
- Architecture: HIGH -- component structure follows established patterns from ARCHITECTURE.md and actual store API
- Pitfalls: HIGH -- pitfalls 1-3 verified against actual codebase; pitfall 4-5 based on well-documented patterns
- Tailwind v4 setup: HIGH -- verified via official docs and npm registry

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable ecosystem, 30-day window)
