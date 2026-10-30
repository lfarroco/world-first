# The Football Manager Blueprint

*What FM actually looks like, screen by screen, and which parts of that structure we should copy.*

This is the reference document for the UI. It is written to be **actionable for a small web team**: for each area of FM it records the screens, the sub-tabs, the data on them, the lists, the modals, and — most importantly — the *reusable pattern* underneath.

> **Version note.** FM24 is the reference for the classic desktop layout (14-module left sidebar, dense data grids, everything customisable). FM26 rebuilt the interface around **six top-level tabs** — Portal, Squad, Recruitment, Match Day, Club, Career — with a tile-based home screen, a bookmark system and a redesigned player profile ([gamer.org's breakdown](https://www.gamer.org/football-manager-2026-ui-overhaul-revealed/), [SI's own feature page](https://www.footballmanager.com/fm26/features/fm26s-reimagined-user-interface)). **We should copy FM26's information architecture and FM24's data-density habits.** The 14-module sidebar is a liability for a 6-screen browser game; the six-hub model is almost exactly the structure we need.
>
> Raw sourced research behind this document lives in [research](research/).

---

## 1. The shape of FM

### 1.1 FM24: the 14-module sidebar

The persistent left rail, roughly in this order (names as they appear in-game):

| # | Module | Purpose | Verified FM24 sub-tabs |
|---|---|---|---|
| 1 | **Inbox** | The hub. News, decisions, offers, results | Inbox · News · Social Feed |
| 2 | **Squad** | Your players. The master table | **Overview · Squad Planner · Report · Data Hub · Dynamics · Development** ✔ |
| 3 | **Tactics** | Formation, roles, instructions, familiarity | Formations · Roles & Duties · Team/Player/Opposition Instructions · Set Pieces · Match Plans |
| 4 | **Training** | Weekly schedule, individual focus, workload | Overview · Sessions · Schedules · Units · Mentoring · Individual · Coaches ✔ |
| 5 | **Transfers** *(FM24 folds Scouting in here)* | Market, offers, shortlist, scouts | Scouting Centre · Player Search · Shortlist · Recruitment Focus · Assignments · Transfer History |
| 6 | **Club** | Board, vision, expectations, facilities | **Profile · General · News · Facilities · Affiliates · Confidence / Club Vision** ✔ |
| 7 | **Schedule** | Calendar, fixtures, results | Fixtures · Results · Competitions |
| 8 | **Dynamics** | Morale, cohesion, social groups, happiness | **Overview · Hierarchy · Social Groups · Happiness · Code of Conduct** ✔ |
| 9 | **Development Centre** | Youth, loans, player progress | Overview · Loans · Youth Squads · Youth Candidates ✔ |
| 10 | **Staff** | Coaches, scouts, physios + delegation | Responsibilities · Staff list · Staff Search · Job Security |
| 11 | **Finances** | Income, expenditure, budgets, projections | Basic Finances · Expenditure · Income · FFP |
| 12 | **Facilities** | Stadium/training/youth/recovery levels | single screen (also Club ▸ Facilities) |
| 13 | **Medical Centre** | Injuries, risk, recovery | Overview · Injuries · Risk Assessment |

(✔ = verified against SI's official FM24 manual; the rest are observed/partial — see [fm-01-navigation-and-screens.md](research/fm-01-navigation-and-screens.md).)

Plus the **Continue / Processing** control anchored bottom-left, and a top bar with club, date, and the "next event" summary.

Each module has a **horizontal tab bar** with 3–6 sub-tabs. Verified against SI's official FM24 manual:

- Squad → *Overview · Squad Planner · Report · Data Hub · Dynamics · Development*
- Tactics → *Formations · Set Pieces · Opposition Instructions · Analysis* *(indicative)*
- Club → *Profile · Vision · Confidence · General · Facilities* *(indicative)*
- Finances → *Summary · Expenditure · Income · Wages · Transfers* *(indicative)*

Note the shape of the Squad tabs: **Overview** (the table), **Squad Planner** (depth-chart planning), **Report** (textual summary), **Data Hub** (aggregate analytics), **Dynamics** (morale), **Development** (growth). That is six *different questions about the same list* — a good test for our Roster: if a tab doesn't answer a distinct question, it shouldn't exist.

*(The non-Squad tab lists above are indicative and should be re-verified before being quoted; see [fm-01-navigation-and-screens.md](research/fm-01-navigation-and-screens.md) for the sourced version.)*

**Three structural insights worth more than the list itself:**

1. **Dynamics and Development are both a sidebar module *and* a tab on the Squad screen.** The squad is the object; the modules are *lenses* on it. That's why FM doesn't feel like 14 separate apps — everything routes back to "my players". Our Roster should follow this: morale, contracts, fatigue and history are all *views* of the same roster, not separate destinations.
2. **FM has no "Home" module — and when it added one, it partly regretted it.** FM24's landing screen is the club/manager screen (Home on `F2`), which is the gap FM26 filled with **Portal**. The important detail is *how*: SI **merged the tile dashboard into the Inbox**, because telemetry showed players ignored the separate dashboard. "Dashboard + separate message hub" is a pattern FM tried and retreated from; one obligations-first surface wins.
3. **The Side Bar vs Navigation Bar split.** SI distinguishes a rail scoped to *my club only* from a separate world browser (Back / Forward / World). The rule worth adopting literally: **never use your main navigation to browse other guilds.** Other guilds are content you look at *inside* a screen (the Raid hub), not a place you navigate *to*.

**Pattern to steal:** module → tab → table. Three levels, never deeper. Any information the player needs is at most two clicks from the rail.

### 1.2 FM26: six hubs + Portal

The redesign collapsed the rail into six top-level areas ([gamer.org](https://www.gamer.org/football-manager-2026-ui-overhaul-revealed/)):

| Hub | Contains | Our equivalent |
|---|---|---|
| **Portal** | Home. Messages column (replaces the Inbox) + 6 customisable tiles | **Guild Hall** |
| **Squad** | Players, tactics, development, loans | **Roster** + **War Room** |
| **Recruitment** | Player search, scouting, shortlists, transfers | **Tavern** |
| **Match Day** | Tactics, set pieces, opposition reports, the match | **Raid** |
| **Club** | Board, vision, staff, finances, facilities | **Guild** |
| **Career** | Manager profile, badges, progression | **Chronicle / Legacy** (post-MVP) |

Two design lessons from the redesign that matter more than the module list:

1. **They deleted the Inbox** — the single most complained-about feature — and replaced it with a *messages column plus an attention-oriented portal*. (The change was announced for FM25, which was then cancelled; it shipped in FM26. The [Eurogamer report](https://www.eurogamer.net/football-manager-25-to-remove-inbox-ability-to-hammer-demand-more-whenever-youre-losing) still describes the intent accurately.) The lesson is not "inboxes are bad"; it's that **unread message counts are not a prioritisation system.** FM's inbox became a firehose the player learned to skim. We have 3 parties and 20 heroes — we can build a real priority queue instead of a feed.
2. **They added bookmarks.** Players pin the 5–8 screens they actually use and never touch the rest. For a small game this is a gift: we can afford 8 screens, but we should still let the player pin their two favourites to the header.

### 1.3 The information architecture we should build

```
GUILD HALL   ▸ attention queue · daily digest · RWF ticker · week calendar
ROSTER       ▸ hero table · hero sheet (inspector)
TAVERN       ▸ candidate list · hero sheet · signing modal
WAR ROOM     ▸ parties · roles · stance · boss select · ADVANCE DAY
RAID         ▸ leaderboard · boss map · pull log · wipe analysis
GUILD        ▸ finances · contracts · facilities (stub in MVP)
```

Six destinations, and **every one of them is reachable in one click from anywhere.** The Advance Day button persists on every screen (FM's Continue is always visible), because the loop must never be more than one click away.

---

## 2. The Continue loop — the most important thing to copy

FM's loop has three beats, and the middle one is the one people forget:

```
        ①  CONTINUE  ──────────────►  ②  PROCESSING
        (advance time)                  (days tick past, events queue)
              ▲                                │
              │                                ▼
        ④  DECIDE  ◄───────────────  ③  INTERRUPTION
        (small modal, real cost)        (news / offer / injury / request)
```

- **Continue** advances to the next *actionable* moment, not the next day. FM offers "continue to next match", "continue to next day", "on holiday" and a "stop at" mechanism so the player controls granularity.
- **Processing** can be configured as a screen or a subtle bar. FM lets you set which events pause play — this is a usability masterstroke: *the player declares what they consider urgent*.
- **Interruptions** are the game. Every one is a modal with 2–4 options and a consequence.
- **Decisions** are recorded — FM keeps an event log you can reopen, which lets a player reconstruct "why did my season collapse".

**For us:** the Advance Day action must (a) be always visible, (b) produce a **digest**, and (c) produce **attention items** that block the next advance until resolved or dismissed. Our version of FM's "which events pause play" is a per-category toggle in settings; ship with everything on, let power users mute the noise.

### The urgency language FM uses (copy it literally)

| FM device | Meaning | Our use |
|---|---|---|
| Red badge on the sidebar icon | unhandled items in this module | Red dot on tabs with unresolved attention items |
| Inbox item marked "Action Required" | cannot be dismissed, must be resolved | Same, and it disables Advance Day |
| Coloured row / bold text | unread vs read | Unread attention item |
| "Next match in 3 days" in the header | the clock, always visible | "Day 12 / 28 · Boss 3 · 4 days to wages" |
| Contract/offer deadline countdown | time pressure on a decision | Contract expiry counters |

---

## 3. The Squad screen — the table that is the game

If we copy one screen *exactly*, it's this one.

**What it is:** a full-width, sortable, filterable data grid of every player, with a configurable column set and a row that expands into a mini-profile.

**Default columns (FM24-ish):** `Name · Position · Age · Morale · Condition/Sharpness · CA (star) · PA (star) · Wage · Contract expiry · Value · Form · Appearances · Goals · Assists · Average rating`

**The behaviours that make it feel powerful:**
- **Column chooser** — ~60 possible columns, remembered per view.
- **Saved views** — "First team", "Under 21s", "Expiring contracts", "Injured".
- **Filter by attribute range** — e.g. `Passing ≥ 15 AND Age ≤ 23`. This is how FM players *think*: as queries, not lists.
- **Sort by anything, multi-column.**
- **Row hover → quick actions**; row click → full profile. The list and the detail are separate levels of zoom.
- **Position grouping** — GK / DEF / MID / ATT collapsible bands, which turns a flat list into a depth chart.
- **Condition icons in the row itself** — a coloured dot for morale, a heart/bar for condition, a cross for injury. Status is readable without opening anything.
- **Selection** — select several rows to bulk-act (train, rest, loan, sell). FM's selection bar replaces the list with bulk actions.

**Our translation (Roster):**

| FM column | Guild Manager column |
|---|---|
| Name | Hero name + class icon |
| Position | Class + role |
| Age | Level |
| Morale | Morale (icon + %) |
| Condition | Fatigue bar (inverted: "Stamina") |
| CA / PA stars | **Power** (derived, §2.3 of the model) · **Potential** (stars, hidden without scouting) |
| Wage | Weekly wage |
| Contract expiry | Contract days left |
| Form | Last 5 days: ✓ ✓ ✗ — (raided, farmed, rested, wiped) |
| Value | Market value (for poaching/pricing) |

Eight to ten columns in the default view. Everything else behind the inspector. **A browser game lives or dies on whether its roster table is scannable in 2 seconds.**

---

## 4. The player profile — the inspector

FM's player page is the densest screen in the game and is the reason FM feels deep. Its tab structure (FM24):

`Overview | Development (with a Tactics sub-tab holding the position map) | Report | History | Contract | Transfer | Player Interaction | Scout Reports`

Key layout facts:
- **Attribute panel is a 3-column block** (Technical | Mental | Physical) with the 1–20 numbers colour-banded in **five bands**. The exact cut-points are user-editable in Preferences and differ by skin, so there is no canonical mapping; the de-facto reading is **≤5 red (poor) · 6–9 orange (below average) · 10–13 neutral (average) · 14–16 light green (good) · 17–20 bright green (elite)**. Experienced players shift the bands down a tier when managing in a lower division. A player's profile is legible at a glance as a *shape*, not a list of numbers.
- **Attributes are tinted per role** — **green = key attribute, blue = preferable**. Deficiency in a key attribute cannot be compensated by strength in a preferable one. This is how FM teaches the role system without text.
- **There is deliberately no overall rating anywhere.** FM never shows a total, an average, or an OVR; Current Ability exists only internally (for the AI, the market, and star conversion). **This is the one place I'd break from FM** — a browser management game needs one sortable quality column — but only if the *simulation* uses role-weighted scores rather than the headline (see [guild-manager-model.md](guild-manager-model.md) §2.4). A visible OVR plus a role-blind sim would destroy the depth we're trying to build.
- **Role suitability** is shown as a star + a green circle on a pitch diagram — the game tells you which roles a player can play before you ask.
- **Hidden attributes are never shown numerically**; they surface as scout-report prose ("consistent performer", "struggles in big matches", "injury prone").
- **Development tab** plots attribute change over time — the "is he getting better?" answer.
- **Comparison mode** puts two players side by side with deltas — used for every transfer decision.
- Nearly every number has a **tooltip explaining what it does** — the only reason 36 attributes are approachable.

**Our translation (Hero Sheet, a side-panel inspector, not a full page):**

A hero sheet is a **drawer/modal** over the roster table. Blocks, top to bottom:

1. **Header** — portrait, name, class, level, role, power, status chips (fatigued / injured / unhappy / contract).
2. **Attributes** — 3 columns × 4 rows: Physical / Mental / Craft, colour-banded, with tooltips.
3. **Role fit** — 8 role chips with a green/amber/red badge and the resulting power delta for each: *"Ignis as Evoker: 127 power · as Arcanist: 118 · as Bulwark: 41"*. This one widget replaces an entire tactical manual.
4. **Gear** — 4 slots (weapon, chest, helm, trinket) with iLvl, plus an "upgrade" affordance showing the delta.
5. **Condition** — fatigue, health, morale, with the resulting `condMod` shown as a number ("your output is at 93%").
6. **Contract** — wage, days remaining, release clause, squad-status promise, market value.
7. **History** — last 10 days as a compact strip (raided / farmed / rested / injured), plus bosses seen.

**The comparison widget matters:** FM's transfer decisions are made in comparison view. Our "who gets the drop" decision is the same shape. Build `compare(heroA, heroB)` early.

---

## 5. Tactics — and what our War Room borrows

FM's tactics screen is **a pitch with 11 draggable slots plus three instruction panels**.

- **Mentality** — a 7-step ladder: *Very Defensive · Defensive · Cautious · Balanced · Positive · Attacking · Very Attacking*.
- **Formation** — a library of presets + custom placement.
- **Roles & duties** — each slot gets a role (30+) and a duty (Defend / Support / Attack; centre-backs also get Stopper / Cover). The role+duty pair is what actually drives match behaviour.
- **Team instructions**, grouped by phase:
  - *In possession* — Passing Directness, Tempo, Width, plus toggles like Play Out of Defence, Pass Into Space, Work Ball Into Box, Shoot on Sight, Hit Early Crosses, Dribble More, Be More Expressive, Focus Play Down the Left/Right/Middle, Overlap, Underlap.
  - *In transition* — Counter, Counter-Press, Hold Shape, Regroup, Distribute Quickly, Prevent Short GK Distribution.
  - *Out of possession* — Defensive Line, Line of Engagement, Trigger Press, Get Stuck In, Stay On Feet, Trap Outside/Inside, Use Offside Trap, Step Up, Drop Off.
- **Player instructions** — per-slot refinements: Dribble More, Shoot More Often, Close Down More, Mark Tighter, Hold Position, Roam From Position, Take More Risks, Cross More Often, Stay Wider, Move Into Channels, Get Further Forward, Swap Positions.
- **Tactical familiarity** — a bar per tactic (and per phase). A brand-new tactic *underperforms until trained*, which is how FM makes preparation cost something.

**The four transferable ideas:**

1. **A spatial representation.** Even abstract games benefit from seeing the arrangement as a diagram rather than a list of slots. For us: a 10-slot party layout (2 tanks front, healers/back-line, DPS) — a simple row/column arrangement, not a pitch.
2. **Layer the control.** One coarse global choice (mentality) → per-slot choices (role/duty) → fine toggles (instructions). A player can engage at whichever layer they enjoy, and each layer visibly changes a number.
3. **Familiarity decay.** New doctrines should cost a penalty for 2–3 days while the party learns them. Costs nothing to implement and stops doctrine-swapping being free.
4. **Show the effect, immediately.** FM shows you your tactical changes reflected in the analysis panel. Ours must show `squadRating` updating live in the War Room as you move heroes and toggle doctrine — otherwise nobody will experiment.

---

## 6. Recruitment — the information economy

FM's transfer layer is where the game's *uncertainty* lives, and that's why it's compulsive.

- **Scouting** — scouts have attributes (*Judging Player Ability*, *Judging Player Potential*, *Adaptability*, *Determination*), get assignments (region, competition, age range, attribute requirements), and return **reports**: star ratings, attribute *ranges* rather than values, a recommendation ("sign at all costs" / "not interested"), and prose about personality.
- **Attribute masking** — until a player is scouted, attributes show as **ranges** (`Passing 12–16`), and long-range scouting narrows them. This fog is the whole point: it creates the gem hunt.
- **Shortlist** — a saved list with a note field; shortlists are how a player holds 40 ideas at once.
- **Player Search** — a filter query over the database (position, age, contract status, attribute thresholds, asking price).
- **The negotiation modal** — the most-copied screen in the genre: transfer fee, instalments, sell-on clause, appearance/goal/league bonuses, agent fee, then the contract: wage, signing bonus, length, optional extension, release clause, squad status, bonuses. A **counter-offer loop** where the agent's patience decays and threats ("we're prepared to walk away") are legitimate moves.
- **Budgets** — a transfer budget and a **wage budget**, split by the board. The split is itself a decision.

**Our translation (Tavern):**

| FM | Guild Manager |
|---|---|
| Scouting fog | **Rumoured ranges** — candidate attributes shown as ranges; width shrinks with renown/facility level and with each day they stay on the board |
| Scout report | A **rumour card**: range attributes, a potential band (★★–★★★★★), a personality hint ("known to sulk when benched"), and one recommended role |
| Shortlist | **Watchlist** — heroes you can't afford yet, with a note |
| Player search filters | **Tavern filters** — class, level band, wage cap, role fit, price |
| Negotiation modal | **Signing offer**: wage (counter-offer loop, 3 rounds max), contract length, **squad-status promise** (A-team / rotation / bench), signing bonus |
| Wage/transfer budget | One **coffer budget** — monthly wage cap + one-off gold. Kept simple |

**Keep the fog.** It is cheap (a range is a range) and it is the difference between a shop and a transfer market.

---

## 7. The Inbox → our attention queue

FM24's Inbox: categorised (`All · News · Transfers · Contracts · Media · Board · Scouting · Fixtures`), with read/unread state, "action required" flags, and inline actions (accept, reject, ask for time). Its failure mode: 100+ items, most ignorable, no priority. The player develops "inbox blindness". FM26 replaced it.

**Our design (the biggest single improvement we can make over FM's weakest screen):**

A **priority queue, not a feed**:

```
NEEDS YOU (3)
  ⚠ Thorne is out of contract in 3 days        [Renew] [Let walk]
  ⚠ Wage bill 612g vs budget 445g              [Cut] [Raise income]
  ● Gear drop: Emberfang Axe — 2 candidates    [Assign]

FYI (4)  ▸ Echoes killed Boss 4 · Dungeon cleared · Fatigue warnings ...
```

- Max 3 blocking items; the rest is a collapsed feed.
- Each blocking item is a modal with 2–4 options, and the modal **shows the consequence numbers** before you commit.
- Nothing is ever silently lost: FYI items persist in a log tab.

This is the screen that turns our game from an idle timer into a management game, and it needs to be built *first*, because it defines the event schema.

---

## 8. Match day — what an async game keeps

FM's matchday pauses at: **pre-match staff meeting → team selection (players react) → pre-match team talk → tunnel interview → kick-off → half-time (talk + tactics + subs) → full-time talk → post-match press conference.** That's roughly 6–10 forced stops per match, and everything except kick-off, half-time, full-time and goals can be delegated to an assistant.

Two details worth knowing precisely, because both are often misquoted:
- **Team talks are a 2-axis grid**: six *tones* (Aggressive, Assertive, Cautious, Reluctant, Calm, Passionate) × six *sentiments* (Angry, Disappointed, Encourage, Sympathise, Pleased, Delighted).
- **FM24's touchline shout set is only eight**: *Encourage, Praise, Berate, Fire Up, Focus, Demand More, Calm Down, No Pressure*. Longer lists like "Get Creative / Show Some Passion / Tighten Up / Push Forward / Drop Deeper" are from older FM generations' tactical instructions, not FM24 — useful to know before we borrow vocabulary that doesn't exist in the reference game.

An asynchronous, day-tick game cannot use any of that. But three things survive and are essential:

1. **The pull report** — a narrative log of the attempt with timestamps and named events, which reads like a match report. It's the "watch the match" substitute.
2. **Post-pull analysis** — the equivalent of FM's match stats: did we meet each check, by how much, which hero underperformed relative to expectation. FM's match analysis tab is what lets players *learn*; ours must do the same.
3. **Instant resolution with a choice** — FM lets you "instant result" the match and lose touchline influence. Our version: you can *simulate the whole night* (see only the summary) or *step through pulls* (see each phase, and get one mid-night adjustment). Not a match engine — a decision point in the middle of the night. This is the cheapest way to get FM's "I was there when it happened" feeling.

---

## 8.5 The modal inventory

FM is a game of small modal decisions. This is the list worth studying, with the shape each one takes. (Detail and sources in [fm-03-club-operations.md](research/fm-03-club-operations.md) §4 and [fm-01-navigation-and-screens.md](research/fm-01-navigation-and-screens.md) §3.)

| Modal | Fields / content | The interesting bit |
|---|---|---|
| **Transfer offer** | fee · instalments · sell-on % · appearance/goal/league bonuses · agent fee · deadline | Counter-offer loop with a **patience meter**; threats ("we'll walk away") are legitimate moves |
| **Contract offer** | wage · signing-on fee · length · optional extension · release clause · **squad status** · bonuses | Squad status is a *promise*, not a number — it becomes an obligation later |
| **Team talk** | 6 tones × 6 sentiments, plus a body-language read on the squad | The same words backfire depending on scoreline and personality |
| **Touchline shout** | 8 shouts, contextual | Knowing *when* a shout helps is the skill |
| **Press conference** | question bank, 2–4 answer tones | High authoring cost, low decision diversity — FM's most-criticised recurring modal |
| **Player interaction** | praise / criticise / warn / discuss contract | Outcomes are delayed and ambiguous — the model of a social half-life |
| **Board request** | facilities, affiliates, budgets, staff | Answers depend on confidence, which the player cannot see directly |
| **Scouting assignment** | region, competition, age, attribute filters, duration | Turns the scout into a *budget* you spend |
| **Substitution / tactic change** | bench, role, duty, instruction tweaks | Available only at stoppages — the constraint is the drama |
| **Discipline / warning** | a player incident, 2–3 responses | Near-zero cost, high story value |

**The transferable shape for all ten:** two to four options, each with its *projected* consequence shown before you commit, and no "cancel" that leaves the world exactly where it was — time passes or a relationship degrades. That last rule is why FM's modals have weight.

---

## 9. The pattern library — 12 reusable UI patterns from FM

These are the components to build, in rough dependency order. They are worth more than any individual screen.

| # | Pattern | Why it matters |
|---|---|---|
| 1 | **Sortable data grid with column chooser + saved views** | The backbone of Roster, Tavern, Raid logs |
| 2 | **Colour-banded numeric scale** (1–20 → 5 bands) | Makes an 8-attribute block readable as a shape |
| 3 | **Star rating with half-stars and "unknown" state** | Potential, candidate quality — and the fog needs a visual |
| 4 | **Range value display** (`12–16`) with an "unknown" state | Scouting fog |
| 5 | **Row → drawer inspector** (list stays, detail slides in) | Keeps context; FM's key navigation move |
| 6 | **Comparison view** (two entities, delta column) | The "who gets the drop" decision |
| 7 | **Status chips** (fatigued / injured / unhappy / expiring) | Scannability in tables |
| 8 | **Attention queue with blocking/non-blocking** | The core loop |
| 9 | **Timeline strip** (last 10 days at a glance) | History without a new screen |
| 10 | **Live number preview** ("this change gives +18 power") | Lets players experiment safely |
| 11 | **Tooltips on every stat** | Non-negotiable; FM's onboarding lives here |
| 12 | **Persistent primary action** (ADVANCE DAY) + keyboard shortcut | Pacing |

Two extras worth stealing from FM's culture rather than its UI:
- **Keyboard shortcuts for the loop** (continue, next tab, back). FM players navigate at speed; a browser game that requires mouse-only feels slow.
- **A "hide details" mode.** FM's data density is beloved by veterans and hostile to newcomers. Our mobile story depends on a compact mode that collapses to: name, class, level, power, status.

---

## 10. What NOT to copy

| FM thing | Why we skip it |
|---|---|
| 14-module sidebar | Too many destinations for 6 screens; FM26 already abandoned it |
| 36 attributes | Great for football literate players, unreadable for a new fantasy IP; 12 is the sweet spot |
| 30+ roles × 3 duties | 8 roles is enough to make composition matter without a wiki |
| Press conferences | Pure flavour cost; cut for MVP (FM Touch cuts them too) |
| Set-piece routines | No analogue in a raid |
| Social groups / dynamics web | Keep morale; drop the social graph |
| Transfer clauses (10 types) | Two knobs (wage, status) give 80% of the drama |
| 3D/2D match engine | The pull report + analysis is the match, for us |
| Attribute masking *by default* on your own players | Fog is for the market, not for your own roster |

---

## 11. Onboarding — the thing FM is worst at, and our chance to win

FM is notorious for dumping a new player into 14 modules and 36 attributes with no path. There is no campaign, no tutorial arc worth the name, and the community's answer is "watch a 40-minute video."

We have a structural advantage: **the first week of a run is a natural tutorial.** Days 1–7 can be **diegetic onboarding** — each day, exactly one new system is introduced by the steward, with the attention queue containing a single item:

| Day | Introduced | Taught by |
|---|---|---|
| 1 | Roster + roles | "Your party is unbalanced — put the Bulwark in front" |
| 2 | Dungeon run + gear | "Take the drop; someone will be unhappy" |
| 3 | Fatigue | "Gareth can't raid tomorrow; rest him" |
| 4 | First boss attempt + wipe report | "You failed the DPS check. Here's the number." |
| 5 | Tavern recruitment + fog | "You need a healer. This one's attributes are a rumour." |
| 6 | Economy + wages | "Day 7 is payday. Can you afford him?" |
| 7 | Reset + RWF leaderboard | "Echoes is ahead. Here's the whole tier." |

Seven days, one concept each, all in the real game with real consequences. If we nail this, we have a genuine edge over FM with the exact audience we're targeting (people who bounced off FM).

---

## 12. Citations

- FM26 interface redesign (six hubs, Portal, bookmarks, player profile): [gamer.org — FM2026 UI overhaul revealed](https://www.gamer.org/football-manager-2026-ui-overhaul-revealed/), [SI — FM26's Reimagined User Interface](https://www.footballmanager.com/fm26/features/fm26s-reimagined-user-interface)
- Inbox removal and the reasoning: [Eurogamer — FM25 to remove Inbox](https://www.eurogamer.net/football-manager-25-to-remove-inbox-ability-to-hammer-demand-more-whenever-youre-losing)
- FM26 role changes ("channel forward", "inside fullback", etc.): [gamer.org — FM26 roles](https://www.gamer.org/football-manager-26-release-date-leagues-and-player-roles/)
- Why FM is compulsive / the "plates to juggle" argument: [GINX — Why is the world addicted to Football Manager](https://www.ginx.tv/en/world-addicted-to-football-manager-no-strategy-game-like-it)
- RWF structure, splits, pull counts, best-pull percentages: [Blizzard Watch — RWF day 3, many splits](https://blizzardwatch.com/2025/03/06/liberation-undermine-race-world-first-day-3-many-splits-handle/)
