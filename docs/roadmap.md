# Roadmap

Where the project is, what could kill it, and the order I'd build in.

Last updated: 2026-10-31. Update this file when a phase ships or the order changes.

---

## 1. Where we are

| Piece | State |
|---|---|
| Simulation core | Done — deterministic, 143 tests, `resolveDay` clones its input |
| Progression ladder | Done — 3 heroes → 3 farms, 7 missions, 4 dungeons, 3 raids over 84 days. The list hides what the guild cannot field and announces each new area once |
| Content inspection | Done — `content` shows rewards and projection per area; `inspect <id>` shows phases, bestiary and truthful drop chances |
| AI planner | Done — priorities, raid prep, resting, hiring, 6 personalities; prices the purse, the next wall's level gate and the gear gap |
| Rivals | Done — three full guilds run the same planner and the same `resolveDay`. Each has a roster, gold, facilities and a score; the leaderboard has a real rank |
| Contract board | Done — two open missions are posted at full pay each day; every other mission pays 25% after its first clear. The AI skips token repeats; the Drowned Mill fell from 26.4 to 13.75 clears/run |
| Contracts & promises | Done — a renewal is a 12% counter with a 25% raise on refusal; a broken promise raises a one-shot transfer request worth half the recruit fee. The planner still does not read `contract.status`. Measured in [progression-report.md](progression-report.md) §3.8 |
| Mitigation mission | Done — The Broken Bridge, level 18, three heroes, mitigation 36, 220g. The one mission check the band was missing; the gold is a ceiling, not the lever (20 seeds: Steward 16/20, Quartermaster 19/20, Gambler 9/20; §3.7) |
| Reward-aware planner | Done — a purse target, the next wall's level gate and the raid party's gear gap weight XP, gold and loot. The Quartermaster is 24,520 and the Gambler 21,549; the Tyrant stall is 7/20 against the 6/20 target |
| Loot assignment & raid ten | Done — a clear queues drops; the player assigns any hero or takes the need suggestion, the AI keeps the old lowest-party pick (42/60 full clears). The standing ten is built at the first raid; day-40 team iLvl is 46–55 against the 65 target |
| Role review | Done — the reviewer only re-specs a party below 1.0, caps at two flips, and stops at 1.0; the `role` command prints the four check deltas. The 1.30 affinity widening was measured and rejected (ladder volatility); the 1.15 table stays |
| CLI | Done — playable end to end; invalid plans are repaired and reported, and every screen names its inputs |
| Balance | Provisional — 20 seeds on the current build (bridge + contracts): Steward 25,238, Quartermaster 26,302, Gambler 21,208; full clears 16/18/10 = 44/60. The earlier pre-bridge control on the same harness was 15/17/9 = 41/60. The conservative AI is 44/60; the player's need pick is 52/60; day-40 team iLvl is 46–55 against the 65 target (§3.6–§3.8) |
| UI | **Vertical slice shipped** — Guild Hall, Roster + Hero Sheet, War Room with live projection, Raid hub with the per-boss pull log, Report + Run End, attention queue, loot, tavern, facilities. No drag-and-drop, scouting fog or wage negotiation. Bundle 418 kB raw / 124 kB gzip; 143 tests; `npm run dev` |
| Raid hub | Done — the three-boss ladder with lock reasons, the four-guild race with live rival activity and per-boss best, and a bounded per-pull log of the guild's raid nights (failed check, shortfall, stance). Rivals carry no log; the player's is 4 kB at day 85 |
| Drama / events | 10 cards, fired at 40%/day. The AI prices every option and chooses; the trace is in [progression-report.md](progression-report.md) §5.4 |
| Traits | 20 across five kinds, rolled at creation, used by resolution and the planner. Within 1.7% of the two-counter build ([progression-report.md](progression-report.md) §6.5) |
| Economy sinks | Four facilities, three levels each; the AI maxes the tree by ~day 70 and still ends with ~10k |

One deliberate constraint holds it together: the simulation never imports the UI, and content is data. That is what makes every phase below cheap to add.

---

## 2. The central risk

**The game may be interesting to optimise and boring to play.**

Three pieces of evidence:

1. The AI clears the ladder in milliseconds. A human plays the same 84 days by hand.
2. In the AI's own trace, the plan is stable for six to ten days at a time — same parties, same content, same stance. That is correct play, and it is also *no decisions*.
3. The recurring attention triggers are administrative — a benched hero, an expiring contract, the wage bill, high fatigue. Event cards add surprise, and the bot now weighs them instead of taking the first option, but the queue's own triggers are still bookkeeping.

FM's loop works because the day is a queue of interruptions that each demand a decision with incomplete information. We built the queue and left it empty.

Everything else — rivals, UI, facilities — amplifies a loop that must first be worth playing.

---

## 3. Phases

### Phase 1 — Make the day worth playing ✅ *shipped*

**Goal:** on a random day, the player has one decision they could get wrong.

- **Event system.** ~12 event types, each a card with 2–3 options and a consequence in systems we already have: a rival guild offers your best mage a wage you cannot match; a hero demands the next drop; a cursed blade is cheap and strong; a merchant sells gear at a price; bandits hit the farm party; a rival publicly taunts your progress.
- **Reduce dead days.** If nothing changes and nothing is due, the day should be skippable in one keystroke. Or: the run shortens to ~56 days with faster levelling (decide with a playtest, not by feel).
- **Facilities.** Four upgrades (infirmary, forge, tavern, hall), three levels each, with real effects and real prices. This is the gold sink, and the reason to keep farming after you can clear content.
- **Quick wins for playtesting:** `today` (one screen: state + plan + what needs you), `repeat` (reuse yesterday's plan), `advance --until event`.

**Shipped:** 10 event cards as data, 4 facilities × 3 levels, `today` and `build` commands. End-of-run surplus dropped from 17–29k to ~10k with no change to difficulty.

**Shipped after the seed-5150 hand run:** nine legibility fixes ([learnings.md](learnings.md) L47–L56). The queue repairs an invalid plan instead of refusing; the report shows the killing pull; projections and best-pull bank the failed check's partial progress; form and sharpness are on screen; the tavern shows power, gear and traits; every attention option settles its item; `party` accepts and prints names; fatigue now feeds injury chance. The measured sweep is in [progression-report.md](progression-report.md) §3.1.

**Still open from this phase:** the kill criterion. A 30-day human playtest is the only test that can pass or fail it, and it has not been run.

**Shipped after the phase's own report:** the AI now prices every card option and picks, so events are played and not only presented ([progression-report.md](progression-report.md) §5.4). The same pass fixed four card bugs the trace exposed: a "hurt a hero" option that hurt nobody, a "rest him" option that wounded him, a strictly-dominant taunt, and a rival offer that ended a young guild's run.

**Shipped after Phase 2:** the contract board (O7). Two of the guild's open missions are posted at full pay each day; every other mission pays 25% after its first clear, and the AI will not spend a night on a token repeat. The Drowned Mill fell from 26.4 to 13.75 clears/run; the three personalities lost at most 2.5% of score and 0.15 raids, and the Steward lost three full clears (15/20 → 12/20). Measurement and rejected alternatives in [progression-report.md](progression-report.md) §3.4.

**Shipped after the contract board:** the reward-aware planner (§3.5). The AI now prices the purse, the next wall's level gate and the raid party's gear gap; the Quartermaster returns as the clear winner, the Gambler recovers, and the total full clears return to the pre-board 40/60. The attribution caveat and the three measured arms are in the report.

**Shipped after the reward planner:** loot assignment and the standing raid ten (§3.6). A clear queues untargeted drops; the player gives each to any hero or takes the need suggestion, and the next Advance takes the default. The AI keeps the old lowest-party pick as its floor (42/60 full clears); the player's need pick wastes no items and reaches 52/60 in the all-need lab. The standing ten is built at the first open raid; the day-40 ten is 46–55 against the 65 target, so the gear gap remains the next lever.

**Kill criterion:** if a 30-day human playtest produces no moment the player wants to retell, stop and rethink the loop before any UI work. **It has not been run.** The UI now makes it runnable; if it fails, UI polish stops and the loop changes.

### Phase 2 — Rivals on the planner ✅ *shipped*

**Goal:** the race is simulated, not paced.

The compressed one-number model is gone. Each rival is a full `GameState` with its own roster, gold, facilities, promises and event log, played each day by the same `aiTurn` the player's bot uses. `resolveDay` resolves one guild; `tickRivals` resolves the world; `runWorld` is the product-level run and `aiRun` is the fast, player-only balance harness. The leaderboard is now scored with `computeScore` for all four guilds, so `rank` is real (closing open question D3).

**Measured (2026-10-31, 20 seeds per personality, `RIVAL.pace = 0.9`):** the player's documented line holds — Steward 23,515 / 2.75 raids / World First 3/20 / average rank 2.90; Quartermaster 24,293 / 2.75 / 6/20 / 2.35; Gambler 20,814 / 2.50 / 3/20 / 2.75. The rivals average 23.4–23.9k and 2.67 raids. Full table in [progression-report.md](progression-report.md) §3.2.

**The cost:** a full world run takes ~1.1 s instead of ~0.1 s, because three rival guilds plan 84 days each. The unit tests use the player-only `aiRun`; the race has its own three world tests. `sim --runs 20` now takes ~65 s.

### Phase 3 — UI vertical slice *(the product)* ◐ *shipped, unplayed*

**Goal:** a stranger plays a week without asking what a number means.

**Shipped 2026-10-31.** React 19 + Vite 8 + Zustand 5 + Tailwind 4 ([ADR 0002](adr/0002-ui-framework.md) chose React; the exact versions are in [tech-notes.md](tech-notes.md) §2.6).

- **Guild Hall** — queue-first, digest, standings, week, contracts, promises, loot, facilities, tavern. The compact home the loop needs.
- **Roster + Hero Sheet** — sortable, grouped table; six views; all eight role chips previewing the four check contributions; gear, condition, contract, traits and a ten-day event strip.
- **War Room** — three party cards in Front/Mid/Back order, target picker limited to fieldable content, inspect sheet, stance, auto-fill, standing raid ten, loot strip and a live projection that recomputes on every change.
- **Raid hub** — the three-boss ladder with lock reasons, the four-guild race with live activity and each guild's kill day or best pull on the selected boss, and a per-pull log of the guild's own raid nights (failed check, shortfall, stance). Reads `GameState.raidLog`, bounded at 40 nights; the analysis link opens the Report screen.
- **Report + Run End** — digest, killing/failed pull, per-phase checks, threat counter, next levers with numbers, live score, and the day-84 verdict with the three moments.
- **Attention and loot** — blocking items gate Advance; every option carries its consequence; drops never block and the next Advance takes the default.
- **Tavern and facilities** — pulled forward from the amplification list because a guild that cannot hire is stuck at three heroes (see the learning below).

**Measured:** 143 tests (five new sim tests for the raid log and two selector tests for the party level gate and the Injured view, on top of the twelve headless action/reducer tests); production build 417.88 kB JS / 123.86 kB gzip and 35.56 kB CSS / 8.01 kB gzip in 0.72 s; a save is 164–255 kB because it carries the three rival guilds and the player's raid log (4 kB for 17 nights, 1.5% of the end-of-run save; 3.4 ms to stringify and 2.3 ms to parse the 255 kB file, 500 runs, and the log moves either by under 0.1 ms). A full 84-day UI run completes and reaches the verdict (automated, first-option queue).

**Cut from this pass:** drag-and-drop, bulk roster actions, comparison drawer, column chooser, scouting fog, signing negotiation, contracts table, settings, mobile card list, fixed bottom Advance. Each needs a sim field or a playtest.

**Kill criterion:** if the wipe report in the UI does not make a player say "ah — swap the rogue", the model is wrong, not the screen. **This has not been tested with a human.** The UI makes the test possible; it does not pass it.

### Phase 4 — The missing levers

- **Role assignment** — shipped as the reviewer gate and the check readout. The 1.30 affinity widening was measured and rejected: it moved the ladder 17–22/30 and the Steward 10/20–20/20 (§6.4). The 1.15 table stays; the role lever is a short-content tool (5–13% of a check on a 3-hero mission). A party-level mechanic is the next lever if roles must decide raids.
- **A new three-hero activity with a non-mechanics check** — shipped as **The Broken Bridge** (level 18, mitigation 36, 220g). Twenty seeds: Steward 16/20, Quartermaster 19/20, Gambler 9/20, no 20/20. The gold curve (160–220g) and requirement 40 were measured and did not move the Quartermaster; the extra full-pay night did. Table in [progression-report.md](progression-report.md) §3.7.
- **Contracts and promises** — shipped. A renewal inside the 7-day window can be countered 12% under; a refusal is final and raises his number 25%, so the counter is a risk on a hero you want to keep. A broken promise raises a one-shot transfer request: grant it for half his recruit fee, or refuse and take the −10 morale. The planner still does not read `contract.status`, so the bot's own promises remain unplanned; that is the next promise lever, not a new mechanic.

### Phase 5 — Onboarding and length

The first week is a natural tutorial: one concept per day, delivered by the steward, in the real game with real consequences. This is where we beat FM, which has no tutorial worth the name.

---

## 4. Decision gates

| When | Decision | Blocks |
|---|---|---|
| Before Phase 3 | **React or Angular** ([ADR 0002](adr/0002-ui-framework.md)) | **Resolved 2026-10-30:** React + Vite. No longer blocks the phase |
| After Phase 1 playtest | **84 days or 56** | Balance of everything after |
| Before Phase 3 | **Art direction**: type, colour, spacing | **Resolved 2026-10-31:** dark operations console, tokens in [screens.md](screens.md) §Visual direction |
| Before any public surface | **Name** ("World First" is a working title) | Domain, store page |

---

## 5. Explicitly not doing yet

Multiplayer · 2D replay · youth academy · scouting network · press conferences · set pieces · more than three raids · localisation · monetisation.

Each is in [vision.md](vision.md) §5 with a phase. None of them is load-bearing for "is this fun".

---

## 6. If you only do one thing

**Play thirty days by hand and write down what you wanted to do and could not.** The cards are priced, the queue is total, and the ladder is measured; the only claim left untested is the one no sweep can answer — that a player has a moment worth retelling. Every remaining feature is an amplification of that claim, and none of them fixes a day that reads as administration.
