# ADR 0003 — Browser shell dependencies

**Status:** accepted (2026-10-31).
**Depends on:** [ADR 0001](0001-functional-ts.md), [ADR 0002](0002-ui-framework.md).
**Supersedes:** the stack note in [tech-notes.md](../tech-notes.md) §2, which named Zustand and Tailwind before they were installed.

---

## Context

ADR 0002 chose React + Vite and kept the dependency surface deliberately open. `tech-notes.md` named Zustand for the store and Tailwind for styling, but that line was a preference, not a ratified decision. The UI phase is the first time both are load-bearing.

Three constraints come from the existing rules:

1. **The UI is a projection.** `render(state)` + `dispatch(action)`. The store is a shell; the rules stay in `src/sim`.
2. **The verification gate is headless.** The pre-commit hook runs `typecheck`, `test` and `docs:check`, with no browser. The interesting UI failures are action sequences, not pixels.
3. **Density is the product.** A 15-hero roster, eight attributes, a projection strip and three party cards cannot be laid out with default component spacing.

## Decision

| Package | Version | Role |
|---|---|---|
| `react` / `react-dom` | 19.3.1 | Shell only. No game rule in a component. |
| `vite` | 8.3.5 | Client-only build and dev server. |
| `zustand` | 5.0.16 | One store: game state, action log, UI state. Selector subscriptions, no provider tree. |
| `tailwindcss` + `@tailwindcss/vite` | 4.3.3 | Utility layout plus a design-token layer in `@theme`. No config file. |
| `@vitejs/plugin-react` | 6.1.2 | JSX and Fast Refresh. |
| `@types/react` / `@types/react-dom` | 19.3.x | Types only. |

No component library, no drag library, no chart library, no form library, no DOM testing library.

## Alternatives rejected

- **Redux Toolkit.** More ceremony than one game state needs, and the reducer is already a pure function in `store/actions.ts`. Zustand gives selector subscriptions without actions/types/store boilerplate.
- **Jotai / Valtio / React Context.** Context re-renders every consumer on every game action; the roster, Hall and War Room all read the same large object. Jotai is a good fit for many small atoms, not one immutable game state. Valtio's proxies would hide the pure reducer that the tests use.
- **CSS modules / hand-written CSS only.** Workable, and the design tokens would be the same. Tailwind's utility layer is faster for the one-off dense layouts (`grid-cols`, spacing, responsive variants); the component classes still live in one stylesheet. Rejected because it slows the first pass, not because it is wrong.
- **A component library (shadcn/Radix/MUI).** Every dense table, tab and meter would be restyled anyway; it adds surface without saving the work that matters.
- **dnd-kit for party slots.** The first pass uses click-to-fill and click-to-swap. Drag needs hit-testing, keyboard fallback and a placement rule; it is a measured follow-up, not a dependency to carry before it is used.
- **React Testing Library / jsdom.** The rules are in `applyAction` and the save file; both run in Node. A DOM test would assert React's rendering, not the game. The screens were exercised with a headless-Chrome CDP script during the build; that script is a throwaway, not a dependency.
- **Next.js.** No SSR, no routing, no server. Vite is smaller and the sim is client-only ([ADR 0001](0001-functional-ts.md)).

## Consequences

- **Measured cost:** 402.08 kB JS / 120.25 kB gzip, 32.00 kB CSS / 7.44 kB gzip, 73 modules, 0.68 s production build. This is the shell, not the game logic; no new game rule ships in the bundle.
- **Testability:** the action reducer and the save file have 11 headless tests. The UI itself has no DOM test, so a React-only regression can pass the gate; the CDP pass is the manual guard until that changes.
- **Store shape:** one `useGameStore` with game state, action log and UI state. UI state is deliberately not saved. If a second concurrent guild ever ships (open question D7), the store needs slices; the reducer does not change.
- **Styling:** Tailwind 4 has no `tailwind.config.js`. Tokens live in `src/app/styles.css` under `@theme`; changing the palette is one file.
- **Accessibility:** the custom components are labelled and keyboard-reachable, but no automated accessibility audit is wired. That is accepted for the vertical slice; it is not accepted for a public surface.

## What would change this

- A measured need for drag-and-drop: add dnd-kit (or the CDK if the framework ever changed) with a keyboard path.
- A second store concern (multi-save, async): split the store, keep `applyAction` unchanged.
- A real accessibility gate: add axe + a DOM runner as a separate test project; do not mix it into the sim's suite.
