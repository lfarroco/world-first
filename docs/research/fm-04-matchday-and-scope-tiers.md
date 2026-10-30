# FM-04 — Matchday Ritual & Scope Tiers (FM desktop vs Touch / Mobile / Console)

*Research note for the browser-based "guild manager" with a Race-to-World-First raid competition.*
*Compiled 2026-10-30. Primary sources: SI's own FM24 manual (the "Playing A Match" and "Competitions and Fixtures" chapters), SI's official platform comparison table, FMScout's FM26 comparison, TouchArcade, RPS, PC Gamer, SI community forums, assman.ai match-tablet guide.*

**Source-quality note up front**, because the conclusions differ by tier:

| Evidence tier | What it is | How much weight to give it |
|---|---|---|
| **A — SI's own text** | FM24 manual chapters, official `compare-games` table, App Store copy | Highest. SI is describing its own product and, in the comparison table, publishing the feature matrix it wants you to buy against. |
| **B — Reputable reviews** | TouchArcade (all four editions reviewed side by side), RPS, PC Gamer | High for "what it feels like", medium for exact feature lists. |
| **C — Community** | SI forums, Reddit-style threads, fan guides | Good for *player sentiment* and for gaps SI never documents; weak for precise mechanics. |

Where I could not verify something, it is marked **(unverified)** rather than smoothed over.

---

## 1. Match day, step by step

FM's matchday is a **sequence of forced stops**. That is the single most important thing to steal: the drama is not in the football, it is in the fact that the game repeatedly refuses to continue until you decide something.

The authoritative walkthrough is SI's own FM24 manual chapter ["Playing A Match"](https://community.sigames.com/sigames-manual/football-manager-2024/playing-a-match-r4966/). Everything below in quotes is SI's wording (archived copy read at [Wayback, 2024-03-01](https://web.archive.org/web/20240301020820/https://community.sigames.com/sigames-manual/football-manager-2024/playing-a-match-r4966/)).

### 1.1 Pre-match: the staff meeting (the "why" briefing)

Before you can even pick a team, FM gives you a briefing:

> "The Pre-Match staff meeting is the last chance to go over everything in-depth before kick-off. Your backroom team provide an opposition report that includes the expected line-up you're set to face, and key tactical advice for the match ahead."

It is followed by a **checklist that is effectively a design spec for a pre-raid screen** — SI literally lists the questions the player should be able to answer before confirming a team:

- Are players appropriate for the positions/roles/duties?
- Are they fit and match sharp for *this* fixture?
- Who is in form, who isn't?
- Do you have flexibility to change the tactic mid-match?
- Can your bench change the game?
- What is team morale — are better-morale players being left out?
- What does the fixture list look like — do you need to rotate?
- Any unhappy players you promised minutes?
- What threats does the opposition carry, and have you planned to counter them?
- How important is this match — can you field a weakened side?

### 1.2 Team selection, then a *reaction*

> "Having submitted the team and informed your players of the approach you want to take, they then give you instant feedback on how they feel going into the match."

This is a small but load-bearing beat: **the act of submitting a lineup produces feedback** (happy / confused / disappointed), which nudges you to change the lineup or to talk. It converts a spreadsheet decision into a social one.

### 1.3 Pre-match noise: press officer, tunnel interview

> "The Team Sheet is in and there's bound to be a reaction, so your Press Officer gathers the very latest from social media. Your staff, meanwhile, advise you of any changes that might need to be made if your opponents have sprung a last-minute surprise."

> "If you've assumed the responsibility for attending pre-match tunnel interviews, you'll be asked a question or two just before heading out onto the pitch."

Note the *delegation* structure: media is on by default but can be handed to a press officer. That is how SI keeps the ritual optional.

### 1.4 The team talk (the dressing room)

Three windows, one vocabulary. SI's manual:

- **Pre-match** — "your chance to ensure the players are ready for the task at hand; that they know what's expected of them and are put into the right mindset".
- **Half-time** — "a chance to react to the first 45 minutes… They might need some encouragement, or waking up, or a reminder that their standards have dropped".
- **Full-time** — "can be celebratory in the right circumstances — even in defeat — or it can be a stark reminder to ensure complacency doesn't creep in".

Mechanically it is a **2-axis grid**:

- **Six tones:** Aggressive, Assertive, Cautious, Reluctant, Calm, Passionate.
- **Six sentiments:** Angry, Disappointed, Encourage, Sympathise, Pleased, Delighted.

> "The combination of tone and sentiment creates a multi-layered device that can truly affect every fixture you play."

The assistant can recommend a talk, or **give it for you**:

> "Your Assistant Manager offers advice on the best team talk to give and this can often reveal something about the players, particularly if they're somewhat nervous or complacent… Alternatively, you can ask the Assistant Manager to take the talk directly."

The outcome is personality- and body-language-dependent — SI's own example: Aggressive works on a "Fired Up" player who is Spirited/Resolute, and backfires on an "Easily Discouraged" player showing "Nervous" body language.

**Design lesson:** a talk is a 2-token choice (tone + intent) with an outcome keyed to a *visible* player state. Cheap to build, deep to master, and it reads as narrative, not maths.

### 1.5 Kick-off and the match engine view

SI documents four things on the pitch screen:

1. **Pitch view** — "designed specifically for the 3D match view… scoreboard and settings at the top, commentary and your managerial actions at the bottom."
2. **Bottom-left** — quick shape/style/mentality/instruction changes **plus touchline shouts**; "Full Tactics" opens the full screen.
3. **Player bar** — "select any of them to change their position, role or instructions, shout directly to them, or make a substitution."
4. **The Dugout** — "Show Me" (analyst info, other scores) and "Ask For" (on-demand assistant advice).

**Highlight modes** (SI's own list): *entire match* ("note, this is not actually 90 minutes"), *extended highlights*, *key events*, or **"none at all and watch the game with just commentary text."**

That last option matters enormously for us. FM's most-reduced viewing mode is **text commentary only**, and a meaningful minority of experienced players use it by default. From an SI forum thread asking ["How do you watch your games?"](https://community.sports-interactive.com/forums/topic/564847-how-do-you-watch-your-games/): *"only commentary old skool"*; *"Only commentary as it saves me a load of time that I sadly don't have to play FM nowadays!"*; and the common hybrid *"3D / Extended Highlights: to see how the tactic works. 3D / Key: after I found how the tactic works."*

So the real FM viewing ladder is:

| Mode | Approx. time per match | What you get | Who uses it |
|---|---|---|---|
| Full / "entire" | ~20–30 min | Everything, including shape drift | New players, big games, testing a tactic |
| Comprehensive | ~10–15 min | Most attacking moves | Tacticians diagnosing a system |
| Extended | ~6–10 min | Chances + build-up | The default "informed" viewer |
| Key | ~3–5 min | Goals, red cards, big saves | Most experienced players most of the time |
| **Only commentary** | **~1–2 min** | Text feed, no pitch | Veterans, season-grinders, low-time players |

### 1.6 Touchline instructions and shouts

**FM24's shout set is eight**, per SI's manual:

| Shout | Documented effect | Failure mode |
|---|---|---|
| **Encourage** | Pumps players up | "If unsuccessful, they'll become more frustrated" |
| **Praise** | Pumps players up | Same — praise when losing can read as complacency |
| **Berate** | Raises focus/motivation | Lose focus, become demotivated |
| **Fire Up** | Raises focus/motivation | Same |
| **Focus** | Raises focus/motivation | Same |
| **Demand More** | Raises focus/motivation | Same |
| **Calm Down** | Relaxes the team | "can burden them with additional pressure" |
| **No Pressure** | Relaxes the team | Same |

> "The success of a touchline shout depends on the morale, motivation and body language of each player."

Shouts can be aimed at the **whole team or one player** ("either individually (using the drop-down option next to each shout) or collectively"). In FM24 there is a **cooldown** after each shout, and the old "referee sends you to the stands" punishment was removed ([CharlieINTEL, FM24 team talks & shouts](https://www.charlieintel.com/games/football-manager-2024-team-talks-shouts-explained-285457/)).

**⚠️ Correction to the brief.** The list in the task — *Get Creative, Show Some Passion, Tighten Up, Push Forward, Drop Deeper* — is from an **older FM generation's "touchline instructions"** palette, not FM24. Those were tactical nudges (mentality/tempo/width shifts) that sat alongside verbal shouts; over successive versions SI collapsed them into the eight verbal shouts above plus the normal tactics screen. Practical implication for us: **the "shout" vocabulary players remember is verbal/emotional, while the tactical nudges were folded into the tactics sliders.** Treat "Demand More / Get Creative / Tighten Up" as one blended folk-memory of the feature. (Exact version where each was removed: **(unverified)** — I did not find an SI changelog pinning it down.)

### 1.7 Half-time

Half-time is the densest decision point in the whole match:

1. **Team talk** (tone + sentiment), with assistant advice available.
2. **Tactical changes** — shape, roles, mentality, opposition instructions.
3. **Substitutions** (and the substitution itself is a decision about *who* absorbs the bollocking).
4. The **analysis screens default to half-time** — the pass map is "shown by default at half-time and full-time" ([assman.ai, Reading the Match Tablet](https://assman.ai/guides/reading-match-tablet)).

That last detail is a quiet design gem: **the game pre-loads the diagnostic screens at the exact moment you are forced to decide**, so "look at data → change something" is one continuous gesture rather than a menu hunt.

### 1.8 Second half, substitutions, full-time

- Substitutions are made from the player bar or shortcut buttons; FM24 allows five subs in most competitions (competition rules apply).
- **Full-time** delivers: team talk, player ratings, and then

> "At Full-Time, your Press Officer returns to deliver a round-up of events elsewhere, as well as a summary of the media and social reaction. Then it's time to fulfil your post-match media requirements if you've retained those responsibilities."

### 1.9 Post-match press conference

A modal Q&A: 3–5 questions, each with 3–5 canned answers, each with morale/relationship consequences. It is the most-skipped ritual in the game (see §7) and the first thing SI cut in the reduced editions.

### 1.10 Exactly which moments *pause* the game

This is the list to design against. "Forced" = the simulation will not advance until you act. "Soft" = the game stops but offers a skip/delegate.

| # | Moment | Forced? | Decision | Skippable? |
|---|---|---|---|---|
| 1 | Pre-match staff meeting / opposition report | Soft | Absorb info, set approach | Yes — auto-continue |
| 2 | Team selection confirmation | **Forced** | 11 + bench + roles | Can be delegated to the assistant, but you still confirm |
| 3 | Squad reaction to team sheet | Soft | Read feedback, maybe re-pick | No action needed |
| 4 | Pre-match team talk | **Forced** (one click minimum) | Tone + sentiment | Yes — "ask assistant" |
| 5 | Tunnel interview | Soft | Answer / decline | Yes — delegate to press officer |
| 6 | Kick-off | Forced | — (a click) | — |
| 7 | Any stoppage: goal, card, injury, HT whistle | **Forced-ish** | Shout / sub / tactic tweak / nothing | Yes — "continue" |
| 8 | Half-time | **Forced** | Talk + tactics + subs | Talk skippable via assistant |
| 9 | 60–75' fatigue window | Soft (the game stops for injuries/subs) | Rotation decision | Yes |
| 10 | Full-time | **Forced** | Talk + review | Talk skippable |
| 11 | Post-match press conference | **Forced modal** unless delegated | Answers | Yes — delegate |
| 12 | Post-match analysis review | Soft | Read / ignore | Yes |

**The pattern:** FM forces a decision at *kick-off, half-time, full-time and after every goal*, and makes everything else delegable. Roughly **6–10 forced interactions per match**, each 5–30 seconds. That is the ritual's true cost — and its true value.

### 1.11 The same beats, translated to a raid run

| FM beat | Raid-run beat | The decision | Forced? |
|---|---|---|---|
| Staff meeting / opposition report | **Scouting report**: boss mechanics, rival pace, your readiness | Which route, which 5 units | Soft — but the run can't start without it |
| Team sheet + squad reaction | **Roster lock** + guild reaction ("the healer wanted that slot") | Final 5 + bench/consumables | Forced |
| Pre-match team talk | **Guild rally** (tone × intent: "we go fast" / "we play safe") | Buff + morale risk | Forced, skippable via officer |
| Tunnel interview | **Pre-run press / leaderboard taunt** | Trash-talk for reputation | Soft, delegable |
| Kick-off → goals | **Boss phases**: each phase transition is a mini-stoppage | Adjust target/cooldowns or hold | Forced at phase breaks |
| Half-time | **Mid-run intervention window** (after boss 2 of 5, say) | Swap a unit, change approach, use a consumable | Forced, 1–2 windows |
| 60–75' fatigue | **Resource exhaustion** (healer OOM, tank cooldowns) | Push or stabilise | Soft |
| Full-time | **Boss debrief**: kill time, attempts used, damage taken | Read, log | Forced |
| Post-match press | **Post-race report card** (guild reputation, sponsor reaction) | — | Soft, skippable |
| Post-match analysis | **Run report**: split times, wipe reasons, DPS/healing chains | Learn, adjust next run | Soft |

---

## 2. "Instant result" / simulating the match

### 2.1 What exists

| Platform | Instant result? | Evidence |
|---|---|---|
| **FM24 desktop (vanilla)** | **No first-class button** for competitive matches. The only in-game skip is **"Go on Holiday"** for a day, which hands the team to the assistant | SI's comparison table lists "Optional instant match result" *only* for Console and Touch; SI forum threads confirm the workaround |
| **FM24 desktop (modded)** | **Yes, via skins/plugins** — the community ships "instant result" skin buttons | e.g. the Chinese-language FM24 skin plugin thread, and users in the SI thread: *"Im using instant result for years on PC"* |
| **FM24 Console** | **Yes** — "Optional instant match result" | [Official comparison table](https://web.archive.org/web/20250114140354/https://www.footballmanager.com/compare-games) |
| **FM24 Touch (Apple Arcade & Switch)** | **Yes** — same wording | Same |
| **FM24 Mobile** | **No** — the one reduced edition *without* it, deliberately | SI forum, [*Instant Result*](https://community.sports-interactive.com/forums/topic/569604-instant-result/) |
| **FM26** | Split believed preserved (Console/Touch keep it) **(unverified)** — FMScout's FM26 table does not list the row | [FMScout FM26 comparison](https://www.fmscout.com/a-fm26-game-comparison.html) |

SI's phrasing is careful: "**Optional** instant match result" sits in the *Core features* row next to "**Streamlined responsibility**" — i.e. instant result is sold as a *convenience feature of the reduced tiers*, not a headline desktop feature.

**A correction worth having in the doc**, because it is counter-intuitive: the mobile edition — the *most* streamlined one — is the one that **refuses** to ship instant result. In the SI forum thread the mobile lead's reasoning is quoted — Marc Vaughan, who runs FM Mobile — and he returns in the thread to defend it at length:

> "Mobile doesn't have an instant result button at present, there are a few reasons for this…"
>
> "Its something I've seriously considered over the years — the issue with quick result is that it tends to **disconnect people from the game and their players**. For example you're hoping to win the league but things go badly in your first 4 matches and you start hitting 'instant result' to hurry along to the next transfer window as this season is a bust; when you reach it you've not really got any idea who has been performing for you beyond their stats and they're **reduced to just numbers** with no idea of how they've truly behaved."

That is the most useful design warning in this entire research pass for a raid game: **the fast path can eat the game.** SI's answer is not to ban it but to make it *slightly worse* — a community suggestion in the same thread that reads like a design principle:

> "If you want to discourage use, then just make it clear that you're more likely to get a good result if you play in detail and watch the game… In fact I think it should be the case that a managed game gives a better result than an instant result one (not too much though)."

### 2.2 What you lose

Everything in §1.5–1.8 that requires you to be present:

- **No touchline shouts** — you cannot react to a goal, a red card, or a tactical mismatch.
- **No half-time team talk or tactical reset** — the single highest-leverage intervention in the match is gone.
- **No in-match substitutions** (the AI/assistant makes them).
- **No opposition instructions** adjustments.
- **No live data** — you get the box score afterwards, not the diagnostic tablet at the moment it would have helped.
- **No player-ratings-driven narrative** during the match (you read ratings after).

What you keep: the result, the stats, player ratings/condition, morale effects, and the table. In other words **instant result preserves outcomes and consequences but deletes agency and drama.**

### 2.3 Why this matters for an async game

FM's own product line proves a market fact: **a large share of players will trade the match for time, and SI ships that trade as a first-class feature on two of its four editions (Console and Touch) — while explicitly refusing it on the most streamlined edition (Mobile).** But note the shape of the trade in FM: instant result is *all-or-nothing*. There is no "watch the last 10 minutes" or "intervene only if it goes wrong".

That gap is our opportunity: an async raid race can offer **tiered presence** (see §8, rec 3) — commit your plan up front, then buy back a limited number of live interventions — instead of FM's binary watch/skip.

---

## 3. What a match produces, and what makes the player feel they *understand*

### 3.1 The stat sheet

FM24's post-match and in-match data, per the manual and the match-tablet guide:

**Team level:** possession %, shots, shots on target, **xG (expected goals)**, xG split open play vs set pieces, pass completion %, passes completed/attempted, tackles, headers won, interceptions, fouls, corners, distance covered, sprints, average positions.

**Player level:** rating (0–10, with a 6.0-ish "did their job" baseline), goals/assists, key passes, shots, pass %, tackles, interceptions, headers, dribbles, distance, sprints, condition/sharpness, body language, morale.

**Spatial/visual:** heat maps, average-position map, **pass map** (line thickness = pass volume between two players), possession by zone (thirds), shot map, goal-mouth view, crosses, zones.

### 3.2 The four screens that actually explain a result

The [assman.ai tablet guide](https://assman.ai/guides/reading-match-tablet) is the clearest articulation of *why* these four, and in what order, and I would lift this ordering wholesale:

1. **xG** — "are we creating? Are they?" The key read is the **gap between xG and the scoreline**: "If you're 1-0 up but only on 0.4 xG to their 1.4, you are losing a match the scoreline says you're winning."
2. **Average position** — "is our shape what I drew on the tactics screen?" e.g. "If your defensive midfielder's average position is up around the centre circle, they have abandoned their post."
3. **Pass map** — "is the ball reaching the players I want it to?" "A missing line is more diagnostic than a thick one. If your striker has no thick connection to the rest of the team, they're isolated."
4. **Possession by zone** — "50%+ possession in the middle third is the death zone; it usually means neither team is progressing the ball."

And the triage cadence: **every 15 minutes of match time, 30 seconds, in that fixed order.** If three answers are wrong, change the tactic; if one is wrong, change one instruction; if the data says the system is fine but you're losing, **change the player, not the tactic**:

> "Don't change the tactic. The system is working; you just need a better finisher on the pitch… The most common mistake here is second-guessing a tactic that the data says is fine."

### 3.3 The manual's "analysis" surfaces

Per SI's [Competitions and Fixtures](https://community.sigames.com/sigames-manual/football-manager-2024/competitions-and-fixtures-r4965/) chapter, analysis is embedded in the competition screens too: *Statistics* (team + player, "Overview" and "Detailed"), *Past Positions* (league-standing line graph), *Fixtures and Results* ("Latest Scores", "Goal Updates", "Live League Table" on matchday), *Injury Table*, *Suspensions*, *Referees* (cards/penalties per official — "perhaps alter your tactics depending on the referee"), *Awards*, *History*.

**What creates "I understand why":** not volume of data, but **a causal chain with a recommended lever at the end of it**. xG says the scoreline lies → average position says the shape broke → pass map says the striker is isolated → the fix is a role change. Four data points, one story, one decision. Every screen in FM that people actually love does this; every screen people complain about (see §7) is data without a lever.

---

## 4. Competition structure & rules

### 4.1 The shapes FM models

- **League** — double round robin (38 games in a 20-team top division), 3 points for a win, 1 for a draw, table sorted by points → goal difference → goals scored (and, in some competitions, head-to-head first).
- **Cup** — single-elimination knockout, one-off ties with extra time and penalties, replays in some domestic cups, two-legged ties in continental competition.
- **Continental** — group/league phase + two-legged knockout; squad registration limits (e.g. a 25-man "List A" with club-trained/association-trained quotas) **(unverified for FM24 specifically — this is the real-world UEFA rule FM mirrors)**.
- **One-off** — super cups, community shields, and the "one match decides everything" fixture.
- **Promotion/relegation** — the manual's competition screens explicitly show "the number of teams, promotion and relegation spots (and if so, the competitions they feed into or come from)".
- **Squad registration** — FM exposes it via the **Rules screen**: *"The 'Rules' screen informs the manager of all the specific rules for the competition… ensure that your squad meets any criteria it needs to well in advance of the start date."* The real-world rule FM mirrors (and the one players most often hit) is the Premier League's: **a 25-man squad containing no more than 17 non-homegrown players** (so a minimum of 8 homegrown), with **under-21 players exempt** from the 25 and eligible over and above it — per the [Premier League's own explainer](https://www.premierleague.com/en/news/4706140/). Lists are submitted twice a season, after each transfer window. Europe works the same way with a slightly different quota structure **(unverified for FM24's exact in-game numbers)**.
- **Fixture congestion** — SI's own framing:

> "There will inevitably be moments throughout your career… when fixtures come thicker and faster than you can really handle. This is where smart forward planning can pay off… Selecting a squad of players three or four matches in advance might seem unusual… but it can pay off handsomely if your best players are available for the bigger matches during a spell of congestion."

### 4.2 Seasons are paced by the calendar, not by the player

A 20-team league = 38 games; plus a domestic cup (1–6 games), a league cup (1–6), and Europe (6–13) ⇒ **typically 45–60 competitive matches**, at **roughly one every 3–4 days** from August to May, with a winter congestion spike (Boxing Day–January) and international breaks. This cadence is the metronome that makes everything else — rotation, fatigue, squad depth, youth development, transfer windows — *matter*. Without a dense fixture list, squad depth is a meaningless stat.

### 4.3 Mapping onto a 5-boss raid race with 3 NPC rivals

FM gives us the *grammar* (league vs cup vs one-off; table vs bracket; registration vs roster; congestion vs lockout). The raid race needs the same grammar with different nouns:

| FM concept | Raid-race equivalent | Why it transfers |
|---|---|---|
| League table (points, GD, GF) | **World-first ladder**: bosses cleared, then total clear time, then attempts | Gives a season-long ranked narrative even for players who never get world-first |
| Goal difference as tie-break | **Time-to-clear** as tie-break (sum of boss split times) | Continuous, always-comparable, rewards speed not just completion |
| Head-to-head | **Direct duel** vs one of the 3 NPC rivals on the same boss/week | Creates a personal rivalry without needing real-time PvP |
| Cup / one-off | **Boss 5 as a one-off "final"** — single attempt, no retries, everything on the line | The knockout's tension is *irreversibility*, not elimination |
| Two-legged tie | **Two-phase boss** (phase 1 "scout", phase 2 "execute") with aggregate damage | Lets a bad first attempt be partially redeemed |
| Squad registration | **Roster lock** — 5-boss "run team" locked at run start, substitutions only between bosses | Forces commitment; prevents mid-run counter-picking |
| Homegrown quota | **Guild-only units** — a minimum number of guild-earned units required per run | Makes the guild, not the market, the source of power |
| Fixture congestion | **Weekly lockout + 5 bosses + limited attempts** | Scarcity of attempts is what makes planning matter |
| Promotion/relegation | **Tiered leagues** (Bronze/Silver/Gold world races) with promotion on ladder position | Long-term retention beyond one race |
| Transfer windows | **Between-race roster window** (e.g. 48h between weeks) | Concentrates trading into a burst instead of constant churn |
| Season expectations | **Guild board target** ("top 3 in your tier / clear boss 4") set at race start | Gives a success metric that isn't only "world first" |

**Concrete proposal for the 5-boss race:**

- **Leaderboard**: per-boss split times (like stage times in rally/Tour de France) + a "GC" total. World-first = first guild to log a *validated* clear of boss 5.
- **Resets**: weekly lockout reset (same weekday/time, in the player's timezone), with a visible countdown — the FM "next fixture" feel. Season = 8–12 weeks, then a "season review" (see §5).
- **Lockouts**: each boss is clearable **3 times/week per guild**; the *first* clear is the only one that counts for world-first, later clears only for loot/practice. This mirrors raid lockouts and prevents infinite-retry brute force while keeping practice cheap.
- **Tie-breakers** (in order): (1) total clear time across 5 bosses; (2) number of attempts used; (3) earliest final-boss kill timestamp; (4) head-to-head vs the tied guild in the same week; (5) coin flip / seed. Publish the order — FM players *do* read the Rules screen, and tie-break rules are content.
- **NPC rivals** should be *scheduled* (deterministic, readable) rather than random: e.g. "The Ironclad Guild clears boss 3 at T+6h". They exist to create a **pace target**, exactly like FM's "title odds" and "season preview" set expectations before a ball is kicked.

---

## 5. The season / annual cycle

### 5.1 The loop

1. **Pre-season** — new season expectations from the board, transfer budget, squad review, friendlies for tactical familiarity, youth intake preview. In FM this is the only time the player is *forced* to confront the squad as a whole.
2. **Transfer windows** — summer (long) and winter (short, January). Between windows, squads are frozen; this is the single strongest pacing device in the genre, because it converts "I want a better striker" into "I must live with this until January".
3. **Season expectations** — the board sets a target (league position, cup run) *before* the season, and **Board Confidence** tracks it all year; SI's manual ties match importance to it: *"Board Confidence tells you how important the Board deems the competition to be."* This is what makes a mid-table cup run *mean* something.
4. **The grind** — 45–60 matches at ~3.5-day cadence, with press conferences, training, injuries, morale.
5. **End-of-season review** — final table, awards (player of the season, top scorer, young player), board review of your performance, and either contract renewal, a bigger job offer, or the sack.
6. **Rollover** — contracts expire, loans return, youth players promoted, new fixtures generated, and the whole thing restarts with a *new* expectation.

### 5.2 How FM paces a season (the numbers that matter)

| Lever | FM value | Effect |
|---|---|---|
| Matches per season | ~45–60 | Long enough for variance to even out, short enough to finish |
| Days per match | ~3–4 | Forces rotation; creates "the next game" rhythm |
| Transfer windows | 2 per year | Freezes the squad; makes decisions stick |
| Board review | Continuous + end of season | A second success metric beside the table |
| Season length (real time) | 20–60 hours desktop; much less on Touch/Mobile (SI: "Season speed" 3/5 desktop vs 5/5 Mobile) | The *same* season, deliberately different time cost |

**The pacing insight:** FM is not paced by content (there is no level 2), it is paced by **the calendar plus scarcity of decisions** — windows, injuries, fatigue, and the fact that you only get one team talk per match.

---

## 6. FM desktop vs Console vs Touch vs Mobile

### 6.1 SI's own feature matrix (FM24, official)

From SI's [official FM24 comparison page](https://web.archive.org/web/20250114140354/https://www.footballmanager.com/compare-games) (archived; the live page now serves FM27). Values are verbatim.

| Feature | **FM24 (desktop)** | **FM24 Console** | **FM24 Mobile** | **FM24 Touch (Apple)** | **FM24 Touch (Switch)** |
|---|---|---|---|---|---|
| Playable nations | 55 | 55 | **26** | 55 | 55 |
| Playable leagues | 124 | 124 | **72** | 124 | 124 |
| Loadable nations | Unlimited | **10** | **5** | **5** | **5** |
| Loadable players | Unlimited | **50,000** | **32,000** | **35,000** | **35,000** |
| Match engine | 2D + 3D, camera angles, zoom, speed control | 2D + 3D | **2D only, simplified, goal replays** | 2D + 3D | 2D + 3D |
| Engine detail (SI star rating) | 5/5 | 4.5/5 | **2/5** | 4/5 | 4/5 |
| Game detail (SI star rating) | 5/5 | 4/5 | **3/5** | 4/5 | 4/5 |
| Season speed (SI star rating) | 3/5 | 4/5 | **5/5** | 4/5 | **3/5** |
| Pre-game editor | **Yes** | No | No | No | No |
| In-game editor | Yes (paid DLC) | No | **Yes** | No | No |
| Optional DLCs | No | **Yes** | No | No | No |
| Online career / network play | **Yes** (Steam↔Epic↔MS) | Xbox/PS5 cross-play | N/A | **N/A** | **N/A** |
| Offline modes | Career (Original/Real World/Your World), Fantasy Draft, Create-a-Club | + Challenge Mode, Fantasy Draft, Create-a-Club | Career, Challenge Mode, Create-a-Club | + Challenge Mode | + Challenge Mode |
| Save compatibility | FM23→FM24 | FM23→FM24 | **No** | FM23→FM24 | FM23→FM24 |
| Core feature bullets | "Total tactical control • In-depth, global scouting • Unlimited career length • Unlimited game slots • Full player and media interaction" | "**Streamlined responsibility** • Optimised for device • **Optional instant match result** • **30-season limit** • Challenge Mode" | "Optimised for faster gameplay • 30-year limit • 8 game slots • Challenge Mode" | "**Streamlined responsibility** • **Optional instant match result** • 30-season limit • Challenge Mode" | Same as Touch |

Two things jump out:

1. **"Full player and media interaction" is a desktop-only bullet.** SI is telling you, in its own marketing, that media interaction is the *first* thing a reduced edition drops.
2. **"Streamlined responsibility" + "Optional instant match result"** is the reduced-edition *identity*. The cut is not the tactics or the transfers — it's the **ceremony around the match**.

### 6.2 FM26 — same shape, bigger numbers

FMScout's [FM26 platform comparison](https://www.fmscout.com/a-fm26-game-comparison.html) (Nov 2025):

| Feature | FM26 | Console | Touch | Mobile |
|---|---|---|---|---|
| Playable leagues | **156** | 148 | 148 | **89** |
| Playable nations | 58 | 58 | 58 | **27** |
| Nation limit per save | Unlimited | **10** | **5** | **5** |
| Database size | 750,000+ | **60,000** | **45,000** | **~35,000** |
| Unity engine | Yes | Yes | Yes | **No** |
| Max career | Unlimited | **30 years** | **30 years** | **30 years** |
| Pre-game editor | Yes | No | No | No |
| In-game editor | Yes | No | No | Yes |

### 6.3 The qualitative differences (what the numbers don't say)

**Touch / Console** — SI forum consensus, from ["what is the difference between the full version of FM and FM Touch?"](https://community.sports-interactive.com/forums/topic/540919-what-is-the-diffrence-between-the-full-version-of-fm-and-fm-touch/):

> "Game speed is quicker as there's not as much depth, eg **no press conferences, stripped back media and dynamics** etc. Core game is the same though — **uses the same match engine, same graphics, same tactics, same players.** … if you want to zip through seasons whilst having **around 70% of the depth** of the main game, it might be for you."

That is the single most useful sentence in this whole document: **SI's own community's summary of Touch is "same engine, same tactics, 70% of the depth, none of the media".**

Other players in the same thread: *"It has all the good stuff of the full fat version, but does away with the boring and repetitive media stuff and player interactions"*; *"Lol spending 70 hours playing one season, brb doing 3/4 seasons in that time and having a life too."*

**Touch's manual has a totally different shape from desktop's.** Desktop's manual includes chapters on *Training*, *Tactics*, *Transfers/Recruitment/Scouting*, *Dynamics*, *Staff*, *Finances*, *Competitions*, *League Information*, *Versus Mode*. The Touch/Console manual replaces *Dynamics* with a thinner **Player Happiness** chapter and has no *Scouting* chapter at all — just **Recruitment**. (Chapter lists read from the [SI manual portal](https://community.sigames.com/sigames-manual/).) Fewer chapters = fewer systems; this is a surprisingly reliable proxy for scope.

**Mobile** — the most-reduced edition, and the most opinionated:

- **2D engine only.** TouchArcade: *"Football Manager 2024 Mobile still uses the 2D match engine unlike the other versions of the game."*
- **Half the world.** *"It supports about half the playable nations and a bit over half the playable leagues compared to Football Manager 2024 Touch."* (Official: 26 vs 55 nations, 72 vs 124 leagues.)
- **Challenge mode is a headline feature** — short, scenario-based, "win in 3 seasons with this squad" — explicitly *not* an infinite career.
- **8 game slots, 30-year cap.**
- **In-game editor included** (monetisation lever).
- No manual chapter for "Playing A Match" at all — Mobile's manual chapters are Home/News/Team/Tactics/Fixtures/Team Report/Development Hub/Finances/Staff/Medical/Club/Transfers/Player Search/Jobs. **There is no matchday chapter**; the match is a screen you pass through, not a place you inhabit.

**Console** — the interesting middle child. TouchArcade: *"an upgrade over FM24 Touch, but not at par with FM24 (PC) yet… There is some silver lining though… the interface is very good for a controller"*, and **"Optional instant match result"** is explicitly a console feature. So Console ≈ Touch's depth with a 10-inning controller UI and a 10-nation load limit.

### 6.4 So what do the tiers *prove* is cuttable?

Ranked by strength of evidence — this is the "what can a small team skip" list:

| Rank | Cut feature | Evidence strength | Notes |
|---|---|---|---|
| 1 | **Press conferences / media interviews / tunnel interviews** | **Very strong** — SI's own comparison ("Full player and media interaction" desktop-only), SI forum ("no press conferences, stripped back media"), RPS ("become a chore") | SI removes it from every reduced tier and nobody mourns it |
| 2 | **3D match engine** | **Very strong** — official: Mobile is 2D-only, engine detail 2/5 | 2D + text is a legitimate, shipped product |
| 3 | **Deep scouting network** (scouts, assignments, knowledge fog) | Strong — Touch manual has "Recruitment", not "Scouting"; SI forum "stripped back" | Replaced by a simple searchable market |
| 4 | **Dynamics / squad hierarchy / social cliques** | Strong — desktop has a Dynamics chapter, Touch has "Player Happiness" | Morale survives; the org-chart doesn't |
| 5 | **Large playable-world database** | **Very strong** — 26 nations/72 leagues (Mobile) vs 55/124; 27 vs 58 in FM26 | Content volume is a cost, not a requirement |
| 6 | **Editors (pre-game & in-game)** | **Very strong** — official matrix | Pure modding/tooling scope |
| 7 | **Online/network career modes** | **Very strong** — N/A on Touch/Mobile | Async-first is not a compromise for a small team; it's the norm on mobile |
| 8 | **Unlimited career length** | **Very strong** — 30-season cap on all three reduced tiers | A bounded "season" is a feature, not a limitation |
| 9 | **Individual training micro-management** (schedules, focus, coaching assignments) | Medium — Touch keeps a Training chapter but simplified; SI forum "70% depth" | **(Partly unverified)** — exact cut list per edition varies by year |
| 10 | **Full staff/coaching org chart** | Medium — Console/Touch have "Staff" chapters but reduced hiring/assignments | Delegate-to-assistant is the escape hatch SI uses everywhere |

**The meta-lesson:** SI's reduced tiers cut **ceremony and administrative surface area**, and keep **tactics, transfers, the match result, and player development**. They never cut the *decision*, only the *paperwork around the decision*.

---

## 7. What players actually say matters most

### 7.1 The watching/managing ratio

The SI forum thread on [how players watch matches](https://community.sports-interactive.com/forums/topic/564847-how-do-you-watch-your-games/) is a small, honest sample of the hardcore:

- *"2D classic, Key highlights, no replays"*
- *"Only commentary as it saves me a load of time that I sadly don't have to play FM nowadays!"*
- *"3D / Extended Highlights: To see how the tactic works. 3D / Key: after I found how the tactic works."*
- *"3D full match"* / *"2D full matches with 3D director view for replays"* — the minority who watch everything
- *"3d, key highlights until I'm frustrated (usually down by 2 or 3) then only commentary"* — **engagement is conditional on the match going well**

That last one is a product insight: **players don't choose a viewing mode once; they choose it dynamically based on whether the match is interesting.** A raid game should let the "view" degrade gracefully when the run is already decided.

### 7.2 The ratio, stated plainly

FM's own design implies roughly: **80–90% of playtime is club management (transfers, tactics, training, contracts), 10–20% is watching matches** — and the reduced editions push that to ~95/5. The match is the *payoff*, not the *activity*. But note the counter-current: the match is what makes the spreadsheet *mean* something. RPS:

> "FM24 also demonstrates why a change is welcome, as in its current form it can struggle to strike the balance between authenticity and fun."

### 7.3 What people love (and therefore what to protect)

- **The transfer market.** PC Gamer spends more words on agents and transfers than on the engine; RPS calls the new selling tools "a headache" but still the heart of the game. The fantasy of *building* is stronger than the fantasy of *watching*.
- **Tactic-building and seeing it work.** From the forum: extended highlights are used "to see how the tactic works", then dropped. The *aha* is the moment the shape does what you drew.
- **The imagined world.** PC Gamer, best line in any review of the genre:

> "The very best thing about Football Manager is how much of it exists only in your head… Simple spreadsheets of statistics become human players you feel actual emotional responses to."

### 7.4 The complaints (UX density, onboarding, menus)

- **PC Gamer** on the match screen:

> "I find the sheer density of information overwhelming… There's a Sky Sports studio worth of statistics onscreen, full readouts of all 22 player's match ratings, energy levels and their moods… It feels like **sellotaping five phones together and scrolling a different social media feed on each of them, all at once.** My brain needs someone or something to curate that information more selectively."

- **PC Gamer** on the club layer:

> "It feels like **wading knee-deep through menus.** You could go on holiday between matches to speed things up, but you'd only end up with 300 emails and some crucial missed opportunity to lament."

- **RPS** on the ceremony:

> "Having simulated press conferences and matchday interviews makes the experience more authentic, but they **very quickly become a chore** to interact with. Likewise, weekly staff meetings always involve you clicking 'Do it' on various minor points… these elements are not much fun to start with. Indeed, the game often **overrelies on managerial suggestions for optimal decisions**, rather than structuring its UI and datasets in such a way to make player decision-making more intuitive."

- **RPS** on onboarding:

> "…one that offers huge rewards provided you're willing to **brave those initial ten hours feeling overwhelmed by it.**"

- **PC Gamer** on season length: *"It still takes too long to get a season done."*

**Synthesis:** the three recurring complaints are **(1) too much data with no curation, (2) too many menus with no prioritisation, (3) too much ceremony that is a click, not a choice.** All three are *information architecture* problems, not depth problems — which is exactly the class of problem a small team can win on.

---

## 8. Implications for an async, text-first raid-race game

1. **Design the pause points first, the combat second.** FM's ritual is ~6–10 forced stops per match. For a raid, the equivalent is: (a) **roster lock** before the run, (b) **plan commit** (route/order/consumables), (c) **one mid-run intervention window** per boss (your "half-time"), (d) **post-boss debrief**, (e) **post-race review**. Five stops, each with a real choice, is the whole game. If a screen doesn't contain a decision, delete it or auto-resolve it.

2. **Make the pre-run briefing do the work FM's staff meeting does.** One screen: expected boss mechanics, the rivals' likely pace, your roster's readiness, and 4–6 explicit "questions to answer before you commit" (adapted from SI's checklist in §1.1). This is the cheapest possible source of perceived depth — it is *text*, not systems.

3. **Sell presence in tiers instead of FM's binary instant-result.** Ship three run modes: **Full** (live text feed + 2 intervention windows), **Summary** (text feed + 1 window), **Instant** (result + report only, lower reward or no world-first eligibility). FM proves players will take the fast path; make the fast path *a choice with a cost* rather than a punishment — and heed SI's own warning that the fast path can hollow the game out: *"you've not really got any idea who has been performing for you beyond their stats and they're reduced to just numbers."* The mitigation is not to remove Instant but to make Full **measurably but modestly** better, and to keep the *debrief* rich enough that a skimmer still learns who did what.

4. **Adopt the 4-metric diagnostic, in a fixed order, at the debrief.** Your xG-equivalent (threat/damage efficiency), average position (are units where you placed them / aggro spread), pass map (is the support chain connecting — e.g. healer→tank uptime), possession-by-zone (where the fight is happening). Then **always end each metric with a named lever** ("swap the off-tank", "shift the second boss earlier"). Data without a lever is FM's most-complained-about screen.

5. **Copy FM's trick of pre-loading diagnostics at the forced decision point.** At the mid-run intervention, the debrief data should already be on screen — no navigation. The pass map "shown by default at half-time and full-time" is a one-line design decision that makes the whole analysis layer feel integrated.

6. **Use a season, not an endless ladder.** A **8–12 week "season"** with a fixed fixture list (e.g. 5 bosses × 3 lockout resets = 15 "fixtures"), a pre-season expectation set by a guild board ("clear boss 4 / top 3 in tier"), a mid-season roster window, and an end-of-season review + awards. FM's 30-season cap on every reduced tier is evidence that **bounded campaigns retain players better than infinite ones** for small teams.

7. **Tie-breakers are content — publish them.** FM's Rules screen exists because players *read* it and plan around it. Publish the ladder sort order (time → attempts → kill timestamp → head-to-head → seed) and show it on the leaderboard header. Ambiguous tie-breaks are the fastest way to lose a competitive community.

8. **Make the 3 NPC rivals a *pace*, not a *dice roll*.** Deterministic, announced schedules ("Ironclad clears Boss 3 at T+6h") give the race a heartbeat and give a solo player someone to beat at 2am. This is FM's "title odds"/"season preview" repurposed as an async opponent.

9. **Cut the ceremony, keep the consequences.** From §6.4: no press conferences, no 3D, no scouting network, no dynamics org-chart, no editor, no unlimited database. **Keep**: roster building, the plan, the mid-run call, the debrief, the ladder. If a feature generates text nobody reads and a choice nobody makes, SI has already proven you can ship without it.

10. **Curate ruthlessly; never show 22 numbers at once.** PC Gamer's "five phones sellotaped together" is the failure mode. Rule of thumb from the FM evidence: **one headline number, one supporting visual, one recommended action per screen.** Let the player drill down; do not open with the drill-down.

---

### Appendix — source list

**SI primary**
- FM24 manual, *Playing A Match* — https://community.sigames.com/sigames-manual/football-manager-2024/playing-a-match-r4966/ (archived: https://web.archive.org/web/20240301020820/https://community.sigames.com/sigames-manual/football-manager-2024/playing-a-match-r4966/)
- FM24 manual, *Competitions and Fixtures* — https://community.sigames.com/sigames-manual/football-manager-2024/competitions-and-fixtures-r4965/
- FM24 manual, *Touch and Console Edition* chapter tree — https://community.sigames.com/sigames-manual/football-manager-2024-touch-and-console/
- Official platform comparison (FM24) — https://web.archive.org/web/20250114140354/https://www.footballmanager.com/compare-games
- Steam, FM24 — https://store.steampowered.com/app/2252570/Football_Manager_2024/

**Comparisons & reviews**
- FMScout, *FM26 Game Comparison Across Platforms* — https://www.fmscout.com/a-fm26-game-comparison.html
- TouchArcade, *FM24 review: Touch vs Mobile vs PS5 vs PC* — https://toucharcade.com/2023/11/14/football-manager-2024-review-touch-vs-mobile-vs-ps5-vs-pc-steam-deck-features-save-controller-console/
- Rock Paper Shotgun, *FM24 review* — https://www.rockpapershotgun.com/football-manager-2024-review
- PC Gamer, *FM24 review* — https://www.pcgamer.com/football-manager-2024-review/
- Goal.com, *FM24 Touch on Apple Arcade* — https://www.goal.com/en-in/news/football-manager-2024-touch-play-apple-arcade/blt9da29486fc17d497

**Guides / community**
- assman.ai, *Reading the Match Tablet* — https://assman.ai/guides/reading-match-tablet
- CharlieINTEL, *FM24 team talks & shouts explained* — https://www.charlieintel.com/games/football-manager-2024-team-talks-shouts-explained-285457/
- fccadoni, *FM24 Shouts* — https://fccadoni.medium.com/football-manager-2024-shouts-06c5251803f5
- SI forum, *FM vs FM Touch* — https://community.sports-interactive.com/forums/topic/540919-what-is-the-diffrence-between-the-full-version-of-fm-and-fm-touch/
- SI forum, *How do you watch your games?* — https://community.sports-interactive.com/forums/topic/564847-how-do-you-watch-your-games/
- SI forum, *Instant Result* (incl. Marc Vaughan's design rationale) — https://community.sports-interactive.com/forums/topic/569604-instant-result/
- Premier League, *What are the rules on Premier League squad lists?* — https://www.premierleague.com/en/news/4706140/
