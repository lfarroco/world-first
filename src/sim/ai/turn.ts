import type { AttentionItem, GameState } from "../types";
import { RAID_SIZE, blockingAttention, deriveAttention } from "../events";
import { hireCandidate, resolveAttention } from "../game";
import { resolveDay } from "../day";
import { counterHint, counterOffer, renewalWage, wageBill } from "../economy";
import { wageBudgetFor } from "../facilities";
import { applyFacilityDecision, hireDecision, planDay, resetRoles, reviewRoles } from "./planner";
import { chooseCardOption } from "./cards";
import { autoAssignLoot } from "../loot";
import { ensureRaidTeam } from "../team";
import type { Personality } from "./personalities";

export type AiTurn = {
  readonly state: GameState;
  readonly notes: readonly string[];
  readonly hired: string | null;
};

/**
 * Renew, counter, meet his number, or release — with the bill in hand. A
 * renewal now re-prices to the hero's level, so "renew everyone" is how a
 * guild goes broke: the raid team is kept at any price, and a bench body is
 * kept only while the budget can carry it. Thrift decides how much overrun is
 * tolerated.
 *
 * The counter is priced on the same visible hint the player sees
 * (`counterHint`), not on the acceptance threshold, so the bot can misread a
 * hero exactly as a player can.
 */
const contractChoice = (
  state: GameState,
  heroId: string,
  personality: Personality,
): "renew" | "release" | "counter" | "meet" => {
  const hero = state.roster.find((h) => h.id === heroId);
  if (!hero) return "release";
  const rank = [...state.roster]
    .sort((a, b) => b.level - a.level)
    .findIndex((h) => h.id === heroId);
  // A raid team plus spare bodies: a ten-hero roster cannot absorb one injury.
  // They are kept at any price; only the counter or his final number is a
  // choice. A body past that line is the one the bill decides.
  if (rank >= 0 && rank < RAID_SIZE + 3) {
    if (hero.contract.counterRefused) return "meet";
    return counterHint(hero) && counterOffer(hero) < renewalWage(hero) ? "counter" : "renew";
  }
  const projected = wageBill(state.roster) - hero.contract.wage + renewalWage(hero);
  const budget = wageBudgetFor(state.renown, state.facilities);
  const slack = 1.7 - personality.thrift * 0.3;
  return projected > budget * slack || state.arrearsDays > 0 ? "release" : "renew";
};

/**
 * The option the bot takes on a queue item. The contract items share one
 * price rule; a transfer request is that rule seen from the roster side.
 */
const attentionChoice = (
  state: GameState,
  item: AttentionItem,
  personality: Personality,
): string | undefined => {
  if (item.kind === "benched-unhappy") {
    return personality.ambition > 0.5 ? "promise" : "rotate";
  }
  if (!item.heroId) return item.options[0]?.key;
  if (item.kind === "contract-expiring" || item.kind === "contract-counter") {
    return contractChoice(state, item.heroId, personality);
  }
  if (item.kind === "transfer-request") {
    return contractChoice(state, item.heroId, personality) === "release" ? "transfer" : "refuse";
  }
  return item.options[0]?.key;
};

/**
 * One day played by the planner: hire, plan, resolve, answer the queue.
 * This is the same sequence a human goes through in the UI.
 */
export const aiTurn = (state: GameState, personality: Personality): AiTurn => {
  const notes: string[] = [];
  // Apply anything the previous turn left waiting, then keep the same raid ten.
  let next = ensureRaidTeam(autoAssignLoot(state, "party-lowest"));
  if ((state.pendingLoot ?? []).length > 0) {
    notes.push(`loot: ${state.pendingLoot!.length} item(s) assigned`);
  }

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

  const resolved = resolveDay(next);
  const newDrops = (resolved.pendingLoot ?? []).length;
  next = autoAssignLoot(resolved, "party-lowest");
  if (newDrops > 0) notes.push(`loot: ${newDrops} item(s) assigned`);

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

    const preferred = attentionChoice(next, item, personality);
    if (!preferred) continue;
    // The counter can be hidden for morale; renew is the safe fallback. A
    // refused counter only offers meet/release, so it falls back to meet.
    const key = item.options.some((o) => o.key === preferred)
      ? preferred
      : (item.options.find((o) => o.key === "renew") ?? item.options.find((o) => o.key === "meet"))
          ?.key ?? item.options[0]!.key;
    next = resolveAttention(next, item.id, key);
    notes.push(`${item.kind} → ${key}`);
  }
  next = { ...next, attention: deriveAttention(next) };

  return { state: next, notes, hired: hire?.hero.name ?? null };
};

/**
 * A full run of the guild's own days. This does not tick the rivals: it is the
 * unit-balance harness, and the player's checks do not depend on them. Use
 * `runWorld` when the race (World First, rank) matters.
 */
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
