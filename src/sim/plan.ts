import type { Assignment, ContentDef, GameState, Hero, Plan, Stance } from "./types";
import { CONTENT, contentById } from "./content/content";
import { MAX_PARTIES, ROSTER_CAP } from "./content/tuning";
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

/** Rank heroes for a content by their contribution to its checks. */
export const rankFor = (heroes: readonly Hero[], content: ContentDef): Hero[] => {
  const checks = content.phases.map((p) => p.check);
  const score = (h: Hero): number =>
    checks.length === 0
      ? heroPower(h)
      : checks.reduce((acc, c) => acc + checkContribution(h, c, 1), 0) / checks.length;
  return [...heroes].sort((a, b) => score(b) - score(a));
};

/** Best legal party for a content from the available pool. */
export const bestPartyFor = (
  state: GameState,
  content: ContentDef,
  available: readonly Hero[],
): Hero[] => {
  const eligible = available.filter((h) => h.level >= content.minLevel);
  const ranked = rankFor(eligible, content);
  return ranked.slice(0, content.maxHeroes);
};

export const emptyPlan = (): Plan => ({ parties: [] });

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

export const assignedIds = (plan: Plan): Set<string> => {
  const set = new Set<string>();
  for (const party of plan.parties) for (const id of party.heroes) set.add(id);
  return set;
};

export const freeHeroes = (state: GameState): Hero[] => {
  const assigned = assignedIds(state.plan);
  return state.roster.filter((h) => !assigned.has(h.id));
};

export const canHire = (state: GameState): boolean => state.roster.length < ROSTER_CAP;

export type PlanProblem = { index: number; message: string };

export const validatePlan = (state: GameState): PlanProblem[] => {
  const problems: PlanProblem[] = [];
  const seen = new Set<string>();

  state.plan.parties.forEach((party, i) => {
    const content = contentById(party.contentId);
    if (!content) {
      problems.push({ index: i, message: `unknown content ${party.contentId}` });
      return;
    }
    const heroes = partyOf(state, party);
    if (!sizeOk(content, heroes)) {
      problems.push({
        index: i,
        message: `${content.name} needs ${content.minHeroes}-${content.maxHeroes} heroes (has ${heroes.length})`,
      });
    }
    if (!levelOk(content, heroes)) {
      const lowest = heroes.reduce((min, h) => Math.min(min, h.level), 99);
      problems.push({ index: i, message: `${content.name} needs level ${content.minLevel}+ (lowest is ${lowest})` });
    }
    const unavailable = heroes.filter((h) => !isAvailable(h));
    if (unavailable.length > 0) {
      problems.push({ index: i, message: `unavailable: ${unavailable.map((h) => h.name).join(", ")}` });
    }
    for (const id of party.heroes) {
      if (seen.has(id)) problems.push({ index: i, message: `hero ${id} is in two parties` });
      seen.add(id);
    }
  });

  return problems;
};

export const stanceFor = (aggression: number): Stance =>
  aggression > 0.66 ? "push" : aggression < 0.33 ? "cautious" : "steady";
