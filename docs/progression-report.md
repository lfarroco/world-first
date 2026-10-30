# Progression & the AI — report

**Status:** implemented and playable. `npm test` 17 green.

Two things changed the game's shape:

1. **A ladder instead of a tier.** Three level-1 heroes in a wood, then missions, then dungeons, then three raids over 84 days — the WoW curve, compressed.
2. **A planner that plays the game itself**, driven by a personality record, so the same code can later drive the rival guilds.

---

## 1. The ladder

| # | Content | Kind | Level | Party | Unlocks |
|---|---|---|---|---|---|
| 1 | Emberwood | farm | 1 | 1–5 | — |
| 2 | The Old Quarry | farm | 6 | 1–5 | — |
| 3 | The Wolf Den | mission | 1 | 3 | — |
| 4 | The Bandit Road | mission | 5 | 3 | — |
| 5 | Hollow Crypt | dungeon | 10 | 4–5 | — |
| 6 | Sunken Temple | dungeon | 22 | 4–5 | Hollow Crypt |
| 7 | Ashen Spire | dungeon | 35 | 4–5 | Sunken Temple |
| 8 | Obsidian Citadel — Gatewarden | raid | 28 | 10 | Ashen Spire |
| 9 | Obsidian Citadel — Twin Covens | raid | 40 | 10 | Gatewarden |
| 10 | Obsidian Citadel — The Tyrant | raid | 52 | 10 | Twin Covens |

**Gating is by level and by prerequisite clears.** A new guild physically cannot skip ahead, which is what makes the first ten days feel like levelling rather than a small raid tier. The level gate uses the party's **average** level, not its weakest member — one under-levelled body shouldn't block a raid, but an under-levelled *party* should.

**Heroes grow three ways**, all of which matter:

- **XP** from every activity (`xpToNext(L) = 40 + 16L`, cap 60). Farm gives 10, missions 120–200, dungeons 500–1400, raids 2000–4000.
- **Gear** from loot, which is assigned to the *lowest-geared* hero in the party — so dungeons funnel gear into the raid team, exactly like split runs.
- **Recruits** arrive at ~68% of your best hero's level, so a guild of veterans attracts experienced adventurers. This is the mechanism that makes a 10-man raid reachable inside 84 days.
- **Free recruits** join after your first clear of each dungeon. Three dungeons means three free heroes — enough that a careful player reaches ten for the first raid without buying the whole roster.

---

## 2. The AI

`src/sim/ai/` is three files and no framework:

```
personalities.ts   six personality records (caution, ambition, thrift)
planner.ts         planDay(state, personality) → Plan; hireDecision(...)
turn.ts            aiTurn = hire → plan → resolve → answer attention queue
```

The planner is a **priority search over unlocked content**, not a scripted build order:

1. **Raid prep.** If an uncleared raid is unlocked and the projected party can reach ~72% of it, the AI holds those ten heroes back and *rests* them until their average fatigue is under 42. This is the behaviour that makes raids possible at all — a bot that grinds every day never has ten fresh bodies.
2. **Content choice.** Everything unlocked is scored by `(uncleared ? 5000 : 0) + tier × 200 + xp + gold/8`, filtered by whether the party meets the level/size gates. Uncleared content dominates, so the AI climbs instead of camping the first dungeon.
3. **Training attempts.** If nothing is clearable, the AI will still take a fight it can reach ~62% of, because a loss pays 35% XP and builds mastery. Better to fail on a mission than to farm forever at level 1.
4. **Rest.** Heroes above `58 + caution × 30` fatigue are taken out of the rotation. Above 84 they rest rather than farm.
5. **Stance.** Push when the projection is 0.9–1.02 and ambition is high; cautious when comfortably ahead and caution is high.

Two behaviours are deliberately *not* hard-coded: which hero goes in which party (ranked by contribution to that content's checks) and when to spend gold (a reserve threshold scaled by thrift).

**Why it's reusable for rivals:** the planner only reads `GameState` and a `Personality`. Nothing in it knows it is playing the player's guild. The rival guilds still use their compressed one-number model — swapping them onto this planner is the obvious next step, and it will make the race *simulated* rather than *paced*.

---

## 3. Measured balance (10 seeds per personality)

| Personality | Avg score | Raids cleared | Dungeons | World First |
|---|---|---|---|---|
| **The Steward** (balanced) | 25,091 | 2.90 / 3 | 3.00 | 1/10 |
| **The Quartermaster** (cautious, thrifty) | 26,514 | 2.90 / 3 | 3.00 | 5/10 |
| **The Gambler** (reckless) | 21,907 | 2.60 / 3 | 3.00 | 0/10 |

Read that table twice, because it says something real: **caution wins.** The Quartermaster — which rests earlier, hoards gold and takes fewer risks — beats the Gambler by 4.6k and takes half the world-firsts. The Gambler's problem isn't aggression, it's *injury debt*: pushing at 90–100% of a requirement costs bodies it can't replace.

That's the intended lesson of the two-clock design arriving in the AI's behaviour without being scripted.

**A do-nothing guild** clears zero dungeons and scores ~0. **The ladder is beatable** by a mediocre bot in ~84 days, which is the right bar for a first playable version: the *third raid* is where runs separate (2.9 vs 2.6 average, and 0/10 vs 5/10 world-firsts).

**Still too easy at the top.** Nearly every Steward run clears all three raids. The next tuning pass should raise the Tyrant's requirements ~15% and check that the Steward lands around 2.4 while a good run still occasionally takes it.

---

## 4. What the numbers taught

1. **Requirements must be derived from measured capability, not from intuition.** My first pass had Hollow Crypt at dps 120 when a fresh level-10 five-man produces **38**. The AI dutifully farmed for eighty days. A measurement script (`tmp/measure.ts`, since deleted) that prints a party's check values by level is now the first thing to run when adding content.
2. **The raid party must be *rested*, not merely assembled.** Ten fresh heroes is a scheduling problem, not a roster problem. Without explicit prep, the AI never raids — it always has someone at 70 fatigue.
3. **Free recruits are load-bearing.** Hiring alone cannot fill ten raid slots inside 84 days at wage-budget prices; the three dungeon-clear joins are what make the raid reachable.
4. **Level gates should use the average.** A single level-20 hero among nine level-60s blocked the raid forever and produced a silent dead end — the worst kind of bug, because nothing looks broken.
5. **Personalities are a tuning instrument.** Three parameter records (caution/ambition/thrift) produced three genuinely different games, and the spread is a better difficulty dial than any single "AI strength" number.

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
| A patron with coin | gold ≥ 150 | take 900g and lose renown · stay independent |
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

## 6. Known gaps

- **Rivals don't use the planner yet** — they walk a compressed ladder with one power number. The race is tunable but not yet *simulated to the same depth*.
- **No loot choice** — drops are auto-assigned to the lowest-geared hero. The "who gets the axe?" decision is still missing, and it's the best drama in the design.
- **No role assignment** — heroes pick their class's best role at creation and never change.
- **Gold has no sink** beyond wages and hiring; a good run ends with 17k+ and nothing to spend it on. Facility upgrades are the obvious fix.
- **No early-game pressure.** The first ten days are pleasant but consequence-free; there is no wage crisis until the roster is expensive.

---

## 7. What to do next

1. **Rivals on the planner.** Delete their compressed model and run three `aiTurn`s per day. The race becomes real, and it costs less code than it removes.
2. **Facility upgrades** as the gold sink (and the reason to keep farming after you can clear).
3. **Manual loot assignment**, then **role assignment** — the two missing levers from Phase 0.
4. Then the vertical-slice UI, unchanged: Roster → War Room → Report.
