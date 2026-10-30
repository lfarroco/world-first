import { clamp } from "./prelude";
import type { Assignment, AttentionItem, Candidate, GameState, Hero, Plan } from "./types";
import { CONTENT } from "./content/content";
import { CONTRACT, ECONOMY, ROSTER_CAP, RUN_DAYS, TAVERN } from "./content/tuning";
import { bestLevel, makeCandidate, startingRoster } from "./content/heroes";
import { resolveDay } from "./day";
import { blockingAttention, deriveAttention, event } from "./events";
import { heroPower } from "./hero";
import { partyOf } from "./plan";
import { startingRivals } from "./rivals";
import { computeScore } from "./score";

export const newGame = (seed: number, guildName = "Ironbound Order"): GameState => {
  const roster = startingRoster(seed);
  const plan: Plan = {
    parties: [{ contentId: "emberwood", heroes: roster.map((h) => h.id), stance: "steady" }],
  };

  return {
    seed,
    guildName,
    day: 1,
    gold: ECONOMY.startGold,
    renown: 0,
    roster,
    plan,
    progress: CONTENT.map((c) => ({
      contentId: c.id,
      clears: 0,
      clearedOnDay: null,
      attempts: 0,
      bestPull: 0,
    })),
    rivals: startingRivals(seed),
    tavern: Array.from({ length: TAVERN.size }, (_, i) =>
      makeCandidate(seed, 1, i, bestLevel(roster)),
    ),
    attention: [],
    events: [
      event(1, "run", "info", `${guildName} is founded: three adventurers, one wood, and 84 days.`),
    ],
    arrearsDays: 0,
    worldFirstDay: null,
    finished: false,
    score: null,
    scoreLines: null,
    band: null,
    lastEncounter: null,
  };
};

export const assignParty = (state: GameState, assignment: Assignment): GameState => {
  const parties = [...state.plan.parties];
  const existing = parties.findIndex((p) => p.contentId === assignment.contentId);
  if (existing >= 0) parties[existing] = assignment;
  else if (parties.length < 3) parties.push(assignment);
  else parties[parties.length - 1] = assignment;
  return { ...state, plan: { parties } };
};

export const clearPlan = (state: GameState): GameState => ({ ...state, plan: { parties: [] } });

export const hireCandidate = (state: GameState, candidate: Candidate): GameState => {
  if (state.roster.length >= ROSTER_CAP) return state;
  if (state.gold < candidate.fee) return state;
  const hero: Hero = {
    ...candidate.hero,
    id: `h${state.day}-${state.roster.length}-${candidate.hero.id}`,
    contract: { ...candidate.hero.contract, status: "rotation" },
  };
  return {
    ...state,
    gold: state.gold - candidate.fee,
    roster: [...state.roster, hero],
    tavern: state.tavern.filter((c) => c !== candidate),
    events: [
      ...state.events,
      event(state.day, "tavern", "good", `${hero.name} (lvl ${hero.level}) joins for ${candidate.fee}g.`, hero.id),
    ],
  };
};

export const releaseHero = (state: GameState, heroId: string): GameState => {
  const hero = state.roster.find((h) => h.id === heroId);
  if (!hero) return state;
  return {
    ...state,
    roster: state.roster.filter((h) => h.id !== heroId),
    plan: {
      parties: state.plan.parties.map((p) => ({
        ...p,
        heroes: p.heroes.filter((id) => id !== heroId),
      })),
    },
    events: [...state.events, event(state.day, "economy", "info", `${hero.name} was released.`, heroId)],
  };
};

export const resolveAttention = (
  state: GameState,
  itemId: string,
  optionKey: string,
): GameState => {
  const item = state.attention.find((i) => i.id === itemId);
  if (!item) return state;
  const option = item.options.find((o) => o.key === optionKey);
  if (!option) return state;

  let next: GameState = state;
  const effect = option.effect;

  switch (effect.kind) {
    case "promise":
      next = {
        ...state,
        roster: state.roster.map((h) =>
          h.id === effect.heroId
            ? {
                ...h,
                morale: clamp(h.morale + 10, 1, 100),
                contract: { ...h.contract, status: effect.status },
              }
            : h,
        ),
      };
      break;
    case "rotate": {
      const parties = [...state.plan.parties];
      const target = parties.find((p) => p.heroes.length < 10);
      next = target
        ? {
            ...state,
            plan: {
              parties: parties.map((p) =>
                p === target ? { ...p, heroes: [...p.heroes, effect.heroId] } : p,
              ),
            },
            roster: state.roster.map((h) =>
              h.id === effect.heroId ? { ...h, morale: clamp(h.morale + 5, 1, 100) } : h,
            ),
          }
        : state;
      break;
    }
    case "renew":
      next = {
        ...state,
        roster: state.roster.map((h) =>
          h.id === effect.heroId
            ? {
                ...h,
                morale: clamp(h.morale + 8, 1, 100),
                contract: {
                  ...h.contract,
                  wage: Math.round(h.contract.wage * 1.2),
                  daysLeft: CONTRACT.daysMax,
                },
              }
            : h,
        ),
      };
      break;
    case "release":
      next = releaseHero(state, effect.heroId);
      break;
    case "ignore":
      next = {
        ...state,
        roster: state.roster.map((h) =>
          h.id === item.heroId ? { ...h, morale: clamp(h.morale - 12, 1, 100) } : h,
        ),
      };
      break;
    case "acknowledge":
      break;
  }

  return { ...next, attention: next.attention.filter((i) => i.id !== itemId) };
};

export type AdvanceResult = { state: GameState; stopped: string | null };

export const advanceDays = (state: GameState, days = 1): AdvanceResult => {
  let current = state;
  for (let i = 0; i < days; i += 1) {
    if (current.finished) return { state: current, stopped: "the run is over" };
    const blocking = blockingAttention(current);
    if (blocking.length > 0) {
      const first = blocking[0];
      return {
        state: current,
        stopped: first
          ? `${blocking.length} item(s) need you — starting with "${first.title}"`
          : "attention required",
      };
    }
    current = resolveDay(current);
  }
  return { state: current, stopped: null };
};

export const refreshAttention = (state: GameState): GameState => ({
  ...state,
  attention: deriveAttention(state),
});

export const partyPower = (state: GameState, partyIndex: number): number => {
  const party = state.plan.parties[partyIndex];
  if (!party) return 0;
  return partyOf(state, party).reduce((acc, h) => acc + heroPower(h), 0);
};

export const runDays = RUN_DAYS;
export const computeFinalScore = computeScore;

export type { AttentionItem };
