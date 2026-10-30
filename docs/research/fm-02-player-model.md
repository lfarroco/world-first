# FM-02 — The Football Manager Player/Character Model

**Scope:** Football Manager 2024 (desktop) as the primary reference, with Football Manager 26 differences called out. Research note: **FM25 was never released** — Sports Interactive cancelled it in February 2025 and shipped FM26 on 4 November 2025 instead, rebuilt on Unity ([Wikipedia: Football Manager 26](https://en.wikipedia.org/wiki/Football_Manager_26)). Any guide that says "FM25 changed X" is talking about a game that does not exist; the real break is FM24 → FM26.

**Why this document exists:** it feeds a fantasy "guild manager" design in which heroes occupy footballer slots. Attribute names, scales, and the role/duty grammar are the load-bearing parts; everything else is depth to be cut deliberately rather than accidentally.

**Evidence legend used throughout:**

- *(verified)* — stated by a source I read and cite inline.
- *(community-measured)* — reproducible testing by the FM community (fm-arena etc.), not SI documentation. Treat as strong but not canonical.
- *(unverified)* — plausible/observed but I could not confirm against a source. **Do not ship these names or numbers without a check.**

---

## 0. One-paragraph summary of the model

A player is a **bag of ~47 visible 1–20 attributes** (36 outfield-visible + 11 goalkeeper-only; the GK panel also shows First Touch and Passing, so 13 icons), plus **13 hidden 1–20 attributes**, plus two **global scalars** (Current Ability, Potential Ability, both 0–200 and never shown numerically), plus a **position familiarity vector** (0–20 per position, seven named tiers), plus a **role + duty assignment** that converts attributes into behaviour, plus **traits** that override tactics, plus **live state** (condition, match sharpness, morale, injuries, jadedness), plus **contract/squad status**. The manager never sees CA/PA, never sees hidden attributes directly, and sees attributes only after scouting has narrowed them from a range to a number.

Count reconciliation: 14 technical + 14 mental + 8 physical = 36 outfield attributes; 11 goalkeeper-only attributes (Aerial Reach, Command of Area, Communication, Eccentricity, Handling, Kicking, One On Ones, Punching, Reflexes, Rushing Out, Throwing) + 2 shared (First Touch, Passing) = 13 GK-panel icons; 36 + 11 = 47 unique visible; 47 + 13 hidden = **60**, which is exactly the count FM.Zweierkette uses in its reference article "Alle 60 Spielerattribute" ([FM.Zweierkette](https://fm.zweierkette.de/handbuch/spielerattribute-football-manager/)).

---

## 1. The visible attribute set

All visible attributes are integers **1–20**. There is no overall rating, no "OVR", no percentage. This is the single most important design fact about FM: the game refuses to give you a single number for a player.

### 1.1 Technical — 14 attributes

| # | Attribute | What it does (2–6 words) |
|---|---|---|
| 1 | Corners | Accuracy and danger of corner kicks |
| 2 | Crossing | Accurate delivery from wide areas |
| 3 | Dribbling | Running with ball under control |
| 4 | Finishing | Converting chances inside the box |
| 5 | First Touch | Controlling the arriving ball instantly |
| 6 | Free Kick Taking | Dead-ball shots and deliveries |
| 7 | Heading | Accuracy and power of headers |
| 8 | Long Shots | Shooting from outside the box |
| 9 | Long Throws | Distance and threat of throw-ins |
| 10 | Marking | Tracking and denying a direct opponent |
| 11 | Passing | Finding a teammate reliably |
| 12 | Penalty Taking | Conversion from the penalty spot |
| 13 | Tackling | Winning the ball without fouling |
| 14 | Technique | Refinement and repertoire on the ball |

Sources: [FIFPlay FM24 attributes](https://www.fifplay.com/football-manager-2024-player-attributes/), [sortitoutsi FM24 attribute guide](https://sortitoutsi.net/content/67538/fm24-guide-players-attributes-explained). Note that FM.Zweierkette groups Corners / Free Kicks / Penalties / Long Throws under a separate "Standards" heading — that is a *presentational* grouping, not a fourth category in the data ([FM.Zweierkette](https://fm.zweierkette.de/handbuch/spielerattribute-football-manager/)). For a game that wants clean buckets, "Set Pieces" as a sub-group of Technical is the more usable framing.

Cross-attribute interactions worth knowing (they are what make the numbers feel like football rather than a stat sheet):

- **Finishing** is accuracy only; *Composure*, *Decisions*, *Technique* decide whether the shot happens well.
- **Passing** is execution; *Vision* decides whether the option is seen; *Technique* decides whether the difficult version is possible.
- **Heading** is skill; *Jumping Reach* (which already bakes in height) decides whether you get there.
- **Marking** is only as good as *Positioning*, *Anticipation*, *Strength*.
- **Dribbling** is modulated by *Agility*, *Balance*, *Acceleration*, *Technique*, *Flair*.

### 1.2 Mental — 14 attributes

| # | Attribute | What it does (2–6 words) |
|---|---|---|
| 1 | Aggression | Willingness to engage physically |
| 2 | Anticipation | Reading and reacting to events |
| 3 | Bravery | Committing to risky, painful actions |
| 4 | Composure | Steadiness under pressure on ball |
| 5 | Concentration | Focus maintained event by event |
| 6 | Decisions | Choosing the correct option |
| 7 | Determination | Drive to succeed, on and off pitch |
| 8 | Flair | Unpredictable creative risk-taking |
| 9 | Leadership | Influencing and organising teammates |
| 10 | Off The Ball | Finding space without the ball |
| 11 | Positioning | Reading danger, holding defensive spot |
| 12 | Teamwork | Following instructions, working for team |
| 13 | Vision | Seeing passes others miss |
| 14 | Work Rate | Urgency and effort applied to duty |

Important semantic traps (each one is a place where a fantasy reskin will go wrong if you guess):

- **Aggression is not dirtiness.** It is engagement in duels and 50/50s; *Dirtiness* (hidden) is the foul play. A brave, aggressive centre-back with low Dirtiness is a clean monster.
- **Positioning is defensive only.** It does nothing in attack; *Off The Ball* is its attacking mirror.
- **Determination is visible.** It is the only visible attribute that feeds the personality label (§2.4), and it is the mental attribute players most often wrongly assume is hidden.
- **Teamwork also arbitrates traits.** It helps decide whether a player follows a tactical instruction or does his PPM instead ([sortitoutsi](https://sortitoutsi.net/content/67538/fm24-guide-players-attributes-explained)).
- **Concentration vs Consistency**: Concentration is within-match focus; Consistency (hidden) is match-to-match (§2.1).

### 1.3 Physical — 8 attributes

| # | Attribute | What it does (2–6 words) |
|---|---|---|
| 1 | Acceleration | Time to reach top speed |
| 2 | Agility | Turning, stopping, changing direction |
| 3 | Balance | Staying upright, shooting while moving |
| 4 | Jumping Reach | Highest headed contact point |
| 5 | Natural Fitness | Fitness retention, recovery, ageing curve |
| 6 | Pace | Top speed off the ball |
| 7 | Stamina | Enduring high-intensity work for 90 |
| 8 | Strength | Physical force in duels |

Two physical attributes carry disproportionate hidden weight and deserve special treatment in any clone:

- **Acceleration** is the single most powerful attribute in the FM24 match engine. Community testing shows a 1% increase in Acceleration ≈ 2.1% increase in player effectiveness; going from 12 to 16 Acceleration is worth roughly +25% effectiveness ([fm-arena position-rating testing](https://fm-arena.com/thread/1087-the-position-rating-and-its-impact-on-the-performance/)).
- **Natural Fitness** is a meta-attribute: it drives injury recovery speed, condition recovery between matches, match-sharpness decay rate, and how slowly physical attributes decline after the peak ([FIFPlay](https://www.fifplay.com/football-manager-2024-player-attributes/), [FM.Zweierkette](https://fm.zweierkette.de/handbuch/spielerattribute-football-manager/)). It is the "longevity stat" that players undervalue and that a guild game can reuse almost verbatim as a hero-vitality stat.

**Jumping Reach already includes height.** FM's own guidance is that two players with Jumping Reach 14 reach the same height even if one is 185 cm and the other 192 cm; taller players simply get a higher floor. The rough mapping published by FM.Zweierkette ([source](https://fm.zweierkette.de/handbuch/spielerattribute-football-manager/)):

| Height (m) | Typical Jumping Reach |
|---|---|
| ≤1.61 | 1–4 |
| 1.67–1.68 | 3–7 |
| 1.72–1.73 | 5–9 |
| 1.77–1.79 | 7–11 |
| 1.82–1.84 | 9–13 |
| 1.87–1.89 | 12–16 |
| 1.92–1.94 | 14–18 |
| 1.97–1.99 | 16–20 |
| >2.00 | 17–20 |

### 1.4 Goalkeeping — 13 shown, 11 unique

| # | Attribute | What it does (2–6 words) |
|---|---|---|
| 1 | Aerial Reach | Physical presence claiming aerial balls |
| 2 | Command of Area | Instinct to own the penalty box |
| 3 | Communication | Organising and directing the back line |
| 4 | Eccentricity | Likelihood of non-goalkeeper behaviour |
| 5 | First Touch | (shared) controlling ball at feet |
| 6 | Handling | Holding shots rather than parrying |
| 7 | Kicking | Distance and accuracy of kicks |
| 8 | One On Ones | Saving when striker is clean through |
| 9 | Passing | (shared) distribution in open play |
| 10 | Punching | Tendency to punch, not catch |
| 11 | Reflexes | Reacting to deflections and snap shots |
| 12 | Rushing Out | Tendency to sweep beyond the box |
| 13 | Throwing | Accurate, quick distribution by hand |

Sources: [FIFPlay](https://www.fifplay.com/football-manager-2024-player-attributes/), [FM.Zweierkette](https://fm.zweierkette.de/handbuch/spielerattribute-football-manager/).

**Key UI fact:** for a goalkeeper, FM **replaces the Technical column entirely** with the Goalkeeping column. A keeper's profile shows Goalkeeping + Mental + Physical, and his *Finishing / Tackling / Marking* etc. still exist in the database but are not surfaced. Two GK attributes are explicitly **tendencies, not abilities** — Eccentricity, Punching, and Rushing Out describe *what he chooses to do*, not *how well he does it*. Command of Area likewise "only determines whether they try, not that they succeed" ([sortitoutsi](https://sortitoutsi.net/content/67538/fm24-guide-players-attributes-explained)).

This distinction is a design gift for a guild game: **tendency attributes** (how a hero behaves) vs **ability attributes** (how good the behaviour is) is a clean, cheap way to generate personality without writing AI.

### 1.5 How the number is displayed and what it means

- **Scale:** integer 1–20. One point is a meaningful difference; three points is a different class of player.
- **No aggregation.** FM deliberately never shows a total, average, or OVR.
- **Colour banding:** attributes are colour-coded in five bands. The *thresholds are user-editable in Preferences*, and different skins ship different palettes, so there is no single canonical mapping ([SI community thread on attribute colours](https://community.sports-interactive.com/forums/topic/558822-attribute-colours/)). The de-facto default reading — and the one used by most content creators — is roughly: **≤5 red (poor), 6–9 orange (below average), 10–13 neutral/pale (average for a top league), 14–16 light green (good), 17–20 bright green (elite)**. *(unverified: exact default cut points; the 5-band structure and editability are verified, the numbers are not.)* Experienced players routinely shift the bands by division: one poster in that thread lowers thresholds by one per tier below the Premier League.
- **Scout-report icons reuse the same colour logic** but only at the extremes: 15–20 bright green, 11–14 light green, 6–9 orange, 1–5 dark red ([Steam personality guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3141707601)).
- **Role highlighting:** on a player's attribute panel, the attributes that matter for the selected role are tinted — **green = key attribute, blue = preferable attribute** ([sortitoutsi retraining guide](https://sortitoutsi.net/content/67473/fm24-guide-how-to-retrain-players-position)). Deficiency in a *key* attribute cannot be offset by strength in a *preferable* one ([FM Dossier](https://fmdossier.dev/guides/position-role-and-duty)).

**Perceptual anchors a designer should steal** (my synthesis, calibrated against FM community consensus rather than a single source):

| Band | Meaning for a top-division club | Meaning in a lower league |
|---|---|---|
| 1–3 | Unplayable; never appears in a top league | Still bad |
| 4–6 | Amateur-level | Fringe |
| 7–9 | Below standard; exploitable weakness | Squad filler |
| 10–12 | Average; playable but not a strength | Good player |
| 13–14 | Solid starter for a mid-table top-flight side | Star |
| 15–16 | Very good; starts for most top clubs | Best in league |
| 17–18 | Elite; top-5-in-position territory | — |
| 19–20 | World class; generational | — |

Rule of thumb that matches how FM players actually read a card: **"15+ is elite for a top league" is right, but only for the attributes that matter for the role.** A striker with 15 Finishing and 8 Composure is not an elite striker; a full-back with 15 Crossing and 8 Stamina cannot play the role he is being paid for.

---

## 2. Hidden attributes

FM.Zweierkette calls these "versteckte Attribute" and states the key rule plainly: they are rated 1–20 like everything else, but you almost never learn the number — only hints in scout and coach reports ([FM.Zweierkette](https://fm.zweierkette.de/handbuch/spielerattribute-football-manager/)).

### 2.1 The thirteen hidden attributes

| # | Attribute (editor name) | Direction | What it does |
|---|---|---|---|
| 1 | Consistency | high = good | Chance of playing at full CA each match |
| 2 | Important Matches (a.k.a. Big Matches) | high = good | Performance modifier in high-stakes games |
| 3 | Injury Proneness | **high = bad** | Probability of picking up injuries |
| 4 | Versatility | high = good | Speed of learning new positions |
| 5 | Adaptability | high = good | Settling in a new club/country |
| 6 | Professionalism | high = good | Training quality, CA growth, longevity |
| 7 | Ambition | high = demanding | Drive; also wage/status/transfer demands |
| 8 | Loyalty | high = good | Resistance to leaving; wage flexibility |
| 9 | Pressure | high = good | Composure under scrutiny; few nerves |
| 10 | Temperament | high = good | Self-control when provoked/criticised |
| 11 | Controversy | **high = bad** | Outspokenness; media and dressing-room friction |
| 12 | Sportsmanship (a.k.a. Fairness) | high = good | Fair play, respect, fan/media standing |
| 13 | Dirtiness | **high = bad** | Willingness to foul; card risk |

Note the direction inversions: **Injury Proneness, Controversy and Dirtiness are "lower is better"**, while every other hidden attribute is "higher is better". A guild game that shows these to players must either flip the sign or label them ("Fragility", "Notoriety", "Cynicism") to avoid a UI where 20 sometimes means great and sometimes means terrible.

### 2.2 Consistency — the most mechanically legible hidden attribute

This is the one hidden attribute with published mechanics, and it is worth copying almost exactly:

- Consistency 20 → the player performs at full CA in **20 of every 25 matches**.
- Consistency 1 → full CA in **1 of 25**.
- When he is not at full CA, roughly **10 CA is deducted**, the exact amount rolled randomly, and the deduction hits **technical and mental attributes but not physical ones** ([FM.Zweierkette](https://fm.zweierkette.de/handbuch/spielerattribute-football-manager/), citing community/editor testing). *(community-measured)*

That single rule produces the entire "he's brilliant but you never know which version turns up" archetype with one integer. Consistency cannot be trained; it improves only slowly with experience ([FM.Zweierkette comment thread](https://fm.zweierkette.de/handbuch/spielerattribute-football-manager/)).

### 2.3 How hidden attributes surface in-game

Hidden attributes are never listed. They leak through five channels:

| Channel | What leaks | Fidelity |
|---|---|---|
| **Personality label** | 8 hidden attributes + Determination + Leadership, collapsed to one word | Very coarse (one word for 10 inputs) |
| **Media Handling Style** | A second, independent collapse of Controversy / Pressure / Temperament | Coarse but orthogonal to personality |
| **Scout/coach report "Pros & Cons"** | Extreme values only, as coloured icons | Medium — the best signal |
| **Match body language** | Pressure, Temperament, Determination, big-match nerves | Real-time, noisy |
| **Behaviour over time** | Loyalty (transfer requests), Ambition (wage demands), Professionalism (training reports), Dirtiness (card count) | Slow but reliable |

The scout-report channel has a specific, delicious rule: **Important Matches is only visible in the pros/cons icons for players aged 22 or over** ([Steam personality guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3141707601)). Below 22 you must guess. That is a deliberate fog-of-war on the single attribute that decides finals.

### 2.4 Personality — the derived label

Personality is computed from **eight hidden attributes (Professionalism, Pressure, Ambition, Important Matches, Sportsmanship, Temperament, Loyalty, Controversy) plus the two visible ones (Determination, Leadership)** ([Steam guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3141707601)). Each label is a threshold box. Selected examples, translated from FM.Zweierkette's table ([source](https://fm.zweierkette.de/handbuch/persoenlichkeit/)):

| Personality | Threshold rule (1–20) | Read |
|---|---|---|
| Model Citizen | Prof 15–20, Amb 12–20, Press 14–20, Sports 15–20, Loyal 15–20, Temp 15–20, Det 14–20 | Best in game |
| Model Professional | Prof 20, Temp 10–20 | Elite trainer |
| Professional | Prof 18–19, Temp 10–20 | Excellent |
| Perfectionist | Prof 14–20, Amb 14–20, Det 14–20 | Excellent, demanding |
| Resolute | Prof 15–17, Det 15–17 | Very good |
| Driven | Det 18–20, Amb 12–20 | Very good |
| Determined | Det 18–20, Amb <12, Prof <18 | Good, narrow |
| Ambitious | Amb 16–19, Loyal 7–9, Det <18, Prof <18 | Good, flight risk |
| Mercenary | Amb 16–18, Loyal 1–3 | Talented, disloyal |
| Loyal | Loyal 18–19, Amb 6–7 | Attachment over ambition |
| Devoted | Loyal 20, Amb 6–7 | Extreme loyalty |
| Balanced | everything else | **Meaningless for real players — see below** |
| Casual / Slack / Temperamental / Spineless / Low Self Belief / Low Determination / Easily Discouraged / Fickle / Unambitious | negative boxes | **Newgen-only** |

Two implementation details with real design value:

1. **"Balanced" is a legal fig leaf.** Real players whose hidden attributes would produce a negative label are shown as *Balanced*, because SI will not attach a pejorative word to a real person ([FM.Zweierkette](https://fm.zweierkette.de/handbuch/persoenlichkeit/)). So in FM24 a real player labelled Balanced is *more likely to be bad* than a newgen labelled Balanced. Genuinely wonderful piece of simulation-of-a-simulation detail.
2. **Negative personalities only exist on generated players.** If you reskin this, generated heroes can carry "Casual"/"Spineless"; named/licensed heroes cannot.

### 2.5 Media Handling Style — nine labels

A second derived label, orthogonal to personality, produced from Controversy / Pressure / Temperament. The nine FM24 styles are: **Confrontational, Evasive, Level-Headed, Media-Friendly, Outspoken, Reserved, Short-Tempered, Unflappable, Volatile** (list confirmed by the per-personality "available media handling styles" tables in the [Steam personality guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3141707601)).

Design point: media handling exists because one word (personality) cannot describe ten numbers. A second, differently-weighted collapse gives the player a second read. Any game that shows only one "personality" tag will feel flatter than FM, and any game that shows all thirteen numbers will feel like a spreadsheet.

---

## 3. Current Ability (CA) and Potential Ability (PA)

### 3.1 The numbers

- Both are integers on a **0–200** scale (some sources say 1–200; 200 is the practical maximum and corresponds to a Messi-at-peak profile) ([sortitoutsi FM26 CA/PA guide](https://sortitoutsi.net/content/75752/fm26-current-ability-potential-ability-and-star-ratings)).
- **CA** is the player's level *now*. It rises with training, minutes, and good coaching; it falls with age, injury, and neglect.
- **PA** is a **hard ceiling**. CA can never exceed PA. PA never changes during a save. Personality, minutes and facilities decide *whether* a player reaches it, never *what* it is ([sortitoutsi](https://sortitoutsi.net/content/75752/fm26-current-ability-potential-ability-and-star-ratings); [FM.Zweierkette](https://fm.zweierkette.de/handbuch/persoenlichkeit/) comment: "das Potenzial ist immer fix").
- For under-21s SI often stores PA as a **negative number** meaning "random in this range", rolled at save start:

| Stored PA | Actual range |
|---|---|
| −10 | 170–200 |
| −95 | 160–190 |
| −9 | 150–180 |
| −85 | 140–170 |
| −8 | 130–160 |
| −75 | 120–150 |
| −7 | 110–140 |
| −65 | 100–130 |
| −6 | 90–120 |
| −55 | 80–110 |
| −5 | 70–100 |
| −4 | 50–80 |
| −3 | 30–60 |
| −2 | 10–40 |
| −1 | 0–20 |

([sortitoutsi](https://sortitoutsi.net/content/75752/fm26-current-ability-potential-ability-and-star-ratings)) *(community-documented editor behaviour)*

### 3.2 How CA is derived from attributes

CA is **not** the sum of attributes. Each attribute carries a **weight**, and the weight **depends on the player's position** ([sortitoutsi](https://sortitoutsi.net/content/75752/fm26-current-ability-potential-ability-and-star-ratings)). Consequences:

- Two players with identical attribute sums can have different CA if they play different positions.
- Retraining a position changes how the same attributes map to CA.
- Pace and Acceleration are weighted heavily across attacking positions, which is why the match engine and the CA formula agree that fast players are good ([FM Dossier age-curve guide](https://fmdossier.dev/guides/age-curves-and-rebuilds) notes CA is "an aggregate of position-weighted attributes").
- The exact weight table is not published by SI; community reconstructions exist but should be treated as approximations *(unverified)*.

**Design implication:** the CA formula is a *lossy compression* of the attribute vector. It exists so that the AI, the transfer market, and the star display have a single scalar to compare. A smaller game can keep the scalar and drop the formula, or vice versa — but keeping both without the position weighting produces nonsense (a goalkeeper and a striker with the same numbers would be "equally good").

### 3.3 Star ratings — always relative, always uncertain

The player never sees CA or PA. They see **0.5–5 stars**, and the stars are **relative to your own squad**, not to a global scale:

- A 3-star midfielder at a League Two club may be a 1-star player at a top-flight club. Nothing about the player changed; the benchmark did ([FM Dossier star-rating guide](https://fmdossier.dev/guides/star-ratings-explained); [sortitoutsi](https://sortitoutsi.net/content/75752/fm26-current-ability-potential-ability-and-star-ratings)).
- Signing a 160 CA star **pushes everyone else's stars down** — a 150 CA player drops from 5 to 4.5 stars ([sortitoutsi](https://sortitoutsi.net/content/75752/fm26-current-ability-potential-ability-and-star-ratings)).
- **Gold stars** = normal senior rating. **Silver/grey stars** = the player is below the display floor, usually youth; five silver stars is worth less than half a gold star. **White stars** = a *range*: filled stars are the floor, white extensions are the ceiling of the staff's estimate ([FM Dossier](https://fmdossier.dev/guides/star-ratings-explained); [sortitoutsi](https://sortitoutsi.net/content/75752/fm26-current-ability-potential-ability-and-star-ratings)).
- Accuracy is a function of the **assessor's Judging Player Ability / Judging Player Potential** and of **scouting knowledge %**. Low knowledge → wide white range. Full knowledge → single number ([FM Dossier](https://fmdossier.dev/guides/star-ratings-explained)).
- Attribute values themselves converge honestly: an unscouted player shows *ranges* (e.g. 8–12) which narrow to a single correct value regardless of scout quality — **it is the stars, not the attributes, that lie** ([FM.Zweierkette comment, sourced from SI behaviour](https://fm.zweierkette.de/handbuch/persoenlichkeit/)).

That last point is the most transferable idea in the whole system: **the underlying data is true; the estimate of the ceiling is the thing that is unreliable.** Fog of war on PA, not on attributes.

### 3.4 The information chain for PA

1. Player exists with PA (fixed or rolled).
2. Scout with JPP watches; knowledge % climbs.
3. Report shows potential stars, initially as a wide white range.
4. Range narrows with knowledge; a bad JPP keeps it wrong with confidence.
5. Even at 100% knowledge you get stars, never the number.
6. The number is only ever visible in the editor or third-party tools (Genie Scout, FM in-game editor, FM Dossier).

There is no in-game way to learn a player's exact PA. Ever. That is a design choice, not an oversight.

---

## 4. Positions, familiarity, roles and duties

### 4.1 The position grid

FM24 uses 14 position slots, arranged in the familiar vertical grid:

```
                 GK
        DR      DC      DL
        WBR     (DC)    WBL
                 DM
        MR      MC      ML
        AMR     AMC     AML
                 ST
```

Canonical abbreviations in use: **GK, DR, DC, DL, WBR, WBL, DM, MR, MC, ML, AMR, AMC, AML, ST**. Centre slots can be split into C/R/L variants (DC, DM, MC, AMC, ST) giving up to ~25 addressable cells in the tactics UI. FM26 additionally exposes wide-centre-back roles on DC(R) and DC(L) ([FM26 role explorer](https://fm.guidetofootball.com/fm26/roles/)).

### 4.2 Position familiarity — seven tiers, 0–20

Each player has a **0–20 familiarity score for every position**, shown as a word:

| Score | Label | Meaning |
|---|---|---|
| 18–20 | Natural | No penalty; plays to full ability |
| 15–17 | Accomplished | Performs well, small penalty |
| 12–14 | Competent | Convincing on a regular basis |
| 9–11 | Unconvincing | Can fill in briefly |
| 5–8 | Awkward | Struggles; emergency only |
| 2–4 | Makeshift | Liability |
| 0–1 | Ineffectual | Cannot play there |

([sortitoutsi retraining guide](https://sortitoutsi.net/content/67473/fm24-guide-how-to-retrain-players-position) — the only source I found that publishes the numeric cut-points for all seven tiers)

Note that many guides and even some tooltips only show five tiers (Natural / Accomplished / Competent / Unconvincing / Awkward); the full data model has seven, and "Makeshift"/"Ineffectual" appear when a player is catastrophically misplaced.

**Penalty magnitude** *(community-measured, [fm-arena](https://fm-arena.com/thread/1087-the-position-rating-and-its-impact-on-the-performance/))*:

| Familiarity | Effectiveness vs Natural |
|---|---|
| Natural | 100% |
| Accomplished | ~90% |
| Competent | ~85% |
| Unconvincing | ~80% |
| Awkward | ~65% |
| Ineffectual | ~60% |

A competing claim from FMInside (via [FM Dossier](https://fmdossier.dev/guides/position-role-and-duty)) is that being out of position specifically suppresses **Positioning and Decisions** rather than applying a flat multiplier. Both are consistent with the observed magnitude; the flat-percentage model is easier to implement.

**Retraining:** you can train a new position. It takes roughly **6–9 months** to gain competence in a brand-new position and about **12 months** to reach Natural, with match experience accelerating it, younger players learning faster, and **Versatility** (hidden) as the main modifier ([sortitoutsi](https://sortitoutsi.net/content/67473/fm24-guide-how-to-retrain-players-position); [FM.Zweierkette](https://fm.zweierkette.de/handbuch/spielerattribute-football-manager/)).

### 4.3 Role and duty — the behaviour layer

Three nested layers, in FM24:

- **Position** = *where* the player stands (the skeleton).
- **Role** = *what he does there* — a bundled instruction set covering movement, pressing, passing risk, width, and defensive responsibility.
- **Duty** = *how boldly* — **Defend / Support / Attack**, plus the centre-back specials **Stopper** and **Cover**, plus **Auto** for a few roles (the duty then floats with team mentality).

([FM Dossier](https://fmdossier.dev/guides/position-role-and-duty), which also documents that FM26 removed duties.)

Concretely, duty changes: how far forward the player runs, how often he leaves his position, how much risk he takes in possession, how aggressively he presses, and how many teammates he commits forward. A Full-Back on Defend stays behind the ball; the same player on Attack overlaps relentlessly ([FM Dossier](https://fmdossier.dev/guides/position-role-and-duty)).

**Role suitability display.** In the tactics screen, each role/duty combination is presented next to the selected player with a **coloured circular indicator** — greener/more filled = better fit, redder/emptier = worse — and the player's attribute panel tints the **key attributes green** and **preferable attributes blue** for that role. Some skins and coach reports express the same thing as a **star rating** for "best role". The circle/star is *derived from attributes*, not from familiarity, so a Natural centre-back can still be a red circle as a Ball-Playing Defender ([sortitoutsi](https://sortitoutsi.net/content/67473/fm24-guide-how-to-retrain-players-position); [FM Dossier](https://fmdossier.dev/guides/position-role-and-duty); widget appearance is skin-dependent — *(unverified)* for exact glyphs).

### 4.4 Example roles by position band

| Band | Role | Available duties | Behaviour in one line |
|---|---|---|---|
| **GK** | Goalkeeper | Defend | Stays home, makes saves, simple distribution |
| | Sweeper Keeper | Defend / Support / Attack | Ventures out to sweep and start counters |
| **DC** | Centre-Back | Defend / Stopper / Cover | Holds line; Stopper steps out; Cover drops |
| | Ball-Playing Defender | Defend / Stopper / Cover | Same, plus line-breaking passes from deep |
| | No-Nonsense Centre-Back | Defend (± Stopper/Cover *(unverified)*) | Clears it, never takes a risk |
| | Wide Centre-Back | Defend / Support / Attack | Wide CB who overlaps like a full-back |
| | Libero | Defend / Support | Steps into midfield and playmakes |
| **FB / WB** | Full-Back | Defend / Support / Attack / Auto | Balanced wide defender; overlaps on Attack |
| | Wing-Back | Defend / Support / Attack / Auto | More attacking; primary width provider |
| | Inverted Wing-Back | Defend / Support / Attack / Auto | Tucks into midfield to overload centre |
| | Inverted Full-Back | Defend | Becomes a third centre-back in possession |
| | No-Nonsense Full-Back | Defend | Pure defensive full-back |
| | Complete Wing-Back | Support / Attack | Free role; roams inside and out |
| **DM** | Defensive Midfielder | Defend / Support | Screens the back four, recycles |
| | Anchor | Defend | Never leaves the hole in front of defence |
| | Half-Back | Defend | Drops into the back line in possession |
| | Deep-Lying Playmaker | Defend / Support | Deep passing hub |
| | Regista | Support | Free, aggressive deep creator |
| | Ball-Winning Midfielder | Defend / Support | Presses and tackles, simple passes |
| | Segundo Volante | Support / Attack | Late-arriving goalscoring 6 in a double pivot |
| **CM** | Central Midfielder | Defend / Support / Attack / Auto | The generalist |
| | Box-to-Box Midfielder | Support | Shuttles vertically, arrives late |
| | Carrilero | Support | Shuttles laterally, covers the flanks |
| | Mezzala | Support / Attack | Plays in the half-spaces like a wide 8 |
| | Advanced Playmaker | Support / Attack | Creative hub, seeks the ball |
| | Roaming Playmaker | Support | Creative B2B, roams |
| **AM** | Attacking Midfielder | Support / Attack | Links midfield and attack |
| | Enganche | Support | Static classic 10, pure supplier |
| | Trequartista | Attack | Free-roaming creator, no defensive work |
| | Shadow Striker | Attack | Attacks the box from deep |
| **Wide** | Winger | Support / Attack | Stays wide, beats his man, crosses |
| | Inverted Winger | Support / Attack | Cuts inside, shoots or combines |
| | Inside Forward | Support / Attack | Direct diagonal runner from the flank |
| | Wide Playmaker | Support / Attack | Drifts inside to create |
| | Defensive Winger | Defend / Support | Presses the opposition full-back |
| | Wide Target Forward | Support / Attack | Physical aerial outlet on the flank |
| | Raumdeuter | Attack | Pure off-ball space-finder |
| | Wide Midfielder | Defend / Support / Attack / Auto | Balanced, teamwork-first wide player |
| **ST** | Advanced Forward | Attack | Leads the line, runs channels, presses |
| | Deep-Lying Forward | Support / Attack | Drops in, links, creates |
| | Complete Forward | Support / Attack | Does everything; very demanding |
| | Target Forward | Support / Attack | Holds the ball up, wins headers |
| | Poacher | Attack | Only scores; needs service |
| | Pressing Forward | Defend / Support / Attack | Defends from the front |
| | False Nine | Support | Drops into midfield to create space |
| | Trequartista | Attack | Free role centre-forward creator |

Duty availability per role taken from the FM24 role portraits at [FM.Zweierkette](https://fm.zweierkette.de/taktik/spielerrollen-fm/); role inventory corroborated by [GiveMeSport's FM24 role list](https://www.givemesport.com/football-manager-2024-gaming-all-player-roles/). GiveMeSport counts "over 40" roles across the 14 slots; the table above enumerates ~55 position-role combinations.

**The design lesson:** the role list is not 55 behaviours. It is roughly **8 behaviour dials** — (1) width, (2) depth of starting position, (3) run frequency, (4) press trigger, (5) passing risk/directness, (6) dribble frequency, (7) creative freedom, (8) defensive discipline — and roles are just named presets of those dials. FM26 made this explicit by publishing each role's "playing methods" and "instructions" as a list (see §4.5). That is the model to copy: **dials underneath, names on top.**

### 4.5 FM26: duties are gone

FM26 replaced the role+duty pair with **two role slots per player: an In-Possession (IP) role and an Out-of-Possession (OOP) role**. Duties no longer exist ([FM Dossier](https://fmdossier.dev/guides/position-role-and-duty); [FM.Zweierkette's FM26 role list](https://fm.zweierkette.de/handbuch/fm-spielerrollen-liste/), which opens by stating that since FM26 you assign two roles, one for each phase).

Why: a single Defend/Support/Attack dial had to describe two different game states, and a modern wing-back bombs forward in possession but drops into a conservative slot out of it. One dial cannot express both ([FM Dossier](https://fmdossier.dev/guides/position-role-and-duty)).

Consequences:

- The tactics screen has four views: In Possession, Out of Possession, Both, Combined.
- SI reports **32 new roles** added for FM26 ([FM.Zweierkette](https://fm.zweierkette.de/handbuch/fm-spielerrollen-liste/)). The FM26 role explorer lists **82 role records**, counting a role once per phase it can be used in ([Guide to Football FM26 role explorer](https://fm.guidetofootball.com/fm26/roles/)).
- Roles now advertise explicit **instructions/behaviours** (e.g. *Holds Position, Stays Wide, Take More Risks*) and **playing methods** (e.g. *Passes into space, Creative freedom, Roaming movement*) — a much more data-driven model than FM24's prose descriptions ([Guide to Football](https://fm.guidetofootball.com/fm26/roles/)).

**Old → new mapping (partial), useful if you want to reuse FM24 vocabulary:**

| FM24 role | FM26 equivalent(s) |
|---|---|
| Anchor | Screening Defensive Midfielder |
| Half-Back | Dropping Defensive Midfielder |
| Segundo Volante | Box-to-Box Midfielder (DM) |
| Carrilero | Wide Central Midfielder |
| Mezzala | Channel Midfielder |
| Trequartista | Free Role |
| Enganche | (absorbed into Advanced Playmaker / Free Role) |
| Shadow Striker | Second Striker |
| Complete Wing-Back | Advanced Wing-Back |
| Libero | Advanced Centre-Back |
| Raumdeuter | Wide Forward |
| Inside Forward | Half-Space Forward |
| Inverted Winger | Half-Space Winger |
| Wide Target Forward | (no direct equivalent in the published list) |
| Defensive Winger | Tracking Winger |
| No-Nonsense Centre-Back | No-Nonsense Centre-Back (kept) |

Derived from the FM26 per-position tables at [FM.Zweierkette](https://fm.zweierkette.de/handbuch/fm-spielerrollen-liste/).

---

## 5. Player traits (PPMs)

**Player Preferred Moves** — renamed **Traits** in FM26 (the SI bug tracker has a public ticket literally titled "Player Traits have changed in FM26.2 UI" ([SI bug tracker](https://community.sports-interactive.com/bugtracker/2103_football-manager-26-console-bug-tracker/user-interface/ps5/player-traits-have-changed-in-fm262-ui-r45231/)); FM.Zweierkette still glosses them as "Spielereigenschaften (früher: bevorzugte Spielweisen)"). They are **named behaviours that override or supplement tactical instructions**.

### 5.1 The full FM24 trait list, by group

Grouping and English names from [FM.Zweierkette's PPM reference](https://fm.zweierkette.de/handbuch/spielereigenschaften-ppms/).

**Movement / positioning (19)**

| Trait | Effect |
|---|---|
| Arrives Late In Opponents Area | Delays box runs; arrives for cutbacks |
| Comes Deep To Get Ball | Drops toward his own half to receive |
| Cuts Inside From Left/Right Wing | Leaves the flank with the ball |
| Cuts Inside From Both Wings | Same, either side |
| Runs With Ball Down The Left/Right | Prefers to carry down one flank |
| Runs With Ball Through The Centre | Prefers central carries |
| Gets Forward Whenever Possible | Abandons defensive shape to attack |
| Gets Into Opposition Area | Enters the box off the ball |
| Hugs The Touchline | Stays maximally wide |
| Knocks The Ball Past His Opponent | Push-and-chase dribbling |
| Likes To Try To Beat Offside Trap | Times runs off the last defender |
| Moves Into Channels | Drifts into half-spaces |
| Penalty Box Player | Lives in the box |
| Plays One-Twos | Seeks give-and-go |
| Plays With Back To Goal | Receives facing his own goal |
| Runs With The Ball Often | Frequent dribbles |
| Runs With The Ball Occasionally | Occasional dribbles |
| Runs With The Ball Rarely | Minimal dribbling |
| Stays Back At All Times | Never joins attacks |

*(That group lists 19 items because "Runs With Ball" has three mutually exclusive frequency variants — a nice example of traits as an enum, not a boolean.)*

**Passing (11)**

| Trait | Effect |
|---|---|
| Dictates Tempo | Slows and controls the rhythm |
| Likes To Switch Ball To Other Flank | Cross-field switches |
| Looks For Pass Rather Than Attempting To Score | Pass-first in the box |
| Plays Short Simple Passes | Low-risk short passing |
| Stops Play | Holds the ball to reset shape |
| Tries Long Range Passes | Attempts long diagonals |
| Tries Killer Balls Often | High-risk through balls |
| Plays No Through Balls | Avoids through balls |
| Uses Long Throw To Start Counter Attack | Long throws as transition weapon |
| Crosses Early | Early delivery instead of reaching the byline |
| Likes Ball Played Into Feet | Prefers feet, not space |

**Shooting (10)**

| Trait | Effect |
|---|---|
| Attempts Overhead Kicks | Bicycle kicks |
| Likes To Lob Keeper | Chip finishes |
| Likes To Round Keeper | Dribbles around the goalkeeper |
| Places Shots | Placement over power |
| Refrains From Taking Long Shots | Ignores long-range chances |
| Shoots From Distance | Takes long shots |
| Shoots With Power | Power over placement |
| Tries First Time Shots | Volleys/first-time finishes |
| Hits Free Kicks With Power | Power free kicks |
| Tries Long Range Free Kicks | Long-distance free kicks |

**Defensive (3)**

| Trait | Effect |
|---|---|
| Dives Into Tackles | Slides in; higher win rate, higher foul/card rate |
| Does Not Dive Into Tackles | Stays on his feet |
| Marks Opponent Tightly | Tight man-marking |

**Technical (10)**

| Trait | Effect |
|---|---|
| Avoids Using Weaker Foot | Always shifts to strong foot |
| Curls Ball | Curled passes and shots |
| Dwells On Ball | Holds the ball too long |
| Carries Ball Out Of Defence | Runs the ball out from the back |
| Tries To Play Way Out Of Trouble | Dribbles out of pressure instead of clearing |
| Uses Outside Of Foot | Outside-of-boot passes |
| Tries Tricks | Flicks, nutmegs, showboating |
| Moves Ball To Left/Right Foot Before Dribble Attempt | Pre-loads the dribble onto the strong foot |
| Likes To Beat Man Repeatedly | Keeps taking on the same defender |
| Possesses Long Flat Throw | Long flat throw-ins |

**Discipline (3)**

| Trait | Effect |
|---|---|
| Argues With Officials | Complains; card risk |
| Gets Crowd Going | Celebrates with/incites the crowd |
| Winds Up Opponents | Provokes opponents; card risk |

**Counts:** this enumeration totals **56 entries** across the six groups. The in-game list is slightly larger (a handful of goalkeeper-flavoured and rare behaviours are missing from my enumeration), and the number is fuzzy because some entries are mutually exclusive enums rather than independent traits. FM.Zweierkette's grouping is editorial; the game groups them differently, and FM26 re-organised the UI.

### 5.2 How traits are learned and lost

- **Training:** you ask a coach to teach a trait. Typical completion is **~6 months**, varying with the player's suitability and professionalism, and **the training can fail outright** ([FM.Zweierkette](https://fm.zweierkette.de/handbuch/spielereigenschaften-ppms/)). *(community-measured)*
- **Mentoring:** traits transfer from mentors to younger players in a mentoring group. This is why you must audit your mentors' traits before assigning them ([FM.Zweierkette youth guide](https://fm.zweierkette.de/training/jugendarbeit-football-manager/)).
- **Unlearning:** the same conversation offers "stop doing X", with the same time and failure risk.
- **Weak-foot training was removed** as a manager instruction in FM21; players occasionally improve it on their own, apparently influenced by professionalism ([FM.Zweierkette comment thread](https://fm.zweierkette.de/handbuch/spielereigenschaften-ppms/)).
- Traits are **not** free: a trait that contradicts the assigned role can make a player unusable there — the canonical example being a defensive midfielder with "Gets Forward Whenever Possible" in a holding role ([FM.Zweierkette](https://fm.zweierkette.de/handbuch/spielereigenschaften-ppms/)).

**Design lesson:** traits are the cheapest source of *character* in the whole model. They are one-line, human-readable, and they explain away bad behaviour that would otherwise look like a bug ("he keeps shooting from 30 yards" → *Shoots From Distance*). A guild game should ship 15–25 of them, and should let players *see* the trait on the hero card.

---

## 6. Condition, availability, and personal details

### 6.1 The three live state variables

| Variable | Range | Meaning | Decay / recovery |
|---|---|---|---|
| **Condition** | 0–100% | Immediate physical freshness | ~−25% per 90 minutes; ~10 days to fully recover; updates at midnight; 50% sharpness recovers to ~66%, 100% sharpness to ~68%, Natural Fitness 20 to ~74% |
| **Match Sharpness** (a.k.a. match fitness) | 0–100% | Match-specific readiness | Decays without matches; decay rate scales with Natural Fitness (Nat 10 loses ~8% in 15 days, ~22% in 4 weeks; Nat 20 loses ~2% in 4 weeks) |
| **Jadedness** | flag / hidden | Accumulated fatigue over weeks | Triggers "needs a rest"; community testing suggests it matters much less than sharpness |

All figures *(community-measured)* from [fm-arena's fitness research thread](https://fm-arena.com/thread/15972-how-to-optimize-player-fitness-and-why-it-s-crucial/). The headline finding is counter-intuitive and very usable: **sharpness matters more than condition.** A 90%→100% sharpness difference was measured at ~33% win-rate difference, versus ~23.5% for Pace/Acceleration 10→18. Players at 87% condition with full sharpness outperform fresh players who have not played.

Sharpness gain per 90 competitive minutes *(community-measured, same source)*: ~9% at 50–65% sharpness, 8% at 70%, 6% at 80%, 2% at 90%. Friendlies give ~55% of the competitive rate, capped around +5% per match, with ~10 minutes enough for +1%.

### 6.2 Injuries

- Injuries have a **type** (e.g. pulled hamstring, damaged knee cartilage, fractured ribs), a **severity**, and an **expected recovery time** expressed in days/weeks/months.
- **Short-term injuries** are handled by club physios; **long-term injuries** are referred to specialists ([GiveMeSport medical centre guide](https://www.givemesport.com/football-manager-2024-medical-centre-guide/)).
- **Injury Proneness** (hidden) is the per-player multiplier on injury probability; **Natural Fitness** speeds recovery; **age**, **condition**, **match load** and **training load** are the other inputs.
- **Setbacks** exist: a player returning from a long injury can re-injure if rushed, which is why the medical centre lets you park him on light fitness work.
- The **Medical Centre** has five tabs: Overview (sharpness + fatigue), Risk Assessment (match load vs training load, who is at risk), Current Injuries, Injury History (days missed in last 12 months, comparison vs league), Season Summary (cumulative weeks and % missed) ([GiveMeSport](https://www.givemesport.com/football-manager-2024-medical-centre-guide/)).

### 6.3 Morale and body language

- **Morale** runs from **Abysmal** to **Superb** ([FMScout morale guide](https://www.fmscout.com/a-morale-and-relationships-in-football-manager.html)). It is driven by: playing time relative to squad status, recent results and personal form, training happiness, your conversations and team talks, media stories, contracts and wage parity with teammates, transfer activity, adaptation to a new country, and relationships with you and with teammates.
- **Body language** is a live, in-match read on morale + Pressure + Temperament + Determination: nervous, complacent, fired-up, looking motivated, overwhelmed, frustrated, etc. It is the main way hidden mental attributes become visible *during* a match (see the SI/community body-language threads: [SI forums](https://community.sigames.com/forums/topic/439874-body-language-anyone-know-what-the-results-are/), [fm-base](https://fm-base.co.uk/threads/body-language.119070/)). *(the exact label list is large and skin/version dependent — do not treat any list as canonical)*.
- **Suspensions** (cards) and **registration/eligibility** rules are separate availability gates.

### 6.4 Personal details (the "civil identity" block)

| Field | Values / notes |
|---|---|
| Age | Drives development curve, wage demands, resale value |
| Date of birth | Determines youth-intake and contract rules |
| Height | Feeds the Jumping Reach floor (see §1.3) |
| Weight | Cosmetic + minor physical modelling *(unverified as to effect)* |
| Left foot / Right foot | Strong foot is always 20; weak foot is 1–20, shown in bands |
| Weak-foot display bands | 18–20 Very Strong · 15–17 Strong · 12–14 Fairly Strong · 9–11 Reasonable · 5–8 Weak · 1–4 Very Weak ([FM.Zweierkette](https://fm.zweierkette.de/handbuch/spielerattribute-football-manager/)) |
| Personality | Derived label (§2.4) |
| Media Handling Style | Derived label (§2.5) |
| Social groups / hierarchy | Dressing-room cliques; influence flows down the hierarchy |
| Team character | Squad-level aggregate personality, 4 tiers of professionalism (Fairly Professional → Professional → Very Professional → Ultra Professional) ([FM.Zweierkette youth guide](https://fm.zweierkette.de/training/jugendarbeit-football-manager/)) |
| Reputation | Current / home / world; gates transfers, selection, media |
| Squad status / playing time | See §8 |
| Languages, favoured clubs/people | Flavour + adaptation modifiers |

Both feet matter mechanically: a strong weak foot is a real advantage in the match engine and **counts toward CA**, so two-footed players pay for it elsewhere ([FM.Zweierkette](https://fm.zweierkette.de/handbuch/spielerattribute-football-manager/)).

### 6.5 How the UI presents all this

| Signal | Presentation | Where |
|---|---|---|
| Condition | % number + green/amber/red bar | Squad view, player profile, tactics |
| Match sharpness | % + separate bar, often with a "match fit" icon | Squad view, medical centre |
| Jadedness | Battery/zzz-style icon, "needs rest" text | Squad view |
| Injury | Red cross + "OUT" + return date | Squad view, selection |
| Suspension | Card icon + matches remaining | Squad view |
| Training status | "Trn" style markers / training happiness icon | Squad view |
| Sharpness lost | "Lst" / "needs match practice" markers | Squad view *(exact glyphs skin-dependent)* |
| Morale | Text label + colour (Abysmal→Superb) | Profile, team talk screens |
| Body language | Live text column | Match screen |
| Injury risk | Traffic-light risk rating | Medical centre |

*(Icon inventory is observational; abbreviation strings vary by skin and FM version — treat specific glyph names as (unverified).)*

---

## 7. Development model

### 7.1 What drives attribute growth

| Driver | Effect |
|---|---|
| **Age** | Determines *which* attribute group grows (§7.2) |
| **Training** | Team training (general/unit/individual) + individual role training + additional focus |
| **Match experience** | Essential; level of competition matters more than volume; ~25–30 matches/season is the sweet spot for a developing player *(community-measured)* |
| **Personality** | Professionalism is the dominant term; Ambition and Determination are secondary ([FM.Zweierkette](https://fm.zweierkette.de/training/jugendarbeit-football-manager/)) |
| **Coaching** | Coach quality in the relevant category, plus facilities |
| **Mentoring** | Transfers hidden attributes *and* traits |
| **CA↔PA gap** | A gap of 20+ CA points drives the fastest growth; at the ceiling, growth stops regardless of age ([FM Dossier](https://fmdossier.dev/guides/age-curves-and-rebuilds)) |
| **Injury / minutes lost** | Direct brake on growth |

### 7.2 The age curve

FM's development is **attribute-group-specific**, which is the detail most clones miss:

| Age band | What grows most easily | Manager's usual play |
|---|---|---|
| ≤17–18 | Physical attributes (Pace, Acceleration, Agility, Stamina) | Let it happen; train technical/mental |
| 18–23 | Physical *and* technical; largest CA jumps | Heavy individual role training |
| 24–29 | Technical attributes peak ([FM.Zweierkette](https://fm.zweierkette.de/training/jugendarbeit-football-manager/)) | Maintain physical, sharpen technique |
| 30+ | Mental attributes still improve; physical declines | Convert to a less physical role |

Position-specific peaks *(community/analyst consensus summarised by [FM Dossier](https://fmdossier.dev/guides/age-curves-and-rebuilds))*: wingers and forwards 22–27, full-backs 23–27, central midfielders 25–30, centre-backs 28–32, goalkeepers 28–34.

**Natural Fitness sets the slope** of physical decline after the peak; **Professionalism** sets how long the plateau lasts.

### 7.3 Development tooling that the player actually touches

- **Individual training**: assign a role to train; its key attributes are highlighted; add an **additional focus** (e.g. "Quickness", "Ball Control") to attack a specific weakness.
- **Position training**: retrain a position (6–12 months).
- **Trait training**: learn/unlearn a PPM (~6 months, can fail).
- **Mentoring groups**: 1–3 senior mentors + young players; effect depends on age gap, first-team appearances, hierarchy difference, and social-group overlap. Mentors can pass on both hidden attributes and PPMs.
- **Ambassador role**: a one-off "welcome the new signing" conversation that can nudge a new player's personality (FM24) ([FM.Zweierkette](https://fm.zweierkette.de/training/jugendarbeit-football-manager/)).
- **Loans**: development depends on the loan club's level, facilities, and guaranteed playing time. A bad loan is worse than staying.

### 7.4 How development is visualised

| Visual | What it shows |
|---|---|
| **Attribute arrows** (green up / red down) | Recent change per attribute, on the attributes panel |
| **Development → Progress graph** | CA plotted against age, with the PA ceiling implied by the flattening curve |
| **Development → Attributes** | Numeric change column over a chosen period |
| **Coach report text** | "Has improved markedly in…", "Has stalled", "Would benefit from…" |
| **Star movement** | Potential stars narrow as knowledge grows; current stars move with CA relative to squad |
| **Training happiness / workload** | Whether the player thinks he is being over- or under-trained |

The arrows are the emotional core: a green arrow next to a 17-year-old's Finishing is the entire reward loop of youth development. If a guild game has one development UI element, make it this one.

---

## 8. Contracts and squad status as player-model concepts

### 8.1 The contract object

| Element | Detail |
|---|---|
| **Wage** | Weekly; the primary cost and the primary morale lever (wage parity with teammates matters) |
| **Length** | Typically 1–5 years, plus an optional club/player extension year |
| **Contract type** | Full-time, part-time, youth, non-contract, amateur; MLS/A-League have special rules ([Fandom: Contract](https://footballmanager.fandom.com/wiki/Contract)) |
| **Signing-on fee** | Lump sum at signature |
| **Agent fee** | Paid to the agent, not the player |
| **Bonuses** | Appearance, goal, assist, clean sheet, unused-substitute, team-of-the-year, promotion, cup run, international caps |
| **Wage rises** | Yearly percentage increase; promotion/relegation wage change clauses |
| **Loyalty bonus** | Paid annually for staying |
| **Release clauses** | Minimum-fee release clause (domestic and/or foreign clubs), relegation release clause |
| **Sell-on clause** | Percentage of a future transfer fee (or of profit) owed to the selling club |
| **Loan terms** | Loan fee, wage contribution %, recall option, future fee option |

*(Bonus and clause inventories are assembled from the Fandom contract page and FM24 in-game negotiation categories; the exact list presented varies by league and club status — treat specific bonus names as (unverified).)*

### 8.2 Squad status / playing time

The contract explicitly encodes **how much the player expects to play**, and this single field drives wage demands, morale, and transfer requests:

| Status | Expectation | Notes |
|---|---|---|
| **Key Player** | Starts almost every game | Highest wage; complains fastest about rotation |
| **First Team** | Regular starter | |
| **Rotation** (older FMs: "Squad Player") | Regular minutes, not every game | |
| **Backup** | Occasional minutes | Low wage expectation |
| **Hot Prospect** | Developmental minutes; U21 only | Cannot demand big wages |
| **Youngster** | Youth-team football; U21 only | Lowest expectation |

([Fandom: Contract](https://footballmanager.fandom.com/wiki/Contract) — note that FM24's in-game label for the middle tier is "Rotation"; older versions and some guides say "Squad Player", and "Not Needed"/"Surplus to Requirements" are *transfer* statuses rather than contract statuses — *(unverified for FM24 exact strings)*.)

The behavioural loop this creates is the best part of FM's contract model: **status is a promise, and minutes are the payment.** A Key Player who is rested for three league games becomes unhappy, and an unhappy Key Player poisons the dressing room through the social-group system. Status is not a label, it is a debt.

### 8.3 Transfer status (orthogonal to contract status)

Not Needed · Surplus to Requirements · Transfer Listed · Loan Listed · Development List · Not Transfer Listed. These change AI bidding behaviour and player morale, and they are the manager's main tool for forcing an exit.

---

## 9. Model complexity budget

A blunt assessment of what earns its keep in a management sim's *feel*, and what is FM-specific depth that a smaller game should cut, compress, or fake.

### 9.1 Load-bearing — do not cut

| Element | Why it is load-bearing |
|---|---|
| **A ~20–25 attribute vector in 1–10 or 1–20** | The whole scouting/selection loop is "read the card, imagine the player". Fewer than ~18 attributes loses archetypes; more than ~30 is unreadable without FM's 20 years of vocabulary. |
| **Role + duty (or IP/OOP) as a behaviour modifier** | This is the actual game. Without it, team selection is just "pick the highest numbers". |
| **Position familiarity as a graded penalty** | Creates the "he can do a job there" decision, which is one of the most satisfying in FM. 4 tiers is enough (Natural / Accomplished / Competent / Out of position). |
| **A single hidden ceiling (PA) that is only estimated** | The entire transfer and youth fantasy rests on "he *might* be great". Fog on the ceiling, not on the attributes. |
| **Condition + sharpness as two variables** | The two-clock rotation puzzle (fresh vs match-fit) is the best-designed tension in FM24 and costs almost nothing to implement. |
| **Injuries with duration, not just on/off** | Availability planning needs a *return date*, not a boolean. |
| **Personality as a 3–5 axis hidden vector** | Professionalism / Ambition / Loyalty / Pressure / Temperament. This is what makes heroes feel like people and makes mentoring meaningful. |
| **Traits (15–25, named, visible)** | Highest character-per-byte in the design. |
| **Squad status as a promise** | Converts a number into an obligation. Cheap, and it generates story. |

### 9.2 Compress — keep the idea, shrink the numbers

| FM feature | Compression |
|---|---|
| 36 outfield attributes | **~20**: 8 technical, 7 mental, 5 physical. Merge Corners/Freekicks/Long Throws into "Set Pieces". Merge Marking+Tackling into "Defending". Merge Off The Ball into "Movement". |
| 13 goalkeeper attributes | **4–5**: Shot Stopping (Handling+Reflexes+One-on-Ones), Aerial (Aerial Reach+Command), Distribution (Kicking+Throwing+Passing), Sweeping (Rushing Out), Composure/Eccentricity as a trait instead of a stat. |
| 13 hidden attributes | **5**: Professionalism, Ambition, Loyalty, Pressure, Consistency. Drop Adaptability, Versatility, Dirtiness, Sportsmanship, Controversy, Important Matches — or fold them into traits ("Big-Game Player", "Hot-Headed", "Cynical"). |
| 7-tier position familiarity | **4 tiers**: Natural / Trained / Makeshift / Cannot play. |
| ~55 FM24 role-slots / 82 FM26 role records | **18–24 roles**, 3 duties each, built from the 8 dials in §4.4. Cover ~90% of archetypes. |
| 1–20 attribute scale | 1–10 or 1–20 with **5 colour bands** and no exact numbers unless scouted. The bands do more work than the digits. |
| 0–200 CA/PA | A **1–5 star** display only, with **white range stars** for uncertainty. Never store or show the scalar. |
| Dual relativeness of stars (squad-relative) | Keep it. It is one line of maths and it creates the "my whole squad got worse when I signed a star" moment that teaches players how the model works. |
| Contract clause zoo | Wage + length + **one** bonus + **one** release clause + sell-on %. |
| Medical Centre (5 tabs) | One availability list sorted by "days out". |

### 9.3 Cut — FM-specific depth with poor return

| Feature | Why cut |
|---|---|
| Media Handling Styles (9 labels) | A second derived label for a payoff most players never use. Personality alone is enough. |
| Social groups + hierarchy + team character tiers | Expensive to model, hard to surface, and its effects are diffuse. Replace with a single "dressing-room mood" scalar + 2–3 named cliques. |
| Jadedness as a separate variable | Condition + sharpness already produce the rotation decision; jadedness is a third clock nobody reads. |
| Feet (strong/weak, 6 display bands) | Adds a beautiful detail (two-footed players) but costs an attribute and a UI slot. Optional. |
| Weight, height-to-JumpingReach table | Height as flavour is fine; the mapping table is trivia. |
| Negative PA randomisation for U21s | Nice for replayability; not needed for feel. |
| Trait learning *failure* and 6-month timers | Keep traits; drop the failure roll. |
| 56+ PPMs | Keep 15–25. Nobody needs both "Runs With Ball Often" and "Runs With Ball Occasionally". |
| 5 goalkeeper tendencies as 1–20 attributes | Make them traits ("Punches Rather Than Catches", "Rushes Out"). |
| Position retraining timers (6–12 months) | Keep retraining; drop the calendar simulation to a single "weeks remaining" counter. |
| Scout JPA/JPP as separate staff attributes | One "Scouting Accuracy" stat per scout. |
| Loan fee structures, wage contribution %, recall clauses | One "loan" state with a wage split. |

### 9.4 A concrete recommended hero schema (my synthesis)

If Guild Manager wants FM's *feel* at ~1/3 the surface area:

**Attributes (20, 1–20):**
*Body (5):* Might, Speed, Agility, Endurance, Recovery
*Skill (8):* Striking, Passing, Control, Tackling, Marking, Aerial, Set Pieces, Flair-on-the-ball
*Mind (7):* Anticipation, Decisions, Composure, Focus, Teamwork, Leadership, Positioning

**Hidden (5):** Professionalism, Ambition, Loyalty, Pressure, Consistency
**Ceiling:** 1–5 stars, shown as a white range until scouted
**Positions:** 4 tiers × ~8 slots
**Roles:** 20 roles × 3 duties, described by the 8 dials
**Traits:** 20, visible on the card
**Live state:** Condition, Sharpness, Injury(days), Morale, Status
**Contract:** Wage, Years, Status, one Release clause, one Sell-on

That is roughly FM's decision density with about a third of FM's data entry burden — and, importantly, every one of those fields maps to a decision the player actually makes.

---

## 10. Quick reference: counts and gotchas

| Thing | Count |
|---|---|
| Technical attributes (outfield) | 14 |
| Mental attributes | 14 |
| Physical attributes | 8 |
| Goalkeeping attributes (shown to GKs) | 13 (11 GK-only + First Touch + Passing) |
| Unique visible attributes | 47 |
| Hidden attributes | 13 |
| Total attributes (per FM.Zweierkette) | 60 |
| Position familiarity tiers | 7 (0–20 scale) |
| Position slots | 14 (up to ~25 with C/R/L splits) |
| FM24 roles (position-role combinations) | ~55 (over 40 distinct roles) |
| FM26 role records | 82 (counted per phase) |
| FM26 new roles added | 32 |
| Personality labels | ~40 (many newgen-only) |
| Media handling styles | 9 |
| Traits / PPMs (FM24) | 56 enumerated here; in-game list is somewhat larger (~70 by most counts *(unverified)*) |
| CA / PA scale | 0–200 |
| Star display | 0.5–5.0, gold / silver / white-range |
| Morale range | Abysmal → Superb |
| Contract playing-time tiers | 6 (Key Player → Youngster) |

**Gotchas that will bite a reskin:**

1. **Aggression ≠ dirtiness.** Two different attributes.
2. **Determination is visible**; Professionalism is not.
3. **Positioning is defensive only**; Off The Ball is its attacking twin.
4. **Jumping Reach already contains height** — do not add height again on top.
5. **Injury Proneness, Controversy, Dirtiness are "lower is better"** — the only inverted attributes in the set.
6. **Eccentricity / Punching / Rushing Out are tendencies, not abilities.**
7. **CA is position-weighted**, so the same attributes are "worth" different amounts at different positions.
8. **Stars are squad-relative**, so they are not comparable across saves, clubs, or time.
9. **FM25 does not exist.** The real discontinuity is FM24 → FM26, and it removed duties.
10. **The GK panel replaces Technical entirely** — a keeper's outfield technical attributes still exist in data but are invisible.

---

## Sources

Primary references read for this document:

- [FIFPlay — Football Manager 2024 Player Attributes](https://www.fifplay.com/football-manager-2024-player-attributes/)
- [sortitoutsi — FM24 Guide: Player's Attributes Explained](https://sortitoutsi.net/content/67538/fm24-guide-players-attributes-explained)
- [sortitoutsi — FM24 Guide: How to Retrain Player's Position](https://sortitoutsi.net/content/67473/fm24-guide-how-to-retrain-players-position)
- [sortitoutsi — FM26: Current Ability, Potential Ability and Star Ratings](https://sortitoutsi.net/content/75752/fm26-current-ability-potential-ability-and-star-ratings)
- [FM.Zweierkette — Alle 60 Spielerattribute](https://fm.zweierkette.de/handbuch/spielerattribute-football-manager/)
- [FM.Zweierkette — Alle Persönlichkeiten im Football Manager](https://fm.zweierkette.de/handbuch/persoenlichkeit/)
- [FM.Zweierkette — Spielereigenschaften (PPMs)](https://fm.zweierkette.de/handbuch/spielereigenschaften-ppms/)
- [FM.Zweierkette — Alle Spielerrollen im FM24](https://fm.zweierkette.de/taktik/spielerrollen-fm/)
- [FM.Zweierkette — Alle Spielerrollen im Football Manager (FM26 list)](https://fm.zweierkette.de/handbuch/fm-spielerrollen-liste/)
- [FM.Zweierkette — Dein Weg zur erfolgreichen Jugendarbeit](https://fm.zweierkette.de/training/jugendarbeit-football-manager/)
- [FM Dossier — Position, Role and Duty: the Difference](https://fmdossier.dev/guides/position-role-and-duty)
- [FM Dossier — FM Star Ratings Explained](https://fmdossier.dev/guides/star-ratings-explained)
- [FM Dossier — Age Curves and Timing a Squad Rebuild](https://fmdossier.dev/guides/age-curves-and-rebuilds)
- [Guide to Football — FM26 Role Explorer](https://fm.guidetofootball.com/fm26/roles/)
- [GiveMeSport — Every Player Role in Football Manager 2024](https://www.givemesport.com/football-manager-2024-gaming-all-player-roles/)
- [GiveMeSport — FM24 Medical Centre Guide](https://www.givemesport.com/football-manager-2024-medical-centre-guide/)
- [Steam Community — Player Personality and Media Handling Style Guide (FM24)](https://steamcommunity.com/sharedfiles/filedetails/?id=3141707601)
- [FMScout — Morale and Relationships in Football Manager](https://www.fmscout.com/a-morale-and-relationships-in-football-manager.html)
- [Football Manager Wiki (Fandom) — Contract](https://footballmanager.fandom.com/wiki/Contract)
- [fm-arena — The 'Position Rating' and its impact on performance](https://fm-arena.com/thread/1087-the-position-rating-and-its-impact-on-the-performance/)
- [fm-arena — How to optimize player fitness and why it's crucial](https://fm-arena.com/thread/15972-how-to-optimize-player-fitness-and-why-it-s-crucial/)
- [SI Forums — attribute colours thread](https://community.sports-interactive.com/forums/topic/558822-attribute-colours/)
- [SI Bug Tracker — Player Traits have changed in FM26.2 UI](https://community.sports-interactive.com/bugtracker/2103_football-manager-26-console-bug-tracker/user-interface/ps5/player-traits-have-changed-in-fm262-ui-r45231/)
- [Wikipedia — Football Manager 26](https://en.wikipedia.org/wiki/Football_Manager_26)

Access notes: sortitoutsi, fminside, medium and the SI forums all sit behind Cloudflare and return 403 to direct fetches; I read them through a text-extraction proxy. fminside's positional-ability guide could not be retrieved at all, so its numeric familiarity thresholds are represented here by sortitoutsi's equivalent table.
