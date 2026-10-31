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
(measured max ≈ 31k; a two-raid run lands ~16k, a full clear 23–30k.)

Score and band are built. **Rank among the four guilds is not**: rivals have no score of their own yet.

### D4. Scope: simple MVP, FM loop only
Implement the loop — *assess → plan → advance → digest → react* — in our setting. No subsystem that doesn't serve it.

Cut from v0.1 by this rule: split runs, doctrine toggles, doctrine familiarity, two-audience grades, board objectives, training sessions, youth, scouting network, staff, press, poaching, loans, multi-tier seasons, 2D replay. Four facilities (infirmary, forge, tavern, hall) shipped as the gold sink.

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

### O4. Threats: multiplier, band rule, or time cost?
The probe ships a check multiplier (×0.82/×0.85) and it is decorative: the bot's safety margin absorbs it ([progression-report.md](progression-report.md) §6). Three exits, none blocking v0.1:

1. **Bigger multiplier (~0.70).** Changes the ladder, but a roster missing the specific counter loses a raid to a 30% roll. Needs a guaranteed acquisition path first.
2. **Rule, not number.** An uncountered threat removes the scrape band, or ends the night's remaining pulls. One line in the report, no farming answer.
3. **Time cost.** An uncountered scrape adds injuries or fatigue. Farming does not heal faster, so it compounds.

Recommendation: try (2) and (3) on one boss each, measure with the same sweep, then choose. Do not tune the multiplier again without a fresh measurement.

### O5. Role affinities are too flat for the fit cost
A switch pays 0.88 fit, so it needs >13.6% affinity on the target check to gain anything. Only two directions in the current table clear +5%, and both cost ~20% elsewhere. That is why the planner re-specs on 3.5% of days and the ladder does not move ([progression-report.md](progression-report.md) §6.4).

- **Widen the signatures** — each role ~1.3 on its check, off-checks ~0.85. A real specialisation, but it is a balance pass: content requirements were calibrated on the 1.15 spread and must be re-measured.
- **Lower the trained fit** to ~0.95. Cheap, but then role choice is a nudge, not a decision, and the 0.88 tier disappears.

Recommendation: widen the signatures as a measured pass. Do not move the fit on its own.

### O6. How does a hero earn a third trait?
The cap is three; heroes roll two. The third slot is reserved. Options: a level milestone (40), the first clear of a raid, or a training slot that costs days. Earned traits would give the 84-day run a character arc and a reason to keep a veteran, and they need a rule that stops the pool becoming a checklist. Not blocking v0.1.

### O7. Should a cleared mission pay full XP on repeat?

**Measured 2026-10-31; the decay was rejected.** The Drowned Mill is cleared 26.4 times per run (1,585 clears over 60 runs): a 3-man XP mission at 0.86 difficulty is the best spare-party value. Two repeat schedules were built and swept on the standard 20 seeds:

| Repeat pay | Steward score | Raids | Full clears | Drowned Mill clears/run |
|---|---|---|---|---|
| Full (current) | 23,051 | 2.70 | 14/20 | 26.4 |
| 100% → 85% → 70% | 22,271 | 2.65 | 13/20 | 28.5 |
| 100% → 60% → 30% | 17,693 | 2.20 | 7/20 | 27.6 |

Neither schedule changed the pick. At the harsh one the Mill still pays 78 XP for three heroes against 66 from the best farm, so the bot keeps going. The decay taxed the ladder — the Tyrant became unreachable, World First 0/20 — without producing a different night.

**Why:** the spare party has exactly one three-hero job. Farms pay less, dungeons and raids need four to ten, and missions are the only middle. A reward rule cannot create a choice the content does not offer.

**Two exits, in order of preference:**

1. **A second three-hero activity with a different shape** — a check the missions do not use, a different reward column, or a rotating contract board where two missions are "posted" each day at full pay and the rest pay a token. That changes the pick every day, caps the faucet without starving the ladder, and gives the day a reason to read the board first.
2. **Accept the faucet** and spend the effort on the mid-game elsewhere. It is not a correctness bug: the player can repeat the Mill 26 times too, and the run still ends with three raids and a score.

Recommendation: build (1) with the rival/planner phase, measure it against the 20-seed Tyrant stall, then close this question. Do not ship a flat decay.
