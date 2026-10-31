# Progression & the AI — report

**Status:** implemented and playable. `npm test` 80 green.

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
| Plus rival pace 0.85, **old compressed model** (20 seeds) | 24,347 | 24,345 | 23,478 | 2.70 / 2.80 / 2.60 | 6/20 |

The last two rows have the same player numbers because the old rival pace only moved the rivals. That model was retired on 2026-10-31; the shipped rival guilds are in §3.2.

**The Tyrant moved, once, on a fresh sweep.** Side content raised the ceiling. At 19/20 Steward seeds clearing all three raids, the wall was gone. The three requirements went 650 / 538 / 725 → 750 / 620 / 835 (+15%). The 20-seed Steward distribution is now 14 clear all three, 6 stop at two, none lower — the target in [mvp-scope.md](mvp-scope.md) §3. Do not raise it again without a new 20-seed sweep.

**The race was rescaled, then rebuilt.** With the old one-number model and the Tyrant at +15%, `RIVAL.pace = 1` put the player's Tyrant kill after every rival (World First 0/10); 0.85 restored it. Those numbers are historical — the rivals are now full guilds on the planner, and the current dial and its measurement are in §3.2.

**Named drops are wired, not decorative.** Each content's `drops` table is rolled once per clear (`rollNamedDrop`): at most one named item drops, so every `chance` is the exact per-clear probability and a content's chances sum to at most 1. On a hit it replaces one generic item; the clear still pays exactly `loot.count` items. `inspect` prints the same table the sim rolls.

### 1.2 Gating and growth

**Gating is by prerequisites, roster size and the party's average level.** A new guild physically cannot skip ahead, which is what makes the first ten days feel like levelling rather than a small raid tier. The average rule exists so one under-levelled body cannot block a raid forever ([learnings.md](learnings.md) L31). The planner prefers heroes who meet the level on their own and falls back to the average only when the roster cannot field a full party of eligible heroes; the display uses the highest-level legal party. This keeps the AI from wasting a night on a legal but weak party.

**Heroes grow three ways**, all of which matter:

- **XP** from every activity (`xpToNext(L) = 40 + 16L`, cap 60). Farm gives 6–22, missions 40–200, dungeons 300–3000, raids 3000–4000.
- **Gear** from loot, queued as drops and assigned to a hero (the player's choice, or the need suggestion; §3.6). The default is the largest actual slot upgrade, with a bias for the standing raid ten. A clear pays its listed item count; a named drop replaces one of those items rather than adding one.
- **Recruits** arrive at ~68% of your best hero's level, so a guild of veterans attracts experienced adventurers. This is the mechanism that makes a 10-man raid reachable inside 84 days.
- **Free recruits** join after your first clear of each of the three ladder dungeons at **55% of your best hero's level**. The side dungeon does not. Three free heroes is enough that a careful player reaches ten for the first raid without buying the whole roster. The first implementation passed `0.55 × best` into a function that multiplied by a recruit factor again, so they arrived at ~34%; fixed in §3.1.

---

## 2. The AI

`src/sim/ai/` is three files and no framework:

```
personalities.ts   six personality records (caution, ambition, thrift)
planner.ts         planDay(state, personality) → Plan; hireDecision(...)
turn.ts            aiTurn = hire → plan → resolve → answer attention queue
                   aiRun = the player-only 84-day harness
world.ts           tickRivals = one aiTurn per rival; advanceDay; runWorld
```

The planner is a **priority search over open content**, not a scripted build order:

1. **Raid prep.** If an uncleared raid is open and the projected party can reach ~72% of it, the AI holds those ten heroes back and *rests* them until their average fatigue is under 42. This is the behaviour that makes raids possible at all — a bot that grinds every day never has ten fresh bodies.
2. **Content choice.** Everything open is scored by `(uncleared ? 5000 : 0) + tier × 200 + xp + gold/8`, filtered by whether the party meets the level/size gates. Uncleared content dominates, so the AI climbs instead of camping the first dungeon. It does **not** choose by need: the XP run and the gold run are scored by the same formula, so the bot never picks the gold farm for the purse. That is a player decision, not a bot bug.
3. **Training attempts.** If nothing is clearable, the AI will still take a fight it can reach ~62% of, because a loss pays 35% XP and builds mastery. Better to fail on a mission than to farm forever at level 1.
4. **Rest.** Heroes above `58 + caution × 30` fatigue are taken out of the rotation. Above 84 they rest rather than farm.
5. **Fallback farms.** When nothing is viable, the party goes to the open farm with the best `xp + gold/8` value that the remaining pool can field. The old build hardcoded Emberwood and The Old Quarry; the third farm made that a silent cap on how many parties could farm in one day.
6. **Stance.** Push when the projection is 0.9–1.02 and ambition is high; cautious when comfortably ahead and caution is high.

Two behaviours are deliberately *not* hard-coded: which hero goes in which party (ranked by contribution to that content's checks) and when to spend gold (a reserve threshold scaled by thrift).

**It plays the rivals too.** The planner only reads `GameState` and a `Personality`, so the three rival guilds run it unchanged. That is shipped; the race is now simulated rather than paced (§3.2).

---

## 3. Measured balance (20 seeds per personality)

Standard world sweep: base seed 1, step 17, `npm run cli -- sim --runs 20` (three rival guilds play every day). Last measured 2026-10-31, after the rival-planner pass (§3.2).

| Personality | Avg score | Median | Raids cleared | Full clears | Dungeons (of 4) | World First | Arrears days | Avg rank |
|---|---|---|---|---|---|---|---|---|
| **The Steward** (balanced) | 23,087 | 25,624 | 2.65 / 3 | 13/20 | 4.00 | 6/20 | 16 | 2.45 |
| **The Quartermaster** (cautious, thrifty) | 24,520 | 25,980 | 2.75 / 3 | 15/20 | 4.00 | 6/20 | 1 | 2.25 |
| **The Gambler** (reckless) | 21,549 | 24,821 | 2.55 / 3 | 12/20 | 4.00 | 2/20 | 17 | 2.80 |

The current build is the contract board (§3.4) plus the reward-aware planner (§3.5). Against the pre-board table, the Steward is 1.8% lower, the Quartermaster 0.9% higher and the Gambler 3.5% higher. Full clears are 15/15/10 → 13/15/12: the total is the pre-board 40/60, but the distribution moved from the Steward to the Gambler. The Quartermaster is the clear winner again, 1,433 above the Steward and 2,971 above the Gambler.

The rank column is score, then the earlier final-boss kill, then raids, then table order. With three rivals the midpoint is 2.5; the Steward and Gambler sit slightly behind the field and the Quartermaster ahead of it. World First is 6/20, 6/20 and 2/20, close to the original 3/6/3 after the rivals got the same planner.

**The caution split survives.** The Gambler scores 2,971 below the Quartermaster and takes 2/20 World First against 6/20. It runs 17 arrears-days across 20 seeds against 1 for the Quartermaster: a reckless planner renews and hires into a wage bill it cannot carry, then cannot cover the 400g a rival's offer demands. Thrift now pays twice (§5.4).

**The Tyrant stall is one seed off target.** Across 20 Steward seeds, 13 clear all three raids, 7 clear two, and none stall at one or zero. [mvp-scope.md](mvp-scope.md) §3 targets 6/20; the board-only build was 8/20, and the reward-aware planner brings it to 7/20. The Quartermaster is 5/20 and the Gambler 8/20. The total full clears (40/60) match the pre-board build; the distribution moved. Do not move the Tyrant in the same pass.

**A do-nothing guild** clears zero dungeons and scores ~0. **The ladder is beatable** by a mediocre bot in ~84 days, which is the right bar for a first playable version.

**The top is in the target band.** The Steward clears 2.65 raids; the Quartermaster 2.75. The 2026-10-30 content pass raised the Tyrant from 650 / 538 / 725 to 750 / 620 / 835 (+15%) to absorb the new ceiling (§1.1). Do not raise it again without a fresh 20-seed sweep.

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

### 3.2 Rivals are guilds now

The first rival model was one power number with two kinds of day: farm or attempt. It was cheap and tunable, and it was not a simulation: a rival could not be poor, hire the wrong hero, lose a raid night to fatigue, or fail a card. The pace was legible because it was authored.

The shipped model is the player's. Each rival is a full `GameState` — three starting heroes, gold, a tavern, facilities, promises, an event log, a `Personality` — and `tickRivals` gives it one `aiTurn` per player day. The guild's own `rivals` array is empty, so its `resolveDay` cannot recurse into the world. `resolveDay` resolves one guild; `advanceDay` resolves the player and then the world; `runWorld` loops that for the full run. The fast `aiRun` stays player-only and is the unit-balance harness.

Rival difficulty is **`RIVAL.pace`, the multiplier on XP a rival earns**: 0.9. It is the only dial. There is no growth rate or burnout date left; a rival that falls behind falls behind because of its own plan and purse.

**Measured 2026-10-31, 20 seeds per personality, `RIVAL.pace = 0.9`, before the contract board (§3.4).** This is the rival-model baseline: with no board, rivals cannot touch a player's check, so only World First moves. The current player line, after the board, is §3.

| Personality | Player avg score | Player WF | Avg rank | Rival avg score | Rival raids/run |
|---|---|---|---|---|---|
| The Steward | 23,515 | 3/20 | 2.90 | 23,871 | 2.67 / 3 |
| The Quartermaster | 24,293 | 6/20 | 2.35 | 23,371 | 2.67 / 3 |
| The Gambler | 20,814 | 3/20 | 2.75 | 23,771 | 2.67 / 3 |

The field is tight: rivals average 23.4–23.9k against the player's 20.8–24.3k, and all four guilds clear about the same number of raids. The rank therefore turns on World First (+3,000) and on the wealth and strength columns, not on a scripted pace. A full clear without World First is usually third or fourth; with it, first. That is the intended weight of the race, but it is also the number to re-check before shipping: an average rank of 2.35–2.90 means the bot is around the middle of its own field, and a human hand run (seed 1234, §Hand run) scored 30,294 and took first.

**Why 0.9.** At 0.85 (10 seeds) World First rose to 5/10 on two personalities — the race got easier as the rivals got slower, which is the expected direction but too far. At 0.9 the player's 20-seed line matches the pre-rival baseline exactly on score and raids, and the World First split is 3/20, 6/20, 3/20. `RIVAL.pace = 1` was not shipped. On the same 10 seeds it puts the rivals at 25,268–26,168 and 2.83 raids against 2.67, the player's World First at 1/10, 4/10 and 0/10, and the average rank at 2.60–3.60. At equal XP the field is stronger than the bot, which is the wrong side of the floor. Do not move this dial without a fresh 20-seed sweep; the 10-seed sample is noisy enough that 0.85 and 0.9 swapped the World First ordering.

**Cost.** Three rival guilds planning and resolving 84 days takes ~1.1 s per run on a quiet host (a 30-run sample at the board build), against ~0.10 s for the player's guild. That is ~13 ms per day. `sim --runs 20` takes ~65 s. The unit tests call `aiRun` (player only); three world tests cover the race. If this becomes the bottleneck, the next lever is a cheaper rival planner, not a return to the one-number model.

The old `RIVAL_LADDER`, `attemptGrowth`, `farmGrowth`, `clearGrowth` and the burnout constants are gone. The World First bug that survived the old model — `raidsCleared >= 3` included the three dungeon stages — cannot recur: a rival is awarded World First only by `tickRivals`, only after `rivalRaidsCleared(rival) === RAIDS.length`.

### 3.4 The contract board (2026-10-31)

The spare party had one good three-hero job. The Drowned Mill was cleared 26.4 times per run; a flat repeat decay was measured twice and rejected because the bot kept taking the Mill ([open-questions.md](open-questions.md) O7). The shipped rule is a **daily contract board**: two of the guild's open missions are posted at full pay, and every other mission pays 25% of its gold and XP after its first clear. First clears stay full; loot and mastery are untouched.

The board is derived from `(seed, day, available content)`, so it has no save field. The AI will not spend a night on a token repeat; a human may. That is the difference between a price and a lock, and it is the thing a flat decay did not have: the bot reads the board and picks a different full-pay job or a farm.

| | Steward | Quartermaster | Gambler |
|---|---|---|---|
| Score | 23,515 → 22,938 | 24,293 → 23,658 | 20,814 → 20,686 |
| Raids | 2.75 → 2.60 | 2.75 → 2.65 | 2.50 → 2.45 |
| Full clears | 15/20 → 12/20 | 15/20 → 13/20 | 10/20 → 9/20 |
| World First | 3/20 → 6/20 | 6/20 → 7/20 | 3/20 → 3/20 |
| Average rank | 2.90 → 2.35 | 2.35 → 2.10 | 2.75 → 2.80 |
| Arrears days | 18 → 6 | 6 → 3 | 37 → 18 |
| Drowned Mill clears/run | 26.4 → 14.10 | 26.4 → 12.70 | 26.4 → 14.45 |

Mission nights are spread instead of concentrated: Mill 13.75, Warrens 14.27, Wolf Den 11.05, Bandit Road 10.08, Toll House 5.60, Plundered Vault 1.47 per run (pooled across the 60 runs). The spare party farms more on the days the board is bad, which is why the economy improves while the ceiling falls.

The cost is real. The Steward loses three full clears and 0.15 raids; the Tyrant stall moves from 5/20 to 8/20 against the 6/20 target in [mvp-scope.md](mvp-scope.md) §3. The rank and World First gains are relative: the rivals lose more of their smaller rosters to the board. Do not bank them as player skill, and do not compensate by moving the Tyrant in the same pass.

**Rejected alternatives** (all measured):

1. **One XP + one prize contract.** It gave the spare party an easy full-pay job every day. 10 seeds at token 0.3: Steward 24,231 (+5.9%), raids 2.70, Mill 18.9, World First 5/10. Additive, not a trade.
2. **Token-only, no AI gating.** A price on its own did not move the bot off the Mill: the planner's priority floor kept unposted missions above farms, and the Mill still ran 18–20 times in the earlier one-XP + one-prize board. The posting rule, not the price, does the work.
3. **Three posted contracts.** 10 seeds: Steward 24,695, Quartermaster 27,656, Gambler 18,023; Mill 20.0 / 16.0 / 17.9. It over-buffs the cautious personalities and collapses the Gambler. Two is the better trade.
4. **A flat repeat decay.** 26.4 → 28.5 → 27.6 Mill clears; the pick never moved. See §7 and O7.

Do not reopen this with a smaller token or a third contract. The next lever, if the Tyrant stall is judged too harsh, is a measured content pass (the posted alternatives' XP or the Tyrant's requirement), one dial at a time.

### 3.5 The reward-aware planner (2026-10-31)

The old score was `xp + gold / 8` for every content. XP was the only currency: a cleared Toll House (40 XP) or Plundered Vault (60 XP) could never beat the Drowned Mill (260 XP), and the gold farm's per-hero gold was compared as if it were party gold. The bot stalled on the Tyrant at iLvl 148–183 against a 225 recommendation while choosing more XP (seed 777, §7).

**The rule.** `src/sim/ai/reward.ts` builds a `RewardContext` once per day:

| Need | Input | Weight |
|---|---|---|
| Purse | `gold` vs `min(2, weeksLeft) × wageBill`; arrears | `goldWeight` 1 → 32, 0.15 when rich |
| Level gate | the next wall's `minLevel` vs the raid party's average level | `xpWeight` 1 while short, 0.4 once met |
| Gear | the next wall's `recommendedIlvl` vs the raid party's average iLvl | `lootWeight` 1 + 2 × gap/25, capped at 12 |

`rewardValue` prices a night in XP-equivalent: `xp × uncapped heroes × xpWeight + partyGold/8 × goldWeight + lootValue × lootWeight`. Farm gold is per hero and is multiplied by the party size; mission gold is paid once. `lootValue` measures the loot band against the party's worst-equipped hero, so a band below the party is worth zero. The next wall is the first uncleared raid, or the first uncleared dungeon before raiding. The clear-chance bonus is capped at 1.2: a ratio above 100% is not extra reward.

Two correctness fixes came with it. `xpWeight` counts only heroes below level 60, because `gainXp` discards XP on a capped hero. The purse target uses the weeks left in the run, so a day-78 guild with 4,000g and one 1,200g payday is rich, not "short of four weeks of wages".

**Measured on 20 seeds per personality.** Three arms, because the first moved three dials at once and the attribution is not isolated:

| Build | Steward | Quartermaster | Gambler | Full clears (S/Q/G) |
|---|---|---|---|---|
| Board only, no reward model | 22,938 | 23,658 | 20,686 | 12 / 13 / 9 |
| Reward model, 4/5 weights, party XP | 22,812 | 24,921 | 20,663 | 13 / 16 / 9 |
| Reward model, 32/12 weights, farm scoring, party XP | 23,869 | 23,989 | 21,304 | 15 / 14 / 10 |
| Shipped: plus per-hero cap and weeks-left purse | 23,087 | 24,520 | 21,549 | 13 / 15 / 12 |

The first arm looked like a Quartermaster buff (+5.3% and +3 full clears). The second and third show that the weights and the cap move the result: the shipped build is Steward 23,087, Quartermaster 24,520, Gambler 21,549. Against the pre-board baseline that is −1.8%, +0.9% and +3.5%; full clears total 40/60, exactly the pre-board 15/15/10, with two moved from the Steward to the Gambler. The Quartermaster is the clear winner again, 1,433 above the Steward.

The Tyrant stall is 7/20 on the Steward (target 6/20; board-only 8/20), 5/20 on the Quartermaster and 8/20 on the Gambler. The per-hero cap is the arm that moved the Steward from 15 to 13 full clears; the Gambler gained two. That is a distribution change, not a total loss, but it is the arm to isolate first if the Steward's stall matters more than the Gambler's recovery.

The gold and loot picks move: the Plundered Vault goes 1.5 → 3.5 clears/run and the pure Toll House stays around 5.5, posted only a third of the time. The planner is not a Toll House button; it is a need model. The farm branch is now scored by value instead of a constant `"1"`, so the Old Quarry is a real fallback when the purse is empty.

World First is 6/20, 6/20 and 2/20, and the average rank is 2.45/2.25/2.80. The rivals run the same planner; the race is back near the original 3/6/3, not easier. Do not bank the player's absolute score against a relative rank.

**Rejected:** a flat `gold/4` weight (0.5 points per gold, far below the ~4 the same-band Toll/Mill flip needs); a hard-coded gold phase; a loot value with no band check; the first build's 1.25 points per item level (Vault 625 against the Mill's 795 at level 20/iLvl 10); a party-level XP weight (it paid capped heroes); and keeping the uncapped `ratio × 30`.

**What remains:** the day-40 raid party is still iLvl 48–52 against the next wall, a gap of ~100. On the board-only build, 129/129 Tyrant attempts were below the 225 recommendation (mean 151, −33%), and the reward model does not close that gap. The purse is smaller: the mean board-only run ended 2,509g short of its cheapest unbought facility tier, and the planner still has no facility/hire reserve. Loot assignment and the raid ten are measured in §3.6; the role-affinity pass is the next lever, not a larger loot weight.

### 3.6 Loot assignment and the raid ten (2026-10-31)

**The decision.** A clear no longer gives gear to the lowest-geared party member. It queues untargeted items in `pendingLoot`; the player gives each to any hero, or the next Advance takes the suggestion. The default ranks the whole roster by the actual slot upgrade, with a +4 item-level bias for a hero on the `raidTeam`. A drop no hero can use is discarded at queue time, not assigned and wasted. The AI's auto uses the **old** lowest-geared-in-the-clearing-party pick as a floor; the player's default (and `loot auto`) uses the need pick. That is deliberate: an AI that takes the need pick for every guild made the ladder too easy (§3.6.2), and the player's choice is the feature.

**The ten.** `raidTeam` is a standing list, built at the first raid the guild can enter, from the best ten at that moment; `ensureRaidTeam` appends missing heroes and never replaces a live name. The planner sends it, fills injuries from the bench for one night, and falls back to the best legal party if the team cannot meet the gate. `raidteam auto` re-picks; `raidteam <heroes>` sets; `roster` marks members with `★`. Growing the team from day 1 was measured and rejected: it keeps the starters, not the best ten at the wall (44/60 below).

**Measured.** 20 seeds for the pre-feature build (59be992); 10 seeds for the three feature arms, seeds 1+17i. The 10-seed columns are noisier; read the full-clear totals, not single scores.

| Build | Steward | Quartermaster | Gambler | Full clears | Day-40 team iLvl | Day-60 team iLvl | Wasted items |
|---|---:|---:|---:|---:|---:|---:|---:|
| 59be992, no queue, nightly best ten (20 seeds) | 23,087 | 24,520 | 21,549 | 13/15/12 = 40/60 | 50/48/52 | not measured at this build | 28.2% (10 seeds) |
| Shipped AI, conservative pick (10 seeds) | 25,337 | 25,513 | 21,474 | 16/16/10 = 42/60 | 46/46/51 | 92/107/92 | 514/577/466 |
| Need pick, same team (10 seeds) | 25,434 | 26,600 | 23,040 | 18/20/14 = 52/60 | 55/50/55 | 115/113/99 | 0 |
| Need pick, starters grown from day 1 (10 seeds) | 24,322 | 24,070 | 24,197 | 14/14/16 = 44/60 | 52/50/55 | 106/109/97 | 0 |

World First and average rank, in the same order: 6/6/2 and 2.45/2.25/2.80 (59be992); 10/10/6 and 1.90/1.60/2.60 (shipped); 4/4/2 and 2.70/2.60/2.90 (need, all guilds); 4/3/2 and 2.20/2.40/2.70 (starters). The rank is relative: the need arm switches all four guilds, and its rank falls while its absolute score rises. The shipped AI's rank improves because every guild now holds a stable ten and the player's seed and roster happen to sit better; that is not a player-only edge. The player-only override (the player uses the need pick while the rivals stay on the floor) was not measured; the all-need arm is its upper bound.

**What the numbers say.**

1. **The conservative AI holds the full-clear total, but the wall is softer.** 42/60 sits inside the 36–46 total, yet the Steward stalls 4/20 against the 6/20 target 3 (the Quartermaster 4/20, the Gambler 10/20). The score moves +9.7% / +4.1% / −0.3%; the Steward is outside the +0–8% guard and the Gambler's 21.5k is under the 23k floor (10 seeds, ±1k). The player's need pick is 23.0k on the Gambler. The next balance pass is the wall and the Gambler's floor, not a larger loot weight. The 24% waste is the old pick, measured, not hidden.
2. **The player's pick is worth more than the AI's floor.** In the all-need lab (all four guilds) the need pick converts the 24% waste to 0 and adds 10 full clears (42 → 52), mostly the Quartermaster (+4) and Gambler (+4), and lifts the day-60 ten by 6–23 item levels. The player-only override was not measured; against old-rival AI it can only be at least this good on absolute gear and score. That is the "who gets the axe?" decision: the same drops, a different target.
3. **The stable ten does not close the gear gap.** The day-40 ten is 46–55 iLvl against the 65 target; the shipped AI is 1–4 iLvl below the nightly best-ten it replaced at day 40, because the team is fixed at the wall while the best ten keeps moving. The need pick recovers some of it; the gap remains. A 60-run baseline counterfactual (every drop to the best-gaining ten hero, ten re-picked daily) lifts the day-84 ten from 165.5 to 188.4 iLvl (+22.8, 38% of the 59.5-point gap to 225) and heroes at ≥205 from 0.57 to 3.68/run; it is still ~37 below the wall. The destination is real; the gear **rate** is the binding constraint. The next lever is the loot rate or a measured wall-change re-pick, not a larger `teamBias`.
4. **The bench is not starved.** The team ends at 153–200 iLvl against a bench median of 138–201; the team takes 62–69% of items. The +4 bias is a thumb on the scale, not a wall.

**Rejected:** storing the suggestion (it goes stale after the first of two same-slot drops; the target is recomputed at apply); the old lowest-geared pick as the **player's** default (24% waste); the need pick as the **AI's** default (all-need 52/60 is above the full-clear target and the Quartermaster clears 20/20); a per-drop blocking modal (a raid drops 4–5 items; the queue would gate most days); a persistent priority list (a second roster, no slot awareness); the starters team (44/60); a pre-party funnel target (the slot is not known when the party is set); a gear stash (four numbers per hero, no capacity model); class or role restrictions on items (no item entity exists); an RNG tie-break (roster order is deterministic and legible).

**Cost:** the queue is bounded by the day's clears and consumed on the next Advance; the AI clears its own queue at the end of its turn. A `loot` command and a `raidteam` line replace no existing screen. `sim --runs 20` was not re-timed; the added work is one party ranking when the team is missing, and a full stable team returns without ranking.

### 3.7 The Broken Bridge: the missing mitigation mission (2026-10-31)

**The gap.** The contract board rotates pay and level, not the check. Four of seven missions are mechanics; the spare party had no tank job. The first candidate (level 18, mitigation 36, **300g**, 60xp, one 26–40 item) was played 2.6–3.6 times per run and posted on about a third of open days, but a 10-seed arm made the Quartermaster clear 20/20. It was reverted, not shipped ([learnings.md](learnings.md) L86).

**The second pass.** One dial at a time, 20 seeds per personality (seeds 1+17i, `runWorld`), against a control on the same harness. `req` is the mitigation requirement. The mission's `recommendedIlvl` is 30 (display only; the planner prices walls, not side missions).

| Arm | Steward | Quartermaster | Gambler | Full clears | Bridge clears/run | First clear day |
|---|---:|---:|---:|---:|---:|---:|
| Control, no mission | 24,966 | 26,061 | 21,176 | 15/17/9 = 41/60 | — | — |
| 300g, req 36 (the reverted arm, 20 seeds) | 24,402 | 26,282 | 20,978 | 15/18/10 = 43/60 | 2.60/2.85/3.60 | 29.1/31.4/28.5 |
| **220g, req 36 (shipped)** | **24,991** | **26,882** | **20,821** | **16/19/9 = 44/60** | **2.40/2.85/3.45** | **29.1/31.4/28.5** |
| 200g, req 36 | 24,532 | 26,859 | 21,226 | 15/19/10 = 44/60 | 2.45/2.70/3.35 | 29.1/31.4/28.5 |
| 160g, req 36 | 24,330 | 26,739 | 21,186 | 15/19/10 = 44/60 | 2.35/2.65/2.85 | 29.1/31.4/28.5 |
| 220g, req 40 | 24,440 | 27,003 | 20,201 | 15/19/8 = 42/60 | 2.55/2.85/3.30 | 29.9/31.9/28.8 |
| 180g, req 40 | 23,654 | 26,838 | 20,737 | 14/19/9 = 42/60 | 2.25/2.55/2.70 | 29.9/31.9/28.8 |

**What the numbers say.**

1. **Gold is not the lever.** 160g, 200g and 220g all produce 44/60 and a Quartermaster at 19/20. The mission's value is the extra full-pay night and its item, not the 80g difference. The 300g arm's 20/20 did not survive a 20-seed sample: it is 18/20 here. The 300g diagnosis in L86 was a 10-seed read of a sensitive ladder.
2. **The requirement is not the lever either.** Requirement 40 leaves the Quartermaster at 19/20 and costs the Gambler a full clear (10 → 8 at 220g, 9 at 180g) and the Steward one at 180g. The over-gearing personality clears a tank check by gear, which is the point of the check; raising it punishes the under-geared guilds first.
3. **The gate passes.** The Steward is 14–16/20 in every arm; no personality reaches 20/20 in any 20-seed arm. The Quartermaster is 19/20, above L86's 15–17 expectation and one clear below the failure gate. That is the cost of an extra full-pay night for the spare party: it converts into gear, and gear is the QM's edge.

**Shipped: 220g, 60xp, one 26–40 item, mitigation 36 at level 18.** It is the ceiling the brief allowed and it stays below the Toll House's 260g, so the mission cannot fund a raid on its own. The test `adds the missing mitigation mission in the mid band` holds the gold at ≤220 and the check at mitigation; the schema tests hold the drops inside the band.

**Rejected:** 300g (the reverted arm); requirement 40 (costs the Gambler for no Quartermaster movement); 180g/req 40 (Steward 14, the floor, for no gain); a second mitigation mission (one is enough); 160g (identical ladder within noise, and it makes the level-18 job pay less than the band below without teaching anything).

### 3.8 The renewal counter and the transfer request (2026-10-31)

**The decision.** A contract inside its 7-day window can be renewed at market (safe), countered 12% under (a cut), or released. The hero takes the cut when it clears his floor; the floor is visible morale and days left times hidden loyalty. A refusal is final: he names a 25% raise, and the next item is meet it or let him walk. A broken promise raises a one-shot transfer request: grant it and the buying guild pays half his recruit fee, or refuse it for −10 morale.

**Measured, 20 seeds per personality (seeds 1+17i, `runWorld`), against the bridge-only build on the same harness:**

| Build | Steward | Quartermaster | Gambler | Full clears | Bridge clears/run |
|---|---:|---:|---:|---:|---:|
| Bridge only (220g/36) | 24,991 | 26,882 | 20,821 | 16/19/9 = 44/60 | 2.40/2.85/3.45 |
| Bridge + contracts | 25,238 | 26,302 | 21,208 | 16/18/10 = 44/60 | 2.25/2.25/3.35 |

The total is unchanged. The Gambler gains a full clear and 1.9%, the Quartermaster loses one and 2.2%, the Steward is +1.0%. At 20 seeds ±1 full clear is noise; the honest reading is **balance-neutral**, with the negotiation consuming queue actions and a little spare-party time.

**The first tuning was free money.** 15% under with a 22% maximum and a narrow loyalty band accepted **398 of 401** counters in 30 runs. Retuned to 12/15 with a 0.45–1.27 loyalty band and a hint margin: 269–324 accepted and 57–68 refused per personality over 10 runs each (15–20% refused). A refusal's 25% raise against the 12% cut leaves a 4.6% expected saving at 80% acceptance. The counter is a risk, not a button.

**The first build also released starters.** Moving the wage-budget check above `contractChoice`'s early return took the Steward to 12/20 and the Gambler to 6/20. Restoring the early return ("the raid team is kept at any price") restored 16/20; the lesson is L89.

**The transfer request is not exercised by the sweep.** The AI's own promises never fired in 10 runs: `benched-unhappy` needs morale ≤58 and three bench days, and the AI keeps morale high. Its harness is the five unit tests. That is honest but thin; the next promise lever is the planner reading `contract.status`, which the bot still does not do.

**Rejected:** a three-round escalating negotiation (the queue has no numeric input and the extra state would live on the hero for no measured gain); a seeded roll (unpriceable by the bot and unnecessary when a threshold works); a transfer with no fee (granting would be strictly worse than refusing); a rival-purse model (rival gold is a separate `GameState`); RNG in `deriveAttention` (it runs several times a day and would reshuffle the world).

---

## 4. What the numbers taught

1. **Requirements must be derived from measured capability, not from intuition.** My first pass had Hollow Crypt at dps 120 when a fresh level-10 five-man produces **38**. The AI dutifully farmed for eighty days. A measurement script (`tmp/measure.ts`, since deleted) that prints a party's check values by level is now the first thing to run when adding content.
2. **The raid party must be *rested*, not merely assembled.** Ten fresh heroes is a scheduling problem, not a roster problem. Without explicit prep, the AI never raids — it always has someone at 70 fatigue.
3. **Free recruits are load-bearing.** Hiring alone cannot fill ten raid slots inside 84 days at wage-budget prices; the three dungeon-clear joins are what make the raid reachable.
4. **Level gates should use the average.** A single level-20 hero among nine level-60s blocked the raid forever and produced a silent dead end — the worst kind of bug, because nothing looks broken.
5. **Personalities are a tuning instrument.** Three parameter records (caution/ambition/thrift) produced three genuinely different games, and the spread is a better difficulty dial than any single "AI strength" number.
6. **More options are additive unless they trade something.** Giving every new content gold, XP and loot moved the Steward +5,062 score and +0.30 raids. Specialising each option (XP run has no loot, gold run has no XP, loot run has neither) put the ladder back on its measured line. The user's "each one meaningful" is a balance rule, not only a copy rule.
7. **A list of what you cannot do is noise.** Availability is three gates (prerequisite, roster, average level), the list hides everything else, and one `unlock` event per area replaces the wall of "locked" rows. The old table showed nine locked entries out of ten and still called a level-6 farm "open" at level 1.
8. **The wall has to move with the ceiling.** Side content made the raid party stronger; the Tyrant's requirements had to go up 15% to keep the 14/20 stall. When the wall moved, the rival dial had to move with it — 0.85 in the old compressed model, 0.9 as the XP multiplier on the planner-driven guilds. Content, difficulty and race are three measurements of one ladder, not three independent dials.
9. **Show the check before the attempt.** The content list now prints the best legal party's projected best pull. The same number the War Room uses is on the choice screen, so "open" no longer means "probably a wipe".

---

## 5. Events and facilities (Phase 1)

Two additions turn the day from administration into a decision.

### 5.1 Event cards

Ten cards, drawn with 40% probability per day after day 3, with a four-card cooldown and no immediate repeats. Each is a decision with a cost on both sides:

| Card | Trigger | The decision |
|---|---|---|
| A rival comes calling | roster 8+, best level 18+ | match the offer (400g + a permanent 60% raise) · refuse and lose him |
| The cursed blade | any hero | buy cheap power at a morale cost · walk away |
| Bandits hit the farm | gold > 100 | pay them off · send the party and take a three-day injury on a random hero |
| An apprentice asks to join | roster < 20 | take a free recruit · send them home |
| Homesick | any hero | give your best hero a week off · make him raid |
| A patron with coin | gold ≥ 150, renown ≥ 1 | take 900g and lose renown · stay independent |
| Public provocation | always | answer in the square for 100g · say nothing |
| Poachers in the wood | any hero | send your best and lose days · ignore and lose gold |
| An old wound | any hero | rest him (two days, no health lost) · make him fight |
| A merchant at the gate | gold ≥ 300 | buy the plate · save the coin |

Cards are **data** (`src/sim/content/events.ts`): a weight, a `when` predicate, a target selector, and declarative effects that reuse existing systems (gold, morale, gear, injury, wage, recruit, leave). No new mechanics, ten new decisions. One invariant keeps them honest: **every hero effect on a card must name the card's own target**, because `applyEffect` resolves the card's subject, not the effect's `target` field. A test asserts it.

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

Not fixed, at the time: **the AI answered every card with its first option**, because nothing read the option effects. That is §5.4.

### 5.4 The AI plays the cards (2026-10-31)

The card was presented to the bot, not played by it: `aiTurn` took `options[0]`, so "a rival comes calling" always paid the ransom and "the cursed blade" was always bought. Every option already carried declarative effects; nothing read them. `src/sim/ai/cards.ts` now turns those effects into one number and takes the best **affordable** option.

**The model.** Value is in gold, because every other lever the planner pulls is priced in it. The weights are data (`EVENT_VALUE` in `tuning.ts`) and each names the in-game number it came from:

| Effect | Weight | Where the number comes from |
|---|---|---|
| gold | 1g | the unit. A purchase is weighted ×(1 + thrift × 0.6): the cautious bot sees the same 300g as 480g |
| xp | 0.5g | the band trade: the Wolf Den pays 60 XP and 40g more than the Warrens |
| morale | 2g | `moraleMod` spans 0.952–1.06, so 10 points is 1.2% of a check — about three item levels on one hero |
| item level | 10g | the merchant card's own price: 300g for 40 iLvl, the only gear price in the game |
| injury day | 45g | farm gold + daily wage + the substitute's lost output |
| one percent of output lost to fatigue | 2g | `condMod` loses 0.38 over 70 points |
| renown | 150g, 300g when the bill is at the budget | `ECONOMY.wageBudgetPerRenown` and `SCORE.renownPerTier` |

Three terms are state-dependent rather than constant. Morale is valued through the clamp, so a +6 on a hero at 96 is worth four points. Gear is worth only the **upgrade**. An injury costs 1.6× when the roster is 11 or smaller, because there is no spare body and the night cannot be fielded. A wage raise is priced for the weeks left in the run (`ceil(daysLeft / 7)`), so the same raise is cheap on day 80 and expensive on day 20.

**What the bot decides.** 2,031 cards answered over 60 runs (20 seeds × 3 personalities):

| Card | Option | Steward | Gambler | Quartermaster |
|---|---|---|---|---|
| rival-offer | match / refuse | 60 / 17 | 58 / 20 | 56 / 20 |
| bandit-raid | fight / pay | 93 / 0 | 93 / 0 | 68 / 22 |
| cursed-blade | buy / pass | 19 / 61 | 20 / 59 | 16 / 64 |
| old-wound | push / rest | 76 / 1 | 49 / 24 | 78 / 1 |
| homesick | stay / leave | 75 / 2 | 71 / 6 | 78 / 3 |
| poacher | hunt / ignore | 80 / 0 | 80 / 0 | 78 / 5 |
| merchant | pass / buy | 81 / 0 | 80 / 0 | 79 / 0 |
| taunt | answer / ignore | 71 / 1 | 71 / 6 | 70 / 0 |
| apprentice | take | 20 | 20 | 20 |
| sponsor | accept | 20 | 20 | 19 |

The split that matters is cursed-blade: the bot buys the 55-iLvl blade **early**, when it is a real upgrade for its weakest hero, and walks away later when the same 250g buys nothing. Same card, same option order, opposite answers — a test pins both ends. Of the 231 rival offers (76–78 per personality), 15–18 per personality were refused *after weighing* matching and only 2–4 because the purse could not cover the 400g, so the hero loss is a decision and not a forced event.

**What the trace exposed.** Four content bugs, all fixed in the same change:

1. **"Send the party" hurt nobody.** The bandit card targeted the guild, and `applyEffect` resolves a hero effect against the card's subject, so the injury was a no-op and fighting was free. The card now targets a random hero, and a data test asserts that every hero effect names the card's target.
2. **"Rest him properly — health restored" took 30 health.** The injury effect always dealt the wound. It now takes an optional `healthHit`; the rest option sets it to 0.
3. **"Answer in the square" was strictly better than silence** (renown +1, morale +6, no cost). It now costs 100g, so a broke guild can only keep quiet.
4. **The rival's offer was a coin flip on a young guild.** With refusal meaning "he walks", a three-hero guild under 400g lost its best hero on day 8 and finished the seed with an empty roster and a score of 501. The card now fires only at roster 8+ and best level 18+: nobody poaches a level-8 adventurer.

**Measured.** Standard 20-seed sweep, before and after:

| Build | Steward | Gambler | Quartermaster | Raids (S/G/Q) | Full clears (S/G/Q) | World First (S/G/Q) |
|---|---|---|---|---|---|---|
| Cards answered with `options[0]` | 23,051 | 21,661 | 24,441 | 2.70 / 2.60 / 2.80 | 14 / 12 / 16 | 4 / 3 / 5 |
| Cards priced and chosen | 23,515 | 20,664 | 24,293 | 2.75 / 2.50 / 2.75 | 15 / 10 / 15 | 3 / 2 / 6 |

The aggregate moves 69,153 → 68,472 (−1%), inside the ±1k-per-personality noise band this report uses. The one personality outside it is the Gambler (−4.6%), which is the drifty spender: it can cover the 400g ransom less often — 4 offers unaffordable against 2 for the other two — and pays with a hero. That is thrift paying a second time, not the model mispricing. Re-check this row before touching `EVENT_VALUE`: if the Gambler stays below 21k on a second sweep, the 400g reserve is the dial, not the wage weights.

**What the card play still cannot do.** The rival guilds do not draw cards, so the drama is solo. A refusal that costs the hero is modelled; a refusal that leaves him unhappy and disloyal is not. And nothing in the model makes a card's *option* depend on the guild's state, so "match the offer" is either affordable or invisible.

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

### 6.4 The role reviewer and the affinity table (2026-10-31)

The planner resets every hero to their natural role each morning, picks the team, and then gives the planned parties their best roles for the night. The old reviewer accepted any party below 1.1 and the first improving alt. That gate, not the affinity table, was the cause of the 3.5% re-spec rate: it re-specced parties in the 1.0–1.1 band that already cleared and paid the 0.88 fit on checks nobody needed. With a 1.30 signature table the same gate re-specced **16.8% of days** (423/2,520), a five-fold increase.

The shipped reviewer only touches a party projected **below 1.0**, accepts a gain of **≥0.015**, picks the **best** alt, caps at **two flips** per party, stops at 1.0, and records the check and delta in the note. It no longer re-specs a party that clears.

**Measured, 10 seeds per personality, seeds 1+17i.** The 1.15 row is the shipped build; the 1.30 rows are the rejected widening.

| Build | Steward | Quartermaster | Gambler | Full clears | World First | Flips |
|---|---:|---:|---:|---:|---:|---:|
| 1.15 table, old reviewer (869d993) | 25,337 | 25,513 | 21,474 | 21/30 | 13/30 | 3.1% of days |
| 1.15 table, shipped reviewer | 25,637 | 25,818 | 21,474 | 21/30 | 15/30 | 8/7/5 days per 10 runs |
| 1.30 table, old reviewer | 24,279 | 24,082 | 20,714 | 19/30 | 8/30 | 16.8% |
| 1.30 table, gate with revert-if-not-crossing | 26,460 | 24,776 | 18,882 | 22/30 (Steward 20/20, Gambler 8/20) | 7/30 | 5% |
| 1.30 table, gate with partial keep (the code) | 22,012 | 26,439 | 17,912 | 17/30 (Steward 10/20, Quartermaster 20/20, Gambler 4/20) | 6/30 | 14/11/7% |

The 1.30 table does what O5 asked for the **decision**: re-specs rise five-fold, the targets spread from Vanguard/Trickster to Bulwark/Oracle/Lightbringer, and the median day-40 projection rises 1.32 → 1.48. It does not do it for the **ladder**: the full-clear total moves 17–22/30 depending on the reviewer's gate, the Steward swings 10/20–20/20 and the Gambler 4/20–8/20, and the score effect is inside the 10-seed noise (−1,083 ±6,888 on the old reviewer). The smaller 1.25 table repeats the volatility without the decision gain. The table stays **1.15**.

**The role lever is a short-content tool, not a raid one.** A flip moves one hero by 8.9% on the switched check and −42.5% on the off-check; in a 10-hero raid that is 1.7–3% of a phase, while a 3-hero mission can move 13% of a check with two flips. The content did not collapse under any arm: every non-Tyrant area stayed 100% entry/clear, the Tyrant entry rose 80 → 87–97%, and the requirements were not bumped. The 1.15 table keeps the role choice flat on the ladder; the reviewer makes it legible, and `checkPowerInRole` plus the `role` command show the four check deltas so the chip row no longer argues against every switch.

**Rejected:** the 1.30 signatures (the ladder volatility above); the 1.25 fallback (same volatility, no decision gain); trained fit 0.95; 12 roles; per-check bonuses; class-locked content. The next lever if roles must decide raids is a party-level mechanic, not a bigger table.

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

- **The world run costs ~10× the guild run.** Three rivals × 84 planner turns is 1.1 s per run on a quiet host; `sim --runs 20` is ~65 s. The race is real, not free.
- **The AI's auto is the floor, not the ceiling.** A clear queues untargeted drops; the player assigns them, or the next Advance takes the need suggestion. The AI's own auto keeps the old lowest-geared-in-the-party pick, which wastes 24% of items (514/2,158 on the Steward, 10 seeds); the player's need pick wastes 0 and adds 10 full clears in the all-need lab (§3.6).
- **The need model is coarse.** The planner now prices the purse, the next wall's level gate and the raid party's gear gap (§3.5), and assignment prices the actual slot (§3.6), but the planner's `lootValue` still measures the band against the worst hero's average, named drops and forge `lootIlvl` are ignored, the purse has no facility/hire reserve, and the value does not price `traitEconomy` or the rival `rewardScale`. The gear gap is the sharp one: on the board-only build 129/129 Tyrant attempts were below the 225 recommendation (mean 151, −33%); the day-40 team is 46–55 against the 65 target. The purse is smaller: the mean run ended 2,509g short of its cheapest unbought facility tier. Both are gear-rate problems, not content-choice ones.
- **Repeatable missions are capped by the contract board, not by a decay.** The Drowned Mill is 26.4 → 13.75 clears/run; the board costs ~2.5% of score and three Steward full clears (§3.4). Four of seven missions are mechanics; The Broken Bridge now adds the missing mitigation job (§3.7). Its gold is the ceiling, not the fix: 160–220g all produce the same ladder. See [open-questions.md](open-questions.md) O7.
- **The stable ten is fixed at the wall.** `raidTeam` is built at the first open raid and kept; it does not re-pick at a wall change. Day-40 team iLvl is 46–55 against the 65 target, and the shipped AI is 1–4 iLvl behind the nightly best ten it replaced. `raidteam auto` is the manual re-pick; a measured wall-change re-pick is the follow-up.
- **Role assignment is legible, not a progression lever.** The reviewer only re-specs a party below 1.0 (8/7/5 days per 10 runs at 1.15), and `checkPowerInRole` plus the `role` command show the four check deltas. The 1.30 affinity table was measured and rejected (§6.4); the 1.15 table keeps the role choice flat on the ladder. The role lever is 5–13% of a check on a 3-hero mission and 1.7–3% per flip in a raid; if roles must decide raids, the next lever is a party-level mechanic, not a bigger table.
- **Promises are a debt, and a broken one now asks to leave.** The ledger writes a due day, counts starts, and settles kept/broken (§7.1a). The missing half also ships: a renewal is a 12% counter with a 25% raise on refusal, and a broken promise raises a one-shot transfer request whose grant pays half the recruit fee. The planner still does not read `contract.status`, so the bot cannot plan around a promise it made; that is the remaining hole. The counter fires on almost every renewal the AI takes (269–324 accepted and 57–68 refused per 10 runs), so it is a real risk, not a rare event.
- **The counter is a wage cut, not a wage reset.** A hero who takes 12% off is renewed on the cut wage, but the next renewal re-prices from `renewalWage`, which never goes below market. The saving lasts one contract. If it should compound, the mechanism is a stored market discount, not a lower `wage`.
- **Facilities now compete with wages.** Before the re-pricing the AI maxed the tree by ~day 70 and ended with ~10k; now it ends with ~2k and one tier short. That is the intended tension, but the facility prices were set against the old, broken wage bill.
- **No early-game pressure.** The first ten days are pleasant but consequence-free; there is no wage crisis until the roster is expensive.

---

## 8. What to do next

1. **The vertical-slice UI.** The non-UI backlog is done: the role reviewer, the contract board, the reward-aware planner, loot assignment, the mitigation mission (§3.7) and the contract/promise half (§3.8) all ship. [ADR 0002](adr/0002-ui-framework.md) accepted React + Vite on 2026-10-30, so the framework gate is closed; what is left is the screen that makes the queue playable.
2. **The wall is still the balance item.** The Quartermaster clears 18/20 on the shipped build (19/20 with the bridge alone); the day-40 ten is 46–55 iLvl against 65. The next non-UI lever, if the UI waits, is the gear rate or the wall-change re-pick (§3.6), not another mission.

The role reviewer and the check readout are done; the affinity table stays 1.15 until a party-level mechanic is designed.
