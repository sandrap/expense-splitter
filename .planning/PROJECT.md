# Expense Splitter

## What This Is

A mobile-first web app for splitting restaurant bills fairly among friends. Users add people, enter receipt items, assign who had what (including shared dishes), and get a clear per-person breakdown with itemized detail. Designed to be used at the table — no install required, just open a link.

## Core Value

Every person pays exactly what they owe — no more, no less — even when shared appetizers, different tip preferences, and tax make it complicated.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Add people to the bill (names)
- [ ] Add receipt items with prices
- [ ] Assign items to individuals or split among a chosen subset
- [ ] Mark items as shared across everyone
- [ ] Set tip as a single percentage for the whole bill, split proportionally
- [ ] Allow each person to set their own tip percentage
- [ ] Handle tax with same flexibility (bill-wide or per-person)
- [ ] Show final per-person totals
- [ ] Show expandable itemized breakdown per person (what they had, their tip, their tax)

### Out of Scope

- Native mobile app (iOS/Android) — web-first covers the use case without the complexity
- User accounts / saving sessions — single-use per meal, no persistence needed
- Payment integration (Venmo, etc.) — show what's owed, not how to pay
- Bill scanning / OCR — manual entry for v1

## Context

- Used at the table in the moment — speed of entry matters
- Phones are the primary device — touch-friendly UI required
- No backend needed — all calculation logic runs client-side
- The "messy reality" this solves: shared appetizers that don't divide evenly per person, and friends who tip differently based on service

## Constraints

- **Tech stack**: Web-based (React or similar), no native mobile framework
- **Deployment**: Static hosting friendly (no server required)
- **Performance**: Instant calculation updates as user enters data

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Mobile-first web over native app | Same use case, fraction of the complexity | — Pending |
| Client-side only, no backend | Bill splitting needs no persistence or auth | — Pending |
| Support both bill-wide and per-person tip/tax | Users have different preferences at the table | — Pending |

---
*Last updated: 2026-03-18 after initialization*
