# Guild Manager

*A management game where you run a raiding guild: **Football Manager** for a WoW-style Race to World First.*

**Status:** the simulation is playable end to end — a WoW-style ladder (3 heroes → 3 raids over 84 days), an event layer the AI prices and answers, a promises ledger, four upgradable facilities, level-priced wages, a personality-driven AI that plays it, three rival guilds on the same planner with a real leaderboard rank, a daily contract board, a planner that prices the purse and the next wall's gear gap, and a CLI. No UI yet.

```bash
npm install
npm run cli -- new --seed 1234
npm run cli -- today         # the day screen
npm run cli -- content       # what is open: rewards, projection, status
npm run cli -- inspect warrens  # phases, mobs, drops and chances
npm run cli -- ai --days 30  # watch the AI play it
npm run cli -- sim --runs 10 # balance sweep, three rival guilds per run
npm run check                # typecheck + tests + docs check
```

---

> **Working agreement:** [AGENTS.md](AGENTS.md) — documentation rules, writing style, architecture invariants and the definition of done. Read it before changing anything.

## Read these in this order

| # | Document | What it answers |
|---|---|---|
| 1 | [**design-review.md**](docs/design-review.md) | What's strong in the current plans, the one structural flaw, and the eight things to fix |
| 2 | [**vision.md**](docs/vision.md) | What the game *is*: pillars, season shape, the long-term feature ladder |
| 3 | [**fm-blueprint.md**](docs/fm-blueprint.md) | **The Football Manager teardown you asked for** — modules, tabs, screens, modals, lists, attributes, and the UI patterns worth reusing |
| 4 | [**guild-manager-model.md**](docs/guild-manager-model.md) | The actual mechanics with numbers: 8 attributes, 8 roles, boss checks, fatigue/sharpness, economy, rivals, attention items |
| 5 | [**screens.md**](docs/screens.md) | Screen-by-screen spec with layout, columns, modals, edge states |
| 6 | [**mvp-scope.md**](docs/mvp-scope.md) | What ships in v0.1, tuning targets, build order, risks |
| 7 | [**tech-notes.md**](docs/tech-notes.md) | The deterministic sim rule, stack, code shape, CLI, testing |
| 8 | [**open-questions.md**](docs/open-questions.md) | **Decisions** (locked) + the open questions |
| 9 | [**adr/0001-functional-ts.md**](docs/adr/0001-functional-ts.md) | Language/FP decision: TS strict, functional core, no fp-ts; why not PureScript; Vite over Next |
| 10 | [**adr/0002-ui-framework.md**](docs/adr/0002-ui-framework.md) | UI framework: React (proposed), Angular contingency plan, and why the decision can wait |
| 11 | [**phase-0-report.md**](docs/phase-0-report.md) | The first playable: the day pipeline and the wipe report |
| 12 | [**progression-report.md**](docs/progression-report.md) | **The ladder and the AI** — levels, dungeons, three raids, personalities, and the measured balance |
| 13 | [**learnings.md**](docs/learnings.md) | **The log** — 75 things we got wrong, what proved it, and what changed |
| 14 | [**roadmap.md**](docs/roadmap.md) | What could kill the project, and the order I'd build in |

Raw sourced research behind the blueprint:

- [research/fm-01-navigation-and-screens.md](docs/research/fm-01-navigation-and-screens.md) — FM24 modules, sub-tabs, Continue loop, Inbox, Squad, player profile
- [research/fm-02-player-model.md](docs/research/fm-02-player-model.md) — 60 attributes, hidden attributes, CA/PA, positions, roles, traits, condition
- [research/fm-03-club-operations.md](docs/research/fm-03-club-operations.md) — tactics, training, scouting, transfers/contracts, finances, board, dynamics
- [research/fm-04-matchday-and-scope-tiers.md](docs/research/fm-04-matchday-and-scope-tiers.md) — matchday pause points, match analysis, competitions, FM Touch/Mobile scope evidence

---

## The one-paragraph version

You never fight. You decide who raids, who sits, who gets the drop, whether tonight is progress or farm, and whether you can afford the mage. The boss fight is the **audit** of those decisions: it tells you, by name and by number, which of your choices was wrong. Meanwhile three rival guilds walk the same ladder and an 84-day clock runs out.

That's the whole design. Everything in these documents exists to make that loop produce one good story per week.

---

## The six changes that matter most

If you read nothing else, these are the differences between the current draft GDD and this refined design:

1. **The day ends in an attention queue, not a report.** 2–5 items that block Advance Day until resolved. This is what turns an idle timer into a management game.
2. **Attributes are the currency; iLvl is a derived headline.** 8 attributes × 8 roles × role-fit multiplier. Two heroes at the same iLvl are no longer the same hero.
3. **Bosses are 3 named checks, and wipes name the failed check.** Progress is a monotone "best pull %", and every wipe report ends with a *next lever* showing exact numbers.
4. **Fatigue and sharpness are two clocks.** Resting fixes fatigue and destroys sharpness, so the optimal play is a rotation you have to think about.
5. **Rivals run the same simulation as you.** Deterministic, explainable, and beatable — a pace you can learn, not a dice roll you can resent.
6. **The run has a deadline and a verdict.** 84 days, three raids, then a score, an S–D band and a rank — EU4-style. Debt hurts, but never ends the run; and the ending is what makes the next run happen.

---

## Working title

`Guild Manager` collides with an existing Steam title of the same premise, and `Realm Manager` is generic — see [open-questions.md Q7](docs/open-questions.md). Nothing in the design depends on the name; it should be settled before the first public surface exists.

## Where it stands

The sim is deterministic, tested (124 tests) and playable from a terminal. A run is 84 days: three level-1 heroes, a farm, missions, four dungeons, three raids. Seventeen areas, each with a bestiary and a named drop table the player can inspect before committing a party. Twenty traits (counters, bonds, craft, flaws, specialists) give heroes a second layer, and two boss threats can be answered or eaten. An AI plays it end to end — including the ten event cards, which it prices instead of taking the first option. Three rival guilds are full simulations of their own: rosters, gold, facilities and promises, played by the same planner. They score with the same formula, so the run ends with a real rank among four. Missions sit on a daily contract board: two are posted at full pay, the rest pay 25% of their gold and XP after the first clear, and the AI will not spend a night on a token repeat. The planner prices a night by need — the purse, the next wall's level gate and the raid party's gear gap — not only by XP. A standing raid ten takes the wall, and a clear's drops wait for the player to decide who gets the axe; the AI's own pick is the conservative floor. A renewal is a negotiation: pay market, counter 12% under (a refusal raises his number), or let him walk. A broken promise raises a transfer request. Three personalities produce three different games: the cautious Quartermaster scores highest and shares the most World Firsts, while the Gambler spends into arrears and pays for it.

See [progression-report.md](docs/progression-report.md) for the numbers and the lessons.

**Next:** the vertical-slice UI — the React-or-Angular decision (ADR 0002) is the gate. The non-UI backlog is done: the rivals, the contract board, the need-aware planner, loot assignment, the role review, The Broken Bridge mitigation mission and the contract/promise negotiation. The conservative AI clears 44/60 full runs, the player's need pick 52/60, and the Tyrant wall is softer than target 3 — the next balance item. The role reviewer now only re-specs a party below 1.0 and the role chips show the four check deltas; the 1.30 affinity table was measured and rejected. A full world run is about ten times the guild-only run (1.1 s against 0.10 s on a quiet host), which is the price of simulating the race.
