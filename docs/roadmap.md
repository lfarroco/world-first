# Roadmap

Where the project is, what could kill it, and the order I'd build in.

Last updated: 2026-10-31. Update this file when a phase ships or the order changes.

---

## 1. Where we are

| Piece | State |
|---|---|
| Simulation core | Done — deterministic, 93 tests, `resolveDay` clones its input |
| Progression ladder | Done — 3 heroes → 3 farms, 6 missions, 4 dungeons, 3 raids over 84 days. The list hides what the guild cannot field and announces each new area once |
| Content inspection | Done — `content` shows rewards and projection per area; `inspect <id>` shows phases, bestiary and truthful drop chances |
| AI planner | Done — priorities, raid prep, resting, hiring, 6 personalities |
| Rivals | Done — three full guilds run the same planner and the same `resolveDay`. Each has a roster, gold, facilities and a score; the leaderboard has a real rank |
| Contract board | Done — two open missions are posted at full pay each day; every other mission pays 25% after its first clear. The AI skips token repeats; the Drowned Mill fell from 26.4 to 13.75 clears/run |
| CLI | Done — playable end to end; invalid plans are repaired and reported, and every screen names its inputs |
| Balance | Provisional — 20 seeds per personality; the contract board costs ~2.5% of score and 0.15 raids, and the average rank is 2.10–2.80 of 4 (see [progression-report.md](progression-report.md) §3.4) |
| UI | **None** |
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

**Kill criterion:** if a 30-day human playtest produces no moment the player wants to retell, stop and rethink the loop before any UI work.

### Phase 2 — Rivals on the planner ✅ *shipped*

**Goal:** the race is simulated, not paced.

The compressed one-number model is gone. Each rival is a full `GameState` with its own roster, gold, facilities, promises and event log, played each day by the same `aiTurn` the player's bot uses. `resolveDay` resolves one guild; `tickRivals` resolves the world; `runWorld` is the product-level run and `aiRun` is the fast, player-only balance harness. The leaderboard is now scored with `computeScore` for all four guilds, so `rank` is real (closing open question D3).

**Measured (2026-10-31, 20 seeds per personality, `RIVAL.pace = 0.9`):** the player's documented line holds — Steward 23,515 / 2.75 raids / World First 3/20 / average rank 2.90; Quartermaster 24,293 / 2.75 / 6/20 / 2.35; Gambler 20,814 / 2.50 / 3/20 / 2.75. The rivals average 23.4–23.9k and 2.67 raids. Full table in [progression-report.md](progression-report.md) §3.2.

**The cost:** a full world run takes ~0.84 s instead of ~0.1 s, because three rival guilds plan 84 days each. The unit tests use the player-only `aiRun`; the race has its own three world tests. `sim --runs 20` now takes ~50 s.

### Phase 3 — UI vertical slice *(the product)*

**Goal:** a stranger plays a week without asking what a number means.

- Vite + React + Zustand (see ADR 0002 — **this decision blocks the phase**).
- Three screens: **Roster + hero drawer**, **War Room** (parties, stance, projection strip), **Report** (day digest and wipe report).
- Then the attention modal.
- Empty states, keyboard `Space` to advance, one number per row.

**Kill criterion:** if the wipe report in the UI does not make a player say "ah — swap the rogue", the model is wrong, not the screen.

### Phase 4 — The missing levers

- **Manual loot assignment** — the "who gets the axe?" decision, the best drama per line of code in the design.
- **Role assignment** — the sim and CLI can switch a hero's role at the fit cost, and the planner re-specs on 3.5% of days. The lever is small until the affinity spread widens (O5); the hero sheet has no chips yet.
- **Contracts and promises** — the ledger ships (due day, kept/broken); what is missing is the counter-offer loop and a transfer request behind a broken promise.

### Phase 5 — Onboarding and length

The first week is a natural tutorial: one concept per day, delivered by the steward, in the real game with real consequences. This is where we beat FM, which has no tutorial worth the name.

---

## 4. Decision gates

| When | Decision | Blocks |
|---|---|---|
| Before Phase 3 | **React or Angular** ([ADR 0002](adr/0002-ui-framework.md)) | The whole UI |
| After Phase 1 playtest | **84 days or 56** | Balance of everything after |
| Before Phase 3 | **Art direction**: type, colour, spacing | Every screen's feel |
| Before any public surface | **Name** ("World First" is a working title) | Domain, store page |

---

## 5. Explicitly not doing yet

Multiplayer · 2D replay · youth academy · scouting network · press conferences · set pieces · more than three raids · localisation · monetisation.

Each is in [vision.md](vision.md) §5 with a phase. None of them is load-bearing for "is this fun".

---

## 6. If you only do one thing

**Play thirty days by hand and write down what you wanted to do and could not.** The cards are priced, the queue is total, and the ladder is measured; the only claim left untested is the one no sweep can answer — that a player has a moment worth retelling. Every remaining feature is an amplification of that claim, and none of them fixes a day that reads as administration.
