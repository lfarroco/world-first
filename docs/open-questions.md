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

Score and band are built. **Rank among the four guilds is now built too:** the rivals are full guilds, `computeScore` runs on each, and `standings` / `playerRank` order the table. The ranking rule is score, then the earlier final-boss kill, then more raids, then table order. Measured average rank on 20 seeds: 2.90 (Steward), 2.35 (Quartermaster), 2.75 (Gambler).

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

### O5. Role affinities are too flat for the fit cost — **Resolved 2026-10-31**

**Resolved by the reviewer and the check readout, not by widening the table.** The old review gate (party below 1.1, first improving alt) was the real cause of the 3.5% re-spec rate. A 1.30 signature table was measured three ways; it made the ladder volatile (10 seeds: 19/30 full clears with the old reviewer, 22/30 with a revert-if-not-crossing gate, 17/30 with the final gate; the Steward swung 10/20–20/20 and the Gambler 4/20–8/20). It was rejected. The 1.15 table stays.

The shipped reviewer only touches a party projected below 1.0, accepts a gain of ≥0.015, picks the best alt, caps at two flips, stops at 1.0, and names the check and delta. At 1.15 it re-specs 8/7/5 days per 10 runs (about 1%), and the ladder is unchanged: 25,637 / 25,818 / 21,474, 42/60 full clears, World First 15/30 ([progression-report.md](progression-report.md) §6.4). `checkPowerInRole` and the `role` command now print the four check contributions before and after, so the hero sheet shows what a switch buys instead of a role-blind power number.

**The affinity stays flat on purpose.** At 1.15 a trained switch pays only on the two directions O5 named; the role lever is a mission/dungeon tool (5–13% of a check for two flips) and a raid nudge (1.7–3% per flip). If roles must decide raids, the next lever is a party-level mechanic or 12 roles, not a bigger table; the 1.30 table was the bigger table, and it moved the ladder more than it moved the decision.

**Rejected:** 1.30 signatures (the measured volatility above); trained fit 0.95 (with any 1.30 signature it makes the natural role stop paying); 12 roles (content, not tuning); per-check role bonuses; class-locked content; raising content requirements instead.

### O6. How does a hero earn a third trait?
The cap is three; heroes roll two. The third slot is reserved. Options: a level milestone (40), the first clear of a raid, or a training slot that costs days. Earned traits would give the 84-day run a character arc and a reason to keep a veteran, and they need a rule that stops the pool becoming a checklist. Not blocking v0.1.

### O7. Should a cleared mission pay full XP on repeat? — **Resolved 2026-10-31**

**Resolved by a daily contract board, not a decay.** Two of the guild's open missions are posted at full pay each day; every other mission pays 25% of its gold and XP after its first clear. First clears stay full; loot and mastery are untouched. The AI will not spend a night on a token repeat; a human may. The board is derived from `(seed, day, open content)`, so no save field.

The flat decay failed because it taxed the only job the spare party had. The measured schedules:

| Repeat pay | Steward score | Raids | Full clears | Drowned Mill clears/run |
|---|---|---|---|---|
| Full (before) | 23,051 | 2.70 | 14/20 | 26.4 |
| 100% → 85% → 70% | 22,271 | 2.65 | 13/20 | 28.5 |
| 100% → 60% → 30% | 17,693 | 2.20 | 7/20 | 27.6 |

The board changes the pick instead of taxing it. Measured on 20 seeds per personality:

| | Steward | Quartermaster | Gambler |
|---|---|---|---|
| Score before → after | 23,515 → 22,938 | 24,293 → 23,658 | 20,814 → 20,686 |
| Raids before → after | 2.75 → 2.60 | 2.75 → 2.65 | 2.50 → 2.45 |
| World First after | 6/20 | 7/20 | 3/20 |
| Average rank after | 2.35 | 2.10 | 2.80 |
| Drowned Mill clears/run | 26.4 → 14.10 | 26.4 → 12.70 | 26.4 → 14.45 |

Mission nights spread across all six three-hero missions (Mill 13.75, Warrens 14.27, Wolf Den 11.05, Bandit Road 10.08, Toll House 5.60, Plundered Vault 1.47). The cost is the spare party's XP: at most 2.5% of score and 0.15 raids. World First and rank improve because the rivals lose more of their smaller rosters; do not bank that as player skill.

**Rejected:** both flat schedules above; a one-XP + one-prize board (it handed the spare party an easy full-pay job every day: +6% score on 10 seeds and the Mill still at 18.9/run); a token-only board with no AI gating (the planner's priority floor kept unposted missions above farms at 0.3 and 0.2, so the Mill ran 18–20 times). Do not reopen this with a smaller token; the posting rule, not the price, does the work. Measurement and the full table are in [progression-report.md](progression-report.md) §3.4.

**Still better long-term:** a new three-hero activity with a check the missions do not use. The board rotates pay and level, not the check; four of the seven missions are mechanics. That is a content addition, not a rework.

**Shipped 2026-10-31: The Broken Bridge.** A level-18 three-hero mission with a **mitigation 36** check, 220g, 60xp and one 26–40 item. The 300g candidate was measured at 20/20 for the Quartermaster on 10 seeds and reverted; the second pass ran 20 seeds and found **gold is not the lever**: 160g, 200g and 220g all produce 44/60, with the Steward 15–16/20, the Quartermaster 19/20 and the Gambler 9–10/20. Requirement 40 leaves the Quartermaster at 19/20 and costs the Gambler a full clear. The 300g arm's 20/20 did not survive 20 seeds (18/20). The check is right — a 3-hero party at level 20/iLvl 30 sums ~32 mitigation with one warrior and ~47 with two — and 36 stays. The shipped gold is the 220g ceiling, below the Toll House's 260. The Quartermaster is one clear below the failure gate, above L86's 15–17 expectation. Full table in [progression-report.md](progression-report.md) §3.7.
