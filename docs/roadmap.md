# Roadmap

Where the project is, what could kill it, and the order I'd build in.

Last updated: 2026-11-30. Update this file when a phase ships or the order changes.

---

## 1. Where we are

| Piece | State |
|---|---|
| Simulation core | Done — deterministic, 17 tests, `resolveDay` is pure |
| Progression ladder | Done — 3 heroes → 2 farms, 2 missions, 3 dungeons, 3 raids over 84 days |
| AI planner | Done — priorities, raid prep, resting, hiring, 6 personalities |
| CLI | Done — playable end to end |
| Balance | Provisional — measured, tunable, not yet tightened |
| UI | **None** |
| Drama / events | **None** — the weakest point (see §2) |
| Economy sinks | **None** — a good run ends with 17–29k gold it cannot spend |

One deliberate constraint holds it together: the simulation never imports the UI, and content is data. That is what makes every phase below cheap to add.

---

## 2. The central risk

**The game may be interesting to optimise and boring to play.**

Three pieces of evidence:

1. The AI clears the ladder in milliseconds. A human plays the same 84 days by hand.
2. In the AI's own trace, the plan is stable for six to ten days at a time — same parties, same content, same stance. That is correct play, and it is also *no decisions*.
3. The attention queue fires on four triggers, all administrative: a benched hero, an expiring contract, the wage bill, high fatigue. Nothing in the game ever *surprises* the player.

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

**Still open from this phase:** the AI picks the first option of every card, so events are shown but not played. Structured option costs are the fix.

**Kill criterion:** if a 30-day human playtest produces no moment the player wants to retell, stop and rethink the loop before any UI work.

### Phase 2 — Rivals on the planner

**Goal:** the race is simulated, not paced.

Delete the rivals' compressed one-number model and run `aiTurn` for three rival guilds each day, each with a personality. Benefits: the leaderboard becomes explicable ("Echoes over-geared and stalled on the Tyrant"), poaching becomes possible later, and we delete more code than we add.

Cheap because the planner only reads `GameState` and a `Personality`.

### Phase 3 — UI vertical slice *(the product)*

**Goal:** a stranger plays a week without asking what a number means.

- Vite + React + Zustand (see ADR 0002 — **this decision blocks the phase**).
- Three screens: **Roster + hero drawer**, **War Room** (parties, stance, projection strip), **Report** (day digest and wipe report).
- Then the attention modal.
- Empty states, keyboard `Space` to advance, one number per row.

**Kill criterion:** if the wipe report in the UI does not make a player say "ah — swap the rogue", the model is wrong, not the screen.

### Phase 4 — The missing levers

- **Manual loot assignment** — the "who gets the axe?" decision, the best drama per line of code in the design.
- **Role assignment** — heroes currently pick their class's best role at creation and never change it. This is the largest missing source of agency.
- **Contracts and promises** — renewals with a counter-offer, and the promises ledger.

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

**Write three event cards and play them.** Twenty lines of data, existing consequence systems, no new architecture. If "the rival guild offers Elaria double her wage, and you cannot match it" is not interesting, nothing downstream will be.
