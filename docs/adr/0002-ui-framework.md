# ADR 0002 — UI framework (React vs Angular)

**Status:** **accepted** (2026-10-30) — React + Vite. The Angular plan is kept below as a contingency.
**Date:** 2026-10-30
**Depends on:** [ADR 0001](0001-functional-ts.md)

---

## Context

Two facts frame this, and they're both good news:

1. **The framework only owns the shell.** [ADR 0001](0001-functional-ts.md) puts the simulation behind a pure `resolveDay(state, plan, rng)`. The UI is a renderer over immutable state plus a `dispatch` call. Swapping frameworks later changes ~75% of the *files* but ~0% of the *logic* — and, critically, none of the risky part.
2. **The risky part needs no framework at all.** Phase 0 is the headless sim + CLI. It is pure Node. By the time we need a UI, we will know whether the game is fun — and you will have had a month of Angular at work.

That means this decision is genuinely deferrable, which is unusual and worth exploiting.

### The real question

This is not "which framework is better". Both are fine. It is:

> **Is this project primarily a product (ship the MVP fast), or also a learning vehicle (practice Angular for work)?**

Those pull in opposite directions and no amount of benchmarking resolves it.

---

## Option comparison, for this specific project

| Criterion (weighted by what we're building) | React | Angular 22 | Notes |
|---|---|---|---|
| **Your fluency** | ●●●●● expert | ●●○○○ learning | The single biggest factor in a solo MVP |
| **Data-dense tables** | TanStack Table | TanStack Table + Angular adapter | Wash |
| **Party board drag & drop** | dnd-kit | **@angular/cdk/drag-drop** | Slight edge Angular — CDK's drag-drop is excellent and first-party |
| **Forms (signing, contracts)** | react-hook-form + zod | **Signal Forms (stable in v22)** | Slight edge Angular — typed, signal-based, less assembly |
| **Modal/drawer primitives** | Radix / Base UI | CDK Overlay / Dialog | React's ecosystem is larger and better designed |
| **Animation / juice** | framer-motion / CSS | CSS / Angular animations | React is stronger |
| **Routing, DI, structure** | assemble it | built in | Angular reduces setup decisions |
| **Bundle & dev speed** | very fast (Vite) | good, slower | React ahead, not decisive at this scale |
| **Hiring/help/AI familiarity** | enormous | large | Practical for a hobby project with agent assistance |
| **Career value for you** | none new | **real** | The honest argument for Angular |

Angular is **not** the tired enterprise framework of 2019 any more. Angular 22 (Aug 2026) ships **stable Signal Forms, OnPush by default, and zoneless change detection**, with standalone components replacing NgModules ([InfoQ](https://www.infoq.com/news/2026/08/angular-v22-released/)). In several places it is now a *better* fit for a dense management UI than React: built-in DI, typed signal-based forms, and CDK's drag-drop for the War Room board.

So: no technical blocker either way. The decision is about velocity and intent.

---

## Decision

**React + Vite.** Chosen on 2026-10-30 for velocity and ecosystem; the two-day spike was not needed.

Rationale as written when proposed:

Rationale:

- **Velocity is the MVP's binding constraint.** The success criterion is *"three screens are fun before we polish anything"* — that's iteration speed, and expertise is the main input to iteration speed.
- **The ecosystem is where the game's risky UI lives**: drag-and-drop, virtualised dense tables, drawers, comboboxes, animation. React has more of it, better maintained.
- **Your Angular practice has a better venue**: your job. A side project is an expensive classroom — every hour spent learning Angular's forms API is an hour not spent discovering that the wipe report isn't readable.
- **The decision is cheap to revisit** because of the pure core. Rebuilding the shell is real work, but it is *known* work with no hidden logic — unlike rebuilding the sim.

### What would change this

If you tell me the project is **also** a deliberate Angular learning vehicle, I'd switch fully rather than half-heartedly, and I'd plan it as:

| Concern | Angular 22 plan |
|---|---|
| Components | standalone, `OnPush`, no NgModules |
| State | signals + a small `GameStore` service; `computed` for the projection strip |
| Forms | Signal Forms (signing, contracts) |
| Table | TanStack Table (Angular adapter) or a hand-rolled `@for` grid |
| Drag & drop | `@angular/cdk/drag-drop` — better than anything React has for this specific screen |
| Overlays | CDK Dialog / Overlay |
| Async | RxJS only at the edges; the sim stays synchronous and pure |
| Testing | Vitest (Angular supports it now) + Angular Testing Library |
| Risk | ~20–30% slower UI phase; you'll be learning while building |

That is a perfectly buildable plan. It costs a few weeks of momentum, and buys you a real second skill. For some projects that's the right trade — only you can price it.

### Why not something else

- **Svelte 5 / Solid** — both lovely and both *faster to write* than either option, but they trade away your React expertise for a smaller ecosystem, and neither helps your job. No.
- **Vue** — a reasonable middle, but same objection: no expertise, no career payoff.
- **No framework / vanilla** — a data-dense app with a drag layer, drawers and modals would be a hand-rolled component library. No.

---

## Consequences

Whichever way it goes, two things are locked in and framework-independent:

1. **`src/sim/**` stays pure TS** with zero framework imports (enforced by `dependency-cruiser`). The framework never sees the rules.
2. **The UI is a projection of state**: `render(state)` + `dispatch(action)`. No business logic in components, no state mutation outside the store, no derived numbers computed twice in two places — the projection strip, the roster "Power" column and the wipe report all call the same pure functions.

Not doing #2 is how a management game ends up with three different implementations of "how good is this hero", which is the single most common way these projects rot.

---

## Recommendation

Finish **Phase 0** first — the CLI is framework-free and is where the product risk actually lives. Then decide with a month of Angular behind you. If you want to force the issue earlier, the cheapest test is a **one-day spike**: build the Roster table + Hero drawer in both, and compare how it felt. That's a genuinely informative experiment and a sunk cost of two days.
