# Design Review — Guild Manager (working title)

**Status:** pre-code review of the two attached plans + Gemini conversation
**Date:** 2026-10-30
**Verdict:** the concept is strong, the MVP as written has one structural flaw and eight smaller ones. All are fixable without growing scope.

---

## 1. What we actually have

Two attachments. They are the **same document**: `long_term_vision_document.md` and `mvp_game_design_document.md` are content-identical (only whitespace and a couple of headings differ).

So the long-term vision document referenced in the Gemini conversation **does not exist in this repo**. The Gemini chat mentions it (contract negotiation, facility trees, multiplayer realms, 2D combat replays) but those ideas only live in the chat transcript, not in a file. That needs to be written before we start, because the vision is what tells us which MVP cuts are safe.

The real inputs are therefore:
1. The MVP GDD (both files).
2. The Gemini transcript — which is *richer* than the GDD. It contains the best ideas in the project: lockout structure, split runs, the race, the retention/morale loop, the two recruitment paths, and the headless-sim + CLI idea for agent-driven development.

**First recommendation: treat the transcript as a source document too, and write the vision doc from it.** I've done that in [vision.md](vision.md).

---

## 2. The one structural flaw

> **The day has no decisions in it.**

The MVP loop is: *read digest → assign parties → pick a stance → press SIMULATE DAY → read digest*.

That is a click-through. Nothing in it forces a choice with a cost. The only real decisions are "who goes in which party" and "aggressive vs safe", both of which have a single dominant answer once you understand the modifiers (rotate fatigued heroes, stance = safe unless you're behind). A player will solve it by day 4 and then the game is an idle timer.

Football Manager does not work because of its features. It works because **the day is a queue of interruptions that each demand a decision with incomplete information.** You press Continue, and the game stops you: *your star striker wants a new contract; a rival bid £40m; the board wants to discuss next season's expectations; your left back is out for 6 weeks; the press want a comment.* Each of those is a small, legible trade-off. Continue is the pacing; interruptions are the game.

**The fix (cheap, and it changes everything):** every day resolution must end with **2–5 "attention items"** — actionable, dismissible, each with a real cost — and the day cannot be advanced without the player seeing them. The digest is not a report, it is an inbox.

Concretely, the attention items our sim can generate from day one:
- Hero hit 70%+ fatigue and is in tomorrow's raid party → *bench / rest / push through*
- Hero has been benched 3 days → *promise A-team / rotate them in / risk morale*
- Loot dropped that only fits one hero → *assign* (this is FM's "who gets the minutes" problem, and it is the single most reliable drama generator)
- Rival guild pulled ahead on the boss you're stuck on → *keep pushing / farm gear first*
- Wage bill will exceed the budget next reset → *cut someone / raise income / ride it out*
- A hero's contract expires in 7 days → *renew / let them walk / sell*

Each of those is one modal, two or three buttons, and 20 seconds of thought. That is the game.

---

## 3. Smaller problems, in order of how much they hurt

### 3.1 The combat model is one number deep

`Combined iLvl vs Boss iLvl → pass/wipe probability` means every squad-building decision collapses to "maximise the sum". Gearing, class, roles, composition, and morale all become the same variable. There is nothing to *understand*, so there is nothing to get good at, and no way to explain a loss.

FM's depth per player is `(attribute vector) × (role) × (team system) × (opponent weakness)`. That's four multipliers on one player. Ours currently has zero.

**Fix:** attributes are the real currency; iLvl becomes a *derived headline* (exactly like FM's Current Ability — the number the table shows, computed from what actually matters). See [guild-manager-model.md](guild-manager-model.md) §2 for the 8-attribute model and §3 for the boss check system that gives losses a name.

### 3.2 There is no visible causality in a wipe

Even with a pass/fail model, the player needs to know *why*. "You wiped" is a slot machine. "You failed the Phase 3 enrage check — your DPS score was 340 against a required 410" is a puzzle with a solution: gear up your damage dealers, swap the Rogue for the Mage, stop taking the Rogue with 55% morale, or spend your potions.

**This is the cheapest and highest-leverage feature in the whole design.** A wipe report that names the failed check and shows the number is worth more than three new systems.

### 3.3 Roster cap 15 while raid needs 10

You need a raid party of 10, a dungeon party of 5, daily farming, rest days, and injury cover — out of 15 heroes. That means every hero is always deployed, so fatigue and injury never create a choice; they just create a forced rotation. Worse, it removes the bench, and the bench is where all the morale drama lives.

**Fix:** cap 22–24. Enough for a 10-man raid plus a 5-man dungeon plus 7–9 on the bench. Now the question "who do I leave out?" has an answer nobody likes, which is exactly right.

### 3.4 The economy has no pressure

Gold comes in daily from farm and dungeons; wages go out once a week. Nothing is scarce except hero purchase price, and once you've bought a veteran, the economy is a non-issue. FM's financial tension is not "do I have money" but "**my wage bill is £40k over budget and my best player wants a raise**".

**Fix:** wages should be a *budget line*, checked weekly, with a board that reacts. Add exactly one consumable sink (raid flasks: gold for +team power for one day) so gold has a decision attached, not just a number.

> **Updated 2026-11-01.** The wage budget, arrears and the renewal negotiation shipped. The market adds the consumable decision: gear at the guild tier, a salve for injury days, rations for fatigue, and a three-day tonic. See [guild-manager-model.md](guild-manager-model.md) §5.6.

### 3.5 Rival guilds are a scoreboard, not opponents

Three names whose boss progress advances on a script. They cannot be scouted, poached from, beaten with a strategy, or lost to for a reason. So the "race" is really a timer.

**Fix for MVP (cheap):** rivals run the *same* power-growth and pull model as the player, with different personalities and different farming strategies. They must be simulated by the same code as you, or the race will always feel fake. You don't need to render them; you need them to be *explicable* ("Echoes killed boss 4 on day 12 by farming dungeons for 8 days straight — they out-geared us").

> **Updated 2026-11-01.** Rivals are full guilds on the same planner and `resolveDay`, and the Guilds screen now exposes every rival roster. A hero can be signed away for a fee and a wage, and rivals sign each other's bench. See [guild-manager-model.md](guild-manager-model.md) §6.

### 3.6 Stance is a three-way global switch

`Aggressive / Balanced / Safe` applied to the whole party is too coarse to be interesting and will be solved as "Safe until the last week". FM gives you ~15 team instructions across three phases of play plus per-player instructions.

**Fix (for v0.1):** keep the stance idea, make it **per-party**, and show each stance's effect as numbers on the check projection — three legible choices beat three opaque percentages. The richer version (two axes plus 3–4 situational **doctrine** toggles, each interacting with a boss mechanic) is a good post-MVP upgrade once the loop is proven; it is deliberately cut from v0.1 to keep the MVP simple.

### 3.7 Fatigue is a step function

`+20% per assignment, penalty if > 60%` means the entire system is "don't cross 60", which is a threshold to babysit, not a resource. Every hero at 55% performs identically to one at 0%.

**Fix:** make condition a smooth multiplier on the team score (1.0 at 0–40 fatigue, tapering to 0.65 at 100) and make recovery cost something (a day not deployed, or gold at the infirmary). Then "riding a tired hero" is a genuine gamble.

### 3.8 No failure state — and no ending

Nothing can go permanently wrong, and nothing ever *concludes*. You cannot be fired, run out of money, or fail the season. There is no verdict, so the last week has no weight, and there is no reason to start a second run.

**Fix (decided):** a **fixed deadline and a final ranking**, EU4/HOI4/Civ style — now **84 days over a three-raid ladder**. The run ends, scores you on raids / wealth / strength / renown, bands you S–D, ranks you against the three rivals, and shows the three moments that mattered. Debt is a *scar* (arrears block recruitment, drain morale, cost score) rather than a game over — you can go bankrupt and keep playing, badly, exactly as you described.

This replaces the board-confidence idea I originally proposed, and it is better: one legible number visible from day one beats a hidden confidence meter, and a bounded run with a score is what makes replay natural. It also deletes a subsystem instead of adding one. See [open-questions.md](open-questions.md) D3 and [guild-manager-model.md](guild-manager-model.md) §8.

---

## 4. Things in the current plan that are right and should be protected

- **Daily turns, not real-time.** Correct, and it is what FM actually does — a day-based advance loop with events inside it. Keep it.
- **Lockout structure inspired by WoW** (daily dungeons, weekly raid, RWF). This is a genuinely better hook than football fixtures, because it gives the player a *weekly* rhythm and a *seasonal* climax.
- **Split runs.** The idea that you may run your B-team to funnel gear to the A-team is the best mechanical idea in the transcript. It is also exactly FM's "rotate in the cup match" and WoW's real meta. Keep it in MVP if it's cheap — it makes party assignment a genuine optimisation problem rather than a formality.
- **Two recruitment paths (grow vs buy).** The core FM strategic tension, correctly identified. Keep.
- **Headless simulation core + CLI wrapper** for agent-driven development. Excellent instinct; see §6.
- **localStorage for phase 1.** Correct for scope — but see §6 for the seam that keeps it from becoming a trap.

---

## 5. Scope: what the simplified FM editions prove you can cut

*(full comparison in [fm-04-matchday-and-scope-tiers.md](research/fm-04-matchday-and-scope-tiers.md))*

Football Manager Touch / Mobile / Console ship profitably while cutting: press conferences, squad dynamics and social groups, most of the transfer clause negotiation, youth academies, set pieces, staff recruitment, 3D match engine, and dozens of leagues. What they *never* cut: squad table, player attributes, player profile, tactics/roles, transfers, league table, matchday result, and the Continue loop.

That is a very clean signal for our MVP:

**Keep (must exist):** roster table · hero sheet with attributes · roles/party composition · recruitment list + signing · day advance · mission/raid result with an explanation · RWF leaderboard · wages.

**Cut (post-MVP):** facility tree (keep one flat "Guild Hall level") · youth academy · scouting network (replace with a per-hero "rumoured range") · contracts negotiation (one modal, 3 knobs) · training (fold into "rest vs farm") · staff · press/media · 2D replay.

---

## 6. Technical shape (brief, since it constrains design)

The transcript's instinct — **pure TypeScript simulation core, UI as a skin, CLI for agents** — is right, but I'd add one non-negotiable:

**Every run must be reproducible from `(seed, action log)`.** Deterministic RNG threaded through the sim, and the day resolution expressed as a pure function:

```
resolveDay(state: GameState, plan: DayPlan, rng: Rng) -> { nextState, events[] }
```

Why this matters more than it sounds: it makes balance tuning a script instead of a chore, it lets agents playtest thousands of seasons headlessly, it makes bug reports replayable, and it means the eventual move from `localStorage` to a server (or multiplayer realms, or shared leaderboards) is a storage swap rather than a rewrite. FM's own data model is essentially "state + timeline"; ours should be too.

Full detail: [tech-notes.md](tech-notes.md).

---

## 7. Naming (do this before any public surface exists)

`Guild Manager` is **taken on Steam** — twice:
- [Guild Manager](https://store.steampowered.com/app/5227700/Guild_Manager/) (Team Rounding, unreleased): "You are the guild master… recruit the Awakened" — same genre, same premise.
- [Guild Manager 26](https://steamdb.info/app/4495870/) — a management sim that already uses the "26" sports-manager convention.

`Realm Manager` has no direct Steam collision but is generic and likely unregistrable.

This doesn't block design work, but it should be settled before the name appears in a domain, repo, or store page. Options to evaluate are in [open-questions.md](open-questions.md) Q7.

---

## 8. What I'd do next (in order)

1. Answer the ten questions in [open-questions.md](open-questions.md) (they change the model, so they come first).
2. Rewrite the MVP GDD around the systems in [guild-manager-model.md](guild-manager-model.md) — specifically: attributes as the currency, boss checks with named failure modes, attention items, wage budget, evaluable rivals.
3. Build the headless sim + CLI and tune one boss tier until the *log* is readable. If the wipe report reads like a story, the game works; if it reads like a spreadsheet, no amount of UI will save it.
4. Only then build screens — in the order given in [screens.md](screens.md), driven by the six-tab information architecture borrowed from FM26.
