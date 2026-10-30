# System Model — the mechanics we actually implement

Concrete numbers are **starting points for tuning**, not design commitments. Every formula here is meant to live in a pure function so it can be tuned by simulation rather than by opinion.

---

## 1. The day, as a pipeline

One in-game day = one player action cycle. The pipeline must be a pure function:

```
resolveDay(state, plan, rng) -> { state', events[], attention[] }
```

**Order matters, and it is the same order the UI presents:**

| # | Stage | What happens |
|---|---|---|
| 1 | **Preparation** | Consumables applied (flasks), gear changes already made by player |
| 2 | **Raid attempts** | Raid party resolves its pulls against the selected boss |
| 3 | **Dungeon runs** | Dungeon party clears (or fails) the daily dungeon |
| 4 | **Farming** | Farm party generates gold and materials |
| 5 | **Rest & recovery** | Resting heroes recover fatigue; infirmary heals injuries |
| 6 | **World tick** | Rival guilds resolve their own day; leaderboard updates |
| 7 | **Upkeep** | Contracts advance; on day 7, wages are paid and markets refresh |
| 8 | **Digest** | Events rolled into the day report, ranked by importance |
| 9 | **Attention items** | 2–5 actionable items derived from the day (see §7) |

Raid resolves *before* other activity so that a hard raid night isn't double-taxed by the same day's farming. Farming fatigue still lands tomorrow — that's the trade-off.

---

## 2. The hero

### 2.1 Eight attributes, 1–20

Deliberately FM's scale, cut to the bone: **eight** attributes in two groups of four. That is enough to make four classes and eight roles feel different, and few enough that a card is readable without tooltips. (FM's own compression advice suggests ~20; our audience is not FM veterans and our game has no league table of statistical nuance to justify it.)

**Body**

| Attribute | What it drives |
|---|---|
| **Might** | Physical damage; mitigation as a tank; how much you carry |
| **Agility** | Crit chance, evasion, initiative on mechanics |
| **Vitality** | Max health; injury resistance |
| **Endurance** | Fatigue resistance, attrition fights, long sustains |

**Spirit**

| Attribute | What it drives |
|---|---|
| **Focus** | The class power stat — weapon force for martial classes, spellpower for casters, healing light for clerics |
| **Discipline** | Resists boss debuffs (fear, charm, silence); executes the plan |
| **Awareness** | Avoids avoidable damage, spots mechanics, interrupts |
| **Composure** | Performance under pressure; reduces variance |

One "class power" stat (**Focus**) instead of separate Weaponcraft/Spellcraft/Guile is the key simplification: class identity comes from *weights and abilities*, not from having a private stat. A warrior's Focus is technique, a mage's is spellpower, a cleric's is healing. Same number, different fiction.

Eight attributes also means the card is **two columns of four** — no scrolling, no tabs, and the colour bands (≤5 red · 6–9 orange · 10–13 neutral · 14–16 light green · 17–20 bright green) do the perceptual work.

### 2.2 Where attributes come from

```
attribute = base (1–20, hero identity)
          + level growth  (+0.08/level, capped so 1→80 adds ~+6 total)
          (+ training, post-MVP: a targeted +0–3)
```

Gear does **not** add attributes. Gear multiplies output (§2.3). That separation is deliberate: it keeps heroes recognisable across tiers (FM's players don't get better boots, they get better *and* you build around them) and it stops gear from flattening all heroes into the same number.

### 2.3 Derived numbers (what the UI shows)

```
gearFactor  = 0.55 + (itemLevel / 260)          // 0.55 at iLvl 0 → 1.35 at iLvl 208
roleScore   = Σ (weight_i × attribute_i / 20)   // 0..1, weights per role sum to 1.0
formMod     = condMod × sharpMod × moraleMod    // 0.62..1.06 each, see §2.5
heroPower   = roleScore × gearFactor × formMod × 100
```

`itemLevel` = average of equipped slots (weapon, chest, helm, trinket), rounded.

**Squad Rating** (the headline number on the War Room screen):
```
squadRating = Σ heroPower                    // e.g. 10 heroes ≈ 450–550 early, 850–950 geared
```

Note what happened to `iLvl`: it is still visible and still matters, but it is now *one multiplier among three*. Two heroes at iLvl 200 can differ by 30% in output based on role fit and condition. **That is the entire depth fix, and it costs one extra table.**

### 2.4 Roles (8 in MVP, 2 per class)

Roles are FM's role system: the same hero is a different tool depending on how you use them. Each role has attribute weights and a one-line behaviour.

| Class | Role | Weights (sum 1.0) | Behaviour |
|---|---|---|---|
| Warrior | **Bulwark** | MGT .35, VIT .30, DIS .20, AWR .15 | Holds the line; absorbs the big hit |
| Warrior | **Vanguard** | MGT .45, AGI .20, VIT .20, DIS .15 | Threat + damage; takes pressure off the DPS |
| Cleric | **Lightbringer** | FOC .45, DIS .20, AWR .20, CMP .15 | Maximum throughput healing |
| Cleric | **Oracle** | FOC .35, AWR .30, DIS .20, CMP .15 | Buffs and dispels; raises the party ceiling |
| Mage | **Evoker** | FOC .55, CMP .20, AWR .15, END .10 | Burst windows; excels on enrage checks |
| Mage | **Arcanist** | FOC .45, END .25, AWR .20, CMP .10 | Sustained damage; better on long fights |
| Rogue | **Assassin** | AGI .45, MGT .25, CMP .20, FOC .10 | Single-target burst; kill the add |
| Rogue | **Trickster** | AGI .35, AWR .30, CMP .20, FOC .15 | Debuffs, interrupts, mechanics |

**Role fit is not free** — and it works exactly like FM's position familiarity, which is a 7-tier ladder from Natural (100%) down to Ineffectual (~60%), not a single penalty. We compress it to 4 tiers:

| Fit | Multiplier | Shown as | When |
|---|---|---|---|
| **Natural** | 1.00 | ● green | Role matches the hero's class and top-2 weighted attributes |
| **Trained** | 0.88 | ● amber | Same class, wrong specialisation (a Bulwark tanking as Vanguard) |
| **Makeshift** | 0.72 | ◐ orange | Adjacent class (a Rogue healing? almost never) |
| **Wrong** | 0.55 | ○ red | Anything else — the UI should refuse to auto-assign it |

This gives the "he can do a job there" decision, which the research identifies as one of the most satisfying in FM — and, crucially, it makes **Power** and **actual output** diverge:

```
Displayed Power    = roleScore(bestRole)  × gearFactor × formMod × 100
Check contribution = roleScore(assigned) × fitMult × gearFactor × formMod × 100
```

So a 127-power hero assigned as a Makeshift contributes ~91. The hero sheet shows both: **"Power 127 · in this role 91 ◐"**. That single line teaches the entire system without a tutorial, and it is the reason a player will open the hero sheet at all.

Recruiting a hero who *fits the role you need* becomes a real scouting question — the FM transfer-market frisson, translated.

### 2.5 Condition and sharpness — the two clocks

FM runs two separate clocks: **Condition** (short-term energy, recovers fast) and **Match Sharpness** (medium-term edge, decays when you rest). Community testing suggests sharpness is the *stronger* effect, and it is the best-designed tension in the game: you cannot fix a tired hero by resting him, because resting makes him rusty.

We copy the two-clock structure exactly.

```
condMod     = 1.00                                fatigue 0–30
            = 1.00 − ((fatigue−30)/70) × 0.38     fatigue 30–100 → 0.62 at 100

sharpMod    = 0.86 + (sharpness/100) × 0.18       → 0.86 at 0 sharpness, 1.04 at 100

moraleMod   = 0.94 + (morale/100) × 0.12          → 0.94 at 0 morale, 1.06 at 100
```

**Fatigue** moves with activity (below). **Sharpness** moves with *recency of raiding*:

| Activity | Sharpness |
|---|---|
| Raided | **+7** |
| Dungeon | **+3** |
| Farmed | +1 |
| Rested / idle | **−5** |

Start sharpness at 60 (the guild has been idle). A hero benched for a week drops to ~25 and comes back at −5% output; a hero who raids every night sits at 90+ but accumulates fatigue. **The optimal play is a rotation block of 2–3 raid nights followed by a dungeon-led recovery day** — not "bench everyone", which is what the current plan's fatigue-only model rewards.

That is a *real* decision with a cost on both sides, generated by two integers and two update rules. This is the highest value-per-line mechanic in the whole design.

Fatigue per day:

| Activity | Fatigue | Notes |
|---|---|---|
| Raid attempts | **+26** fixed | regardless of number of pulls — a raid night is a raid night |
| Dungeon run | **+15** | |
| Farming | **+12** | |
| Resting | **−34** | −44 with infirmary level 2+ |
| Idle (unassigned) | **−8** | benched but not resting |

`Endurance` reduces positive fatigue: `fatigue += base × (1.15 − endurance/40)`.

A hero who raids every day goes 0 → 26 → 52 → 78 → 104 (capped 100) — i.e. **three consecutive raid nights, then a wall.** That is the intended rhythm: raid blocks of 3, rest, repeat. It also makes split runs meaningful, because your B-team can farm while the A-team rests.

### 2.6 Hidden attributes — five numbers the player never sees

FM has thirteen hidden attributes. Five of them do almost all of the emotional work, and they cost one integer each:

| Hidden | Range | What it drives | How the player learns it |
|---|---|---|---|
| **Consistency** | 1–20 | Odds of performing at full power on a given pull | Behaviour ("he's brilliant every third night") |
| **Professionalism** | 1–20 | Attribute growth rate; how badly being benched stings | Rumour card, training results |
| **Ambition** | 1–20 | Wage demands, status demands, poaching vulnerability | Contract negotiations |
| **Loyalty** | 1–20 | Threshold before requesting a transfer / accepting a poach | Long-run behaviour |
| **Pressure** | 1–20 | Performance penalty after consecutive wipes | Late-night collapse patterns |

**Consistency is the best mechanic in FM and we should copy it almost exactly.** FM's published behaviour: Consistency 20 performs at full ability in ~20 of 25 matches; Consistency 1 in ~1 of 25; an off-game costs roughly 10 CA, hitting technical and mental attributes but not physical.

Our compressed version, applied **per pull**:

```
if rng() < consistency / 20  →  full performance
else                          →  performance × 0.86     (+ UI: "off night" tag)
```

That single rule produces the archetype every management game needs — *the brilliant hero you can't rely on* — and it gives the pull log a human texture that pure global RNG cannot: the wipe report can say **"Ignis had an off night (−14%)"**, and the player learns to build around it instead of feeling cheated.

**Rule: none of these five are ever shown as numbers.** They surface as prose on the rumour card ("rumoured to sulk when benched"), as behaviour, and as tags on the pull log. The moment they become numbers they stop being character and become optimisation.

---

### 2.7 Morale, and why heroes leave

Morale 1–100, moving daily by small deltas:

| Cause | Δ |
|---|---|
| Got a gear upgrade | **+8** |
| Promoted to A-team | **+10** |
| Benched 1 day | **−2** |
| Benched 3+ consecutive days | **−7/day** |
| Boss kill | **+6** (whole raid) |
| Wipe night (5+ wipes, no kill) | **−3** (whole raid) |
| Wage under market value | **−2/day** |
| Won World First | **+40** |

**Departure rules** (borrowed from the transcript, and from FM's transfer requests):
- Morale < 25 for 5 consecutive days → **transfer request** (attention item; the hero demands a move).
- Morale < 15 and a release clause exists → rival may trigger the buyout.
- Contract expiry in ≤ 7 days with unresolved negotiation → hero walks for free.

This is the retention loop, and it's the cheapest source of narrative in the game.

---

## 3. Bosses and the pull

### 3.1 A boss is a sequence of checks, not a dice roll

Each boss has **3 phases**. Each phase has **one primary check** (plus a secondary at higher tiers). A check is a named requirement the party must meet:

| Check | Party value derived from | Reads as |
|---|---|---|
| **DPS** | Σ damage-dealer power (WPN/SPL/GUI roles) | "Do we kill it before enrage?" |
| **Mitigation** | Tank power + healer throughput | "Does the tank survive the cleave?" |
| **Mechanics** | Awareness + Discipline across the party | "Does anyone eat the fire?" |
| **Sustain** | Healer throughput × endurance | "Can we last the long phase?" |

```
heroContribution = roleScore(assigned) × fitMult × gearFactor × 100
                 × formMod            // condition × sharpness × morale (§2.5)
                 × consistencyRoll    // 1.00 or 0.86, per hero per pull (§2.6)

checkValue = Σ relevant contributions × stanceMod × masteryMod × rng(0.97, 1.03)
ratio      = checkValue / requirement
```

**Variance lives on individual heroes, not on the check.** A global ±6% roll makes a wipe feel arbitrary; per-hero consistency rolls make it read as *"Thorne had an off night"* — a story the player can act on. The global roll stays tiny (±3%) only so identical inputs don't produce identical outputs.

| ratio | Result | Consequence |
|---|---|---|
| ≥ 1.15 | **Clean** | Phase cleared, progress bonus +5%, no injury risk |
| 1.00–1.15 | **Pass** | Phase cleared |
| 0.85–1.00 | **Scrape** | Phase cleared, but 1–3 heroes take injuries, morale −2 |
| < 0.85 | **Fail** | Wipe. Best pull % = start of this phase. |

Because phases resolve in order, "best pull %" is a **monotone, meaningful progress metric** — exactly the number RWF viewers watch. And a wipe is never mysterious: it always names the phase, the check, and both numbers.

### 3.2 Mastery — the learning curve, bounded

```
masteryMod = 1 + min(0.25, 0.015 × pullsOnThisBoss × (0.6 + fieldcraft/25))
```

~1.5% per pull, capped at +25%, faster for high-**Awareness** parties (they read the mechanics). This makes the first night on a boss genuinely worse than the third, rewards persistence, and creates the "we're close, one more night" feeling.

### 3.3 Worked wipe report (the format the UI must produce)

```
PULL 14 — The Obsidian Citadel, Boss 3: Archdemon Vael
Phase 3 (Enrage) — WIPE at 41% boss health

  DPS check failed      party 288   required 330   (ratio 0.87)
  ├ Vael's enrage at 5:00 was not beaten
  ├ Top contributors: Ignis (Evoker) 74 · Varis (Assassin) 66
  └ Weak link: Thorne (Assassin) 31 — assigned off-role (amber), morale 38

  Next lever: +42 DPS needed
  ├ Upgrade Varis' weapon (iLvl 186 → 200+): +14
  ├ Swap Thorne → Lyra (Mage, Evoker, iLvl 191): +33
  ├ Flask (60g, +4% party): +11
  └ Bench Thorne to rest: morale recovery, +0 tonight
```

That last block — **"next lever", with numbers** — is the single most important text in the game. It converts a loss into a plan. Nothing else we build matters if this block isn't good.

### 3.4 The raid night — five stops, not one button

The research on FM's matchday is unambiguous: the ritual is **6–10 forced stops per match**, each one a small decision ([fm-04 §8.1](research/fm-04-matchday-and-scope-tiers.md)). A single "Resolve Raid" button throws away the best part of the reference design. So a raid night is a short sequence:

```
① ROSTER LOCK ──► ② PLAN COMMIT ──► ③ PULLS ──► ④ INTERVENTION ──► ⑤ DEBRIEF
   "is everyone     boss + stance       resolve      one mid-night        wipe report
    fit?"            + consumables      3–6 pulls     choice               + next lever
```

1. **Roster lock** — the War Room party is confirmed; the UI shows who is unfit and why ("Ignis is at 71% fatigue; he will raid at 92% output").
2. **Plan commit** — boss, stance, flasks. Cost is deducted here, so the decision has weight.
3. **Pulls** — resolve 3–6 pulls (number = fatigue headroom). Each pull is logged with its best %.
4. **Intervention (the "half-time")** — *only if the first pulls failed*, one choice, offered once:
   - **Push through** — 3 more pulls, +14 fatigue to the party, +injury risk, morale −2 if the night ends without a kill
   - **Call the night** — bank the mastery and the progress, save the fatigue
   - **Swap one hero** — bring in a bench hero at reduced sharpness (this is the substitution analogy, and it's the most FM-feeling moment in the game)
   This single choice is where a manager's nerve shows. It must be a real decision: pushing is right when the boss is at 12% and wrong at 70%.
5. **Debrief** — the wipe report (§3.3) or kill report, with the next lever.

**Run modes** (a direct steal from FM's full/highlights/instant-result tiers, with the FM warning attached): the player can set a default — **Full** (stops 1–5), **Summary** (skips the intervention), **Instant** (result + report only). Only Full and Summary are eligible for World First. FM's own designers warn that instant-result players end up with *"no real idea who has been performing for you"* — so Instant keeps the debrief, which is what preserves understanding.

### 3.5 MVP raid tier: The Obsidian Citadel

| # | Boss | Recommended iLvl | Checks (P1 / P2 / P3) | Signature mechanic |
|---|---|---|---|---|
| 1 | **Gatewarden Oros** | 120 | Mitigation / DPS / Mitigation | Teaches the tank-healer relationship |
| 2 | **The Twin Covens** | 145 | DPS / Mechanics / Sustain | Split damage; punishes one-trick comps |
| 3 | **Archdemon Vael** | 170 | Mechanics / Sustain / DPS (enrage) | The damage wall — where most players stall |
| 4 | **Korrath, the Unbroken** | 200 | Mitigation / Mechanics / Mitigation | Attrition; rewards Endurance and depth |
| 5 | **The Obsidian Tyrant** | 235 | DPS / Sustain / DPS+Mech | The World First boss; needs everything |

The intentional shape: boss 3 is a **hard gear wall** that forces the player to choose between farming and pushing, which is exactly the decision the whole game is about.

---

## 4. Parties and the War Room

Three assignment slots per day (this is the screen's core):

| Slot | Size | Activities available |
|---|---|---|
| **Raid** | 10 (min 8, undersized = −4% per missing) | Boss 1–5, one target |
| **Dungeon** | 5 | Daily dungeon (gear) |
| **Farm** | 1–10 | Farm zone (gold) |
| Unassigned | — | Rest (recovery) or idle |

Each hero can be in exactly one slot. That single constraint is the daily puzzle.

**Stance** — one choice per party, three options. Keep it to three for MVP; more knobs belong after the loop is proven.

| Stance | Effect |
|---|---|
| **Cautious** | −10% to all checks, **−60% injury risk**, −4 fatigue |
| **Steady** | no modifier |
| **Push** | +12% to all checks, **+25% injury risk**, +8 fatigue |

That's the whole tactical layer for v0.1, and it is enough: it creates the "do we risk the tank's health to beat the enrage timer?" decision every raid night, and it interacts with the two clocks (pushing costs tomorrow's condition).

**Post-MVP, deliberately deferred** (documented so we don't forget the good ideas):

- **Split runs** — farm-party heroes clearing lower content and funnelling drops to a nominated A-team hero. The best idea in the original transcript; it needs gear-funnel UI to be legible, so it waits.
- **Doctrine toggles** (Target casters / Hold cooldowns / Spread) — a second tactical axis. Adds 6 combinations and a familiarity clock; not worth the UI in v0.1.
- **Doctrine familiarity** — the "cost of changing your mind". Excellent, but it only matters once there is more than one thing to change.

---

## 5. Economy

### 5.1 Flows

**Income**

| Source | Amount | Frequency |
|---|---|---|
| Farm | 45g × heroes | daily |
| Dungeon clear | 220g + 1–2 items | daily |
| Dungeon fail (partial) | 90g + 1 item | daily |
| Boss first kill | 550g × boss index | once per boss |
| World First | 4000g + relic | season |
| Great Vault (day 7) | 300–900g by progress | weekly |

**Sinks**

| Sink | Cost |
|---|---|
| Wages | rookie 20g · standard 90g · veteran 300g — **weekly, day 7** |
| Recruitment | 100g (rookie) / 450g (standard) / 1500g (veteran) |
| Flasks | 60g each — +4% to all party checks for one raid night (max 2) |
| Guild hall tier | 800g per tier — raises roster cap and wage budget |
| Infirmary healing | 25g per health point |

### 5.2 The wage budget is the real constraint

FM's financial tension is a **budget**, not a balance. So:

```
wageBudget  = 700 + renown×25         (renown 4 at start → 800g/week)
wageBill    = Σ hero wages
```

- `wageBill > wageBudget` → warning on day 7, morale −3 guild-wide, a hard attention item. **Not fatal** — the run continues.
- `wageBill > 1.3 × wageBudget` → recruitment frozen until you fix it.

**Debt is a penalty, not a game over.** This follows the EU4/HOI4 model you described: if gold goes negative you enter **arrears** —

- cannot recruit, cannot buy from the Tavern
- morale −2/day guild-wide ("the guild isn't paying")
- every further day in arrears adds a −250 score penalty at the run's end

You are never stopped from playing, and you can climb out by farming. That's exactly the EU4 bankruptcy shape: survivable, damaging, and it makes a bad ranking rather than a dead run.

**No board objectives, no firing.** The judgement happens once, at the deadline, as a score (§8). This removes an entire subsystem (confidence, objectives, reviews) and replaces it with one number the player can see accumulating from day one — which is both simpler to build and *more* legible than a confidence meter.

### 5.3 Renown

Renown (the second currency) is **prestige, not spending power**: boss kills, world-first placements, and hero level milestones. It raises the wage budget, opens better tavern candidates, and gates facilities. It cannot be bought. This keeps the economy honest and gives the metagame a non-monetary progression axis.

---

## 6. Rival guilds — simulated, not scripted

**This is non-negotiable if the race is to feel real.** The three rivals run the *same* `heroPower`, `check`, `mastery`, and `fatigue` functions. What differs is strategy and roster composition.

| Guild | Personality | Behaviour |
|---|---|---|
| **Echoes** | the meta chasers | Raids every day, buys veterans early, burns out late (fatigue penalties in week 4) |
| **Methodical** | the grinder | Farms 2 days per raid day; slow week 1, strongest week 3–4 |
| **Ravensguard** | the opportunists | Balanced; poaches heroes (post-MVP), exploits weaker players |

Their daily loop is 20 lines of code: choose activity by policy → resolve with the same check functions → update progression. They need **no UI at all**, only:
- progress state (boss index, best pull %, kills),
- a visible "what they're doing" line on the RWF screen ("Echoes: 8 pulls on Boss 4 — best 62%"),
- and a *reason* the player can infer (their gear/growth curve is visible as a rating trend).

Rival difficulty is a **tuning dial** (`rivalPace` multiplier), so the game can ship with a "cosy/casual" and a "brutal" setting from one number.

**Determinism beats surprise.** The rivals are seeded per season, so the same save replays identically — and, crucially, so that a rival's progress is a *pace* the player can learn rather than a dice roll they can resent. Exposing their *activity* (not their roster) is what makes the pace legible.

**Publish the tie-breakers.** If two guilds kill the final boss on the same day, the leaderboard must resolve it by a documented order the player can plan around:

```
1. earliest final-boss kill timestamp
2. fewest total attempts used
3. most bosses killed
4. head-to-head (direct comparison of best pull % on the final boss)
5. lower seed
```

Show this in a `Rules` popover on the Raid screen. FM has a Rules page for exactly this reason, and ambiguous tie-breaks are the fastest way to lose a competitive audience.

---

## 7. Attention items — the thing that turns a report into a game

Derived at the end of each day and ranked by urgency. **At most 3 blocking items** exist at once, and the Advance Day button is disabled until each is resolved — everything else is a non-blocking FYI line. Each blocking item is a small modal.

| Trigger | Modal | Options | Consequence |
|---|---|---|---|
| Hero fatigue ≥ 70 and in tomorrow's party | "Is Gareth fit to raid?" | Bench · Rest · Push through | Push = −12% cond, +injury risk |
| Hero benched 3+ days | "Varis wants words" | Promise A-team · Rotate in · Ignore | Broken promise = −25 morale |
| Gear drop fits ≥2 heroes | "Who gets the axe?" | Assign to hero X | Others −3 morale each |
| Rival kills a boss you haven't | "Echoes has pulled ahead" | Push now · Farm first | Pure information, sets intent |
| Wage bill > budget | "The coffers are thin" | Cut a hero · Farm harder · Ride it out | Arrears risk |
| Contract ≤ 7 days | "Thorne's contract" | Renew (wage up) · Let walk · Sell | Losing them = −power |
| Hero morale < 30 | "Morale is cracking" | Talk · Give loot · Ignore | |

Design rule for every attention item: **it must have no dominant answer.** If one option is always right, delete the item.

### 7.1 Two mechanisms that make the queue work (and one we defer)

**(a) Promises ledger.** Every promise the player makes — "you'll be A-team next week", "you'll get the next drop", "I'll renew your contract" — is recorded with a due day and a status (`open / kept / broken`). The queue surfaces them a day before they come due.

This is the cheapest narrative device in the whole design: it converts an off-hand dialogue choice into a future obligation, and the "broken promise" moment is *earned* rather than random. FM's Playing Time ladder does the same job; ours is a table of 5–20 rows and one cron check per day.

**(b) "Why am I seeing this?"** Every item in the queue has a one-line provenance and a link that changes the rule: *"Shown because: fatigue > 70 and assigned to raid. [Change this →]"*. FM has this per feed source with a frequency setting (Minimal / Normal / Extensive); it is the difference between a feed you trust and one you learn to ignore. We ship it from day one, with three global toggles (contracts, morale, economy) and everything else on.

**(c) Deliberately not in v0.1: two audiences.** FM grades you twice (board vs fans) on the same axes, and the disagreement is free drama. Ours would be Board vs Heroes. It is cheap *after* the scoring system exists, but it competes with the score for "what am I being judged on", so v0.1 has exactly one judge: the final ranking.

Neither mechanism needs new simulation — both read state we already keep.

---

## 8. The run: deadline, score, ranking

> **Updated:** the run was originally 28 days over one 5-boss tier. It is now **84 days over a three-raid ladder** (see [progression-report.md](progression-report.md)). The scoring below is the current one.

The run is **84 days, then it ends** — the EU4/HOI4/Civ "limit date". There is no endless mode in v0.1 and no firing: when day 28 closes, the game scores you, compares you to the three rivals, and shows a ranking. Then you start a new run (same or new seed) and try to beat it.

This is the single biggest simplification available to us, and it's also better design than a confidence meter: **the goal is legible from turn one**, setbacks are damage rather than failure, and the run boundary gives the player a natural stopping point and a reason to replay.

### 8.1 The score

```
Score = raidWeights[k] for each raid cleared   // 4000 / 6000 / 8000 → 18k for all three
      + 200 per dungeon cleared
      + 3000 if World First                    // final raid before any rival
      + min(1500, gold / 10)                   // wealth, capped so hoarding can't dominate
      + 2 × squadPower                         // the guild you built
      + 250 × renownTier
      − 250 × daysInArrears                    // debt is a scar, not a wall
```

Max ≈ 28k. A run that clears one or two raids lands 8–15k. The five components map to the five things the game asks you to manage — **progression, speed, money, strength, reputation** — and each is visible in the HUD, so the player always knows roughly what they're worth.

Raids dominate the score on purpose (18k of the ~28k). Everything else is a tiebreaker for guilds that kill the same number. That keeps the World First race central while letting a slower, richer, better-built guild still beat a fast one that fell apart.

### 8.2 The ranking

| Result | Band | What it means |
|---|---|---|
| World First + all 3 raids | **S** | You beat the tier before anyone |
| All 3 raids, not first | **A** | A clean clear |
| 2 raids | **B** | One wall you never solved |
| 1 raid | **C** | A learning run |
| 0 raids | **D** | The guild survived; that's it |

Plus a **position among the 4 guilds** (you + 3 rivals, each scored by the same formula). The two together — band and position — are the run's headline.

### 8.3 The summary screen

The run ends with a screen that is *about the story*, not the number:

- the score breakdown, with each component's contribution
- your rank and the rivals' scores, with one line each on how they got there ("Echoes burned out in week 4 — 41 heroes-days of fatigue")
- **3 moments the sim thought mattered** ("you benched Varis for six days and he requested a transfer on day 19")
- a "best pull %" record per boss
- `New run` (same seed) / `New run` (new seed) / `Back to title`

That screen is what makes a 2-hour run feel worth repeating. It costs one function that reads the event log, and it is the last thing I'd cut.

### 8.4 The intended arc (tuning check)

| Day | Player state | Rivals | Intended feeling |
|---|---|---|---|
| 1–3 | 10 heroes, ~iLvl 110, 1200g | quiet, farming | "I'm building something" |
| 4–7 | first boss kill, ~iLvl 135 | Echoes kills boss 1 | "they're ahead, but I have time" |
| 8–14 | boss 3 wall, first morale crisis | Methodical catches up | "I need gear, not heart" |
| 15–21 | gearing, wage crunch | Echoes on boss 4 | "one more push" |
| 22–27 | boss 5 attempts at 30–60% | all three on boss 5 | "we can actually do this" |
| 28 | score, rank, review | — | "next run, I'll do it differently" |

If playtesting doesn't produce that emotional line, adjust `rivalPace` and the iLvl growth rate first — those two dials move everything.
