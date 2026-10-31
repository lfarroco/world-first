#!/usr/bin/env node
/**
 * Terminal harness. If a decision reads well here, it will read well in the UI.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CHECK_LABEL,
  CLASS_LABEL,
  KIND_LABEL,
  ROLES,
  abilityById,
  assignRole,
  fitFor,
  powerInRole,
  checkPowerInRole,
  rolesForClass,
  countersAbility,
  traitById,
  TRAITS,
  TRAIT_IDS,
  isAvailable,
  PERSONALITIES,
  PROMISE,
  RAIDS,
  RUN_DAYS,
  runWorld,
  advanceDay,
  boardLine,
  CONTRACT_BOARD,
  isPosted,
  payScaleFor,
  playTurn,
  playerRank,
  standings,
  assignParty,
  assignLoot,
  autoAssignLoot,
  autoRaidTeam,
  bestRaidTeam,
  ensureRaidTeam,
  lootTargets,
  lootUpgrade,
  suggestLootTarget,
  nextRaidContent,
  raidTeamHeroes,
  attemptsFor,
  bestLevel,
  clearPlan,
  contentById,
  deriveAttention,
  formMod,
  hireCandidate,
  isStance,
  itemLevel,
  focusPull,
  fieldableParty,
  nextLevers,
  pullTraits,
  newGame,
  partyOf,
  personalityById,
  projectAssignment,
  resolveAttention,
  startingRivals,
  squadRating,
  validatePlan,
  wageBill,
  xpToNext,
  CONTENT,
  type GameState,
  type Hero,
  type Personality,
  type Stance,
} from "../sim/index";
import {
  pruneUnavailable,
  sanitizePlan,
  unlockedContent,
  availableContent,
  contentAvailability,
  unavailableContent,
} from "../sim/plan";
import { FACILITIES, facilityById, facilitySummary, nextCost, buyFacility, rosterCapFor, wageBudgetFor } from "../sim/facilities";
import { blockingAttention, hasBlocking } from "../sim/events";
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
  const state = JSON.parse(readFileSync(SAVE, "utf8")) as GameState;
  // A save written before the rivals were guilds has an old one-number shape.
  // There is no honest way to rebuild a roster the old model never had; keep
  // the player's run and give the race a fresh start.
  const first = state.rivals[0];
  if (first && !("guild" in first)) {
    state.rivals = startingRivals(state.seed);
  }
  return state;
};
const save = (s: GameState): void => {
  writeFileSync(SAVE, JSON.stringify(s, null, 2));
};

const runLabel = (state: GameState): string =>
  state.finished ? "run complete" : `day ${state.day}/${RUN_DAYS}`;

const planWarnings = (state: GameState): void => {
  const problems = validatePlan(state);
  if (problems.length === 0) return;
  console.log(color("\nThis plan will not run as written:", "yellow"));
  for (const problem of problems) console.log(color(`  • party ${problem.index + 1}: ${problem.message}`, "yellow"));
};

/** A planned mission that is not on today's board is legal but pays the token. */
const boardWarnings = (state: GameState): void => {
  for (const party of state.plan.parties) {
    const content = contentById(party.contentId);
    if (!content || content.kind !== "mission") continue;
    const scale = payScaleFor(state, content);
    if (scale === 1) continue;
    console.log(
      color(
        `  ${content.name} is not posted today — pays ${Math.round(scale * 100)}% of its gold and XP.`,
        "yellow",
      ),
    );
  }
};

/**
 * A discovered threat the party does not answer. Printed under the plan so the
 * player sees the gap before pressing advance, not after the wipe.
 */
const threatWarnings = (state: GameState): void => {
  for (const party of state.plan.parties) {
    const content = contentById(party.contentId);
    if (!content) continue;
    const known = (state.progress.find((p) => p.contentId === content.id)?.attempts ?? 0) > 0;
    if (!known) continue;
    const heroes = party.heroes
      .map((id) => state.roster.find((h) => h.id === id))
      .filter((h): h is Hero => Boolean(h));
    for (const phase of content.phases) {
      const abilityId = phase.ability;
      if (!abilityId) continue;
      if (heroes.some((h) => countersAbility(h.traits, abilityId))) continue;
      const ability = abilityById(abilityId);
      console.log(
        color(
          `  ${content.name}: ${ability.name} uncountered — ${CHECK_LABEL[phase.check]} ×${ability.penalty.toFixed(2)}`,
          "yellow",
        ),
      );
    }
  }
};

const heroByToken = (state: GameState, token: string): Hero => {
  const n = Number(token);
  if (Number.isInteger(n) && n >= 1 && n <= state.roster.length) return state.roster[n - 1]!;

  const exact = state.roster.find((x) => x.id === token);
  if (exact) return exact;

  const matches = state.roster.filter((x) => x.name.toLowerCase().startsWith(token.toLowerCase()));
  if (matches.length === 1) return matches[0]!;
  if (matches.length > 1) {
    console.error(
      color(
        `Ambiguous hero "${token}": ${matches.map((h) => h.name).join(", ")}. Use a full name or a roster number.`,
        "red",
      ),
    );
    process.exit(1);
  }
  if (Number.isInteger(n)) {
    console.error(
      color(
        `No hero at position ${n} — the roster has ${state.roster.length}. Positions shift when a hero leaves; use a name.`,
        "red",
      ),
    );
    process.exit(1);
  }
  console.error(color(`Unknown hero: ${token}`, "red"));
  process.exit(1);
};

/** One line per party: what the plan projects after a roster or plan change. */
const printPlanProjection = (state: GameState): void => {
  if (state.plan.parties.length === 0) {
    console.log(color("no parties assigned — everyone rests", "dim"));
    return;
  }
  for (const party of state.plan.parties) {
    const projection = projectAssignment(state, party);
    if (!projection) continue;
    const weakest = [...projection.phases].sort((a, b) => a.ratio - b.ratio)[0];
    const content = contentById(party.contentId);
    console.log(
      color(
        `  ${content?.name ?? party.contentId}: ${weakest ? `${weakest.checkLabel} ${weakest.ratio.toFixed(2)}${weakest.ratio < 1 ? ` -${Math.round((1 - weakest.ratio) * 100)}%` : ""}` : "auto-clear"} · best pull ${Math.round(projection.estimatedBestPull * 100)}% · form ${Math.round(projection.form * 100)}%`,
        "dim",
      ),
    );
  }
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
    `${color(state.guildName, "bold")}  ${color(runLabel(state), "dim")}  ${color(`${Math.round(state.gold)}g`, "yellow")}  renown ${state.renown}  ${color(`${state.roster.length} heroes`, "dim")}`,
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
    console.log(
      color(
        `\nContracts posted: ${boardLine(state)} — unposted repeats pay ${Math.round(CONTRACT_BOARD.tokenPay * 100)}%.`,
        "dim",
      ),
    );
    console.log(color("\nToday", "dim"));
    table(
      ["#", "content", "heroes", "stance", "projected", "form", "weakest"],
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
          projection ? `${Math.round(projection.form * 100)}%` : "-",
          weakest ? `${weakest.checkLabel} ${weakest.ratio.toFixed(2)}` : "-",
        ];
      }),
    );
    planWarnings(state);
    boardWarnings(state);
  }

  const pending = state.pendingLoot ?? [];
  if (pending.length > 0) {
    console.log(color(`${pending.length} drop${pending.length === 1 ? "" : "s"} waiting — run loot`, "yellow"));
  }
  const team = raidTeamHeroes(state);
  if (team.length > 0) console.log(color(`raid team ${team.length} heroes`, "dim"));

  console.log(color("\nRace", "dim"));
  const board = standings(state);
  const activity = new Map(state.rivals.map((r) => [r.name, r.activity]));
  table(
    ["#", "guild", "score", "raids", "doing"],
    board.map((row, i) => [
      String(i + 1),
      row.isPlayer ? color(row.name, "cyan") : row.name,
      String(row.score),
      `${row.raids}/${RAIDS.length}`,
      row.isPlayer
        ? state.worldFirstDay
          ? "world first"
          : "you"
        : activity.get(row.name) ?? "",
    ]),
  );
  console.log();
};

const cmdToday = (): void => {
  const state = load();
  const raids = state.progress.filter((p) => contentById(p.contentId)?.kind === "raid" && p.clears > 0).length;
  console.log();
  const title = state.finished ? "Run complete" : `Day ${state.day}`;
  console.log(`${color(title, "bold")}  ${Math.round(state.gold)}g  renown ${state.renown}  ${state.roster.length} heroes  best lvl ${bestLevel(state.roster)}  raids ${raids}/${RAIDS.length}  rank ${playerRank(state)}/${state.rivals.length + 1}`);
  if (state.finished) {
    console.log(color(`SCORE ${state.score} · band ${state.band}`, "bold"));
  }
  console.log();

  if (blockingAttention(state).length > 0) {
    console.log(color("NEEDS YOU", "magenta"));
    for (const item of blockingAttention(state)) {
      console.log(`  ${item.title} — ${color(item.id, "dim")}`);
      for (const o of item.options) console.log(`     ${color(o.key, "cyan")}  ${o.label}`);
    }
    console.log();
  }

  const promises = (state.promises ?? []).filter((p) => p.status === "open");
  if (promises.length > 0) {
    console.log(color("Promises — starts due by the date", "dim"));
    for (const promise of promises) {
      const hero = state.roster.find((h) => h.id === promise.heroId);
      if (!hero) continue;
      const late = promise.daysAssigned < PROMISE.startsRequired && promise.dueOn - state.day <= 1;
      const line = `  ${hero.name} — ${promise.daysAssigned}/${PROMISE.startsRequired} starts, due day ${promise.dueOn}`;
      console.log(late ? color(line, "yellow") : line);
    }
    console.log();
  }

  console.log(
    color(
      `Contracts posted: ${boardLine(state)} — unposted repeats pay ${Math.round(CONTRACT_BOARD.tokenPay * 100)}%.`,
      "dim",
    ),
  );
  console.log();
  if (state.plan.parties.length === 0) {
    console.log(color("No parties assigned. Run: auto, or `party --content <id> --heroes 1,2,3`", "yellow"));
  } else {
    table(
      ["#", "content", "heroes", "stance", "pulls", "projected", "form", "weakest check"],
      state.plan.parties.map((p, i) => {
        const projection = projectAssignment(state, p);
        const weakest = projection
          ? [...projection.phases].sort((a, b) => a.ratio - b.ratio)[0]
          : undefined;
        const content = contentById(p.contentId);
        const pulls = content
          ? attemptsFor(content, partyOf(state, p), p.stance)
          : 0;
        return [
          String(i + 1),
          content?.name ?? p.contentId,
          String(p.heroes.length),
          p.stance,
          String(pulls),
          projection ? `${Math.round(projection.estimatedBestPull * 100)}%` : "-",
          projection ? `${Math.round(projection.form * 100)}%` : "-",
          weakest
            ? `${weakest.checkLabel} ${weakest.ratio.toFixed(2)}${weakest.ratio < 1 ? ` -${Math.round((1 - weakest.ratio) * 100)}%` : ""}`
            : "-",
        ];
      }),
    );
    console.log(
      color(
        "projected = share of the boss banked (a failed check banks its ratio) · form = condition × sharpness × morale × health · pulls = attempts left tonight",
        "dim",
      ),
    );
    planWarnings(state);
    boardWarnings(state);
    threatWarnings(state);
  }
  const team = raidTeamHeroes(state);
  if (team.length > 0) {
    console.log(color(`Raid team (${team.length}): ${team.map((h) => h.name).join(", ")}`, "dim"));
  }
  const pending = state.pendingLoot ?? [];
  if (pending.length > 0) {
    console.log(color(`\n${pending.length} drop${pending.length === 1 ? "" : "s"} waiting — run loot`, "yellow"));
    for (const drop of pending) {
      const hero = state.roster.find((h) => h.id === suggestLootTarget(state, drop));
      console.log(
        `  ${drop.item ?? `${drop.slot} ${drop.ilvl}`} from ${drop.contentName} → ${hero?.name ?? "?"} (suggested)`,
      );
    }
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
  const team = new Set(state.raidTeam ?? []);
  table(
    ["#", "hero", "class", "role", "lvl", "xp", "iLvl", "pow·form", "fat", "shp", "mor", "wage", "ctr", "trait"],
    state.roster.map((h, i) => [
      String(i + 1),
      team.has(h.id) ? `★ ${h.name}` : h.name,
      CLASS_LABEL[h.klass],
      fitFor(h, h.role).fit === "natural" ? h.role : `${h.role}*`,
      String(h.level),
      `${h.xp}/${xpToNext(h.level)}`,
      String(itemLevel(h.gear)),
      `${Math.round(heroPower(h))}·${Math.round(formMod(h) * 100)}%`,
      String(Math.round(h.fatigue)),
      String(Math.round(h.sharpness)),
      String(Math.round(h.morale)),
      `${h.contract.wage}g`,
      h.contract.daysLeft <= 7 ? color(`${h.contract.daysLeft}d`, "yellow") : `${h.contract.daysLeft}d`,
      (h.traits ?? []).map((id) => traitById(id).name).join(", ") || color("—", "dim"),
    ]),
    ["l", "l", "l", "l", "r", "r", "r", "r", "r", "r", "r", "r", "r", "l"],
  );
  console.log(
    color(
      `\nsquad rating ${Math.round(squadRating(state.roster))} · ★ is the raid team · pow is tonight's power; form is condition × sharpness × morale × health`,
      "dim",
    ),
  );
  console.log();
};

/** Tonight's best legal party from heroes who can actually fight. */
const projectionFor = (state: GameState, content: (typeof CONTENT)[number]) => {
  // The contribution ranking can miss the average gate; `fieldableParty` falls
  // back to the highest-level legal party, because that is a party the player
  // can actually send. It is the same helper the War Room uses.
  const party = fieldableParty(state, content);
  if (!party) return null;
  const projection = projectAssignment(state, {
    contentId: content.id,
    heroes: party.map((h) => h.id),
    stance: "steady",
  });
  return projection ? { party, projection } : null;
};

const cmdContent = (): void => {
  const state = load();
  const open = availableContent(state);
  const hidden = unavailableContent(state);

  if (open.length === 0) {
    console.log(color("\nNothing is open. Recruit enough heroes or level up.", "yellow"));
    return;
  }

  console.log();
  console.log(
    color(
      `Contracts posted: ${boardLine(state)} — unposted missions pay ${Math.round(CONTRACT_BOARD.tokenPay * 100)}% of their gold and XP after the first clear.`,
      "cyan",
    ),
  );
  table(
    ["content", "id", "kind", "avg lvl", "party", "gold", "xp", "loot", "pay", "projected", "status"],
    open.map((c) => {
      const progress = state.progress.find((p) => p.contentId === c.id);
      const clears = progress?.clears ?? 0;
      const attempts = progress?.attempts ?? 0;
      const projected = projectionFor(state, c);
      const pay = c.kind === "mission" ? payScaleFor(state, c) : 1;
      const status =
        clears > 0
          ? color(`cleared ×${clears}`, "green")
          : attempts > 0
            ? color("open", "cyan")
            : color("new", "bold");
      return [
        c.name,
        c.id,
        KIND_LABEL[c.kind],
        String(c.minLevel),
        `${c.minHeroes}-${c.maxHeroes}`,
        c.kind === "farm" ? `${c.gold}g/hero` : `${c.gold}g`,
        String(c.xp),
        c.loot.count === 0 ? "—" : `${c.loot.count} · ${c.loot.ilvlMin}-${c.loot.ilvlMax}`,
        c.kind !== "mission" ? "—" : pay < 1 ? color(`${Math.round(pay * 100)}%`, "yellow") : "full",
        c.kind === "farm" ? color("auto", "dim") : projected ? `${Math.round(projected.projection.estimatedBestPull * 100)}%` : "—",
        status,
      ];
    }),
    ["l", "l", "l", "r", "r", "r", "r", "l", "r", "r", "l"],
  );
  console.log(
    color(
      `gold ${Math.round(state.gold)}g · ${state.roster.length} heroes · best level ${bestLevel(state.roster)} · xp is per hero; farm gold is per hero`,
      "dim",
    ),
  );
  console.log(
    color(
      "avg lvl is the party average the content needs; projected = share of the boss banked by tonight's best legal party (a failed check banks its ratio)",
      "dim",
    ),
  );
  if (hidden.length > 0) {
    console.log(
      color(
        `${hidden.length} area${hidden.length === 1 ? "" : "s"} not open yet — you will be told when ${hidden.length === 1 ? "it opens" : "they open"}.`,
        "dim",
      ),
    );
  }
  console.log(color(`inspect <id> — mobs, drops and per-clear chances`, "dim"));
  console.log();
};

const cmdInspect = (): void => {
  const state = load();
  const content = contentById(args[1] ?? "");
  if (!content) {
    console.error(color(`Unknown content: ${args[1] ?? "(none)"} — run: content`, "red"));
    process.exit(1);
  }

  const availability = contentAvailability(state, content);
  if (availability.status === "locked" || availability.status === "level" || availability.status === "roster") {
    console.log(color(`\n${content.name} is not open yet — ${availability.reason}`, "yellow"));
    console.log(color("Run `content` for what is open.", "dim"));
    return;
  }

  const progress = state.progress.find((p) => p.contentId === content.id);
  const clears = progress?.clears ?? 0;
  const attempts = progress?.attempts ?? 0;
  const status =
    clears > 0 ? `cleared ×${clears}` : attempts > 0 ? `open · ${attempts} attempt${attempts === 1 ? "" : "s"}` : "new";

  console.log();
  console.log(
    `${color(content.name, "bold")} ${color(`— ${KIND_LABEL[content.kind]} · average level ${content.minLevel}+ · ${content.minHeroes}-${content.maxHeroes} heroes · recommended iLvl ${content.recommendedIlvl} · ${status}`, "dim")}`,
  );
  console.log(color(content.blurb, "dim"));
  console.log(
    `\nRewards   ${content.kind === "farm" ? `${content.gold}g and ${content.xp} xp per hero` : `${content.gold}g · ${content.xp} xp per hero`}${content.loot.count === 0 ? " · no drops" : ` · ${content.loot.count} item${content.loot.count === 1 ? "" : "s"} from the iLvl ${content.loot.ilvlMin}-${content.loot.ilvlMax} band`}`,
  );
  if (content.kind === "mission") {
    const scale = payScaleFor(state, content);
    const posted = isPosted(state, content);
    const label =
      scale < 1
        ? `not posted today — pays ${Math.round(scale * 100)}% of its gold and XP`
        : posted
          ? "posted today — full pay"
          : clears === 0
            ? "not posted — first clear, full pay"
            : "full pay";
    console.log(color(`Contract   ${label}`, scale < 1 ? "yellow" : "dim"));
  }

  console.log(color("\nPhases", "dim"));
  if (content.phases.length === 0) {
    console.log("  no phases — the run always succeeds");
  } else {
    table(
      ["phase", "check", "needs", "share", "threat"],
      content.phases.map((p) => {
        const ability = p.ability ? abilityById(p.ability) : undefined;
        return [
          p.name,
          CHECK_LABEL[p.check],
          String(p.requirement),
          `${Math.round(p.share * 100)}%`,
          ability ? `${ability.name} (×${ability.penalty.toFixed(2)})` : "—",
        ];
      }),
      ["l", "l", "r", "r", "l"],
    );
  }

  console.log(color("\nBestiary", "dim"));
  table(
    ["name", "role", "pressures", "what it does"],
    content.mobs.map((m) => [m.name, m.role, m.check ? CHECK_LABEL[m.check] : "—", m.note]),
  );

  console.log(color("\nDrops", "dim"));
  if (content.drops.length === 0) {
    console.log(
      content.kind === "farm"
        ? "  none — farms pay in gold and practice"
        : "  none — this is a contract, not a treasure room",
    );
  } else {
    table(
      ["item", "slot", "iLvl", "chance"],
      content.drops.map((d) => [d.name, d.slot, String(d.ilvl), `${Math.round(d.chance * 100)}%`]),
      ["l", "l", "r", "r"],
    );
    console.log(
      color(
        "chance is per clear. At most one named item drops; on a hit it replaces one of the guaranteed items.",
        "dim",
      ),
    );
  }

  console.log(color("\nYour party tonight", "dim"));
  const best = projectionFor(state, content);
  if (!best) {
    const ready = state.roster.filter((h) => isAvailable(h)).length;
    console.log(
      color(
        `  not enough heroes ready: ${ready} fit, needs ${content.minHeroes}. Injured and resting heroes do not count.`,
        "yellow",
      ),
    );
  } else {
    console.log(`  ${best.party.map((h) => `${h.name} (lvl ${h.level})`).join(", ")}`);
    for (const phase of best.projection.phases) {
      // Three bands, same as the resolution: clean at 1.15, pass at 1.00,
      // scrape at 0.92 (clears, rolls injuries), fail below. The old
      // `verdict` lumped pass and scrape into "marginal" and hid both.
      const mark =
        phase.ratio >= 1.15
          ? color("clean", "green")
          : phase.ratio >= 1
            ? color("pass", "green")
            : phase.ratio >= 0.92
              ? color("scrape — clears", "yellow")
              : color("fail", "red");
      console.log(
        `  ${pad(`${phase.checkLabel}`, 12)} ${pad(`${Math.round(phase.value)}/${phase.requirement}`, 12, "r")} ${phase.ratio.toFixed(2)}  ${mark}`,
      );
    }
    console.log(
      color(
        `  projected best pull ${Math.round(best.projection.estimatedBestPull * 100)}% · form ${Math.round(best.projection.form * 100)}%`,
        "dim",
      ),
    );
    console.log(
      color(
        "  a scrape clears the phase but can roll into a wipe; the projection banks a phase only at 1.00",
        "dim",
      ),
    );
  }
  console.log();
};

const cmdTavern = (): void => {
  const state = load();
  // The tavern refills at the end of every seventh day, so the faces are seen
  // the next morning. Say when: an empty list with no date reads as a bug.
  const nextFaces = Math.ceil(state.day / 7) * 7 + 1;
  table(
    ["#", "name", "class", "role", "lvl", "iLvl", "pow", "traits", "fee"],
    state.tavern.map((c, i) => [
      String(i + 1),
      c.hero.name,
      CLASS_LABEL[c.hero.klass],
      c.hero.role,
      String(c.hero.level),
      String(itemLevel(c.hero.gear)),
      String(Math.round(heroPower(c.hero))),
      (c.hero.traits ?? []).map((id) => traitById(id).name).join(", ") || color("—", "dim"),
      `${c.fee}g`,
    ]),
    ["l", "l", "l", "l", "r", "r", "r", "l", "r"],
  );
  if (state.tavern.length === 0) {
    console.log(
      color(
        `no one is drinking here — new faces on day ${nextFaces} (${nextFaces - state.day} day${nextFaces - state.day === 1 ? "" : "s"})`,
        "yellow",
      ),
    );
  } else {
    console.log(
      color(
        `gold ${Math.round(state.gold)}g · hire <n> · new faces every 7 days, next on day ${nextFaces}`,
        "dim",
      ),
    );
  }
};

const cmdHire = (): void => {
  const state = load();
  const c = state.tavern[Number(args[1] ?? "0") - 1];
  if (!c) {
    console.error(color("No such candidate.", "red"));
    process.exit(1);
  }
  if (state.gold < 0) {
    console.error(color("In arrears — the guild cannot sign anyone until it is out of debt.", "red"));
    process.exit(1);
  }
  if (state.roster.length >= rosterCapFor(state.facilities)) {
    console.error(color(`Roster is full (${state.roster.length}/${rosterCapFor(state.facilities)}). Build the Great Hall.`, "red"));
    process.exit(1);
  }
  if (state.gold < c.fee) {
    console.error(color(`Not enough gold: ${Math.round(state.gold)}g, needs ${c.fee}g.`, "red"));
    process.exit(1);
  }
  const next = hireCandidate(state, c);
  save(next);
  const traits = (c.hero.traits ?? []).map((id) => traitById(id).name).join(", ") || "no traits";
  console.log(
    color(
      `Signed ${c.hero.name} (lvl ${c.hero.level}, iLvl ${itemLevel(c.hero.gear)}, power ${Math.round(heroPower(c.hero))}, ${traits}) for ${c.fee}g.`,
      "green",
    ),
  );
  console.log(color(`He is not in a party yet — assign him with: party --content <id> --heroes <name>`, "dim"));
};

const cmdParty = (): void => {
  const state = load();
  const contentId = flag("content");
  const heroesArg = flag("heroes");
  const stanceArg = flag("stance") ?? "steady";
  if (!contentId || !heroesArg) {
    console.error(color("usage: party --content wolf-den --heroes 1,2,3 [--stance push]", "yellow"));
    process.exit(1);
  }
  if (!isStance(stanceArg)) {
    console.error(color(`Unknown stance "${stanceArg}". Use cautious, steady or push.`, "red"));
    process.exit(1);
  }
  const content = contentById(contentId);
  if (!content) {
    console.error(color(`Unknown content ${contentId}`, "red"));
    process.exit(1);
  }
  if (!unlockedContent(state).some((c) => c.id === contentId)) {
    console.error(color(`${content.name} is locked — clear its prerequisite first.`, "red"));
    process.exit(1);
  }
  const picked = heroesArg
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => heroByToken(state, t));
  const heroes = picked.map((h) => h.id);
  if (heroes.length === 0) {
    console.error(color("Pick at least one hero.", "red"));
    process.exit(1);
  }
  if (new Set(heroes).size !== heroes.length) {
    console.error(color("A hero is listed twice in the same party.", "red"));
    process.exit(1);
  }
  const unavailable = picked.filter((h) => !isAvailable(h));
  if (unavailable.length > 0) {
    console.error(
      color(
        `Unavailable: ${unavailable
          .map((h) => `${h.name} (${h.injuryDays > 0 ? `injured ${h.injuryDays}d` : "too hurt"})`)
          .join(", ")}.`,
        "red",
      ),
    );
    process.exit(1);
  }

  const before = state.plan.parties.find((p) => p.contentId === contentId);
  const next = assignParty(state, { contentId, heroes, stance: stanceArg });
  const problems = validatePlan(next);
  if (problems.length > 0) {
    console.error(color("That party cannot run:", "red"));
    for (const problem of problems) console.error(color(`  • party ${problem.index + 1}: ${problem.message}`, "red"));
    process.exit(1);
  }
  save(next);
  // Positions shift when a hero leaves, so confirm the party by name and show
  // what the check is now. A count alone cannot catch a silently wrong ten.
  console.log(`${color(content.name, "bold")} ← ${picked.map((h) => h.name).join(", ")} (${stanceArg})`);

  const assignment = next.plan.parties.find((p) => p.contentId === contentId);
  const projection = assignment ? projectAssignment(next, assignment) : null;
  const previous = before ? projectAssignment(state, before) : null;
  if (projection) {
    const weakest = [...projection.phases].sort((a, b) => a.ratio - b.ratio)[0];
    const was = previous
      ? [...previous.phases].sort((a, b) => a.ratio - b.ratio)[0]
      : undefined;
    const delta = was && weakest ? ` (was ${was.ratio.toFixed(2)})` : "";
    console.log(
      color(
        `projected ${weakest ? `${weakest.checkLabel} ${weakest.ratio.toFixed(2)}${delta}` : "-"} · best pull ${Math.round(projection.estimatedBestPull * 100)}% · form ${Math.round(projection.form * 100)}%`,
        "dim",
      ),
    );
  }
};

const cmdTraits = (): void => {
  table(
    ["trait", "kind", "classes", "effect"],
    TRAIT_IDS.map((id) => {
      const trait = TRAITS[id];
      return [trait.name, trait.kind, trait.classes ? trait.classes.join(", ") : "any", trait.text];
    }),
    ["l", "l", "l", "l"],
  );
};

const cmdRole = (): void => {
  const state = load();
  const token = args[1];
  const roleToken = args[2];
  if (!token || !roleToken) {
    console.error(color("Usage: role <hero> <role>   (e.g. role 3 vanguard, role Varis bulwark)", "red"));
    process.exit(1);
  }
  const hero = heroByToken(state, token);
  const role = ROLES.find((r) => r.id === roleToken || r.name.toLowerCase() === roleToken.toLowerCase());
  if (!role) {
    console.error(color(`Unknown role: ${roleToken}. Try: ${ROLES.map((r) => r.id).join(", ")}`, "red"));
    process.exit(1);
  }
  if (role.klass !== hero.klass) {
    console.error(
      color(
        `${role.name} is a ${CLASS_LABEL[role.klass]} role; ${hero.name} is a ${CLASS_LABEL[hero.klass]}. ` +
          `Pick: ${rolesForClass(hero.klass).map((r) => r.id).join(", ")}.`,
        "red",
      ),
    );
    process.exit(1);
  }
  const before = powerInRole(hero, hero.role);
  const checks = ["dps", "mitigation", "mechanics", "sustain"] as const;
  const beforeChecks = checks.map((c) => Math.round(checkPowerInRole(hero, hero.role, c)));
  const next = assignRole(state, hero.id, role.id);
  const after = next.roster.find((h) => h.id === hero.id) ?? hero;
  const fit = fitFor(after, after.role);
  save(next);
  console.log(
    `${color(after.name, "bold")} → ${role.name} (${fit.fit})  in-role power ${Math.round(before)} → ${Math.round(powerInRole(after, after.role))}`,
  );
  console.log(
    color(
      checks.map((c, i) => `${CHECK_LABEL[c]} ${beforeChecks[i]} → ${Math.round(checkPowerInRole(after, after.role, c))}`).join(" · "),
      "dim",
    ),
  );
};

const cmdClear = (): void => {
  const state = load();
  save(clearPlan(state));
  console.log(color("All parties cleared. Everyone not assigned tomorrow rests.", "green"));
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
    // The queue blocks the day. Check before resolving, or the player plays
    // through an unresolved card and effectively gets a free day.
    if (hasBlocking(state)) {
      const blocked = blockingAttention(state);
      console.log(color(`\nDay ${state.day} is waiting on you — run: attention`, "magenta"));
      for (const item of blocked.slice(0, 3)) console.log(`  ${item.title} — ${color(item.id, "dim")}`);
      if (blocked.length === 0 && state.pendingEvent) {
        console.log(`  an event is waiting — ${color(`event:${state.pendingEvent.cardId}:${state.pendingEvent.day}`, "dim")}`);
      }
      break;
    }
    // A plan the game invalidated (an injury, a rest, a release) is repaired,
    // not refused: refusing costs the player a rebuild from memory and blocks
    // the day for a state they did not create. Say what moved and go.
    const pruned = pruneUnavailable(state);
    if (pruned.notes.length > 0) {
      state = { ...state, plan: pruned.plan };
      for (const note of pruned.notes) console.log(color(`  adjusted: ${note}`, "yellow"));
      save(state);
    }
    const sanitized = sanitizePlan(state);
    if (sanitized.problems.length > 0) {
      state = { ...state, plan: sanitized.plan };
      for (const problem of sanitized.problems) {
        console.log(color(`  adjusted: party ${problem.index + 1}: ${problem.message}`, "yellow"));
      }
      save(state);
    }
    const pending = state.pendingLoot ?? [];
    if (pending.length > 0) {
      console.log(color(`${pending.length} drop${pending.length === 1 ? "" : "s"} will auto-assign if you advance — run loot to choose.`, "dim"));
    }
    const before = state.day;
    const next = advanceDay(state);
    printDigest(next, before);
    state = next;
    save(state);
    if (state.finished) break;
    if (hasBlocking(state)) {
      console.log(color("\nSomething needs you — run: attention", "magenta"));
      break;
    }
  }
  if (state.finished) printRunEnd(state);
  else console.log(color(`— ${runLabel(state)} —`, "dim"));
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
    `${color(`SCORE ${state.score}`, "bold")}  band ${color(state.band ?? "-", "magenta")}  ${state.worldFirstDay ? color("WORLD FIRST", "green") : ""}  rank ${color(`${playerRank(state)}/${state.rivals.length + 1}`, "bold")}`,
  );
  for (const line of state.scoreLines ?? []) {
    const sign = line.value >= 0 ? "+" : "";
    console.log(`  ${pad(line.label, 12)} ${pad(`${sign}${line.value}`, 8, "r")}  ${color(line.detail, "dim")}`);
  }
  console.log();
  table(
    ["#", "guild", "score", "raids", "world first"],
    standings(state).map((row, i) => [
      String(i + 1),
      row.isPlayer ? color(row.name, "cyan") : row.name,
      String(row.score),
      `${row.raids}/${RAIDS.length}`,
      row.worldFirstDay === null ? "-" : `day ${row.worldFirstDay}`,
    ]),
  );
  console.log();
};

const cmdReport = (): void => {
  const state = load();
  const log = state.lastEncounter;
  if (!log) {
    console.log(color("No encounter yet.", "yellow"));
    return;
  }
  console.log();
  console.log(
    `${color(log.contentName, "bold")} ${color(`— ${KIND_LABEL[log.contentKind]} · day ${log.day} · ${log.pulls.length} pull(s)`, "dim")}`,
  );
  console.log(
    log.cleared ? color(`CLEARED`, "green") : color(`WIPE — best ${Math.round(log.bestPull * 100)}%`, "red"),
  );
  const pay = log.payScale ?? 1;
  if (log.contentKind === "mission" && pay < 1) {
    console.log(color(`Contract   not posted — paid ${Math.round(pay * 100)}% of its gold and XP`, "yellow"));
  }
  if (log.loot && log.loot.length > 0) {
    console.log(
      color(
        `Drops      ${log.loot.map((l) => (l.item ? `${l.item} (${l.slot} ${l.ilvl})` : `${l.slot} ${l.ilvl}`)).join(", ")}`,
        "dim",
      ),
    );
  }
  // A clear shows the pull that killed the boss; a wipe shows the last failure.
  const last = focusPull(log);
  if (!last) return;
  console.log(
    color(
      `${log.cleared ? "killing" : "last"} pull ${last.index} of ${log.pulls.length}`,
      "dim",
    ),
  );
  table(
    ["phase", "check", "yours", "needs", "ratio", "result"],
    last.phases.map((p) => [
      p.name,
      p.checkLabel,
      String(p.value),
      String(p.requirement),
      p.ratio.toFixed(2),
      p.outcome === "fail"
        ? color("FAIL", "red")
        : p.outcome === "scrape"
          ? color("scrape", "yellow")
          : color("clear", "green"),
    ]),
    ["l", "l", "r", "r", "r", "l"],
  );
  for (const phase of last.phases) {
    const ability = phase.ability;
    if (!ability) continue;
    const prefix = ability.known ? "" : "New mechanic: ";
    if (ability.countered) {
      console.log(
        color(`${prefix}${ability.name} — countered by ${ability.counterHero ?? "the party"}`, "green"),
      );
      continue;
    }
    console.log(
      color(
        `${prefix}${ability.name} — uncountered (${phase.checkLabel} ×${ability.mult.toFixed(2)})`,
        "yellow",
      ),
    );
    const answer = state.roster.find((h) => isAvailable(h) && countersAbility(h.traits, ability.id));
    if (answer) {
      const gain = Math.round((1 / ability.mult - 1) * 100);
      console.log(color(`  ${answer.name} has the answer: +${gain}% ${phase.checkLabel}`, "cyan"));
    }
  }

  const traits = pullTraits(log);
  if (traits.length > 0) console.log(color(`traits: ${traits.join(", ")}`, "dim"));

  const levers = nextLevers(state, log);
  if (levers.length > 0) {
    console.log(color(`\nnext levers`, "bold"));
    for (const lever of levers) console.log(`  ${pad(lever.label, 18)}  ${color(lever.detail, "dim")}`);
    if (state.plan.parties.some((p) => p.contentId === log.contentId)) {
      const projection = projectAssignment(state, state.plan.parties.find((p) => p.contentId === log.contentId)!);
      if (projection) {
        const weakest = [...projection.phases].sort((a, b) => a.ratio - b.ratio)[0];
        console.log(
          color(
            `  tonight's plan projects ${weakest ? `${weakest.checkLabel} ${weakest.ratio.toFixed(2)}` : "-"} at form ${Math.round(projection.form * 100)}%`,
            "dim",
          ),
        );
      }
    }
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
  const next = resolveAttention(state, itemId, optionKey);
  if (next === state) {
    console.error(color(`Nothing matched ${itemId} → ${optionKey}. Run: attention`, "red"));
    process.exit(1);
  }
  save({ ...next, attention: deriveAttention(next) });
  console.log(color(`resolved ${itemId} → ${optionKey}`, "green"));
  // A resolution can move a hero in or out of a party. Show the check it
  // leaves behind, or the player is buying a roster change blind.
  printPlanProjection(next);
};

const cmdAi = (): void => {
  let state = load();
  const p = personalityById(flag("personality") ?? "steady");
  const days = Math.max(1, Number(flag("days") ?? 10));
  const verbose = !args.includes("--quiet");

  console.log(color(`${p.name} — ${p.blurb}`, "dim"));
  for (let i = 0; i < days && !state.finished; i += 1) {
    const turn = playTurn(state, p);
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
  const clearTotals = new Map<string, number>();

  console.log();
  table(
    ["personality", "avg score", "median", "raids", "dungeons", "wins", "rank"],
    personalities.map((p) => {
      const scores: number[] = [];
      let raids = 0;
      let dungeons = 0;
      let wins = 0;
      let rank = 0;
      for (let i = 0; i < runs; i += 1) {
        const final = runWorld(newGame(baseSeed + i * 17, "Sim"), p, 400);
        scores.push(final.score ?? 0);
        raids += final.progress.filter((x) => contentById(x.contentId)?.kind === "raid" && x.clears > 0).length;
        dungeons += final.progress.filter((x) => contentById(x.contentId)?.kind === "dungeon" && x.clears > 0).length;
        if (final.worldFirstDay !== null) wins += 1;
        rank += playerRank(final);
        for (const progress of final.progress) {
          if (progress.clears > 0) {
            clearTotals.set(progress.contentId, (clearTotals.get(progress.contentId) ?? 0) + progress.clears);
          }
        }
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
        (rank / runs).toFixed(2),
      ];
    }),
    ["l", "r", "r", "r", "r", "r", "r"],
  );
  if (args.includes("--clears")) {
    const totalRuns = runs * personalities.length;
    table(
      ["content", "kind", "clears/run"],
      CONTENT.filter((c) => (clearTotals.get(c.id) ?? 0) > 0).map((c) => [
        c.name,
        KIND_LABEL[c.kind],
        ((clearTotals.get(c.id) ?? 0) / totalRuns).toFixed(2),
      ]),
    );
  }
  console.log();
};

const cmdLoot = (): void => {
  const state = load();
  const pending = state.pendingLoot ?? [];
  const sub = args[1];

  if (!sub) {
    if (pending.length === 0) {
      console.log(color("No drops waiting.", "dim"));
      return;
    }
    console.log(color("\nDrops waiting — loot <n> <hero>, or loot auto", "bold"));
    table(
      ["#", "item", "slot", "ilvl", "from", "suggested", "options"],
      pending.map((drop, i) => {
        const suggested = state.roster.find((h) => h.id === suggestLootTarget(state, drop));
        const options = lootTargets(state, drop, 2)
          .map((t) => `${t.hero.name.split(" ")[0]} +${t.gain}`)
          .join(", ");
        return [
          String(i + 1),
          drop.item ?? "—",
          drop.slot,
          String(drop.ilvl),
          drop.contentName,
          suggested ? `${suggested.name.split(" ")[0]} +${lootUpgrade(suggested, drop)}` : "—",
          options,
        ];
      }),
    );
    console.log(color("loot auto gives every drop to the best current upgrade.", "dim"));
    return;
  }

  if (sub === "auto") {
    const before = pending.length;
    const next = autoAssignLoot(state);
    save({ ...next, attention: deriveAttention(next) });
    console.log(color(`assigned ${before - (next.pendingLoot?.length ?? 0)} drop(s)`, "green"));
    return;
  }

  const index = Number(sub);
  const drop = pending[index - 1];
  const token = args[2];
  if (!drop || !token) {
    console.error(color("Usage: loot <n> <hero>, or loot auto", "red"));
    process.exit(1);
  }
  const hero = heroByToken(state, token);
  const next = assignLoot(state, drop.id, hero.id);
  if (next === state) {
    console.error(color("That drop is already gone. Run loot.", "red"));
    process.exit(1);
  }
  save({ ...next, attention: deriveAttention(next) });
  console.log(color(`${hero.name} takes ${drop.item ?? `${drop.slot} ${drop.ilvl}`} from ${drop.contentName}`, "green"));
};

const cmdRaidTeam = (): void => {
  const state = load();
  const raid = nextRaidContent(state);
  const sub = args[1];

  if (!sub) {
    const team = raidTeamHeroes(state);
    console.log(
      color(
        `\nRaid team — ${team.length} heroes${raid ? ` · next: ${raid.name} (avg lvl ${raid.minLevel}+, iLvl ${raid.recommendedIlvl})` : " · no raid left"}`,
        "bold",
      ),
    );
    if (team.length === 0) {
      console.log(color("No team set. Run raidteam auto.", "yellow"));
      return;
    }
    table(
      ["#", "hero", "role", "lvl", "iLvl"],
      team.map((h, i) => [String(i + 1), h.name, h.role, String(h.level), String(itemLevel(h.gear))]),
    );
    console.log(color("The planner prefers this ten, fills injuries from the bench, and loot defaults here.", "dim"));
    return;
  }

  if (sub === "auto") {
    const next = autoRaidTeam(state);
    save(next);
    console.log(color(`raid team set to the best ten: ${raidTeamHeroes(next).map((h) => h.name).join(", ")}`, "green"));
    return;
  }

  const tokens = args.slice(1).flatMap((t) => t.split(",")).filter(Boolean);
  const heroes = tokens.map((t) => heroByToken(state, t));
  if (heroes.length === 0) {
    console.error(color("Usage: raidteam auto | raidteam <hero,hero,...>", "red"));
    process.exit(1);
  }
  if (heroes.length > 10) {
    console.error(color(`A raid team is at most ten heroes; got ${heroes.length}.`, "red"));
    process.exit(1);
  }
  if (new Set(heroes.map((h) => h.id)).size !== heroes.length) {
    console.error(color("A hero cannot hold two raid slots.", "red"));
    process.exit(1);
  }
  const next: GameState = { ...state, raidTeam: heroes.map((h) => h.id) };
  save(next);
  console.log(color(`raid team: ${heroes.map((h) => h.name).join(", ")}`, "green"));
};

const cmdHelp = (): void => {
  console.log(`
${color("world-first", "bold")} — progression harness

  ${color("new", "cyan")} [--seed N]
  ${color("today", "cyan")}                       one screen: what needs you, what is planned
  ${color("status", "cyan")}                      guild, parties, rivals
  ${color("role", "cyan")} <hero> <role>             reassign a hero (fit costs output)
  ${color("traits", "cyan")}                      the 20-trait pool and what each does
  ${color("build", "cyan")} [facility]             facilities and upgrades
  ${color("roster", "cyan")}                      levels, xp, gear
  ${color("content", "cyan")}                     what is open: rewards, projection, status
  ${color("inspect", "cyan")} <id>                phases, bestiary, drops and chances
  ${color("tavern", "cyan")} · ${color("hire", "cyan")} <n>
  ${color("party", "cyan")} --content <id> --heroes 1,2,3 [--stance push]
  ${color("loot", "cyan")} [<n> <hero>|auto]         assign waiting drops
  ${color("raidteam", "cyan")} [auto|heroes]          the stable raid ten
  ${color("clear", "cyan")}                       unassign everyone (they rest)
  ${color("auto", "cyan")}                        let the AI plan today
  ${color("advance", "cyan")} [--days N]           stops when something needs you
  ${color("report", "cyan")}                      last encounter + levers
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
  case "inspect": cmdInspect(); break;
  case "tavern": cmdTavern(); break;
  case "hire": cmdHire(); break;
  case "party": cmdParty(); break;
  case "traits": cmdTraits(); break;
  case "role": cmdRole(); break;
  case "clear": cmdClear(); break;
  case "auto": cmdAuto(); break;
  case "advance": cmdAdvance(); break;
  case "report": cmdReport(); break;
  case "attention": cmdAttention(); break;
  case "loot": cmdLoot(); break;
  case "raidteam": cmdRaidTeam(); break;
  case "resolve": cmdResolve(); break;
  case "ai": cmdAi(); break;
  case "sim": cmdSim(); break;
  default: cmdHelp(); break;
}
