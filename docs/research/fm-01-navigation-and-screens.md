# Football Manager (SI) — Navigation & Screen Architecture

Research notes for the *Guild Manager* project. Primary target: **FM24 on desktop (PC/Mac)**, with notes on FM26 where the UI was redesigned.

> ### Sourcing & confidence
> The spine of this document is the **official Football Manager 2024 manual**, written by Sports Interactive and published chapter-by-chapter at `community.sigames.com/sigames-manual/football-manager-2024/`. It describes the shipped PC UI screen by screen, and I quote it directly where the wording matters. Secondary sources: SI's FM26 feature article, SI's FM25 cancellation notice, fminside.net guides, sortitoutsi guides.
>
> **Confidence labels.** ✔ = verified in an SI/primary source. **(unverified)** = observed/community-standard but not confirmed in a primary source. Do not build a spec on an unverified line without checking it in-game.

> ### Two corrections to the brief
> 1. **The Squad sub-tabs in the brief are wrong for FM24.** They are not `Players / Tactics / Development / Report / Analyst Report`. Verified FM24 set: **Overview / Squad Planner / Report / Data Hub / Dynamics / Development**. The set in the brief resembles a different edition or a console/Touch variant.
> 2. **FM25 never shipped.** SI cancelled it outright. The redesigned UI landed in **FM26**. "FM25's redesign" is therefore not citable — the correct comparison is FM24 → FM26. Verbatim from SI: *"we have made the difficult decision to cancel Football Manager 25 and shift our focus to the next release… all versions are cancelled and FM25 will not be released on any platforms."*

---

## 1. The shell / information architecture

### 1.1 The chrome layers

FM24's shell is a fixed frame around a single "panel" that swaps per screen. SI's own glossary defines the terms, and they are worth adopting almost verbatim because they are a clean vocabulary for a management game:

| Layer | Position | Job |
|---|---|---|
| **Title Bar** | top of window | Screen title, subtitle, manager name; becomes a text input when you hit Search |
| **Menu Bar** | top, below title | Contextual menu + free-text search; the **current date is clickable** and opens the **Calendar** — "the current week, indicating the current date and informing you of any pressing concerns or engagements you have in the immediate future" ✔ |
| **Side Bar** | left | Primary navigation **for your own club only** — always your club, even when you're viewing another club's screen ✔ |
| **Tab Bar** | horizontal, under the menu bar | Navigation **within** the current screen / game object; also where object **Actions** live ✔ |
| **Panel** | centre | "The part of the game's window that changes for each screen… you often find multiple sub-panels within a panel" ✔ |

Two independent navigation systems, and SI is explicit that they are different tools:

- **Side Bar** = *your organisation's* sections (Inbox, Squad, Tactics…). Persistent, club-scoped.
- **Navigation Bar** (Back / Forward / World) = *the rest of the game world*. "While the Side Bar is the primary navigation tool for your own club, the Navigation Bar is used to navigate the rest of the game (i.e. browsing the game world in general)." ✔

**That split is the single most important structural idea to steal:** one rail for "my organisation", one history/browser mechanism for "everything else". A guild manager has exactly the same problem (your guild vs. the wider world of guilds, patrons, markets, rivals).

Other documented shell behaviours:

- **Back / Forward** navigate screen history. **Right-clicking** either opens **Navigation History**, whose entries are formatted `"<name of screen>: <name of section><name of panel>"` — the history list is self-describing ✔
- **World** button opens a popup with tabs **Browser / Nations / Bookmarks**. Browser is a hierarchical breadcrumb up to the root entity (World). Bookmarks are user shortcuts to screens, "much as you would for websites in a web browser" ✔
- **Search** in the title bar: with no input it opens a menu of *related links* for the current object (on a team: its league, plus every team in that division); with input it becomes autocomplete ✔
- **Quick Flicks**: title-bar arrows that step through sibling objects alphabetically (next player in the squad; next team in the league), with a tooltip previewing the destination ✔
- **Notifications**: the Side Bar surfaces a badge "whenever there is an item of business for you to deal with: an unread news item or a transfer offer, for example" ✔
- The Side Bar is **user-reorderable by drag and drop**, and some (not all) items can be removed ✔
- At large resolutions the Side Bar shows icon + text; an Interface preference forces icon-only ✔
- If you manage both a club and an international team, the Side Bar gets a **toggle** to switch which team the rail represents ✔

### 1.2 The module list

FM24's Side Bar carries ~14–15 club modules plus the Continue control. The **set** is well established; the **exact default order is not published by SI and is marked unverified** (SI only documents that the rail is reorderable).

| # | Module | What it is | Sub-tabs (FM24) |
|---|---|---|---|
| 1 | **Inbox** | News hub + social feed | Inbox · News · Social Feed ✔ |
| 2 | **Squad** | First-team squad | **Overview · Squad Planner · Report · Data Hub · Dynamics · Development** ✔ |
| 3 | **Tactics** | Formation/role/instruction builder | Templates · Mentalities · Team Fluidity · Formations · Roles & Duties · Team Instructions · Player Instructions · Opposition Instructions · Set Pieces · Match Plans · Captains ✔ (section headings; most are tabs) |
| 4 | **Training** | Weekly schedule, units, mentoring | Overview · Sessions · Schedules · Units · Mentoring · Individual · Coaches ✔ |
| 5 | **Scouting** *(in FM24 largely folded into Transfers → Scouting Centre)* | Assignments, knowledge, reports | Scouting Centre · Player Search · Recruitment Focus · Assignments · Priorities · Scouting Coverage · World Knowledge · Agents ✔ |
| 6 | **Transfers** | Market, offers, shortlist | Scouting Centre · Player Search · Shortlist · Transfer History · Clauses · Unwanted List **(partial — unverified)** |
| 7 | **Club** | Club identity, facilities, affiliates | **Profile · General · News · Facilities · Affiliates** ✔ |
| 8 | **Club Vision** | Board/fan objectives, confidence | Overview · Confidence (Board & Fans) · Make Board Request ✔ *(see note)* |
| 9 | **Schedule / Competitions & Fixtures** | Fixtures, results, competitions | Fixtures · Results · Competitions **(unverified)** |
| 10 | **Dynamics** | Squad relationships & happiness | Overview · Hierarchy · Social Groups · Happiness · Code of Conduct ✔ |
| 11 | **Development Centre** | Youth and loan pipeline | Overview · Loans · Youth Squads · Youth Candidates ✔ |
| 12 | **Staff** | Backroom + responsibilities | Responsibilities · staff list · Staff Search · Job Security **(partial — unverified)** |
| 13 | **Finances** | Budgets, wages, FFP | Basic Finances · Expenditure · Income · FFP **(unverified)** |
| 14 | **Medical Centre** | Injuries, risk, rehab | Overview · Risk Assessment · Current Injuries · Injury History · Season Summary ✔ |
| 15 | **Facilities** | Stadium/training ground upgrades | single screen; also surfaced as Club > Facilities **(unverified)** |

Notes that matter:

- **Club Vision placement is ambiguous across sources.** SI's manual says "The new Club Vision screen can be found in the menu on the left-hand side" ✔; a sortitoutsi guide says "Navigate to the Club Vision tab from the sidebar… Locate the Overview menu… Click on Make Board Request" ✔. Both point at a left-menu entry, but it may equally be a prominent Club sub-tab. Treat it as **left-rail-adjacent** and note the ambiguity.
- **Dynamics and Development Centre are reachable two ways**: as Side Bar modules *and* as tabs on the Squad screen. SI's manual chapter "Your Squad, Team Report and Dynamics" covers Overview, Squad Planner, Report, Data Hub, Dynamics, Development in one chapter. This is deliberate: the squad is the *object*, and these are *lenses on the squad*.
- **Medical Centre** is a module, but per-player medical detail is also a **Medical Report** inside the player profile's Reports menu ✔.
- **FM24 has no "Home" module in the list above** — but it *does* have a Home screen, reached via a **Home icon on the sidebar or `F2`**, which is the tile dashboard (§1.4). It's easy to miss, and SI later concluded most players never used it.

### 1.3 Three screen genres

FM24 mixes three genres, and conflating them is what makes management UIs feel mushy:

1. **List / grid screens** — a sortable, filterable table of homogeneous objects. Squad list, Player Search, Shortlist, Staff, Transfers, Fixtures, Scouting assignments. Everything is a row; the row opens a detail screen; there's a Views menu and a Filter button.
2. **Tile / dashboard screens** — a mosaic of cards summarising heterogeneous facts, each card a link with its own "more" affordance. **Home**, **Squad > Overview**, **Club > Profile**, **Development > Overview**.
3. **Object detail screens** — one entity, a fixed tab bar, dense panels. Player profile, Club profile, Competition screen, Staff profile.

The squad module's default landing is the **Overview tile screen**, with the full table one tab away. That ordering (summary first, table second) is a real decision: it front-loads "what needs my attention" and hides "the database" behind a tab.

Even so, Squad > Overview is not purely tiles — SI describes it as a compact table: "The first team squad is shown with key information about each player's position, condition, morale and performances. There is the option to filter which players are shown to include all players in the squad, exclude players depending on the positions they play and also hide players who may be unavailable or not currently at the club." ✔ So the tile language lives at *panel* level, not module level.

### 1.4 The Home screen and its widget area

The FM Home screen is the purest tile surface in the game. Documented structure (from the FMInside guide that describes the stable Home layout; panel *names* are stable across editions, the exact FM24 widget list **(unverified)**):

**Fixed top panels**
- **Next Match** — opponent, venue, expected weather, previous meetings
- **Team News** — injuries/suspensions/ineligibility for both sides
- **Team Fixtures** — next five fixtures, with a link into the schedule

**Customisable "widget area"** — the lower half is user-composed from a widget picker. Documented widget options include:

`Available Jobs · Contract Expiry Dates · Finance & Salary · Inbox · Insecure Jobs · League Table · Manager Performance · Match Preparation · Medical Centre · News · Pending Transfers · Player Stats · Promises · Scouting Centre · Squad Status · Team Competitions · Team Injuries · Team Stats · Training · Training Happiness · Training Performance · Training Session Breakdown`

That widget catalogue is effectively a **menu of "what a manager wants to glance at"** — and a good checklist for a guild manager's dashboard. Note especially **Promises** (an obligations ledger) and **Pending Transfers** (in-flight negotiations) as first-class dashboard widgets, not buried screens.

### 1.5 What SI changed in FM26 (and why it validates the above)

FM26 replaced the entire shell with a Unity-based "**tiles and cards**" system. SI's own account of *why* is the most useful part:

> "Thanks to game data and design information, we realised that in previous editions **the home screen wasn't used much, as players spent most of their time in the inbox**. To radically improve that experience and give you a true home screen, we merged the two to create the **Portal**: a single hub for the key events in your FM universe." ✔

So: **the tile Home and the Inbox were merged into one surface.** That is a decisive data point for the "tile vs list vs inbox" question — SI found that a separate dashboard competing with the inbox lost. The winner was the inbox, upgraded with tiles.

FM26's shell, as documented in SI's feature article ✔:

| Change | Detail |
|---|---|
| **Portal** | Merged Home + Inbox. Contains messages, upcoming fixtures, a two-week calendar summary, results, news |
| **Portal filters** | Four: **All, New, Tasks, Unread** — "Tasks" is the actionable subset, a cleaner articulation of FM24's "Must Respond" |
| **Improved action panel** | "so it's clearer when your team needs you to make a decision" |
| **Staff tips dropdown** | Quick contact with backroom for guidance on training, recruitment, development, staff |
| **Navigation bar moved to the TOP** | Categories grouped for faster access to "key areas of responsibility"; clicking a section opens a large submenu |
| **Tiles & cards** | "tiles are the components of every screen… clicking one opens a 'card' containing more detail" — more contextual data up front |
| **Search expanded** | Now finds entities *plus* objects, information, navigation options, tiles, messages, news and guides |
| **FMPedia** | In-game glossary/manual, reachable from a ribbon icon at top or via search |
| **Bookmarks** | **6 defaults**, **24 total options**; "quick, direct links to specific parts of your game universe" |
| **Design principles** | efficiency, familiarity, predictability — explicitly "reducing the number of clicks", plus fixing font sizes and colour contrast for accessibility |

Reviewers broadly reported the redesign as visually cleaner but **less information-dense and more click-heavy** than FM24 **(unverified as a consensus; mixed reception across IGN pt and community threads)**.

**Lesson:** FM24 is the mature, dense version of this shell; FM26 is the cautionary tale about redesigning a data UI for looks. Copy FM24's structure, not FM26's chrome.

---

## 2. The "Continue" loop

The spine of the game, and SI documents it precisely.

### 2.1 What Continue is

> "The 'Continue' Button is central to Football Manager™. It is the conduit from which the game progresses through time. Once you have finished with all of your business for a given period of time, clicking 'Continue' advances the game." ✔

Documented behaviours:

- **The button is a state machine, not a static button.** "It can change state depending on the game's context. If you have a message in your Inbox that requires a response, the text label on the button changes to reflect this." The label becomes the *action* — **"Must Respond"** when a blocking item exists ✔
- **In multiplayer it becomes a readiness indicator**: "it indicates the number of managers that need to continue before the game starts processing." ✔
- Processing is a **blocking state**: time advances, other fixtures simulate, and the game **interrupts the moment your input is required** ✔

### 2.2 What pauses the game

Two classes of interruption — the distinction is the key design lesson:

| Class | Signal | Ignorable? |
|---|---|---|
| **Must Respond** | Item gets a **red accent colour**; the Continue button is **replaced by "Must Respond"** | **No.** "The game cannot be advanced until you have responded to that news item; there is always an action for you to perform on items such as these, which could be confirming a transfer, submitting a squad for a competition, or attending a meeting with the Board." ✔ |
| **Informational / soft** | Unread badge on the Side Bar Inbox; normal Continue | Yes — you can keep hitting Continue and let it pile up |

Urgency is therefore encoded in **three redundant channels**: (a) the Continue button's *label and enabled state*, (b) the *colour* of the item, (c) the Side Bar *badge*. That redundancy is why FM never feels like it is hiding a blocker.

### 2.3 The standard rhythm

1. **Continue** → processing → the game stops at the next event needing you.
2. **Inbox** is read; actionable items resolve via a modal or the Actions menu.
3. You dip into a module (Squad, Tactics, Transfers) for work that is not inbox-driven.
4. Optionally **advance further in one action** — the Continue control also offers bulk advances such as "advance to next match" and "go on holiday" **(exact labels unverified)**.
5. On match day the loop is suspended and the **match-day mode** takes over (§8.6).
6. After the match: press/full-time inbox items, then back to step 1.

### 2.4 How the game signals urgency

In order of strength:

- **Blocking** — Continue disabled/relabelled `Must Respond`. Cannot be bypassed.
- **Colour** — red accent on the item.
- **Badge** — Side Bar notification count.
- **Content-level deadlines** — transfer offers resolve "24-48 hours later" ✔; transfer deadline day is a hard wall ✔; contract expiry drives the Squad Planner ✔.
- **Calendar** — the date in the Menu Bar opens a week view of "pressing concerns or engagements" ✔.

---

## 3. Inbox

### 3.1 Structure

> "Your Inbox is the main 'hub' of your game world. All important information relating directly to you or any part of your club arrives here in the form of a news item." ✔

Three surfaces:

| Surface | Content |
|---|---|
| **Inbox** | Addressed, personal, actionable news: board, staff, agents, clubs, media requests, competition admin |
| **News** | "a broader range of stories from around the world of football… Click on a story from the left side of the screen to view it in full in a pop-out panel" ✔ |
| **Social Feed** | Follow-driven feed: "teams, competitions, media sources, journalists, and supporters"; supporter reactions via "the club's supporter spokesperson" ✔ |

### 3.2 Read/unread and filtering

- Unread drives the Side Bar badge ✔
- Master–detail: **list on the left, reading pane on the right**. The News tab is explicitly described that way; the Inbox follows the same split ✔
- Named category filters are not documented by SI for FM24 **(unverified)**. FM26 later made this explicit with **All / New / Tasks / Unread** — a strong hint that FM24's implicit filtering was a pain point ✔

### 3.3 Actionable item types

| Item | Resolves in |
|---|---|
| **Transfer offer received** | Transfer negotiation modal (§8.1) |
| **Contract renewal / player wants a new deal** | Contract offer modal (§8.2) |
| **Press request / media obligation** | Press conference modal (§8.4) |
| **Board message / board meeting** | Board conversation; explicitly cited by SI as a "Must Respond" example ✔ |
| **Squad submission for a competition** | Registration screen; explicitly cited ✔ |
| **Confirm a transfer** | Explicitly cited ✔ |
| **Player unhappiness / promise broken** | Player Interaction conversation (§8.5) |
| **Scout report filed** | Report card in the Scouting Centre |
| **Facilities downgraded** | Informational only: "you'll be notified via your Inbox that your facilities have been downgraded" ✔ |

### 3.4 The content-control pattern (worth stealing)

The Social Feed has the best "manage what I'm told" model in the game:

- Right rail lists **suggested accounts to follow**; **Manage** opens a popup with a **Followed Accounts view menu** filtering objects by type ✔
- Each followed object has two independent checkboxes — **Social Content** and **News** — plus a **frequency** dropdown: **Minimal / Normal / Extensive** ✔
- A **pen icon** drills into "the specific types of news you want to receive… divided into sections by subject" ✔
- Each message has a **settings icon** that explains *why you are receiving it* and lets you change it inline ✔
- Every season the **Personal Assistant asks you to review your follows** and suggests additions/removals ✔

That "why am I seeing this → change it here" affordance is the strongest single idea in the FM24 inbox.

---

## 4. Squad screen

> "You'll spend much of your time poring over the Squad screen as you look to develop and mould a group of individual players into a finely tuned machine capable of success." ✔

### 4.1 Sub-tabs (verified)

**Overview** — compact squad table plus summary panels. Filters: all players / exclude by position / hide unavailable or away from club. Shows position, condition, morale, performances ✔

**Squad Planner** *(new in FM24)* — "progressively plan your squad from its current point into next season and the one afterwards" ✔
- **Next season** / **Season after** buttons
- Shows who will still be at the club per contract expiry, **and their likely ability in their assigned role** in the tactics the squad are training
- Signature feature: **drop players who are not at your club into the formation by position/role**, "regardless of whether they're realistic targets", then convert to a Recruitment Focus
- Save/load like tactics; edited via **Main Details** and **Further Details** tabs in the Recruitment Focus popup

**Report** — backroom-compiled, with sub-sections ✔
- **Stats** — team statistics, best and worst performers highlighted
- **Comparison** — your squad vs. the league; **General** tab for height/weight, positional breakdowns averaging relevant attributes
- **Assistant Report** — squad Strengths and Weaknesses + statistical leaders (youngest/oldest etc.) vs. league leaders
- **Experience Matrix** — four buckets **Development, Emerging, Peak, Experienced**, each colour-coded by significance **Important, Squad Depth, Youth**; viewable as **Squad View** or **Position View**
- **Best XI** — prospective best eleven, rated by each backroom member; switchable formation; per position a **Best Player** and **Best Prospect**

**Data Hub** — analytics suite, "available on-demand once a small handful of matches have been played", fully customisable ✔
- **Overview** — Team Report, Team Performance (Attacking/Defending), Key Findings. An **"Ask For"** button requests a dataviz by keyword input
- **Team** — Team Performance (pin with "Display in Team Analytics"; **Edit Mode** to rearrange/pin); **Report** tab (scoring, conceding, formation trends); **Shots** tab (shot accuracy + shot locations on the goal frame)
- **Player** — same model scoped to league players; build your own dashboard
- **Matches** — **Last Match** (Summary + Key Findings), **Recent Matches Analysis** (last five, Positives/Negatives plotted on a pitch)
- **Next Opponent** — Overview, Next Opposition Performance, Analyst Report, Stat Pack, Past Meetings

**Dynamics** — see §4.4
**Development** — see §4.4

### 4.2 The table and its columns

SI does not publish a canonical column list. The **documented default content** is: position, condition, morale, performances, plus the identity block and Playing Time ✔.

A realistic FM24 default column set **(order unverified)**:

`Info · Name · Position · Playing Time · Morale · Condition · Match Sharpness · Age · Nationality · Value · Wage · Contract expiry · Average Rating · Appearances · Goals · Assists`

That the community ships "custom views megapacks" (e.g. FM Stag's FM24 Custom Views Megapack on FM Scout) is itself evidence the default set is thin.

Column mechanics (all documented ✔):

- **Any** table column can be customised. `Views` menu → `Custom` → **"Customise current view"** — which **creates a copy** of the current view (non-destructive).
- Resize by dragging the divider between headers; reorder by dragging the header.
- **Sorting**: click a column; **secondary sorting** by **Shift-clicking** columns in the desired order — and if secondary sort "disappears", you reset it the same way.
- **Views** are named saved presets: "Sections and screens can have one or more views that present the same information in different ways… it would be impossible to display them all at the same time. The solution is to allow a number of different views to display a certain few of the attributes each." ✔
- **Filter** button sits "usually… towards the top right of the main screen area or a panel", opening a checkbox menu with a **Hide Filters** toggler ✔

### 4.3 Filtering by position / role / attribute ranges

The real query UI lives on **Player Search / Shortlist / Scouted**, and the squad list inherits a subset:

- **New Search** (or **Edit Search**) opens a **search dialog** with **Quick** and **Advanced** modes ✔
- **Quick Search** dropdown = one-criterion shortcuts ✔
- **Advanced** = attribute ranges, positions, roles, contract/transfer status ✔
- **Shortlist > Positions** sub-tab breaks the list down **position by position, then role by role**, "with direct comparisons to players within your current squad" ✔

### 4.4 Dynamics and Development as squad lenses

**Dynamics > Overview** panels: **Match Cohesion**, **Dressing Room Atmosphere**, **Managerial Support**, plus current player issues, most influential players, social groups ✔

**Dynamics > Hierarchy** — a four-tier pyramid, each tier defined ✔
1. **Team Leaders** — most influential; grievances "permeate through the rest of the squad"
2. **Highly Influential Players** — stability, the core
3. **Influential Players** — "a voice that deserves to be heard"
4. **Other Players** — the remainder, who gravitate toward others

Clicking the manager above the pyramid shows overall Managerial Support plus a per-player support indicator.

**Dynamics > Social Groups** — each group's internal hierarchy; a side panel says whether groups "live harmoniously together or whether dissenting factions are beginning to form" ✔

**Dynamics > Happiness** — per-player matrix over eight axes: **Promises, Morale, Training, Treatment, Club, Management, Playing Time, Overall Happiness**. Nine-step scale, documented in full ✔:

`Delighted · Very Happy · Happy · Slightly Happy · Content · Slightly Unhappy · Unhappy · Very Unhappy · Devastated`

**Dynamics > Code of Conduct** — set pre-season; punishments for missed training, red cards, suspensions, "ranging from a verbal warning to a fine of two weeks' wages". Overridable case-by-case at relationship risk; the collective Code cannot be renegotiated mid-season ✔

**Development > Overview** — headline: players out on loan + health of development squads; main area: **most suitable first-team candidates**; remainder: **Need Attention** and **Ones to Watch** ✔
**Development > Loans** — all loanees, stats, satisfaction with the spell; staff suggest who else should go out ✔
**Development > Youth Squads** — tabs "change in number and have different naming conventions depending on the club"; per squad: tactical insight, training info, fixtures, match analysis ✔
**Development > Youth Candidates** — annual intake: who they are, what they do best, plus a pre-arrival preview ✔

### 4.5 The "selection" concept

FM24 has **no separate selection screen**. Selection is a *column state* on the squad list plus drag-and-drop onto the tactics pitch.

The closest thing to "role in the squad" is **Playing Time**, which replaced Squad Status in FM24 ✔:

`Star Player · Important Player · Regular Starter · Squad Player · Impact Sub · Fringe Player · B Team Regular · Breakthrough Prospect · Hot Prospect · Youngster · Surplus to Requirements`

plus goalkeeper-specific tiers: `First-Choice Goalkeeper · Backup · Emergency Backup · Cup Goalkeeper · Domestic Cup Goalkeeper · Continental Cup Goalkeeper`

This ladder is a **promise system**, not a label: it drives happiness, transfer requests and board expectations. Very transferable to a guild roster ("Core Raider / Rotational / Bench / Prospect / Surplus").

---

## 5. Player Profile screen

### 5.1 The Information popup (the global object affordance)

> "Whenever a person – player or non-player – appears in a list, they have a small circle with a silhouette or a profile photo. This is the 'Information' pop-up. Clicking it (or hovering over it, depending on your Preferences selection) displays a small box with their most useful biographical information and their attributes." ✔

Plus: right-click the name → **Actions** menu, "allowing you to interact with the individual without having to access their full player profile" ✔

So there are **three depths**: hover card → Actions context menu → full profile. Every dense list row should offer all three.

### 5.2 Tab bar

Tabs **explicitly documented** as existing on a player's tab bar:

| Tab | Evidence |
|---|---|
| **Overview** | Default landing tab ✔ |
| **Development** | With a **Tactics** sub-tab holding the position map: "accessed from the 'Development' -> 'Tactics' tab" ✔ |
| **Player Interaction** | "options found within a player's Actions menu, which can be accessed from their Player Interaction tab" ✔ |
| **Transfer** | Holds "Offer to Clubs", "Add to Shortlist", "Remove from Shortlist" ✔ |
| **Reports** (menu) | Contains **Medical Report** ("accessible via their player profile from the 'Reports' menu, under 'Medical Report'") and **Scout Reports** ("selecting 'Scout Reports' from their Tab Bar") ✔ |

A realistic FM24 tab bar is therefore **(exact order and completeness unverified)**:

`Overview | Development | Report/Reports | History | Contract | Transfer | Interaction …`

The `Profile / Attributes / History / Contract` tabs are community-standard but not enumerated by SI in this manual — mark them unverified.

### 5.3 Attribute panel layout

- Grouped into **Technical / Mental / Physical**, with **Goalkeeping** as its own Technical set for GKs ✔
- **Scale 1–20.** "Each player is rated on a scale of 1-20, 1 being absolutely terrible, and 20 being elite." ✔
- **Absolute vs Relative attributes**: "Absolute attributes are those that are locked to an individual and can't be trained quite as easily, such as Determination and Work Rate… Relative attributes are those that can be compared to other players… and can be improved through training." ✔
- **Fog of war is a first-class UI state**: "For players that aren't at your club and who haven't been comprehensively scouted, attributes appear as a range to indicate a rough idea of their ability in that area. Continued scouting reduces the range until the attribute is clearly identified." ✔
- **Position map**: a pitch diagram, colour-coded per position, with six competence levels plus Natural ✔

| Level | Rating |
|---|---|
| Natural | 18–20 |
| Accomplished | 15–17 |
| Competent | 12–14 |
| Unconvincing | 9–11 |
| Awkward | 5–8 |
| Makeshift | 1–4 |

The same panel shows **footedness** at the bottom and **appearances per position this season** — which explains form, not just ability ✔.

**Tactical familiarity** uses the same theoretical 1–20 scale with four named bands ✔:

`Awkward 1-5 · Competent 6-11 · Accomplished 12-18 · Fluid 19-20`

### 5.4 Star ratings

- Stars are the game's universal "how good, roughly" widget, on a **0.5–5 star scale = 10 half-star levels** ✔
- **Three star colours** ✔:
  - **Gold** — first-team players
  - **Silver** — youth players
  - **Black** — the uncertainty a staff member has about ability/potential
- Hidden underlying model: **CA and PA are 0–200** and are not shown in the base skin ✔
- Stars are **relative and opinionated**: they come from scouts/coaches/assistant, and depend on that staff member's judging ability ✔
- The star pair on a player is **Current Ability stars + Potential Ability stars**, i.e. "how good now" vs "how good could be"

**Design lesson:** a 2-number hidden model (CA/PA) surfaced as a 10-step, 3-colour *opinion* widget is an elegant compression. The user never sees the numbers, only a judgement with an uncertainty channel.

### 5.5 Development, Medical and Comparison

**Development** covers: individual training schedule, attribute changes, new positions, player traits, affiliate loans, squad moves, requesting player advice, and **tactical familiarity** ✔. Traits are listed here and "can be altered or added to through the player's Individual training screen" ✔.

**Medical Report** (Reports menu): "a visual overview of their current injury status, risk assessment and injury history" ✔. The Medical Centre module's Overview colour-codes injury risk — "players in the 'red zone'" ✔.

**Comparison — Player Comparison** ✔
- "take two players and compare every facet of their game"
- Default behaviour: compare to the **player you recently viewed**; click player A's profile, then B's, then **Compare With**
- Multiple comparison views, **defaulting to the 'Overview' view**

**Comparison — Find Similar Players** ✔
- "scans the database… for players with a similar attribute profile to the selected player; it returns players who play in the same position and role"

That pair — *compare to whom I just looked at* + *find similar across the world* — is a cheap, high-value pattern.

---

## 6. Table / list conventions across the game

### 6.1 The grid contract

Every FM24 list screen honours the same implicit contract:

1. **Identity column** — info circle + name (click → profile, right-click → Actions)
2. **Sortable headers** — click to sort, Shift-click for multi-key
3. **Views menu** — named presets; `Custom → Customise current view` creates a copy
4. **Filter button** — top-right of the main area, checkbox menu, Hide Filters toggle
5. **Row selection** — click, Ctrl/Cmd-click, Shift-click ranges; selection enables bulk Actions
6. **Right-click anywhere** → context Actions menu (the power-user path; SI calls it "chiefly a time-saving/power-user feature")
7. **Column resize by drag**, **reorder by header drag**

### 6.2 The status vocabulary

The squad list's non-numeric columns are the emotional dashboard, each an icon + tooltip + colour:

| Signal | Encoding |
|---|---|
| **Condition** | % freshness/fatigue; colour-banded |
| **Match Sharpness** | % match fitness — deliberately separate from condition |
| **Morale** | icon + word; the nine-step happiness scale (§4.4) |
| **Playing Time** | tier name (§4.5) |
| **Status flags** | small row icons; "Hold the cursor over… to enable them to cascade into full view. Bring up the tooltip for more information" ✔ |
| **Body language / motivation** | match-day only (Nervous, Fired Up, Complacent…) |

**Status flags cascade on hover** rather than wrapping to a second line — a good answer to the "too many badges" problem ✔.

### 6.3 Colour-coded attribute thresholds

FM's attribute colouring is a **three-band traffic light** over the 1–20 number:

- **15–20** → green
- **10–14** → white/neutral
- **1–9** → red/amber

**(Exact cutoffs are skin- and preference-dependent; SI does not publish them as a rule — unverified.)** What *is* documented is that attributes can display as **numbers, bars, or stars** and that this is a preference/skin setting.

Design lesson: a **single number with a threshold colour** reads faster than a bar chart — but the thresholds must be **relative to the competition level**, or every lower-league squad looks uniformly red.

### 6.4 Comparison

Three distinct comparison features, often conflated:

1. **Squad > Report > Comparison** — *aggregate*: your squad's averages vs. the league, per position, plus General (height, weight) ✔
2. **Shortlist > Positions** — *individual*: position-by-position, then role-by-role, "with direct comparisons to players within your current squad" ✔
3. **Player > Compare With / Find Similar Players** — *pairwise and search-based* ✔

Plus **Scout Recommendation**, FM24's answer to ranking heterogeneous options: a letter grade **A–E with +/- modifiers** (A+ strongest), distilled from the scout's prose report ✔.

### 6.5 Shortlist

- Add via right-click → **Add to Shortlist**, or player profile → **Transfer** tab → same ✔
- A dialog asks **how long** they stay on the shortlist — time-boxed watchlists ✔
- While on it, "you receive news to your feed whenever a key event involving that player occurs" ✔
- Same table UI as Player Search; **multiple named shortlists** saved/loaded; **Clear Shortlist** with confirmation ✔
- Bulk remove: multi-select → right-click → remove ✔

---

## 7. Screens beyond the Side Bar

### 7.1 Managerial Home / My Profile

Documented panels on the manager's own profile ✔:
- **Profile** — managerial attributes, plus **eight characteristics**; SI names **Reputation** ("The higher the rating, the more you're known in the footballing world")
- **Promises** — every promise made, and its status
- **Visions and Objectives**
- **Manager Timeline** — career chronology
- **Career Options** — coaching courses, interaction, relationships, history
- **Conversations, Media and Interaction with the Game World**

The **Promises** panel is structurally important: it is a *ledger of obligations* — exactly what a guild manager needs (patron contracts, raid commitments, apprentice promises). It also appears as a Home-screen widget, which tells you SI considered it glanceable-critical.

### 7.2 Club > Profile and children

**Profile** — "a simple and quick look at the club's key information. Club Details, League History, Employees, recent Results, Kits, Stadium information and Club information" ✔
**General** — expands it: "the team's Legends, Icons and Favoured Personnel" ✔
**News** — club-scoped news ✔
**Facilities** — with **explicit named ladders** ✔:

| Axis | Scale |
|---|---|
| Training / Youth / Data Analysis Facilities | 10 steps: `State of the Art, Excellent, Superb, Great, Good, Average, Adequate, Below Average, Basic, Poor` |
| Stadium Condition / Pitch Condition | 7 steps: `Perfect, Very Good, Good, OK, Poor, Very Poor, Terrible` |
| Corporate Facilities | 7 steps: `Top, Good, Average, Adequate, Fairly Basic, Basic, None` |
| Junior Coaching / Youth Recruitment | 9 steps: `Exceptional, Excellent, Good, Adequate, Average, Fairly Basic, Basic, Limited, None` |
| Youth Level | 1–4 (0 = no audited status) |

**Affiliates** — linked clubs, with ~14 documented affiliation types (loan partnerships local/national/international, facility sharing, commercial link-up, first-option, work-permit avoidance, youth exchange, promotion/relegation aid, shared youth team, mutual benefit). New affiliations via **Board Requests → Networking → Affiliate Club** ✔

### 7.3 Club Vision & Confidence

- **Club Vision** includes a **supporter profile** in six categories — **Hardcore, Core, Family, Fair Weather, Corporate, Casual** — rendered as a **stadium-shaped pie chart**, plus fan↔board relationship health and social media follower counts ✔
- **Club Culture** — long-term identity objectives built around **playing style, youth development and transfer activity**; "underpins everything else you're tasked with achieving" ✔
- **Confidence** — Board and Fans graded **separately** across five areas: **Club Vision, Matches, Transfers, Tactics, Squad management**, each with a detail screen ✔
- **Grading**: A+ down to F ✔
- **Job Security** uses named tiers: `Untouchable, Very Secure, Secure, Stable, Insecure, …`, and SI notes performance ratings are "now only visible on the 'Job Security' screen for all managers, and not on the Board section" ✔

The **board-vs-fans split** is the sharpest idea here: two audiences, same five axes, allowed to disagree. That maps directly onto "guild patrons vs. guild members".

### 7.4 Job Security

A dedicated screen (not a panel) showing the named confidence tier plus the reasoning. Worth stealing as a "your standing, explained" page.

---

## 8. Notable modals / dialogs

### 8.1 Transfer negotiation

The most intricate modal in the game, and a good benchmark for depth ✔

- **Mode choice first**: Transfer offer vs Loan offer (also Offer Trial / Enquiry from the Actions menu)
- **Header info panel**: the player's current transfer value + "any fee the club are likely to demand (if known)"
- **Core fields**: fee; **Transfer Date** — `Immediate` or `End of current season`
- **Additional Fees and Clauses**: instalments, performance add-ons, international-recognition add-ons
- **Locking**: "Many aspects of a deal can be insisted upon by 'locking' them into place using the padlock icon (**once for non-negotiable (red), twice for semi-negotiable (orange)**; semi-negotiable means the other party is aware that you want to insist upon it, but you might be prepared to budge if another part of the deal is sweetened)". Removed via a circular `–` icon, or permanently excluded ✔
- **Part-exchange**: an **Add** button; "Your Assistant Manager informs you of any positions they are in need of in the comments panel at the left of the screen" ✔
- **Two commit paths**:
  - **Make Offer** — asynchronous; "a response typically arrives 24-48 hours later"
  - **Suggest Terms** — "negotiate 'live'… the other party tells you what they like and dislike about the offer, with **colour-coded references** around the screen leading you to identify which areas need further work" ✔

That dual-path commit — *async bid* vs *live haggling* — is a strong pattern for any trading UI.

**Loan offer** extras ✔: separate **Playing Monthly Fee/Wage** and **Non-Playing Monthly Fee/Wage** (pay more if he doesn't play), duration, wage contribution, loan fee, **Future Fee**, and a declared intended squad role/position.

**Selling** ✔: player → **Transfer** tab → **Offer to Clubs**; same screen shape; a **Targets tab** lets you exclude clubs ("If you don't want a player going to a rival club, tick the appropriate check box"); interested clubs respond with offers over following days. Alternative: **Unwanted List**, delegated to the Director of Football.

**Deadline Day** has its own accelerated presentation ✔ (heading confirmed; exact UI unverified).

### 8.2 Contract offer

Not separately documented in the FM24 manual chapters used here **(unverified specifics)**. The UI follows the transfer-offer grammar: wage, length, bonuses, release clauses, lock icons, live negotiation, agent feedback with colour coding.

### 8.3 Team talk

- Triggered pre-match, half-time, full-time ✔
- **Two orthogonal selectors** — the notable design ✔:
  - **Tone (6)**: `Aggressive, Assertive, Cautious, Reluctant, Calm, Passionate`
  - **Sentiment (6)**: `Angry, Disappointed, Encourage, Sympathise, Pleased, Delighted`
- "The combination of tone and sentiment creates a multi-layered device that can truly affect every fixture you play." ✔
- The Assistant Manager **suggests** a talk and can deliver it for you ✔
- Reactions are per-player, depending on personality, morale, body language ✔

**Touchline shouts** are a separate, lighter mechanism: `Encourage, Praise, Berate, Fire Up, Focus, Demand More, Calm Down, No Pressure`, usable collectively or per-player ✔

### 8.4 Press conference

Documented only as a *responsibility you can delegate* ("If you've assumed the responsibility for attending pre-match tunnel interviews…", "post-match media requirements if you've retained those responsibilities") ✔.

Format is a Q&A modal with journalist questions and a small set of canned replies **(reply count unverified)**. Delegable to the Press Officer. Pre-match **Team Sheets** produce a Press Officer social-media reaction round-up ✔.

### 8.5 Player interaction / conversation

- Reached from the **Player Interaction tab** or right-click **Actions** ✔
- Used for unhappiness, playing time, promises, discipline, praise/criticism ✔
- Agents are a parallel channel: "you can engage them in conversations to resolve player unhappiness about their playing time, as well as the usual contract and transfer negotiations" ✔
- **Code of Conduct** punishments are applied here, with override risk ✔
- New in FM24: **set a season target** for a player going out on loan or unhappy at the club (goals, assists, clean sheets) ✔
- Discipline ladder: official warning, or a fine of one/two (max) weeks' wages ✔

### 8.6 Match day

A **mode switch**, not a modal — the whole shell is replaced ✔

- **Pre-Match Staff Meeting** — opposition report with expected line-up + key tactical advice
- **Team Selection** — final XI + bench
- **Pre-Match Briefing** — players give "instant feedback on how they feel going into the match"; Team Sheet reaction via Press Officer/social; last-minute opposition changes
- **Match Screen**:
  - Top: scoreboard + settings
  - Centre: the pitch
  - **Bottom-left: tactics** — shape, style, mentality, instructions, touchline shouts, plus a **"Full Tactics"** escape hatch to the full Tactics screen
  - **Bottom: player bar** — select a player → change position/role/instructions, shout, substitute
  - **Dugout** panel with **Show Me** (analyst info, other scores) and **Ask For** (on-demand Assistant Manager advice)
  - **Touchline Tablet** toggle
- **Settings** — match speed sliders, replays on/off, highlight saturation (`entire / extended / key / none`), camera
- **Full-Time** — Press Officer round-up of events elsewhere + media/social reaction, then post-match media

### 8.7 Board request

Flow ✔: **Club Vision** (left menu) → **Overview** → **Make Board Request**. Six documented categories:

| Category | Requests |
|---|---|
| **Facilities** | Improve Training Facilities; Improve Youth Facilities |
| **Financial** | Increase Transfer Budget; Increase Wage Budget; Increase Junior Coaching Budget |
| **Networking** | Request Affiliate Club; Request B/U23 Team; Improve Youth Recruitment; Trial Day |
| **Personal** | Contract (negotiate a new deal); Coaching Course |
| **Stadium** | Stadium Expansion / New Stadium; Buy Stadium (if renting) |
| **Staff** | Request Staff Slot; Increase Staff Allowed; Increase Staff Wages |

Approval is gated by finances, performance and your standing; rejection imposes a random cooldown ("weeks, months or even an entire season"), and the board may counter-offer a smaller version ✔

### 8.8 Season / monthly review

Not documented in the FM24 manual chapter set **(unverified)**. Community-known: an end-of-season **Season Review** inbox item and board season-review meeting; periodic **Board Confidence** updates. Treat the naming as unverified.

---

## 9. FM25 / FM26 — what actually changed

**Accuracy note: FM25 was cancelled and never shipped**, on any platform ✔. The redesign it was meant to carry landed in **FM26**, on a Unity foundation with "a shared UI core across all our Unity-based titles".

| Dimension | FM24 | FM26 |
|---|---|---|
| Navigation | **Left rail** (Side Bar) + top menu bar | **Top navigation bar** with grouped categories + expanding submenus; left rail reduced/contextual **(unverified detail)** |
| Home vs Inbox | Separate tile **Home** (F2) and **Inbox** | Merged into **Portal** |
| Tiles | Panels on Home, widget area | **Tiles + cards** as the base component of *every* screen |
| Inbox filters | Implicit categories **(unverified)** | Explicit **All / New / Tasks / Unread** |
| Search | Entities, autocomplete + related links | Entities **plus** objects, information, navigation options, tiles, messages, news, guides |
| Help | Manual (external) | **FMPedia** in-game glossary via ribbon icon or search |
| Shortcuts | Side Bar reorder, World bookmarks | **Bookmarks**: 6 defaults, 24 available |
| Stated goals | — | efficiency, familiarity, predictability; fewer clicks; readable fonts; accessible contrast |

SI's reasoning for the Portal merge is the key takeaway ✔:

> "we realised that in previous editions the home screen wasn't used much, as players spent most of their time in the inbox. To radically improve that experience and give you a true home screen, we merged the two."

**Lesson for Guild Manager:** the inbox is the real home screen. A separate "dashboard" that competes with it loses. Build one surface that is *both*.

---

## 10. Screen catalogue (reference format)

A compact per-screen reference: sub-tabs, what's on it, what you can do. Detail and sourcing for each is in the sections above.

### Screen: INBOX
- **Sub-tabs:** Inbox · News · Social Feed ✔
- **Key data:** sender + subject + timestamp; unread state; red "Must Respond" accent; article body in a right-hand reading pane; for social, the source (club/competition/journalist/supporter spokesperson) and why you're seeing it ✔
- **Actions:** open, reply/respond, delegate, delete, follow/unfollow source, change delivery frequency (Minimal/Normal/Extensive), filter by type ✔

### Screen: HOME (tiles)
- **Sub-tabs:** none — single dashboard, reached by Home icon or `F2` ✔
- **Key data:** Next Match (opponent, venue, weather, H2H), Team News (injuries/suspensions, both sides), Team Fixtures (next 5), then a customisable widget area ✔
- **Actions:** pick/rearrange widgets from ~24 options; click through to the owning screen ✔

### Screen: SQUAD
- **Sub-tabs:** Overview · Squad Planner · Report · Data Hub · Dynamics · Development ✔
- **Key data:** identity, position, Playing Time, morale, condition, sharpness, value/wage/contract, avg rating, apps/goals/assists; status flags cascade on hover ✔
- **Actions:** sort/filter, customise view, select for tactics, bulk actions via right-click, open player profile, set Playing Time, offer to clubs, add to shortlist ✔

### Screen: PLAYER PROFILE
- **Sub-tabs:** Overview · Development (incl. Tactics) · Reports (Medical Report, Scout Reports) · Transfer · Player Interaction ✔ (plus Profile/Attributes/History/Contract **(unverified)**)
- **Key data:** bio + info popup, attributes by Technical/Mental/Physical (1–20, fogged as ranges if unscouted), position map with 6 competence bands, CA/PA stars (gold/silver/black), traits, contract, injury status ✔
- **Actions:** compare with / find similar, shortlist, transfer offer, offer to clubs, train/retrain, discipline, praise, set season target, move squad ✔

### Screen: TACTICS
- **Sub-tabs:** Templates · Mentalities · Team Fluidity · Formations · Roles & Duties · Team Instructions · Player Instructions · Opposition Instructions · Set Pieces · Match Plans · Captains ✔
- **Key data:** formation pitch with role/duty per slot, familiarity per player and per tactical facet, team instruction set, set-piece routines ✔
- **Actions:** drag players into slots, assign role+duty, set instructions, save/export routines, set match plans, pick captain ✔

### Screen: TRAINING
- **Sub-tabs:** Overview · Sessions · Schedules · Units · Mentoring · Individual · Coaches ✔
- **Key data:** weekly calendar of sessions with intensity, per-player workload, unit groupings, mentoring pairs, coach ratings ✔
- **Actions:** assign sessions, set intensity, create/reuse schedules, set individual focus, pair mentors, delegate to staff ✔

### Screen: TRANSFERS / SCOUTING CENTRE
- **Sub-tabs:** Scouting Centre · Player Search · Recruitment Focus · Assignments · Priorities · Scouting Coverage · World Knowledge · Agents · Shortlist · Transfer History · Clauses ✔ / **(partial unverified)**
- **Key data:** scout recommendation grade (A–E with ±), report card, knowledge % tracker, Pros/Cons, budget split (transfer vs wage), scout knowledge map ✔
- **Actions:** Not Interested / Acknowledge / Fully Scout / Make Offer / Add to Shortlist; create recruitment focus; set scouting range; hire intermediaries ✔

### Screen: CLUB
- **Sub-tabs:** Profile · General · News · Facilities · Affiliates ✔
- **Key data:** club details, league history, employees, kits, stadium, legends/icons/favoured personnel; facility ladders; affiliate list and type ✔
- **Actions:** request facility upgrades (via board), request/terminate affiliation, view employee list ✔

### Screen: CLUB VISION / CONFIDENCE
- **Sub-tabs:** Overview · Confidence (Board & Fans) ✔
- **Key data:** club culture, season objectives, supporter split (Hardcore/Core/Family/Fair Weather/Corporate/Casual) as a stadium pie, Board vs Fans grades (A+–F) across Club Vision, Matches, Transfers, Tactics, Squad management ✔
- **Actions:** **Make Board Request** (6 categories), view job security ✔

### Screen: DYNAMICS
- **Sub-tabs:** Overview · Hierarchy · Social Groups · Happiness · Code of Conduct ✔
- **Key data:** match cohesion, dressing-room atmosphere, managerial support, hierarchy pyramid (Team Leaders → Other Players), per-player happiness across 8 axes on a 9-step scale ✔
- **Actions:** click player for popup, open conversation, set/override Code of Conduct punishments, call team meeting ✔

### Screen: DEVELOPMENT CENTRE
- **Sub-tabs:** Overview · Loans · Youth Squads · Youth Candidates ✔
- **Key data:** first-team-ready candidates, Need Attention, Ones to Watch, loanee stats and satisfaction, youth progress vs potential, intake preview ✔
- **Actions:** promote/demote, arrange loans, set loan targets, offer youth contracts ✔

### Screen: MEDICAL CENTRE
- **Sub-tabs:** Overview · Risk Assessment · Current Injuries · Injury History · Season Summary ✔
- **Key data:** injury-risk list (red zone), workload, injury proneness, expected return dates, injury history vs league and vs last season ✔
- **Actions:** rest player, adjust training, send for rehab/physio, view per-player Medical Report ✔

### Screen: MATCH DAY
- **Sub-tabs:** none — a shell-replacing mode ✔
- **Key data:** scoreboard, commentary, player condition/body language, opposition shape, live ratings, Dugout analyst panels, other scores ✔
- **Actions:** subs, position/role/instruction changes, mentality, touchline shouts, opposition instructions, "Full Tactics", Ask For advice ✔

### Screen: MODALS (cross-cutting)
- **Transfer offer** — fee, date, instalments/add-ons, padlocks (red non-negotiable / orange semi-negotiable), part-exchange, Make Offer vs Suggest Terms ✔
- **Team talk** — 6 tones × 6 sentiments, per-player reactions, assistant suggestion ✔
- **Board request** — 6 categories, gated by confidence/finances ✔
- **Player interaction** — praise/criticise/discipline/set target ✔
- **Press conference** — journalist Q&A, delegable **(format unverified)** ✔

---

## 11. What this means for a smaller game

### Structurally essential (build in this order)

1. **A persistent left rail scoped to "my organisation"** — **6–8 modules max**, each with a notification badge. Not 15.
2. **A separate "world" browser** with Back/Forward/history + search. Your rail must never be used to browse other guilds.
3. **A Continue button that is a state machine** — `Continue` → `Must Respond` → processing — plus a visible clock. This one control *is* the game.
4. **One inbox-as-home surface**, with a hard distinction between *blocking* (must answer, red, cannot advance) and *informational*. Redundant encoding: label + colour + badge.
5. **A master–detail list screen** with: identity column, sortable headers, saved named views, filter panel, multi-select + bulk actions, right-click Actions.
6. **An object detail screen** with a fixed tab bar, and the three-depth affordance (hover card → context menu → full page).
7. **A roster table with a "role in the org" column** — FM's Playing Time ladder is the model; it doubles as a promise system.
8. **A promises/obligations ledger** as both a screen and a dashboard widget. Cheap to build, huge narrative payoff.
9. **A two-audience confidence screen** (patrons vs. members) grading you on 4–5 named axes with letter grades.
10. **A modal grammar**: header summary → core fields → optional sweeteners → lock icons → two commit paths (async / live haggle).

### FM-specific depth you should NOT copy wholesale

- **~15 modules.** FM earns this because football management *is* those 15 domains. Collapse for a guild game: Scouting + Transfers → **Recruitment**; Facilities + Finances → **Holdings**; Dynamics + Development → **Roster**; Medical → a Roster lens; Club + Club Vision → **Guild**.
- **Data Hub.** A customisable dataviz dashboard with "Ask For a chart by keyword" is a product in itself. Ship 3 fixed charts.
- **Squad Planner's "insert players you don't own into the formation"** — brilliant, but only worth it once you have a mature tactical model.
- **The 20-attribute 1–20 model.** 20 attributes × N units is a huge UI *and content* tax. 8–12 stats with clear grouping is enough.
- **Nine-step morale + eight happiness axes + six social groups.** Simulation depth leaking into UI. Two axes and five levels is plenty.
- **Youth squads with per-club naming conventions**, affiliate types ×14, five facility ladders. Domain flavour, not structure.
- **Separate Home + Inbox.** SI themselves concluded this was a mistake.

### The five things most worth stealing outright

1. **Continue as a labelled state machine** (`Continue` → `Must Respond`). Makes the turn loop legible without a tutorial.
2. **Views** — named, duplicable, shareable table presets. Lets you ship a thin default table without users feeling trapped.
3. **"Why am I seeing this? → change it here"** on every feed item, plus per-source frequency (Minimal/Normal/Extensive).
4. **The CA/PA → star compression.** Hide the numbers; show a 10-step judgement with an explicit *uncertainty colour* (gold/silver/black).
5. **Two audiences, same axes** (board vs. fans). Disagreement between two graders of the same five things is free drama.
