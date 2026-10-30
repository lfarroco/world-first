# MVP scope — what ships in v0.1

**Definition of done:** *a player can start a guild, lose the first boss, understand why, fix it, and beat it — and can then tell someone the story of that week.*

Everything below is measured against that sentence. If a feature doesn't help produce it, it's not in the MVP.

---

## 1. The vertical slice (build this first)

Three screens and one screen-depth report, backed by a headless sim:

1. **Roster + Hero Sheet** — the data model proven legible.
2. **War Room** — parties, roles, stance, live check projection.
3. **Day resolution → Wipe Report** — the causal loop proven *interesting*.

If those three are fun with no art, the game is real. Everything else is amplification, and every hour spent on amplification before this works is at risk.

**Kill criterion:** if a wipe report doesn't produce the thought *"ah — I should swap the rogue and buy flasks"*, stop feature work and fix the model. No amount of UI rescues a slot machine.

---

## 2. In / out

### In (v0.1)

| Area | Included |
|---|---|
| Heroes | **8 attributes** · 8 roles · 4 classes · 5 hidden attributes · level 1–60 · XP curve · gear (4 slots, iLvl) |
| Party | Up to **3 parties**, any mix of farm / mission / dungeon / raid · 3 stances |
| Combat | 10 content entries (2 farms, 2 missions, 3 dungeons, 3 raids) · 1–3 phases each · 4 check types · mastery · consistency rolls · fatigue/sharpness/morale |
| Day loop | 9-stage pipeline · digest · **attention queue (max 3 blocking)** · Advance Day |
| Progression | level gates + prerequisite clears · free recruits on dungeon first-clears · recruit level ≈ 68% of your best |
| Economy | gold in/out · weekly wages vs budget · **arrears instead of game over** |
| Recruitment | Tavern: 3 candidates, refresh on day 7 · signing modal (wage / length / squad status) · potential fog |
| Rivals | 3 NPC guilds, deterministic per seed, walking the same ladder with a compressed power model |
| Run | **84-day deadline** · 3 raids · World First · **final score, band and rank** |
| Retention | morale deltas · transfer requests · contract expiry · squad-status promises |
| Persistence | localStorage save, versioned, deterministic from seed + action log |
| Dev tooling | headless CLI: `new`, `content`, `party`, `advance`, `ai`, `sim --runs N`, `status` · **AI planner** (`src/sim/ai`) with personalities |

### Out (v0.1, explicitly)

Split runs · doctrine toggles · doctrine familiarity · two-audience grades (board vs heroes) · board objectives/firing · training sessions · youth academy · scouting network and scouts as entities · staff · press/media · facility tree (one guild-hall tier only) · poaching · loans · multi-tier seasons · 2D replay · multiplayer · cosmetics · mobile-native layout (responsive only) · localisation · save export.

Each of these is in [vision.md](vision.md) §5 with a phase.

## 3. Numbers to hit (tuning targets)

These are **acceptance tests**, not aspirations. The sim should be able to prove them.

| # | Target | Why |
|---|---|---|
| 1 | A new player loses on boss 1 no more than once | Onboarding must not punish |
| 2 | A first-time player kills boss 1 by day 6–9 | An early win, before the wall |
| 3 | Boss 3 stalls the average player for 4–7 days | The wall that teaches gearing |
| 4 | A good bot clears 2–3 of the 3 raids; a great run clears all three | The ladder must be winnable but tight |
| 5 | A do-nothing bot never passes boss 2 | Actions must matter |
| 6 | A first run clearing 3–4 bosses scores 10–15k; a full clear is ~20k; max is ~26k | The score must have headroom |
| 7 | ≤ 3 attention items block a typical day | The queue must not become a chore |
| 8 | A day resolves (sim) in < 2 ms | 1000-run batch tests must be feasible |
| 9 | The wage crunch is felt by day 14–18 | The economy must bite in the first run |
| 10 | Two runs with the same seed and the same actions produce the same score | Determinism is the test harness |

Targets 4 and 5 tell you whether the race is tuned; 6 tells you whether the score is meaningful. If a random-clicking bot wins, the game is too easy; if the perfect bot can't finish, it's unwinnable; if every run lands within 2k of every other, the choices don't differentiate.

## 4. Build order

**Phase 0 — headless core (no UI)** ✅ *done — see [phase-0-report.md](phase-0-report.md)*
`types` → `rng` → `heroes` (attributes, roles, power) → `checks` (boss resolution) → `day` (pipeline) → `economy` → `rivals` → CLI.
Shipped when: the CLI can play a full run in a terminal and print a readable wipe report. Measured (10 seeds/personality): Steward 2.90 raids, Quartermaster 2.90, Gambler 2.60; an idle guild clears nothing — see [progression-report.md](progression-report.md).

**Phase 1 — vertical slice UI**
Roster table + hero sheet drawer → War Room (drag, projection strip) → Day report modal → Wipe report modal.
Ship when: a stranger can play a week without asking what a number means.

**Phase 2 — the loop becomes a game**
Guild Hall + attention queue → Advance Day gating → Tavern + signing → Raid/RWF screen.
Ship when: the player opens the game, sees "3 things need you", and *wants* to answer them.

**Phase 3 — pressure and polish**
Wage budget and arrears → contracts/renewals → guild-hall tier → **run-end score + ranking + summary screen** → onboarding week (one concept per day) → juice (transitions, sounds, number animations).

**Phase 4 — post-MVP**
Contract negotiation with counter-offers → poaching → scouting fog expansion → youth → tier 2 raid.

---

## 5. Risks, ranked

| Risk | Why it's real | Mitigation |
|---|---|---|
| **The numbers aren't legible** | 8 attributes × 8 roles × 4 checks is still a lot of surface for a new player | The projection strip *is* the mitigation: show the result of every change immediately. Test with someone who has never played FM. |
| **The race feels fake** | Rivals are code | Simulate them with the same functions; show their activity, not just their score |
| **Attention items become noise** | FM's inbox failure | Hard cap 3 blocking items; delete any item with a dominant answer |
| **Mid-game grind** | Days 8–21 are repetitive by design | Split runs + mastery + the wage crisis are the three spikes that carry the middle |
| **Scope creep into "real FM"** | Temptation is constant | The In/Out table above is the contract; adding requires removing |
| **Determinism breaks** | One `Math.random()` ruins replay and batch tests | Lint rule: no `Math.random` outside the rng module |

---

## 6. What we will not know until we build it

Three questions that only playtesting answers, listed so we don't pretend otherwise:

1. **Are 8 attributes enough to make squad building feel deep, or does it flatten into "highest power wins"?** If it flattens, expand to 12, never 36.
2. **Is an 84-day run the right length?** Too long and the middle sags; too short and the ladder cannot be walked. The AI sweep can answer this in minutes.
3. **Does the pull log read like a story?** This is a writing problem as much as a systems problem. Budget real time for it — it's the thing players will quote.
