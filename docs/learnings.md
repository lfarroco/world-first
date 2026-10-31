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
**Changes:** none in code. Decide before the next balance pass whether Push needs a cost that is unconditional, or whether the 0.92 scrape band should also remove the check bonus. Do not "fix" it by raising the injury multiplier: that prices a check dial with an injury dial (L57).

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
**Verified:** 102 tests. The world tests are one full race (5.2 s on a loaded host), a 10-day determinism run, and a hand-built World First case; the earlier world-heavy suite timed out at 30 s.

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
