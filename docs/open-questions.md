# Decisions

Recorded 2026-10-30. Anything here is settled unless we deliberately reopen it.

---

## Locked

### D1. Click-driven turns
No real-time clock. The player advances a day when they choose, and the mental model is explicitly turn-based. A full run is a sitting, not a subscription.

*Consequences:* the UI can assume the player is present. No notification system, no catch-up logic, no server tick. Save/load is a pause. If we later want async, the pure `resolveDay` function makes it a scheduling layer rather than a rewrite.

### D2. Few attributes — eight
Eight attributes, two groups of four, 1–20 scale, five colour bands. Class identity comes from **weights plus abilities**, not from private stats, so one "class power" attribute (**Focus**) covers weapon force, spellpower and healing.

*Consequences:* the hero card is two columns of four and needs no tabs. Eight roles stay distinguishable through their weight vectors. If playtesting shows roles flattening, the exit is 12 — never 36.

### D3. No failure state — a deadline and a ranking
The run is **84 days**, then it ends and is scored (the EU4/HOI4/Civ "limit date"). There is no firing, no game over, and no board confidence meter.

- Setbacks are **damage, not death**: debt (arrears) blocks recruitment, drains morale and costs score at the end, but the run continues and can be recovered.
- A run can become mathematically unwinnable for a top rank while remaining playable. That is intended.
- The endgame is **Score → Band (S/A/B/C/D) → Rank among the 4 guilds**, plus a summary of the three moments that mattered.

*Consequences:* an entire subsystem (board objectives, confidence, reviews, firing) disappears. In its place: one number visible from day one, and a summary screen generated from the event log. The goal must be legible early or the deadline feels arbitrary — hence the score strip on the Guild Hall.

*Score:* `4000/6000/8000 per raid + 200 per dungeon + 3000 World First + min(1500, gold/10) + 2 × squadPower + 250 × renownTier − 250 × daysInArrears`
(max ≈ 25k; a competent first run lands 10–15k.)

### D4. Scope: simple MVP, FM loop only
Implement the loop — *assess → plan → advance → digest → react* — in our setting. No subsystem that doesn't serve it.

Cut from v0.1 by this rule: split runs, doctrine toggles, doctrine familiarity, two-audience grades, board objectives, training sessions, youth, scouting network, staff, press, facility tree, poaching, loans, multi-tier seasons, 2D replay.

---

## Defaults (proceeding unless you object)

| # | Default | Why |
|---|---|---|
| D5 | **Rivals are simulated NPCs** (3 guilds, same functions, deterministic per seed) | Single-player first; multiplayer later is a storage change, not a rewrite |
| D6 | **localStorage** behind a `SaveStore` interface | Fastest to ship; `(seed, actionLog)` makes migration a data move |
| D7 | **One guild per save**, multiple save slots | Two concurrent guilds doubles UI for half the attachment |
| D8 | **The race wins over the guild fantasy** when they conflict | The RWF structure is the differentiator; the tavern/facility wrapper thickens later |
| D9 | **Desktop-first, responsive** (not mobile-first) | The vertical slice is a dense management UI |

---

## Still open

### O1. Name
You like **World First**; **MMO Guild Simulator** is descriptive and hard to own. Not blocking. Before any public surface:

- **"World First"** is the established esports term for the race — good for search intent, weaker for trademark distinctiveness. Check USPTO/EUIPO class 9/41 and obvious domains.
- Avoid the word "Guild Manager" entirely: [it's taken on Steam twice](https://store.steampowered.com/app/5227700/Guild_Manager/).

Recommendation: keep **World First** as the working title and ship under it unless a search turns up an active game by that name.

### O2. Art direction
Dark slate / gold / parchment is a good direction. Type, colour and spacing should be settled before the first screen; portraits and any 2D battle view stay placeholders through v0.1.

### O3. Session target
Still unanswered: **5–10 minute daily check** vs **45–90 minute weekly binge**. Click-driven (D1) implies the latter for v0.1; it changes how much density the screens carry. Default: binge-first, compact mode later.
