# Learnings

Running log. Newest entries at the bottom of each section. One entry = one thing we now know that we did not know before.

Format: **what we learned → the evidence → what it changes.**

---

## Design

### L1. The day needs decisions, not a report
A turn loop that only reports outcomes becomes an idle timer by day four. FM's loop is not "assign → simulate"; it is "advance → interruption → decide".
**Evidence:** reviewing the original GDD loop with the FM teardown in hand.
**Changes:** the attention queue is blocking; Advance Day is disabled until resolved. See `guild-manager-model.md` §7.

### L2. One number cannot carry a squad game
`combined iLvl vs boss iLvl` collapses every squad decision into "maximise the sum". FM's depth per player is `(attributes) × (role) × (system) × (opponent)`.
**Changes:** attributes are the currency, iLvl is derived; 8 attributes × 8 roles × role affinity.

### L3. Wipes must name the failed check
"You wiped" is a slot machine. "DPS check failed, 288 vs 330, short by 42" is a puzzle with a solution.
**Changes:** every phase resolves to clean/pass/scrape/fail with both numbers; the report ends with a *next lever*.

### L4. Two clocks beat one
Fatigue alone rewards benching everyone. Condition plus sharpness creates a rotation you have to reason about: rest fixes fatigue and destroys sharpness.
**Evidence:** FM's condition/sharpness pair; community testing suggests sharpness matters more.
**Changes:** both exist, both feed `formMod`.

### L5. Caution beats recklessness, because injury debt compounds
**Evidence:** AI sweep, 10 seeds per personality. The cautious Quartermaster scored 26,514 and took 5/10 world-firsts; the Gambler scored 21,907 with 0/10. The Gambler's errors are not bad fights, they are bodies it cannot replace.
**Changes:** push stance softened (injury ×1.9 → ×1.55). Personalities are the difficulty dial.

### L6. Railroading is fine; skipping is not
Level gates plus prerequisite clears made the first ten days feel like levelling instead of a small raid tier.
**Changes:** every content entry carries `minLevel` and `requires`.

---

## Engineering

### L7. A module-level counter breaks replay
Event ids came from `let counter = 0`. Two calls to `resolveDay` produced different ids, so the determinism test failed on its first run.
**Evidence:** `expect(resolveDay(s)).toEqual(resolveDay(s))`.
**Changes:** ids are derived from content (`e<day>-<hash>-<index>`). Never a global counter.

### L8. `readonly` types fight spread updates
Deep-mutable state with `readonly` fields produced 24 compile errors in the first draft, all of the "cannot assign to readonly property" kind.
**Changes:** `resolveDay` deep-clones with `structuredClone` and mutates locally. Guarantee is behavioural and tested, not type-level. Recorded in ADR 0001.

### L9. Requirements must come from measured capability
The first Hollow Crypt needed dps 120. A fresh level-10 five-man produces **38**. The bot farmed for eighty days, correctly, because nothing it could see was ever reachable.
**Evidence:** a measurement script printing party check values by level.
**Changes:** content requirements are set from that table, ~10–20% above it. Measure before you tune.

### L10. Level gates should use the average, not the weakest
One level-20 hero among nine level-60s blocked the first raid forever. Nothing looked broken: no error, no event, just a bot that never raided.
**Changes:** `levelOk` compares the party's average level to `minLevel`.

### L11. Ten fresh bodies is a scheduling problem
The bot never raided until it was taught to *hold back* its raid party and rest it. Grinding every day guarantees someone is at 70 fatigue on raid night.
**Changes:** explicit raid prep in the planner (`src/sim/ai/planner.ts`).

### L12. Camping is a scoring bug, not a strategy bug
When cleared and uncleared content scored similarly, the AI re-ran the first dungeon for fifty days. Priorities must make progress dominate: uncleared content gets a large flat bonus, cleared content is scored by XP and gold.
**Changes:** `scoreContent` in the planner.

---

## Research (Football Manager)

These are summarised here because they changed decisions. Detail and sources: `docs/fm-blueprint.md` and `docs/research/`.

### L13. Copy FM26's six hubs, not FM24's fourteen modules
SI collapsed a 14-module sidebar into Portal / Squad / Recruitment / Match Day / Club / Career. A six-screen browser game should use the newer shape.

### L14. Do not build a dashboard *and* an inbox
FM had both; telemetry showed nobody used the dashboard, so SI merged them into Portal. One obligations-first surface wins.
**Changes:** the Guild Hall is an attention queue with supporting panels, not a dashboard.

### L15. FM hides the overall rating, and we should break that rule deliberately
FM never shows an OVR. A browser game needs one sortable quality column — but only if the simulation uses role-weighted scores rather than the headline. Otherwise the number becomes the game.

### L16. The best mechanic to steal is Consistency
Consistency 20 performs at full ability in ~20 of 25 matches; 1 in ~1 of 25. One integer creates "brilliant but unreliable".
**Changes:** per-pull consistency roll; an off night is named in the report.

### L17. Scouting fog belongs on the ceiling, not the attributes
In FM, attributes converge to true values when scouted; it is the *potential* estimate that lies. Fog on PA is the whole transfer fantasy.

---

## Process

### L18. Two of the three attached plans were the same document
The "long-term vision" attachment was byte-different but content-identical to the MVP GDD. Reading filenames instead of contents would have wasted a cycle.
**Changes:** read inputs before planning around them; say so when they are duplicates.

### L19. The plan document must be marked historical when it stops being true
After the progression rework, six documents still described the previous design. Stale docs are worse than no docs, because they are trusted.
**Changes:** `Historical` banner convention; `npm run docs:check` fails on stale vocabulary (the previous design's run length, boss count and old filenames).

### L20. A cached list must never be the only gate
`advanceDays` checked the cached `attention` array. A state with a pending event but a stale queue advanced straight through the card — found by a test that constructed exactly that state.
**Changes:** `hasBlocking(state)` checks `pendingEvent` directly; events are also addressable by id (`event:<card>:<day>`) so resolution works even with a stale cache.

### L21. A gold sink must be priced against the endgame surplus, not the early game
Facilities at 600g were noise against a 29k purse. At 900–4800g across four branches, the AI maxed the tree by ~day 70 and ended with ~10k.
**Evidence:** end-of-run gold before 17–29k, after ~10k; the balance sweep moved less than 0.2 raids.
**Changes:** prices set from measured surplus, not from intuition.

### L22. Events are data; *choices* are not yet
Cards resolve through declarative effects, so content is cheap to add. But each option's cost lives in prose, so the AI always takes `options[0]`. The drama is presented, not played.
**Changes (next):** give options machine-readable cost/benefit fields so the planner — and later the rivals — can weigh them.
