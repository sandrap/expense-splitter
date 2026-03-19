# Expense Splitter

## What This Is

A mobile-first web app for splitting restaurant bills fairly among friends. Users add people, enter receipt items, assign who had what (including shared dishes), set per-person tip rates, and get a clear per-person breakdown — updating live on every keystroke. Bills can be named, shared via URL, browsed in history, and each person gets a one-tap Venmo payment link. Designed to be used at the table on a phone, no install required.

## Core Value

Every person pays exactly what they owe — no more, no less — even when shared appetizers, different tip preferences, and tax make it complicated.

## Requirements

### Validated

- ✓ Add people to the bill by name, edit and remove them — v1.0
- ✓ Add receipt items with prices, edit and delete them — v1.0
- ✓ Assign items to one or more specific people using tap-toggle chips — v1.0
- ✓ Mark items as shared among a chosen subset (e.g. appetizer split between Sarah and Mike only) — v1.0
- ✓ Allow each person to set their own tip percentage (per-person override) — v1.0
- ✓ Handle tax as a single bill-wide percentage, split proportionally — v1.0
- ✓ Show final per-person totals, updating live on every keystroke — v1.0
- ✓ Show expandable itemized breakdown per person (what they had, tip, tax) — v1.0
- ✓ User can optionally name the bill (displayed in header, history, and shared URLs) — v1.1
- ✓ User can generate and copy a shareable URL encoding the full bill state — v1.1
- ✓ User can open a shared URL and have the full bill state loaded automatically — v1.1
- ✓ App auto-saves recent bills to localStorage as the bill is edited — v1.1
- ✓ User can browse recent bills in a history panel (showing name, date, total) — v1.1
- ✓ User can restore a past bill from history into the editor — v1.1
- ✓ Each person's result card shows a Venmo deep link button to request their share — v1.1
- ✓ Venmo button is hidden when a person owes $0.00 — v1.1

### Active

*(None — planning next milestone)*

### Out of Scope

- Native mobile app (iOS/Android) — web-first covers the use case; PWA if needed later
- User accounts / saving sessions — single-use per meal, no persistence needed beyond localStorage history
- Real-time multi-user collaboration — adds backend complexity; one person enters for the table
- Bill scanning / OCR — manual entry for v1; could revisit if user feedback demands it
- Bill-wide tip (single rate for all) — per-person override ships; bill-wide is a v2 candidate
- Multi-recipient Venmo batch request — requires recipient usernames; adds complexity
- Offline mode — client-side app already works offline (no network requests)

## Context

**Shipped v1.1 with 4,087 LOC TypeScript/TSX.**
Tech stack: Vite 8 + React 19 + TypeScript + Zustand 5 + Tailwind CSS v4 + Vitest 4 + lz-string 1.5.

**Architecture decisions proven:**
- Integer-cent arithmetic throughout — floating-point bugs are impossible by design
- Largest-remainder rounding ensures distributed shares always sum exactly to item total
- `useDraftCalculation` dual-track pattern (ephemeral drafts + Zustand store) enables live recalculation without coupling UI inputs to committed state
- Schema-versioned compact URL format (`v:1`) with lz-string compression — URLs survive all bill states
- Client-side only — no backend, static deployment (Cloudflare Pages or similar)
- Zustand subscribe pattern (with debounce) for localStorage auto-save — zero coupling to React render cycle

**Known tech debt:**
- `PersonResultCard` Escape key on tip edit deletes committed override instead of cancelling (medium) — from v1.0
- `PersonResultCard` tip commit missing `val <= 100` cap (low) — from v1.0
- Cloudflare Pages SPA routing: verify `_redirects` before first deploy
- Venmo mobile deep link: `buildVenmoUrl` uses `https://venmo.com/` web URL; native iOS/Android app launch behavior unverified in automated tests (low, one-line fix if format changes)
- Nyquist VALIDATION.md files for phases 5–7 have `nyquist_compliant: false` (drafted but not manually signed off)

## Constraints

- **Tech stack**: Vite + React + TypeScript (locked in)
- **Deployment**: Static hosting, no server required
- **Performance**: Instant calculation — `useDraftCalculation` hook, no Calculate button
- **Arithmetic**: Integer cents only — no floats in engine, ever

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Mobile-first web over native app | Same use case, fraction of the complexity | ✓ Good — works well on phone at table |
| Client-side only, no backend | Bill splitting needs no persistence or auth | ✓ Good — simple deploy, no infra |
| Integer-cent arithmetic | Floating-point rounding errors in money are unacceptable | ✓ Good — engine is provably correct |
| Largest-remainder rounding | Distributed shares must sum exactly to item total | ✓ Good — 12 edge-case tests pass |
| Per-person tip over bill-wide tip first | Most common pain point at restaurants | ✓ Good — bill-wide tip deferred to v2 |
| `useDraftCalculation` dual-track state | Live recalculation without committing partial input to store | ✓ Good — clean separation, optional callback props keep tests simple |
| Zustand v5 named import | v5 changed API vs v4 | ✓ Good — store tests use merge mode for stability |
| `Item.splitMode` as explicit enum | Avoid inferring from empty `assignedTo` (ambiguous) | ✓ Good — unambiguous in engine |
| Tax proportional by subtotal weight | Fairest distribution; matches how restaurants charge | ✓ Good — sum invariant guaranteed |
| Tailwind v4 `@import` only | v4 media dark mode enabled by default — no config needed | ✓ Good — dark mode works with zero extra code |
| lz-string for URL compression | Base64 alone produces ~2x longer URLs; lz-string gives ~60% compression | ✓ Good — URLs stay short even for large bills |
| Schema-versioned compact URL format (`v:1`) | Future-proof URL migration without breaking existing shared links | ✓ Good — v2 schema can coexist with v1 |
| `URLSearchParams` for Venmo URL construction | Manual string concat fails on special characters in bill names | ✓ Good — encoding edge cases handled automatically |
| VenmoButton reads `billName` from Zustand directly | No prop drilling through PersonResultCard | ✓ Good — matches established project pattern (ShareButton does the same) |
| `https://venmo.com/` URL over `venmo://` scheme | Native scheme does not work from web browsers | ✓ Good — triggers universal links on mobile, graceful fallback on desktop |
| Zustand subscribe + debounce for history auto-save | Zero coupling to React render cycle; no re-renders | ✓ Good — imperceptible performance impact |
| Session UUID for history dedup | Prevents creating duplicate entries on rapid edits | ✓ Good — stable history with no duplicate bills |

---
*Last updated: 2026-03-19 after v1.1 milestone*
