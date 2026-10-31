import type { GameState } from "../types";
import { RAID_SIZE, blockingAttention, deriveAttention } from "../events";
import { hireCandidate, resolveAttention } from "../game";
import { resolveDay } from "../day";
import { renewalWage, wageBill } from "../economy";
import { wageBudgetFor } from "../facilities";
import { applyFacilityDecision, hireDecision, planDay, resetRoles, reviewRoles } from "./planner";
import { chooseCardOption } from "./cards";
import type { Personality } from "./personalities";

export type AiTurn = {
  readonly state: GameState;
  readonly notes: readonly string[];
  readonly hired: string | null;
};

/**
 * Renew or release, with the bill in hand. A renewal now re-prices to the
 * hero's level, so "renew everyone" is how a guild goes broke: the raid team
 * is kept at any price, and a bench body is kept only while the budget can
 * carry it. Thrift decides how much overrun is tolerated.
 */
const contractChoice = (
  state: GameState,
  heroId: string,
  personality: Personality,
): "renew" | "release" => {
  const hero = state.roster.find((h) => h.id === heroId);
  if (!hero) return "release";
  const rank = [...state.roster]
    .sort((a, b) => b.level - a.level)
    .findIndex((h) => h.id === heroId);
  // A raid team plus spare bodies: a ten-hero roster cannot absorb one injury.
  if (rank >= 0 && rank < RAID_SIZE + 3) return "renew";
  // A bench is the rotation, not wasted payroll: it lets the raid team rest
  // while someone else farms. Only a bill that is far past the budget, or a
  // guild already in arrears, makes a spare body a luxury.
  const projected = wageBill(state.roster) - hero.contract.wage + renewalWage(hero);
  const budget = wageBudgetFor(state.renown, state.facilities);
  const slack = 1.7 - personality.thrift * 0.3;
  return projected > budget * slack || state.arrearsDays > 0 ? "release" : "renew";
};

/**
 * One day played by the planner: hire, plan, resolve, answer the queue.
 * This is the same sequence a human goes through in the UI.
 */
export const aiTurn = (state: GameState, personality: Personality): AiTurn => {
  const notes: string[] = [];
  let next = state;

  const hire = hireDecision(next, personality);
  if (hire) {
    const before = next.roster.length;
    next = hireCandidate(next, hire);
    if (next.roster.length > before) {
      notes.push(`hired ${hire.hero.name} (lvl ${hire.hero.level}) for ${hire.fee}g`);
    }
  }

  const beforeFacilities = next.facilities;
  next = applyFacilityDecision(next, personality);
  if (next.facilities !== beforeFacilities) {
    for (const key of Object.keys(next.facilities) as (keyof typeof next.facilities)[]) {
      if (next.facilities[key] > beforeFacilities[key]) notes.push(`built ${key} level ${next.facilities[key]}`);
    }
  }

  // A role is a choice for the night, not a permanent state. Reset to the
  // creation role first so yesterday's flip cannot pick today's party.
  next = { ...next, roster: resetRoles(next.roster) };

  const { plan, notes: planNotes } = planDay(next, personality);
  next = { ...next, plan };
  const roles = reviewRoles(next, plan);
  next = roles.state;
  notes.push(...planNotes, ...roles.notes);

  next = resolveDay(next);

  for (const item of blockingAttention(next)) {
    if (item.kind === "event") {
      // The card is a decision, not a queue entry: weigh every affordable
      // option by its structured effects instead of taking the first.
      const choice = chooseCardOption(next, personality);
      if (!choice) continue;
      const margin = choice.scored
        .filter((s) => s.key !== choice.option.key)
        .map((s) => `${s.key} ${s.value}g`)
        .join(", ");
      next = resolveAttention(next, item.id, choice.option.key);
      notes.push(
        `${choice.card.id} → ${choice.option.key} (${Math.round(choice.value)}g${margin ? `; ${margin}` : ""})`,
      );
      continue;
    }

    const preferred =
      item.kind === "benched-unhappy"
        ? personality.ambition > 0.5
          ? "promise"
          : "rotate"
        : item.kind === "contract-expiring" && item.heroId
          ? contractChoice(next, item.heroId, personality)
          : item.options[0]?.key;
    if (preferred) {
      next = resolveAttention(next, item.id, preferred);
      notes.push(`${item.kind} → ${preferred}`);
    }
  }
  next = { ...next, attention: deriveAttention(next) };

  return { state: next, notes, hired: hire?.hero.name ?? null };
};

export const aiRun = (
  state: GameState,
  personality: Personality,
  maxTurns = 200,
): GameState => {
  let current = state;
  let guard = 0;
  while (!current.finished && guard < maxTurns) {
    guard += 1;
    current = aiTurn(current, personality).state;
  }
  return current;
};
