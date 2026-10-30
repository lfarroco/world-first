# Vision — what this game is, and what it becomes

**Working title:** *Guild Manager* (name under review — see [design-review.md](design-review.md) §7)
**One line:** *Football Manager for a raiding guild — you don't play the fights, you build the guild that survives them.*

---

## 1. The fantasy

You are the **Guild Master** of a raiding guild in a world where dungeons and raids are the economy. You never swing a sword. You decide:

- who raids and who sits,
- who gets the drop and who gets promised next time,
- whether tonight is a progress night or a farm night,
- whether you pay the mage what she's worth or let a rival guild double her wage,
- and whether the guild can survive one more week of wiping on the same boss.

The player's real job is **managing people and scarcity under a clock**. The combat is the audit of that management.

---

## 2. Three pillars

**Pillar 1 — Preparation is the game.**
The boss fight is not where you win. You win in the six days before it: gear, consumables, morale, roster depth, and knowing which check you're failing. The fight is where the game *tells you* whether you were right.

**Pillar 2 — The race is real.**
Rival guilds run the same simulation you do — same growth curves, same wipes, different personalities and strategies. When they pull ahead, you can explain exactly why, and you can respond. A race you can't explain is a timer; a race you can explain is a rivalry.

**Pillar 3 — Heroes are assets with egos.**
They want gear, status, and money. They get tired of wiping. They notice when the recruit got the legendary. They leave. This is the emotional engine, and it is also the difficulty curve: the better your guild gets, the harder it is to keep happy.

---

## 3. The run — 84 days, then a verdict

One **run** = one tier of the ladder = **84 in-game days**, ending in a deadline. This is the unit of play, and it is deliberately bounded: you can finish a run in a sitting, get a score and a rank, and start another.

```
Day 1          Day 21         Day 42         Day 63         Day 84
│              │              │              │              │
three heroes   first dungeon  first raid     raid 2         raid 3 → SCORE
│              │              │              │              │
└──── wages every 7 days ─────┴──────────────┴──────────────┘
```

- **Days 1–21:** level from 1, run missions, reach the first dungeon.
- **Days 22–56:** the gear climb. This is where management skill shows — rotation, morale, loot funnelling, deciding when to stop farming.
- **Days 57–83:** the raid push. Fatigue is high, wages are due, rivals are closing.
- **Day 84:** the run ends. Score, band, rank, and the three moments that mattered.

Then you play again — same seed to fix the map, new seed to fix the story.

**Runs, not seasons, are the unit of replay.** A season with three tiers is a post-MVP structure: it only becomes interesting once a single tier is worth repeating. What replaces "career mode" in v0.1 is the **scoreboard of your own runs**, which is one table and stronger than a half-built career mode.

## 4. What makes it different from Football Manager

| | Football Manager | Guild Manager |
|---|---|---|
| Season length | 9 months, 50+ matches | 4 weeks, ~1 climax |
| Objective | league position (a gradient) | one boss (a binary wall) |
| Failure | lose matches, get sacked | wipe 200 times, lose the race, lose your stars |
| Roster | 25 players, 11 play | 22–24 heroes, 10 raid |
| Drama source | playing time, contracts, transfers | gear allocation, bench time, burnout |
| Match | 90 minutes, you watch it | a boss attempt, you read it |

FM's league is a slope you grind up. Ours is a **wall** with a clock. That's a different emotional shape: less steady tension, more long frustration punctuated by explosive relief. It suits a browser game, where sessions are short and the player checks in daily.

---

## 5. Long-term feature vision (the backlog, ordered by how much it adds)

These are *not* MVP. They exist so we know what the MVP must not architecturally block.

**Tier 1 — the soul of the game (post-MVP, next)**
1. **Contract negotiation** — wage, length, release clause, squad-status promise, agent demands. The FM modal, reduced to three knobs and one counter-offer.
2. **Player-initiated drama** — a hero asks for a meeting: "I'm the best mage in the guild and I'm on the bench behind a recruit." Options with real costs.
3. **Poaching** — rival guilds make offers for your heroes, and you can make offers for theirs (buyout clauses).
4. **Facilities with real effects** — infirmary (recovery), forge (gear), scrying chamber (scouting accuracy), tavern (recruitment quality). One tree, four branches, three levels each.

**Tier 2 — depth**
5. **Scouting fog** — you never see exact attributes for un-recruited heroes, only a range that tightens with scouting investment. This is the single most FM-feeling system we could add, and it's cheap.
6. **Youth / apprentice pipeline** — recruit level 1–10 apprentices, invest 3–4 weeks, get a homegrown star or a bust.
7. **Multiple raid tiers and branching bosses** — a raid where you choose which boss to attempt first, with different loot per branch (real RWF structure).
8. **Consumable economy** — alchemy producing flasks/potions as a real supply chain with a market price.

**Tier 3 — scale**
9. **Shared realms & async multiplayer** — real players in the same RWF race, guild vs guild leaderboards, seasonal ladders.
10. **2D combat replay** — a top-down arena view of the pull, for the drama. Purely presentational; the sim decides first.
11. **Prestige / legacy** — retire a guild, start a new one with bonuses, unlock lore and cosmetics.
12. **Dynasty mode** — succession: you are a guild master in a lineage; your best hero becomes a trainer in the next generation.

---

## 6. Monetisation stance (decide now, build later)

The transcript's position — cosmetics only, no pay-to-win — is right and should be treated as a hard constraint, because it binds the design: **the game must be fun without any timer skips.** If the design ever depends on selling time, the design is wrong.

---

## 7. What "good" looks like

A player finishes week 2 and can tell a friend a story with a beginning, a middle and a twist, in under a minute:

> "We were three days behind Echoes on the Citadel, my main tank was out with a curse, and I'd promised the new rogue A-team status. I benched the mage everyone loves, geared the rogue, and we killed boss 4 on the last pull of the night at 1% — then Echoes killed it the next morning anyway."

If the systems can produce that sentence, we've built the game. Everything in [guild-manager-model.md](guild-manager-model.md) exists to make that sentence possible.
