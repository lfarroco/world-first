# System Model — the mechanics we actually implement

Concrete numbers are **starting points for tuning**, not design commitments. Every formula here is meant to live in a pure function so it can be tuned by simulation rather than by opinion.

**Where this document and the build disagree, the build wins.** The shipped constants are in `src/sim/content/tuning.ts` and `src/sim/content/content.ts`; measured outcomes are in [progression-report.md](progression-report.md). The attribute-growth, fatigue/sharpness, stance and economy tables below were reconciled to the build on 2026-10-30.

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

**The world tick lives outside `resolveDay`.** `resolveDay` is one guild: clone it, resolve its parties, rest, promises, upkeep and queue. `advanceDay` is `resolveDay` plus `tickRivals`, and `runWorld` loops `advanceDay`. Keeping the step out of `resolveDay` is what lets a rival's own day resolve without recursing into the world; see §6.

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
attribute = creation roll (level-1 hero: 1–5; higher-level recruit: 3 + level/6 ± 2)
          + level growth  (+1 to two random attributes per level, capped at 20)
          (+ training, post-MVP: a targeted +0–3)
```

Level growth is deliberately steep: a level-60 hero has gained ~118 attribute points across the eight, so most veterans cap their key stats. That makes levelling — not the initial roll — the main progression spine, and it is why the level gate can carry the ladder. Gear does **not** add attributes. Gear multiplies output (§2.3). That separation is deliberate: it keeps heroes recognisable across tiers and stops gear from flattening all heroes into the same number.

### 2.3 Derived numbers (what the UI shows)

```
gearFactor  = 0.55 + (itemLevel / 260)          // 0.55 at iLvl 0 → 1.35 at iLvl 208
roleScore   = Σ (weight_i × attribute_i / 20)   // 0..1, weights per role sum to 1.0
formMod     = condMod × sharpMod × moraleMod × healthMod   // see §2.5
heroPower   = roleScore × gearFactor × formMod × 100
```

`itemLevel` = average of equipped slots (weapon, chest, helm, trinket), rounded. `heroPower` is **tonight's** number, not a rating: it falls with fatigue and rises after rest. The roster prints it as `pow·form` (`71·94%`) so the temporary part is visible, and `today` prints the party's average form beside the projection.

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

**Role fit is not free** — and it works like FM's position familiarity: a tiered multiplier, not a single penalty. Four tiers:

| Fit | Multiplier | Shown as | When |
|---|---|---|---|
| **Natural** | 1.00 | ● green | The hero's creation role (`naturalRole`) |
| **Trained** | 0.88 | ● amber | The other role of the hero's class |
| **Makeshift** | 0.72 | ◐ orange | Adjacent class (a Rogue healing? almost never) |
| **Wrong** | 0.55 | ○ red | Anything else — the CLI refuses it, the UI should not auto-assign it |

**Fit is fixed at creation.** `naturalRole` is the role the hero was made for; the assigned `role` is the player's choice. Deriving fit from current attributes was wrong: growth adds two attribute points a level, so the "best" role drifts and every veteran silently becomes off-role for −12%. Applying that to the sweep took the Steward from 2/10 World First to 0/10.

This makes **Power** and **actual output** diverge:

```
Displayed Power    = roleScore(bestRole) × gearFactor × formMod × 100
Check contribution = checkAttributePower(check) × classWeight(check)
                   × roleAffinity(role, check) × fitMult
                   × gearFactor × formMod × consistency × 100
```

A hero switched to the other role of their class pays 0.88 on every check, but may gain role affinity on the check that matters: a Bulwark as Vanguard drops mitigation 1.15 → 1.05 and raises DPS 0.90 → 1.10. That is the trade, and it is why the hero sheet shows **"Power 127 · in this role 91 ◐"** — the first number is the best role, the second is what the fight gets.

Role is assignable and free: `role <hero> <role>` in the CLI, chips on the hero sheet. There is no training timer; the fit multiplier is the cost. The planner resets each hero to their natural role at the start of the day, then re-specs a party only when its projected check is below 1.1 — about 3.5% of days. It is a small lever because a switch must beat the 0.88 fit by 13.6% on the target check; the current affinity table rarely offers that (see [progression-report.md](progression-report.md) §6.4).

Recruiting a hero who *fits the role you need* becomes a real scouting question — the FM transfer-market frisson, translated.

### 2.5 Condition and sharpness — the two clocks

FM runs two separate clocks: **Condition** (short-term energy, recovers fast) and **Match Sharpness** (medium-term edge, decays when you rest). Community testing suggests sharpness is the *stronger* effect, and it is the best-designed tension in the game: you cannot fix a tired hero by resting him, because resting makes him rusty.

We copy the two-clock structure exactly.

```
condMod     = 1.00                                fatigue 0–30
            = 1.00 − ((fatigue−30)/70) × 0.38     fatigue 30–100 → 0.62 at 100

sharpMod    = 0.78 + (sharpness/100) × 0.26       → 0.78 at 0 sharpness, 1.04 at 100, 0.936 at the 60 start

moraleMod   = 0.94 + (morale/100) × 0.12          → 0.94 at 0 morale, 1.06 at 100
```

**Fatigue** moves with activity (below). **Sharpness** moves with *recency of raiding*:

| Activity | Sharpness |
|---|---|
| Raided | **+7** |
| Dungeon | **+5** |
| Mission | **+3** |
| Farmed | +1 |
| Rested / idle | **−5** |

Start sharpness at 60 (the guild has been idle). A hero benched for a week drops to ~25 and comes back at about −10% output; a hero who raids every night sits at 90+ but accumulates fatigue. The 26% span is deliberately one-sided: the 1.04 ceiling is unchanged, so the wider range punishes rust rather than rewarding an extra-high sharpness (L56 in [learnings.md](learnings.md)). **The optimal play is a rotation block of 2–3 raid nights followed by a dungeon-led recovery day** — not "bench everyone", which is what a fatigue-only model rewards.

That is a *real* decision with a cost on both sides, generated by two integers and two update rules. This is the highest value-per-line mechanic in the whole design.

Fatigue per day:

| Activity | Fatigue | Notes |
|---|---|---|
| Raid attempts | **+22** fixed | regardless of number of pulls — a raid night is a raid night |
| Dungeon run | **+14** | |
| Mission | **+8** | |
| Farming | **+6** | |
| Resting (unassigned) | **−38** | one rest day pays back most of a raid night |

`Endurance` reduces positive fatigue: `fatigue += base × (1.15 − endurance/40)`.

A fresh hero who raids every day goes 0 → 22 → 44 → 66 → 88 → 100 (capped). **Four consecutive raid nights puts them at 88; the fifth hits the wall.** That is the intended rhythm: raid blocks of 3–4, rest, repeat. It also makes split runs meaningful, because your B-team can farm while the A-team rests.

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

Morale 1–100, moving daily by small deltas. These are the values the build applies:

| Cause | Δ |
|---|---|
| Non-farm content cleared | **+4** (party) |
| Failed run | **−2** (party) |
| Injured | **−6** |
| Benched 3+ consecutive days | **−4/day** |
| Promised the A-team | **+10** |
| Rotated into a party | **+5** |
| Contract renewed | **+8** |
| Complaint ignored | **−12** |
| In arrears | **−2/day** (whole roster) |
| Won World First | score only; no morale delta yet |

**Departure rules** (implemented):
- Contract reaches 0 days → the hero leaves for free (a bad event, not a negotiation).
- An event option can remove a hero (`leave`); the release option on a contract item can remove them earlier.
- Transfer requests, release clauses, buyouts and wage-under-market morale are **design, not implemented** — see [progression-report.md](progression-report.md) §7.

This is the retention loop, and it's the cheapest source of narrative in the game once the negotiation half exists.

---

### 2.8 Traits

A hero carries up to **3** traits (`MAX_TRAITS`). A trait is one line of character with one rule attached, visible on the card, never a hidden modifier. Twenty ship today:

| Trait | Kind | Classes | Effect |
|---|---|---|---|
| **Keen Eye** | counter | mage, rogue | Counters Ash Veil |
| **Steadfast** | counter | warrior, cleric | Counters Dread Roar |
| **Pack Hunter** | bond | rogue | +5% DPS per other rogue, −6% alone |
| **Kindred Spirits** | bond | mage | +5% DPS per other mage, −4% alone |
| **Shield Wall** | bond | warrior | +3% party mitigation per other warrior |
| **Field Medic** | bond | cleric | +8% sustain in a party of four or more |
| **Mentor** | bond | cleric | the lowest-level ally gains +25% XP; self −8% |
| **Pathfinder** | craft | — | −3 fatigue on dungeon days |
| **Quartermaster** | craft | — | +20% gold from farms |
| **Student** | craft | — | +12% XP |
| **Ironhide** | craft | — | −20% injury chance |
| **Night Owl** | craft | — | +2 sharpness from raids |
| **Scavenger** | craft | — | +3 loot item level |
| **Hot-Headed** | flaw | — | −8% on every check after a wipe |
| **Frail** | flaw | — | +50% injury chance |
| **Glory Hound** | flaw | — | −7% unless the hero is the party's strongest |
| **Slow Starter** | flaw | — | −8% on the first phase |
| **Executioner** | specialist | rogue | +12% DPS on the last phase, −5% on the first |
| **Stonewall** | specialist | warrior | +10% mitigation on the first phase, −5% on the last |
| **Ritualist** | specialist | mage | +10% mechanics on the middle phase, −4% elsewhere |

**Rolling.** Each hero rolls a class counter at 30% and one general trait at 40%. Flaws carry double weight in the general pool, so a roster carries more character than free power. Class-locked traits only appear for that class. Two traits today; the third slot is reserved for earned traits (O6).

**One evaluator.** `traitSelfFactor`, `traitPartyFactor` and `traitEconomy` are pure and are used by resolution, projection and the planner, so a trait can never mean one thing in the report and another in the sim.

- *Self* effects multiply that hero's contribution to a check.
- *Party* effects multiply the check once (Shield Wall).
- *Craft* effects are applied in the day pipeline: fatigue, gold, XP, injury chance, sharpness, loot.
- Conditions are phase (`first`, `middle`, `last`), after a wipe, not the party's strongest, party size, and content kind.

**Rule: if a trait cannot be printed in the wipe report, it does not ship.** `RaidPhaseLog.traits` carries the names that moved the check.

Content can also attach a threat to a phase. A threat is unknown until the first pull: the pull applies it, the report names it, and the next plan can answer it.

| Content | Phase | Threat | Uncountered |
|---|---|---|---|
| Ashen Spire | The Climb | Ash Veil | mechanics ×0.82 |
| The Tyrant | The Long Dark | Dread Roar | sustain ×0.85 |

Three rules keep the threat layer honest:

- **Unknown until the first pull.** An un-pulled boss cannot be pre-solved from a wiki.
- **Binary, not stacked.** One hero with the counter removes the whole penalty.
- **The planner swaps only to improve the projection.** It will trade one body for a counter after discovery, and refuse when the counter is the weaker body.

The measured effect of the full set — and the flaw budget that keeps it from inflating the ladder — is in [progression-report.md](progression-report.md) §6.5.

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

checkValue = Σ relevant contributions × stanceMod × masteryMod × abilityMod × rng(0.97, 1.03)
ratio      = checkValue / requirement
```

**Variance lives on individual heroes, not on the check.** A global ±6% roll makes a wipe feel arbitrary; per-hero consistency rolls make it read as *"Thorne had an off night"* — a story the player can act on. The global roll stays tiny (±3%) only so identical inputs don't produce identical outputs.

| ratio | Result | Consequence |
|---|---|---|
| ≥ 1.15 | **Clean** | Phase cleared, progress bonus +5%, no injury risk |
| 1.00–1.15 | **Pass** | Phase cleared |
| 0.92–1.00 | **Scrape** | Phase cleared, but heroes roll injuries (§3.1). Morale −2 is for a failed run, not a scrape |
| < 0.92 | **Fail** | Wipe. Best pull logs the phase's partial progress, not the start of the phase. |

A phase may carry a **threat** (`ContentPhase.ability`): a named rule that multiplies the phase value when no hero in the party counters it. The threat applies whether or not the party has seen it; the first pull is the scouting pull, and the report names what it found. `abilityMod` is 1 when a counter is present and the threat's penalty when it is not. See §2.8.

Because phases resolve in order, "best pull %" is a **monotone, meaningful progress metric** — exactly the number RWF viewers watch. It banks the phases that pass plus the first failing phase's `ratio × share`, so a party at DPS 0.94 reads 94%, not 0%. The projection uses the same rule, and every cell shows the weakest check and its shortfall (`DPS 0.47 -53%`) beside the banked percentage. And a wipe is never mysterious: it always names the phase, the check, and both numbers.

Injury chance on a scrape is **not** only a stance multiplier. Fatigue feeds it:

```
injuryChance = 0.12 × stanceInjury × (1 − vitality/40) × economyMod × (1 + fatigue/100 × 0.8)
```

At 100 fatigue a hero is 1.8× as likely to be hurt as the same hero at 0. Rest therefore buys bodies as well as a check, which is the cost the rotation was missing (`tests/sim.test.ts` asserts the multiplier; `today` prints the pulls left tonight).

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

> **Not implemented yet.** The build resolves a raid night inside one `resolveDay`: 2–6 pulls, no roster lock and no intervention stop. This section is the target for the UI vertical slice, not a description of the current CLI.

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

The ladder shipped with **three** raid bosses, not the five in the original draft. The check types and the shape survived; the count did not.

| # | Boss | Recommended iLvl | Checks (P1 / P2 / P3) | Signature mechanic |
|---|---|---|---|---|
| 1 | **Gatewarden Oros** | 150 | Mitigation / DPS / Mitigation | Teaches the tank-healer relationship |
| 2 | **The Twin Covens** | 185 | DPS / Mechanics / Sustain | Split damage; the gear wall — its mechanics check is more than twice Gatewarden's |
| 3 | **The Obsidian Tyrant** | 225 | DPS / Sustain / DPS | The World First boss; needs everything |

The intentional shape survives: the middle boss is a **hard gear wall** that forces the player to choose between farming and pushing, which is exactly the decision the whole game is about. The tuned requirements live in `src/sim/content/content.ts`; this table is intent, and the measured clear times are in [progression-report.md](progression-report.md).

### 3.6 Content: availability, rewards and drops

A content is a record in `src/sim/content/content.ts`. The fields the player meets:

| Field | Meaning |
|---|---|
| `kind` | farm, mission, dungeon or raid. The kind sets fatigue, sharpness and whether the run can fail. |
| `minLevel` | The **party average** that must be met. Not the weakest hero: one under-levelled body can be carried. |
| `minHeroes` / `maxHeroes` | Party size. A mission is exactly 3; a raid exactly 10. |
| `phases` | The checks the run must pass. Empty = the farm always succeeds. Shares sum to 1. |
| `gold` / `xp` | Farm gold is **per hero**; every other kind pays the party a flat sum. XP is per hero for every kind. |
| `loot` | `count` guaranteed items from an iLvl band. A clear pays exactly this many. |
| `requires` | Content ids that must be cleared first. |
| `firstClearRecruit` | Dungeons default to a free recruit on the first clear; `false` on a side dungeon. |
| `mobs` / `drops` | The bestiary and the named drop table. `inspect <id>` prints both. |

**Availability is three gates.** Prerequisites cleared, roster size, and the average-level gate. `availableContent` returns only content the roster can field; the list never shows a locked area. The guild is told once, through a `unlock` event, when an area opens; `knownContent` keeps the ledger so a roster that shrinks and grows does not re-announce it. A save from before the ledger existed initialises silently.

**Rewards are a choice, not a stack.** Each band carries more than one job. The XP run pays no loot, the gold run pays no XP, and the loot run pays neither. The shipped numbers and the measured effect are in [progression-report.md](progression-report.md) §1.1; the rule is that a new option must take something away, or it is free progression.

**A mission pays its bounty on every clear.** A repeat-reward schedule was measured and rejected: 100% → 85% → 70% left the pick unchanged and cost the Steward 3.4% of score, and 100% → 60% → 30% made the Tyrant unreachable (0/20 World First) while the bot still ran the same mission. The spare party has no other three-hero job, and no purse rule invents one. Details in [progression-report.md](progression-report.md) §7 and [open-questions.md](open-questions.md) O7.

**Named drops are one roll, not a table per item.** `rollNamedDrop` rolls once per clear against the content's `drops`, whose `chance` values sum to at most 1. At most one named item drops, and it replaces one of the guaranteed items, so the item count never changes. Its iLvl is fixed, then the forge and the Scavenger trait add to it like any other drop. That is why `inspect` can print "18% per clear" and mean it.

**The bestiary is flavour with a hook.** Each `mobs` entry names the check it pressures; a data test asserts that check is one of the content's phases. It is not a second combat model. Farms have mobs but no checks: their bestiary is the thing you hunt, not a threat.

---

## 4. Parties and the War Room

Three assignment slots per day (this is the screen's core):

| Slot | Size | Activities available |
|---|---|---|
| **Raid** | 10 exactly | One of three raid bosses |
| **Dungeon** | 4–5 | Daily dungeon (gear) |
| **Farm** | 1–5 | Farm zone (gold) |
| Unassigned | — | Rest (recovery) |

Each hero can be in exactly one slot. That single constraint is the daily puzzle.

**Stance** — one choice per party, three options. Keep it to three for MVP; more knobs belong after the loop is proven.

| Stance | Effect |
|---|---|
| **Cautious** | −10% to all checks, **0.4× injury risk**, −4 fatigue |
| **Steady** | no modifier |
| **Push** | +12% to all checks, **1.55× injury risk**, +8 fatigue |

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
| Farm | 6g (Emberwood) or 12g (Old Quarry) × heroes | daily |
| Mission clear | 70g / 110g | daily |
| Mission or dungeon fail | 40% of the gold, no loot | daily |
| Dungeon clear | 120g / 180g / 360g + 2–3 items | daily |
| Raid clear | 900g / 1200g / 1800g + 4–5 items | every clear |
| World First | score only (+3000); no gold | once per run |

**Sinks**

| Sink | Cost |
|---|---|
| Wages | `max(12, 8 + 2.6 × level)` per hero — **weekly, day 7**. A **renewal re-prices** the wage to the hero's current level (`renewalWage`), so a starter signed at level 1 costs 164g/week at level 60, not 12g |
| Recruitment | `40 + 0.35 × level²` (level 1 ≈ 40g, level 60 ≈ 1300g). The fee does not track power: the tavern prints role, item level, power and traits so the purchase is legible |
| Facilities | 800–4800g per level (see [progression-report.md](progression-report.md) §5.2) |
| Flasks, healing fees, tavern refresh | **design, not built** |

### 5.2 The wage budget is the real constraint

FM's financial tension is a **budget**, not a balance. So:

```
wageBudget  = 200 + renown×150 + 150×hallLevel
wageBill    = Σ hero wages
```

The per-renown rate is 150 because a renewal now costs the hero's market wage: a 13-hero roster at level 60 is about 2,150g/week, which a full-clear guild (renown 17–18) can carry and a two-raid guild cannot. At 120 the documented roster did not fit, and the FYI fired on every full roster.

- `wageBill > wageBudget` → an FYI attention item, "The coffers are thin". **Not fatal** — the run continues.
- There is no separate 1.3× recruitment freeze; the only recruitment freeze is the arrears rule below.

**Debt is a penalty, not a game over.** This follows the EU4/HOI4 model: if gold goes negative you enter **arrears** —

- cannot recruit (event purchases cannot create debt; `optionAffordable` blocks a gold cost you cannot cover)
- morale −2/day to the whole roster
- every further day in arrears adds a −250 score penalty at the run's end

You are never stopped from playing, and you can climb out by farming. That's the EU4 bankruptcy shape: survivable, damaging, and it makes a bad ranking rather than a dead run.

**No board objectives, no firing.** The judgement happens once, at the deadline, as a score (§8). This removes an entire subsystem (confidence, objectives, reviews) and replaces it with one number the player can see accumulating from day one — which is both simpler to build and *more* legible than a confidence meter.

### 5.3 Renown

Renown (the second currency) is **prestige, not spending power**: +1 per dungeon first clear and +3 per raid first clear. It raises the wage budget and the run score. It cannot be bought.

The design also wanted renown to open better tavern candidates and gate facilities. Neither is wired up yet: the tavern level comes from the Tavern facility, and facilities are gated by gold only. That is an open gap, not current behaviour.

---

## 6. Rival guilds — simulated, not scripted

**This is non-negotiable if the race is to feel real.** Each rival is a full `GameState`: three starting heroes, gold, a tavern, facilities, promises, an event log and a `Personality`. `tickRivals` gives it one `aiTurn` per player day, through the same planner and the same `resolveDay` the player uses. There is no compressed power number left.

| Guild | Personality | Behaviour |
|---|---|---|
| **Echoes** | reckless, ambition 0.85 | Raids early and often; spends into the next tier |
| **Methodical** | careful, thrift 0.6 | Farms before the wall |
| **Ravensguard** | steady, ambition 0.6 | Balanced; takes the attempt when the odds are good |

The world tick is deliberately outside `resolveDay`. `resolveDay` resolves one guild; `advanceDay` resolves the player then calls `tickRivals`; `runWorld` repeats that for a full run. A rival guild's own `rivals` array is empty, so its `resolveDay` cannot recurse into the world.

Rival difficulty is one dial: **`RIVAL.pace`, the multiplier on XP a rival earns**. It is 0.9 — a rival levels about one step slower than the player. 0.9 reproduces the player's documented 20-seed line; 1.0 is the "brutal" setting, where the 10-seed sweep puts the rivals at 25.3–26.2k and 2.83 raids and the player's average rank at 2.60–3.60 ([progression-report.md](progression-report.md) §3.2).

The leaderboard reads each rival's own state: `rivalRaidsCleared`, the cached `activity` line ("The Tyrant — best 62%", "resting", "cleared Gatewarden"), and `computeScore(rival.guild)`. `standings` scores all four guilds and sorts them; `playerRank` returns the player's position.

**Determinism beats surprise.** Rival guilds are seeded from the player's seed with an odd multiplier per guild, so the same save replays identically — and a rival's progress is a *pace* the player can learn rather than a dice roll they can resent. Only their activity and score are exposed; their roster stays hidden.

**Publish the tie-breakers.** The code implements a shorter order than the design first proposed, and the doc has to say what the code does:

```
1. higher final score
2. earlier final-boss kill (World First)
3. more raids cleared
4. table order (player first, then Echoes, Methodical, Ravensguard)
```

A same-day third-raid clear goes to the player: the player's resolution runs before `tickRivals`. Show the rule in a `Rules` popover on the Raid screen. Ambiguous tie-breaks are the fastest way to lose a competitive audience.

**Cost:** the full world run is ~0.84 s for 84 days (~10 ms/day), against ~0.1 s for the player's guild alone. The unit tests use the player-only `aiRun`; the race is tested by three world runs. `sim --runs 20` takes ~50 s.

---

## 7. Attention items — the thing that turns a report into a game

Derived at the end of each day and ranked by urgency. **At most 3 blocking items** exist at once, and the Advance Day button is disabled until each is resolved — everything else is a non-blocking FYI line. Each blocking item is a small modal.

These are the items the build actually derives:

| Trigger | Modal | Options | Consequence |
|---|---|---|---|
| Hero benched 3+ days, morale ≤ 58 | "Varis wants words" | Promise a spot · Rotate in · Ignore | +10 / +5 / −12 morale; promise and rotate also reset `daysBenched`. The promise opens a ledger row (§7.1a) |
| Contract ≤ 7 days | "Thorne's contract" | Renew at market (shown as `24g → 164g/week`, 28 days) · Let walk | Wage re-prices to the hero's level / hero leaves |
| Promise due tomorrow | "Varis expects his spot" (FYI) | Noted | Names the starts so far and the last night that can keep it |
| Wage bill > budget | "The coffers are thin" (FYI) | Noted | Defers the item for the day |
| Fatigue ≥ 70 and assigned | "N heroes are running on empty" (FYI) | Noted | One line for the whole rotation, not one per body |
| An event card is pending | The card | The card's affordable options | The bot prices every option by its effects (`src/sim/ai/cards.ts`); the trace is in [progression-report.md](progression-report.md) §5.4 |

**Design, not built:** the gear-drop "who gets the axe?" modal, the rival-kill "they pulled ahead" modal, and the morale-crack modal. They are in [screens.md](screens.md) and [vision.md](vision.md), not in `deriveAttention`.

Design rule for every attention item: **it must have no dominant answer.** If one option is always right, delete the item. Every option must also be **total**: it either settles the item or changes what the item is about. `ignore` and `acknowledge` write a one-day deferral (`attentionMutedUntil`); `promise` and `rotate` reset the grievance; `rotate` is hidden when there is no party to put the hero in. A test iterates every item and every option in five mid-run states and asserts none comes straight back.

### 7.1 Two mechanisms that make the queue work (and one we defer)

**(a) Promises ledger.** Every promise the player makes — "you'll be A-team next week", "you'll get the next drop", "I'll renew your contract" — is recorded with a due day and a status (`open / kept / broken`). The queue surfaces them a day before they come due.

This is the cheapest narrative device in the whole design: it converts an off-hand dialogue choice into a future obligation, and the "broken promise" moment is *earned* rather than random. FM's Playing Time ladder does the same job; ours is a table of 5–20 rows and one cron check per day.

**Built.** The promise option writes a `PromiseRecord`: hero, day made, due day (`madeOn + 7 - 1`), starts counted, status `open / kept / broken`. The day pipeline counts a start whenever the hero is in a deployed party, and on the last day of the window it settles: **kept** at 3 or more starts (+5 morale), **broken** below that (−15 morale, contract status set to bench). The queue shows an FYI the day before with the count so far ("2/3 starts, promise due tomorrow"), and `today` lists every open promise. A save written before the ledger existed has no promises and is not migrated.

What is still missing: the planner never reads `contract.status`, so the bot cannot plan around a promise, and a broken promise has no transfer request behind it.

**(b) "Why am I seeing this?"** Every item in the queue has a one-line provenance and a link that changes the rule: *"Shown because: fatigue > 70 and assigned to raid. [Change this →]"*. FM has this per feed source with a frequency setting (Minimal / Normal / Extensive); it is the difference between a feed you trust and one you learn to ignore. We ship it from day one, with three global toggles (contracts, morale, economy) and everything else on.

**Not built.** The queue has no provenance line and no toggles.

**(c) Deliberately not in v0.1: two audiences.** FM grades you twice (board vs fans) on the same axes, and the disagreement is free drama. Ours would be Board vs Heroes. It is cheap *after* the scoring system exists, but it competes with the score for "what am I being judged on", so v0.1 has exactly one judge: the final ranking.

Neither mechanism needs new simulation — both read state we already keep.

---

## 8. The run: deadline, score, ranking

> **Updated:** the run was originally 28 days over one 5-boss tier. It is now **84 days over a three-raid ladder** (see [progression-report.md](progression-report.md)). The scoring below is the current one.

The run is **84 days, then it ends** — the EU4/HOI4/Civ "limit date". There is no endless mode in v0.1 and no firing: when day 84 closes, the game scores you, compares you to the three rivals, and shows a ranking. Then you start a new run (same or new seed) and try to beat it.

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

A measured S run scores ~30k; a two-raid run lands ~24k. Each component maps to something the game asks you to manage — **progression, speed, money, strength, reputation, debt** — and each is visible in the HUD, so the player always knows roughly what they're worth.

Raids dominate the score on purpose (18k of the ~30k). Everything else is a tiebreaker for guilds that kill the same number. That keeps the World First race central while letting a slower, richer, better-built guild still beat a fast one that fell apart.

### 8.2 The ranking

| Result | Band | What it means |
|---|---|---|
| World First + all 3 raids | **S** | You beat the tier before anyone |
| All 3 raids, not first | **A** | A clean clear |
| 2 raids | **B** | One wall you never solved |
| 1 raid | **C** | A learning run |
| 0 raids | **D** | The guild survived; that's it |

Plus a **position among the 4 guilds** (you + 3 rivals, each scored by the same formula). The two together — band and position — are the run's headline.

**Both are built.** The rivals are full guilds, so `computeScore` runs on each; `standings` sorts the four and `playerRank` returns the position. The CLI prints the rank on `today`, the race table on `status`, and the full table at the end of a run. Measured average rank on 20 seeds: 2.90 (Steward), 2.35 (Quartermaster), 2.75 (Gambler).

### 8.3 The summary screen

**Partly built.** The CLI prints the score lines, band and rank table. The three moments and the per-boss record are still design.

The run ends with a screen that is *about the story*, not the number:

- the score breakdown, with each component's contribution
- your rank and the rivals' scores, with one line each on how they got there ("Echoes burned out in week 4 — 41 heroes-days of fatigue")
- **3 moments the sim thought mattered** ("you benched Varis for six days and he requested a transfer on day 19")
- a "best pull %" record per boss
- `New run` (same seed) / `New run` (new seed) / `Back to title`

That screen is what makes a 2-hour run feel worth repeating. It costs one function that reads the event log, and it is the last thing I'd cut.

### 8.4 The intended arc (tuning check)

Measured on the balanced AI (seed 4; values are approximate and move between seeds):

| Day | Player state | Rivals | Intended feeling |
|---|---|---|---|
| 1–5 | 3 heroes, avg iLvl 15, 250g | quiet, levelling | "I'm building something" |
| 6–15 | 7 heroes, level 10, Wolf Den and Bandit Road | quiet | "the first real fights" |
| 16–30 | 13–15 heroes, avg iLvl 28–36, Hollow Crypt cleared | still levelling | "the roster is taking shape" |
| 31–44 | 15–17 heroes, avg iLvl 36–60, Sunken Temple | rivals ahead on stages | "I need gear, not heart" |
| 45–55 | level 47–60, Ashen Spire → Gatewarden → Covens | first rival finishes ~day 60 | "one more push" |
| 56–70 | avg iLvl 110–150, Tyrant attempts | all three finish days 58–79 | "we can actually do this" |
| 71–84 | avg iLvl 150–200, roster 17 | race resolved | "next run, I'll do it differently" |

A good run takes World First around day 53–63. A slower run clears two raids and watches a rival take it. If playtesting does not produce that line, adjust `RIVAL.pace` and the loot iLvl curve first — those two dials move everything.
