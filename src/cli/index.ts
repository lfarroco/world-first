#!/usr/bin/env node
/**
 * Terminal harness. If a decision reads well here, it will read well in the UI.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CLASS_LABEL,
  KIND_LABEL,
  PERSONALITIES,
  RAIDS,
  RUN_DAYS,
  advanceDays,
  aiRun,
  aiTurn,
  assignParty,
  bestLevel,
  clearPlan,
  contentById,
  deriveAttention,
  hireCandidate,
  itemLevel,
  newGame,
  partyOf,
  personalityById,
  projectAssignment,
  resolveAttention,
  resolveDay,
  squadRating,
  wageBill,
  CONTENT,
  type GameState,
  type Hero,
  type Personality,
  type Stance,
} from "../sim/index";
import { unlockedContent } from "../sim/plan";
import { FACILITIES, facilityById, facilitySummary, nextCost, buyFacility, rosterCapFor, wageBudgetFor } from "../sim/facilities";
import { blockingAttention } from "../sim/events";
import { heroPower } from "../sim/hero";
import { planDay } from "../sim/ai/planner";

const SAVE = resolve(process.cwd(), ".save.json");

const C = {
  reset: "\x1b[0m", dim: "\x1b[2m", bold: "\x1b[1m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  blue: "\x1b[34m", cyan: "\x1b[36m", magenta: "\x1b[35m",
};
const color = (t: string, c: keyof typeof C): string => `${C[c]}${t}${C.reset}`;
const pad = (t: string, w: number, a: "l" | "r" = "l"): string => {
  const clean = t.replace(/\x1b\[[0-9;]*m/g, "");
  const diff = w - clean.length;
  if (diff <= 0) return t;
  return a === "l" ? t + " ".repeat(diff) : " ".repeat(diff) + t;
};
const table = (headers: string[], rows: string[][], aligns: ("l" | "r")[] = []): void => {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? "").replace(/\x1b\[[0-9;]*m/g, "").length)),
  );
  const line = (cells: string[]) => cells.map((c, i) => pad(c, widths[i] ?? 0, aligns[i] ?? "l")).join("  ");
  console.log(color(line(headers), "dim"));
  console.log(color(widths.map((w) => "─".repeat(w)).join("  "), "dim"));
  for (const row of rows) console.log(line(row));
};

const args = process.argv.slice(2);
const command = args[0] ?? "help";
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const load = (): GameState => {
  if (!existsSync(SAVE)) {
    console.error(color("No save. Run: npm run cli -- new --seed 1234", "yellow"));
    process.exit(1);
  }
  return JSON.parse(readFileSync(SAVE, "utf8")) as GameState;
};
const save = (s: GameState): void => {
  writeFileSync(SAVE, JSON.stringify(s, null, 2));
};

const heroByToken = (state: GameState, token: string): Hero => {
  const n = Number(token);
  if (Number.isInteger(n) && n >= 1 && n <= state.roster.length) return state.roster[n - 1]!;
  const h = state.roster.find((x) => x.id === token || x.name.toLowerCase().startsWith(token.toLowerCase()));
  if (!h) {
    console.error(color(`Unknown hero: ${token}`, "red"));
    process.exit(1);
  }
  return h;
};

// ── commands ────────────────────────────────────────────────────────────────

const cmdNew = (): void => {
  const seed = Number(flag("seed") ?? 1234);
  const state = newGame(seed, flag("name") ?? "Ironbound Order");
  save(state);
  console.log(color(`New guild: ${state.guildName}`, "green"));
  console.log(color(`seed ${seed} · 3 heroes at level 1 · ${RUN_DAYS} days`, "dim"));
  console.log("Try: status · content · advance --days 5 · ai --days 10");
};

const cmdStatus = (): void => {
  const state = load();
  const bill = wageBill(state.roster);
  const budget = wageBudgetFor(state.renown, state.facilities);
  const raids = state.progress.filter((p) => contentById(p.contentId)?.kind === "raid" && p.clears > 0).length;
  const dungeons = state.progress.filter((p) => contentById(p.contentId)?.kind === "dungeon" && p.clears > 0).length;

  console.log();
  console.log(
    `${color(state.guildName, "bold")}  ${color(`day ${state.day}/${RUN_DAYS}`, "dim")}  ${color(`${Math.round(state.gold)}g`, "yellow")}  renown ${state.renown}  ${color(`${state.roster.length} heroes`, "dim")}`,
  );
  console.log(
    `wages ${bill > budget ? color(`${bill}g vs ${budget}g`, "red") : `${bill}g vs ${budget}g`}   dungeons ${dungeons}   raids ${color(`${raids}/${RAIDS.length}`, raids > 0 ? "green" : "dim")}   best level ${bestLevel(state.roster)}`,
  );

  if (state.pendingEvent) {
    console.log(color(`\nEVENT: ${state.pendingEvent.cardId} — resolve it with: attention`, "magenta"));
  }
  console.log(color(`facilities  ${facilitySummary(state.facilities)}   roster ${state.roster.length}/${rosterCapFor(state.facilities)}`, "dim"));

  const blocked = blockingAttention(state);
  if (blocked.length > 0) console.log(color(`\n${blocked.length} item(s) need you — run: attention`, "magenta"));

  if (state.plan.parties.length === 0) {
    console.log(color("\nNo parties assigned. Run: auto, or ai --days 1", "yellow"));
  } else {
    console.log(color("\nToday", "dim"));
    table(
      ["#", "content", "heroes", "stance", "projected"],
      state.plan.parties.map((p, i) => {
        const projection = projectAssignment(state, p);
        return [
          String(i + 1),
          contentById(p.contentId)?.name ?? p.contentId,
          String(p.heroes.length),
          p.stance,
          projection ? `${Math.round(projection.estimatedBestPull * 100)}%` : "-",
        ];
      }),
    );
  }

  console.log(color("\nRivals", "dim"));
  table(
    ["guild", "cleared", "doing"],
    [
      ...state.rivals.map((r) => [r.name, `${r.raidsCleared}/6`, r.activity]),
      [color(state.guildName, "cyan"), `${raids}/3 raids`, "you"],
    ],
  );
  console.log();
};

const cmdToday = (): void => {
  const state = load();
  const raids = state.progress.filter((p) => contentById(p.contentId)?.kind === "raid" && p.clears > 0).length;
  console.log();
  console.log(`${color(`Day ${state.day}`, "bold")}  ${Math.round(state.gold)}g  renown ${state.renown}  ${state.roster.length} heroes  best lvl ${bestLevel(state.roster)}  raids ${raids}/3`);
  console.log();

  if (blockingAttention(state).length > 0) {
    console.log(color("NEEDS YOU", "magenta"));
    for (const item of blockingAttention(state)) {
      console.log(`  ${item.title} — ${color(item.id, "dim")}`);
      for (const o of item.options) console.log(`     ${color(o.key, "cyan")}  ${o.label}`);
    }
    console.log();
  }

  if (state.plan.parties.length === 0) {
    console.log(color("No parties assigned. Run: auto, or `party --content <id> --heroes 1,2,3`", "yellow"));
  } else {
    table(
      ["#", "content", "heroes", "stance", "projected", "weakest check"],
      state.plan.parties.map((p, i) => {
        const projection = projectAssignment(state, p);
        const weakest = projection
          ? [...projection.phases].sort((a, b) => a.ratio - b.ratio)[0]
          : undefined;
        return [
          String(i + 1),
          contentById(p.contentId)?.name ?? p.contentId,
          String(p.heroes.length),
          p.stance,
          projection ? `${Math.round(projection.estimatedBestPull * 100)}%` : "-",
          weakest ? `${weakest.checkLabel} ${(weakest.value / weakest.requirement).toFixed(2)}` : "-",
        ];
      }),
    );
  }
  console.log();
};

const cmdBuild = (): void => {
  const state = load();
  const id = args[1];
  if (!id) {
    table(
      ["facility", "level", "next", "cost", "effect"],
      FACILITIES.map((f) => {
        const cost = nextCost(state.facilities, f.id);
        return [
          f.name,
          String(state.facilities[f.id]),
          cost === null ? "max" : String(state.facilities[f.id] + 1),
          cost === null ? "-" : `${cost}g`,
          f.levels[Math.min(state.facilities[f.id], 2)] ?? "-",
        ];
      }),
    );
    console.log(color(`\ngold ${Math.round(state.gold)}g · build <facility>`, "dim"));
    return;
  }
  const def = facilityById(id);
  if (!def) {
    console.error(color(`Unknown facility: ${id}`, "red"));
    process.exit(1);
  }
  const next = buyFacility(state, def.id);
  if (!next) {
    console.error(color("Cannot build: maxed or not enough gold.", "red"));
    process.exit(1);
  }
  save(next);
  console.log(color(`${def.name} is now level ${next.facilities[def.id]} (${Math.round(next.gold)}g left).`, "green"));
};

const cmdRoster = (): void => {
  const state = load();
  table(
    ["#", "hero", "class", "role", "lvl", "xp", "iLvl", "pow", "fat", "mor", "wage", "ctr"],
    state.roster.map((h, i) => [
      String(i + 1),
      h.name,
      CLASS_LABEL[h.klass],
      h.role,
      String(h.level),
      `${h.xp}/${40 + h.level * 10}`,
      String(itemLevel(h.gear)),
      String(Math.round(heroPower(h))),
      String(Math.round(h.fatigue)),
      String(Math.round(h.morale)),
      `${h.contract.wage}g`,
      h.contract.daysLeft <= 7 ? color(`${h.contract.daysLeft}d`, "yellow") : `${h.contract.daysLeft}d`,
    ]),
    ["l", "l", "l", "l", "r", "r", "r", "r", "r", "r", "r", "r"],
  );
  console.log(color(`\nsquad rating ${Math.round(squadRating(state.roster))}`, "dim"));
  console.log();
};

const cmdContent = (): void => {
  const state = load();
  const unlocked = new Set(unlockedContent(state).map((c) => c.id));
  console.log();
  table(
    ["content", "kind", "lvl", "party", "requires", "status"],
    CONTENT.map((c) => {
      const p = state.progress.find((x) => x.contentId === c.id);
      const cleared = (p?.clears ?? 0) > 0;
      const open = unlocked.has(c.id);
      return [
        c.name,
        KIND_LABEL[c.kind],
        String(c.minLevel),
        `${c.minHeroes}-${c.maxHeroes}`,
        c.requires.length === 0 ? "—" : c.requires.join(", "),
        cleared
          ? color(`cleared ×${p?.clears}`, "green")
          : open
            ? color("open", "cyan")
            : color("locked", "dim"),
      ];
    }),
  );
  console.log();
};

const cmdTavern = (): void => {
  const state = load();
  table(
    ["#", "name", "class", "lvl", "fee"],
    state.tavern.map((c, i) => [
      String(i + 1),
      c.hero.name,
      CLASS_LABEL[c.hero.klass],
      String(c.hero.level),
      `${c.fee}g`,
    ]),
  );
  console.log(color(`gold ${Math.round(state.gold)}g · hire <n>`, "dim"));
};

const cmdHire = (): void => {
  const state = load();
  const c = state.tavern[Number(args[1] ?? "0") - 1];
  if (!c) {
    console.error(color("No such candidate.", "red"));
    process.exit(1);
  }
  const before = state.roster.length;
  const next = hireCandidate(state, c);
  save(next);
  console.log(
    next.roster.length > before
      ? color(`Signed ${c.hero.name} (lvl ${c.hero.level}) for ${c.fee}g.`, "green")
      : color("Could not sign (gold or roster cap).", "red"),
  );
};

const cmdParty = (): void => {
  const state = load();
  const contentId = flag("content");
  const heroesArg = flag("heroes");
  const stance = (flag("stance") ?? "steady") as Stance;
  if (!contentId || !heroesArg) {
    console.error(color("usage: party --content wolf-den --heroes 1,2,3 [--stance push]", "yellow"));
    process.exit(1);
  }
  const content = contentById(contentId);
  if (!content) {
    console.error(color(`Unknown content ${contentId}`, "red"));
    process.exit(1);
  }
  const heroes = heroesArg.split(",").map((t) => heroByToken(state, t).id);
  const next = assignParty(state, { contentId, heroes, stance });
  save(next);
  console.log(
    `${color(content.name, "bold")} ← ${heroes.length} heroes (${stance})`,
  );
};

const cmdAuto = (): void => {
  const state = load();
  const p = personalityById(flag("personality") ?? "steady");
  const { plan, notes } = planDay(state, p);
  save({ ...state, plan });
  console.log(color(`planned as ${p.name}`, "dim"));
  for (const n of notes) console.log(`  ${n}`);
};

const cmdAdvance = (): void => {
  let state = load();
  const days = Math.max(1, Number(flag("days") ?? 1));
  for (let i = 0; i < days; i += 1) {
    if (state.finished) break;
    const before = state.day;
    const next = resolveDay(state);
    printDigest(next, before);
    state = next;
    save(state);
    if (state.finished) break;
    if (blockingAttention(state).length > 0) {
      console.log(color("\nSomething needs you — run: attention", "magenta"));
      break;
    }
  }
  if (state.finished) printRunEnd(state);
  else console.log(color(`— day ${state.day}/${RUN_DAYS} —`, "dim"));
};

const printDigest = (state: GameState, day: number): void => {
  const events = state.events.filter((e) => e.day === day);
  console.log();
  console.log(color(`Day ${day}`, "bold"));
  for (const e of events) {
    const mark =
      e.severity === "good" ? color("✔", "green") : e.severity === "bad" ? color("✖", "red") : color("·", "dim");
    console.log(`  ${mark} ${e.text}`);
  }
  if (events.length === 0) console.log(color("  nothing happened", "dim"));
};

const printRunEnd = (state: GameState): void => {
  console.log();
  console.log(color("════ RUN COMPLETE ════", "bold"));
  console.log(
    `${color(`SCORE ${state.score}`, "bold")}  band ${color(state.band ?? "-", "magenta")}  ${state.worldFirstDay ? color("WORLD FIRST", "green") : ""}`,
  );
  for (const line of state.scoreLines ?? []) {
    const sign = line.value >= 0 ? "+" : "";
    console.log(`  ${pad(line.label, 12)} ${pad(`${sign}${line.value}`, 8, "r")}  ${color(line.detail, "dim")}`);
  }
  console.log();
};

const cmdReport = (): void => {
  const state = load();
  const log = state.lastEncounter;
  if (!log) {
    console.log(color("No raid night yet.", "yellow"));
    return;
  }
  console.log();
  console.log(`${color(log.contentName, "bold")} ${color(`— day ${log.day}, ${log.pulls.length} pulls`, "dim")}`);
  console.log(
    log.cleared ? color(`CLEARED`, "green") : color(`WIPE — best ${Math.round(log.bestPull * 100)}%`, "red"),
  );
  const last = [...log.pulls].reverse().find((p) => !p.killed) ?? log.pulls.at(-1);
  if (!last) return;
  table(
    ["phase", "check", "yours", "needs", "ratio", "result"],
    last.phases.map((p) => [
      p.name,
      p.checkLabel,
      String(p.value),
      String(p.requirement),
      (p.value / p.requirement).toFixed(2),
      p.outcome === "fail"
        ? color("FAIL", "red")
        : p.outcome === "scrape"
          ? color("scrape", "yellow")
          : color("clear", "green"),
    ]),
    ["l", "l", "r", "r", "r", "l"],
  );
  const failed = last.phases.find((p) => p.outcome === "fail");
  if (failed) {
    const gap = Math.max(0, failed.requirement - failed.value);
    console.log(color(`\nnext lever: +${Math.round(gap)} ${failed.checkLabel}`, "bold"));
    console.log(`  +${Math.round(failed.value * 0.12)}  switch stance to Push (+12% checks)`);
    console.log(`  +${Math.round(failed.value * 0.2)}  one more night of mastery`);
    console.log(`  +${Math.round(failed.value * 0.15)}  gear upgrades from the dungeons`);
  }
  console.log();
};

const cmdAttention = (): void => {
  const state = load();
  if (state.attention.length === 0) {
    console.log(color("Nothing needs you.", "green"));
    return;
  }
  for (const item of state.attention) {
    console.log(
      `${item.blocking ? color("NEEDS YOU", "magenta") : color("FYI", "dim")}  ${color(item.title, "bold")}`,
    );
    console.log(`  ${item.detail}`);
    console.log(`  ${color(item.id, "dim")}`);
    for (const o of item.options) console.log(`    ${color(o.key, "cyan")}  ${o.label}`);
  }
};

const cmdResolve = (): void => {
  let state = load();
  const [itemId, optionKey] = [args[1], args[2]];
  if (!itemId || !optionKey) {
    console.error(color("usage: resolve <itemId> <option>", "yellow"));
    process.exit(1);
  }
  state = resolveAttention(state, itemId, optionKey);
  state = { ...state, attention: deriveAttention(state) };
  save(state);
  console.log(color(`resolved ${itemId} → ${optionKey}`, "green"));
};

const cmdAi = (): void => {
  let state = load();
  const p = personalityById(flag("personality") ?? "steady");
  const days = Math.max(1, Number(flag("days") ?? 10));
  const verbose = !args.includes("--quiet");

  console.log(color(`${p.name} — ${p.blurb}`, "dim"));
  for (let i = 0; i < days && !state.finished; i += 1) {
    const turn = aiTurn(state, p);
    state = turn.state;
    if (verbose) {
      const day = state.day - 1;
      const parties = state.plan.parties
        .map((pp) => `${contentById(pp.contentId)?.name.split("—").pop()?.trim() ?? pp.contentId}(${pp.heroes.length})`)
        .join(" + ");
      console.log(
        `${color(`d${String(day).padStart(2)}`, "dim")} ${pad(parties, 42)} ${pad(`${Math.round(state.gold)}g`, 7, "r")}  lvl ${bestLevel(state.roster)}  ${color(`${state.progress.filter((x) => x.clears > 0).length} cleared`, "dim")}`,
      );
      for (const note of turn.notes) console.log(`     ${color(note, "dim")}`);
    }
    save(state);
  }
  if (state.finished) printRunEnd(state);
  else console.log(color(`\n— day ${state.day}/${RUN_DAYS} —`, "dim"));
};

const cmdSim = (): void => {
  const runs = Number(flag("runs") ?? 20);
  const personalities: Personality[] = flag("personality")
    ? [personalityById(flag("personality")!)]
    : [...PERSONALITIES.slice(0, 3)];
  const baseSeed = Number(flag("seed") ?? 1);

  console.log();
  table(
    ["personality", "avg score", "median", "raids", "dungeons", "wins"],
    personalities.map((p) => {
      const scores: number[] = [];
      let raids = 0;
      let dungeons = 0;
      let wins = 0;
      for (let i = 0; i < runs; i += 1) {
        const final = aiRun(newGame(baseSeed + i * 17, "Sim"), p, 400);
        scores.push(final.score ?? 0);
        raids += final.progress.filter((x) => contentById(x.contentId)?.kind === "raid" && x.clears > 0).length;
        dungeons += final.progress.filter((x) => contentById(x.contentId)?.kind === "dungeon" && x.clears > 0).length;
        if (final.worldFirstDay !== null) wins += 1;
      }
      const sorted = [...scores].sort((a, b) => a - b);
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / Math.max(1, runs));
      return [
        p.name,
        String(avg),
        String(sorted[Math.floor(sorted.length / 2)] ?? 0),
        (raids / runs).toFixed(2),
        (dungeons / runs).toFixed(2),
        `${wins}/${runs}`,
      ];
    }),
    ["l", "r", "r", "r", "r", "r"],
  );
  console.log();
};

const cmdHelp = (): void => {
  console.log(`
${color("world-first", "bold")} — progression harness

  ${color("new", "cyan")} [--seed N]
  ${color("today", "cyan")}                       one screen: what needs you, what is planned
  ${color("status", "cyan")}                      guild, parties, rivals
  ${color("build", "cyan")} [facility]             facilities and upgrades
  ${color("roster", "cyan")}                      levels, xp, gear
  ${color("content", "cyan")}                     the ladder and its locks
  ${color("tavern", "cyan")} · ${color("hire", "cyan")} <n>
  ${color("party", "cyan")} --content <id> --heroes 1,2,3 [--stance push]
  ${color("auto", "cyan")}                        let the AI plan today
  ${color("advance", "cyan")} [--days N]
  ${color("report", "cyan")}                      last raid night + levers
  ${color("attention", "cyan")} · ${color("resolve", "cyan")} <id> <option>
  ${color("ai", "cyan")} [--days N] [--personality steady|reckless|careful]
  ${color("sim", "cyan")} [--runs N] [--personality id]
`);
};

switch (command) {
  case "new": cmdNew(); break;
  case "status": cmdStatus(); break;
  case "today": cmdToday(); break;
  case "build": cmdBuild(); break;
  case "roster": cmdRoster(); break;
  case "content": cmdContent(); break;
  case "tavern": cmdTavern(); break;
  case "hire": cmdHire(); break;
  case "party": cmdParty(); break;
  case "auto": cmdAuto(); break;
  case "advance": cmdAdvance(); break;
  case "report": cmdReport(); break;
  case "attention": cmdAttention(); break;
  case "resolve": cmdResolve(); break;
  case "ai": cmdAi(); break;
  case "sim": cmdSim(); break;
  default: cmdHelp(); break;
}

void clearPlan;
void advanceDays;
void aiRun;
void partyOf;
