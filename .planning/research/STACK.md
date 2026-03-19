# Technology Stack

**Project:** Expense Splitter
**Researched:** 2026-03-18
**Research Mode:** Ecosystem

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
| --- | --- | --- | --- |
| React | 19.x (19.2 latest as of Oct 2025) | UI rendering and component model | Largest ecosystem, best tooling, React 19 brings first-class Actions and useOptimistic for snappy UI — valuable for real-time bill recalculation. Create React App is officially dead; Vite + React 19 is the current standard. |
| TypeScript | 5.x | Type safety | Currency arithmetic and bill-splitting logic are bug-prone without types. Floating-point rounding errors surface immediately at compile time when types are enforced. Zero runtime cost. |

**Confidence: HIGH** — React 19.2 stable confirmed via react.dev/blog (October 1, 2025). TypeScript 5.x is universal in the ecosystem.

### Build Tool

| Technology | Version | Purpose | Why |
| --- | --- | --- | --- |
| Vite | 6.x | Dev server, bundler, static build output | Officially recommended by React docs for scratch builds (react.dev/learn/build-a-react-app-from-scratch). Fastest cold start and HMR of any current option. Produces static files deployable to any CDN. No server required. |

**Confidence: HIGH** — Vite recommendation confirmed via official React documentation. Parcel and Rsbuild are valid alternatives but have smaller ecosystems for React.

### State Management

| Technology | Version | Purpose | Why |
| --- | --- | --- | --- |
| Zustand | 5.x | Global app state (bill items, people, tip/tax settings) | The bill data model is a single shared state tree that multiple components read and mutate (add person, add item, assign item, recalculate totals). Zustand is the current community consensus for this pattern: no boilerplate, works outside React (useful for pure calculation logic), and trivial to test. React Context + useReducer is a viable alternative but becomes painful with nested updates. |

**Confidence: MEDIUM** — Zustand's dominance in 2025/2026 is training-data-based; official npm page was not accessible. Zustand v5 released in late 2024 with React 19 compatibility confirmed via community sources. Flag: verify `npm info zustand version` before project start.

### Styling

| Technology | Version | Purpose | Why |
| --- | --- | --- | --- |
| Tailwind CSS | 4.x (4.1+ recommended) | Utility-first styling, mobile-first responsive design | Confirmed v4.1 stable as of April 3, 2025 (tailwindcss.com/blog). New Vite plugin integration (`@tailwindcss/vite`) replaces PostCSS config — cleaner setup than v3. No `tailwind.config.js` needed. The zero-runtime approach is ideal for a static app. Mobile-first breakpoint system (`sm:`, `md:`) directly matches the project's "used at the table on phones" requirement. |

**Confidence: HIGH** — Tailwind CSS v4.1 confirmed via official blog. Vite plugin integration confirmed via tailwindcss.com/docs/installation.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
| --- | --- | --- | --- |
| React Compiler | 1.0 (stable Oct 2025) | Automatic memoization of components | Add during setup. Eliminates manual `useMemo`/`useCallback` for calculation-heavy components. Confirmed stable with React 17+ compatibility. Production-tested at Meta with 12% performance improvement. |
| Vitest | 2.x | Unit testing | Required for bill-splitting math. Floating-point arithmetic for tip/tax splitting MUST be tested. Use with `@testing-library/react` for component tests. |
| @testing-library/react | 16.x | Component testing | Test item assignment flows and total calculation rendering. |

**Confidence (React Compiler): HIGH** — Stable v1.0 confirmed via react.dev blog (October 7, 2025).
**Confidence (Vitest/Testing Library): MEDIUM** — Version numbers from training data; verify before use.

---

## Deployment

| Platform | Why |
| --- | --- |
| Cloudflare Pages (recommended) | Free tier, global CDN, deploys from git push, handles SPA routing with `_redirects` file. Since the app is used at the table on phones, edge-cached delivery worldwide matters for load time. |
| Netlify (alternative) | Same static hosting story, also free tier. Slightly simpler `_redirects` config for SPA fallback. |
| GitHub Pages (fallback) | Free, zero-config for public repos, but no edge CDN and SPA routing requires a workaround (404.html trick). |

**Confidence: MEDIUM** — Cloudflare Pages SPA routing and free tier are well-documented in training data but not verified against current docs in this session (page access was restricted). Netlify and GitHub Pages are stable platforms with longstanding SPA support.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
| --- | --- | --- | --- |
| Framework | React 19 + Vite | Next.js | Next.js adds SSR complexity for no benefit — this is a client-side-only app with no server, no SEO requirements. The React docs explicitly note that "if your app has no constraints that these frameworks solve well, you might be better off with Vite." |
| Framework | React 19 + Vite | SvelteKit | Svelte has better bundle size, but the React ecosystem is required for React Compiler, and the team familiarity assumption for most web developers favors React. |
| Framework | React 19 + Vite | Preact | Preact's ~3kb vs React's ~45kb is irrelevant at this scale. Preact compatibility layer adds edge cases. React Compiler won't work. |
| State | Zustand | Redux Toolkit | RTK is 10x more boilerplate for the same result. Appropriate for teams with Redux history or very complex async workflows. Neither applies here. |
| State | Zustand | React Context + useReducer | Viable for small apps but deeply nested updates (assigning an item to multiple people) cause re-renders of unrelated components. Zustand's selector model solves this cleanly. |
| Styling | Tailwind CSS v4 | CSS Modules | CSS Modules require more files and context-switching. Tailwind's utility classes collocate styles with markup — better for rapid mobile UI iteration. |
| Styling | Tailwind CSS v4 | styled-components / Emotion | CSS-in-JS adds a runtime cost and bundle overhead. No benefit for a static app. Both are also declining in adoption as Tailwind dominates. |
| Build Tool | Vite | Parcel | Parcel is a valid choice but has a smaller plugin ecosystem and less community documentation for the React + TypeScript + Tailwind combo. |
| Build Tool | Vite | Rsbuild | Rsbuild is newer (Rspack-based, faster than webpack), valid option, but less mature ecosystem than Vite for this stack in 2025/2026. |

---

## Installation

```bash
# Scaffold with Vite using React + TypeScript template
npm create vite@latest expense-splitter -- --template react-ts
cd expense-splitter

# Tailwind CSS v4 via Vite plugin
npm install tailwindcss @tailwindcss/vite

# State management
npm install zustand

# React Compiler (build-time optimizer)
npm install -D babel-plugin-react-compiler

# Testing
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

**vite.config.ts additions:**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    tailwindcss(),
  ],
})
```

**src/index.css:**
```css
@import "tailwindcss";
```

---

## What NOT to Use

| Technology | Reason to Avoid |
| --- | --- |
| Create React App | Officially deprecated February 2025. Dead project, do not use. |
| Redux / Redux Toolkit | 10x boilerplate for zero benefit at this app's complexity. Zustand is the current standard for non-Next.js React apps. |
| CSS-in-JS (styled-components, Emotion) | Runtime cost, larger bundle, declining ecosystem. Tailwind v4 covers all styling needs. |
| React Router (for this app) | This is a single-view app. No routing library needed. All state lives in a single page. |
| Backend / database | Explicitly out of scope. All logic runs client-side. No persistence needed. |
| Next.js | SSR/SSG complexity with zero benefit. This is a pure CSR static app. |

---

## Sources

| Source | Confidence | URL |
| --- | --- | --- |
| React 19 stable announcement | HIGH | https://react.dev/blog/2024/12/05/react-19 |
| React 19.2 release (React blog) | HIGH | https://react.dev/blog (fetched 2026-03-18) |
| React official build tool recommendations | HIGH | https://react.dev/learn/build-a-react-app-from-scratch |
| Create React App deprecation | HIGH | https://react.dev/learn/installation |
| Tailwind CSS v4.1 stable release | HIGH | https://tailwindcss.com/blog (fetched 2026-03-18) |
| Tailwind CSS v4 Vite installation | HIGH | https://tailwindcss.com/docs/installation |
| React Compiler v1.0 stable release | HIGH | https://react.dev blog (fetched via react.dev/blog/2025/04/21/react-compiler-rc) |
| Zustand v5 current version | MEDIUM | Training data + community sources — verify with `npm info zustand version` |
| Vite 6.x current version | MEDIUM | Implied by React docs recommendation; exact version not fetched — verify with `npm info vite version` |
| Deployment platforms | MEDIUM | Training data — not verified against current docs in this session |
