import { clamp } from "./prelude";
import type { Assignment, AttentionItem, Candidate, GameState, Hero, RoleId } from "./types";
import { contentById } from "./content/content";
import { CONTRACT, MAX_PARTIES, PROMISE, ROSTER_CAP, RUN_DAYS } from "./content/tuning";
import { renewalWage } from "./economy";
import { attentionKey, announceUnlocks, deriveAttention, event, push } from "./events";
import { heroPower } from "./hero";
import { partyOf, pruneUnavailable } from "./plan";
import { startingRivals } from "./rivals";
import { rosterCapFor, wageBudgetFor } from "./facilities";
import { resolveEvent } from "./world-events";
import { autoAssignLoot } from "./loot";
import { computeScore } from "./score";
import { ROLES } from "./content/roles";
import { foundGuild } from "./founding";

export const newGame = (seed: number, guildName = "Ironbound Order"): GameState => {
  const state = foundGuild(seed, guildName);
  // The rivals are full guilds of their own, created by `startingRivals`.
  state.rivals = startingRivals(seed);
  return state;
};

export const assignParty = (state: GameState, assignment: Assignment): GameState => {
  const ids = new Set(assignment.heroes);
  const parties: Assignment[] = [];
  let placed = false;

  for (const party of state.plan.parties) {
    if (party.contentId === assignment.contentId) {
      parties.push({ ...assignment });
      placed = true;
      continue;
    }
    const heroes = party.heroes.filter((id) => !ids.has(id));
    // A party that lost a body and can no longer run is dropped, not left
    // in the plan to fail later.
    const content = contentById(party.contentId);
    if (heroes.length >= (content?.minHeroes ?? 1)) parties.push({ ...party, heroes });
  }

  if (!placed) {
    if (parties.length < MAX_PARTIES) parties.push({ ...assignment });
    else parties[parties.length - 1] = { ...assignment };
  }

  return { ...state, plan: { parties } };
};

export const clearPlan = (state: GameState): GameState => ({ ...state, plan: { parties: [] } });

export const hireCandidate = (state: GameState, candidate: Candidate): GameState => {
  if (state.roster.length >= rosterCapFor(state.facilities)) return state;
  // Arrears freeze recruitment: the guild cannot promise wages it cannot pay.
  if (state.gold < 0) return state;
  if (state.gold < candidate.fee) return state;
  const hero: Hero = {
    ...candidate.hero,
    id: `h${state.day}-${state.roster.length}-${candidate.hero.id}`,
    contract: { ...candidate.hero.contract, status: "rotation" },
  };
  const next: GameState = {
    ...state,
    gold: state.gold - candidate.fee,
    roster: [...state.roster, hero],
    tavern: state.tavern.filter((c) => c !== candidate),
    events: [
      ...state.events,
      event(state.day, "tavern", "good", `${hero.name} (lvl ${hero.level}) joins for ${candidate.fee}g.`, hero.id),
    ],
  };
  // A hire can be the fourth body a dungeon needs. Say so now, not a day later.
  announceUnlocks(next, next.day);
  return next;
};

/**
 * Change a hero's role. Free and instant: the cost is the ROLE_FIT multiplier on
 * every check, not a training timer. The planner still keeps natural roles.
 */
export const assignRole = (state: GameState, heroId: string, roleId: RoleId): GameState => {
  const hero = state.roster.find((h) => h.id === heroId);
  const role = ROLES.find((r) => r.id === roleId);
  if (!hero || !role || hero.role === roleId) return state;
  return {
    ...state,
    roster: state.roster.map((h) => (h.id === heroId ? { ...h, role: roleId } : h)),
    events: [
      ...state.events,
      event(state.day, "run", "info", `${hero.name} now works as ${role.name}.`, hero.id),
    ],
  };
};

export const releaseHero = (state: GameState, heroId: string): GameState => {
  const hero = state.roster.find((h) => h.id === heroId);
  if (!hero) return state;
  return {
    ...state,
    roster: state.roster.filter((h) => h.id !== heroId),
    raidTeam: state.raidTeam?.filter((id) => id !== heroId),
    plan: {
      parties: state.plan.parties.map((p) => ({
        ...p,
        heroes: p.heroes.filter((id) => id !== heroId),
      })),
    },
    events: [...state.events, event(state.day, "economy", "info", `${hero.name} was released.`, heroId)],
  };
};

/**
 * Apply a resolution's side effects to the plan: a hero who can no longer
 * fight leaves tomorrow's parties, and the day says so. The queue must never
 * leave the player with a plan that cannot run.
 */
const pruneWithNotes = (state: GameState): GameState => {
  const { plan, notes } = pruneUnavailable(state);
  if (notes.length === 0) return state;
  const next = { ...state, plan, events: [...state.events] };
  // `push` adds the event index, so two identical notes cannot share an id.
  for (const n of notes) push(next, event(state.day, "run", "info", n));
  return next;
};

export const resolveAttention = (
  state: GameState,
  itemId: string,
  optionKey: string,
): GameState => {
  // Events are addressable even when the cached attention list is stale.
  if (itemId.startsWith("event:")) {
    const cardId = itemId.split(":")[1];
    if (cardId && state.pendingEvent?.cardId === cardId) {
      const resolved = resolveEvent(state, cardId, optionKey);
      // Unaffordable or unknown option: do not clear the card, and let the
      // caller report that nothing happened.
      if (resolved === state) return state;
      const next = pruneWithNotes(resolved);
      return { ...next, attention: deriveAttention(next) };
    }
    return state;
  }

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
        promises: [
          ...(state.promises ?? []).filter(
            (p) => !(p.heroId === effect.heroId && p.status === "open"),
          ),
          {
            id: `promise:${effect.heroId}:${state.day}`,
            heroId: effect.heroId,
            madeOn: state.day,
            dueOn: state.day + PROMISE.windowDays - 1,
            daysAssigned: 0,
            status: "open" as const,
          },
        ],
        roster: state.roster.map((h) =>
          h.id === effect.heroId
            ? {
                ...h,
                // A promise settles the grievance, not just the mood: the
                // item must not come back from the same state a day later.
                daysBenched: 0,
                morale: clamp(h.morale + 10, 1, 100),
                contract: { ...h.contract, status: effect.status },
              }
            : h,
        ),
      };
      break;
    case "rotate": {
      const hero = state.roster.find((h) => h.id === effect.heroId);
      const parties = state.plan.parties.map((p) => ({ ...p, heroes: [...p.heroes] }));
      let placed = false;

      if (hero) {
        const open = parties.find((p) => {
          const max = contentById(p.contentId)?.maxHeroes ?? 10;
          return !p.heroes.includes(hero.id) && p.heroes.length < max;
        });
        if (open) {
          open.heroes.push(hero.id);
          placed = true;
        } else {
          // Every party is full: the promise has to cost someone their slot.
          const full = parties.find((p) => !p.heroes.includes(hero.id));
          if (full) {
            const weakest = partyOf(state, full).sort((a, b) => heroPower(a) - heroPower(b))[0];
            if (weakest) {
              full.heroes = full.heroes.map((id) => (id === weakest.id ? hero.id : id));
              placed = true;
            }
          }
        }
      }

      next = placed
        ? {
            ...state,
            plan: { parties },
            roster: state.roster.map((h) =>
              h.id === effect.heroId
                ? { ...h, daysBenched: 0, morale: clamp(h.morale + 5, 1, 100) }
                : h,
            ),
          }
        : {
            // No slot was available after all: settle the grievance the same
            // way a promise does. An option that changes nothing is a trap.
            ...state,
            roster: state.roster.map((h) =>
              h.id === effect.heroId
                ? { ...h, daysBenched: 0, morale: clamp(h.morale + 10, 1, 100) }
                : h,
            ),
          };
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
                  // Re-price to the hero's current level. A starter signed at
                  // level 1 costs the same at 60 without this, and the wage
                  // budget stops being the constraint the design says it is.
                  wage: renewalWage(h),
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
    case "assign-loot":
      next = autoAssignLoot(state);
      break;
    case "event": {
      const resolved = resolveEvent(state, effect.cardId, effect.optionKey);
      // Unaffordable or unknown option: do not clear the card.
      if (resolved === state) return state;
      next = resolved;
      break;
    }
  }

  const pruned = next === state ? state : pruneWithNotes(next);
  const deferred =
    effect.kind === "ignore" || effect.kind === "acknowledge"
      ? { ...(state.attentionMutedUntil ?? {}), [attentionKey(item.kind, item.heroId)]: state.day }
      : state.attentionMutedUntil ?? {};

  return {
    ...pruned,
    attentionMutedUntil: deferred,
    attention: pruned.attention.filter((i) => i.id !== itemId),
  };
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
