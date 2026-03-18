# Feature Landscape

**Domain:** Restaurant bill splitting web app (single-session, at-table use)
**Researched:** 2026-03-18
**Confidence note:** Web search and Bash tools were unavailable during this research session. All findings are drawn from training knowledge (knowledge cutoff August 2025) covering apps including Splitwise, Tab (now sunset), Plates, Billr, Venmo bill splitting, and iOS/Android native split-bill features. Confidence is noted per section. Validate differentiator claims against current app store landscape before finalizing roadmap.

---

## Table Stakes

Features users expect from any bill-splitting tool. Missing any of these causes immediate abandonment or frustration at the table.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Add multiple people to a bill | Core of the entire use case | Low | Names only — no accounts needed |
| Add line items with prices | Required to split by item | Low | Label + amount; quantity support is nice-to-have |
| Assign items to one or more people | The fundamental split mechanic | Medium | Must support subset assignment (not just "split equally") |
| Mark items as shared by everyone | Appetizers, bread, shared bottles | Low | "Everyone" shortcut avoids selecting all names manually |
| Automatic tax calculation (proportional) | Users read tax from receipt and expect it handled | Medium | Proportional to each person's subtotal is the standard |
| Automatic tip calculation | Almost every restaurant meal involves tip | Medium | Single % applied to subtotal, split proportionally |
| Per-person total display | The output everyone is waiting for | Low | Must be prominent — this is the goal of the whole flow |
| Itemized breakdown per person | Users want to verify the math | Medium | Collapsible/expandable per person — showing items + tax share + tip share |
| Mobile-friendly touch UI | Used on phones at the table | Medium | Large tap targets, no hover-dependent interactions |
| Instant recalculation | Entering data live; stale totals feel broken | Medium | Every input change recalculates immediately — no "Calculate" button |
| Handle uneven splits correctly | E.g. 3 people split a $10 item = $3.33/$3.33/$3.34 | Medium | Penny rounding must be deterministic and sum to total |

**Confidence: HIGH** — These are universally present in every bill-splitting tool reviewed.

---

## Differentiators

Features that are not universally present but provide meaningful value or competitive advantage. These move a tool from "adequate" to "recommended."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-person tip percentage | Friends who tip differently (10% vs 20%) — currently the #1 unmet need in most tools | Medium | Each person's tip applies only to their own subtotal; must be obvious in the UI |
| Per-person tax override | Some items are tax-exempt (e.g. to-go items in some states); power-user need | High | Edge case but signals attention to correctness; default is proportional, override is optional |
| Shareable link / session URL | One person enters the bill, others open the same session to verify their amount | High | Requires state serialization to URL or minimal backend; eliminates "read me your total" friction |
| Item quantity field | A single line item ordered by 3 people — "Burger x3" at $15 each | Low | Small UX win that avoids entering the same item repeatedly |
| Rounding summary / transparency | Show the penny-rounding logic so people don't think the math is wrong | Low | Trust-building; "We added $0.01 to Person A to make totals sum exactly" |
| Running total as you assign items | Show "unassigned items: $12.50" so user knows when they're done | Medium | Reduces the "did I forget anything?" anxiety |
| Copy/share per-person amounts | "Send to group chat" — one tap to copy "Alice: $18.42, Bob: $23.10" | Low | Completes the workflow; without this users screenshot the screen |
| No-install, link-to-open entry | Open in browser, no app store required | Low (for web) | Decisive advantage over native apps for one-time use at a table |
| Dark mode | Low-light restaurants — dark screens are less disruptive | Low | CSS media query; expected by 2026 but not universal in smaller tools |
| Coupon / discount line item | Apply a discount to the bill before splitting | Low | Common use case (Groupon, loyalty discounts, restaurant comp) |

**Confidence: MEDIUM** — Per-person tip and per-person tax are confirmed absent in most consumer tools as of training data. Shareable link is present in some tools (e.g. Tab, prior to sunset) but not universal.

---

## Anti-Features

Features to deliberately NOT build for this product. These add complexity without serving the core at-table use case.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| User accounts / login | Adds friction, not needed for single-session use — users abandon sign-up flows at the table | Use session-in-URL or anonymous local state |
| Persistent bill history | Increases infrastructure complexity with near-zero user demand for this use case | Stateless — each bill is ephemeral |
| Payment processing / Venmo/PayPal integration | Legal, compliance, and API complexity; users already have payment apps | Show amounts owed, not facilitate payment |
| OCR / receipt scanning | v1 trap — high complexity, unreliable results on crumpled receipts in dim lighting, adds delay | Manual entry is faster than fixing OCR errors at the table |
| Ongoing expense tracking (Splitwise-style) | Different problem domain — adds data model and UI complexity that conflicts with the simple at-table flow | Out of scope: recommend Splitwise for roommates/trips |
| Multi-currency | Edge case; adds UI complexity, requires live FX rates | Single currency per session is sufficient |
| Analytics / usage dashboards | No user accounts means no meaningful analytics surface area | Skip entirely |
| Native iOS / Android app | App store review delays, install friction, no advantage over web for single-session use | PWA is acceptable; full native is not worth the cost |
| Split-by-percentage mode | "Split 60/40" — sounds useful but creates arguments about what percentage is fair; item-based splitting is more objective | Item assignment solves this more fairly |
| Group management / contact import | Pre-populating names from contacts is not worth the permissions request for a one-time session | Manual name entry is faster |

**Confidence: HIGH** — Each of these is listed as "out of scope" in the project brief or represents a well-documented complexity trap in the bill-splitting domain.

---

## Feature Dependencies

```
Names → Item assignment (can't assign items without people)
Item assignment → Per-person totals (totals require complete assignment)
Item assignment → Tax calculation (proportional tax needs subtotals)
Item assignment → Tip calculation (proportional tip needs subtotals)
Per-person tip % → Tip calculation (override replaces flat % for that person)
Per-person totals → Itemized breakdown (breakdown is a view on top of totals)
Per-person totals → Copy/share feature (nothing to share until totals are computed)
Shareable URL → URL state serialization (URL sharing requires all state encoded)
```

---

## MVP Recommendation

The minimum feature set that makes this tool genuinely useful at the table (not embarrassing to hand to a friend).

**Prioritize:**
1. Add people (names)
2. Add line items with prices
3. Assign items to individuals or any subset
4. "Split among everyone" shortcut for shared items
5. Tip as single bill-wide percentage, split proportionally
6. Tax as single bill-wide amount or percentage, split proportionally
7. Per-person totals prominently displayed
8. Expandable itemized breakdown per person
9. Per-person tip percentage (this is the stated differentiator in the project brief — build it in MVP, not later)

**Defer to v2:**
- Shareable URL: High complexity (state serialization or backend), not blocking core value
- Copy/share formatted text: Low complexity, but not blocking — add in v1.1
- Item quantity field: Nice-to-have, low complexity, but not blocking correctness
- Coupon/discount line: Common but not blocking core use case
- Dark mode: CSS-only, can be added any time

**Do not build (ever):**
- Everything in the Anti-Features table

---

## Notes on Per-Person Tip and Tax

This is the feature that distinguishes this app from competitors. Most at-table bill splitters (including the native iOS split-the-bill shortcut) support only a single tip percentage applied uniformly. The scenario this solves:

- Alice tips 20% (regular), Bob tips 10% (budget trip), Carol tips 15%
- Shared appetizer ($20) split 3 ways = $6.67 each
- Alice's tip on her $6.67 share = $1.33; Bob's = $0.67; Carol's = $1.00
- Each person's final total reflects their own preference, not a compromise

The calculation: `person_total = person_subtotal + (person_subtotal * person_tax_rate) + (person_subtotal * person_tip_rate)`

This makes the math more complex than a single-rate model. Per the project brief, tax must have the same flexibility. The UI challenge is presenting per-person tip/tax rates without overwhelming first-time users who just want a simple even split — consider defaulting to bill-wide rates with an "advanced" toggle.

---

## Sources

- Project brief: `/Users/sandrap/Downloads/gsd-module-test/.planning/PROJECT.md`
- Domain knowledge from training data (cutoff August 2025): Splitwise, Tab (Divvy), Plates, Billr, iOS 17 split-the-bill Shortcuts, Google Pay bill split
- Web and Bash research tools were unavailable for this session; external verification not performed
- Confidence levels reflect training-data-only basis — validate differentiator claims before finalizing roadmap
