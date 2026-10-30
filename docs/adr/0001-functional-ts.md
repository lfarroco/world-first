# ADR 0001 — Functional TypeScript, no FP library

**Status:** proposed
**Date:** 2026-10-30
**Deciders:** you + me

---

## Context

The game is a **pure turn-based state machine** with a data-dense UI. Two very different kinds of code:

| | Share of the work | Character |
|---|---|---|
| **The simulation** (`resolveDay`, checks, economy, rivals) | ~25% | Pure, deterministic, arithmetic, RNG, invariants. Bugs here are invisible and expensive |
| **The UI** (tables, drawers, modals, projection strip) | ~75% | Tree-shaped, event-driven, needs an ecosystem |

You want a functional style. Candidates considered: TypeScript with FP discipline, TypeScript + fp-ts, TypeScript + Effect, PureScript, ReScript, Elm.

The constraint that decides most of this: **the UI is three quarters of the code**, and the UI is where language ecosystems are won or lost. A language that makes the sim 20% nicer and the UI 40% slower is a bad trade.

---

## Decision

**TypeScript, strict, written functionally — with no FP library.**

No `fp-ts`, no `effect`, no `rxjs`. A ~120-line local prelude provides the four things we actually need. Everything else is native TS.

### Why not fp-ts / Effect

They solve problems we do not have.

- **fp-ts**'s value is composable type classes (`Monad`, `Traversable`) and a `pipe`-heavy style. For a game whose "effectful" surface is *one function that returns a new state plus a list of events*, the abstraction cost is real and the benefit is theoretical. Its `Either`/`Task` encodings are also more ceremonious than a discriminated union in current TS.
- **Effect** is genuinely good — structured concurrency, resources, DI, tracing. But it is a framework, it wants to own your program's spine, and our spine is a React app calling one pure function. Adopting it means teaching every future contributor (and every AI agent working in the repo) a large API to solve scheduling problems a turn-based game doesn't have.

Rule of thumb we're adopting: **adopt a library when it removes work, not when it expresses a philosophy.**

### Why not PureScript

PureScript is the language I'd pick if the sim *were* the product. Row types, exhaustive case matching, type classes, and real purity would suit a rules engine beautifully.

It loses on the other three quarters:

- **The UI.** PureScript's React story is `react-basic` (thin, less maintained) or Halogen (excellent, but its own component model with no React ecosystem). We would be hand-writing a data grid, a drawer, a combobox, a date picker and a drag layer in a language with a small library pool.
- **Tooling.** Spago instead of Vite/Next's plugin ecosystem; no HMR parity; a separate formatter/linter/CI story; slower onboarding for anyone else (or any agent) touching the repo.
- **Interop cost is permanent.** Every table, chart, or UI library we want is a FFI binding we maintain.

Verdict: **overkill for this project**, exactly as you suspected. If the sim grows into something worth isolating, we can port a pure module later — the architecture below keeps that door open, because the sim would already be a dependency-free pure function with explicit data types.

### Why not ReScript (the one I'd actually consider)

ReScript is the only alternative I'd seriously entertain: OCaml-ish semantics (variants, pattern matching, immutability by default), compiles to readable JS, first-class React bindings, Vite and Next templates, fast compiler, and `GenType` for generating TS types.

It costs: a second syntax in the repo, a smaller library/recipe pool, and weaker AI/editor familiarity than TS. That's acceptable for a solo project and *not* obviously better than TS+discipline for a project this size.

**If you want to explore it, the cheap experiment is: write the sim in ReScript, keep the UI in TS.** The boundary is a single function returning plain data, so it's a one-file seam. We can time-box that to a day later; nothing in this ADR blocks it.

### Why not Elm / ClojureScript / Rust+WASM

| Option | Why not |
|---|---|
| **Elm** | Lovely DX for UI, but effectively maintenance-mode, ports-based interop, and no escape hatch for the FFI we'll eventually want |
| **ClojureScript** | Beautiful data-oriented FP and a great fit for a rules engine — but untyped (spec is opt-in), niche tooling, and the data tables would be far less safe than discriminated unions |
| **Rust + WASM** | Solves a performance problem we don't have (a day resolves in ~microseconds); splits the codebase in two languages for no gain |
| **F#/OCaml/Haskell → JS** | Tooling friction in the browser, small ecosystems, no React story worth the trade |

---

## The functional subset we actually adopt

Five rules, enforced by review and lint rather than by a library:

| # | Rule | Why |
|---|---|---|
| 1 | **ADTs via discriminated unions**, matched exhaustively with a `never` check | This is 80% of what people mean by "algebraic data types", and TS does it natively |
| 2 | **Total functions in `sim/`** — never throw, return `Result<T, E>` | A thrown error inside a pure function destroys determinism and replay |
| 3 | **Immutable at the boundary** — the sim deep-clones its input and mutates the clone locally; callers can never observe mutation | Same guarantee as `readonly` types, without fighting spread updates on every nested change. Verified by a test, not by the compiler |
| 4 | **Effects at the edge** — the sim returns `events[]`; the shell interprets them (save, toast, navigate) | The 9-stage day pipeline already does this |
| 5 | **No ambient state in `sim/`** — no `Date.now`, no `Math.random`, no globals; time and RNG are parameters | Determinism, batch testing, replayable bug reports |

### What "functional" buys us here, concretely

Not monads. These four:

1. **Exhaustiveness.** Adding a new `AttentionKind` or `CheckType` produces a compile error at every place that must handle it. For a game that will grow content, this is the single most valuable property TS gives us.
2. **Purity at the core** → property-based testing with `fast-check` (invariants: fatigue ∈ [0,100], score monotone in bosses, no NaN), and 10,000-run balance sweeps in a script.
3. **State as data** → save = seed + action log; time travel, replay, and the "three moments that mattered" summary all read from one event stream.
4. **Total functions** → no exception paths in the sim means no "sometimes the day just doesn't resolve" class of bug.

### The prelude (~120 lines, `sim/prelude.ts`)

```ts
// Result — no exceptions in the sim
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok  = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// Exhaustiveness — the compile-time safety net
export const assertNever = (x: never): never => {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
};

// Pipe — one function, used sparingly; avoids method-chaining contortions
export const pipe = <A>(a: A, ...fns: ((x: any) => any)[]): any =>
  fns.reduce((acc, f) => f(acc), a);

// Branded ids — prevent HeroId/BossId mixups
export type Brand<T, B> = T & { readonly __brand: B };
export type HeroId = Brand<string, 'HeroId'>;
```

That's it. Everything else — `Option` as `T | null`, arrays, records — is native.

### Deliberately rejected

- **`fp-ts`/`effect`** — see above.
- **`ts-pattern`** — nice DX, but native `switch` + `assertNever` is zero-dependency and equally safe. Revisit if a three-way nested match appears.
- **Immer in the sim** — proxies and structural sharing are unnecessary at 26 heroes; measure before adding. (The Zustand store may use it for ergonomics; that's a shell concern.)
- **Class-based entities** — `Hero` is a plain readonly record. Methods come later only if they're pure.
- **`zod` in the sim** — but **do use it at the boundaries**: save-file loading and content validation (`BOSSES`, `ROLES`) get parsed once at load, so bad data fails loudly at the edge instead of producing NaN on day 12.

---

## Consequences

**Easier:** fast iteration, one language, Vite/React ecosystem, AI-agent familiarity, one test runner, no build-time codegen.

**Harder:** nothing enforces purity but review and a dependency rule — so we encode it mechanically:

```jsonc
// dependency-cruiser: sim/ may not import ui/, store/, app/, or node/platform modules
{
  "name": "sim-is-pure",
  "from": { "path": "^src/sim" },
  "to":   { "pathNot": "^(src/sim|node_modules/(?!zod))" },
  "severity": "error"
}
```

Plus a lint rule banning `Math.random` and `Date.now` outside `sim/rng.ts` and `app/clock.ts`. Those two rules are what keep "functional TS" from decaying into "TS with some pure functions" six weeks in.

**Revisit if:** the sim's complexity outgrows discriminated unions (unlikely), or we want a second implementation (e.g. a server-side authoritative sim) where a real FP language would pay for itself.

---

## One more decision this forces: Vite or Next?

Given the ADR, the game is **100% client-side** (click-driven, localStorage). Next.js buys SSR and a server we don't need, at the cost of a more complex mental model (RSC, route handlers, hydration).

Recommendation: **Vite + React + TS** for the game, with a static landing page later if we need one, and a small separate service if leaderboards ever go online. Next becomes the right answer only if we want server-rendered marketing pages in the same repo.

This is a change from the earlier "Next.js" assumption, and it simplifies the MVP.
