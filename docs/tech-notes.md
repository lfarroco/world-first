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
| Build | **Vite 8.3.5** | The game is 100% client-side; no SSR to buy, faster HMR and a simpler mental model than Next |
| UI | **React 19.3.1** + **Zustand 5.0.16** (per [ADR 0002](adr/0002-ui-framework.md)) | Boring and well-supported; the store holds the action log and calls the pure `applyAction` reducer |
| Styling | **Tailwind CSS 4.3.3** via `@tailwindcss/vite`, no config file, design tokens in `@theme` | Density requires tight control of spacing/size |
| Data | **localStorage** behind a `SaveStore` interface | See [open-questions.md](open-questions.md) D6 |
| CLI | plain Node + a table printer | Must not depend on the web app |
| Tests | **Vitest 5** + **fast-check** | Property-based tests are where the functional core pays off; the UI reducer is tested headlessly |
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

## 2.6 The browser shell (2026-10-31)

The dependency decision is [ADR 0003](adr/0003-ui-shell-dependencies.md). The UI is a thin projection of `GameState`. No screen mutates state and no screen computes a game number differently from the sim.

| Piece | File | Rule |
|---|---|---|
| Pure actions | `store/actions.ts` | `applyAction(state, action) → state`. The entire UI vocabulary (assign, stance, hire, release, facility, attention, loot, team, advance) is one reducer. The store calls it; the tests call it without a DOM. |
| Store | `store/gameStore.ts` | Zustand. UI state (screen, drawer, modal, report, toast) lives here and never enters the save. Game mutations go through `applyAction`, re-derive the attention queue, then write. |
| Save | `store/save.ts` | Versioned localStorage file; validation rejects an unknown version or a broken state instead of crashing the boot. New fields are optional (`raidLog`) so a save written before them loads with the feature's empty state. |
| Selectors | `store/selectors.ts` | Presentation composition (wage info, content rows, party advice, week strip, role chips). It calls sim functions; it does not reimplement them. |
| Screens | `ui/screens/` | `Hall`, `Roster` + `HeroSheet`, `WarRoom`, `Raid`, `Report`, `Title`. |
| Modals | `ui/modals/` | attention, inspect, loot, tavern, new run, help. |
| Chrome | `ui/components/` | top bar, tabs, primitives, event line. |
| Shell | `app/App.tsx`, `app/styles.css`, `app/clock.ts` | keyboard, overlays, design tokens. `clock.ts` is the only place the shell reads `Date` / `Math.random`. |

**Sim helpers added for the UI, shared with the CLI:** `fieldableParty` in `plan.ts` (the best legal party, or null); `focusPull` / `nextLevers` / `pullTraits` / `masteryReport` / `latestEncounter` / `encountersForDay` / `raidNights` in `report.ts`; and `raidRace` in `rivals.ts`, which ranks the four guilds on one boss by kill day, then best pull. The browser and the terminal read the same report logic. `CHECK_BANDS` and `OFF_NIGHT_FACTOR` live in `encounter.ts`; the report's tooltips read those constants.

**The raid log.** `resolveDay` writes one `RaidLogNight` per raid party (day, stance, best pull, and one row per pull with the failed check's name, numbers and shortfall). `RAID_LOG.maxNights = 40` bounds it; `tickRivals` clears a rival's log after its day because the hub only reads the player's history. At day 85 the log is 4 kB for 17 nights, 1.5% of a 255 kB save.

**Two rules the UI keeps:** blocking attention is checked *before* `advanceDay`, never after; and drops never block. A click on Advance with a blocking item opens the queue and resolves nothing.

## 3. Code shape

```
src/
  sim/                    ← pure, no imports from app/ or ui/
    rng.ts                seeded PRNG, named streams
    types.ts              GameState, Hero, Boss, Event, Attention…
    content/              content.ts (the ladder), roles.ts, classes.ts,
                          heroes.ts (generation + XP curve), market.ts, tuning.ts  ← data, not logic
    hero.ts               attributes → roleScore → power; XP and levelling
    plan.ts               parties, unlocks, fieldableParty, validation
    encounter.ts          phase resolution + projections for any content
    report.ts             focusPull, nextLevers, pullTraits, digestForDay, raidNights
    day.ts                the day pipeline for one guild; writes the raid log
    economy.ts
    founding.ts           the state every guild starts from (no rivals)
    board.ts              the daily contract board, the token pay rule, effective reward
    featured.ts           the daily star: one open non-raid area, derived from (seed, day)
    market.ts             gear tier, salve/rations/tonic, prices and purchases
    loot.ts               the pending queue, assign, sell, forge
    poach.ts              rival roster targets, signings, the rival-to-rival bench move
    rivals.ts             the three rival definitions, scores, standings, raidRace
    world.ts              tickRivals, advanceDay, runWorld
    events.ts             event + attention derivation
    ai/                   personalities.ts · planner.ts · reward.ts · turn.ts (aiTurn, aiRun)
    game.ts               newGame, hiring, assigning, resolving attention
    index.ts              the public surface
  app/                    ← Vite entry, App shell, keyboard, tokens, clock
  ui/                     ← components/, screens/, modals/
  store/                  ← actions.ts (pure), gameStore.ts, save.ts, selectors.ts
  cli/                    ← headless driver
```

The dependency rule is one-way: `sim` imports nothing from `ui`/`store`/`app`. If that ever inverts, determinism and testing are gone. `vite.config.ts` and `index.html` sit at the repo root.

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
  savedAt: string;      // overwritten on every write; the run start is the seed
  state: GameState;        // cached snapshot, derivable
  actionLog: LoggedAction[]; // { day, action: GameAction }
}
```

- The **action log** is intended as the source of truth; `state` is a cache. Replay is not implemented yet: the UI loads the cache and appends actions, and the tests assert that the same seed and the same actions produce the same state. Do not assume `state` can be rebuilt from the log until a replay test exists.
- Migrations are `migrate(save): Save` functions chained by version. The browser gate is at version 1 and rejects anything it does not recognise rather than loading a partial state (`store/save.ts`). Never mutate a save in place.
- Keep the log small: actions only (assign, stance, sign, advance, resolve, loot), never derived data. The UI's `GameAction` union is the vocabulary.
- **One slot**, `world-first.save` in localStorage. The seed and the guild name are in the file. There is no export yet.
- A save carries the three rival guilds, so it is 164–255 kB. That is the real cost of "the race is simulated"; see §8.
- `raidLog` is optional and bounded at 40 nights; it adds 4 kB at day 85 (1.5% of the file). It is history, not derived data, so it belongs in the save and not in the action log.

`pendingLoot`, `raidTeam`, `buffDays`/`buffPower` and `poachHeat` are optional fields on `GameState`; a save without them loads with an empty queue, no team, no tonic and no poach debt. The queue's ids (`loot-<day>-<contentId>-<i>`) are content-derived; assign, sell and forge use no RNG, so replaying the day gives the same items and the same suggestions. When replay lands, `loot <n> <hero>`, `loot auto`, `loot sell`, `loot craft`, `market <good> <hero>`, `poach <rival> <hero>` and `raidteam` are already actions in `store/actions.ts`, not direct state writes.

---

## 6. CLI (built before the UI; still the harness)

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
| Determinism | resolve the same day twice, assert deep equality; an AI run reproduces its score and raid count from the seed; the contract board is a pure function of the state |
| Balance | `npm run cli -- sim --runs N` across personalities; the AI is the test harness |
| Balance | `guild sim --policy {idle, random, greedy, perfect}` — assert the MVP targets in [mvp-scope.md](mvp-scope.md) §3 |
| UI | 11 headless tests on `applyAction` and the save file (determinism, no mutation, hire, facility, raid ten, report helpers), plus a Playwright-free headless-Chrome CDP pass for the screens and the 84-day run. No DOM snapshot tests. |

The `perfect` policy is a small search/greedy bot. It's the single most valuable test asset: it tells you whether the game is winnable, and it's the baseline for "is this too easy".

---

## 8. Performance

Measured 2026-10-31 on the shipped build:

- **One guild day:** ~1 ms (`resolveDay`, 84 days in ~0.10 s).
- **One world day:** ~24 ms after the 2026-11-01 feature pass, because `tickRivals` gives three full guilds an `aiTurn` and the ladder is 30 areas. A full 84-day world run measured 1.86–2.19 s (3 seeds) on the loaded dev host; the pre-pass build measured 1.1 s on a quiet host, so this is not a like-for-like comparison. The planner's `effectiveReward` takes the star id once per day instead of recomputing `availableContent` per area; that was the first fix when the pass measured 2.2 s.
- **`sim --runs 20`** (60 world runs) is ~2 minutes on the current host. The unit tests use the player-only `aiRun`; three world runs cover the race.
- The roster table is ≤ 22 rows. No virtualisation needed. Tavern is ≤ 3.
- **The projection is the expensive interaction.** `projectAssignment` runs on every party/stance/content change. It is one pure call over the party (≤22 heroes), so the War Room recomputes it rather than caching a derived number; keep it pure. The 15-hero AI save rendered without a visible delay in the headless pass; no frame timing was taken.
- **Production bundle:** 454.06 kB JS / 133.37 kB gzip and 36.41 kB CSS / 8.17 kB gzip, built in 0.52 s (`vite build`, 80 modules). No component library, no chart library, no drag library.
- **Save cost:** a day-41 save is 164 kB; a finished run is 255 kB because it carries three rival guilds and the player's raid log (4 kB for 17 nights). The end-of-run file stringifies in 3.4 ms and parses in 2.3 ms over 500 runs on the dev host; the log moves either by under 0.1 ms. The store writes on every game action, not on UI state, so a day costs one write on top of the ~13 ms world tick.
- A 10,000-day batch is ~12 s with `aiRun` (player only, ~119 full runs) and ~100 s with the world attached. Optimise the rival planner first if that becomes the bottleneck; do not cut the race out of the sweep.

---

## 9. Content as data

Bosses, roles, classes, hero name pools, and tuning constants live in `sim/content/` as typed data:

```ts
export const CONTENT: ContentDef[] = [
  {
    id: "wolf-den", name: "The Wolf Den", kind: "mission", tier: 1, minLevel: 1,
    minHeroes: 3, maxHeroes: 3, recommendedIlvl: 12, gold: 70, xp: 120,
    phases: [{ name: "The Den", check: "dps", requirement: 16, share: 1 }],
    requires: ["warrens"], contractColumn: "xp",
    loot: { count: 1, ilvlMin: 8, ilvlMax: 18 },
    mobs: [{ name: "Grey Wolf", role: "Pack", check: "dps", note: "Circles and bites." }],
    drops: [{ name: "Wolf-Fang Cleaver", slot: "weapon", ilvl: 18, chance: 0.2 }],
    blurb: "Three heroes, one pack.",
  },
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
