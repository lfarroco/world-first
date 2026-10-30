# AGENTS.md

How to work in this repo. Applies to humans and to AI agents.

---

## 1. The one rule

**Every session ends with what it learned written down.**

If you discovered something that would change a future decision — a number that was wrong, an approach that failed, a trade-off you accepted — it goes into [docs/learnings.md](docs/learnings.md) before the session ends. Not in the chat, not in your head, not in a commit message.

A finished piece of work with no written learning is unfinished work.

---

## 2. Documentation rules

- **`docs/` is the source of truth.** Code comments explain *how*; docs explain *what and why*.
- **Update in place.** Do not add `notes-v2.md`, `final-design.md`, `new-plan.md`. If a doc is wrong, edit it. If it is genuinely historical, add one line at the top: `> **Historical.** …` and stop maintaining it.
- **One concern per document.** If a doc starts answering two unrelated questions, split it.
- **Link, don't duplicate.** Numbers live in one place; other docs point at it. Duplicated numbers rot.
- **Numbers are claims.** Write "resolves in 1.5 ms on 1000 runs", not "fast". If you do not know, write "unmeasured".
- **Say what you rejected.** A decision without the alternative it beat is unusable later.

Run `npm run docs:check` before finishing. It fails on broken links and on stale vocabulary (e.g. references to the previous design: 28-day, five bosses).

### Where things go

| Kind of thing | Where |
|---|---|
| What the game is, pillars, long-term shape | `docs/vision.md` |
| A decision with alternatives and consequences | `docs/adr/000N-*.md` |
| Locked decisions and open questions | `docs/open-questions.md` |
| The mechanics, with numbers and formulas | `docs/guild-manager-model.md` |
| The content ladder and the AI | `docs/progression-report.md` |
| Screens and interaction | `docs/screens.md` |
| Scope, build order, tuning targets | `docs/mvp-scope.md` |
| Engineering rules | `docs/tech-notes.md` |
| **Lessons learned the hard way** | `docs/learnings.md` |
| Reference research (external sources) | `docs/research/` |

---

## 3. Writing style

Simple, direct technical English.

- Short sentences. One idea each. Active voice, present tense.
- Prefer the concrete: "`resolveDay` clones its input", not "the system ensures isolation".
- Numbers over adjectives. Name the unit and the sample.
- Tables for comparisons, bullets for lists, prose only when there is causal reasoning to do.
- No marketing words: "seamless", "powerful", "robust", "leverage", "delight". Delete them.
- No hedging chains: "might possibly help to potentially". Say it or cut it.
- Define an acronym the first time it appears in a document.
- Say "we" for decisions, imperative for rules: "We chose X" / "Do not put rules in the UI".

Applies to commit messages, ADRs, code comments and this file.

---

## 4. Architecture rules (non-negotiable)

These exist so the game stays testable and replayable. Break them only through an ADR.

1. **`src/sim/` is pure.** No framework imports, no IO, no `Date.now()`, no `Math.random()`.
2. **`resolveDay` clones its input and returns a new state.** Callers never observe mutation. A test asserts it.
3. **Randomness is seeded and streamed.** `rngStream(seed, name, ...extras)`. Adding a roll in one system must not reshuffle another.
4. **Content is data.** The ladder lives in `src/sim/content/content.ts`; tuning constants in `tuning.ts`. Balance changes are data edits, not code edits.
5. **The UI is a projection.** `render(state)` + `dispatch(action)`. No business rules in components, no derived numbers computed twice.
6. **Event ids are content-derived** (`e<day>-<hash>-<index>`). Never a module-level counter — it breaks replay.

The dependency direction is one-way: `sim` imports nothing from `ui`, `store`, `app`, or `cli`.

---

## 5. Verification

Before you call anything done:

```bash
npm run typecheck     # tsc --noEmit
npm test              # 17 tests: determinism, invariants, balance
npm run docs:check    # links + stale vocabulary
```

For balance or content changes, also:

```bash
npm run cli -- sim --runs 10        # sweep across personalities
```

Rules of thumb:

- **If a determinism test fails, fix the RNG, do not weaken the test.**
- **New content needs a measurement run, not intuition.** Print a party's check values by level before setting a requirement. The first pass had a dungeon at 3× the capability of any party that could enter it, and the AI spent eighty days farming.
- **The AI is the test harness.** If the bot cannot walk the ladder, a player cannot either.

---

## 6. Balance workflow

1. Measure capability (a throwaway script is fine; delete it after).
2. Set requirements from that measurement, slightly above it, so mastery and gear matter.
3. Run the sweep across personalities.
4. Write the numbers and what changed into `docs/progression-report.md` or `docs/learnings.md`.

Never tune two dials at once. If you change a number, say what it was, what it is, and which measurement justifies it.

---

## 7. Commits

- Imperative mood, one line: `add raid prep to the AI planner`.
- Body: why, and what it costs. Reference the doc you updated.
- Docs and behaviour change in the same commit. A code change that invalidates a doc is a broken commit.
- Never commit `.save.json`, `tmp/`, or `node_modules/`.

---

## 8. Do not

- Add a dependency without an ADR.
- Put game rules in React components (or in the CLI).
- Create a new document when an existing one fits.
- Leave a document describing a design that no longer exists. Mark it historical or fix it.
- Quietly change a number that a doc cites. Update the doc in the same change.
- Write a rule here that you would not enforce in review.

---

## 9. Definition of done

- [ ] Behaviour implemented and typechecked
- [ ] Tests pass; determinism preserved
- [ ] Docs updated in place (or marked historical)
- [ ] New numbers recorded with their measurement
- [ ] Learnings added to [docs/learnings.md](docs/learnings.md)
- [ ] `npm run docs:check` passes
