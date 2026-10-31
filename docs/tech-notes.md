# Technical notes

Short, opinionated, and only about things that constrain the design. No code yet.

---

## 1. The one architectural rule

```
resolveDay(state: GameState) -> GameState
advanceDay(state: GameState) -> GameState        // resolveDay + tickRivals
runWorld(state, personality) -> GameState        // advanceDay until the run ends
```

- **Pure per guild.** No IO, no `Date.now()`, no `Math.random()`. Everything in, everything out.
- **Deterministic.** Same `(state, plan, seed)` → identical output, forever.
- **Total.** Every consequence is expressed as `events` and `attention` — never as a side effect the UI has to guess at.

Everything else in the app is a shell around these functions. That gives us, for free:

| Benefit | Why it matters here |
|---|---|
| Replayable bug reports | `(seed, actionLog)` is the whole bug report |
| Batch balance testing | run 10,000 seasons in a script, tune by evidence |
| Cheap save/load | the save *is* the seed + the action log + a cache |
| Server migration later | the sim doesn't know where it runs |
| Agent-driven playtesting | a CLI can drive it without a browser |

**Enforcement:** a lint rule banning `Math.random` and `Date.now` outside `sim/rng.ts` and `app/clock.ts`. This is worth wiring on day one — it's five minutes and it prevents the entire "why doesn't my replay match" class of bug.

---

## 2. Stack

The language and FP approach are settled in [ADR 0001](adr/0001-functional-ts.md): **TypeScript, strict, written functionally, with no FP library.**

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript** (strict, `noUncheckedIndexedAccess`) | The sim is arithmetic; types catch the class of bug that ruins balance |
| Approach | **Functional core / imperative shell** — see [ADR 0001](adr/0001-functional-ts.md) | The sim is pure and deterministic; the UI is a normal React app |
| Build | **Vite** | The game is 100% client-side; no SSR to buy, faster HMR and a simpler mental model than Next |
| UI | **React** + **Zustand** (per [ADR 0002](adr/0002-ui-framework.md), deferred until Phase 0) | Boring and well-supported; the store holds the action log and calls `advanceDay` |
| Styling | **Tailwind** + a small design-token layer | Density requires tight control of spacing/size |
| Data | **localStorage** behind a `SaveStore` interface | See [open-questions.md](open-questions.md) D6 |
| CLI | plain Node + a table printer | Must not depend on the web app |
| Tests | **Vitest** + **fast-check** | Property-based tests are where the functional core pays off |
| Lint | ESLint + `dependency-cruiser` | Enforces "sim is pure" mechanically instead of by discipline |

**Not using:** Phaser / PixiJS (no real-time rendering in v0.1) · a heavy component library (we need a very specific dense-table look) · Redux · **fp-ts / Effect / ts-pattern / Immer in the sim** (rationale in the ADR).

### The two rules that keep it honest

1. **No `Math.random` / `Date.now` outside `sim/rng.ts` and `app/clock.ts`** — otherwise replay and batch testing silently break.
2. **`src/sim/**` may not import from `ui/`, `store/`, `app/`, or platform modules** — enforced by `dependency-cruiser`, not by review.

---

## 2.5 What actually got built (Phase 0)

The sim is implemented and tested; see [phase-0-report.md](phase-0-report.md). Two deviations from the rules above, both deliberate and both worth knowing:

1. **`readonly` was dropped from the state types.** Spread-based updates fought the type system on every nested change (24 compile errors in the first draft). Instead, `resolveDay` deep-clones the guild and mutates the clone locally. The world's rival array is attached by reference, because the day only reads their World First flag and `tickRivals` copies each rival before writing. The guarantee is behavioural — callers can never observe mutation, and a test asserts the input is untouched — rather than type-level. This is the pragmatic version of "immutable data", and it is honestly the one that ships.
2. **Event ids are hashed from their text, not counted.** A module-level counter made two calls to `resolveDay` produce different ids, which the determinism test caught immediately. That test is now the guard against an entire class of bug.

---

## 3. Code shape

```
src/
  sim/                    ← pure, no imports from app/ or ui/
    rng.ts                seeded PRNG, named streams
    types.ts              GameState, Hero, Boss, Event, Attention…
    content/              content.ts (the ladder), roles.ts, classes.ts,
                          heroes.ts (generation + XP curve), tuning.ts  ← data, not logic
    hero.ts               attributes → roleScore → power; XP and levelling
    plan.ts               parties, unlocks, validation
    encounter.ts          phase resolution + projections for any content
    day.ts                the day pipeline for one guild
    economy.ts
    founding.ts           the state every guild starts from (no rivals)
    rivals.ts             the three rival definitions, scores and standings
    world.ts              tickRivals, advanceDay, runWorld
    events.ts             event + attention derivation
    ai/                   personalities.ts · planner.ts · turn.ts (aiTurn, aiRun)
    game.ts               newGame, hiring, assigning, advancing
    index.ts              the public surface
  app/                    ← Vite entry, routing, providers
  ui/                     ← components: DataGrid, AttributeBlock, CheckBar, AttentionCard…
  store/                  ← Zustand slices, save/load, action log
  cli/                    ← headless driver
```

The dependency rule is one-way: `sim` imports nothing from `ui`/`store`/`app`. If that ever inverts, determinism and testing are gone.

---

## 4. RNG

Named, independent streams so that adding a roll in one system doesn't reshuffle another:

```ts
const rng = makeRng(seed);
rng.stream('checks')     // per-pull check variance
rng.stream('consistency')// per-hero off-nights
rng.stream('loot')
rng.stream('injury')
rng.stream('tavern')     // candidate generation
rng.stream('rivals')
```

Each stream is seeded from `hash(seed, streamName, day)` so results are stable whether a day is resolved once or replayed. This is the difference between "deterministic in theory" and "deterministic when you re-run day 14 in isolation".

---

## 5. Saves

```ts
type Save = {
  version: number;         // migration gate
  seed: number;
  createdAt: string;
  state: GameState;        // cached snapshot, derivable
  actionLog: Action[];     // { day, type, payload }
}
```

- The **action log** is the source of truth; `state` is a cache. If they ever disagree, replay wins.
- Migrations are `migrate(save): Save` functions chained by version. Start at 1 and never mutate in place.
- Keep the log small: actions only (assign, stance, sign, advance), never derived data.

---

## 6. CLI (build this before the UI)

```
guild new --seed 1234 --name "Ironbound Order"
guild status
guild roster [--sort power]
guild assign raid --heroes gareth,ignis,lyra,...
guild assign farm --heroes sable,corin --split-to ignis
guild stance raid push
guild advance [--days 3]
guild raid --boss 3 --dry-run        # shows projection, doesn't execute
guild sim --seasons 1000 --policy greedy   # batch balance run
guild replay --log save.json
```

The CLI is not a developer toy — it is the **primary test harness**. If a wipe report is readable in a terminal, it will be readable in a browser. The inverse is not true.

---

## 7. Testing

| Layer | Approach |
|---|---|
| Sim invariants | property tests: fatigue ∈ [0,100], power ≥ 0, no NaN, day always resolves |
| Determinism | resolve the same day twice, assert deep equality; an AI run reproduces its score and raid count from the seed |
| Balance | `npm run cli -- sim --runs N` across personalities; the AI is the test harness |
| Balance | `guild sim --policy {idle, random, greedy, perfect}` — assert the MVP targets in [mvp-scope.md](mvp-scope.md) §3 |
| UI | visual smoke tests on the table + drawer; no snapshot-everything |

The `perfect` policy is a small search/greedy bot. It's the single most valuable test asset: it tells you whether the game is winnable, and it's the baseline for "is this too easy".

---

## 8. Performance

Measured 2026-10-31 on the shipped build:

- **One guild day:** ~1 ms (`resolveDay`, 84 days in ~0.10 s).
- **One world day:** ~10 ms, because `tickRivals` gives three full guilds an `aiTurn`. A full 84-day world run is ~0.84 s.
- **`sim --runs 20`** (60 world runs) is ~50 s. The unit tests use the player-only `aiRun`; three world runs cover the race.
- The roster table is ≤ 22 rows. No virtualisation needed. Tavern is ≤ 3.
- The expensive thing will be **re-rendering the projection strip on every drag**. Compute projections in a `useMemo` keyed by `(party, stance, boss)` and keep the math pure — it's already a pure function, so memoisation is free.
- A 10,000-day batch is ~12 s with `aiRun` (player only, ~119 full runs) and ~100 s with the world attached. Optimise the rival planner first if that becomes the bottleneck; do not cut the race out of the sweep.

---

## 9. Content as data

Bosses, roles, classes, hero name pools, and tuning constants live in `sim/content/` as typed data:

```ts
export const BOSSES: Boss[] = [
  { id: 'vael', name: 'Archdemon Vael', recommendedIlvl: 170,
    phases: [
      { name: 'Summoning', check: 'mechanics', requirement: 310, share: 0.25 },
      { name: 'Inferno',   check: 'sustain',   requirement: 360, share: 0.35 },
      { name: 'Enrage',    check: 'dps',       requirement: 470, share: 0.40 },
    ]},
]
```

Why it matters: **balance is the main ongoing work of this game**, and it must be a data edit plus a batch run, not a code change plus a UI test. It also makes a future content pipeline (designer-authored tiers) possible.

---

## 10. Determinism checklist for every PR

- [ ] No `Math.random`, no `Date.now`, no `new Date()` inside `sim/`
- [ ] Any new randomness uses a named stream
- [ ] New state fields are JSON-serialisable (no Map/Set/class instances)
- [ ] If a new event is emitted, it has a stable id (for the action log and the digest)
- [ ] Golden run still passes, or the diff is explained in the PR
