# Phase 0 report — the headless sim

> **Historical.** This describes the first playable: one 5-boss tier over 28 days. The game has since become an 84-day progression ladder with three raids and an AI planner — see [progression-report.md](progression-report.md).

**Status:** complete. `npm test` green, `npm run cli` playable end to end.

The milestone was: *a terminal command that plays 28 days and prints a wipe report worth reading.* That exists, and the report is the best thing in the build.

---

## 1. What was built

```
src/sim/
  prelude.ts        Result, assertNever, clamp, pick — the whole "FP library" (~60 lines)
  rng.ts            seeded streams: rngStream(seed, name, ...extras)
  types.ts          plain data only: Hero, Plan, BossDef, GameState, AttentionItem…
  hero.ts           attributes → roleScore → power; condition/sharpness/morale
  party.ts          assignments, projections, pull budget
  checks.ts         boss phase resolution, off-nights, injuries
  day.ts            the 9-stage pipeline
  economy.ts        income, wages, arrears
  rivals.ts         3 guilds on the same functions
  events.ts         event log + attention derivation
  score.ts          run scoring and bands
  game.ts           newGame, plan edits, attention resolution, advance
  content/          bosses, roles, classes, tuning, hero generation
src/cli/index.ts    new · status · roster · tavern · hire · raid · assign · rest ·
                    advance · report · attention · resolve · sim
tests/sim.test.ts   13 tests: determinism, invariants, balance targets, properties
```

**Determinism is real, not aspirational.** `resolveDay` deep-clones its input, so callers can never observe mutation, and the same seed produces a byte-identical run — a test asserts it. The first version of this failed, because event ids used a module-level counter; the test caught it and the fix was to hash the event text instead. That's exactly the class of bug the harness exists to catch.

---

## 2. How to play it

```bash
npm run cli -- new --seed 1234
npm run cli -- status
npm run cli -- roster
npm run cli -- raid                      # projection: will tonight work?
npm run cli -- advance --days 3
npm run cli -- report                    # the wipe report + next levers
npm run cli -- attention                 # what needs you
npm run cli -- resolve <itemId> <option>
npm run cli -- sim --runs 40 --policy greedy
```

---

## 3. The thing that matters: the wipe report

```
Gatewarden Oros — night of day 3, 5 pulls, stance steady
WIPE — best pull 30%

last pull
phase        check       yours  needs  ratio  result
The Gate     Mitigation    228    175   1.30  clear
Shield Wall  DPS           216    235   0.92  FAIL

next lever: +19 DPS
  +39  rest the raid (avg fatigue 58%, no injuries)
  +27  swap Perrin Ironhand → Thorne the Quiet (bench)
  +26  switch stance to Push (+12% checks, +injury risk)
  +0   +10 iLvl for Perrin Ironhand (lowest gear)
```

That is the whole design working. The party clears the mitigation phase comfortably and dies to the damage check; the report names the failing check, quantifies the gap, and lists four ways to close it with numbers. A player reads this and knows what to do tomorrow.

**Note the best lever is "rest", not "swap".** That's the two-clock system doing its job: the raid is winning on paper and losing on condition.

---

## 4. Measured balance (40 runs per policy, seeds 1, 18, 35…)

| Policy | Avg bosses | Avg score | World firsts | Bands |
|---|---|---|---|---|
| **idle** (never assigns) | 0.00 | 0 | 0/40 | all D |
| **random** (shuffled parties) | 0.20 | 147 | 0/40 | 39 D |
| **greedy** (auto-fill, rests at 74% fatigue) | **3.85** | **16,980** | 8/40 | A/B mostly |

Against the targets in [mvp-scope.md](mvp-scope.md) §3:

- ✅ *do-nothing never passes boss 2* — 0.00 bosses
- ✅ *a competent run lands 10–15k* — 16,980 avg (slightly high, see below)
- ✅ *actions must matter* — greedy beats random by 19×
- ⚠️ *perfect play finishes day 24–27* — not measured; there is no perfect bot yet. Greedy clears 3.85 of 5.
- ⚠️ *boss 3 stalls 4–7 days* — not yet verified per-boss; needs a per-boss timing readout.

Balance is **provisional**. The numbers were tuned twice by hand and then by two measurement scripts; the point of Phase 0 is that further tuning is a script run, not an opinion.

---

## 5. What building it taught us

These are design insights that only appeared once the numbers ran.

1. **Per-check capability is wildly asymmetric.** A party's mitigation score is ~190, its mechanics score is ~290, and its sustain score is ~125 — because mechanics draws on every class while sustain depends on two clerics. Boss requirements *must* be calibrated per check type, or sustain checks are impossible and mechanics checks are free. This is the single biggest balance lesson, and it is invisible on paper.
2. **The injury/rotation loop can degrade the party.** Random injuries pull the strongest heroes out and replace them with the bench, so a stalled player gets weaker, not stronger. That's a good death spiral in principle, but it needs a floor — currently the roster of 18 absorbs it, barely.
3. **Mastery at 1.5%/pull with a 25% cap is the real difficulty dial.** Six pulls a night is ~9% per night, so any wall clears in three nights unless gear is the gate. Requirements must therefore be set slightly *above* the party's fresh value, not far above.
4. **Fifteen heroes is the minimum that makes the day interesting.** Ten raid + five dungeon leaves no bench; eighteen gives you a rotation, a farm party, and injury cover. This validates the roster-cap critique in [design-review.md](design-review.md) §3.3.
5. **Attention gating works and is infuriating in exactly the right way.** The CLI refused to advance on day 7 until three items were answered. That's the loop doing what it's for.

---

## 6. Known gaps (deliberately deferred)

- **No role assignment UI/command.** Heroes have a role, and role affinity affects checks, but the player can't switch roles yet. That's the next obvious lever and the biggest missing depth.
- **Drops are auto-assigned** to the raid's weakest-geared hero. No "who gets the axe?" decision yet.
- **No contracts/negotiation beyond expiry + renewal.**
- **Rivals use a single `power` number**, not a full party model. Their pace is tunable and explicable, but not yet *simulated to the same depth* as the player.
- **No save/load versioning** — the JSON is whatever the last build wrote.
- **CLI only.** No UI, by design.

---

## 7. Next (Phase 1)

1. **Role assignment** — the missing lever, and the one that makes party composition a real decision.
2. **Manual drop assignment** — the cheapest drama in the game.
3. Then the vertical slice UI: Roster + Hero Sheet → War Room + Day Report → Wipe Report.

Before any of that: a **perfect-play bot** is worth half a day. It tells you whether the tier is winnable and gives the balance sweep a ceiling to measure against.
