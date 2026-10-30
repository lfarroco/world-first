import type { GameState } from "../types";
import { blockingAttention, deriveAttention } from "../events";
import { hireCandidate, resolveAttention } from "../game";
import { resolveDay } from "../day";
import { applyFacilityDecision, hireDecision, planDay } from "./planner";
import type { Personality } from "./personalities";

export type AiTurn = {
  readonly state: GameState;
  readonly notes: readonly string[];
  readonly hired: string | null;
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

  const { plan, notes: planNotes } = planDay(next, personality);
  next = { ...next, plan };
  notes.push(...planNotes);

  next = resolveDay(next);

  for (const item of blockingAttention(next)) {
    const preferred =
      item.kind === "benched-unhappy"
        ? personality.ambition > 0.5
          ? "promise"
          : "rotate"
        : item.kind === "contract-expiring"
          ? personality.thrift > 0.6
            ? "release"
            : "renew"
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
