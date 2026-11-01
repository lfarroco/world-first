# Learnings

Running log. Newest entries at the bottom of each section. One entry = one thing we now know that we did not know before.

Format: **what we learned → the evidence → what it changes.**

---

## Design

### L1. The day needs decisions, not a report
A turn loop that only reports outcomes becomes an idle timer by day four. FM's loop is not "assign → simulate"; it is "advance → interruption → decide".
**Evidence:** reviewing the original GDD loop with the FM teardown in hand.
**Changes:** the attention queue is blocking; Advance Day is disabled until resolved. See `guild-manager-model.md` §7.

### L2. One number cannot carry a squad game
`combined iLvl vs boss iLvl` collapses every squad decision into "maximise the sum". FM's depth per player is `(attributes) × (role) × (system) × (opponent)`.
**Changes:** attributes are the currency, iLvl is derived; 8 attributes × 8 roles × role affinity.

### L3. Wipes must name the failed check
"You wiped" is a slot machine. "DPS check failed, 288 vs 330, short by 42" is a puzzle with a solution.
**Changes:** every phase resolves to clean/pass/scrape/fail with both numbers; the report ends with a *next lever*.

### L4. Two clocks beat one
Fatigue alone rewards benching everyone. Condition plus sharpness creates a rotation you have to reason about: rest fixes fatigue and destroys sharpness.
**Evidence:** FM's condition/sharpness pair; community testing suggests sharpness matters more.
**Changes:** both exist, both feed `formMod`.

### L5. Caution beats recklessness, because injury debt compounds
**Evidence:** AI sweep, 10 seeds per personality. The cautious Quartermaster scored 26,514 and took 5/10 world-firsts; the Gambler scored 21,907 with 0/10. The Gambler's errors are not bad fights, they are bodies it cannot replace.
**Changes:** push stance softened (injury ×1.9 → ×1.55). Personalities are the difficulty dial.

### L6. Railroading is fine; skipping is not
Level gates plus prerequisite clears made the first ten days feel like levelling instead of a small raid tier.
**Changes:** every content entry carries `minLevel` and `requires`.

---

## Engineering

### L7. A module-level counter breaks replay
Event ids came from `let counter = 0`. Two calls to `resolveDay` produced different ids, so the determinism test failed on its first run.
**Evidence:** `expect(resolveDay(s)).toEqual(resolveDay(s))`.
**Changes:** ids are derived from content (`e<day>-<hash>-<index>`). Never a global counter.

### L8. `readonly` types fight spread updates
Deep-mutable state with `readonly` fields produced 24 compile errors in the first draft, all of the "cannot assign to readonly property" kind.
**Changes:** `resolveDay` deep-clones with `structuredClone` and mutates locally. Guarantee is behavioural and tested, not type-level. Recorded in ADR 0001.

### L9. Requirements must come from measured capability
The first Hollow Crypt needed dps 120. A fresh level-10 five-man produces **38**. The bot farmed for eighty days, correctly, because nothing it could see was ever reachable.
**Evidence:** a measurement script printing party check values by level.
**Changes:** content requirements are set from that table, ~10–20% above it. Measure before you tune.

### L10. Level gates should use the average, not the weakest
One level-20 hero among nine level-60s blocked the first raid forever. Nothing looked broken: no error, no event, just a bot that never raided.
**Changes:** `levelOk` compares the party's average level to `minLevel`.

### L11. Ten fresh bodies is a scheduling problem
The bot never raided until it was taught to *hold back* its raid party and rest it. Grinding every day guarantees someone is at 70 fatigue on raid night.
**Changes:** explicit raid prep in the planner (`src/sim/ai/planner.ts`).

### L12. Camping is a scoring bug, not a strategy bug
When cleared and uncleared content scored similarly, the AI re-ran the first dungeon for fifty days. Priorities must make progress dominate: uncleared content gets a large flat bonus, cleared content is scored by XP and gold.
**Changes:** `scoreContent` in the planner.

---

## Research (Football Manager)

These are summarised here because they changed decisions. Detail and sources: `docs/fm-blueprint.md` and `docs/research/`.

### L13. Copy FM26's six hubs, not FM24's fourteen modules
SI collapsed a 14-module sidebar into Portal / Squad / Recruitment / Match Day / Club / Career. A six-screen browser game should use the newer shape.

### L14. Do not build a dashboard *and* an inbox
FM had both; telemetry showed nobody used the dashboard, so SI merged them into Portal. One obligations-first surface wins.
**Changes:** the Guild Hall is an attention queue with supporting panels, not a dashboard.

### L15. FM hides the overall rating, and we should break that rule deliberately
FM never shows an OVR. A browser game needs one sortable quality column — but only if the simulation uses role-weighted scores rather than the headline. Otherwise the number becomes the game.

### L16. The best mechanic to steal is Consistency
Consistency 20 performs at full ability in ~20 of 25 matches; 1 in ~1 of 25. One integer creates "brilliant but unreliable".
**Changes:** per-pull consistency roll; an off night is named in the report.

### L17. Scouting fog belongs on the ceiling, not the attributes
In FM, attributes converge to true values when scouted; it is the *potential* estimate that lies. Fog on PA is the whole transfer fantasy.

---

## Process

### L18. Two of the three attached plans were the same document
The "long-term vision" attachment was byte-different but content-identical to the MVP GDD. Reading filenames instead of contents would have wasted a cycle.
**Changes:** read inputs before planning around them; say so when they are duplicates.

### L19. The plan document must be marked historical when it stops being true
After the progression rework, six documents still described the previous design. Stale docs are worse than no docs, because they are trusted.
**Changes:** `Historical` banner convention; `npm run docs:check` fails on stale vocabulary (the previous design's run length, boss count and old filenames).

### L20. A cached list must never be the only gate
`advanceDays` checked the cached `attention` array. A state with a pending event but a stale queue advanced straight through the card — found by a test that constructed exactly that state.
**Changes:** `hasBlocking(state)` checks `pendingEvent` directly; events are also addressable by id (`event:<card>:<day>`) so resolution works even with a stale cache.

### L21. A gold sink must be priced against the endgame surplus, not the early game
Facilities at 600g were noise against a 29k purse. At 900–4800g across four branches, the AI maxed the tree by ~day 70 and ended with ~10k.
**Evidence:** end-of-run gold before 17–29k, after ~10k; the balance sweep moved less than 0.2 raids.
**Changes:** prices set from measured surplus, not from intuition.

### L22. Events are data; *choices* are not yet
Cards resolve through declarative effects, so content is cheap to add. But each option's cost lives in prose, so the AI always takes `options[0]`. The drama is presented, not played.
**Changes (next):** give options machine-readable cost/benefit fields so the planner — and later the rivals — can weigh them.

### L23. The simulation trusted whatever party the CLI gave it
`party --heroes 1,1,1...` put the same hero in ten raid slots. `resolveDay` paid XP for every slot: Gareth went from level 1 to 34 in one day. A locked raid accepted one hero, and `--stance bananas` crashed with `Cannot read properties of undefined (reading 'check')`.
**Evidence:** CLI session on seed 7, 30 October.
**Changes:** `validatePlan`/`sanitizePlan` in `plan.ts`. `resolveDay` drops invalid parties and emits "Plan ignored"; the CLI refuses before saving; `isStance` is checked. Regression tests in "plan safety".

### L24. A counter named `raidsCleared` counted dungeons
`RIVAL_LADDER` is three dungeons plus three raids, and `tickRivals` incremented `raidsCleared` for both. The World First check was `raidsCleared >= 3`, so a rival claimed World First after clearing the *first* raid. The player's World First rate was ~0/10.
**Changes:** World First requires `raidsCleared === RIVAL_LADDER.length`; `rivalRaidsCleared()` gives the display count; the type comment now says stages.

### L25. Rivals grew slower by raiding
An attempt day grew a rival at 0.5× a farm day, so Echoes (95% attempts) grew slower than Methodical (55% attempts). All three finished after the player, and fixing L24 made World First 9/10.
**Evidence:** 10-seed sweep before and after; rival finish days moved from 70–84+ to 58–79.
**Changes:** `RIVAL` in `content/tuning.ts`: 0.9× farm, 0.9× attempt, 0.6× clear, plus a `pace` dial. World First was 6/10, 6/10, 3/10 immediately after this change; the Tyrant pass (L30) and the one-party-per-content fix (L34) took it to 2/10, 2/10, 3/10 (Steward, Quartermaster, Gambler). See progression-report §3.2.

### L26. One factor, applied twice
`makeCandidate(seed, day, index, guildLevel, factor)` multiplies by `factor` internally. The free-recruit path passed `0.55 × best` as `guildLevel` *and* the tavern factor, so free recruits arrived at ~34% of the best hero, not 55%. It is invisible in a single run; it only shows when you compute the expected level.
**Changes:** pass `bestLevel` and `0.55` once. A test compares the new recruit to `makeCandidate(...)`.

### L27. The CLI advanced through blocking items
`advance --days N` resolved the day and *then* checked the queue. A pending event card did not stop the day; the player got a free day and the card stayed open. `advanceDays` had the check; `cmdAdvance` had its own loop and did not use it.
**Changes:** check `hasBlocking` before `resolveDay`. Also: a finished run is not a day — `deriveAttention` returned contract items for day 85, so every screen offered decisions that could not matter. The guard is now in `deriveAttention`, and a test asserts a finished run has no items.

### L28. One hero, one slot is a rule, not a UI convention
`assignParty` appended a second party instead of moving the hero, so the starting farm and a new mission shared all three heroes. The CLI had no way to clear a party, so a human could not rebuild the plan at all.
**Changes:** `assignParty` removes the hero from other parties and drops a party that falls below its minimum size; `clear` unassigns everyone; `status`/`today` print plan warnings.

### L29. An option you cannot afford is a debt trap, and the bot takes it
Event options had gold costs with no affordability check. On seed 1 the AI took "match the offer (400g)" and "buy the plate (300g)" with 250g, entered arrears, froze hiring, lost heroes, and ended with 5 heroes, -860g and zero raids. The design says debt is a penalty, not a game over; that run was a game over.
**Evidence:** 20-seed distribution before the fix: Steward 2/20 zero-raid runs. After: 0/20.
**Changes:** `optionAffordable` in `content/events.ts` filters unaffordable options from the card; `resolveEvent` refuses them; every card has a zero-cost option. The AI now chooses its first *affordable* option without new planner code.

### L30. Averages hide a bimodal ladder
The Steward averaged 2.7 raids, which sounds like a gradient. The distribution was 9 runs with 3 raids and 1 run with 0 — no run with 1 or 2. A balance table with only the mean hides whether the game is a wall or a slope.
**Evidence:** 20-seed distribution per personality; the mean was 2.7 and the modes were 0 and 3.
**Changes:** report the distribution in [progression-report.md](progression-report.md) §3, not just the mean. The Tyrant pass was set from the distribution, not from the average alone. A 15% requirement increase moved the average 0.1 raids; 25% moved it 0.3 and produced the intended 2–3 band. After the one-party fix the Steward distribution is 14 runs at three raids and 6 at two — still a wall, but no longer all-or-nothing.

### L31. "Projected 100%" must mean the check passes, not that the phase is reached
A human session showed Hollow Crypt at **projected 100%**. The second phase was 0.97 of its requirement — a marginal scrape, not a pass — and off-night rolls pushed it below 0.92. The pull wiped at 50% after the screen promised a clear. Dungeons also left no report, because `lastEncounter` was only written for raids, so the only explanation was "best 50%".
**Evidence:** seed 2026 session, day 26; projection 100%, wipe at phase 2.
**Changes:** `estimatedBestPull` only banks a phase at ratio ≥ 1.0. Every non-farm encounter now writes `lastEncounter`, and the wipe digest names the failed check and both numbers. `report` prints the phase table and mastery for dungeons and missions too.

### L32. A cost that clamps to zero is not a cost
The sponsor card offered 900g for −1 renown. At renown 0 the renown effect was clamped, so the choice was 900g for free — a dominant answer, which the attention-item rule forbids. The card now requires renown ≥ 1 before it can be drawn, and a test asserts the predicate.
**Evidence:** seed 2026 session, day 26: accepted at renown 0, gold 294 → 1194.
**Changes:** `canAffordSponsor` in `content/events.ts`; the hint no longer promises a "result" the sim does not track.

### L33. `docs:check` cannot see a wrong number
The model doc still described a five-boss tier with the previous run length, +26 raid fatigue, a 700 + 25×renown wage budget and 45g-per-hero farms. The build had three raids over 84 days, +22 fatigue, 200 + 120×renown + hall, and 6g per hero. Links and stale vocabulary were clean, so the check passed. A reader would have tuned the wrong numbers.
**Evidence:** [guild-manager-model.md](guild-manager-model.md) vs `content.ts` / `tuning.ts`, 30 October.
**Changes:** a "where this document and the build disagree, the build wins" banner; reconciled attribute growth, fatigue/sharpness, morale, stance, raid count, economy, attention items, score and the 84-day arc. Numeric drift is now a review item, not something `docs:check` can catch.

### L34. The AI double-ran the same dungeon
`planDay` scored every unlocked content for every party slot and never removed a content once chosen. It sent two five-man parties into Hollow Crypt on the same day — double gold, double loot, double XP and double mastery. A human cannot do it: `assignParty` replaces the same content. Seed 777 won 3/3 and scored 25,282 with this crutch.
**Evidence:** `Hollow Crypt(5) + Hollow Crypt(5)` in the day-29 and day-30 traces; after the fix the same seed clears 2/3 and scores 17,090.
**Changes:** `usedContent` in `planDay`; `validatePlan`/`sanitizePlan` reject a second party on the same content; a test runs 30 AI turns and asserts unique content ids.

### L35. The AI forfeited the last raid night
On day 83 the planner used the ten raid heroes across three dungeons. On day 84 it held them back because their average fatigue was 48, and the run ended without a Tyrant attempt. Resting on the last day is not a decision; it is a forfeit.
**Evidence:** seed 777 fixed run, days 83–84.
**Changes:** in the last four days, hold the raid party at a lower capability threshold (0.5), and on the final day attempt regardless of fatigue. The seed 777 run now attempts the Tyrant at 68% on day 84 and still loses — the fix is about giving the run its last chance, not about making it win.

### L36. Removing a crutch flattens the personality spread
The double-dungeon exploit was a volume advantage that helped the higher-caution planner most. After removing it, the sweep is Steward 22,321 / 2.60 raids, Quartermaster 23,487 / 2.70, Gambler 24,274 / 2.80. The Gambler now edges the cautious Quartermaster; the "caution wins" lesson from the first sweep is not established.
**Evidence:** 10 seeds per personality, base seed `1 + 17i`.
**Changes:** [progression-report.md](progression-report.md) §3 says the ranking is open, not a result. The next balance pass should change *one* dial — push injury risk or the cautious rest threshold — and re-measure the 2-vs-3 distribution.

### L37. The AI re-clears the tier instead of gearing the next wall
Seed 777 cleared Gatewarden 8 times and Twin Covens 6 times, then made 21 Tyrant pulls and never got past 30%. It had 16 level-60 heroes, but their item level was 148–183 against the Tyrant's 225 recommendation. Loot goes to the lowest-geared hero *in the party that cleared*, so rotating the raid party spreads gear across the roster instead of funnelling it into the ten heroes who need it. Seed 4 took the Tyrant on day 72 after 8 pulls, but still missed World First by 7 days (Methodical, day 65).
**Evidence:** seed 777 and seed 4 runs, 30 October; `status`, `progress`, and `roster` at day 85.
**Changes (next):** lock a raid roster for an uncleared boss and funnel loot to it, or make manual loot assignment the next feature. This is the same gap as "no loot choice" in [progression-report.md](progression-report.md) §7, seen from the AI side.

---

## Human playthrough — seed 4242

One run played through the CLI by hand, no `ai` or `auto` command. Result: **score 28,800, band S, World First day 52**, 3/3 raids, 3/3 dungeons, renown 16, squad rating 850, never in debt. The AI sweep scores 22–24k with 2.6–2.8 raids; the current World First split is in [progression-report.md](progression-report.md) §3. The gap is not better raids; it is what the party slots are filled with.

### L38. Level is not power, and the tavern shows neither
The day-1 tavern offered a level-4 warrior (46g) and a level-1 warrior (40g). The level 4's Power was **4**; the level 1's was **12**. The level-4 hire stayed the worst body on the roster for 84 days. `roster` prints Power, but `tavern` prints only name, class, level and fee, so every purchase is blind.
**Evidence:** seed 4242, day 1: Varis (lvl 4) power 4, Thorne (lvl 1) power 12.
**Changes (next):** show Power (and role fit) in the tavern table. The recruiting decision is the only place the game asks the player to buy a number it then hides.

### L39. A failed attempt out-earns farming, so the early game rewards throwing parties at the wall
A farm pays 10 XP per hero (Emberwood) or 22 (Old Quarry). A **failed** mission pays 35% of its XP — 42 for the Wolf Den, 70 for the Bandit Road — and a failed Ashen Spire pays 1050. From day 1 the best XP was the hardest unlocked content, win or lose.
**Evidence:** seed 4242: a Wolf Den attempt at 0.94 with push cleared on day 1; the fallback would still have been 42 XP per hero against Emberwood's 10. The top five reached level 60 on day 42 by clearing Ashen and then the Tyrant, not by farming.
**Changes (next):** decide whether a loss should pay 35% XP. If it should, the early game is "attempt and lose", which is the opposite of the intended "farm until ready". If not, cut the failure rate or remove the farm's XP.

### L40. "Rotate him into the raid" can be a no-op that still blocks the day
The benched-unhappy item has three options. `rotate` only changes state when `resolveAttention` can place the hero in a party; with no plan to place him in, it returns the state unchanged. The CLI still prints `resolved <id> → rotate`, then re-derives the item from the unchanged state, so Advance stays blocked and the same item comes back.
**Evidence:** seed 4242, day 22 — `resolve ... rotate` printed "resolved", Maud's morale stayed 56, and the next `attention` showed the identical item. `promise` cleared it.
**Changes (next):** make the queue's options total: if rotate cannot place the hero, add the promise effect, or hide the option when no party can take him. An option that reports success and changes nothing is the one thing the queue must not do.

### L41. Two different dungeons in one day is the largest XP lever in the mid-game
Only duplicate content is illegal; two *different* dungeons are not. Running Hollow Crypt (500 XP, bench five) beside Sunken Temple (900 XP, main five) gave 10 heroes 500–900 XP a day from day 11, where the AI's single dungeon gave five. Ashen Spire then paid 3000 to the main five and Hollow/Sunken kept the bench moving.
**Evidence:** seed 4242, days 11–34: Hollow Crypt plus Sunken Temple every day; the main five hit 45 by day 35 and the bench hit 30.
**Changes (next):** the planner should fill every slot with the highest-XP content that *that* sub-party can clear, and treat "same content twice" as the only forbidden pair. The current 3-slot plan does not exploit the bench.

---

## Traits (2026-10-30)

### L42. A single-phase multiplier is decisive per night and invisible per ladder
The threat changes the band on 5 of 17 uncountered pulls and causes 4 phase failures in 840 days. On the first night it is decisive: a roster without the counter attempts at ~0.97 and the 18% cut takes the phase to 0.80. The ladder barely moves because the bot retries — 2% mastery per pull plus the next drop closes the gap in days.
**Evidence:** first-attempt ratios (median 0.97 across the ladder) versus clear-day ratios (1.3–1.5 on the Spire); [progression-report.md](progression-report.md) §6.
**Changes:** keep the ×0.82. Do not raise it to 30% to move the aggregate; at 30% a 30% trait roll decides raids. If a threat should cost more than a night, price the *retry* (fatigue, injury, lost pulls), not the check.

### L43. Discovery is a free rule, and it reads correctly
`progress.attempts` already answers "have we pulled this?", so hiding a threat until the first pull cost one boolean. The pull applies it, the report names it, and the projection excludes it until then. The planner is deliberately blind on the first attempt, which is correct: a boss that can be pre-solved from the briefing is a checklist, not a fight.
**Evidence:** seed 18, day 43 — `New mechanic at Ashen Spire: Ash Veil — mechanics checks 18% harder.`; `projectAssignment` before/after `attempts: 1` differs by the penalty.
**Changes:** keep the rule for every future threat. Do not let the AI (or a wiki) read `ContentPhase.ability` before a pull; `withCounters` returns early when the content has never been attempted.

### L44. A fit derived from attributes drifts, and a dead rule hides it
`fitFor` derived "natural" from current attributes. Attributes gain two points a level, so a veteran's best role moves and the assigned role silently becomes Trained: −12% on every check. The rule had never mattered because `checkContribution` did not apply fit at all — `powerInRole` was the only caller, and nothing called it. Wiring the documented rule in dropped the Steward from 2/10 World First to 0/10.
**Evidence:** `sim --runs 10` before and after applying fit; `grep powerInRole` returned one definition and no callers.
**Changes:** `Hero.naturalRole` is fixed at creation, so fit is stable. `assignRole` changes the assigned role, and the CLI refuses cross-class roles. If the planner later reassigns roles, measure it as a new behaviour, not as a fix.

### L45. A role switch must beat the fit cost by 13.6%
`checkContribution` multiplies affinity by the fit (0.88 for the other role of the class). A switch helps a check only when the new affinity is more than `1 / 0.88 = 13.6%` higher. Of the eight role pairs, two directions clear +5% — Bulwark → Vanguard on DPS (+7.6%) and Assassin → Trickster on mechanics (+6.5%) — and both give up about 20% on the other checks. The planner re-specs on 3.5% of days (29/840) and the ladder is unchanged: 23,248 / 24,009 / 22,087 against 23,211 / 24,002 / 22,087.
**Evidence:** the affinity table in `tuning.ts`; the role-review sweep; a throwaway frequency count.
**Changes:** the planner keeps the lever, guarded to parties projected below 1.1. The role system needs an affinity pass (signature checks ~1.3) before it changes decisions; that is a balance pass, not a planner change. Recorded as O5.

### L46. Traits need a flaw budget, not a bonus budget
The first 20-trait pass (55% general roll, flaws at 1×) was power creep: the Steward went from 2.70 to 2.90 raids and the average score rose about 1,300. The compounding craft traits caused it — +20% XP and +5 loot item level over 84 days are worth far more than +8% on one check. Dropping the general roll to 40%, weighting flaws ×2, and trimming XP to 12%, loot to 3 and injury to −20% returned the ladder to 2.63 raids and −1.7% score.
**Evidence:** sweeps at 55% / 40% / weighted flaws; [progression-report.md](progression-report.md) §6.5.
**Changes:** the general roll and the flaw weight are the two dials. Re-measure after adding any trait; an economy bonus compounds and a check bonus does not.

---

## Human playthrough — seed 5150 (CLI, no `ai`)

One run played by hand through the terminal, 30 October 2026: `new --seed 5150`, every party, stance, hire and queue item chosen by a human reading the screens. Result: **score 26,034, band A**, 3/3 raids (Tyrant on day 68), 3/3 dungeons, renown 16, 12 heroes, 12,259g, never in debt, no World First. 30 event cards resolved, 7 heroes released, 10 injuries, 471 events logged. The AI sweep scores 22–24k; the previous hand run (seed 4242) scored 28,800 with a day-52 World First.

Most of what follows is not a balance finding. It is the gap between what the state knows and what the screens say.

### L47. The queue invalidates the plan and then refuses to advance
`advance` checks `validatePlan` before `resolveDay`, so a hero who is unavailable fails the whole day. A resolution that benches a hero (`leave`, `rest` on an old wound, a release) does not remove him from his party, and an injury lands after the day resolves. The player's only move is `clear` plus rebuilding every party from memory.
**Evidence:** seed 5150 — `advance` refused on 9 of 84 days: "party 1: unavailable: Ignis Ironhand" (day 4, after choosing `leave`), then Ulric (33), Perrin (36), Tamsin (46), Vaelen (49), Perrin (56), Gareth (64) and Perrin (72). `party` refused on four more days for the same reason. Each cost three commands.
**Changes:** `pruneUnavailable` in `plan.ts` drops injured, dead and departed heroes from tomorrow's parties and returns one note per move. `resolveDay` applies it at the start and again after rest; `resolveAttention` applies it after any effect; `cmdAdvance` prunes, then sanitizes, prints `adjusted: …`, saves, and advances instead of refusing. `party` still refuses an unavailable hero, because there the player is choosing.
**Verified:** the "drops an unavailable hero" test in `tests/sim.test.ts`; an injured Gareth forced into the plan prints two `adjusted:` lines and the day resolves.

### L48. After a clear, the report shows the pull that failed
`report` prints the last non-killing pull, not the pull that killed the boss. A one-pull clear therefore reads `CLEARED` followed by a FAIL row, a "next lever" and mastery advice for a fight that is over. The three levers are also hardcoded strings: the first always says "switch stance to Push", even when the party is already on push.
**Evidence:** day 49, Gatewarden cleared on pull 2 of 2 — the report showed `Last Stand 228/255 0.89 FAIL` and "next lever: +27 Mitigation". Same static "switch stance to Push" on days 20, 49, 60 and 65, all push nights.
**Changes:** `report` picks the killing pull when `cleared` and the last failed pull otherwise; the header reads `killing pull 2 of 2`. The lever block reads `log.stance`: on push nights it says the +12% is already in the numbers instead of recommending it.
**Verified:** a day-25 clear on seed 4242 now reads `CLEARED / killing pull 1 of 1`, not a FAIL row.

### L49. A progress percentage reads as a probability
`projected` is phases-banked, not chance: `estimatedBestPull` only adds a phase's share once its ratio reaches 1.0. A Wolf Den at DPS 0.94 shows `0%`; Sunken Temple with phase 1 passing and phase 2 at 0.89 shows `50%`. `bestPull` has the same shape — a wipe at 0.99 of phase 1 logs "best 0%".
**Evidence:** day 8 Wolf Den `projected 0% / weakest DPS 0.94`, cleared the next day at 0.97 under push. Day 20 Hollow Crypt: `WIPE — best 0%` on the digest, `The Descent 35/42 0.83` in the report. Day 24 Hollow Crypt: `projected 50%`.
**Changes:** `estimatedBestPull` and `bestPull` add the first failing phase's `ratio × share`. `today` and `status` print the weakest check with its shortfall (`DPS 0.47 -53%`). A wipe at 0.94 now logs 94%, not 0%.
**Verified:** the projection test recomputes the banked share from the content's phases; a Wolf Den at DPS 0.47 reads `47%`, not `0%`.

### L50. Power is a today-number, and nothing says so
`heroPower` folds condition, sharpness, morale and health into one figure. The `roster` column therefore rises and falls with fatigue and gear: two heroes printed at "power 40" can differ by 40% of raw kit, and one hero reads 38% lower tonight than last week. The projection inherits it, so a dungeon looks impossible on the day the party is tired and easy after two rest days.
**Evidence:** end of run, same hero and gear, `heroPower` with fatigue forced: 137 at 30 or less, 115 at 60, 85 at 100 — a 38% swing for one clock. Sunken Temple projected `DPS 0.61` at 100 fatigue and `1.07` with the same five after two rest days (day 39, cleared). The `today` screen never breaks the number down.
**Changes:** `roster` prints `pow·form` (`71·94%`) and sharpness. `today` and `status` add a `form` column, and the help line under the table names the four inputs. `Projection.form` is the party's average `formMod`; `report` prints the plan's projection and form.
**Verified:** a farm party at form 71% is visible on `today`; a tired party now shows why the check is low without hiding the number.

### L51. Sharpness is in the state and in no screen
`Hero.sharpness` changes every day (rest −5, raid +7, farm +1) and its multiplier spans 0.86–1.04, an 18% swing in power (measured: 113 at sharpness 0, 137 at 100). No CLI command prints it: `grep sharpness src/cli` returns nothing. Fatigue's swing is 38%. The design calls them "two clocks"; one of them is invisible and the other decides the fight.
**Evidence:** the roster prints fatigue and morale but not sharpness; the API exposes `sharpness` on every hero; `sharpMod` spans 0.86–1.04 while `condMod` spans 0.62–1.00.
**Changes:** sharpness is a roster column (`shp`), and `sharpMod` is `0.78 + sharpness/100 × 0.26`: 0.936 at the 60 start, 1.04 at 100, a 26% span with the ceiling unchanged. The floor is the dial that punishes rust; raising the ceiling is power creep (L56).
**Verified:** `sim --runs 10` after the change: Steward 23,251 / Gambler 23,458 / Quartermaster 22,975, 2.6–2.8 raids, against Steward 23,366 / Gambler 22,653 / Quartermaster 22,136 before.

### L52. Fatigue has no injury cost, so "work until you fail" is optimal
Injuries roll only on a scrape (`0.12 × stance × vitality resist`), so fatigue never hurts a hero directly — it only lowers the check. Working a tired party is therefore free until the check fails, and the only reason to rest is a check that already failed. The intended rotation (rest so the party is sharp for raid night) pays only through the check, not through avoided damage.
**Evidence:** `attemptsFor` gives more pulls at low fatigue (`floor(headroom/18)+2`), and the injury roll in `encounter.ts` has no fatigue term. Seed 5150 raided the Tyrant 29 times and took 10 injuries total — 6 clears — while clearing Hollow and Sunken daily at 100 fatigue.
**Changes:** `INJURY.fatigueMultiplier = 0.8`; `injuryChanceFor` multiplies the scrape chance by `1 + fatigue/100 × 0.8` (×1.8 at 100). `today` adds a `pulls` column from `attemptsFor`. Rest now buys bodies as well as a check.
**Verified:** the `injuryChanceFor` test; with the multiplier at 0 the sweep is Steward 23,027 / Gambler 23,802 / Quartermaster 23,006, and at 0.8 it is Steward 23,251 / Gambler 23,458 / Quartermaster 22,975. No aggregate move — injuries only roll on scrapes — but the individual decision changes.

### L53. The tavern sells a number it hides, and the hidden one decides
`tavern` prints name, class, level and fee. Power, item level and traits — the three things that decide whether a hire is worth 40g or 600g — are not shown, and the fee barely tracks them. Level is close to worthless as a signal: starting gear dominates.
**Evidence:** day 13, same tavern, same 40–43g fee: Lyra (lvl 3) power 5, Soren (lvl 1) power 10, Tamsin (lvl 1, iLvl 19) power 14 against a level-6 Gareth at power 13. Day 29: Perrin (lvl 15, iLvl 41, 119g) arrived with better gear than the level-20 Gareth (iLvl 33). Day 65, same night, same stance: swapping a level-43 mage for a level-38 cleric moved the Tyrant's sustain from 0.84 to 0.83 — the class weight does not rescue a weak body. Day 78, with two raiders injured, a level-40 hire was the only way to field ten and the night failed at `423–458/538`.
**Changes:** `tavern` prints role, iLvl, power and traits beside the fee; `hire` repeats them in the confirmation. `party` prints the resolved names and the projected weakest check before and after; `resolve` prints every party's projection after any resolution, so a release or a rotate is not blind.
**Verified:** the seed 5150 tavern now exposes the power the fee never tracked.

### L54. An option that does not clear its own item is a trap
`benched-unhappy` fires while `daysBenched >= 3 && morale <= 58`. `ignore` costs 12 morale and does not move `daysBenched`; from morale 56 it re-derives immediately with the same id, so `resolve` prints "resolved" and `attention` shows the same card. `promise` (+10) clears from 56 but not from 44. `rotate` does nothing when no party exists and replaces the weakest hero when every party is full.
**Evidence:** day 27, morale 44: `resolve ... ignore` → item returned; `promise` → morale 54, item returned; a second `promise` → 64, cleared. Read `resolveAttention`: `ignore` only touches morale, and the predicate is unchanged.
**Changes:** `resolveAttention` is total. `promise` and `rotate` reset `daysBenched`; `rotate` falls back to the promise effect when it cannot place him; `ignore` and `acknowledge` defer the item for the day via `attentionMutedUntil`; `deriveAttention` hides the rotate option when there is no party. `deriveAttention` filters muted keys.
**Verified:** the new test iterates every item and every option in five mid-run states and asserts none comes straight back.

### L55. Positional hero ids are not identities
`party --heroes` accepts roster positions. A release shifts every later index, so a copied list silently becomes a different party, and the only confirmation printed is "← 10 heroes", never the names.
**Evidence:** day 52 — releasing Ulric (index 8) shifted all later heroes; the next `party ... --heroes 1,2,4,5,9,10,6,11,12,3` resolved to a different ten (average 38.8), caught only because it failed the level gate. Earlier the same day, `--heroes 12` printed `Unknown hero: 12`.
**Changes:** `heroByToken` tries the id and then a name prefix after positions, names an out-of-range position with the roster size, and lists an ambiguous prefix. `party` resolves names, prints the resolved names, refuses an unavailable hero by name, and prints what the check becomes.
**Verified:** `party --heroes 12` on a 5-hero roster says "No hero at position 12 — the roster has 5…"; `party --heroes "Gareth,Elaria,Ignis"` prints the three names.

### L56. A wider sharpness curve is a nerf only if the ceiling stays put
Moving `sharpMod` from 0.86–1.04 to 0.80–1.08 raised the sweep to Steward 25,232 / Gambler 24,398 / Quartermaster 23,930 (+8%) because the bot keeps raiders at high sharpness, and the ceiling prints score. Moving the floor instead — 0.78–1.04, a 26% span — landed at Steward 23,251 / Gambler 23,458 / Quartermaster 22,975, within noise of the Steward 23,366 / Gambler 22,653 / Quartermaster 22,136 baseline, and punishes rust where the design wants the cost.
**Evidence:** 10 seeds per personality, base seed `1 + 17i`, before and after each curve.
**Changes:** `sharpMod` floor 0.78, ceiling 1.04. The floor and the ceiling are different dials; re-measure after touching either.

### L57. Fatigue injury restored the caution advantage, on World First only
With the fatigue→injury multiplier at 0.8 and the sharpness floor at 0.78, World First is Steward 2/10, Quartermaster 2/10, Gambler 0/10, while the Gambler still scores highest (23,458 against 22,975–23,251). The reckless planner still earns; it just does not win the race. That is the L5 shape, not the L36 flattening.
**Evidence:** 10 seeds per personality, base seed `1 + 17i`; [progression-report.md](progression-report.md) §3.
**Changes:** README and the progression report describe the split. Do not raise the injury multiplier to make the Gambler win — that would tune a *win* dial with an *injury* dial. Decide first whether 0/10 is too absolute on ten seeds.

### L58. A table that feeds a command must print the key that command accepts
`content` listed names, but every command that targets content takes an id (`party --content wolf-den`). The player had to open `content.ts` or guess the slug. The table now prints both. The tavern (`#` for `hire <n>`) and the roster (`#`/name for `party --heroes`) already print the token their next command consumes; keep that rule when adding a screen.
**Evidence:** the seed-5150 screen review, then a direct request for the id after reading `content`.
**Changes:** `content` has an `id` column. Print the key the next command consumes, not only the display name.

### L59. A list of what you cannot do is noise, and a hidden list owes the player a notification
`content` only asked whether a content's prerequisites were cleared. A level-6 farm read `open` at level 1, and the `party` command then refused it with "needs average level 6+". The table also printed eight locked areas that were not decisions. Hiding them removes the noise but creates a new obligation: the player must learn when something opens.
**Evidence:** the day-7 save from the test run: `content` listed The Old Quarry as open, `party --content old-quarry` refused, and 13 of 16 areas would be unavailable. The same save's plan was a Wolf Den at 79% — a real decision hidden between nine rows that were not.
**Changes:** `contentAvailability` is three gates (prerequisite, roster size, party average). `availableContent` hides the rest; `content` prints a count only. Opening an area pushes one `unlock` event and records it in `knownContent`; a save written before the ledger existed initialises silently. `inspect` refuses an area that is not open.
**Verified:** the day-7 save (seed 1234) shows three areas and "13 areas not open yet"; the availability and unlock tests; an old save with no `knownContent` emits no unlock burst.

### L60. New options are additive unless they trade a reward away
The first content pass gave every new area gold, XP and loot. The AI clears every uncleared area because of the +5000 priority, so the new areas were income on top of the old ladder, not choices. The Steward moved 23,251 → 28,313, raids 2.70 → 3.00, World First 2/10 → 6/10, and the Tyrant stopped stalling. "Each one meaningful" is a balance rule, not only a copy rule.
**Evidence:** 10 seeds per personality before and after the first content build. [progression-report.md](progression-report.md) §1.1 has the table.
**Changes:** the options specialise. The Drowned Mill is the XP run (200xp, 30g, no loot; 260xp since L68); The Toll House is the gold run (260g, 40xp, no loot); The Plundered Vault and The Wailing Mines are the loot runs. The Tyrant then moved 650/538/725 → 750/620/835 (+15%) to absorb the new ceiling.
**Verified:** 20 Steward seeds: 14 clear all three raids, 6 stop at two; 10-seed sweep 25,121 / 24,316 / 25,457 (Steward / Gambler / Quartermaster).

### L61. Availability must not rank every hero for every area, every day
The first availability check called `bestPartyFor`, which ranks the roster by check contribution with the full trait context. The planner calls it once for the candidate list and again in every fallback farm; at 16 areas × 20 heroes × phases it took the five-run AI test past its 5,000 ms timeout.
**Evidence:** `the AI clears most of the tier` timed out at 5,000 ms after the content pass; `aiRun ×5` measured 1,771 ms after the cheap gate; `resolveDay ×84` measured 14 ms (0.17 ms/day).
**Changes:** `canField` answers the availability question with a level count and, if needed, the average of the highest-level legal party. `contentStates` builds `clearedIds` once. `fallbackFarm` scans the three farms, not all sixteen areas. Full ranking lives only in `bestPartyFor`.
**Verified:** 67 tests pass in ~8 s; the AI test is under its timeout again.

### L62. The average level gate is a fallback for a party, not a licence to send the highest levels
When `bestPartyFor` could not find a ranked party that met the average, it fell back to the top players by level. The party was legal, but weak on the checks, and the training-attempt rule sent it anyway. The Steward dropped from 2.70 to 2.45 raids and the 20-seed stall went from 6/20 to 10/20.
**Evidence:** 20-seed Steward 21,104 / 2.45 raids with the level fallback; 23,597 / 2.70 without it.
**Changes:** `bestPartyFor` returns the ranked party and callers check `levelOk`; `canField` answers availability optimistically; `levelPartyFor` builds the highest-level legal party for display. The planner refuses a party that misses the gate instead of fielding it.
**Verified:** the 20-seed Steward returns to 2.70 and 14/20 full clears.

### L63. Moving the wall moves the race; measure stall and World First together
The Tyrant +15% restored the documented stall (6/20 Steward seeds stop at two raids) but pushed the player's Tyrant kill to a median day 82 while the rivals finished on days 64–69. World First went to 0/10 on every personality: the wall was back and the race was dead. `RIVAL.pace` is the dial that prices the rivals' side of the same ladder.
**Evidence:** 10-seed World First 0/10 at pace 1.0; rival finish days 64–69; player Tyrant clear median day 82. At pace 0.85 rivals finish 74–79 and World First returns.
**Changes:** `RIVAL.pace` 1.0 → 0.85. The tuning constant explains why. Player raids and score are identical at either pace, because the rival model never touches the player's checks.
**Verified:** 10 seeds: 3/10, 4/10, 1/10 World First (Steward, Quartermaster, Gambler); 20 seeds: 6/20, 6/20, 2/20, with raids still 2.70 / 2.80 / 2.60.

### L64. A printed drop chance is only true if the table rolls once
`inspect` prints "20% per clear" for a named item. If several named items can drop in one clear and the count is capped afterwards, that number is an upper bound and the item count can move. The first sketch rolled every entry and capped at `loot.count`; the printed chance was not the probability.
**Evidence:** the data test `keeps named drops inside the loot band, with chances that cannot exceed one`; the `rollNamedDrop` test for a roll inside the second item's slice.
**Changes:** one roll per clear, `chance` sums to at most 1, at most one named item, and it replaces one guaranteed item. The named roll uses its own `namedDrop` RNG stream, so the generic loot a seed already made does not reshuffle.
**Verified:** a clear of Hollow Crypt or The Wailing Mines still pays exactly `loot.count` items; the named roll returns the first item at 0, the second inside its slice, and nothing at 0.99.

## Human playthrough — seed 1234 (CLI, no `ai`)

One run played by hand through the terminal on 30 October 2026: `new --seed 1234`, every party, stance, hire and queue item chosen by a human reading the screens. Result: **score 30,294, band S, World First on day 60** — 3/3 raids, 4/4 dungeons, renown 18, 10 heroes, 29,429g, never in debt, squad rating 1,247. Gatewarden fell on day 47, the Twin Covens on day 49, the Tyrant on day 60. The same day the run ended, Methodical finished the tier; Echoes was still on its first raid. The sweep scores 23–25k; the previous hand run (seed 4242) scored 28,800.

### L65. Push's risk is conditional, so the stance is degenerate at the margin
Push adds 12% to every check and a 1.55× injury multiplier that only applies **on a scrape**. The +12% is what moves a marginal pull out of the scrape band, so the stance is safest exactly where it helps most: the more a check needs Push to clear, the less likely the party is to roll the injuries Push is supposed to risk. A steady party at 0.92 is a fail in the projection and a scrape in resolution; the same party on Push is a pass.
**Evidence:** seed 1234, day 47 — Gatewarden's third phase read Mitigation 234/255 (0.92) on steady and 1.03 on push; the clear rolled no scrape. Day 49 — Twin Covens read 1.01 / 1.02 / 1.02 on steady after a rest day and every phase 1.13 on push, first attempt. The one raid night that added bodies early was the day-58 Tyrant wipe at 0.85, which failed a phase rather than scraping it.
**Changes (2026-11-01):** resolved by L114. Push now rolls an unconditional 6% injury chance per hero per pull, so the stance carries a cost on the nights it is used. The scrape rule is unchanged. Do not "fix" it by raising the injury multiplier: that prices a check dial with an injury dial (L57).

### L66. A flat per-clear XP grant makes the passenger the best levelling tool, and the planner cannot see it
Ashen Spire pays 3000xp **per hero** for a 4–5 hero party, regardless of what that hero contributed. A four-strong party can carry one body as long as the party average stays ≥35: on seed 1234, Elaria the Bold went 24 → 30 in one clear and 30 → 37 in two more, and Ansel 27 → 33, Bram 29 → 34 the same way. The raid roster was level 45+ by day 48, three days after the first Ashen carry. `bestPartyFor` ranks by contribution, so the bot never fields a passenger; this is a player-only lever, and it is part of why the hand run took the Tyrant on day 60 against the sweep's median day 82.
**Evidence:** seed 1234, days 43–52: each Ashen clear carried exactly one hero below the party's core and paid that hero 3000xp plus 1–3 items. The level gate bounds the carry to one body in five; it does not remove it.
**Changes:** record it. If the bot should match a hand player, the planner needs a carry rule (and then the XP grant is the thing to re-measure). If not, keep the grant and accept that the bot's arc is the floor, not the ceiling.

### L67. The model doc printed the wrong scrape band
[guild-manager-model.md](guild-manager-model.md) §3.1 printed `0.85–1.00` as scrape and `<0.85` as fail. `encounter.ts` uses **0.92**. The gap matters: a pull at 0.88 is a wipe, and the doc called it a clear — the same number a player uses to decide whether to spend a raid night. The same row claimed "morale −2" for a scrape; the build applies that to a failed run (`!result.cleared`), not to a phase that scrapes and clears.
**Evidence:** `encounter.ts`, `ratio >= 1.15 ? "clean" : ratio >= 1 ? "pass" : ratio >= 0.92 ? "scrape" : "fail"`; `day.ts` morale −2 only on `!result.cleared`; seed 1234, day 58 — the Tyrant's third phase resolved at 707/835 (0.847) and wiped; L31 already cites 0.92 as the real boundary.
**Changes:** the table now reads 0.92 and the morale claim is corrected. No code change.

### L68. A reward trade only exists at the same gate
The menu said "gold run, XP run, loot run". The gates made it a staircase. On seed 1234 the Drowned Mill (level 4) paid 200xp and nothing else; the Bandit Road (level 5) paid 200xp, 110g **and** an item. One level later the coin run dominated on all three columns, so the Mill — and the Wolf Den, and the Warrens — were dead rows. The hand run took the Bandit Road from day 6 and never reopened any of them.
**Evidence:** seed 1234, `content` on day 6: Mill 30g/200xp/0 items vs Road 110g/200xp/1 item, both inside the 4–5 band. After day 5 the Mill was never cleared again.
**Changes:** Mill 200 → 260xp (the XP run), Road 200 → 120xp (the coin and gear run). A data test asserts the trade rather than the numbers: same band, more XP on one side, more gold and loot on the other. Rejected: moving the gates apart, which keeps the staircase and only renames the rows.

### L69. A wage that never re-prices is not a wage
`contract.wage` was set at signing and only multiplied by 1.2 on renewal, so a level-60 starter still cost the level-1 wage. Seed 1234 ended with ten level-60 heroes on **751g/week against a 2,360g budget** (32%). The design calls the wage budget "the real constraint"; it never bound.
**Evidence:** seed 1234, day 84: Gareth at level 60 on 24g/week, Aaria (signed at level 12) on 67g, Bram (signed at 29) on 120g. The pre-fix 20-seed sweep ends most runs with a surplus; the post-fix sweep ends two-raid runs near 2,000g.
**Changes:** `renewalWage(hero) = max(current wage, wageForLevel(level) × renewPremium)` with premium 1.0, used by the queue label, the resolution and the AI. Budget per renown 120 → 150 so the documented 13–15 hero roster fits at full renown. The contract modal shows the new number (`12g → 117g/week`). Rejected: the old 1.2 compounding, which prices tenure instead of level, and lowering the wage curve, which is the documented formula and would only hide the missing constraint.
**Verified:** 20 seeds after the whole pass: Steward 23,051 / Quartermaster 24,441 / Gambler 21,661; raids 2.70 / 2.80 / 2.60; full clears 14 / 16 / 12. Arrears now split by thrift — 14 days across 20 seeds for the Quartermaster, 43 for the Gambler.

### L70. A promise with no due date is a free button
`promise` was +10 morale and a `contract.status` that nothing read. It settled the benched-unhappy card for nothing, so it was the answer to every one of them, and the ledger described in the model doc was fiction.
**Changes:** `PromiseRecord` (made on, due on, starts counted, status), counted in `resolveDay` when the hero is deployed, settled **kept** at 3 starts (+5 morale) or **broken** below that (−15, contract set to bench). The queue shows an FYI the day before with the count; `today` lists every open promise. A save written before the field exists loads with an empty ledger.
**Verified:** kept, broken and due-warning tests; the "every attention option clears its own item" test still passes; a Gambler AI run promised on day 14, the ledger counted 7 starts and settled it as kept on day 20.

### L71. The bot was losing the raid it was about to win
After L69 the sweep fell from 24,347 to about 21,400 and full clears from 14/20 to 11/20. The cause was not the economy. The raid-prep stance rule was `minRatio < 1.0 && ambition > 0.6 → push`, and the Steward's ambition is below that, so it raided at 0.90 on steady while the Tyrant sat at 78–94% for days 82–84. Push is +12% for an injury risk that only fires on a scrape (L65). With `minRatio < 1.05 → push` the ladder went back to 14/20 and the score recovered to 23,051.
**Evidence:** 20-seed Steward with the old stance gate: 21,384 / 2.55 raids / 11 full clears. With the rule changed and nothing else: 23,051 / 2.70 / 14. The intermediate runs show the Tyrant failing at 78–94% while the guild's gear was already ahead of the hand run's day-60 kit.
**Changes:** the raid stance is no longer personality-gated; a marginal raid is fought on Push. This is also the honest measure of L65 — the bot that uses the stance wins the ladder, the one that does not loses it.

## Events and card play (2026-10-31)

### L72. A reward decay taxes the ladder and does not change the pick
open-questions O7 recommended 100% → 60% → 30% on repeat missions. Built and swept: the Drowned Mill is cleared 26.4 times per run, and a decay did not reduce that number at all. At 85%/70% the Mill went to 28.5 clears per run; at 60%/30% it went to 27.6. The Steward lost 3.4% of score on the mild schedule and 23% on the harsh one, and on the harsh one the Tyrant became unreachable (0/20 World First).
**Evidence:** 20 seeds per personality, base seed `1 + 17i`; per-content clears counted across 60 runs. Baseline 1,585 Mill clears (26.4/run); mild 569/20 for the Steward (28.5/run); harsh 552/20 (27.6/run).
**Changes:** none shipped. `repeatScale` was written, measured and reverted; the code is not in the build.
**Why:** at the harsh schedule the Mill still pays 78 XP for three heroes, and the best farm pays 66. The spare party has one three-hero job, so a purse rule cannot change the night. A farm-level floor is what makes the faucet load-bearing. The exit is a second three-hero activity, or a rotating contract board that changes the pick daily — [open-questions.md](open-questions.md) O7.

### L73. A card effect that names a hero does nothing when the card does not
"Bandits hit the farm — send the party" was free: the card targeted the guild, and `applyEffect` resolves every hero effect against the **card's subject**, so the injury had no hero and the option did nothing. The same pass found "Rest him properly — health restored" dealing the standard 30 health hit, and "Answer in the square" costing nothing at all.
**Evidence:** reading `resolveEvent`: `targetId = pendingEvent.targetHeroId` is null for a guild card, and `case "injury"` is `if (hero)`. The trace showed `bandit-raid → fight` on 93 of 93 cards because fighting cost zero.
**Changes:** the bandit card targets a random hero (`EventTarget "random"`, an rng draw); the injury effect takes an optional `healthHit` (rest sets 0); the taunt costs 100g. A data test asserts that every hero effect on a card names the card's own target, which is the invariant the engine silently relied on.
**Verified:** the bandit card injures exactly one hero and leaves the purse untouched; the old-wound rest leaves health at 60 and sets two days out; answering the taunt costs 100g and nothing when the purse cannot cover it.

### L74. The bot took the first option because the options had no price
Every card option already carried declarative effects; nothing read them. `aiTurn` took `options[0]`, so the bot always paid the rival's ransom and always bought the cursed blade. A price is not the same thing as a decision: the blade is a real upgrade for a weak hero on day 10 and 250g of nothing on day 60.
**Evidence:** 2,031 cards answered over 60 runs. Before: cursed-blade bought 100% of the time. After, with `EVENT_VALUE` weights and a state-aware valuation: buy 16–20 times, pass 59–64 — the same card, the same option order, opposite answers.
**Changes:** `src/sim/ai/cards.ts` prices each affordable option in gold (morale through the clamp, gear only as an upgrade, a wage raise for every week left, an injury at 1.6× when the roster has no spare body) and takes the best. Three terms carry the personality: thrift on purchases, ambition on XP, caution on injuries. The weights are data in `EVENT_VALUE`, and each names the in-game number it came from.
**Verified:** 20-seed sweep 23,051 / 21,661 / 24,441 → 23,515 / 20,664 / 24,293 (Steward / Gambler / Quartermaster), aggregate −1%, inside the per-personality noise band. The Gambler is the one mover (−4.6%): it keeps less than 400g in reserve and loses a hero to the ransom. Re-check that row before touching a weight.

### L75. An event that can end a run must wait until the run can lose it
Once refusal meant "he walks", "a rival comes calling" fired from day 3 on a three-hero guild. With the purse under 400g — most days, early — matching was filtered as unaffordable, so the only visible option was the one that lost the best hero. One Quartermaster seed lost its best hero five times and finished with an empty roster and a score of 501.
**Evidence:** seed 1, Quartermaster: `rival-offer → refuse` on days 8, 29, 38, 51 and 71, every time with less than 400g; end roster 0, score 501. The same seed after the gate: roster 15, score 25,176.
**Changes:** the card is gated on roster 8+ and best level 18+. Nobody poaches a level-8 adventurer, and an eight-body guild can survive the loss. A card whose only affordable option is the disaster is not a decision, it is a forced loss.
**Verified:** the sweep's roster sizes never fall below 10 after the gate, and the 20-seed Quartermaster is at 24,293 with 15/20 full clears and 6/20 World First.

## Rivals on the planner (2026-10-31)

### L76. A rival that is one number cannot be scored, explained or beaten
The compressed model walked six stages with a power value and a personality appetite. It was cheap, deterministic and tunable, and it had three holes the leaderboard exposed the moment a score was asked for: a rival could not be poor, could not be out-geared, and could not lose a night to its own bad plan. The design promised "rivals run the same simulation as you"; the code did not.
**Evidence:** `Rival` was `{power, raidsCleared, bestPull, pulls}`. It had no gold, roster or facilities, so `computeScore` could not be called on it and D3's rank was unimplementable. The old `raidsCleared >= 3` World First check also counted the three dungeons, so a rival claimed World First after its first raid.
**Changes:** each rival is a full `GameState` founded from its own seed (`founding.ts`), with an empty `rivals` array. `tickRivals` gives it one `aiTurn`; `rivals.ts` scores and sorts all four guilds; the CLI shows the race table and the player's rank. The compressed model's growth and burnout constants are deleted.
**Verified:** 20 seeds per personality: player 23,515 / 24,293 / 20,814, World First 3/20 / 6/20 / 3/20, average rank 2.90 / 2.35 / 2.75; rivals average 23.4–23.9k and 2.67 raids. The player's score and raids match the pre-rival baseline, which is the control that the new system did not move the ladder.

### L77. The world tick must not live inside the day resolution
If `resolveDay` ticks the rivals, a rival's own `resolveDay` ticks a world it does not have — or worse, recurses. The fix was structural, not a guard flag: `resolveDay` resolves one guild; `advanceDay` adds `tickRivals`; `runWorld` loops it. A rival guild is founded with `rivals: []`, and `resolveDay` attaches the world's rival array by reference because it only reads their World First flag. `tickRivals` copies each rival before writing, so the caller's state is untouched.
**Evidence:** the purity test and a new `advanceDay` test both failed if the rival array was mutated in place; the alternative — a `tickWorld` boolean threaded through every call — would have made the one pure function in the codebase conditional.
**Verified:** `the world tick does not mutate the state it is given`; `resolveDay` on a rival guild never sets its own World First.

### L78. A test harness that includes the race is eight times slower
Putting three rival guilds on the planner made every `aiRun` an 84-day world run: 0.84 s against 0.10 s for the player's guild. The test suite went from 6.8 s (80 tests, before the rivals) to 395 s, and two tests hit their 5 s timeout. The suite is the pre-commit gate, so this was not a number to hide.
**Evidence:** `vitest run` 395 s with world `aiRun`; 10.7 s after the split. A 20-seed sweep is ~50 s.
**Changes:** `aiRun` stays player-only and is the unit harness; `runWorld` is the product run used by `sim`; `playTurn` is one world day. Three world tests cover determinism, World First and standings. The world tests carry 30 s timeouts. A rival's event log is trimmed to the last 120 entries and the player's `resolveDay` no longer clones three growing rival states, which took ~12 ms/day off the tick.
**Verified:** 118 tests. The world tests are one full race (5.2 s on a loaded host), a 10-day determinism run, and a hand-built World First case; the earlier world-heavy suite timed out at 30 s.

### L79. A rest day is not a handicap
The first attempt at a rival handicap gave each rival a recovery day every seventh day (`RIVAL.pace = 0.85` as a rest cadence). Rivals got *stronger*: a full rest heals fatigue and health, and a skipped day also skips the event card, the hire and the wage decision. The sweep's rival average rose to 27.5k and the player's World First fell to 0/10 and 1/10 on two personalities.
**Evidence:** 10 seeds per personality with the rest cadence: player 22,580 / 23,279 / 20,592, rival average 27,183–27,483, World First 0/10, 1/10, 0/10. The same sweep with no handicap had rivals at 26k and the player at rank 3.4.
**Changes:** the handicap is now an XP multiplier on `rewardScale` (`RIVAL.pace = 0.9`), applied only to rival guilds. A rival levels about one step slower; nothing about its day is different.
**Verified:** at 0.9 the 20-seed player line holds and the average rank is 2.35–2.90. Do not price difficulty with rest days — rest is a resource, not a penalty.

## The contract board (2026-10-31)

### L80. A price only changes a pick if the chooser reads it
The Drowned Mill was cleared 26.4 times per run because the spare party had one good three-hero job. A flat repeat decay was already rejected (L72): it taxed the job the bot chose and the bot kept choosing it. The first contract board repeated the mistake in a different shape. It posted two contracts and taxed the rest, but `ai/planner.ts` still scored every mission above every farm (`tier × 200 + ratio × 30` beats a farm's `1`), so an unposted Mill at 30% or even 0% was still a better-looking night than farming. The Mill ran 18.9 times; the score rose 5.9% because the second posted contract (one XP + one prize) gave the spare party an easy full-pay job every day.
**Evidence:** 10 seeds per personality, board with one XP + one prize, token 0.3: Steward 24,231 / 2.70 / Mill 18.9, against a control of 22,880 / 2.70 / 26.9. A paired 5-seed token sweep (one process, seven tokens) put the Mill at 25.8 / 19.2 / 14.2 / 17.4 / 17.4 / 16.8 / 16.6 clears for tokens 1 / 0.5 / 0.3 / 0.2 / 0.1 / 0.041 / 0. The curve is not monotone: below 0.3 the party shifts to other missions, not to farms.
**Changes:** the shipped board is flat — two of the guild's *open* missions, drawn from one stream — and the AI **skips a cleared unposted mission** rather than pricing it. The token is still 0.25 for a human who wants the night. The planner's `scoreContent` returns null for a token repeat; `planDay` falls back to the posted alternatives or a farm. The board is derived from `(seed, day, availableContent)`, so a hire or release can change it; the CLI warns when a planned party is on a token mission.
**Verified (20 seeds per personality):** Mill 26.4 → 14.10 / 12.70 / 14.45 clears/run (pooled 13.75); mission nights spread across all six missions (Mill 13.75, Warrens 14.27, Wolf 11.05, Bandit 10.08, Toll 5.60, Vault 1.47); Steward 23,515 → 22,938, 2.75 → 2.60 raids, 15/20 → 12/20 full clears; Quartermaster 24,293 → 23,658, 2.75 → 2.65, 15/20 → 13/20; Gambler 20,814 → 20,686, 2.50 → 2.45, 10/20 → 9/20. Arrears fell 18 → 6, 6 → 3 and 37 → 18. World First rose to 6/7/3 of 20 and rank to 2.35/2.10/2.80 because the rivals lose more of their smaller rosters; do not bank that as player skill. The Tyrant stall is 8/20 against the 6/20 target in mvp-scope §3.
**Rejected:** the one-XP + one-prize split (additive, +5.9%); a token-only board with no AI gating (Mill 18–20 at 0.2–0.3); posting farms, dungeons or raids (the farm is the recovery floor; dungeons and raids are calibrated to the raid line and `RIVAL.pace`); taxing loot or mastery (break `inspect`'s per-clear odds and make a token repeat worse than a farm for the next attempt). A new three-hero activity with a non-mechanics check is still the better long-term version; the board rotates pay, not the check.

## Reward-aware planner (2026-10-31)

### L81. A reward weight is only a choice if it is large enough to flip the pair
The first reward-aware planner multiplied loot by 5 and gold by 4, then called the result need-aware. On a level-20/iLvl-10 party the Plundered Vault scored 625 against the Drowned Mill's 795; at level 25 the gold run scored 193 against 795. The weights were invisible at the scale the game actually pays, and the tests passed only because they used level-cap parties where the XP term is small.
**Evidence:** `rewardValue` with the first weights at L20/i10: Vault 625, Mill 795. The shipped weights: Vault 1,300, Mill 855. At L25 the shipped 32× crisis weight flips a posted Toll House over the Mill in the test; the first build's 4× did not. A flat `gold/4` is 0.5 points per gold; the same-band Toll/Mill flip needs about 4 points per gold (the 32× crisis weight).
**Changes:** `PLANNER_VALUE` now uses gold 1→32 in crisis and 0.15 when rich, loot 0→12 (12 × 1.25 = 15 XP per hero-item-level), and XP 1/0.4. The farm branch is scored by `rewardValue` instead of a constant `"1"`, so the main loop can choose the gold farm; `fallbackFarm` uses the same value. The clear-chance bonus is capped at 1.2.
**Verified:** 20 seeds per personality. The shipped build is Steward 23,087 / 2.65 raids / 13 full clears, Quartermaster 24,520 / 2.75 / 15, Gambler 21,549 / 2.55 / 12; the Plundered Vault goes 1.5 → 3.5 clears/run. The Tyrant stall is 7/20 on the Steward against the 6/20 target.

### L82. A first arm that moves three dials cannot attribute a gain
The first reward-aware arm changed farm scoring, the XP weight and the loot weight together. It looked like a Quartermaster buff (+5.3% score, +3 full clears) and the docs nearly recorded that as "the cautious personality benefits from need pricing". A second arm calibrated the weights; a third fixed the per-hero XP cap and the late-run purse. The Quartermaster's gain fell from +5.3% to +0.9%, the Steward and Gambler moved, and the total full clears went 39 → 40. The first arm's attribution was wrong.
**Evidence:** four 20-seed builds in progression-report §3.5: board only 22,938/23,658/20,686 and 12/13/9; first reward arm 22,812/24,921/20,663 and 13/16/9; calibrated weights 23,869/23,989/21,304 and 15/14/10; shipped 23,087/24,520/21,549 and 13/15/12. The Quartermaster's +3 full clears in arm one became +2 in the shipped build; the Steward lost two against the calibrated arm.
**Changes:** the report prints all three arms and says the attribution is not isolated. The shipped arm fixes the per-hero cap (`gainXp` discards XP at 60) and the purse's weeks-left target; it is the arm that moved the Steward's full clears from 15 to 13 and the Gambler's from 10 to 12.
**Verified:** total full clears 40/60, the same as the pre-board build, but the distribution moved from the Steward to the Gambler. The Tyrant stall is 7/20 against 6/20. The next pass isolates the cap (or the stable-roster lever) before touching the reward weights again.

## Loot assignment and the raid ten (2026-10-31)

### L83. A stored suggestion is stale by the second drop
The first queue stored `suggestedHeroId` on each drop and the auto path reused it when the hero still existed. Two weapon drops in one clear both pointed at the same hero: the first was applied, the second overwrote it, and the first item was lost. The suggestion is derived data, and it goes stale the moment another drop in the same clear is applied.
**Evidence:** the frozen-suggestion unit case: two weapon drops of the same item level to two needy heroes produced one upgraded hero, not two. The apply-time recompute produced two, with the second choosing the next-best slot.
**Changes:** `PendingLoot` no longer stores the target. `suggestLootTarget` ranks the whole roster by `gain + 4 if on the raid ten`, filters `gain > 0` first, and is called again for every drop inside `autoAssignLoot`. A drop with no positive gain is discarded at queue time. The assignment event dates `state.day`, not `drop.day`, so the next digest sees it.
**Verified:** 114 tests, including two same-slot drops, a 0-gain team hero vs a +10 bench hero, assignment purity, and a day resolved with a pending queue. The queue is bounded by the day's clears and cleared on the next advance.

### L84. A better AI can erase the wall, so the AI's loot pick stays the floor
The feature has two levers: the standing ten and the assignment target. I measured four arms at 10 seeds (1+17i), against the 20-seed 59be992 baseline. The baseline auto-assigned to the lowest-geared party member: 229 items/run, 28.2% wasted, 65% landing on the next-raid ten, the ten changing 0.7 bodies/day, day-40 ten iLvl 47 against Gatewarden's 150.

| Arm | Full clears | Day-40 ten | Day-60 ten | Waste |
|---|---:|---:|---:|---:|
| 59be992 baseline, 20 seeds | 40/60 | 50/48/52 | not measured | 28.2% |
| Conservative AI (old lowest-party pick) + team at the wall | 42/60 | 46/46/51 | 92/107/92 | 24% |
| Need pick + team at the wall (all guilds) | 52/60 | 55/50/55 | 115/113/99 | 0% |
| Need pick + starters grown from day 1 | 44/60 | 52/50/55 | 106/109/97 | 0% |

The need pick is the better heuristic and the player's default. Shipping it as the **AI's** default made the Quartermaster clear 20/20 and the total 52/60, above the 36–46 target: the wall stopped teaching gearing. The AI keeps the old lowest-party pick as its floor (42/60), and the player can take the need suggestion. The decision is the feature; the AI is the harness.

The standing ten also has a cost: built at the first open raid, it is 1–4 iLvl behind the nightly best ten it replaced at day 40, and the team ends 153–200 against a bench median of 138–201. It concentrates items (62–69%) without starving the bench, but it does not close the gear gap: day-40 ten 46–55 against the 65 target.

**The destination is not the whole gap.** In 60 baseline runs at 59be992 (10 seeds × 6 personalities), the ten took 65.2% of items and was only 13.1 iLvl ahead of the bench (165.5 vs 152.4) at day 84; 0.57 heroes/run reached iLvl 205 and none had all four slots at 220. A one-pass counterfactual routing every drop to the best-gaining hero of a ten re-picked daily lifts the day-84 ten from 165.5 to 188.4 (+22.8, 38% of the 59.5-point gap to 225) and heroes at ≥205 from 0.57 to 3.68/run. It is still ~37 below the wall. The next levers are the loot rate and a measured wall-change re-pick, not a larger team bias.

**Verified:** the conservative AI 42/60, the need pick 52/60, the starters 44/60; the Steward stall is 4/20 against the 6/20 target 3, so the wall is softer and is the next balance item. The Gambler's conservative 21.5k is below the 23k floor; the need pick is 23.0k.

## Role review and the affinity table (2026-10-31)

### L85. The table was not the lever; the reviewer was
O5 said role affinities were too flat for the 0.88 fit, and the planner re-specced only 3.5% of days. I widened the table to 1.30 signatures and the re-spec rate went to **16.8%** with the reviewer untouched. The gate accepted any party below 1.1 and the first improving alt; it was re-speccing parties that already cleared and paying the fit on checks nobody needed. The table got blamed for a gate.

**Evidence:** 10 seeds × 3 personalities, seeds 1+17i. The 1.15 table with the old reviewer: 25,337 / 25,513 / 21,474, 21/30 full clears, 13/30 World First, 3.1% re-spec days. The same reviewer on 1.30: 24,279 / 24,082 / 20,714, 19/30, 8/30, 16.8%. The shipped reviewer on 1.15: 25,637 / 25,818 / 21,474, 21/30, 15/30, 8/7/5 days per 10 runs (about 1%).

**Changes:** the reviewer now only touches a party projected below 1.0, accepts a gain of ≥0.015, picks the best alt, caps at two flips, stops at 1.0, and names the check and delta. `checkPowerInRole` adds the affinity term to the role readout; the `role` command prints the four check deltas, and the hero sheet shows the check profile. `powerInRole` stays as the familiar headline but no longer argues against every switch.

**Rejected:** the 1.30 table. It made the **decision** spread (the flips targeted Bulwark/Oracle/Lightbringer instead of only Vanguard/Trickster, and the median day-40 projection rose 1.32 → 1.48), but it made the **ladder** volatile: three gate variants produced 19/30, 22/30 and 17/30 full clears; the Steward swung 10/20–20/20 and the Gambler 4/20–8/20; the 1.15 build holds 21/30. The 1.25 fallback repeats the volatility without the decision gain. The 1.15 table stays.

**The role lever is a short-content tool.** A flip moves one hero +8.9% on the switched check and −42.5% on the off-check; in a 10-hero raid that is 1.7–3% of a phase, while a 3-hero mission can move 13% of a check with two flips. No content collapsed (every non-Tyrant area stayed 100% entry/clear; the Tyrant entry rose 80 → 87–97%), and no requirement was bumped. If roles must decide raids, the next lever is a party-level mechanic, not a bigger table.

### L86. A seventh mission at the gold ceiling makes the cautious guild too strong
The contract board left a clear gap: four of six missions are mechanics, and the spare party has one good three-hero job. I probed a seventh mission — **The Broken Bridge**, level 18, three heroes, a **mitigation 36** check, 300g/60xp/one item (26–40) — using the actual content data and the shipped planner. It was played: 3.3/2.5/2.7 clears per run, posted on 20% of days.

**Measured, 10 seeds (1+17i):** Steward 24,075 (14/20 full), Quartermaster **27,553 (20/20)**, Gambler 20,686 (10/20); total 44/60. The Steward's 14/20 is the 6/20 stall target; the Quartermaster's 20/20 is the failure. 300g passes the Toll House's 260, so the cautious guild's purse stops binding on the extra night and it clears every raid. The Steward lost 1,562 score and two full clears to the opportunity cost; the Gambler lost 788.

**The check was right, the reward was not.** A 3-hero party at level 20/iLvl 30 sums ~32 mitigation with one warrior, ~35 with warrior/rogue/cleric, and ~47 with two warriors and a cleric; 36 is a tank-pair check that a one-tank party fails without gear or a Bulwark. The level band and the missing mitigation check are the right addition. The content was reverted, not shipped.

**Next:** ≤220g (below the Toll House) and/or requirement 40, then 20 seeds; the target is Steward 14–16/20, Quartermaster 15–17/20, Gambler 9–12/20, and no 20/20. Do not ship a mission whose gold raises the cautious guild above the wall on its own.

### L87. A 10-seed all-clear was noise; the gold ceiling was not the lever
L86 reverted the 300g mitigation mission because a 10-seed arm put the Quartermaster at 20/20. The same arm on 20 seeds is **18/20**. The 10th-to-20th seed moved one raid, which is the sample size talking, not the content.

The second pass measured one dial at a time, 20 seeds per personality (seeds 1+17i, `runWorld`), against a control on the same harness.

| Arm | Steward | Quartermaster | Gambler | Full clears |
|---|---:|---:|---:|---:|
| Control, no mission | 15/20 | 17/20 | 9/20 | 41/60 |
| 300g, req 36 | 15/20 | 18/20 | 10/20 | 43/60 |
| 220g, req 36 | 16/20 | 19/20 | 9/20 | 44/60 |
| 200g, req 36 | 15/20 | 19/20 | 10/20 | 44/60 |
| 160g, req 36 | 15/20 | 19/20 | 10/20 | 44/60 |
| 220g, req 40 | 15/20 | 19/20 | 8/20 | 42/60 |
| 180g, req 40 | 14/20 | 19/20 | 9/20 | 42/60 |

**Gold from 160 to 300 moves the Quartermaster between 18 and 19 full clears; requirement 40 moves it zero and costs the Gambler two.** The mission's value is the extra full-pay night and its item, not the gold or the check. The check is right (a 3-hero party at level 20/iLvl 30 sums ~32 mitigation with one tank and ~47 with two), and the tank-pair requirement 36 stays.

**Shipped: 220g, 60xp, one 26–40 item, mitigation 36, level 18.** 220 is the ceiling the brief allowed and stays below the Toll House's 260, so it cannot fund a raid on its own. The Steward is 16/20 (inside 14–16); the Quartermaster is 19/20, one clear below the failure gate and above L86's 15–17 expectation. The total rises by three full clears. That is the price of a seventh mission the spare party can take.

**Rejected:** 300g; requirement 40; 180g/req 40; a second mitigation mission; 160g (same ladder, less honest pay for a level-18 job).

**The lesson is the gate, not the content.** A 20/20 on one 10-seed arm is not a failure signal; run 20 seeds with a control before reverting. The first pass cost a session and sent the next pass chasing a dial that did not exist.

### L88. A counter-offer that almost always succeeds is a button, not a negotiation
The first renewal negotiation offered 15% under market, with a 22% maximum discount and a narrow loyalty band (0.75–1.25). On 30 runs the AI made 401 counters: **398 accepted, 3 refused**. The wage was 15% cheaper on almost every contract and the only decision was pressing the button. The arithmetic was the cause: contracts are answered at morale 80–100, where the visible maximum (0.22 × 0.67–1.0) cleared the 15% offer for nearly every loyalty roll.

**Retuned:** 12% under, a 15% visible maximum, a loyalty band of 0.45–1.27, and "he looks ready to talk" only when the visible estimate is 10% clear of the offer. On the same 30 runs: 269–324 accepted and 57–68 refused per personality (15–20% refused), so the counter is a real risk; a refusal raises his number 25%, which at 80% acceptance leaves a 4.6% expected wage saving. The AI prices its counter on the same visible hint as the player, not on the hidden threshold, so it can misread a hero the way a player can.

**The transfer request is player-facing.** The AI's own promises never fired in 10 runs: `benched-unhappy` needs morale ≤58 and three bench days, and the AI keeps morale high. The sweep therefore does not exercise the transfer request; its tests are the harness. That is acceptable because the bot still does not read `contract.status`; a promise the planner cannot honour is a debt it breaks by accident, and the transfer request is the visible consequence.

### L89. Moving an early return changes behaviour, even when the branches look equivalent
The first counter build put the wage-budget check above `contractChoice`'s `rank < RAID_SIZE + 3 → renew` early return. The early return is the "the raid team is kept at any price" rule; folding it into the budget branch let the AI release expensive starters. The sweep fell from 16/20 to **12/20** (Steward) and 9/20 to 6/20 (Gambler) with no tuning change. Restoring the early return restored 16/20.

The old cost branch was dead code for every rank the roster can produce (rank ≥ 13 is impossible with a 13-hero roster, and rank < 13 returns first). It looked safe to "fix". It was not: the early return was the rule, and the dead branch was a guard for a different roster size. A refactor that moves a branch is a behaviour change; measure it like one.

## The browser shell (2026-10-31)

### L90. A vertical slice that cannot hire is not playable
The screen spec stops at Roster, War Room and Report. Those three cannot reach the game's own content: the first dungeon needs four heroes and the first raid needs ten, the starting roster is three, and the first dungeon is also the first free recruit. Without a tavern the player is capped at three-hero missions and can never see the ladder the simulation was built for. Facilities had the same shape — the AI spent its surplus on them; the player had no button.
**Evidence:** `content.ts` gates: Hollow Crypt needs 4, Gatewarden needs 10; `ROSTER_START = 3`; no free recruit before the first dungeon clear. A day-41 AI save has 15 heroes and two five-man dungeon parties, which the player could not copy.
**Changes:** the first pass ships Guild Hall, Tavern (immediate signing at the listed fee) and the four facility upgrades alongside the slice. The Hall is the only home that can show the queue, the race and the budget together.
**Rejected:** shipping the three screens alone and telling the player to use the CLI to hire. That is a demo, not a product. The full signing negotiation stays out until `hireCandidate` has negotiation state; adding a fake modal would put a rule in the UI.

### L91. One pure reducer made the browser testable without a DOM
The first store sketch had one method per action, each calling a sim function. That is fine for the screen and useless for the gate: the pre-commit test run cannot click, and the interesting failures are the action sequences (assign, resolve, advance, save, reload), not the pixels. Moving every mutation into `applyAction(state, action) → state` made the whole UI vocabulary headless.
**Evidence:** 12 tests in `tests/ui-store.test.ts` cover determinism from `(seed, actionLog)`, no input mutation, hire cost, facility gate, raid-ten filtering, save round-trip and rejection, and the report helpers. The 12-test file runs in 0.1–0.5 s on the dev host; the full suite is 136 tests in 7.8 s.
**Changes:** `store/actions.ts` is the only mutation vocabulary; `gameStore.ts` calls it, re-derives attention and writes the save. UI state (screen, drawer, modal, report, toast) never reaches the save.
**Rejected:** testing the store through React Testing Library (a new dependency and a jsdom setup for behaviour that is not in React) and keeping setters as the source of truth (untestable without a browser).

### L92. A legal-party rule in two places drifts; put it in sim
The CLI's `projectionFor` had the "best party, fall back to highest-level legal party, or null" rule inline. The War Room and the content picker need the same answer, and a second copy would eventually show a party the game refuses. The rule is part of the game, not the presentation.
**Evidence:** the CLI's rule was three lines (bestPartyFor, levelPartyFor, levelOk); the UI needs it for the content list, the inspect sheet and the auto-fill button. A projection that disagrees with `validatePlan` is exactly the failure `mvp-scope` target 11 forbids.
**Changes:** `fieldableParty(state, content, pool?)` lives in `sim/plan.ts`; the CLI and the UI call it. `focusPull`, `nextLevers`, `pullTraits` and `masteryReport` moved to `sim/report.ts` for the same reason. No behaviour changed and all 136 tests pass.
**Rejected:** a UI-only helper (a second rule) and leaving the CLI as the only place the rule exists (the browser would re-derive it from primitives).

### L93. Space must ignore text fields, not buttons
The first keyboard handler returned early for any focused `BUTTON` or `A`. The intent was to avoid stealing Space from a focused control; the effect was that after the player clicked anything, Space stopped advancing the day. The shortcut only worked when the page had no focus. The documented rule is the opposite: Space is global except inside a text field.
**Evidence:** the headless pass focused the Help button, sent a real key event, and the day stayed at 1. The key log showed `key: " "`, `target: "BUTTON"`, and the app had already returned. After the change, the same event is `defaultPrevented: true` and the day moves to 2; a blocking queue opens instead of resolving a day.
**Changes:** the handler now ignores only `INPUT`, `TEXTAREA`, `SELECT` and `contentEditable`. Escape still closes the drawer first, then the modal. `1–4`, `R`, `W` work with a button focused.
**Verified:** CDP key dispatch; manual Escape and Space passes; the modal/drawer guard is checked before the day moves.

### L94. A save is the whole world, and it costs about 5 ms
The rival guilds are full `GameState`s inside the player's state, so the browser save is not a roster snapshot. It is three more rosters, purses, plans, promises and event logs. That is the price of "the race is simulated", and it is paid on every game action because the store writes after every mutation.
**Evidence:** day-41 save 164 kB, day-84 save 251 kB. Over 200 runs on the dev host: JSON.stringify 4.7 / 6.3 ms, JSON.parse 3.3 / 4.9 ms. The world day itself is ~13 ms, so the save is a real but second-order cost: an advance is one world tick plus one write, tens of milliseconds, not a stall. No UI-only action writes at all.
**Changes:** the store writes only on game actions, never on screen/modal/drawer state. `loadSave` validates the version and the state shape and returns null rather than booting a partial world. The save is one slot, `world-first.save`.
**Rejected for now:** trimming rival event logs at save time (the world tick already trims at 120 entries), debouncing writes (a crash between advance and save loses the day), and moving the log to IndexedDB (no measured need). Revisit if a replay log grows to thousands of actions.

### L95. The shell added 402 kB and no new architecture
The UI is a projection: React 19, Zustand 5, Tailwind 4 and Vite 8 add build weight and almost no new rules. The one new architectural seam is the pure action reducer; everything else calls the sim or the selectors. That is the outcome ADR 0001/0002 paid for.
**Evidence:** production build 73 modules, 402.79 kB JS / 120.57 kB gzip, 32.12 kB CSS / 7.47 kB gzip, 0.32 s. No component library, chart library or drag library. `sim/` gained two shared helpers (`fieldableParty`, `report.ts`) and no framework import. The 84-day UI run finished at day 85 with the run-end card and no console errors; the same-seed button started a fresh day-1 run.
**Changes:** dependencies are React, React DOM, Zustand and Tailwind plus their Vite plugins and type packages. Tailwind 4 needs no config file; tokens live in `src/app/styles.css` under `@theme`. The design direction is recorded in `screens.md`, and `open-questions` O2 is closed.
**Rejected:** a component library (it fights the dense table), a drag library (the first pass uses click-to-fill; drag needs layout and hit-testing work), and CSS-in-JS (one stylesheet plus tokens is enough).

## The raid hub (2026-10-31)

### L96. A last-encounter field is a report, not a history
`GameState.lastEncounter` is overwritten every night. The report can say why *that* pull failed; it cannot answer "how long have we been stuck at 41%", which is the question the race screen exists for. The first hub draft printed the report and called it a log: a six-night stall was the same 41% six times with nothing to compare.
**Evidence:** seed 1, day 84 — the Tyrant at 28% after 11 pulls across two nights; `lastEncounter` held only the day-83 night. The hub needs every night, not the last one.
**Changes:** `GameState.raidLog` holds up to 40 `RaidLogNight` entries (one per raid party: day, stance, best pull, one row per pull with the failed check's name, numbers and shortfall). `resolveDay` appends; `RAID_LOG.maxNights` bounds it. `tickRivals` clears each rival's log after its turn, because the hub reads only the player's history. At day 85 the log is 4 kB for 17 nights, 1.5% of a 255 kB save.
**Rejected:** storing the full `EncounterLog` per night (phases, abilities, traits — 35+ kB per guild over a run for data the report already shows) and deriving the log from `events` (the digest text carries no numbers).

### L97. A race screen needs kill days, not only best pulls
`bestPull` is 1 for every guild that cleared the boss, so a "best rival 100%" line reads as a rival at the wall — not a rival past it. The race is decided by *when* the door opened, not by the pull percentage afterwards.
**Evidence:** seed 1, day 84 — the first hub draft printed `you 28% · best rival Ravensguard 100%` on the Tyrant; Ravensguard had killed it on day 77. The same line on the wall panel compared `Math.round(0.28)` with `Math.round(1)` and said "1 points ahead".
**Changes:** `raidRace` ranks a boss by kill day first, then best pull. The map and the wall print `killed it day N` and compare the two days when both guilds cleared. A failed pull prints the shortfall (`DPS 688/750 · short 62`) instead of a two-decimal ratio; 688/750 is 0.917, which `toFixed(2)` prints as `0.92` — the scrape boundary, next to a FAIL.
**Rejected:** sorting the race by score (it tells you who is winning the run, not who is ahead on the boss) and printing a single 0–100% bar for a guild that has killed the boss (the bar saturates and stops telling the difference).

### L98. Round at the edge, and never against a decision boundary
Two numbers were wrong for the same reason: the value was rounded before it was compared or subtracted. `Math.round(0.28) - Math.round(1)` is −1, so a 72-point gap printed as `1 points ahead`. And rendering a failed `688/750` ratio as `0.92` puts the scrape threshold next to a FAIL.
**Evidence:** `WallPanel` in the first hub build; the day-84 Tyrant log row `First Blood DPS 688/750 · 0.92` where 0.92 is the pass/scrape line (`encounter.ts` fails below 0.92).
**Changes:** the gap is `Math.round((a - b) * 100)`, and the log prints `short N` rather than a ratio. Keep full precision in state; format the smallest unit the screen acts on.
**Rejected:** printing three decimals (`0.917`) — it is precise but the player acts on "how much am I short", not on the ratio.

### L99. A new tab is a mobile layout change, and a descendant selector is not a cell
Adding the fifth tab pushed "New run" off a 390 px viewport, and the mobile rule that hides the stance column (`.pull-row span:last-child`) also hid the nested shortfall span, so the log read "Obsidian" with no numbers. Both were invisible at 1440 px.
**Evidence:** day-84 hub at 390 × 844 — the nav overflowed to "NE"; the pull rows showed the phase name and an empty cell.
**Changes:** the nav's "New run" is `.tab-optional` and hidden below 560 px (the Hall and the title screen still start a run), the two long tab labels become `Hall` / `War`, and the hide rule is `.pull-row > span:last-child`. Check both breakpoints whenever a screen or a tab is added.
**Rejected:** shrinking all five tab labels — the labels are the navigation, and a scroll bar that starts mid-word looks broken.

## The tab badge (2026-10-31)

### L100. A count is not a notification until it names the thing
The Guild Hall tab showed a red `1` with `title="Guild Hall (1)"`: the number in the tooltip was the keyboard shortcut, so nothing said the badge counted blocking items. The count also showed while the Hall was open, beside the "Needs you (1)" panel that already answers it.
**Evidence:** player screenshot, day 15 — the Hall tab read `GUILD HALL 1`, the top bar read `1 ITEM NEEDS YOU`, and the panel read `NEEDS YOU (1)`; the only hover text was `Guild Hall (1)`.
**Changes:** the tab title and accessible name now say what the badge counts (`1 item needs you before Advance`, `2 contracts expiring, 1 injury`, `no party planned for tonight`); the count hides on the open tab; the Help modal names the count and the report dot.
**Rejected:** relying on the top-bar sub-label (it is present but small and does not name the tab badge), and replacing the count with a dot (the Hall can hold up to three blocking items; the count is the useful part).

## The level gate in the War Room (2026-10-31)

### L101. A gate that only warns when it fails is invisible when it decides
The War Room printed the area's average-level requirement only in `partyAdvice.warnings`, which fires after the party is already below the line. While assigning, the card showed a bare number after each name (power, easily read as iLvl) and the picker showed levels without the requirement, so a player choosing the last hero could not see the average the area gates on.
**Evidence:** player screenshot, day 15 — The Wolf Den card lists three heroes and no level requirement; the only place the gate appears is the target picker's `Avg lvl` column, which is closed while assigning.
**Changes:** every party card prints `avg lvl X / N` beside its size, red when below; the hero picker repeats `needs avg lvl N · party avg X` and warns when the current party is under; deployed and bench chips label the number `lvl`; the picker row labels `lvl · iLvl · pow` and keeps the full line in its tooltip.
**Rejected:** a per-hero "below level" badge (the gate is an average, so a low hero can be carried), and putting the requirement only in the inspect sheet (it is closed during assignment).

## The roster alerts strip (2026-10-31)

### L102. A badge that counts two different things needs a list, not a bigger tooltip
The Roster tab counts expiring contracts plus injuries. L100 made the tab title say so (`Roster — 1 contract expiring`), but clicking it landed on a twenty-row table sorted by power, where the reason was one `7d left` chip. The count was explained; the item was not.
**Evidence:** player screenshot, day 16 — the Roster tab read `1`; the table showed twenty heroes and the only marker was a contract chip on one row, below the fold of the grouped view.
**Changes:** an alerts strip above the table names each expiring contract and injury (`Contract · Perrin the Pale · 7 days left · 124g/week`) and opens the hero sheet on click. It counts the same expiring-plus-injured set as the tab badge, and the Injured view now uses the same `injuryDays > 0` predicate; the number, the list and the filter cannot disagree.
**Rejected:** auto-switching the Roster view to "Expiring" on entry (surprising, and it hides the rest of the roster), and a row highlight alone (the alert can sit far down a grouped table).

## Clearing a target in the War Room (2026-10-31)

### L103. A picker that can only swap options cannot say "nobody"
The target button on a party card opened a list where every row replaced that party's area. Nothing left the party with no target, and the only way to field fewer parties was `Rest the whole guild`, which clears every party and drops sharpness. The reducer already supported it — `set-party` with a null assignment splices the party out — so the gap was a missing control, not a missing rule.
**Evidence:** player report, 2026-10-31 — two parties planned (The Wolf Den, Emberwood); the target list offered only other areas, and the projection footer offered only the all-parties `Rest`.
**Changes:** `Remove` ends each party head and repeats in the target picker's footer, both two-step (`Remove` → `Confirm: remove`). It frees that party's heroes to the bench, leaves the other parties alone, and moves the projection selection with the card — removing a card above the selected one would otherwise re-point the strip at a different party. A reducer test locks the semantics (`clears one party's target by removing the party and freeing its heroes`). [screens.md](screens.md) §5 names the rule.
**Rejected:** an empty-target party (an assignment is keyed by `contentId`, so the resolver and the planner would both need a new state for a party the player never wants), and a one-click remove (it sits beside `Inspect` and throws away the night's hero assignments, so it arms first like `Rest`).

## The party size gate (2026-10-31)

### L104. Edit rules and deploy rules are not the same rule
The Wolf Den fields exactly 3. With three heroes, both size controls were disabled: `+ add` because the party was full, `×` because it was at the minimum, and every bench chip because the party was full. Three dead controls, while a level-8 hero sat on the bench and a level-1 hero was in the party. The first fix was a who-leaves swap dialog; the player asked for the opposite shape — let the plan hold 4/3, show it in red, and block the day. The cap is a *deploy* rule: the plan may be temporarily wrong while it is being fixed.
**Evidence:** player report, 2026-10-31 — The Wolf Den `3/3`, `avg lvl 5.0 / 1`, bench `Gareth lvl 8`, party `Soren lvl 1`; `+ add`, `×` and every bench chip were disabled, so Auto-fill was the only enabled edit. Follow-up the same day: "instead of swapping, let the player add the extra units... which blocks the day advancement until fixed."
**Changes:** the card and the add picker always add (the picker warns at the cap instead of refusing). `partyAdvice.overBy` drives a red `4/3` chip and a `party-alert` line (`Above the hero limit — 4/3. Remove 1 before the day can advance.`); `partySizeProblems` is the sim rule; the store's `advance` refuses (toast, moves to the War Room) and the top bar and War Room tab badge name the block. Removing any hero clears it; `sanitizePlan` still drops an over-size party if one reaches the resolver. Tests: the sim helper and a store test that advances the day only after the fix. Verified in headless Chrome: add → `4/3`, Advance left the day at 1 with the toast, remove → `3/3`, Advance reached day 2, no console errors.
**Rejected:** the two-step swap dialog (built and removed the same day: it hid the incoming/outgoing comparison behind an extra modal and made the common add a special case), a hard cap at max + 1 (the count is the message; the roster already bounds it), and auto-replacing the weakest hero on a bench click (a silent stat decision the player cannot see or undo).

## Fatigue in the War Room (2026-11-01)

### L105. The number was there; the reading was not
The add picker printed `78 fat` in the same dim style as `lvl`, `iLvl` and `pow`, and the assigned hero slots printed no fatigue at all. A player could not tell an exhausted hero from a fresh one without hovering a tooltip, even though the projection's form number was already being cut by that fatigue.
**Evidence:** player report, 2026-11-01 — "hard to see if any of the assigned heroes are exhausted. when adding a hero, the list doesn't make that clear either." The state was already in the UI elsewhere: `statusChips` drew `Exhausted` on the Roster and the Hero Sheet, and `condMod` takes 38% off a check at 100 fatigue.
**Changes:** one `fatigueState` (tired 45, exhausted 70, in `FATIGUE_LINES`) feeds a pill on assigned slots, bench chips, the add picker and the raid-ten picker. The card head counts exhausted heroes, the picker warns when its pool holds one, and the Roster's Exhausted chip is now red like the fatigue meter (it was amber). Tests pin the thresholds, the chip tone and the party count.
**Rejected:** a tooltip-only fix (it needs a hover the player has no reason to perform), and dimming the hero name (chips are the vocabulary the player already reads for status, so the state gets a pill, not a colour on the name).

## Removing a hero from a fixed-size party (2026-11-01)

### L106. A hard minimum blocks the swap that a soft maximum allows
The Drowned Mill fields exactly 3. With 3 heroes the `×` was disabled (`heroes.length <= minHeroes`), so the player could not bench the exhausted hero who was already in the party. Adding a fourth was allowed and blocked the day, but nothing on the card said the removal side was reversible: both controls read as dead. L104's over-cap rule was only half of "the plan may be temporarily wrong" — it made adding legal and left removing illegal.
**Evidence:** player report, 2026-11-01 — "in the war room, I can't remove or add heroes in the party for the drowned mill." Live save: day 20, `drowned-mill` at 3/3 with `Ignis Ironhand` at 100 fatigue deployed and six available heroes on the bench; every `×` was disabled, so the only way to swap was add (4/3) then remove.
**Changes:** `×` removes down to one hero at that point (the last-hero floor is gone in L107); a short party shows `2/3` in red, prints `Below the hero minimum — 2/3. Add 1 before the day can advance.`, and `advance` refuses with the same line (toast, moves to the War Room). `overLimitParties` became `partySizeProblems` with a `kind` of `under` or `over`, so the card, top bar, tab badge, Hall line and advance gate read one rule. Tests cover both directions and the store gate. Verified in headless Chrome: `4/3 → 3/3 → 2/3` (alert plus blocked advance) → add → `3/3` → day 20 resolves.
**Rejected:** making `×` open the swap dialog (a remove control that does not remove), and keeping the add-first-only path (the bench can be empty, and a disabled `×` is indistinguishable from a broken one).

## Removing the last hero (2026-11-01)

### L107. A floor of one is still a guard the player did not ask for
After L106 the `×` removed down to one hero and stopped, on the theory that clearing the target is `Remove this party`. The player wanted the opposite: keep the target and empty it, because the 0/3 card already prints the gap and already blocks the day. The floor protected nothing and forced a target deletion and re-pick to rebuild a party.
**Evidence:** player report, 2026-11-01 — "let me remove all heroes from a party. we already have an error message 'Below the hero minimum', it will be 0/3. this already blocks the day from advancing, so it will work."
**Changes:** `×` is never disabled. Removing the last hero keeps the assignment with an empty hero list; the card shows `0/3` in red, prints `Below the hero minimum — 0/3. Add 3 before the day can advance.`, the projection says it has no check, and `Remove this party` still drops the target. Tests cover an empty plan in the sim helper and in the store gate. [screens.md](screens.md) §5 and [guild-manager-model.md](guild-manager-model.md) now name the empty party as an editable state.
**Rejected:** deleting the party when its last hero leaves (the target is the thing the player is keeping), and hiding the empty card behind a placeholder (the slots and the bench are where the refill happens).

## The first 70-day human run (2026-11-01)

The player ran seed 444 ("Derpinos") by hand to day 70 of 84: 701 actions, 10 a day, no bot. The run is unfinished and it is one player, so it is a signal, not a sweep. The two findings below are what the numbers showed.

### L108. The endgame was invisible: the game named a door that was not there
The brand line read `Renown 7 · Gatewarden next` from day 1, because `nextRaidContent` returns the first uncleared raid and nothing else. But Gatewarden is locked behind the Ashen Spire, and the Ashen Spire was not in the player's `knownContent` — it had never been announced, because `announceUnlocks` fires when the roster can field an area and the top-five average had never reached 35. The target picker printed `4 areas not open yet` and, by the documented rule, never a name. So at day 70 the player knew a raid called Gatewarden existed, could not see it in any list, and could not see the dungeon that opens it or the 1.2 levels that open the dungeon.
**Evidence:** player save, day 70 — 12 heroes, top-five average 33.8 against the Ashen Spire's 35; `knownContent` 13 areas (the four Obsidian Citadel areas absent); Raid screen `Gatewarden LOCKED · Clear Ashen Spire first`; War Room picker `13 open today · 4 areas not open yet`; brand `GATEWARDEN NEXT`. Score 3,285 against rivals at 16,228–16,880, 0/3 raids, with 69 advances and 267 `assign-party` actions: the player was not idle, the target was missing.
**Changes:** `nextDoor` in `plan.ts` returns the first area the roster cannot field (prerequisites ignored, using the same `canField` test), with the gate's own numbers (`gate = { average, need, counted }` or `roster = { have, need }`). `nextDoorInfo` formats it once for the brand line (`Ashen Spire next`), a `NEXT DOOR` panel in the War Room side column (`avg lvl 33.8 / 35 over your best 5 — 1.2 short`), and the picker footer. The one-time unlock announcement and the hidden list are unchanged: one closed area is named, never a catalogue. Tests: the rule and its numbers ([sim.test.ts](../tests/sim.test.ts)), the readout ([ui-store.test.ts](../tests/ui-store.test.ts)). Verified in headless Chrome against the day-70 save: brand `ASHEN SPIRE NEXT`, panel `avg lvl 33.8 / 35 over your best 5 — 1.2 short`, picker footer repeats it.
**Rejected:** naming all closed areas (that is the catalogue the rule exists to prevent, and it spoils the ladder), and lowering the Ashen Spire gate to 33 so this run would have seen it (one run does not justify a balance change; a player 1.2 levels short on day 70 is a pacing question, not a gate bug).

### L109. A gear gap printed for a raid that is not open is a false lead
The raid-ten panel said `Next: Obsidian Citadel — Gatewarden · recommended iLvl 150 · your ten 82 (−68)` while the raid was locked behind the Ashen Spire and the ten was 1/10. Two numbers pointed at gear and at team size; neither was the blocker. The player clicked `Set team` once, added one hero, and never filled the ten.
**Evidence:** player save, day 70 — `raidTeam: ['h1']`, one `set-raid-team` action (day 66), zero `auto-raid-team`; panel printed the −68 gap. The Raid screen, one tab away, correctly said `Locked — Clear Ashen Spire first`.
**Changes:** the panel prints the lock reason instead of the gear gap while the raid is not open (`locked — Clear Ashen Spire first. The ten can wait until the door opens.`), and only prints the ten's iLvl gap once the raid is open. `contentAvailability` is the one source for the reason.
**Rejected:** auto-filling the ten (the standing ten is a choice, and it would hide the reason the raid cannot start), and hiding the panel while the raid is locked (the ten still needs building for the day it opens).

## The test suite under load (2026-11-01)

### L110. A green suite that fails under load makes the hook a coin flip
The pre-commit hook runs `npm test`. One world test (`does not carry three rival histories into the save`: 84 days for four guilds) takes 1.35 s on an idle machine and over 5 s when Steam and a browser compete for the cores — which is vitest's default timeout. On 2026-11-01 the suite failed twice on the timeout while every assertion passed, and the same command passed with `--testTimeout=20000`.
**Evidence:** 153/153 in 47 s with the longer timeout; the single test timed out twice at ~7.2 s wall with load average 7.1 on 8 cores. Earlier the same test ran in 1.35 s.
**Changes:** `vite.config.ts` imports `defineConfig` from `vitest/config` and sets `testTimeout: 20000`. This is a timeout, not an assertion: a real hang still fails. No test was weakened.
**Rejected:** raising only the one test's timeout (the next world test has the same shape and the failure just moves), and leaving the default and retrying the hook (a flaky gate trains everyone to bypass it).

## The interface voice (2026-11-01)

### L111. Interface copy that argues with the reader is noise
The screens were written in the voice of the design docs: sentences that pre-empt an objection (`a blank day was quiet, not broken`, `the team is a preference, not a lock`, `this is a contract, not a treasure room`), sentences that justify the architecture (`the projection is the same function the resolution uses`, `every number comes from the simulation`), and design words shown to the player without a definition (`next levers`, `the wall`). The player asked what one of them meant. When a line needs the design doc to read, it is not a UI line.
**Evidence:** player report, 2026-11-01 — "the copy in the web ui is too confusion... like in '; a blank day was quiet, not broken.' — what does this even mean???" and, on the report block, "what are levers in this context???" The levers were the three suggestions the report prints (the shortfall, a Push stance, one gear tier); nothing on screen said so.
**Changes:** 46 strings across 12 files. Every `X, not Y` became the plain fact (`Filled means something happened that day. Blank means nothing did.`). Every design justification was cut or moved to the docs. The report block is `What would close the gap`, and its rows were inverted: the label names the change (`Shortfall`, `Push stance`, `One gear tier`, `Mastery 12%`) and the detail carries the number, because two of the old rows both read `+5 Mitigation` and were indistinguishable. That collision was also the row key in React, so the same screen logged a duplicate-key warning; the key is now the index. The raid panel `The wall` is `Your record on it`; the CLI prints `what to change`. Design vocabulary stays in `docs/`; the player reads what a thing is and what to do.
**Rejected:** rewriting the flavour text (blurbs, event cards, mob notes) — that is prose by design and the complaint was about interface chrome; and keeping the `levers`/`wall` names with a tooltip (a definition behind a hover is still an undefined word on screen).

## The first 70-day human run (continued)

### L112. A dungeon ladder with a thirteen-level hole reads as no content at all
The human run reached day 40 with a top-five average of 15.0 and the only dungeons ahead were the Ashen Spire at 35 and then the raids. Between the Sunken Temple (22) and the Spire (35) there was nothing new for thirteen levels — roughly thirty days of play — and the run never saw a raid. The level gaps were 10, 16, 22, 35: six levels at the bottom and thirteen at the top.
**Evidence:** player save, day 70 — 13 areas cleared, 0/3 raids, top-five 33.8 one day after the Spire's 35 gate would have opened. The five new dungeons are now at 13, 19, 25, 29 and 32, so no gap in the band exceeds four levels.
**Changes:** five side dungeons ([progression-report.md](progression-report.md) §1.3), `requires: []` and `firstClearRecruit: false` so they add choices without widening the prerequisite chain or the roster economy. Requirements came from the party the Steward planner actually fields on the first legal day (8 seeds per area), not from a full-gear template: a real party at level 32 carries iLvl 62, and the first draft (built from the recommended iLvl of 112) made the Pale Market project 31% for a player standing two levels above its gate. Measured 20-seed sweep: scores 25,238/21,208/26,302 → 28,439/24,136/27,413, raids 2.80/2.45/2.90 → 2.95/2.60/2.85, dungeons 4.00 → 9.00. The cost is the race: World Firsts 10/5/9 → 6/2/3 of 20 and average rank 1.80/2.55/1.85 → 2.45/3.35/2.90. Optional full-pay content taxes focus, and the rivals' lines push raids.
**Rejected:** moving the Ashen Spire down to 30 (its three phase numbers were measured at 35), adding dungeons past 35 (the raid band is the endgame), and a full re-space to fifteen dungeons every three levels from 10 to 60 (no player in the data reached the top half, and every area needs its own measurement).

## The playtest feedback pass (2026-11-01)

### L113. A daily bonus that pays XP is a difficulty dial
The first daily star paid +50% gold **and** XP. The AI prices both, so it chased the star every day; the 20-seed sweep put the Steward at 3.00 raids and added roughly 1.1k–3.5k score. The player asked for "sauce", not a shorter ladder.
**Evidence:** 20 seeds per personality, before the star: Steward 28,439 / 2.95 raids, Quartermaster 27,413 / 2.85, Gambler 24,136 / 2.60. With the XP star: 29,604 / 3.00, 28,309 / 2.90, 27,678 / 2.85. Gold-only: 28,234 / 2.90, 28,238 / 2.95, 26,888 / 2.80.
**Changes:** `FEATURED.goldMult = 1.5`, `FEATURED.xpMult = 1`; `featuredBonusFor` is the gold multiplier and `featuredXpBonusFor` is the XP multiplier. The screens say "+50% gold", not "+50% rewards".
**Rejected:** turning the star off (the playtest asked for it), making it random only for the player (the rivals run the same planner), and paying XP only on a first clear (it still accelerates the early ladder). The remaining dial is the high-band farm tier, not the star.

### L114. A stance cost that only fires where the stance is not used is not a cost
Push's 1.55× injury multiplier only applied on a scrape. Push also adds +12% to the check, which moves a 0.92 party out of the scrape band, so the stance was safest exactly where it was supposed to be dangerous. The first human run used Push and saw no injuries at all.
**Evidence:** seed 1234, day 47 — Gatewarden mitigation 234/255 (0.92) on steady and 1.03 on Push; the clear rolled no scrape. L65 recorded the same shape. A controlled 10-hero level-55/250-iLvl party that cleared Gatewarden: Push took **45 injuries over 100 seeds (0.45 a night)**; steady took 0, because every check was clean.
**Changes:** `INJURY.pushChance = 0.06`; `pushInjuryChance` rolls once per hero per pull on Push, before vitality and fatigue. Injuries are deduplicated per assignment, so a hero hurt on two phases is one injury, not two 45-health hits. The report and the day event already name the injured hero.
**Rejected:** raising the scrape multiplier (it does not fire on the nights Push is used), risking only on a failed pull (a clean Push would still be free), and a per-phase roll (a ten-hero party would take several injuries a night). Do not raise the chance to tune the raid ladder (L57).

### L115. Gold needs a decision, not a bigger number
Gold was "supply": wages and facilities were the only sinks, and the AI ended with ~10k it could not use. The playtest asked for a shop; the answer is not a bigger facility tree, it is a purchase that competes with the night.
**Evidence:** the old sink list was four facilities × three levels; the AI maxed them by ~day 70 and still ended with ~10k. The new market prices at the measured tier: gear 255g at level 1, 930g at level 30, 1,398g at level 50; salve 126–420g; rations 63–210g; tonic 188–580g. A level-30 gear piece is about three dungeon clears, so the shop is a fallback, not a replacement.
**Changes:** `src/sim/market.ts` and `content/market.ts`: gear at `12 + 2.6 × best level` iLvl, a salve that clears injury days, rations for fatigue, and a three-day +10% tonic shown through `formMod`. A waiting drop can be sold for `20 + 2 × iLvl`, or forged for `100 + 4 × iLvl` into `max(current, drop) + 6`. The Guild Hall carries a `Market` panel; the modal shows every hero and the price for that hero.
**Rejected:** a daily rotating stock (a second board to read, and the price is already the decision); shop gear above the dungeon band (it replaces the loot ladder); a permanent stat potion (it flattens the attribute model); a stacking tonic (+20% for two tonics is a different, worse decision). The AI does not shop, so the sweep does not price the market; this needs a human run.

### L116. Loot is a moment, so show it when it happens
> **Partly superseded by L120.** The list still opens on the day of the clear, but it is now the report's first panel; only the Hall and War Room strips open the Gear Assign modal.

A clear queued drops into a non-blocking strip. The player had to find the strip after reading the report, and the report's "Drops" line was a list, not a decision. The playtest asked for a modal or a report section.
**Evidence:** the first human run had 701 actions and the loot strip was below the fold on the Hall; the report printed the drops as one dim line. The `pendingLoot` queue and the `loot` command already had the decision; only the timing was wrong.
**Changes:** `advance()` in the store opens the loot modal when the resolved day queued drops, with the report behind it. The Report screen keeps a `Drops waiting` panel using the same `DropRow`, so closing the modal does not lose the choice. Each row now assigns to three targets, sells, forges for the top target, or discards. A drop no hero can use is still discarded at queue time, so the modal never offers a no-op.
**Rejected:** making loot blocking (it would turn a five-drop raid clear into five queue items, which the design forbids); putting the loot only in the report (the player may close the report before assigning); a separate screen (the decision is one item at a time and the modal is the right size).

### L117. A location list with one kind hides the work a spare party can do
The target list was a single table of 22 areas. Farms and missions stopped at level 18, so a guild with three spare bodies had only dungeons and raids, and the list mixed a level-1 farm with a level-35 dungeon. The playtest asked for tabs, high-level farm/mission options, and a daily star.
**Evidence:** the old ladder had 3 farms (1, 5, 10) and 7 missions (1–18). A 40-seed probe of three `makeHero` parties at level 22/28/34/42 measured mechanics/sustain/mitigation medians of 60/51/58/118; the four new missions are 62/52/60/122 (1.02–1.03×). The high-band farms are gold-first: 8 XP per hero, 18–42 gold per hero.
**Changes:** four farms at 20/28/36/44 and four missions at 22/28/34/42, appended after the raid ladder so `nextDoor` still names the main step. Content tabs `All · Farm · Mission · Dungeon · Raid` with counts; a ★ row for the starred area. The star is one open non-raid area, `(seed, day)`, +50% gold (L113).
**Rejected:** putting the high band before the raids (it would make the next-door line name a level-44 farm); XP-paying high-band farms (free levels); showing all closed areas in the tabs (the closed-list rule).

### L118. A rival roster is a target, not a leaderboard number
The race screen showed four scores and one activity line. The playtest asked whether rivals get offers and whether the player can poach. The answer required the rival rosters to be readable, which the design had deliberately hidden.
**Evidence:** `Rival.guild` already holds a full roster, plan and raid ten; only `Rival.activity` and the score were exposed. The existing rival-offer card already named the threat, but the player could not see who was on the other side.
**Changes:** a Guilds screen lists every rival, its rank, score, raids, roster and activity, and every hero with level, iLvl, power, wage and fee. A signing pays `feeForLevel × 1.5`, puts the hero on a four-week `wageForLevel × 1.25` contract, and removes him from the rival's roster, plan and raid ten. A player poach sets `poachHeat`; one rival-offer card answers inside ten days. Rivals sign each other's bench at 6%/day, logged in the report.
**Rejected:** hiding the rival rosters and only offering a blind "poach" button (the player cannot judge the price); a rival refusal roll (unpriceable and not needed when the fee is the gate); making rivals poach the player's heroes more often (the existing card is the threat; a second source would be noise); a grudge/repeat system (post-MVP).

### L119. The feature pass moved the race; the next pass owns it
The 20-seed sweep after the pass is Steward 28,234 / 2.90 raids / 5/20 World First / 2.90 rank; Quartermaster 28,238 / 2.95 / 1/20 / 3.25; Gambler 26,888 / 2.80 / 5/20 / 2.90. Against 2026-10-31 (28,439 / 2.95 / 6/20 / 2.45; 27,413 / 2.85 / 3/20 / 2.90; 24,136 / 2.60 / 2/20 / 3.35), the Gambler is +2.7k and the Steward's rank slips. The high-band farms (24 clears a run at 42g/hero) are the largest new gold faucet; the star is gold-only for L113.
**Evidence:** `sim --runs 20 --clears`, seeds 1+17i, `runWorld`; full table in [progression-report.md](progression-report.md) §3.9. The XP-star middle arm (29,604 / 3.00 / 28,309 / 2.90 / 27,678 / 2.85) is the warning.
**Changes:** record the new baseline in the report, README and roadmap; do not call the feature pass balance-neutral. The next balance pass tests the high-band farm gold tier, one dial, 20 seeds. Do not use Push's injury chance or the star's XP multiplier as the dial (L57, L113).
**Rejected:** reverting the high band (the playtest asked for it and the clear table shows it is used); making the star player-only (the rivals run the same planner); tuning the Tyrant requirement in the same pass (two dials at once).

## The loot sheet, folded into the report (2026-11-01)

### L120. A list on a sheet over the report is not part of the report
L116 put the loot decision in a modal that `advance()` opened over the Day Report. The playtest read it as an interruption: the day resolved, a sheet covered the page, and closing it dropped the player on a report they had not read. The same rows were already in the report, so every advance with a clear showed the list twice and hid the page that explained it.
**Evidence:** the playtest request after the feature pass. The report's `Drops waiting` panel and the modal render the same `DropRow` from the same `pendingLoot`, and the store opened the modal only on advance; the Hall and War Room strips open it on demand.
**Changes:** `advance()` now sets `modal: null`. The Day Report renders `Drops waiting` first in the main column, above the digest, with the per-drop assign/sell/forge/discard rows and an `Auto — need pick` button, so the list is the report's own content and sits on the first screen. The Hall and War Room strips still open the Gear Assign modal on demand. The app also scrolls to the top when the report day changes, because the Hall can be scrolled far enough to hide the new heading. A store test advances a clearing party and asserts `pendingLoot` is non-empty, `screen` is `report`, and `modal` is `null`.
**Rejected:** keeping the modal and hiding the report panel (one list in two places); auto-assigning every drop on advance (the sell-or-forge decision is the point of the queue); a toast that links to the report (still a second step); keeping the panel below the fight (the first human run had already shown the strip falling below the fold, L116).

## The art pack, written before any art (2026-11-01)

### L121. Generated vector icons are not images
The ask was images for heroes, locations and items. The first pass drew them: a Node script emitting 64×64 line-art SVGs in the UI palette, on the theory that a 1–2 KB stroke icon survives the 20–28 px the UI actually renders at. It was rejected on sight. The player wanted pictures, not a second icon language, and a generated mark still needs a human hand on every path.
**Evidence:** the prototype produced 29 marks in one evening and the weakest ten were unreadable at 32 px even after three passes (the tree read as a mushroom, the cuirass as a bottle). Cost was not the problem; taste was. Every icon needed hand-tuning, so "generated" was doing no work.
**Changes:** [art-prompts.md](art-prompts.md) is the delivery: one style block per asset class, a subject line per content id, a consistency protocol, and sizes. 30 locations, 53 loot icons, 7 market icons, 8 role portraits. Every filename is a live content id; a check compares the two lists and the doc is 30/30, 53/53.
**Rejected:** a portrait per hero (heroes are rolled from a seed, 120 a run, so the images would be generated at runtime or wasted); a crest per guild (the name is player text); mob portraits and trait icons (no screen has room; text is faster to read); shipping placeholder art (a wrong image is worse than none).

### L122. The portrait budget is a role budget
Eight roles exist, 120 heroes can exist, and the sim gives a hero one role at a time from a fixed list. So the image count follows the role list, not the roster: 8 portraits, or 16 with two variants assigned by hero id parity. Two warriors on one roster share a face, and that is the accepted cost.
**Evidence:** `rolesForClass` returns two roles per class; `makeHero` rolls level, traits and attributes but never a face. A 120-hero run would need 120 portraits to look unique, and no player sees more than ~20.
**Changes:** §4 of [art-prompts.md](art-prompts.md) plans 8 portraits and keeps a variant rule for later. If faces must be unique, the lever is variants per role, not portraits per hero.
**Rejected:** generating portraits at runtime (the run is deterministic and seeded; an image call is neither); procedurally compositing faces from parts (a second art system to build and tune).

### L123. A prompt pack that needs assembly does not get run
The first version of [art-prompts.md](art-prompts.md) shipped a style block, 98 subject lines and the rule "join them with a comma". That is a manual step per image, so the list only exists once someone does 98 copy-pastes. The pack was written for the reader, not for the tool.
**Evidence:** the doc had 98 subject lines across three tables and three style blocks; assembling one prompt by hand takes ~20 seconds, so the full set is half an hour before the first generation.
**Changes:** `npm run art:prompts` parses the doc's tables and style blocks into `art/prompts.csv` (98 rows, style already joined, negative prompt as its own column) and `art/prompts-mj.txt` (Midjourney flags applied). `npm run art:check` compares the doc against `src/sim/content`, fails if a content id has no prompt or the committed CSV is stale, and prints how many of the 98 images exist. Both run in the pre-commit hook.
**Rejected:** hand-writing a second prompt list next to the doc (two sources, and the copy rots); generating prompts from `content.ts` alone (the subject lines are taste, not derivable from the data); committing the images themselves (they are build artifacts; the list and the ids are the source).

### L124. Ship the format the model gives you, and name the person in every prompt
Two findings from the first four generated portraits. The pack asked for WebP, which needs a conversion step that cannot run on this machine. And four images generated in one conversation produced the same face twice: `vanguard` and `lightbringer` are the same young man in different clothes, because the style block holds the look and nothing in it holds the person.
**Evidence:** Gemini returned 825×1024 JPEG at 118–148 KB, which is small enough to ship. `sips -s format webp` fails with "Can't write format: org.webmproject.webp" after listing the format as supported. Of the four portraits, two are the same face and two are grey-bearded men.
**Changes:** `.jpg` is the shipped extension and the lookup accepts `.jpg`, `.jpeg`, `.png` or `.webp`, so the extension never reaches code. §4 of [art-prompts.md](art-prompts.md) now puts an identity line first ("a wiry woman of twenty-eight, shaved at the sides") and changes it for every role, with a table of what to regenerate.
**Rejected:** a WebP conversion step (it will not get run, and 130 KB per portrait is already acceptable); one conversation per character (it costs the style consistency that the whole pack exists to buy); relying on "vary the presentation" as advice (it did not survive contact with the model).

### L125. A portrait belongs to the person, not to tonight's role
The obvious key for a role portrait is `hero.role`. It is wrong: the planner reassigns that field per fight (`planner.ts` picks a role per hero, and `set-role` writes it), so a hero would change face between days. `naturalRole` is written once in `makeHero` and never drifts — that is the key, and it is why the sheet says "natural role" rather than "role".
**Evidence:** `planner.ts:341,386,396` and `game.ts:87` all write `role`; `heroes.ts:101` writes `naturalRole` once. The four generated portraits render at 26 px, 40 px and 84 px with the face legible at the smallest size.
**Changes:** `src/ui/components/Portrait.tsx` against `public/art/roles/<role>.<ext>`, used in the roster name cell, the hero-sheet head and tavern candidates. A role with no file renders a grey box with the class initial and a class-coloured border, so the class cue the old `ClassIcon` dot carried survives.
**Rejected:** a manifest of existing files (a build step and a fetch, to save three requests per missing role); keying on `klass` (two roles per class would need an arbitrary pick); keeping the class dot next to the portrait (crowded at 26 px).

### L126. A missing image is not a 404 in dev
`<img src="/art/roles/arcanist.jpg">` for a file that does not exist gets **200 OK, `text/html`** from the Vite dev server: the SPA fallback answers for every unmatched path. Any check based on status codes would report the image as present. The only reliable signal is the element's own decode failure.
**Evidence:** `curl -I localhost:5199/art/roles/arcanist.jpg` returned `HTTP/1.1 200 OK`, `Content-Type: text/html`, for a file that is not in `public/`. The rendered preview showed four portraits and four placeholders, which is the correct split.
**Changes:** the component tries `.jpg`, `.jpeg`, `.png`, `.webp` on `onError` and caches the answer per role in a module-level map, so twenty heroes of one class cost one lookup. It also means the extension never reaches code.
**Rejected:** assuming `.jpg` only (the four existing files are `.jpeg`); a `HEAD` preflight (correct in production, wrong in dev, and an extra round trip in both).

### L127. You can write the generator without a key; you just cannot validate it
`npm run art:generate` reads `art/prompts.csv`, calls Gemini or OpenAI, and writes `public/art/<folder>/<id>.<ext>`. It is 200 lines of Node with no dependency, because Node 24 has `fetch` and the CSV parser is the only thing worth owning. What it is not: tested against a live call. There is no key in this environment, and a prompt pack that claims a working pipeline is worse than one that says which half is checked.
**Evidence:** `--dry-run` prints the exact request. A real request with `GEMINI_API_KEY=invalid` returns `400 INVALID_ARGUMENT "API key not valid"`, which proves the endpoint and the `x-goog-api-key` header are right and proves nothing about the body, the response, or the image. No image was generated by this script.
**Changes:** §12 of [art-prompts.md](art-prompts.md) documents the flags, the two unverified places (`generationConfig.imageConfig`, the response parser), and the `--dry-run --limit 1` first step. The script is idempotent by file existence, so a run that dies at image 40 resumes at 41, and `--force` exists to re-roll one bad portrait.
**Rejected:** an SDK dependency for two HTTP calls (an ADR for 15 lines of `fetch`); generating images on demand at runtime (the run is deterministic and seeded; a network call is neither); a file manifest (§L125); building a provider plugin system before a second provider exists.

### L128. The model gives you a file the game cannot ship
Three things came back from the first full batch (8 roles, 30 locations) that the pack had not planned for. The API returns PNG at ~1.4 MB where the app returns JPEG at ~130 KB, so 34 files were 50.9 MB. A loose phrase in one subject line — "one hand still smoking" — produced a woman in a leather jacket holding a cigarette: modern, off-genre, in a set that is otherwise period fantasy. And two images carry a painter's signature in the bottom corner despite `no signature` in the prompt.
**Evidence:** `du -sh public/art` = 52 MB before, 9.8 MB after `npm run art:tidy` (sips PNG→JPEG q85, 82% smaller per file, 50.9 MB → 9.2 MB). `evoker.png` shows a modern jacket and a cigarette; `hollow-crypt.png` and `trickster.png` both sign the bottom-right.
**Changes:** `npm run art:tidy` converts and parks the original in `art/raw/`; the lookup already accepted every extension, so no code changed. The evoker line is now "an ember burning in her open palm". §8 of [art-prompts.md](art-prompts.md) gained a genre check and a signature check.
**Rejected:** shipping the PNGs (45 MB of locations for card-sized art); a crop step in the pipeline (signatures are not always in the same corner, and a blind 2% crop costs composition); regenerating the whole set for one bad subject line (one `--force --only evoker` is the fix).

### L129. "Game inventory icon" imports the whole genre, frame included
The item style block opened with "game inventory icon". That phrase carries a convention the words do not mention: the object sitting in a slot. Of the first five icons, two came back on a dark circular disc, one on a thin blue ring, one on a grey studio sweep and one on **white** — five images, four backgrounds, one of which would render as a white square on the `#10141a` panel. The medium drifted too: 3D render, against the oil paint of the 38 portraits and locations.
**Evidence:** `tonic.png` is white outside a black circle; `salve.png` and `rations.png` sit on a dark disc with a visible rim; `gear-weapon.png` has a blue ring; `gear-chest.png` is on grey. All five are legible at 26 px, so the subjects were fine; only the field behind them failed.
**Changes:** the item block is now "oil-painted still life of a single object … a single flat near-black field behind the object edge to edge". The negative prompt never applied — Gemini's API has no negative channel, so "no vignette, no frame" was decoration. The positive sentence carries the rule now.
**Rejected:** masking or cropping the backgrounds in post (it cannot fix a white field or the shadow a disc casts); keeping the 3D look because it reads well at 26 px (it is a decision worth taking, but taken for all 60 or for none, not five at a time).

### L130. Shipping the images is not the same as showing them
`art:check` said 98/98 and the player saw eight. Only the role portraits were wired; 90 location and item files sat in `public/art` with nothing reading them. The generator and the UI are one deliverable, and the check counts files, not pixels on screen.
**Evidence:** `art 98/98 images in public/art/`; the roster, hero sheet and tavern showed portraits, and no other screen referenced an image. After wiring, the War Room target picker, party card, raid hub, report banner, market and loot rows all render from the same set.
**Changes:** one `Art` component replaces the portrait-only lookup and resolves `.jpg/.jpeg/.png/.webp` per path with a cache, so 60 drops cost 60 lookups once. `itemArtId` mirrors the file-naming rule in `scripts/art/prompts.mjs` — if those two drift, every icon 404s quietly into a placeholder.
**Rejected:** a manifest JSON of existing files (a fetch and a build step to save three failed requests); per-screen image code (five copies of the same fallback logic); icons at 28 px (the generated canvas pads the subject into the middle third, so items are drawn at 36–38 px).

### L131. The style was chosen from the palette, not from the reading distance
The first set matched the UI: oil paint, slate and ash, one gold accent. It was judged on a 200 px contact sheet and it passed there. On screen, sixty item icons are drawn at 28 px in a table, where a grey object on a near-black field is a smudge — "Ratcatcher's Charm" was a dark square. The rule the pack now states: the measuring stick is not whether the thumbnail looks good, it is whether the object can be named from the icon alone.
**Evidence:** the market and loot rows at 30 px, then 36–38 px, then still unreadable for the grey items. Contrast and silhouette, not detail, are what survive the downscale; the cartoon direction supplies both.
**Changes:** §2 of [art-prompts.md](art-prompts.md) specifies painted cartoon fantasy after the Warcraft III direction: chunky forms, thick outline, saturated colour, one strong light, object filling the frame. 98 prompts regenerated; the old files still render until they are replaced.
**Rejected:** keeping the oil-paint look and enlarging the icons further (36 px already crowds the loot row, and the problem is contrast, not size); naming Samwise Didier in the prompt (some models filter a living artist's name, and the ones that do not produce a pastiche of one picture — the properties carry the style and survive the filter); recolouring the existing icons in code (a filter cannot add a silhouette).

### L132. A re-roll that leaves the old file behind ships the old file
The first re-probe looked identical to what came before, and it was: the generator writes whatever extension the API returns (PNG), while `art:tidy` had left `.jpg` next to it, and the lookup tries `.jpg` first. `salve` re-rolled into `salve.png` while `salve.jpg` — the old painting — kept rendering. Nothing was broken; the wrong file won.
**Evidence:** `salve.jpg` mtime 16:49, `salve.png` mtime 17:12, both present, and the app showed the 16:49 version. Same for `emberwood` and `evoker`.
**Changes:** `generate.mjs` now archives *every* extension of an id, not just the one it is about to write, so one id always has one file. `tidy.mjs` archives the JPEG it would overwrite. The three stale siblings were moved to `art/raw/`.
**Rejected:** reordering the lookup to prefer the newest file (it makes the render depend on mtime, which a git checkout resets); making `tidy` the only writer with one extension (the API chooses the format, not us).

### L133. "Dark fantasy" is a subject, not an exposure
Every style round kept producing near-black fields and crushed shadows, and the third one was rejected on sight: too dark. The words were the cause. "Dark fantasy", "deep blue-black background", "deep shadows" all read to the model as an exposure instruction, and a 28 px icon of a near-black field is a hole in the panel.
**Evidence:** the evoker probe kept a black background, Emberwood was a dusk scene with black trees, and every item icon since the first batch had a black field — including the clean `salve` at 17:14 that had already lost the disc and the white background.
**Changes:** all three blocks in [art-prompts.md](art-prompts.md) now open with **bright high-key**, ask for open luminous shadows, and specify a mid-tone behind the object instead of black. §8 gained a value check against the panel colour.
**Rejected:** a CSS `brightness()` filter on `.art` (it lifts the noise and the border with the subject, and every image would still be low-key under the hood); keeping black backgrounds and enlarging icons again (L131 already showed size is not the lever).

### L134. Look at the reference before writing adjectives
Two style corrections were made blind — mid-tone backgrounds, then "bright high-key" — both reasoning from the word "dark". The Warcraft III sheets the player supplied settle it in one look: their backgrounds are near-black too. What makes those icons read at 64 px is that the subject is the brightest thing in the frame, carries the only saturated hue, has a thick dark outline, and fills 70–85% of the square. Brightness was never the variable; contrast was.
**Evidence:** the reference ability sheet is 16 columns of 64 px icons on near-black grounds; the portrait sheet is 25 head-and-shoulder crops with coloured rim light. Our first set had object and ground at the same value, no outline, subject in the middle third — the table in §2 of [art-prompts.md](art-prompts.md) lists all four.
**Changes:** blocks rewritten to "bright lit subject, fully saturated, coloured glow behind it on a dark ground"; portrait framing moved from mid-chest to head-and-shoulders; the QA list checks subject-vs-ground contrast and one dominant hue per icon.
**Rejected:** keeping "bright high-key" (it flattens the contrast that does the work); lifting brightness with a CSS filter (the subject is what must be bright, and a filter lifts the ground with it); committing the reference sheets to the repo — they are Blizzard's art, usable to steer a prompt and nothing else.

### L135. "White border" is two faults, and neither is a crop
Five of 98 came back with white at the edges, which looked like one problem with one cheap fix. It is two shapes: a thin bar along one edge (`wailing-mines`), and the subject painted on a white poster with margins and a ragged painted edge (`bulwark`). A 3% centre crop on `bulwark` left the sides and cut the shield; a 4% crop left white on both it and `wailing-mines`. The margin is 4–8% — more than the composition can spare.
**Evidence:** both files cropped at 3% and 4% and inspected at 200 px; white survived every time, and the crop cost composition (the shield edge).
**Changes:** both were restored from `art/raw/`. The crop tool was written, tried and deleted rather than shipped — §12 of [art-prompts.md](art-prompts.md) now says white at the edge is a re-roll with `--force`, and not to reach for a crop.
**Rejected:** shipping `art:trim` anyway because it might help a thinner frame one day (no such frame has appeared in 98 images); a bounding-box crop to the content (the ragged painted edge makes the content box the poster); raising "dark background" in the prompt to a negative (Gemini has no negative channel, L129).

### L136. The manual path needs the same guards as the scripted one
With the API out of credits the last 30 images came from the Gemini web app, by hand: download, rename, save. That path has no `--force`, no archive and no extension rule, so the two failures the API runner was hardened against came straight back into play — a wrong name is invisible, and a new `.jpg` beside an old `.png` leaves the lookup serving the old picture.
**Evidence:** 98 files arrived correctly named this time, but the set mixes output from three sources (app, API, web) across `.jpeg`, `.jpg` and `.png`.
**Changes:** `npm run art:check` now fails on two files for one id and on any file whose stem is not a content id, and prints both by name. §12 of [art-prompts.md](art-prompts.md) documents the web workflow and the three traps.
**Rejected:** assuming a rename happened (it did this time; the check is what makes that verifiable rather than lucky); rejecting any folder that mixes extensions (the lookup handles it, and three sources make it inevitable).

## The multi-party report (2026-11-01)

### L137. A day can field three parties; the report kept one card
`resolveDay` looped every party and wrote each result into the same `lastEncounter` slot. A three-party day therefore reported the last party only. Nothing on the screen said a party was missing, so the loss read as a rendering bug.
**Evidence:** day-21 report, three parties sent, one mission card (`The Toll House`); `lastEncounter = …` sits inside the per-party loop, so every party overwrote the one before it.**Changes:** `GameState.lastEncounters: EncounterLog[]` holds every encounter from the most recent day, in plan order. The Report screen maps one card per entry (`Party 1 of 3` in the eyebrow), the Hall's Yesterday panel lists every fight, the CLI prints one block per party, and `SAVE_VERSION` is 2: a v1 save's single encounter is upgraded to a one-element list instead of being rejected. A farm party resolves no pull and so has no card; it now writes one digest line (`Emberwood: 3 heroes farmed — +27g, +30 XP.` on seed 3, day 1) so every party can be accounted for.
**Rejected:** reconstructing the other parties from `raidLog` (raids only — missions and dungeons were never logged there); keeping `lastEncounter` beside the new array (two sources of truth for the same night).

### L138. Mastery showed the next pull's bonus
`masteryReport` read `progress.attempts` after the day had already added tonight's pulls. A clear on pull 1 with five attempts total printed `mastery 10%`, but the killing pull ran at +8% (four prior pulls). The label was one pull ahead of the number under it.
**Evidence:** day-21 Toll House, five attempts logged, one-pull clear; `MASTERY.perPull` is 0.02 and the pull used `priorAttempts + pull.index - 1`.
**Changes:** `EncounterLog.priorAttempts` carries the count across the write; `masteryReport` computes the bonus at the focus pull's index; a test asserts +8% and explicitly not +10%.
**Rejected:** printing the total as "next pull's mastery" (true but useless on a kill); dropping mastery from the header (it is the one number that says "come back tomorrow").

### L139. The report's numbers had no explanation on screen
One line of the report — `Killing pull 1 of 1 · mastery 10% · 5 attempts logged · clean 43/34 · 1.26 · Mechanics · off nights: …` — produced three separate questions from the player. Each part was correct and none of it was explained on screen.
**Evidence:** screenshot of the day-21 report; the player asked what four of the five clauses meant.
**Changes:** a `Hint` primitive (dotted rule, hover and focus, bubble opens inward near a panel edge) wraps pull, mastery, the outcome band, the check label and off nights. The copy is built from `MASTERY`, `CHECK_BANDS` and `OFF_NIGHT_FACTOR`, so the tooltip cannot drift from the fight. The encounter panel lost `overflow: hidden` (the banner carries the corner radius now) because the clipping cut the bubbles.
**Rejected:** native `title` only (slow to appear, and it cannot be styled to match the panel); an expandable legend under the card (the player has to scroll away from the number).

### L140. Write the tooltip as an answer to the player's question
The first off-nights tooltip said "Consistency is hidden; the report is how the player learns it." The mechanic is right, and the sentence answers a design question ("why is there no Consistency number on the sheet?") when the player asked a different one ("what do these two names mean?"). It also talks about the player in the third person.
**Evidence:** the player's reaction to that line: "the player will understand nothing."
**Changes:** every report hint now answers the number it sits on, with that pull's own numbers: "Each hero can have a bad pull. These did on this check, so they counted for 86% of their normal value." The band hint prints the party's value and the requirement. The pull hint says raids get 2–7 attempts and missions one.
**Rejected:** putting Consistency on the hero sheet (hidden stats stay hidden, [guild-manager-model.md](guild-manager-model.md) §2.6); explaining the Consistency formula in the tooltip (the player needs the consequence, not the dice).

## Shipping the browser build (2026-11-01)

### L141. A project site is not the local server
The game ran at `/` locally and at `/world-first/` on GitHub Pages. Vite rewrote the URLs in `index.html`, so the page loaded, but every art path is built at render time from a template string (`/art/roles/${role}`). The bundler cannot see those, so on the site they requested `/art/...` and got 404, and `Art` turned each miss into a grey placeholder instead of an error. Eight screens would have shipped without portraits, place thumbs or item icons, with nothing on the page or in the console saying why.
**Evidence:** with only the base set, the built bundle still contained `` `/art/roles/${e}` ``; `curl` on `vite preview` returned 200 for `/world-first/art/items/abbey-bell.jpg` and 404 for `/art/items/abbey-bell.jpg`. After the fix, headless Chrome founded a run, opened Roster and reported 3/3 portraits loaded from `/world-first/art/roles/...` with no failed requests; all 98 images under `public/art` return 200 at the based path.
**Changes:** `BASE` in `vite.config.ts` (`/world-first/` for build and preview, `/` for dev); `assetUrl` in `Art.tsx` prepends `import.meta.env.BASE_URL`; `.github/workflows/deploy.yml` builds and deploys on every push to `main`; §11 of [tech-notes.md](tech-notes.md) records the rules.
**Rejected:** `base: "./"` and relative art paths (they would work today, with no router, but they make every URL depend on the current document path); a `gh-pages` branch built by a local script (generated files in git, and a step that only happens when someone remembers).


## The title-screen rewrite (2026-11-01)

### L142. The title sold the design thesis, not the game
The first title screen opened with a three-fragment slab (`Three heroes. / One wood. / Eighty-four days.`) and then the thesis: "You never fight… The fight tests those choices." It named the philosophy and never named the boss, the objective or the resources the player would spend. A reader could not say what game they were about to start, and the fragment rhythm read as ad copy.
**Evidence:** the shipped block on `TitleScreen.tsx`; the player's reaction was that the copy was "full of AI mannerisms" and named the missing parts: the race, the Tyrant, wages, fatigue, item level, loot.
**Changes:** the headline is now `Lead your guild / to World First.` and the lead is two sentences: the goal (`Kill the Tyrant before three rival guilds do.`), then the clock and the ledger (eighty-four days, three heroes, wages, fatigue, item level, the drop). `index.html`'s meta description mirrors it. Rendered at 1440 px and 500 px: two headline lines at both, no overflow.
**Rejected:** keeping "You never fight" (true, but it states a design constraint where the player needs an objective); the fragment stack (a list of nouns with full stops is what the design doc is for — [vision.md](vision.md) keeps the thesis). Rule for player-facing copy: name the goal and the resources it costs, in full sentences.
