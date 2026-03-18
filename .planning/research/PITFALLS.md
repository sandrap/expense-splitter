# Domain Pitfalls: Expense Splitter / Bill Splitting App

**Domain:** Mobile-first restaurant bill splitting web app
**Researched:** 2026-03-18
**Confidence note:** WebSearch and external docs were unavailable during this research session. All findings draw on established JavaScript/frontend engineering knowledge (training cutoff August 2025). Floating-point behavior, IEEE 754, and money arithmetic patterns are stable, well-documented subjects — confidence is HIGH for those sections. Mobile UX and product pitfalls are MEDIUM (based on widely-documented patterns in the domain).

---

## Critical Pitfalls

Mistakes that cause incorrect totals, rewrites, or complete loss of user trust.

---

### Pitfall 1: Floating-Point Arithmetic for Money

**What goes wrong:** Using JavaScript's native `number` type (IEEE 754 double-precision float) for all currency math. `0.1 + 0.2 === 0.30000000000000004`. A $12.33 item split three ways yields `4.110000000000001` per person. Totals that should sum to the receipt total are off by a penny or more. Users see `$47.9999999998` on screen.

**Why it happens:** It's the default. Developers reach for `parseFloat()` on input values and add them directly. The error is invisible in simple cases and only surfaces with specific price combinations and split counts.

**Consequences:**
- Per-person totals don't add up to the bill total — creates distrust
- Rounding for display masks the underlying error but doesn't fix it — the hidden error accumulates across shared-item splits
- If rounding each person's share independently, the sum of rounded shares can differ from the rounded total by one cent — users notice

**Prevention:**
- Work in integer cents throughout all calculation logic. Convert: `Math.round(parseFloat(input) * 100)` on input, divide back only at display time.
- Never display the raw float; always format with `toFixed(2)` after rounding to the nearest cent.
- Use the "largest remainder method" (also called Hamilton method) when distributing a shared item: compute the floor of each person's share in cents, then distribute the leftover cent(s) one-by-one to the people with the largest fractional remainders. This guarantees the sum of shares equals the item price — exactly.

**Detection / warning signs:**
- Any calculation that produces `$X.9999...` or `$X.0000...1` in the UI
- Unit tests that compare `total === sum(perPersonTotals)` fail by one cent on specific inputs like `$10.00 / 3`
- `0.1 + 0.2 !== 0.3` in the browser console — run this sanity check in early development

**Phase to address:** Foundation / core calculation engine — before any UI is built. Retrofit is painful.

---

### Pitfall 2: Rounding Distribution Leaves Cents Unaccounted

**What goes wrong:** Each person's share of a shared item is individually rounded to two decimal places. The sum of those rounded values does not equal the item price. On a $10.00 item split 3 ways: `$3.33 + $3.33 + $3.33 = $9.99`. A penny disappears. At the end, the receipt total and the sum of what everyone owes differ.

**Why it happens:** Developers round each sub-share in isolation without checking that the parts sum to the whole.

**Consequences:**
- The bill total and the sum of per-person totals diverge — impossible to reconcile with the receipt
- Even small discrepancies destroy confidence ("your app is wrong")

**Prevention:**
- Implement the largest remainder method for every distribution operation: compute integer-cent shares, assign floor values, then add the remainder cents one at a time to the people with the highest fractional part.
- Write a unit test asserting: `sum(personShares) === itemTotalCents` for every item split scenario including 3-way, 7-way, and splits of odd-cent amounts.

**Detection:** A test that splits a $10.00 item among 3 people and checks that the three shares sum to exactly 1000 cents.

**Phase to address:** Core calculation engine, same phase as Pitfall 1.

---

### Pitfall 3: Wrong Order of Operations for Tip and Tax

**What goes wrong:** Applying tip/tax to the wrong subtotal, or applying them in the wrong order. Tip is conventionally calculated on the pre-tax subtotal (food items only), not on `subtotal + tax`. Applying tip to `subtotal + tax` inflates the bill. Applying tax after tip instead of independently of tip is also wrong in most jurisdictions.

**Why it happens:** The developer picks an order without thinking about restaurant convention or jurisdiction. "Just multiply the total by tip%" seems correct but isn't.

**Consequences:**
- Over-charges users (tip on tax, or tip applied to tax-inflated total)
- Per-person tip amounts don't match what they'd compute manually
- When users have different tip percentages, the order matters more: each person's tip must be computed on their own pre-tax share, not on the post-tax amount

**Prevention:**
- Establish explicit calculation order: `itemSubtotal → tax (on subtotal) → tip (on subtotal, not on subtotal+tax) → total = subtotal + tax + tip`
- For per-person tip: `person.tip = person.itemSubtotal * person.tipRate`. Tax is proportional to `person.itemSubtotal / billSubtotal`.
- Document the formula in code comments. This is a business logic decision — write it down once and don't let it drift.

**Detection:**
- Manual spot-check: enter a $10.00 item, 10% tax, 20% tip. Expected: tax = $1.00, tip = $2.00, total = $13.00. If tip comes out $2.20 (20% of $11), order is wrong.

**Phase to address:** Core calculation engine. The formula must be locked in before building tip/tax UI controls.

---

### Pitfall 4: Shared Item Split UX Becomes Unusable

**What goes wrong:** The UI for assigning who shares a given item requires too many taps. Common mistakes: a full-screen modal per item, no "select all" shortcut, no visual confirmation of assignment state. Users at a restaurant table — noisy environment, bright sunlight, time pressure — abandon item-by-item assignment and just split the bill evenly, defeating the app's core value proposition.

**Why it happens:** Developers design for the happy path (2-3 people, clean splits) without stress-testing with 6 people and 12 items.

**Consequences:**
- The most valuable feature (accurate per-item assignment) goes unused
- Perception that the app is slower than mental math

**Prevention:**
- Treat each item row as a tap target that expands inline — avoid full-screen modals for assignment
- Default state for a new item: assigned to everyone (shared). Users remove people who didn't have it, rather than adding everyone who did — fewer taps for the majority case.
- Provide a visual chip/avatar per person that toggles on/off inline. Visible assignment state without opening anything.
- Test the critical path: add 6 people, enter 8 items, assign each to a subset. Time yourself. Target: under 90 seconds for this scenario.

**Detection:**
- Usability test with someone who didn't design it — watch where they hesitate or make errors
- Count taps required to assign a shared appetizer to 4 of 6 people. If it exceeds 6 taps, simplify.

**Phase to address:** UI/UX design phase, before implementing item assignment interaction. Prototype the tap flow before coding it.

---

### Pitfall 5: Per-Person Tip Percentage UI Creates Confusion

**What goes wrong:** The app offers both "one tip for everyone" and "each person sets their own tip." If the mode-switching UI is ambiguous, users accidentally leave someone on the default when they intended to set a custom rate — or they set a custom rate for one person and don't realize others are still on the group default.

**Why it happens:** Two modes feel simple in a settings panel but are confusing in a bill context where the person entering data is thinking about food, not UI state.

**Consequences:**
- Silent errors: one person gets a 20% tip applied when they wanted 0% (they didn't like the service)
- Totals that surprise users who thought the split was already final

**Prevention:**
- Make the current tip mode for each person visually unambiguous in the final summary: show `Tip: 18% (shared)` vs `Tip: 20% (custom)` in the per-person breakdown.
- Default to one shared tip percentage. Make per-person override a deliberate action with clear labeling.
- When a user switches from shared to per-person mode, show all people's tip rates simultaneously so they can verify each one.

**Detection:**
- Walk through the scenario: 5 people, 3 use shared tip 18%, 2 set custom. Check the summary screen — is it immediately obvious which mode each person is in?

**Phase to address:** Tip/tax feature implementation phase.

---

## Moderate Pitfalls

---

### Pitfall 6: Tax Proportionality Assumption Breaks for Mixed Items

**What goes wrong:** Tax is applied as a flat percentage of each person's subtotal. This works only if all items are taxed at the same rate. In many US states, food items and alcohol are taxed differently (or alcohol is not taxed at the food rate). If someone orders alcohol and others don't, distributing tax proportionally by subtotal overcharges the non-drinkers and undercharges the drinkers.

**Why it happens:** Simplifying assumption — one tax rate for the whole bill.

**Consequences:**
- Inaccurate splits for bills that include alcohol, where tax treatment differs

**Prevention:**
- For v1 (scope as defined in PROJECT.md), document the limitation: "Tax is distributed proportionally by subtotal share. Does not account for per-item tax rate differences."
- If per-item tax rates become a requirement, the data model must store a tax rate per item, not just a bill-level rate. Design the data model with this extensibility in mind even if the feature isn't built in v1.

**Detection:** A bill with both food ($10, taxed at 8%) and alcohol ($10, taxed at 10%). Confirm the total tax on receipt matches what the app computes.

**Phase to address:** Core data model design (v1 scope note); defer full per-item tax as post-MVP.

---

### Pitfall 7: Input Validation for Edge Cases Crashes Calculations

**What goes wrong:** Users enter $0.00 items, negative prices (they type a minus sign), non-numeric input, or add an item but assign it to zero people. Division by zero or NaN propagates silently through all downstream totals.

**Why it happens:** Developers test the happy path. Edge-case inputs are an afterthought.

**Consequences:**
- `NaN` appears in the final breakdown, completely breaking trust
- `Infinity` appears if an item is divided among 0 people

**Prevention:**
- Validate on input: price must be a positive number greater than zero
- Guard every division: `if (assignedCount === 0) return 0` — don't divide
- Run a `isFinite()` and `!isNaN()` check on every calculated value before rendering
- An item assigned to nobody should display a warning ("No one assigned") rather than calculating

**Detection:** Enter $5.00, assign to 0 people. Enter "-5" as a price. Enter "abc". Check that no NaN or error appears in totals.

**Phase to address:** Input handling, first phase that introduces item entry.

---

### Pitfall 8: State Management Complexity Grows Faster Than Expected

**What goes wrong:** The app has interdependent state: people list, items list, item-to-person assignments, tip mode (shared vs per-person), per-person tip rates, tax mode. When any one of these changes, multiple derived values must recompute. Ad-hoc state management (scattered `useState` + prop drilling) becomes a tangled mess once all features are present simultaneously.

**Why it happens:** Each feature is added incrementally; state is designed locally per feature without a global model.

**Consequences:**
- Stale calculations after an edit (the person name changes but their tip rate isn't updated)
- Hard-to-debug update bugs: changing a tip rate doesn't re-trigger the summary total
- Refactoring cost is high once all state is intertwined

**Prevention:**
- Define the complete state shape before writing calculation logic. All calculation functions should be pure: `calculate(state) → breakdown`. No side effects in calculations.
- Use a single reducer or store for the entire bill state (React `useReducer` or Zustand). Never derive totals in component render functions — compute them once from the canonical state.
- Treat the app as: state → pure calculation → display. Keep these three layers cleanly separated.

**Detection:**
- If you have more than three `useEffect` hooks that update state based on other state, you have a state management problem.
- If changing a person's name requires updating it in more than one place in state, the model is denormalized incorrectly.

**Phase to address:** Architecture / state design phase — must be settled before building features, not after.

---

### Pitfall 9: Mobile Keyboard Obscures Input Fields

**What goes wrong:** On mobile, the virtual keyboard covers the bottom half of the screen. Price input fields near the bottom of a list are hidden behind the keyboard. Users can't see what they're typing, or the focused field scrolls out of view.

**Why it happens:** Desktop-first development. The issue is invisible until tested on a real phone.

**Consequences:**
- Users miss typos they can't see
- Confusing experience that makes the app feel broken

**Prevention:**
- Test on a real phone (not just Chrome DevTools mobile emulation) from the first UI prototype
- Use `scrollIntoView()` on input focus, or CSS `scroll-padding-bottom` to ensure the focused field is always above the keyboard
- Keep price input fields near the top of each item row, not the bottom
- Avoid positioning critical UI (Save/Done buttons) at the bottom of the screen where they'll be obscured

**Detection:** Open the app on a real phone. Add 5 items. Tab through the price fields. Can you always see the field you're typing in?

**Phase to address:** First mobile UI implementation sprint. Fix immediately, not at polish stage.

---

### Pitfall 10: "Edit After Final Review" Is Not Supported

**What goes wrong:** Users reach the summary/breakdown screen and realize they made an error (wrong price, missing person). If there's no way to go back and edit without losing all data, they have to start over. At a restaurant table this is unacceptable.

**Why it happens:** Developers build a linear wizard flow (step 1 → step 2 → step 3 → done) without non-linear navigation.

**Consequences:**
- Any data entry error forces a full restart
- Trust is lost: "this app lost my work"

**Prevention:**
- Treat the app as a single continuous view, not a wizard. All data (people, items, assignments, tip, summary) is visible or quickly reachable at any time.
- Edits to any field immediately update the summary — reactive calculation, no "recalculate" button.
- Do not gate the summary behind a "Finish" action. Show a live summary as data is entered.

**Detection:** Enter a full bill with 4 people and 6 items. Navigate to the summary. Go back and change a price. Does the summary update? Can you do this without losing other data?

**Phase to address:** Navigation/information architecture decision — must be made before building any flow. Single-page reactive model vs wizard.

---

## Minor Pitfalls

---

### Pitfall 11: Currency Symbol and Locale Assumptions

**What goes wrong:** The app hardcodes `$` and assumes two decimal places. International users (or users on non-US locale devices) see wrong formatting, or `Intl.NumberFormat` produces unexpected output.

**Prevention:** Use `Intl.NumberFormat` for display formatting but keep all internal arithmetic in integer cents. If locale detection is too complex for v1, hardcode USD and document it as a known limitation.

**Phase to address:** Display/formatting layer — low priority for v1, but don't let formatting logic bleed into calculation logic.

---

### Pitfall 12: No Visual Confirmation That All Items Are Assigned

**What goes wrong:** A user forgets to assign one item. It either gets silently skipped from totals, or silently falls to "everyone." Neither is communicated.

**Prevention:** Show a count of unassigned items prominently. Display a warning in the summary if any item has no assignees.

**Phase to address:** Item list UI and summary screen.

---

### Pitfall 13: Tip Entry Accepts Invalid Values Silently

**What goes wrong:** User types "200" for tip percentage (200%) or leaves it blank. The app either allows a ludicrous tip or treats blank as 0% without telling the user.

**Prevention:** Validate tip percentage: range 0–100 (or with a soft warning above 50%). Treat empty as 0% but show a placeholder that makes the default obvious.

**Phase to address:** Tip/tax input components.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Core calculation engine | Floating-point errors (Pitfall 1, 2) | Work in integer cents from day one; write unit tests before any UI |
| Tip/tax formula | Wrong operation order (Pitfall 3) | Lock in formula in comments/docs before building controls |
| Item assignment UI | Too many taps, modal overload (Pitfall 4) | Prototype the tap flow; test with 6 people before coding |
| Per-person tip mode | Silent mode confusion (Pitfall 5) | Make current tip mode visible in summary screen |
| Data model design | Tax rate extensibility (Pitfall 6) | Design item model to support per-item tax rate, even if unused in v1 |
| Input handling | NaN/division-by-zero (Pitfall 7) | Validate inputs; guard all divisions; test edge cases early |
| State architecture | Tangled reactive state (Pitfall 8) | Define full state shape and pure calculation layer before feature work |
| First mobile UI sprint | Keyboard occlusion (Pitfall 9) | Test on a real phone immediately; use scrollIntoView on focus |
| Navigation/IA | No edit-after-review path (Pitfall 10) | Choose reactive single-page model over wizard from the start |

---

## Sources

- IEEE 754 floating-point behavior in JavaScript: well-documented in the ECMAScript specification and MDN
- Largest remainder method for proportional rounding: standard algorithm in financial/voting software literature (Hamilton method)
- `Intl.NumberFormat` API: MDN Web Docs (stable, HIGH confidence)
- Mobile keyboard occlusion patterns: documented in iOS and Android web developer guides (MEDIUM confidence — specific behavior varies by OS version)
- Tip/tax calculation conventions: US restaurant industry standard practice (MEDIUM confidence — convention, not law)
- All pitfalls based on training data (cutoff August 2025); external search was unavailable during this session. Recommend validating Pitfalls 4, 5, 9, 10 against community post-mortems (e.g., Hacker News "Show HN" threads for bill-splitting apps) when search access is available.
