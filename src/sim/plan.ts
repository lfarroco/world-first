import type { Assignment, ContentDef, GameState, Hero, Plan, Stance } from "./types";
import { CONTENT, contentById } from "./content/content";
import { MAX_PARTIES, STANCE } from "./content/tuning";
import { checkContribution, heroPower, isAvailable } from "./hero";

export const partyOf = (state: GameState, assignment: Assignment): Hero[] =>
  assignment.heroes
    .map((id) => state.roster.find((h) => h.id === id))
    .filter((h): h is Hero => h !== undefined);

export const clearedIds = (state: GameState): Set<string> =>
  new Set(state.progress.filter((p) => p.clearedOnDay !== null || p.clears > 0).map((p) => p.contentId));

/** Content whose prerequisites are satisfied. */
export const unlockedContent = (state: GameState): ContentDef[] => {
  const cleared = clearedIds(state);
  return CONTENT.filter((c) => c.requires.every((r) => cleared.has(r)));
};

/** Gate on the party's average level: one under-levelled body cannot block a raid. */
export const levelOk = (content: ContentDef, heroes: readonly Hero[]): boolean =>
  heroes.length > 0 &&
  heroes.reduce((acc, h) => acc + h.level, 0) / heroes.length >= content.minLevel;

export const sizeOk = (content: ContentDef, heroes: readonly Hero[]): boolean =>
  heroes.length >= content.minHeroes && heroes.length <= content.maxHeroes;

export type PartySizeProblem = {
  index: number;
  content: ContentDef;
  heroes: number;
  /** `under` is below `minHeroes`; `over` is above `maxHeroes`. */
  kind: "under" | "over";
  /** Heroes to add (under) or remove (over) to make the party legal. */
  delta: number;
};

/**
 * Parties outside the area's hero range. The plan may hold one while the player
 * fixes it — the War Room lets a hero leave a three-hero area before the
 * replacement arrives, and lets a fourth hero in — but the day cannot advance
 * and `sanitizePlan` will not deploy it.
 */
export const partySizeProblems = (state: GameState): PartySizeProblem[] => {
  const problems: PartySizeProblem[] = [];
  state.plan.parties.forEach((party, index) => {
    const content = contentById(party.contentId);
    if (!content) return;
    const heroes = party.heroes.length;
    if (heroes < content.minHeroes) {
      problems.push({
        index,
        content,
        heroes,
        kind: "under",
        delta: content.minHeroes - heroes,
      });
    } else if (heroes > content.maxHeroes) {
      problems.push({
        index,
        content,
        heroes,
        kind: "over",
        delta: heroes - content.maxHeroes,
      });
    }
  });
  return problems;
};

/** One sentence for the advance gate, the top bar and the projection footer. */
export const sizeProblemLine = (problem: PartySizeProblem): string =>
  problem.kind === "over"
    ? `${problem.content.name} is above the hero limit (${problem.heroes}/${problem.content.maxHeroes}) — remove ${problem.delta} before the day can advance.`
    : `${problem.content.name} is below the hero minimum (${problem.heroes}/${problem.content.minHeroes}) — add ${problem.delta} before the day can advance.`;

/**
 * Rank heroes for a content by their contribution to its checks.
 *
 * The pool stands in for the party in the trait context: that is enough for
 * bonds ("+5% per other rogue") to count, while phase conditions are ignored
 * because no phase has been chosen yet. Selection is a heuristic; the
 * projection that decides an attempt uses the real party.
 */
export const rankFor = (heroes: readonly Hero[], content: ContentDef): Hero[] => {
  const checks = content.phases.map((p) => p.check);
  const topId = [...heroes].sort((a, b) => heroPower(b) - heroPower(a))[0]?.id ?? "";
  const score = (h: Hero): number =>
    checks.length === 0
      ? heroPower(h)
      : checks.reduce(
          (acc, c) =>
            acc + checkContribution(h, c, 1, { hero: h, party: heroes, content, afterWipe: false, topId }),
          0,
        ) / checks.length;
  return [...heroes].sort((a, b) => score(b) - score(a));
};

/**
 * Best party the roster can field for a content, by contribution.
 *
 * Heroes at the level gate are preferred. When there are not enough eligible
 * heroes to reach `minHeroes`, the party's average decides: one under-levelled
 * body can fill the gap if the party carries it. That is the documented fix
 * (an under-levelled hero must not block a raid), and `validatePlan` enforces
 * the same rule.
 *
 * The result can still miss the average when the best contributors are the
 * lowest-level heroes. Callers must check `levelOk`; `levelPartyFor` is the
 * highest-level legal party for that case.
 */
export const bestPartyFor = (
  state: GameState,
  content: ContentDef,
  available: readonly Hero[],
): Hero[] => {
  const eligible = available.filter((h) => h.level >= content.minLevel);
  const pool = eligible.length >= content.minHeroes ? eligible : available;
  const ranked = rankFor(pool, content);
  let size = Math.min(content.maxHeroes, ranked.length);
  while (size > content.minHeroes && !levelOk(content, ranked.slice(0, size))) size -= 1;
  return ranked.slice(0, size);
};

/**
 * The highest-level party that satisfies the average gate. This is the floor
 * the availability check promises: if the roster can field anything legal, it
 * can field this. Used where a projection must show a party the player could
 * actually send, not the planner's contribution ranking.
 */
export const levelPartyFor = (content: ContentDef, available: readonly Hero[]): Hero[] => {
  const byLevel = [...available].sort((a, b) => b.level - a.level).slice(0, content.maxHeroes);
  let size = byLevel.length;
  while (size > content.minHeroes && !levelOk(content, byLevel.slice(0, size))) size -= 1;
  return byLevel.slice(0, size);
};

/**
 * The party the UI shows as "tonight". `bestPartyFor` ranks by contribution and
 * can miss the average gate; this falls back to the highest-level legal party so
 * the screen never projects a party the game would refuse. Null means the guild
 * cannot field the content at all.
 */
export const fieldableParty = (
  state: GameState,
  content: ContentDef,
  available: readonly Hero[] = state.roster.filter(isAvailable),
): Hero[] | null => {
  let party = bestPartyFor(state, content, available);
  if (party.length < content.minHeroes || !levelOk(content, party)) {
    party = levelPartyFor(content, available);
  }
  if (party.length < content.minHeroes || !levelOk(content, party)) return null;
  return party;
};

/**
 * Cheap version of `bestPartyFor` for the availability check: can the roster
 * field any legal party? Ranking every hero for every content is what the
 * planner calls every day, and the roster sort is a different question.
 */
export const canField = (content: ContentDef, roster: readonly Hero[]): boolean => {
  if (roster.length < content.minHeroes) return false;
  if (roster.filter((h) => h.level >= content.minLevel).length >= content.minHeroes) return true;
  const top = [...roster].sort((a, b) => b.level - a.level).slice(0, content.maxHeroes);
  if (top.length < content.minHeroes) return false;
  return top.reduce((acc, h) => acc + h.level, 0) / top.length >= content.minLevel;
};

export const emptyPlan = (): Plan => ({ parties: [] });

/**
 * What the guild can do with what it has right now. Level and roster size are
 * gates too, not footnotes: content the roster cannot field is hidden from the
 * list, and opening it emits one `unlock` event (see `announceUnlocks`).
 */
export type ContentStatus = "new" | "open" | "cleared" | "locked" | "level" | "roster";

export type ContentAvailability = {
  content: ContentDef;
  status: ContentStatus;
  /** Why the content is not open. Empty when it is. */
  reason: string;
  /**
   * The numbers behind a level gate. The average here is the same one
   * `canField` tested, so the screen that shows the gap cannot disagree with
   * the rule that blocks the party.
   */
  gate?: { average: number; need: number; counted: number };
  /** The numbers behind a roster gate. */
  roster?: { have: number; need: number };
};

const isOpen = (status: ContentStatus): boolean =>
  status === "new" || status === "open" || status === "cleared";

type RosterGate =
  | { status: "ok" }
  | { status: "roster"; reason: string; roster: { have: number; need: number } }
  | { status: "level"; reason: string; gate: { average: number; need: number; counted: number } };

/**
 * The two gates the roster can answer, independent of prerequisites. Asking
 * them separately is what lets `nextDoor` name the wall before the chain that
 * leads to it is cleared (L108).
 */
const rosterGate = (state: GameState, content: ContentDef): RosterGate => {
  if (state.roster.length < content.minHeroes) {
    return {
      status: "roster",
      reason: `Needs ${content.minHeroes} heroes; the roster has ${state.roster.length}.`,
      roster: { have: state.roster.length, need: content.minHeroes },
    };
  }
  if (!canField(content, state.roster)) {
    const top = [...state.roster].sort((a, b) => b.level - a.level).slice(0, content.maxHeroes);
    const average = top.reduce((acc, h) => acc + h.level, 0) / Math.max(1, top.length);
    return {
      status: "level",
      reason: `Party average level ${average.toFixed(1)}; needs ${content.minLevel}.`,
      gate: { average, need: content.minLevel, counted: top.length },
    };
  }
  return { status: "ok" };
};

export const contentAvailability = (
  state: GameState,
  content: ContentDef,
  cleared: ReadonlySet<string> = clearedIds(state),
): ContentAvailability => {
  const missing = content.requires.filter((id) => !cleared.has(id));
  if (missing.length > 0) {
    const names = missing.map((id) => contentById(id)?.name ?? id).join(" and ");
    return { content, status: "locked", reason: `Clear ${names} first.` };
  }

  const gate = rosterGate(state, content);
  if (gate.status === "roster") {
    return { content, status: "roster", reason: gate.reason, roster: gate.roster };
  }
  if (gate.status === "level") {
    return { content, status: "level", reason: gate.reason, gate: gate.gate };
  }

  const progress = state.progress.find((p) => p.contentId === content.id);
  const clears = progress?.clears ?? 0;
  const status: ContentStatus = clears > 0 ? "cleared" : (progress?.attempts ?? 0) > 0 ? "open" : "new";
  return { content, status, reason: "" };
};

export const contentStates = (state: GameState): ContentAvailability[] => {
  const cleared = clearedIds(state);
  return CONTENT.map((content) => contentAvailability(state, content, cleared));
};

/** Only what the roster can field. Locked content is not listed. */
export const availableContent = (state: GameState): ContentDef[] =>
  contentStates(state)
    .filter((a) => isOpen(a.status))
    .map((a) => a.content);

export const unavailableContent = (state: GameState): ContentAvailability[] =>
  contentStates(state).filter((a) => !isOpen(a.status));

/**
 * The one area standing between the guild and the rest of the ladder: the first
 * content in ladder order that the roster cannot field, prerequisites ignored.
 * Null when the roster can field every area.
 *
 * The target list still hides what the guild cannot field. This is the single
 * door the screens may name, with the numbers behind its gate, so a guild that
 * stalls can see what it is stalling against (see L108 in docs/learnings.md).
 */
export const nextDoor = (state: GameState): ContentAvailability | null => {
  for (const content of CONTENT) {
    const gate = rosterGate(state, content);
    if (gate.status === "roster") {
      return { content, status: "roster", reason: gate.reason, roster: gate.roster };
    }
    if (gate.status === "level") {
      return { content, status: "level", reason: gate.reason, gate: gate.gate };
    }
  }
  return null;
};

export const setParty = (state: GameState, index: number, assignment: Assignment | null): GameState => {
  const parties = [...state.plan.parties];
  if (assignment === null) parties.splice(index, 1);
  else parties[index] = assignment;
  return { ...state, plan: { parties: parties.filter(Boolean).slice(0, MAX_PARTIES) } };
};

export const addParty = (state: GameState, assignment: Assignment): GameState => {
  if (state.plan.parties.length >= MAX_PARTIES) {
    const parties = [...state.plan.parties];
    parties[parties.length - 1] = assignment;
    return { ...state, plan: { parties } };
  }
  return { ...state, plan: { parties: [...state.plan.parties, assignment] } };
};

/**
 * Drop heroes who cannot fight from tomorrow's plan. This is not validation:
 * it is what the plan should have been the moment an injury, a rest or a
 * release landed. Returns notes so the caller can say who moved and why.
 */
export const pruneUnavailable = (
  state: GameState,
): { plan: Plan; notes: string[] } => {
  const notes: string[] = [];
  const parties: Assignment[] = [];

  for (const party of state.plan.parties) {
    const content = contentById(party.contentId);
    if (!content) {
      parties.push(party);
      continue;
    }
    const kept: string[] = [];
    for (const id of party.heroes) {
      const hero = state.roster.find((h) => h.id === id);
      if (!hero) {
        notes.push(`a departed hero was dropped from ${content.name}`);
        continue;
      }
      if (!isAvailable(hero)) {
        notes.push(`${hero.name} is unavailable — dropped from ${content.name}`);
        continue;
      }
      kept.push(id);
    }
    if (kept.length >= content.minHeroes) {
      parties.push(kept.length === party.heroes.length ? party : { ...party, heroes: kept });
    } else if (kept.length > 0) {
      notes.push(`${content.name} dropped — ${kept.length} available, needs ${content.minHeroes}`);
    }
  }

  return { plan: { parties }, notes };
};

export const assignedIds = (plan: Plan): Set<string> => {
  const set = new Set<string>();
  for (const party of plan.parties) for (const id of party.heroes) set.add(id);
  return set;
};

export const freeHeroes = (state: GameState): Hero[] => {
  const assigned = assignedIds(state.plan);
  return state.roster.filter((h) => !assigned.has(h.id));
};

export const STANCE_IDS = ["cautious", "steady", "push"] as const;

export const isStance = (value: string): value is Stance =>
  (STANCE_IDS as readonly string[]).includes(value);

export type PlanProblem = { index: number; message: string };

/**
 * Everything a party needs to be legal. Used by the CLI to refuse bad input and
 * by `resolveDay` to ignore a malformed save instead of crashing or paying out.
 */
export const validatePlan = (state: GameState): PlanProblem[] => {
  const problems: PlanProblem[] = [];
  const seen = new Set<string>();
  const usedContent = new Set<string>();
  const unlocked = new Set(unlockedContent(state).map((c) => c.id));

  state.plan.parties.forEach((party, i) => {
    const content = contentById(party.contentId);
    if (!content) {
      problems.push({ index: i, message: `unknown content ${party.contentId}` });
      return;
    }
    if (!unlocked.has(content.id)) {
      problems.push({ index: i, message: `${content.name} is locked` });
    }
    if (usedContent.has(content.id)) {
      problems.push({ index: i, message: `${content.name} is assigned to two parties` });
    }
    usedContent.add(content.id);
    if (!isStance(party.stance)) {
      problems.push({ index: i, message: `unknown stance ${String(party.stance)}` });
    }

    const heroes: Hero[] = [];
    const local = new Set<string>();
    for (const id of party.heroes) {
      const hero = state.roster.find((h) => h.id === id);
      if (!hero) {
        problems.push({ index: i, message: `unknown hero ${id}` });
        continue;
      }
      if (local.has(id)) {
        problems.push({ index: i, message: `${hero.name} is listed twice in the same party` });
        continue;
      }
      local.add(id);
      if (seen.has(id)) {
        problems.push({ index: i, message: `${hero.name} is in two parties` });
        continue;
      }
      seen.add(id);
      heroes.push(hero);
    }

    if (!sizeOk(content, heroes)) {
      problems.push({
        index: i,
        message: `${content.name} needs ${content.minHeroes}-${content.maxHeroes} heroes (has ${heroes.length})`,
      });
    }
    if (heroes.length > 0 && !levelOk(content, heroes)) {
      const average = heroes.reduce((acc, h) => acc + h.level, 0) / heroes.length;
      problems.push({
        index: i,
        message: `${content.name} needs average level ${content.minLevel}+ (party is ${average.toFixed(1)})`,
      });
    }
    const unavailable = heroes.filter((h) => !isAvailable(h));
    if (unavailable.length > 0) {
      problems.push({ index: i, message: `unavailable: ${unavailable.map((h) => h.name).join(", ")}` });
    }
  });

  return problems;
};

/**
 * The same rules, but it returns a plan the simulation can run: invalid parties
 * are dropped and the reasons are reported. `resolveDay` calls this so a stale
 * save or a hand-edited file can never deploy a 10x duplicated hero.
 */
export const sanitizePlan = (state: GameState): { plan: Plan; problems: PlanProblem[] } => {
  const problems: PlanProblem[] = [];
  const seen = new Set<string>();
  const usedContent = new Set<string>();
  const unlocked = new Set(unlockedContent(state).map((c) => c.id));
  const parties: Assignment[] = [];

  state.plan.parties.forEach((party, i) => {
    const reject = (message: string): void => {
      problems.push({ index: i, message });
    };
    const content = contentById(party.contentId);
    if (!content) return reject(`unknown content ${party.contentId}`);
    if (!unlocked.has(content.id)) return reject(`${content.name} is locked`);
    if (usedContent.has(content.id)) return reject(`${content.name} is assigned to two parties`);
    if (!isStance(party.stance)) return reject(`unknown stance ${String(party.stance)}`);
    if (new Set(party.heroes).size !== party.heroes.length) return reject(`${content.name}: one hero is listed twice`);

    const heroes = party.heroes
      .map((id) => state.roster.find((h) => h.id === id))
      .filter((h): h is Hero => h !== undefined);
    if (heroes.length !== party.heroes.length) return reject(`${content.name}: unknown hero`);
    if (heroes.some((h) => seen.has(h.id))) return reject(`${content.name}: a hero is already in another party`);
    if (!sizeOk(content, heroes)) {
      return reject(`${content.name} needs ${content.minHeroes}-${content.maxHeroes} heroes (has ${heroes.length})`);
    }
    if (!levelOk(content, heroes)) {
      return reject(`${content.name} needs average level ${content.minLevel}+`);
    }

    for (const hero of heroes) seen.add(hero.id);
    usedContent.add(content.id);
    parties.push({ ...party, heroes: heroes.map((h) => h.id) });
  });

  return { plan: { parties }, problems };
};

export const stanceFor = (aggression: number): Stance =>
  aggression > 0.66 ? "push" : aggression < 0.33 ? "cautious" : "steady";
