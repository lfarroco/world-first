# Football Manager 24 — Club Operations Teardown

**Scope.** Football Manager 2024 (Sports Interactive), desktop PC/Mac, patch 24.x. The brief is *interaction patterns and decision surfaces*, not feature inventory — so each section below is written as: where it lives, what is on screen, what the player actually decides, and the numbers that bound those decisions.

**Method / confidence.** Drawn from fan-site deep dives (FM Scout, Passion4FM, SortitoutSI), GiveMeSport's FM24 tab-by-tab guides, SI's own FM24 feature notes, and hands-on knowledge of the FM24 UI. Numbers that I could confirm in a source are cited inline. Numbers that are widely known but that I could not pin to a specific page in this pass are marked **(unverified)** — treat those as "shape is right, exact value needs a check" rather than gospel. FM24 is also the last of the "old" UI lineage before FM25/FM26's Unity rebuild, so it is the cleanest reference for a 2D, panel-based management sim.

**One structural note before the systems.** FM is not a set of menus; it is a *calendar with a sidebar*. Almost every screen is reachable two ways: from the left nav (Inbox, Squad, Tactics, Training, Scouting, Transfers, Club, Competitions) and from a contextual card (a news item, a player row, a scout report). The design relies on **cross-links**: a news item about an unhappy player links to his profile, his profile links to his contract, his contract links to the wage budget, the wage budget links to the board. That link graph — not any single screen — is what makes the club feel like a system.

---

## 1. Tactics

### Screen(s)
- **Squad → Tactics** (also a top-level "Tactics" nav item). The screen holds **three tactic slots** (commonly treated as primary / secondary / tertiary), each independently trained and independently familiar.
- Two working surfaces inside it: the **tactic board** (pitch + instructions) and **Set Pieces**.
- A cut-down version of the same surface appears **in-match** (Tactics/Instructions overlay), plus **Opposition Instructions** and **touchline shouts**.
- Player-level echoes: *Player → Development → Tactics* (individual familiarity, positional ability) and the *Squad view* column for tactical familiarity ([Passion4FM](https://www.passion4fm.com/how-to-maximize-tactical-familiarity/)).

### What you see
- **A vertical pitch, top-down, attacking upward**, with eleven draggable shirt dots. Each dot carries the position label, the **role name**, and the **duty** (Defend / Support / Attack). Empty slots are outlined; the pitch is the primary input device, not a diagram.
- **A formation dropdown** of presets grouped by shape (4-4-2, 4-2-3-1, 4-3-3 DM, 4-1-4-1, 3-5-2, 5-3-2, 4-4-2 diamond, asymmetric presets…). Choosing one moves the dots and assigns default roles/duties that the player then edits.
- **A left-hand squad list** with per-player morale icon, condition %, match sharpness, and a **role-suitability star rating** (0.5–5 stars) that updates live as you change the selected role. This is the single most-used affordance on the screen: it turns "who plays where" into a sortable, star-rated matching problem.
- **A right-hand Team Instructions panel**, grouped into exactly three phases — **In Possession / In Transition / Out of Possession** — with each instruction rendered as a labelled row carrying either a **five-notch slider** or a **toggle**.
- **A mentality ladder along the bottom**: seven stops from **Very Defensive → Defensive → Cautious → Balanced → Positive → Attacking → Very Attacking** (the seven-stop ladder is standard in FM19+; a tactic export shows "Mentality: Attacking" as a discrete field — [SortitoutSI tactic export](https://sortitoutsi.net/content/68101/gyr-meta-3421-fm24-tactic-quadruple-winning-x-2)).
- **A computed "tactic style" label** (Gegenpress, Tiki-Taka, Wing Play, Fluid Counter-Attack, Route One, Catenaccio, Park the Bus…) derived from the role/duty/instruction combination. FM Scout's guide is explicit that the game *reads* your setup and classifies it, and that the classification is stable enough to drive recommended training ([FM Scout](https://www.fmscout.com/a-getting-the-best-out-of-your-tactics.html)).
- **A familiarity meter** near the bottom of the board. Hovering it opens the per-category breakdown (see Numbers).
- **A computed "Team Fluidity" label** — FM24's own hints describe it as "the shape and structure of the team based on the roles and duties selected": a setup where defenders and midfielders join the attack reads more fluid than one told to hold shape ([FM24 Induction Hints & Tips](https://www.fmscout.com/a-football-manager-2024-induction-hints-and-tips.html)). It is a readout, not a slider — you change it by changing roles and duties, which is why the role/duty grid is the true control surface.
- **A tactic Intensity readout** — how hard the setup asks the players to work, and therefore how quickly they tire; the explicit bridge from the tactics screen to the medical/fitness screens ([FM24 Induction Hints & Tips](https://www.fmscout.com/a-football-manager-2024-induction-hints-and-tips.html)). A high-press/high-tempo tactic is a season-long fitness decision, not only a match decision.
- **Player Instructions**: select any player on the pitch and a right-hand inspector opens with role dropdown (searchable, grouped by position), duty buttons, role-suitability stars, and a checklist of player instructions — *Take More Risks, Dribble More/Less, Pass Shorter/More Directly, Cross More Often/Less Often, Cross From Deep/Byline, Cut Inside With Ball, Stay Wider, Sit Narrower, Get Forward, Get Further Forward, Hold Position, Close Down More/Less, Mark Tighter, Tackle Harder, Ease Off Tackles, Move Into Channels, Roam From Position, Hold Up Ball* (names confirmed in tactic exports, e.g. "Sit Narrower", "Take More Risks", "Dribble More", "Tackle Harder" — [SortitoutSI](https://sortitoutsi.net/content/68101/gyr-meta-3421-fm24-tactic-quadruple-winning-x-2)).
- **Set Pieces tab**: a list of routines by category — attacking/defending corners (left and right), wide/deep/central free kicks, throw-ins (left/right), penalties. Opening one shows a **pitch diagram with eleven assignable slots**, a delivery-style selector (inswing / outswing / short / long / near-post / far-post variants), a designated taker/creator, and per-player **routine jobs** (*Attack Near Post, Attack Far Post, Stand On Far Post, Lurk Outside Area, Mark Goalkeeper, Offer Short Option, Stay Back, Short Post, Provide Cover*). The routine is stored per tactic and trained like any other pattern.

### Decisions
- **Formation** (shape) and therefore the number of players in each band.
- **Eleven role + duty pairs.** Each role is a behavioural package; each duty is a risk licence. Role choice is constrained by suitability stars, attribute highlighting ("key attributes for this role"), and the player's positional familiarity.
- **Mentality** — one global risk dial that silently moves tempo, width, line height and passing risk together.
- **~25–30 team instructions**, most with five notches. The real instruction vocabulary in FM24 (confirmed from tactic exports, not exhaustive):
  - *In Possession:* Attacking Width, Passing Directness, Tempo, Pass Into Space, Play Out Of Defence, Dribble Less, Be More Expressive / Be More Disciplined, Work Ball Into Box, Hit Early Crosses, Low Crosses, Run At Defence, Shoot On Sight, Focus Play Down The Left / Right / Through The Middle, Overlap Left / Overlap Right.
  - *In Transition:* Counter-Press vs Regroup; Counter vs Hold Shape; goalkeeper distribution — Distribute Quickly, Roll It Out, Take Short Kicks / Take Short Goal Kicks, Distribute To Centre-Backs, Distribute To Full-Backs, Distribute Over Opposition Defence, Slow Pace Down.
  - *Out of Possession:* Defensive Line, Line of Engagement, **Trigger Press**, Prevent Short GK Distribution, Use Offside Trap, Step Up More, Drop Off More, Trap Outside / Trap Inside, Defend Narrower / Wider, Get Stuck In, Stay On Feet, Invite Crosses.
  ([SortitoutSI exports](https://sortitoutsi.net/content/74294/fm24-broken-possession-4-3-3-paulo-fonsecas-masterclass-lyon-91-gs-won-ligue-1-and-conference-league) show these as literal field names, including "Trigger Press: Much More Often", "Step Up More", "Trap Outside", "Focus Play Through The Middle", "Be More Expressive".)
- **Player instructions** to break role defaults (the classic "role says hold width, I want him inside" override).
- **Set-piece routines** — who attacks which post, who stays back, delivery type, short-option vs aerial.
- **Which of the three slots to train** and therefore which tactic the squad actually becomes fluid in.
- **In-match**: change mentality/instructions/roles, apply opposition instructions (tight-mark a playmaker, show a winger onto his weaker foot), shout.

### Numbers / ranges
- **Mentality:** 7 stops.
- **Duties:** 3 (Defend / Support / Attack); not every role offers all three.
- **Role inventory:** roughly 40–50 distinct roles across GK/DC/WB/DM/CM/AM/W positions, each with a small duty subset **(unverified exact count)**.
- **Instruction granularity:** 5 notches for width, passing directness, tempo, defensive line, line of engagement, trigger press; binary toggles for the rest.
- **Tactical familiarity is eight independent sub-scales**, per Passion4FM: **Mentality, Passing Style, Creative Freedom, Trigger Press, Marking, Tempo, Width, Position/Role/Duty**. The bar runs from **"awkward" (poor knowledge) to "fluid" (full knowledge)**; hovering reveals which scale is lagging ([Passion4FM](https://www.passion4fm.com/how-to-maximize-tactical-familiarity/)).
- **Familiarity is lossy.** Changing mentality, passing directness, creative-freedom instruction, trigger press/line of engagement, marking instructions, tempo or width drops the corresponding sub-scale. Changing a player's position/role/duty drops the Position/Role/Duty scale. Changing extremes hurts more than nudging one notch, because one slider moves several scales at once ([Passion4FM](https://www.passion4fm.com/how-to-maximize-tactical-familiarity/)).
- **Time-to-fluid:** the practical unit is *weeks of pre-season*, not days. The standard community prescription is one tactic only, no tinkering, plus Match Tactics / Match Practice / Overall sessions until fluid — see §2 for the session-level multipliers.
- **Club formation bias:** each club has a preferred and secondary formation in the database (visible only in the editor) which starts the squad with higher familiarity in that shape — so the same tactic is "free" at one club and expensive at another ([Passion4FM](https://www.passion4fm.com/how-to-maximize-tactical-familiarity/)).
- **Familiarity is also individual**: every player has his own familiarity bar with the tactic, formation and role/duty, visible in *Player → Development → Tactics/Training* or as a squad-view column ([Passion4FM](https://www.passion4fm.com/how-to-maximize-tactical-familiarity/)).

### Why this screen matters for feel
The tactics board is the only screen where the player *authors* something rather than *reacting*. But the familiarity system is what makes it a management game rather than a loadout screen: authorship has a **training cost**, and the cost is visible as a slowly filling bar that punishes exactly the behaviour players want to do (tinker every week). The screen's genius is that the punishment is *legible* — you can see which of the eight scales you broke.

---

## 2. Training

### Screen(s)
- **Training** (top-level nav) with tabs: **Overview, Calendar, Schedules, Units, Match Preparation, Mentoring, Individual, Rest, Coaches** — GiveMeSport's FM24 guide walks exactly these nine tabs ([GiveMeSport](https://www.givemesport.com/football-manager-2024-training-guide/)).
- **Player → Development → Training** (individual focus, attribute progress, training happiness).
- **Staff → Responsibilities → Training** (who leads general training, individual training, match prep, mentoring).
- Medical Centre (injury risk, condition, sharpness) is a linked screen, not a training tab.

### What you see
- **Calendar:** a week grid — seven day-columns, **three session slots per day** (morning / afternoon / evening) — with the match day greyed out and a recovery day marked. Session cards are colour-coded by type and by intensity, and carry a small icon row showing which attribute groups they develop. You drag sessions from a right-hand palette onto slots, or apply a preset schedule and edit it.
- **The palette** is grouped: *General* (Overall, Outfield, Attacking, Defending, Possession, Tactical), *Match Prep* (Match Tactics, Match Practice, Teamwork, Defensive Shape, Attacking Movement), *Attacking/Defending/Tactical* unit sessions (Attacking Patient, Attacking Wings, Attacking Direct, Defending Engaged, Defending Disengaged, Defending Wide, Defending From The Front, Attacking/Defensive Shadow Play), *Physical* (Quickness, Endurance, Strength, Recovery), *Set Pieces*, *Rest*, and *Community Outreach*. The list is long and the naming is what makes the screen feel like a coaching manual rather than a spreadsheet.
- **Overview:** the week at a glance, best/worst trainers, training happiness summary, injuries, and the **coaching assignment star ratings** (1–5 stars per category) with workload indicators.
- **Match Preparation:** a separate tab that chooses the week's *opponent-specific* focus — tactical preparation (the shape you'll use) plus **set-piece preparation** (attacking vs defending corners/free kicks), with the upcoming opponent's threats surfaced next to it. GiveMeSport's description: "when playing weaker sides… use Possession Phase… complement by training attacking set pieces; against stronger opposition, focus on defending set pieces" ([GiveMeSport](https://www.givemesport.com/football-manager-2024-training-guide/)).
- **Units:** a per-unit (Goalkeepers / Defenders / Midfielders / Attackers) view that ties training to the roles those players hold in the tactic — the tactical and training screens share the same role assignments ([GiveMeSport](https://www.givemesport.com/football-manager-2024-training-guide/)).
- **Individual:** a table of every player with **Training Intensity** (Double / Normal / Half / Rest), **Focus** (position/role/duty, ideally a specific role rather than a vague position), **Additional Focus** (an attribute-group focus such as Quickness, Ball Control, Pressing, Passing), **Trait training** (learn/refine a preferred move), and **Weaker Foot** training. Each of these consumes intensity budget.
- **Rest:** per-player rest days, "rest before/after match" toggles, and auto-rest rules; the screen is where fatigue management actually happens.
- **Mentoring:** create small groups (senior mentor + 1–3 young players) to transfer personality/determination/traits; group composition is shown as a card with the mentor's personality and the mentees' likely effect.

### Decisions
- **The week's shape**: which sessions, on which days, at what intensity, with which rest days. This is a 21-slot optimisation problem with a match-day constraint.
- **Per-player intensity** and **individual focus** — the main lever for developing a specific player rather than the team.
- **Additional focus vs injury risk** — the game explicitly trades development speed against strain; FM Scout's guide says intensity should never exceed Medium and additional focus/traits/weaker foot should be dialled back to keep it there ([FM Scout](https://www.fmscout.com/a-fm24-training-guide-and-schedules-by-jonasmorais.html)).
- **Mentoring groups** (who influences whom).
- **Delegation**: hand general training, individual training, match prep or mentoring to a coach (a one-click difficulty reduction).

### Numbers / ranges
- **21 session slots per week** (3 × 7), minus match day and any rest days; congested weeks may have 2 matches, leaving ~12–15 usable slots.
- **Intensity:** per-player Double / Normal / Half / Rest; session cards also carry an internal intensity that aggregates into the player's weekly load.
- **Coach quality:** 1–5 stars per coaching category, driven by the coach's attribute for that category and his **workload** (Light / Average / Heavy). GiveMeSport's line is the key mechanic: a coach split across two categories gives "three-star services to both instead of five-star sessions if only one category was selected" ([GiveMeSport](https://www.givemesport.com/football-manager-2024-training-guide/)).
- **Workload:** FM Scout's guide recommends keeping each category at **Light or Average**; heavier workload dilutes session quality ([FM Scout](https://www.fmscout.com/a-fm24-training-guide-and-schedules-by-jonasmorais.html)).
- **Injury risk** is surfaced as a **Risk of Injury** indicator (low/medium/high) plus **Condition %** and **Match Sharpness %**; jadedness accumulates across a congested fixture list. There is no single "injury chance" number in the training UI — the player reads risk through these three proxies.
- **Development feedback:** attribute changes appear as green/red arrows on the player's attribute panel; a **training rating** (roughly 0–10, week-average) appears in squad views and drives the praise/criticise interaction. FM Scout's heuristic: praise at 7.5+, criticise at 6.5−, about once a month ([FM Scout](https://www.fmscout.com/a-fm24-training-guide-and-schedules-by-jonasmorais.html)).
- **Training happiness** is a per-player state (e.g. "delighted with the training schedule", "unhappy with the level of training") that feeds morale and, through morale, performance.

### Interaction pattern worth stealing
Training is a **grid + palette** editor with a *cost model the player internalises rather than reads*. The game rarely shows "this session will add 0.03 to Passing"; it shows coloured cards, intensity pips, and a happiness face. The player learns the model by outcome. That is a deliberate choice: it keeps the screen fast at the cost of transparency, and it is why community "meta schedules" exist.

---

## 3. Scouting (the information economy)

### Screen(s)
- **Scouting** (top-level nav): **Scouting Centre** (recommendation cards/list), **Recruitment Focus** (assignments), **Scouting Coverage** (world map, per-scout pins, knowledge heat map), **Players in Range**, **Scouted Players**, **Shortlists/Mission reports**.
- **Staff → Overview → Recruitment Team** (scout attributes, team size vs allowed maximum, league comparison).
- **Player Search** (basic/quick/advanced filters) — reachable from Scouting and from Transfers.
- **Player profile → Report** tab (scout report card, pros/cons, recommendation).

### What you see
- **Scouting Centre** is a feed of **recommendation cards**. Card view gives a mini report (position, age, recommendation grade, CA/PA stars, asking price, wage demand); list view compresses to a sortable table. The panel is filterable by source (Scouting / Recruitment / Analyst / Agents / Players / Meeting candidates) and by minimum recommendation level ([Passion4FM](https://www.passion4fm.com/scouting-in-football-manager/)).
- **Recommendation card actions** are the verbs of the whole information economy: **Shortlist, Fully Scout Player, Discuss With Agent, Make Offer, Not Interested, Acknowledge** — and at meetings additionally **Get Analyst Report, Scout Player, Keep Scouting, Offer Trial, Agent Availability, Add as Transfer Target, Declare as Top Target** ([Passion4FM](https://www.passion4fm.com/scouting-in-football-manager/)).
- **Scouting Coverage** is a **world map with scout pins**, plus a **knowledge heat map** per nation/region and a list of who provides each knowledge. This is the screen that makes the world feel *partially known*.
- **Recruitment Focus** is a form: position (or any), age range, role, **priority (Top / Standard / Ongoing)**, which scouts, plus "further details" filters (value, wage, contract status, transfer status, nationality/league). Top priority requires **at least two scouts** and is capped by squad size ([Passion4FM](https://www.passion4fm.com/scouting-in-football-manager/)).
- **The scout report card** is the atomic unit: star rating for **current ability**, star rating for **potential ability**, a **recommendation grade** (letter-grade, e.g. B+ threshold used by Passion4FM), pros/cons bullets, "recommended signing" verdict, asking price and wage expectation, and a **knowledge/confidence** note ("scout has limited knowledge of this player").
- **Player Search** is a filter wall: age, nationality, position, role suitability, attributes (masked), CA/PA stars, contract status, transfer status, value, wage, league, "interested in transfer", "unattached", plus shortlist toggles. The advanced search is where the "database as marketplace" feeling comes from.

### Decisions
- **Where in the world to look** — allocate scarce scouts across regions/nations/competitions, trading breadth against depth.
- **Whether to buy knowledge** — scouting range is a *monthly subscription*; dropping from World to National outside transfer windows is a legitimate money-saving move ([Passion4FM](https://www.passion4fm.com/scouting-in-football-manager/)).
- **Which assignments to run** — Top priority (fast, expensive, two scouts) vs Standard vs Ongoing.
- **What to believe** — a low-JPA scout's 4-star potential is a noisy signal; the player learns to discount reports by scout quality and by knowledge level.
- **When to stop scouting and act** — the report is never complete; the game forces a decision under uncertainty.
- **Who to shortlist** (memory), **who to declare a Top Target** (public commitment, one at a time), **who to discard** (removes from future recommendations).

### Numbers / ranges
- **Knowledge ladder — 8 levels per nation/region:** None, Minimal, Nominal, Broad, Widespread, Comprehensive, Exhaustive, Unrestricted ([Passion4FM](https://www.passion4fm.com/scouting-in-football-manager/)). Knowledge determines *who is visible* in search and *how much of a player's profile is revealed*.
- **Knowledge sources — 3:** staff career history/regional knowledge, affiliate clubs (shared knowledge), and scouts on assignment. Time-in-nation matters; a scout gains knowledge of neighbouring nations too ([Passion4FM](https://www.passion4fm.com/scouting-in-football-manager/)).
- **Scouting range — 7 tiers:** No Scouting, Divisional, Surrounding Divisions, National, Regional, Continental, World ([Passion4FM](https://www.passion4fm.com/scouting-in-football-manager/)).
- **Knowledge delta:** switching from regional to national knowledge can move a player's knowledge level by **~10%**, which changes how long a scout must watch him to reach full knowledge ([Passion4FM](https://www.passion4fm.com/scouting-in-football-manager/)).
- **Scout attributes:** **Judging Player Ability (JPA)**, **Judging Player Potential (JPP)**, **Adaptability** (speed of settling/gaining knowledge), plus People Management for a Chief Scout. Elite clubs should look for **15+**; lower leagues **10+** is serviceable ([Passion4FM](https://www.passion4fm.com/scouting-in-football-manager/)).
- **Scouting budget:** the scouting range is billed **monthly** out of the scouting budget; individual trips cost per match watched; wages of scouts are **staff wages, not scouting budget**. Overspend kills the range and drops you back to staff knowledge only. The budget can be moved from/to the transfer budget — a real opportunity cost ([Passion4FM](https://www.passion4fm.com/scouting-in-football-manager/)).
- **Attribute masking:** with masking ON, attributes are hidden or shown as ranges until scouted; knowledge is revealed by scouting, by playing against the player, or by the player being in your division ([Passion4FM](https://www.passion4fm.com/scouting-in-football-manager/)).
- **Youth rating** (association-level, 0–200) drives the quality of newgens produced in a nation; community guides rank associations by it ([FM Scout](https://www.fmscout.com/a-best-scouting-regions-in-football-manager.html)).
- **Report granularity:** 0.5–5 stars for CA and PA; a letter recommendation grade; "recommended signing" is a boolean verdict; price/wage estimates come with error bars that shrink with knowledge.
- **Scout headcount scales with club size:** GiveMeSport cites Manchester City/United with **15+ scouts** and a non-league club with **one** ([GiveMeSport — How to Use Scouts](https://www.givemesport.com/football-manager-2024-gaming-how-to-use-scouts/)). Headcount is a board-granted resource, not a purchase.
- **Three alternative scouting channels** (important for a small-club or small-team design): **team report scouting** (one team per day, reveals the whole squad's profiles — a breadth tool), **agent offers** (agents push players to you; the cheapest channel in lower leagues), and the annual **trial day** (released players play a friendly you can scout) ([GiveMeSport](https://www.givemesport.com/football-manager-2024-gaming-how-to-use-scouts/)).

### The information economy, stated plainly
Scouting is the system that makes **information itself the scarce resource**. Four currencies are being traded:
1. **Scouts** (sensor count) — how many observations per week you can afford.
2. **Knowledge** (sensor quality / prior) — how much a report tells you, and how many players are even visible.
3. **Budget** (bandwidth) — monthly range subscription + per-trip costs.
4. **Time** (latency) — a full report takes weeks; the transfer window does not wait.

The player is therefore running a **portfolio of uncertain assets**: shortlist = watchlist, report = analyst note, recommendation grade = conviction, "declare top target" = public bid. The emotional beat is not "I found a player" but "I committed to a player on a 60%-confidence report and was wrong". Any guild-manager adaptation should preserve that: *the cost of finding out is part of the game*.

---

## 4. Transfers & contracts

### Screen(s)
- **Transfers** (top-level nav): Transfer Centre (active negotiations, offers, loans), Transfer Market (free agents, transfer-listed, loan-listed), Search, Shortlists, Transfer History, Clauses (sell-ons, buy-backs, installments owed/receivable), Loan Reports.
- **Player → Transfer** tab (status, value, interest, contract) and **Player → Contract** tab (terms, bonuses, clauses, expiry).
- **The negotiation modal** — a two-pane dialog that is the most consequential screen in the game.
- **Board → Requests** for budget top-ups; **Club → Finances → Wages** for the wage bill the deal will hit.

### What you see (the negotiation modal, in detail)
- **Left pane:** the player (photo, age, position, CA/PA stars as *your* scouts see them), his club, his agent (with relationship indicator), his **interest level** in the move, his **current contract** (expiry, wage), and — for a renewal — his **morale/happiness** and any "wants to stay / wants a new challenge" flag.
- **Stage 0 — promises before terms.** For a player (and for a renewal) the modal first asks what you are *promising*: **squad status / playing time**, and for younger players a development path. FM24's own in-game hints are explicit that "before you can discuss contract terms, you need to agree a set of promises that will guide the player's career at the club. Broken promises can create unhappy players" ([FM Scout — FM24 Induction Hints & Tips](https://www.fmscout.com/a-football-manager-2024-induction-hints-and-tips.html)). The promise is therefore a *future happiness liability*, priced into the deal.
- **Right pane:** a stack of **term rows**. FM24 lets each row be **locked** (non-negotiable), **excluded** entirely, or left **semi-negotiable** ("you stress its importance but might concede it if another part of the deal improves"), and the **whole deal** can be submitted as **Negotiable or Non-Negotiable** — the latter is the game's explicit ultimatum/"take it or leave it", with the warning that "not everyone will respond kindly" ([FM Scout — FM24 Induction Hints & Tips](https://www.fmscout.com/a-football-manager-2024-induction-hints-and-tips.html)).
- For a **transfer offer** the rows are roughly:
  - **Transfer fee** — total headline fee, broken into **upfront / installments** (monthly or annual, over 1–4 years).
  - **Contingent fees** — *after N appearances*, *after N league goals*, *after N league appearances*, *after a new contract* style triggers **(the exact trigger set varies; unverified)**.
  - **Sell-on clause** — percentage of a future sale (% of fee or % of profit).
  - **Other** — exchange/swap player, loan-back, friendly match **(buy-back is mainly relevant to certain leagues/regens; unverified)**.
  - **Total-package summary** — the number the AI actually evaluates against its valuation, not the headline fee.
- For a **contract offer/renewal** the rows are, per FM's contract vocabulary (a stable field list across recent versions — [contract negotiation field list](https://gamepro.pages.dev/posts/contract-negotiations/)):
  - **Wage** (weekly, with the wage-budget delta shown), **contract length**, **start date** ("when it will start", immediate or end of season), **signing-on fee**, **agent fee**, **loyalty bonus**.
  - **Squad status / playing time** — the promise tier. FM24's labels are roughly *Star Player → Important Player → Regular Starter → Squad Player → Fringe Player → Breakthrough Prospect → Youngster → Not Needed* (older builds used *Indispensable / Important First Team Player / Rotation / Backup / Decent Young Player / Not Needed* — labels drift, the tier structure does not) **(exact FM24 labels unverified)**.
  - **Bonus stack** — **appearance fee** (the easiest to trigger, so the AI's favourite sweetener), goal bonus, clean-sheet bonus, **team-of-the-year** bonus, **international cap** bonus, **unused-substitute** bonus, league-winner/cup-winner/promotion bonuses.
  - **Clauses** — **minimum fee release clause** (domestic and/or foreign clubs), **yearly wage rise %**, **sell-on fee %**, **seasonal landmark goal bonus**, **match highest earner clause**, **wage rise after N club league games**, **relegation wage drop**, **extension by club** ([field list](https://gamepro.pages.dev/posts/contract-negotiations/)).
  - **Release clause is a hard commitment, not a negotiating chip**: if a bid meets it you *cannot* reject it; the only counter-play is to set a low asking price to bait a lower bid you can reject, or to auto-reject all offers and accept the unhappiness ([SortitoutSI — FM24 release-clause guide](https://sortitoutsi.net/content/67858/fm24-guide-how-stop-a-player-leaving-for-the-release-clause)).
- **Bottom bar:** **Submit Offer**, **Suggest Terms** (let the agent propose), **Walk Away**. After submission the pane flips to a **counter-offer** view: the other side's changed rows highlighted, plus a short line of dialogue ("My client wants more security", "That's insulting", "We're close").
- **The loop, honestly described.** FM24 does not show a numeric "patience meter"; what it exposes is **negotiability** (per-row lock/exclude, deal-level non-negotiable) and **walk-away**. In practice the loop is: offer → counter → adjust → re-offer, and the other side's tolerance is a hidden budget of concessions — lowball repeatedly and talks **break down**, forcing a cooldown (days to weeks) before you can reopen, usually from a worse position. The "ultimatum" is the **Non-Negotiable** submission; a rejection ends the conversation and can damage the agent/player relationship **(breakdown/cooldown behaviour is well-attested by players; exact thresholds unverified)**.
- **Agent conversation (pre-offer):** "Discuss With Agent" opens a lighter chat that reveals **interest, wage demand, agent fee, and whether the player would accept a squad-player role** — a cheap information purchase before committing ([Passion4FM](https://www.passion4fm.com/scouting-in-football-manager/)).
- **Budget adjustment inside the modal:** you can move money between the transfer and wage budgets *while negotiating* to afford a wage or signing-on fee, provided the board considers the club financially healthy ([FM Scout — FM24 Induction Hints & Tips](https://www.fmscout.com/a-football-manager-2024-induction-hints-and-tips.html)). This is the single most important coupling in the game: **the transfer budget and the wage budget are one budget with two views.**

### Decisions
- **Whether to bid at all**, and at what *total package* (fee + wages + agent fee + bonuses) versus the player's value to you.
- **How to structure** the same total: cash now vs installments (preserves cash flow, weakens the offer), sell-on % (cheap now, expensive later), appearance/goal triggers (pay only if he plays), bonuses (pay only if the team wins).
- **How hard to push**: each counter risks the deal and the agent relationship; the ultimatum is a bluff with a real cost. Locking rows (non-negotiable) is how you tell the other side which term is your red line — it is a *communication* act as much as a negotiating one ([FM24 hints](https://www.fmscout.com/a-football-manager-2024-induction-hints-and-tips.html)).
- **Which currency to pay in**: wage ↔ status ↔ signing-on fee ↔ agent fee are partly substitutable. "A player's wage often is comparable with his playing time; to offer him more money is to offer him a more important place in the squad. Any deal can be sweetened with a bigger Signing On or Agent Fee; all three commitments affect current and future budget costs" ([FM24 hints](https://www.fmscout.com/a-football-manager-2024-induction-hints-and-tips.html)).
- **Contract specifics**: length vs wage trade-off, release clause (lower wage vs loss of control), optional extension (control vs player leverage), squad status (a promise that becomes a happiness constraint if broken).
- **Registration/compliance**: whether the signing fits the squad registration rules and the wage budget.
- **Loans vs buys vs free agents**: a loan is a *paid audition* (loan fee + wage contribution + playing-time promise); a free agent trades fee for wages/agent fee.

### Numbers / ranges
- **Transfer windows:** two per season in most leagues (summer and mid-season winter window), with exact dates per nation; some leagues have different rules.
- **Squad registration:** typically a **25-player squad** with a **homegrown** quota (e.g. 8 homegrown at club in England) and **under-21 exemption**; work-permit/GBE points for foreign players **(league-specific, unverified per league)**.
- **Contract length:** commonly **1–5 years** with an optional extension of 1–3 years **(unverified maxima)**.
- **Wage budget vs transfer budget:** two separate pots, reallocatable via a slider on the Budget screen; the board sets both and can refuse a reallocation.
- **Agent fee:** usually a % of the deal/wage, negotiated separately; agents also demand fees for renegotiations.
- **Sell-on:** typically **5–20%**; installments commonly spread over **1–4 years**; appearance triggers often at **10/20/50** appearances **(community-typical values; unverified)**.
- **Loans — the three shapes:** a straight loan (fee + wage contribution + playing-time promise + recall clause), a **loan with an option to buy** (a price locked now, exercisable later), and a **loan with an obligation to buy** (the fee is committed once conditions — usually appearances or promotion — are met) **(FM24 supports option/obligation structures; exact clause wording unverified)**. The loan is the game's main *try-before-you-buy* and *development* instrument at once, which is why the same screen serves the first team and the academy.
- **FM24-specific:** overspending the transfer budget now produces a **negative transfer budget**; the board demands you raise funds by selling players or clauses, and if you fail it **takes control of transfers** until the cash is raised or the window closes ([FM Scout](https://www.fmscout.com/a-fm24-new-transfer-and-finance-systems.html)).

### Why this is the emotional core
Tactics is authorship, scouting is uncertainty, but **transfers are commitment**. Every row in the modal is a way of paying later for something now, and every counter-offer is another person with an agenda. The screen is a *negotiation* rather than a *shop*, which is why FM players remember specific deals for years. The design lesson: the numbers matter less than the **ritual** — offer, counter, patience, ultimatum, handshake, regret.

---

## 5. Finances

### Screen(s)
- **Club → Finances**: Summary, Income, Expenditure, Wages, Transfers, Clauses, Graphs (season-by-season), and a **Budget** adjustment panel.
- **Club → Finances → FFP/Compliance** (a status panel, not a separate game).
- **Board → Requests → Budget** (ask for more transfer/wage budget).
- Inbox: monthly finance updates, "you are over wage budget", "FFP warning", "board has adjusted your budget".
- **Club → Facilities** (upgrade costs hit the balance).

### What you see
- **Summary:** current balance, **transfer budget** remaining, **wage budget** (weekly) vs **wage spend**, payroll headcount, projected balance at season end, and a **profit/loss** line.
- **Income/Expenditure:** stacked bar or list by category with season-to-date and last-season comparison. FM24's overhaul explicitly aimed at **clarity of income and expenditure** and at removing the "general/other" bucket ([FM Scout](https://www.fmscout.com/a-fm24-new-transfer-and-finance-systems.html)).
- **Graphs:** multi-season line/bar charts of income, expenditure, wages, net spend — the "is the club heading off a cliff" view.
- **Wages:** per-player wage, bonuses, contract expiry, and the wage-budget headroom; the screen is effectively a second squad list sorted by cost.
- **Clauses:** sell-ons receivable/payable, installments owed, buy-back options — the *off-balance-sheet* commitments that FM24 made more visible.
- **Budget panel:** two sliders/fields — **transfer budget** and **wage budget** — with the total fixed; moving one moves the other.

### Decisions
- **Split the budget** between transfers and wages (a striker on a free costs wage room, not fee room), and **rebalance it mid-negotiation** — the budget screen is reachable from the contract modal for exactly this reason ([FM24 hints](https://www.fmscout.com/a-football-manager-2024-induction-hints-and-tips.html)).
- **When to sell** — a wage dump vs a fee; selling a clause for cash now.
- **Whether to ask the board** for more budget (costs confidence/patience).
- **Facility investment** vs squad investment.
- **Contract renewals** — the wage bill compounds; the screen makes the future cost visible via projections.

### Numbers / ranges
- **Income streams:** matchday (tickets, season tickets, hospitality), TV/ broadcasting (including **fixed-length TV deals** in FM24), sponsorship (main/kits/stadium), prize money (league position, cup runs, continental), merchandise, player sales, loan fees, parachute payments ([FM Scout](https://www.fmscout.com/a-fm24-new-transfer-and-finance-systems.html)).
- **Expenditure:** player wages, staff wages, bonuses, transfer installments, agent fees, facility upkeep, youth setup, loan repayments, dividends/tax **(varies by club)**.
- **FFP:** profitability/sustainability rules with **allowed losses over a rolling period** (league-specific); FM24 added **sanctions**: squad-size restrictions, transfer-spending restrictions, fines, withheld competition income, **wage-budget lock** when close to breach, and **administration** (transfer funds withdrawn, administrators consider offers), plus a **transfer embargo** if wages go unpaid and a **Company Voluntary Agreement** path out of insolvency ([FM Scout](https://www.fmscout.com/a-fm24-new-transfer-and-finance-systems.html)).
- **Board-set budgets:** transfer budget + wage budget, reset each season (and revised in January); the board may **cut** them mid-season if the projection worsens.
- **Wage/turnover** is the number the board actually watches; a wage bill above the budget is the most common cause of a mid-season budget freeze **(community-typical; unverified)**.

### Interaction pattern
Finances is the game's **consequence ledger**. It is deliberately boring to look at — tables and lines — because its job is to make the player *feel* the accumulated cost of earlier decisions. The genius is the **projection**: a single "projected balance" number that turns today's wage offer into next season's crisis.

---

## 6. Board & club vision

### Screen(s)
- **Club → Board** (confidence), **Club → Club Vision**, **Club → Objectives/Expectations** (the season's targets).
- **Board requests** — a modal list, also reachable from a news item.
- **End-of-season review** — a board meeting news item with a grade and consequences (budget, job security).
- **Job information / manager profile** shows your reputation and the board's patience.

### What you see
- **Confidence:** an overall meter plus a **category breakdown** — typically competition performance, transfer activity, financial control, squad discipline/harmony, and progress against club vision — each with a status label ("delighted / very pleased / pleased / satisfied / okay / concerned / very concerned / angry") and a one-line reason. The categories are the board's *interpretation* of your decisions, not raw stats. **(Exact FM24 category labels and band names unverified; the structure — overall + 4–6 named categories, each with a verbal status and a reason string — is stable.)**
- **Season expectations:** at the start of the season the board states a **minimum expectation** and a **target** for each competition (e.g. "minimum: top-half finish; target: play-offs"; "reach the FA Cup fourth round"). These become the yardstick for confidence.
- **Club Vision:** a **multi-year plan** (typically 5 years) rendered as a timeline of commitments across pillars:
  - **Playing style** (e.g. "play attacking football", "play possession football"),
  - **Signing policy** (the eight recruitment visions: sign under-X-age for the future, under-X-age for the first team, players based in a nation, players of a nationality, high-reputation players, players from lower divisions, players from domestic rivals, don't sign over-X-age — [Passion4FM](https://www.passion4fm.com/scouting-in-football-manager/)),
  - **Youth development** (give youth a chance, develop academy players),
  - **Financial** (stay within wage budget, become self-sustaining),
  - **Brand/reputation** (sign marquee players, grow commercial revenue),
  - **Competition** (qualify for continental football, win a trophy).
  Each commitment has a **status** (on track / at risk / failed) and a deadline year. Failing one damages confidence even if you win.
- **Board requests:** a list with cost, effect and the board's mood. The FM24 request taxonomy (per SortitoutSI's guide) is six families ([SortitoutSI — How to Make a Board Request](https://sortitoutsi.net/content/70692/how-to-make-a-board-request)):
  - **Facilities:** improve training facilities, improve youth facilities.
  - **Financial:** increase transfer budget, increase wage budget, increase junior coaching budget.
  - **Networking:** request affiliate club, request B/U23 team, improve youth recruitment, **trial day** (a friendly for free agents).
  - **Personal:** negotiate your own contract, coaching course (improve your badges).
  - **Stadium:** expand stadium, build new stadium, buy the stadium if you rent.
  - **Staff:** request a staff slot, increase staff allowed, increase staff wages.
- **Required vs preferred.** Season objectives are presented as **"required"** (must-hit) and **"preferred"** (nice-to-have) goals, and the club vision can include *style* goals (e.g. "score more from set pieces") rather than only league position ([FM Shot — board expectations](https://www.fmshot.com/board-expectations/)). The required/preferred split is what lets the board say "we finished 7th but you hit the cup target, so you're safe".

### Decisions
- **Which requests to spend political capital on**, and when (after a win streak is cheapest).
- **Whether to accept a vision you dislike** at job offer time (it becomes a KPI).
- **How to allocate transfer spending** to satisfy the signing policy (a "sign under-23" vision makes a 30-year-old star a *negative* even if he wins games).
- **When to push for promotion/continental qualification** and when to sandbag expectations.
- **Whether to take the board's ultimatum** ("finish top half or you're sacked") or resign.

### Numbers / ranges
- **Vision horizon:** 5 years typical, with annual milestones.
- **Signing policies:** 8 recruitment vision types ([Passion4FM](https://www.passion4fm.com/scouting-in-football-manager/)).
- **Confidence:** 0–100 per category with 7–8 verbal bands **(unverified exact scale)**; overall confidence is a weighted blend (competitions and vision weigh most).
- **Board patience:** a hidden clock; typically 2–3 bad months or a failed objective triggers a warning, then a sacking **(unverified)**.
- **Requests:** gated by cost vs balance, board confidence and a **cooldown that is deliberately opaque** — SortitoutSI's FM24 guide says the wait after a rejection "can take weeks, months or even an entire season" ([SortitoutSI](https://sortitoutsi.net/content/70692/how-to-make-a-board-request)). Approval odds rise with financial stability, overachievement, and public pressure from media answers; a rejection sometimes comes with a **compromise offer** (a smaller increase) rather than a flat no ([SortitoutSI](https://sortitoutsi.net/content/70692/how-to-make-a-board-request)).

### Why it matters
The board is the **external scoreboard** that stops the game being a pure optimisation sandbox. Club Vision is the cleverest part: it converts *style* into a **measurable KPI**, so the player can win the league and still be "at risk" because he signed 30-year-olds. That is the mechanic that makes a guild manager feel like a *job* rather than a toy.

---

## 7. Dynamics / squad happiness

### Screen(s)
- **Squad → Dynamics**, with tabs: **Overview, Hierarchy, Social Groups, Happiness, Code of Conduct, Team Meeting, Team Talk Feedback** — GiveMeSport's FM24 guide walks these tabs in this order ([GiveMeSport](https://www.givemesport.com/football-manager-2024-dynamics-guide/)).
- Player profile → **Happiness/Concerns** panel; **Interaction** menu (praise/criticise/warn/discuss).
- **Team talk** (pre-match/half-time/full-time) and **touchline shouts**.
- Inbox: "player unhappy", "player wants to leave", "training ground bust-up".

### What you see
- **Overview:** four headline gauges — **Club Atmosphere, Team Cohesion, Managerial Support, Dressing Room Atmosphere** — plus "Top Influencers" and a list of **Issues** (contract, playing time, wants a new challenge, unhappy with training, etc.). Cohesion is explicitly tied to tactical familiarity and to playing the same formation ([GiveMeSport](https://www.givemesport.com/football-manager-2024-dynamics-guide/)).
- **Hierarchy:** a **pyramid with four tiers — Team Leaders, Highly Influential Players, Influential Players, Other Players** ([GiveMeSport](https://www.givemesport.com/football-manager-2024-dynamics-guide/)). The captain should come from the top tier; upsetting a Team Leader propagates.
- **Social Groups:** a **network graph** of the squad, with nodes sized by influence and coloured by group; typically a **Core group** plus 1–3 secondary groups (nationality/language/age/tenure clusters). Lines show positive/negative relationships. The graph is the single most "living world" artefact in FM.
- **Happiness:** a table grouped by hierarchy tier, with each player's **morale**, **happiness state**, **concerns**, and **relationship with the manager**; sortable by "most unhappy".
- **Code of Conduct:** a matrix of offences (missing training, red card, late for match, unprofessional behaviour) × punishment severity (warning / fine 1 week / fine 2 weeks / transfer list). Set at the start of the season; applied automatically.
- **Team Meeting:** pick a tone/reason ("we need to turn this around", "keep our feet on the ground") and get a room-wide reaction; overuse backfires.
- **Team Talk Feedback:** a per-player list of reactions after every talk ("looked motivated", "seemed demoralised", "switched off"), which is the feedback loop for learning each player's personality.

### Decisions
- **Who to praise/criticise/warn**, individually, and when (the "talk to player" menu is the main interpersonal verb).
- **Team meeting vs individual chat vs team talk** — escalating scope and risk.
- **Code of Conduct severity** — discipline vs popularity.
- **Captain/vice-captain** and **mentoring** assignments.
- **Sell the troublemaker vs manage him** — a Team Leader with a bad relationship can poison a squad.
- **Playing-time promises** — the most common source of unhappiness; breaking them is a slow leak.

### Numbers / ranges
- **Morale:** 7 bands from **Abysmal** to **Superb** ([FM Scout](https://www.fmscout.com/a-morale-and-relationships-in-football-manager.html)).
- **Hierarchy:** 4 tiers.
- **Social groups:** 1 core + up to ~3 secondary groups **(unverified typical count)**.
- **Gauges:** each of the four headline gauges has ~5 verbal bands (Abysmal → Excellent) **(unverified)**.
- **Code of Conduct:** ~6–10 offence types × 3–4 punishment levels **(unverified exact)**.
- **Team talks:** 5–6 tones (calm, assertive, passionate, cautious, disappointed, delighted) × context; each player reacts according to personality, professionalism, pressure and your relationship.
- **Effect sizes:** morale modifiers are small per event (±1 band) but **persist and stack**; sustained unhappy players lose training rating and match performance.

### Interaction pattern
Dynamics is FM's **social physics engine**: hidden state (relationships) rendered as a graph, with a small set of verbs (praise, criticise, meet, warn) whose effects are delayed and asymmetric. The design trick is that the player is never told the exact number — only the face, the colour and the sentence. That ambiguity is what makes the dressing room feel like people rather than meters.

---

## 8. Staff & facilities

### Screen(s)
- **Staff → Overview** (all staff, role, attributes, wage), **Staff → Responsibilities** (the delegation matrix), **Staff → Recruitment Team** (scouting/analysis staff and allowed headcount), **Staff Search** / **Place Advert**.
- **Club → Facilities** (training, youth, recruitment, junior coaching, stadium, and their levels).
- **Board → Requests** for extra staff slots / facility upgrades.
- **Staff profile → Attributes** (coaching star ratings per category, mental attributes, personality).

### What you see
- **Staff list:** name, role, age, wage, contract, and a compact attribute block. For coaches, star ratings per category (Attacking, Defending, Fitness, Goalkeeping, Technical, Tactical, Mental, Set Pieces) shown as 1–5 stars; for scouts, **JPA/JPP/Adaptability**; for physios, **Physiotherapy** and **Sports Science**; for analysts, **Analysing Data** and **Tactical Knowledge** ([Passion4FM](https://www.passion4fm.com/scouting-in-football-manager/)).
- **Responsibilities matrix:** the menu is split into **eight departments** (first team, reserves, youth, training, scouting, transfers/contracts, media, medical), each expanding into sub-rows, and each row assignable to you or to a named staff member. Passion4FM's guide stresses that the menu's depth is the point: the deeper you go, the more it is about *feedback and notifications*, not just tasks ([Passion4FM — Staff Responsibilities](https://www.passion4fm.com/football-manager-staff-responsibilities-backroom-advices-explained/)).
  - Three ways to change a responsibility: click the row in the overview, use the dropdown on the specific department screen (Scouting/Training/Transfers header), or let the game pick "the recommended staff member" for that assignment ([Passion4FM](https://www.passion4fm.com/football-manager-staff-responsibilities-backroom-advices-explained/)).
  - The affordance is a **two-tab screen**: your responsibilities on one tab, everyone else's on the other; clicking moves ownership across. It is the cleanest "who does what" UI in the game.
- **Facilities:** a list with level bars and descriptive labels — **Training Facilities, Youth Facilities, Youth Recruitment, Junior Coaching, Stadium** (and in some versions Recovery/Medical). Each row has a "request upgrade" action.
- **Recruitment Team:** current size vs allowed maximum per role (scouts, analysts, coaches, physios, directors), plus a comparison to league average. FM24's hints state the causal chain plainly: the **Technical Director** affects coaching standard, the **Head of Youth Development** handles youth coaching/recruitment, **physios** handle physiotherapy, and **scouts** affect the number of assignments and report quality ([FM24 hints](https://www.fmscout.com/a-football-manager-2024-induction-hints-and-tips.html)). The board tells you when the backroom is too big, too small or about right.

### Decisions
- **Hire/fire** and **role fit** (a 5-star attacking coach is useless as a fitness coach).
- **Coaching assignments** — which coach owns which category, and therefore how many stars that category delivers.
- **Delegation** — the single biggest difficulty dial in the game: delegate transfers/contracts/training/press and the game plays itself; take everything and it becomes a second job.
- **Facility investment order** — training first (development), youth second (pipeline), recruitment third (information), stadium last (matchday income).
- **Staff wage bill** vs squad wage bill.

### Numbers / ranges
- **Attributes:** 1–20, with 1–5 star coaching ratings derived from the relevant attribute + personality/determination + workload.
- **Facility levels:** 1–20 in the database, surfaced as descriptive bands (e.g. "Basic / Adequate / Good / Great / Superb / State of the art") **(unverified band names)**.
- **Allowed headcount:** board-set per role; increases via board request or promotion.
- **Facility effects:** training facilities → rate of attribute development; youth facilities + youth recruitment + junior coaching → quality/quantity of youth intake; recruitment/analysis → scouting accuracy and speed; medical/sports science → injury prevention and recovery speed.
- **Staff attributes that matter most:** *Determination, Level of Discipline, Motivating, People Management, Working With Youngsters* (mental); the category coaching attributes; JPA/JPP for scouts; *Negotiating* for DoF/contracts ([Passion4FM](https://www.passion4fm.com/scouting-in-football-manager/)).

### Interaction pattern
The responsibilities matrix is FM's **automation contract**. It lets the player choose *which* parts of the job to play, and it is the reason two players can describe the same game completely differently. For a small team, this is the most reusable idea in the entire document: *ship the whole system, but let the player delegate any subsystem to an AI with visible quality.*

---

## 9. Media & pressure

### Screen(s)
- **Inbox → press conference invitation** → **Press Conference** screen (pre-match, post-match, midweek, transfer-related, crisis).
- **Player → Media** (media handling style, press interest), **Interaction → media comment**.
- **Pre-match "mind games"** option in the opposition/next-match panel.
- **Touchline shouts** during a match; **post-match team talk**.

### What you see
- A journalist portrait, outlet name, and a **question** in natural language, with a small set of **answer options** (typically 3–5). Each option is a sentence plus a **tone/gesture** choice: FM24 pairs the answer with a **body-language gesture** — *Smile Warmly*, *Point Finger*, *Shrug*, *No Gesture* — and the gesture carries as much signal as the words ([SortitoutSI — FM24 Guide: Press Conferences](https://sortitoutsi.net/content/68503/fm24-guide-press-conferences)).
- A **"no comment" / "walk out"** option; walking out has a cost (media/board/fan reaction) but avoids a trap question.
- After answering: a short **reaction line** and, later, a news item summarising how the media/fans/board/players responded. Player-level effects appear as morale/happiness changes and relationship changes.
- **Mind games:** before a big match you can comment on the opposition manager or a key player; the AI may respond, and the exchange can affect the opponent's morale or your players' motivation.

### Decisions
- **Attend or delegate.** The assistant can take the conference, and his **Media Handling style, People Management and Motivating** attributes shape his answers — but he may say things you did not intend ("we'll rest key players", "selling the youngster is reasonable"), with real squad/fan consequences ([SortitoutSI](https://sortitoutsi.net/content/68503/fm24-guide-press-conferences)). Delegation is therefore *cheap but lossy*, not free.
- **Tone** (positive / neutral / negative, plus gesture) and **content** (praise opponent, apply pressure to the board, defend a player, criticise a player, declare ambition).
- **Which player to praise/criticise publicly** — public praise can boost morale but also expectations; public criticism can motivate or destroy, depending on personality.
- **Mind-game or not** — a gamble with a real downside if the opponent is stronger mentally.

### Numbers / ranges
- **Answer options:** ~3–5 per question; **gesture:** 0–1 per answer from a small set (Smile Warmly, Point Finger, Shrug, …) ([SortitoutSI](https://sortitoutsi.net/content/68503/fm24-guide-press-conferences)).
- **Frequency:** roughly 1–3 press conferences per week in a normal schedule, plus mandatory pre/post-match **(unverified)**.
- **Effects:** small morale/relationship deltas per answer, but **cumulative**. SortitoutSI's author reports **Media Handling up ~14% over five matches** of consistently positive answers, plus "higher team morale" and improved relationships with players, media and board — an anecdotal but useful order of magnitude (single save, not a controlled test) ([SortitoutSI](https://sortitoutsi.net/content/68503/fm24-guide-press-conferences)).
- **Media pressure scales with club reputation/league position** — a top club gets more hostile questions after a bad run **(unverified)**.

### Why it matters (and why it's cuttable)
Media is FM's **pressure valve**: it converts hidden morale state into a public performance the player must navigate. It is also the most repetitive system in the game — the same 20 questions in new clothes. It is essential to *feel* and cheap to *simulate thinly*.

---

## 10. Youth & development pipeline

### Screen(s)
- **Development Centre** (Squad → Development Centre / a top-level entry in some versions): tabs for **Squad, Pathway, Development, Contracts, Reports**.
- **Youth intake news** (annual), **Youth Candidates** squad, **U18/U21 squad** screens.
- **Player → Development → Training/Attributes** (progress graphs), **Loan** screens, **Loan Manager** reports.
- **Club → Facilities → Youth** (the inputs to the pipeline).

### What you see
- **Development Centre:** a depth chart by position showing every young player with **current ability stars, potential ability stars (as a range), age, contract expiry, and a "pathway" recommendation** (keep / loan / sell / promote). The **Pathway** tab is the key one: it recommends a *level* of football for each player ("ready for a loan in League One", "too good for U21s").
- **Youth intake:** once a year, a news item announces the intake with a list of teenagers, each with position, star potential, personality, and a short "report" line. The player can sign/release them. Quality is driven by **youth facilities, youth recruitment, junior coaching, HOYD attributes/personality**, and the nation's **youth rating** ([Passion4FM — Youth Development Guide](https://www.passion4fm.com/football-manager-youth-development-guide/)); the intake date is nation-specific ([Passion4FM — Youth Intake Dates](https://www.passion4fm.com/football-manager-youth-intake-dates/)) and the HOYD is the single staff member who most shapes the intake's personality and positions ([Passion4FM — Youth Intake](https://www.passion4fm.com/youth-intake-guide-how-clubs-produce-newgens/)).
- **Loan out:** a loan offer screen with **destination club, league level, promised playing time, wage contribution, loan fee, and a "recall" clause**; the player's development is tracked via the Loan Manager's reports (minutes, rating, attribute changes).
- **Development graphs:** attribute-by-attribute progression lines with the age curve visible; physical attributes rise fastest, mental slowest, technical in between ([FM Scout](https://www.fmscout.com/a-fm24-training-guide-and-schedules-by-jonasmorais.html)).

### Decisions
- **Promote vs hold vs loan vs release** for each intake player and each U21.
- **Loan destination** — playing time and level matter more than the club's prestige; a bad loan wastes a season.
- **Individual training and mentoring** for prospects (double intensity on a 17-year-old is a classic mistake).
- **Contract timing** — youth contracts expire; the "contract expiry" column is the retention decision surface.
- **Facility investment** — whether to spend the transfer budget on the academy instead of the first team.

### Numbers / ranges
- **Intake:** once per season per club, on a nation-specific date (England: March; others vary) ([Passion4FM](https://www.passion4fm.com/football-manager-youth-intake-dates/) — fetched); **~10–20 candidates** **(unverified exact range)**.
- **Youth rating:** association-level **0–200**, dynamic in saves ([FM Scout](https://www.fmscout.com/a-best-scouting-regions-in-football-manager.html)).
- **Potential:** shown as a **star range** (e.g. 3–4.5) until fully scouted/developed; the range narrows with knowledge and age.
- **Development window:** meaningful growth to ~**23–24**, with the steepest curve at **15–19**; match experience matters more after **18** ([FM Scout](https://www.fmscout.com/a-fm24-training-guide-and-schedules-by-jonasmorais.html) — "players 15–18 develop more with training; 18+ develop more with match experience").
- **Facility bands:** Youth Facilities / Youth Recruitment / Junior Coaching each 1–20, shown as descriptive levels.

### Interaction pattern
The Development Centre is FM's **portfolio view**: it treats young players as assets with a *time-to-value* and a *risk of stagnation*, and the Pathway recommendation is the game's opinion on the optimal route. It is the closest thing FM has to a "talent pipeline" screen, and the one most worth copying wholesale for a guild roster.

---

## Cross-cutting interaction patterns (the reusable grammar)

1. **Three-pane inspector**: list on the left, object in the middle (pitch/player/card), inspector on the right (instructions/terms/attributes). Nearly every screen is this shape. It supports fast comparison without navigation.
2. **Qualitative sliders over numbers**: five notches, no percentages. The player thinks in "higher/lower", the sim resolves the number. This is how FM keeps a spreadsheet readable.
3. **Star ratings as universal uncertainty currency**: CA/PA, role suitability, coach quality, facility quality, scout confidence — one visual language for "how good/uncertain".
4. **Bars as hidden state made legible**: familiarity, cohesion, confidence, patience, condition, sharpness. The bar is the game's main *explanatory* device.
5. **Delegation matrix as difficulty dial**: every subsystem can be handed to a named staff member with visible quality; the player chooses the scope of the game.
6. **Inbox as event bus**: every system emits an actionable card (accept/decline/negotiate/open). This is how a 40-screen game stays navigable.
7. **Ritual dialogs with a finite number of moves**: negotiation, board requests and press conferences are all "offer → response → consequence" loops with a limited number of moves.
8. **Calendar pressure**: everything is scheduled against a match day; the week is the unit of planning.

---

## Which three systems create the management *feel*, and why

**1. Transfers & contracts.** It is the only system where the player negotiates with another *agent* rather than with the simulation. The modal is a ritual of commitment: every clause is a future cost, every counter is a relationship, and the finite concession budget makes the conversation finite. This is where FM generates *stories* ("I lost him over a sell-on clause") and where the player's identity as a manager is expressed through money rather than tactics. Without it, the game is a team-builder; with it, it is a job.

**2. Tactics + tactical familiarity.** Tactics alone would be a loadout screen. Familiarity is what turns it into management: the player *authors* an identity and then pays for it in weeks of training, with a visible eight-part bar telling him exactly what he broke. The combination produces the core FM loop — *design → drill → observe → adjust* — and it is the only system where the player's taste is a mechanical variable (the game literally classifies your style and offers to train for it).

**3. Dynamics / squad happiness.** This is the system that makes the squad feel like *people with memories*. The hierarchy pyramid, the social-group graph and the delayed, ambiguous effects of praise/criticism create the sense that decisions have social half-lives. It is also the system that most reliably produces emergent narrative ("the Team Leader I sold was the only one holding the dressing room together"), and it is the counterweight to treating players as stat blocks.

Why these three and not training or scouting? Training and scouting are *support systems*: they feed the three above with development and information. The board is the *frame* (it judges), and media is the *noise* (it pressures). The feel comes from the triangle: **identity (tactics) → commitment (transfers) → consequence (dynamics)**.

---

## Systems a small team should cut or merge

A small team cannot ship FM's surface area. The rule should be: *keep the systems that create commitment, cut the systems that only create admin.*

| System | Verdict | What to do instead | Why |
|---|---|---|---|
| **Press conferences** | **Cut to a stub** | One weekly "media tone" choice (3 options) with a small morale/board effect; no question bank. | High authoring cost, low decision diversity, feels repetitive even in FM. |
| **Set-piece routine editor** | **Cut** | 3–4 preset packages (near-post, far-post, short, zonal) with a single "drill" toggle. | The 11-slot editor is a game-within-a-game; most players use one meta routine. |
| **Opposition instructions** | **Merge** | Auto-generated "match plan" from the scout report: 2–3 suggested tweaks the player can accept. | The information is already in the report; the UI is a tax. |
| **Training calendar (21 slots)** | **Merge** | 3 weekly choices: *intensity* (light/normal/hard), *focus* (attack/defence/fitness/tactics), *rest day*. Individual focus per player kept as a single dropdown. | The grid is a spreadsheet; the interesting decisions are intensity vs freshness and focus vs next opponent. |
| **Scouting regions/budget** | **Merge** | One "scout network" stat (coverage level) + one "send scout" action per target/region; budget as a single number. | The knowledge ladder is the good part; the subscription accounting is not. |
| **Staff responsibilities matrix** | **Keep, shrink** | 5 delegation toggles (transfers, contracts, training, press, team talks) with a named assistant. | This is the best difficulty dial in the game and cheap to build. |
| **FFP / registration** | **Merge** | One "compliance" meter with 3 states (ok / warning / breach) and one consequence (transfer embargo). | Full FFP is league-specific and unreadable; the *threat* is the mechanic. |
| **Code of conduct** | **Merge into events** | Discipline as occasional event cards with 2–3 responses. | The matrix is set-and-forget; the drama is in the incident. |
| **Team meetings / team talks** | **Keep one** | A single pre-match "team talk" with tone + one team meeting per season. | Two systems doing the same job; the talk is the iconic one. |
| **U18/U21 squads** | **Merge** | One "development pool" with a Pathway recommendation and loan actions. | Separate squads are admin; the pipeline decision is the content. |
| **Contract bonus zoo** | **Cut** | Wage, length, signing-on fee, agent fee, release clause, one performance bonus. | 12 clause rows is realism, not decisions; 6 rows captures the trade-offs. |
| **Club vision** | **Keep, 3 goals max** | Playing style + one signing policy + one competition target, each with a status. | It is the best "job, not toy" mechanic in FM and cheap to implement. |

**Keep in full:** the negotiation modal (ritual + negotiability), tactical familiarity (visible cost of change), the dynamics graph + hierarchy (social memory), and the delegation matrix. Those four are the load-bearing walls; everything else can be a card, a preset or an automation.

---

### Source base (all fetched for this document)
- [Passion4FM — How to Maximize Tactical Familiarity](https://www.passion4fm.com/how-to-maximize-tactical-familiarity/)
- [Passion4FM — Scouting in Football Manager 2024: The Definitive Guide](https://www.passion4fm.com/scouting-in-football-manager/)
- [Passion4FM — Staff Attributes](https://www.passion4fm.com/football-manager-staff-attributes/)
- [Passion4FM — Training Facilities Levels](https://www.passion4fm.com/football-manager-training-facilities-levels/)
- [Passion4FM — Youth Development Guide](https://www.passion4fm.com/football-manager-youth-development-guide/)
- [FM Scout — Getting the Best Out of Your Tactics](https://www.fmscout.com/a-getting-the-best-out-of-your-tactics.html)
- [FM Scout — FM24 Training Guide and Schedules](https://www.fmscout.com/a-fm24-training-guide-and-schedules-by-jonasmorais.html)
- [FM Scout — Best Scouting Regions](https://www.fmscout.com/a-best-scouting-regions-in-football-manager.html)
- [FM Scout — Morale and Relationships](https://www.fmscout.com/a-morale-and-relationships-in-football-manager.html)
- [FM Scout — FM24 New Transfer and Finance Systems](https://www.fmscout.com/a-fm24-new-transfer-and-finance-systems.html)
- [FM Scout — FM20 Club Vision feature](https://www.fmscout.com/a-fm20-features-club-vision.html)
- [FM Scout — Back to Basics: Tactical Approach](https://www.fmscout.com/a-back-to-basics-04-tactical-approach.html)
- [GiveMeSport — FM24 Dynamics Guide](https://www.givemesport.com/football-manager-2024-dynamics-guide/)
- [GiveMeSport — FM24 Training Guide](https://www.givemesport.com/football-manager-2024-training-guide/)
- [GiveMeSport — How to Use Scouts in FM24](https://www.givemesport.com/football-manager-2024-gaming-how-to-use-scouts/)
- [GiveMeSport — FM24 Beginner's Guide (tactics & transfers)](https://www.givemesport.com/football-manager-2024-beginners-guide-tactics-formations-transfers/)
- [SortitoutSI — FM24 tactic export showing instruction field names](https://sortitoutsi.net/content/68101/gyr-meta-3421-fm24-tactic-quadruple-winning-x-2)
- [SortitoutSI — FM24 possession tactic export (more instruction names)](https://sortitoutsi.net/content/74294/fm24-broken-possession-4-3-3-paulo-fonsecas-masterclass-lyon-91-gs-won-ligue-1-and-conference-league)
- [FM Scout — FM24 Induction Hints & Tips (in-game hints: contract negotiability, promises, fluidity, intensity, staff effects)](https://www.fmscout.com/a-football-manager-2024-induction-hints-and-tips.html)
- [SortitoutSI — FM24 Guide: How to Make a Board Request](https://sortitoutsi.net/content/70692/how-to-make-a-board-request)
- [SortitoutSI — FM24 Guide: Press Conferences (gestures, delegate risk)](https://sortitoutsi.net/content/68503/fm24-guide-press-conferences)
- [SortitoutSI — FM24 Guide: Release Clause](https://sortitoutsi.net/content/67858/fm24-guide-how-stop-a-player-leaving-for-the-release-clause)
- [FM Shot — Why Board Expectations Matter](https://www.fmshot.com/board-expectations/)
- [Contract negotiation field list (squad status, bonuses, clauses)](https://gamepro.pages.dev/posts/contract-negotiations/)
- [Passion4FM — Staff Responsibilities & Backroom Advice](https://www.passion4fm.com/football-manager-staff-responsibilities-backroom-advices-explained/)
- [Passion4FM — Youth Intake Dates](https://www.passion4fm.com/football-manager-youth-intake-dates/)
- [Passion4FM — How Clubs Produce Newgens](https://www.passion4fm.com/youth-intake-guide-how-clubs-produce-newgens/)
- [FM Scout — Ultimate Youth Development Guide 2024](https://www.fmscout.com/a-ultimate-youth-development-guide-2024.html)
