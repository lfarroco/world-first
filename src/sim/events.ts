import type { AttentionItem, EventKind, GameEvent, GameState, Hero, SquadStatus } from "./types";
import { assignedIds } from "./plan";
import { wageBill } from "./economy";
import { wageBudgetFor } from "./facilities";
import { cardById } from "./content/events";
import { CONTRACT } from "./content/tuning";

/** Deterministic id: no global counters, or replays diverge. */
const hashText = (text: string): number => {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h;
};

export const event = (
  day: number,
  kind: EventKind,
  severity: GameEvent["severity"],
  text: string,
  heroId?: string,
): GameEvent => {
  const base = `e${day}-${hashText(text).toString(36)}`;
  return heroId === undefined
    ? { id: base, day, kind, severity, text }
    : { id: base, day, kind, severity, text, heroId };
};

export const push = (state: GameState, e: GameEvent): void => {
  state.events.push({ ...e, id: `${e.id}-${state.events.length}` });
};

const itemId = (kind: string, heroId: string | undefined, day: number): string =>
  `${kind}:${heroId ?? "guild"}:${day}`;

/**
 * Attention items are derived, never authored. At most three block the day;
 * everything else is an FYI line.
 */
export const deriveAttention = (state: GameState): AttentionItem[] => {
  const items: AttentionItem[] = [];
  const today = state.day;

  for (const hero of state.roster) {
    if (hero.daysBenched >= 3 && hero.morale <= 58) {
      items.push({
        id: itemId("benched-unhappy", hero.id, today),
        kind: "benched-unhappy",
        day: today,
        blocking: true,
        heroId: hero.id,
        title: `${hero.name} wants words`,
        detail: `Benched ${hero.daysBenched} days, morale ${Math.round(hero.morale)}. He expects to be in the A-team.`,
        options: [
          { key: "promise", label: "Promise him the A-team spot", effect: { kind: "promise", heroId: hero.id, status: "a-team" } },
          { key: "rotate", label: "Rotate him into the raid tomorrow", effect: { kind: "rotate", heroId: hero.id } },
          { key: "ignore", label: "Ignore it for now", effect: { kind: "ignore" } },
        ],
      });
    }
  }

  for (const hero of state.roster) {
    if (hero.contract.daysLeft <= 7) {
      items.push({
        id: itemId("contract-expiring", hero.id, today),
        kind: "contract-expiring",
        day: today,
        blocking: true,
        heroId: hero.id,
        title: `${hero.name}'s contract`,
        detail: `${hero.contract.daysLeft} days left at ${hero.contract.wage}g/week.`,
        options: [
          { key: "renew", label: `Renew (+20% wage, ${CONTRACT.daysMax} days)`, effect: { kind: "renew", heroId: hero.id } },
          { key: "release", label: "Let him walk", effect: { kind: "release", heroId: hero.id } },
        ],
      });
    }
  }

  const bill = wageBill(state.roster);
  const budget = wageBudgetFor(state.renown, state.facilities);
  if (bill > budget) {
    items.push({
      id: itemId("wage-over-budget", undefined, today),
      kind: "wage-over-budget",
      day: today,
      blocking: false,
      title: "The coffers are thin",
      detail: `Wage bill ${bill}g vs budget ${budget}g.`,
      options: [{ key: "ack", label: "Noted", effect: { kind: "acknowledge" } }],
    });
  }

  const assigned = assignedIds(state.plan);
  for (const hero of state.roster) {
    if (hero.fatigue >= 70 && assigned.has(hero.id)) {
      items.push({
        id: itemId("fatigue-risk", hero.id, today),
        kind: "fatigue-risk",
        day: today,
        blocking: false,
        heroId: hero.id,
        title: `${hero.name} is running on empty`,
        detail: `Fatigue ${Math.round(hero.fatigue)}% and still assigned to the raid.`,
        options: [{ key: "ack", label: "Noted", effect: { kind: "acknowledge" } }],
      });
    }
  }

  const pending = state.pendingEvent;
  if (pending) {
    const card = cardById(pending.cardId);
    if (card) {
      const target = pending.targetHeroId
        ? state.roster.find((h) => h.id === pending.targetHeroId)
        : undefined;
      items.unshift({
        id: `event:${card.id}:${pending.day}`,
        kind: "event",
        day: today,
        blocking: true,
        ...(target ? { heroId: target.id } : {}),
        title: card.title,
        detail: card.text.replace("{hero}", target?.name ?? "one of your heroes"),
        options: card.options.map((o) => ({
          key: o.key,
          label: `${o.label} — ${o.hint}`,
          effect: { kind: "event" as const, cardId: card.id, optionKey: o.key },
        })),
      });
    }
  }

  const blocking = items.filter((i) => i.blocking).slice(0, 3);
  const fyi = items.filter((i) => !i.blocking);
  return [...blocking, ...fyi];
};

export const blockingAttention = (state: GameState): AttentionItem[] =>
  state.attention.filter((i) => i.blocking);

export const describeHeroStatus = (hero: Hero): string => {
  if (hero.injuryDays > 0) return `injured ${hero.injuryDays}d`;
  if (hero.health < 70) return "banged up";
  if (hero.fatigue >= 70) return "exhausted";
  if (hero.morale < 35) return "unhappy";
  return "ready";
};

export const statusLabel = (status: SquadStatus): string => {
  switch (status) {
    case "a-team":
      return "A-team";
    case "rotation":
      return "Rotation";
    case "bench":
      return "Bench";
  }
};

export const RAID_SIZE = 10;

/**
 * The real gate. A stale cached `attention` array must never let the day slip
 * through, so a pending event blocks even if it has not been re-derived yet.
 */
export const hasBlocking = (state: GameState): boolean =>
  state.pendingEvent !== null || state.attention.some((i) => i.blocking);
