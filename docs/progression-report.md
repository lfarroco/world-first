# Progression & the AI — report

**Status:** implemented and playable. `npm test` 73 green.

Two things changed the game's shape:

1. **A ladder instead of a tier.** Three level-1 heroes in a wood, then missions, then dungeons, then three raids over 84 days — the WoW curve, compressed.
2. **A planner that plays the game itself**, driven by a personality record, so the same code can later drive the rival guilds.

---

## 1. The ladder

Sixteen entries, four kinds. Every band carries more than one job, and the reward columns are the choice: a gold run, an XP run and a loot run sit side by side. `content` lists only what the guild can field; `inspect <id>` prints the phases, the bestiary and the drop chances.

| # | Content | Kind | Avg level | Party | Pays | Unlocks |
|---|---|---|---|---|---|---|
| 1 | Emberwood | farm | 1 | 1–5 | 6g + 10xp per hero | — |
| 2 | The Old Quarry | farm | 5 | 1–5 | 14g + 6xp per hero | — |
| 3 | Whispering Glade | farm | 10 | 1–5 | 3g + 22xp per hero | — |
| 4 | The Warrens | mission | 1 | 3 | 30g, 60xp, 1 item | — |
| 5 | The Wolf Den | mission | 1 | 3 | 70g, 120xp, 1 item | — |
| 6 | The Drowned Mill | mission | 4 | 3 | 30g, 260xp, no loot | — |
| 7 | The Bandit Road | mission | 5 | 3 | 110g, 120xp, 1 item | — |
| 8 | The Toll House | mission | 9 | 3 | 260g, 40xp, no loot | — |
| 9 | The Plundered Vault | mission | 14 | 3 | 40g, 60xp, 2 items | — |
| 10 | Hollow Crypt | dungeon | 10 | 4–5 | 120g, 500xp, 2 items (40–62) | — |
| 11 | The Wailing Mines | dungeon | 16 | 4–5 | 140g, 300xp, 3 items (44–64) | — |
| 12 | Sunken Temple | dungeon | 22 | 4–5 | 180g, 900xp, 2 items (78–108) | Hollow Crypt |
| 13 | Ashen Spire | dungeon | 35 | 4–5 | 360g, 3000xp, 3 items (115–148) | Sunken Temple |
| 14 | Obsidian Citadel — Gatewarden | raid | 28 | 10 | 900g, 3000xp, 4 items (148–172) | Ashen Spire |
| 15 | Obsidian Citadel — Twin Covens | raid | 40 | 10 | 1200g, 3000xp, 4 items (182–205) | Gatewarden |
| 16 | Obsidian Citadel — The Tyrant | raid | 52 | 10 | 1800g, 4000xp, 5 items (220–250) | Twin Covens |

The Wailing Mines is the one dungeon that does **not** hand over a free recruit on its first clear (`firstClearRecruit: false`). It is a gear option, not a fourth step that funds the raid roster. The other three dungeons keep the 55% recruit.

### 1.1 The content pass (2026-10-30)

Four comments from a hand-played run drove this pass:

1. Do not list locked content; announce new content when it opens.
2. Do not show content the guild cannot field — The Old Quarry was listed "open" at level 1.
3. Give more options, and make each one meaningful: more gold, more XP, more loot.
4. Let the player inspect an area: mobs, items, chances.

**Availability is three gates.** A content is open when its prerequisites are cleared, the roster has `minHeroes` heroes, and those heroes can meet the average level gate. `availableContent` hides the rest; the `content` screen prints a count ("13 areas not open yet") and never a name. Opening one emits a single `unlock` event and records it in `knownContent`, so a roster that shrinks and grows again does not re-announce the same place. A save written before the ledger existed initialises silently.

**The options trade one reward for another.** The first build gave every new option gold, XP and loot. That was additive income, not a choice: the Steward moved 23,251 → 28,313, raids 2.70 → 3.00, World First 2/10 → 6/10, and the ladder stopped stalling. The shipped numbers specialise. The Drowned Mill is the XP run (260 XP, 30g, no loot). The Toll House is the gold run (260g, 40 XP, no loot). The Plundered Vault and The Wailing Mines are the loot runs (2 and 3 items, little gold or XP). Measured on the standard sweep:

| Build | Steward | Gambler | Quartermaster | Raids | World First (Steward) |
|---|---|---|---|---|---|
| Before the pass (10 seeds) | 23,251 | 23,458 | 22,975 | 2.70 / 2.80 / 2.60 | 2/10 |
| All rewards additive, no re-tune (10 seeds) | 28,313 | 27,388 | 27,674 | 3.00 / 3.00 / 2.90 | 6/10 |
| Rewards specialised, Tyrant +15% (20 seeds) | 24,347 | 24,345 | 23,478 | 2.70 / 2.80 / 2.60 | 6/20 |
| Plus rival pace 0.85 (20 seeds) | 24,347 | 24,345 | 23,478 | 2.70 / 2.80 / 2.60 | 6/20 |

The last two rows have the same player numbers because rival pace only moves the rivals, and rivals never touch the player's simulation.

**The Tyrant moved, once, on a fresh sweep.** Side content raised the ceiling. At 19/20 Steward seeds clearing all three raids, the wall was gone. The three requirements went 650 / 538 / 725 → 750 / 620 / 835 (+15%). The 20-seed Steward distribution is now 14 clear all three, 6 stop at two, none lower — the target in [mvp-scope.md](mvp-scope.md) §3. Do not raise it again without a new 20-seed sweep.

**The race was rescaled.** With the Tyrant at +15% and `RIVAL.pace = 1`, the player's Tyrant kill landed after every rival and World First was 0/10 on all three personalities. At `pace = 0.85` rivals finish on days 74–79 and World First returns as 6/20 (Steward), 2/20 (Gambler) and 6/20 (Quartermaster). The cautious split is back: the Gambler wins least, as designed. Player raids and score do not move, because the rival model is a separate one-number simulation.

**Named drops are wired, not decorative.** Each content's `drops` table is rolled once per clear (`rollNamedDrop`): at most one named item drops, so every `chance` is the exact per-clear probability and a content's chances sum to at most 1. On a hit it replaces one generic item; the clear still pays exactly `loot.count` items. `inspect` prints the same table the sim rolls.

### 1.2 Gating and growth

**Gating is by prerequisites, roster size and the party's average level.** A new guild physically cannot skip ahead, which is what makes the first ten days feel like levelling rather than a small raid tier. The average rule exists so one under-levelled body cannot block a raid forever ([learnings.md](learnings.md) L31). The planner prefers heroes who meet the level on their own and falls back to the average only when the roster cannot field a full party of eligible heroes; the display uses the highest-level legal party. This keeps the AI from wasting a night on a legal but weak party.

**Heroes grow three ways**, all of which matter:

- **XP** from every activity (`xpToNext(L) = 40 + 16L`, cap 60). Farm gives 6–22, missions 40–200, dungeons 300–3000, raids 3000–4000.
- **Gear** from loot, which is assigned to the *lowest-geared* hero in the party — so dungeons funnel gear into the raid team, exactly like split runs. A clear pays its listed item count; a named drop replaces one of those items rather than adding one.
- **Recruits** arrive at ~68% of your best hero's level, so a guild of veterans attracts experienced adventurers. This is the mechanism that makes a 10-man raid reachable inside 84 days.
- **Free recruits** join after your first clear of each of the three ladder dungeons at **55% of your best hero's level**. The side dungeon does not. Three free heroes is enough that a careful player reaches ten for the first raid without buying the whole roster. The first implementation passed `0.55 × best` into a function that multiplied by a recruit factor again, so they arrived at ~34%; fixed in §3.1.

---

## 2. The AI

`src/sim/ai/` is three files and no framework:

```
personalities.ts   six personality records (caution, ambition, thrift)
planner.ts         planDay(state, personality) → Plan; hireDecision(...)
turn.ts            aiTurn = hire → plan → resolve → answer attention queue
```

The planner is a **priority search over open content**, not a scripted build order:

1. **Raid prep.** If an uncleared raid is open and the projected party can reach ~72% of it, the AI holds those ten heroes back and *rests* them until their average fatigue is under 42. This is the behaviour that makes raids possible at all — a bot that grinds every day never has ten fresh bodies.
2. **Content choice.** Everything open is scored by `(uncleared ? 5000 : 0) + tier × 200 + xp + gold/8`, filtered by whether the party meets the level/size gates. Uncleared content dominates, so the AI climbs instead of camping the first dungeon. It does **not** choose by need: the XP run and the gold run are scored by the same formula, so the bot never picks the gold farm for the purse. That is a player decision, not a bot bug.
3. **Training attempts.** If nothing is clearable, the AI will still take a fight it can reach ~62% of, because a loss pays 35% XP and builds mastery. Better to fail on a mission than to farm forever at level 1.
4. **Rest.** Heroes above `58 + caution × 30` fatigue are taken out of the rotation. Above 84 they rest rather than farm.
5. **Fallback farms.** When nothing is viable, the party goes to the open farm with the best `xp + gold/8` value that the remaining pool can field. The old build hardcoded Emberwood and The Old Quarry; the third farm made that a silent cap on how many parties could farm in one day.
6. **Stance.** Push when the projection is 0.9–1.02 and ambition is high; cautious when comfortably ahead and caution is high.

Two behaviours are deliberately *not* hard-coded: which hero goes in which party (ranked by contribution to that content's checks) and when to spend gold (a reserve threshold scaled by thrift).

**Why it's reusable for rivals:** the planner only reads `GameState` and a `Personality`. Nothing in it knows it is playing the player's guild. The rival guilds still use their compressed one-number model — swapping them onto this planner is the obvious next step, and it will make the race *simulated* rather than *paced*.

---

## 3. Measured balance (20 seeds per personality)

Standard sweep: base seed 1, step 17, `npm run cli -- sim --runs 20`. Last measured 2026-10-30, after the wage, promise and content-band pass (§3.3).

| Personality | Avg score | Median | Raids cleared | Full clears | Dungeons (of 4) | World First |
|---|---|---|---|---|---|---|
| **The Steward** (balanced) | 23,051 | 25,115 | 2.70 / 3 | 14/20 | 4.00 | 4/20 |
| **The Quartermaster** (cautious, thrifty) | 24,441 | 25,605 | 2.80 / 3 | 16/20 | 4.00 | 5/20 |
| **The Gambler** (reckless) | 21,661 | 24,834 | 2.60 / 3 | 12/20 | 4.00 | 3/20 |

**The caution split survives, and now has an economy to bite on.** The Gambler scores 2,780 below the Quartermaster and takes 3/20 World First against 5/20. It also runs 43 arrears-days across 20 seeds against 14 for the Quartermaster: a reckless planner renews and hires into a wage bill it cannot carry.

**The ladder still stalls at the Tyrant.** Across 20 Steward seeds, 14 clear all three raids, 6 clear two, and none stall at one or zero. That is the target in [mvp-scope.md](mvp-scope.md) §3, and it is the check to re-run after any content change.

**A do-nothing guild** clears zero dungeons and scores ~0. **The ladder is beatable** by a mediocre bot in ~84 days, which is the right bar for a first playable version.

**The top is in the target band.** The Steward clears 2.70 raids and takes World First 4/20; rivals finish the tier on days 74–79. The 2026-10-30 content pass raised the Tyrant from 650 / 538 / 725 to 750 / 620 / 835 (+15%) to absorb the new ceiling (§1.1). Do not raise it again without a fresh 20-seed sweep.

### 3.3 The economy-and-queue pass (2026-10-30)

The seed-1234 hand run found three dominant answers in the core loop: wages that never rose, promises that cost nothing, and a mission band where the newest row paid the most of everything. Three changes, measured together and then split:

1. **Renewal re-prices to the hero's level.** Before, `contract.wage` was set at signing and only ever multiplied by 1.2, so a level-60 starter still cost the level-1 wage and the wage budget never bound. `renewalWage(hero)` is now `max(current, wageForLevel(level) × renewPremium)`; `renewPremium` is 1.0 (renew at market) and is the dial if renegotiation should cost more than signing. The budget's per-renown rate went 120 → 150 so the documented 13–15 hero roster fits at full renown.
2. **Promises are a debt.** The queue's `promise` option recorded nothing. It now writes a `PromiseRecord` (due day, starts counted), the day pipeline settles it, and the player is told the day before. Kept: +5 morale. Broken: −15 and the hero is marked bench.
3. **The XP run and the coin run share a band.** The Drowned Mill (level 4) pays 260xp and nothing else; the Bandit Road (level 5) pays 110g, 120xp and an item. Before, the Road also paid the Mill's 200xp, so it dominated the Mill on all three columns.

| Build | Steward | Quartermaster | Gambler | Raids (S/Q/G) | Full clears |
|---|---|---|---|---|---|
| Before the pass (20 seeds) | 24,347 | 23,478 | 24,345 | 2.70 / 2.80 / 2.60 | 14/20 (S) |
| All three dials, bot still steady on raids | 21,384 | — | — | 2.55 (S) | 11/20 (S) |
| Final: the bot pushes a marginal raid | 23,051 | 24,441 | 21,661 | 2.70 / 2.80 / 2.60 | 14 / 16 / 12 |

The middle row moved three dials at once (wages, budget, content band) and is the one honest caveat in this table: it says the combined pass costs the ladder about 0.15 raids, not which dial did it. The last row isolates one change — the bot's raid stance — and it recovers the whole loss. That is the finding: **the wage fix made the ladder look harder only because the bot refused to raid on Push.** `push` is +12% for an injury risk that fires only on a scrape, so a raid night at 0.90 on steady was being lost to caution. With `minRatio < 1.05 → push` the ladder returned to its 14/20 target. See L65 and L71 in [learnings.md](learnings.md).

The Steward's score is ~1,300 below the pre-pass number and its raids are unchanged. The drop is wealth and strength: the guild now pays level-60 wages, so it ends with ~2,000g instead of ~10,000g and builds one fewer facility tier. That is the intended trade, not a regression — the ladder target is the number to hold.

### 3.1 The seed-5150 legibility pass

Nine fixes came from a hand-played run ([learnings.md](learnings.md) L47–L55). Seven are legibility: the queue repairs an invalid plan instead of refusing, the report shows the killing pull, `projected` and `best pull` bank the failed check's partial progress, the roster and `today` show form and sharpness, the tavern shows power and gear, every attention option is total, and `party` accepts and prints names. Those change what the player can see, not what the sim rolls.

Two dials moved. Sharpness was widened from 18% to 26% (`0.78–1.04`), and fatigue now multiplies the scrape injury chance (`×1.8` at 100). They were measured separately, on the standard 10-seed sweep:

| Change | Steward | Quartermaster | Gambler | Raids |
|---|---|---|---|---|
| Before the pass | 23,366 | 22,136 | 22,653 | 2.6–2.7 |
| Sharpness `0.78–1.04`, no fatigue injury | 23,027 | 23,006 | 23,802 | 2.6–2.8 |
| Plus fatigue injury `×1.8` | 23,251 | 22,975 | 23,458 | 2.6–2.8 |

The first attempt — `0.80–1.08`, keeping the start value — was rejected: it raised the sweep to 23,930–25,232 (+8%) because the bot keeps raiders sharp, and a higher ceiling is power creep. Moving the floor instead punishes rust without printing score (L56). The fatigue multiplier moves no aggregate number on its own (23,006–23,802 with it at 0), because injuries only roll on scrapes; it changes the individual decision and the World First split.

### 3.2 Rival growth and the race

Rivals have one power number and two kinds of day: farm or attempt. The first pass grew a rival by 0.5× on an attempt day and 1.0× on a farm day, so the grinder out-grew the raider. Every rival finished after the player and World First was automatic (9/10).

The model uses **0.9× on an attempt day, 0.9× on a farm day, 0.6× on the day a stage is cleared**, all in `RIVAL` in `src/sim/content/tuning.ts`. `RIVAL.pace` is the single difficulty dial for the race; the other growth numbers are shape.

The content pass moved the dial. At `pace = 1` (the pre-pass baseline) the rivals finished on days 64–69, but the +15% Tyrant pushed the player's kill past them: World First was 0/10 on all three personalities. At `pace = 0.85` Methodical and Ravensguard finish at a median day 77, the player's Tyrant kill is a median day 82, and World First is 6/20 (Steward), 6/20 (Quartermaster) and 2/20 (Gambler). The 10-seed sample is 3/10, 4/10 and 1/10. Echoes never finishes the tier: it burns out after day 60 by design.

Player raids and score are identical at either pace. The rival model is a separate one-number simulation; it cannot change the player's checks. That is also why `pace` is safe to tune without re-running the content table.

A condition bug came out of this work: the rival World First check fired when `raidsCleared >= 3`, but that counter includes the three dungeon stages, so a rival claimed World First after clearing the *first* raid. The check is now `raidsCleared === RIVAL_LADDER.length` — the final raid.

---

## 4. What the numbers taught

1. **Requirements must be derived from measured capability, not from intuition.** My first pass had Hollow Crypt at dps 120 when a fresh level-10 five-man produces **38**. The AI dutifully farmed for eighty days. A measurement script (`tmp/measure.ts`, since deleted) that prints a party's check values by level is now the first thing to run when adding content.
2. **The raid party must be *rested*, not merely assembled.** Ten fresh heroes is a scheduling problem, not a roster problem. Without explicit prep, the AI never raids — it always has someone at 70 fatigue.
3. **Free recruits are load-bearing.** Hiring alone cannot fill ten raid slots inside 84 days at wage-budget prices; the three dungeon-clear joins are what make the raid reachable.
4. **Level gates should use the average.** A single level-20 hero among nine level-60s blocked the raid forever and produced a silent dead end — the worst kind of bug, because nothing looks broken.
5. **Personalities are a tuning instrument.** Three parameter records (caution/ambition/thrift) produced three genuinely different games, and the spread is a better difficulty dial than any single "AI strength" number.
6. **More options are additive unless they trade something.** Giving every new content gold, XP and loot moved the Steward +5,062 score and +0.30 raids. Specialising each option (XP run has no loot, gold run has no XP, loot run has neither) put the ladder back on its measured line. The user's "each one meaningful" is a balance rule, not only a copy rule.
7. **A list of what you cannot do is noise.** Availability is three gates (prerequisite, roster, average level), the list hides everything else, and one `unlock` event per area replaces the wall of "locked" rows. The old table showed nine locked entries out of ten and still called a level-6 farm "open" at level 1.
8. **The wall has to move with the ceiling.** Side content made the raid party stronger; the Tyrant's requirements had to go up 15% to keep the 14/20 stall. When the wall moved, the rivals had to slow down (pace 0.85) or World First died. Content, difficulty and race are three measurements of one ladder, not three independent dials.
9. **Show the check before the attempt.** The content list now prints the best legal party's projected best pull. The same number the War Room uses is on the choice screen, so "open" no longer means "probably a wipe".

---

## 5. Events and facilities (Phase 1)

Two additions turn the day from administration into a decision.

### 5.1 Event cards

Ten cards, drawn with 40% probability per day after day 3, with a four-card cooldown and no immediate repeats. Each is a decision with a cost on both sides:

| Card | Trigger | The decision |
|---|---|---|
| A rival comes calling | any hero | match the wage · refuse · let him go |
| The cursed blade | any hero | buy cheap power at a morale cost · walk away |
| Bandits hit the farm | gold > 100 | pay them off · send the party and take an injury |
| An apprentice asks to join | roster < 20 | take a free recruit · send them home |
| Homesick | any hero | give a week off · make him raid |
| A patron with coin | gold ≥ 150, renown ≥ 1 | take 900g and lose renown · stay independent |
| Public provocation | always | answer in the square · say nothing |
| Poachers in the wood | any hero | send your best and lose days · ignore and lose gold |
| An old wound | any hero | rest him · make him fight |
| A merchant at the gate | gold ≥ 300 | buy the plate · save the coin |

Cards are **data** (`src/sim/content/events.ts`): a weight, a `when` predicate, a target selector, and declarative effects that reuse existing systems (gold, morale, gear, injury, wage, recruit, leave). No new mechanics, ten new decisions.

A pending card is a **blocking** attention item, so the day cannot advance until answered.

### 5.2 Facilities

Four upgrades, three levels, priced to absorb a run's surplus:

| Facility | Level 1 | Level 2 | Level 3 | Cost |
|---|---|---|---|---|
| Infirmary | −15% injury days | −30% | −45% + 4 hp/day | 900 / 2400 / 4200 |
| Forge | +4 loot iLvl | +8 | +12 | 1000 / 2600 / 4500 |
| Tavern | +6% recruit level | +12% | +18% | 800 / 2200 / 4000 |
| Great Hall | +2 roster, +150g/week | +4, +300 | +6, +450 | 1100 / 2800 / 4800 |

**Measured effect:** before facilities, a good run ended with 17–29k gold and nothing to buy. After, the AI maxes the tree by roughly day 70 and ends with ~10k. The balance sweep barely moved (2.67–2.83 raids), which is the point: the sink changes *pacing*, not difficulty.

### 5.3 What this fixed, and what it did not

Fixed: a random day now contains a decision you could get wrong, and the queue fires on something other than bookkeeping.

Not fixed: **the AI answers every card with its first option**, because option consequences are prose, not structured data. So events are *presented* but not yet *played* by the bot. Give options machine-readable costs and the planner can choose — that is the next cheap improvement, and it is also what makes the cards meaningful for a rival guild.

## 6. Traits (2026-10-30)

The probe started with two threats and two counters; §6.5 extends the set to twenty traits.

| Content | Phase | Threat | Uncountered |
|---|---|---|---|
| Ashen Spire | The Climb | **Ash Veil** | mechanics ×0.82 |
| The Tyrant | The Long Dark | **Dread Roar** | sustain ×0.85 |

30% of warriors and clerics roll **Steadfast**; 30% of mages and rogues roll **Keen Eye**. One trait per hero, on a named RNG stream. A threat is unknown until the first pull: the pull applies it, the report names it, and the next plan can answer it.

The planner may swap one body for a counter after discovery, and only when the projected check improves. Before discovery it does not know to try.

### 6.1 Measured, 10 seeds × 3 personalities

Seeds are `1 + 17i`, the same sweep as §3.

| World | Steward | Gambler | Quartermaster | Raids/run | World First |
|---|---|---|---|---|---|
| Control: no traits, no threats | 22,321 | 24,274 | 23,487 | 2.70 | 7/30 |
| Threats, no counter in any roster | 21,376 | 22,206 | 22,185 | 2.57 | 5/30 |
| Probe: 30% counters, ×0.82 / ×0.85 | 23,211 | 24,002 | 22,087 | 2.70 | 5/30 |

The control reproduces the pre-change baseline exactly, so no other system moved. The middle row is the probe build with `TRAIT_ROLL.chance = 0`, so no roster can answer a threat.

The probe is within noise of the control on score (−1.1%) and raids (0.00). The visible loss is World First: 7/30 → 5/30. A world with threats but no counters loses 6% of score and 0.13 raids, so having counters in the roster recovers most of the penalty.

### 6.2 How often a threat decides

The bot does not over-farm before attempting. On the standard Steward sweep (10 seeds), its first attempt on each content lands at a median 0.80–1.38 of the requirement. The raids are attempted below 1.0; the side jobs are cleared well above it. The bot trains on the wall and farms the side content.

| Content | First-attempt minRatio (median) | Median day |
|---|---|---|
| The Warrens | 1.35 | 1 |
| The Wolf Den | 0.95 | 2 |
| The Drowned Mill | 1.38 | 8 |
| The Bandit Road | 1.11 | 9 |
| The Toll House | 1.17 | 13 |
| Hollow Crypt | 0.86 | 15 |
| The Plundered Vault | 1.24 | 20 |
| The Wailing Mines | 1.14 | 25 |
| Sunken Temple | 0.98 | 32 |
| Ashen Spire | 0.95 | 49 |
| Gatewarden | 1.07 | 52 |
| Twin Covens | 0.80 | 53 |
| The Tyrant | 0.77 | 75 |

First *clear* ratios are higher — 1.3–1.5 on the Spire — because mastery and gear accumulate across retries. The clear-day number is not the decision number.

Per pull on a threatened phase, Steward, 10 seeds. This table and the prose around it were measured **before** the content pass; the penalties and trait rolls are unchanged, so the shape still holds, but the absolute counts date from that build.

| Penalty | Pulls on a threatened phase | Uncountered | Pass → scrape/fail | Scrape → fail |
|---|---|---|---|---|
| ×0.82 | 41 | 17 | 5 | 4 |
| ×0.75 | 43 | 16 | 5 | 4 |
| ×0.70 | 44 | 16 | 8 | 8 |
| ×0.60 | 47 | 19 | 13 | 12 |

On the first night the threat is decisive. Seed 1 had no counter and attempted the Spire at 0.97; the penalty puts The Climb at 0.80. A roster that answers the threat never sees it — 8 of 10 seeds field a counter on the first attempt.

What dilutes the effect is the **retry**, not the margin. The bot can throw a marginal party at the same boss every day, and 2% mastery per pull plus the next gear drop closes an 18% gap within a few days. That is why first attempts are decided by the threat while 10-seed clear days barely move.

At ×0.70 the ladder loses 0.2 raids on average and two seeds (18 and 154) lose the Tyrant because they lack the specific counter. That is over-tuned: a 30% trait roll starts deciding runs.

### 6.3 What this says

- **Keep** the threat/counter vocabulary, the named modifier in the report, and discovery on the first pull. At 18% the threat is decisive on the first night, and the roster answers it eight times in ten.
- **18% is the right size.** Do not raise it to 30% to move the aggregate; at 30% a missing trait costs a raid.
- **Weight comes from the retry, not the penalty.** If a threatened wipe should cost more than a night's mastery, price the retry — fatigue, injury, lost pulls. That is a pacing decision, not a trait-tuning dial.
- **If the multiplier stays** (it should), guarantee a way to acquire the counter only if threats later become mandatory. Today a counterless roster pays a few days, not a run.

---

### 6.4 The planner re-specs roles

The planner resets every hero to their natural role each morning, then gives a planned party its best roles for that night, accepting a switch only when the projected weakest check improves by 0.01 and the party is below 1.1.

| World | Steward | Gambler | Quartermaster | World First |
|---|---|---|---|---|
| Natural roles only | 23,211 | 24,002 | 22,087 | 5/30 |
| Planner re-specs | 23,248 | 24,009 | 22,087 | 5/30 |

It fires on **29 of 840 days** (3.5%), 30 switches across 10 runs. The ladder does not move.

The reason is arithmetic, not implementation. A switch pays the 0.88 fit, so it needs the new role's affinity to be more than `1 / 0.88 = 13.6%` higher on the target check. Of the eight role pairs, only two directions clear +5%: Bulwark → Vanguard on DPS (+7.6%) and Assassin → Trickster on mechanics (+6.5%). Both cost about 20% on the other checks, so the party's weakest phase usually gets worse and the switch is rejected.

---

### 6.5 Twenty traits

The set is now 20: 2 counters, 5 bonds, 6 craft, 4 flaws, 3 specialists ([guild-manager-model.md](guild-manager-model.md) §2.8). Heroes roll a counter at 30% and one general trait at 40%; flaws carry double weight.

| World | Steward | Gambler | Quartermaster | Raids/run | World First |
|---|---|---|---|---|---|
| 2 counters (before) | 23,248 | 24,009 | 22,087 | 2.70 | 5/30 |
| 20 traits | 23,366 | 22,653 | 22,136 | 2.63 | 6/30 |

Average score falls 1.7% and raids 0.07. The loss is concentrated in the Gambler: Hot-Headed and Frail punish repeated attempts, which is the intended shape — the reckless personality pays for its flaws.

The first pass was power creep. At a 55% general roll the sweep was 24,902 / 23,481 / 24,877, 2.83 raids: +1,300 score. Three changes brought it back: the general roll to 40%, flaws weighted ×2, and the compounding crafts trimmed (XP 20% → 12%, loot 5 → 3 iLvl, injury −30% → −20%).

Incidence over 10 runs: 54% of heroes carry at least one trait, 107 traits across 164 heroes, 17 of the 20 traits seen. The three missing are class-locked specialists; they are rare by design.

Ten seeds is a small sample and the ladder is sensitive: moving one trait's fatigue from "before Endurance" to "after Endurance" shifts this average by about 900. Treat differences under ~1k as unresolved.

---

## 7. Known gaps

- **Rivals don't use the planner yet** — they walk a compressed ladder with one power number. The race is tunable but not yet *simulated to the same depth*.
- **No loot choice** — drops are auto-assigned to the lowest-geared hero. A named drop is a name printed on a gear number, not an item entity; there is no "who gets the axe?" decision. In the AI trace this shows as a gear funnel that rotates with the party: seed 777 cleared Gatewarden 8 times, then stalled on the Tyrant at 30% with iLvl 148–183 against a 225 recommendation.
- **The AI does not choose by need.** `xp + gold/8` means the gold farm and the gold mission are never picked once cleared, even when the purse is the constraint. The options are meaningful to a player and invisible to the bot.
- **Repeatable missions are an XP faucet.** The Drowned Mill was cleared 249 times across 10 seeds (about 25 clears per run) because a 3-man XP mission with 0.86 difficulty is the best spare-party value. Raising it to 260xp (the band trade, §3.3) makes the faucet stronger, not weaker. A weekly lockout or diminishing repeat reward is the missing rule; it is not in v0.1.
- **No stable raid roster** — the planner picks the best ten each day, so loot and mastery spread across 16 heroes instead of concentrating on the next wall.
- **Role assignment is sim-only** — `role <hero> <role>` sets the role and the fit multiplier applies to every check. The planner re-specs on 3.5% of days for no measurable gain; the hero sheet has no chips yet.
- **Promises are a debt now, with a hole at the end.** The ledger writes a due day, counts starts, and settles kept/broken (§7.1a). Two pieces are still missing: the planner never reads `contract.status`, so it cannot plan around a promise, and a broken promise has no transfer request behind it — only morale.
- **Facilities now compete with wages.** Before the re-pricing the AI maxed the tree by ~day 70 and ended with ~10k; now it ends with ~2k and one tier short. That is the intended tension, but the facility prices were set against the old, broken wage bill.
- **No early-game pressure.** The first ten days are pleasant but consequence-free; there is no wage crisis until the roster is expensive.

---

## 8. What to do next

1. **Rivals on the planner.** Delete their compressed model and run three `aiTurn`s per day. The race becomes real, and it costs less code than it removes.
2. **Reward-aware content choice.** Give the planner a purse and a gear target so it can pick the gold run and the loot run, not only the XP run. The options exist; the bot ignores them.
3. **Structured event options** so the AI (and later a rival) weighs costs instead of taking `options[0]`.
4. **Manual loot assignment**, then **teach the planner to reassign roles** — the two missing levers from Phase 0.
5. Then the vertical-slice UI, unchanged: Roster → War Room → Report.
