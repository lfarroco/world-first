import { clamp } from "../prelude";
import type { Effect, EventCard, EventOption } from "../content/events";
import { cardById, optionAffordable } from "../content/events";
import type { GameState, Hero } from "../types";
import { EVENT_VALUE, REST, RUN_DAYS } from "../content/tuning";
import { bestLevel, feeForLevel } from "../content/heroes";
import { condMod, itemLevel } from "../hero";
import { wageBill } from "../economy";
import { wageBudgetFor } from "../facilities";
import { RAID_SIZE } from "../events";
import type { Personality } from "./personalities";

/**
 * What an event option is worth, in gold. Positional prose is not a cost: the
 * first option used to be the answer because it was first. This file turns the
 * card's declarative effects into one comparable number so the planner can
 * weigh a card the way a player reads it.
 *
 * The weights are hand-set (see EVENT_VALUE). The check is not the formula but
 * the trace: progression-report.md §5.4 prints which option each personality
 * takes on each card, and the sweep says whether the resulting bank is better.
 *
 * The unit is gold because every other lever the planner pulls — a hire, a
 * facility, a forge — is priced in it. Only one exchange rate is invented per
 * line, and the comment on each says which in-game number it came from.
 */

const weeksLeft = (state: GameState): number =>
  Math.max(1, Math.ceil((RUN_DAYS - state.day + 1) / 7));

/** The raid ten. A body outside it can be hurt; a body inside it is the night. */
const isCore = (state: GameState, hero: Hero): boolean => {
  const rank = [...state.roster]
    .sort((a, b) => b.level - a.level)
    .findIndex((h) => h.id === hero.id);
  return rank >= 0 && rank < RAID_SIZE;
};

/**
 * How much a lost day hurts. A raid body is the night; a body that was going
 * to work is half a party; a benched body heals for free, which is why "rest
 * him" is the cheap answer for the eleventh hero and the expensive one for
 * the tank.
 */
const injuryWeight = (state: GameState, hero: Hero): number => {
  const working = state.plan.parties.some((p) => p.heroes.includes(hero.id));
  const base = isCore(state, hero) ? 1 : working ? 0.5 : 0.15;
  // A body with no spare behind it is not "one tenth of the party": the night
  // cannot be fielded at all. Thin rosters buy their way out of injuries.
  const thin = state.roster.length <= RAID_SIZE + 1;
  return base === 1 && thin ? base * 1.6 : base;
};

/**
 * What it costs to lose a hero: the tavern's fee for his level plus the gear
 * he takes with him. The fee is the only market price the game sets for a body;
 * the gear term uses the same per-item-level weight as a drop.
 */
const heroValue = (hero: Hero): number =>
  feeForLevel(hero.level) + itemLevel(hero.gear) * EVENT_VALUE.ilvl;

const effectValue = (
  state: GameState,
  effect: Effect,
  target: Hero | undefined,
  personality: Personality,
): number => {
  switch (effect.kind) {
    case "gold":
      // Thrift is the dial that decides whether a purchase is a purchase or a
      // wound. A cautious personality sees the same 300g as 480g.
      return effect.amount < 0
        ? effect.amount * (1 + personality.thrift * 0.6)
        : effect.amount;

    case "renown": {
      // Renown's job is wage headroom. When the bill is at the budget it is
      // worth the whole weekly headroom for the rest of the run; when there is
      // slack it is nearly decorative.
      const tight =
        wageBill(state.roster) >= wageBudgetFor(state.renown, state.facilities) * 0.9;
      return effect.amount * (tight ? EVENT_VALUE.renownTight : EVENT_VALUE.renown);
    }

    case "wage": {
      if (!target) return 0;
      // A raise is permanent: price it for every week that is left.
      const delta = Math.round(target.contract.wage * (effect.multiplier - 1));
      return -delta * weeksLeft(state);
    }

    case "xp": {
      // No card pays XP today; `applyEffect` credits the target if there is
      // one and the whole roster if there is not.
      const ambition = 0.7 + personality.ambition * 0.6;
      const heroes = target ? 1 : Math.max(1, state.roster.length);
      return effect.amount * EVENT_VALUE.xp * ambition * heroes;
    }

    case "morale": {
      // The applied delta, not the printed one: a +10 on a hero at 96 is worth
      // 4 points, and a −18 below the bench threshold costs more next week.
      const heroes = effect.target === "guild" || !target ? state.roster : [target];
      const applied = heroes.reduce(
        (acc, h) => acc + (clamp(h.morale + effect.amount, 1, 100) - h.morale),
        0,
      );
      return applied * EVENT_VALUE.morale;
    }

    case "fatigue": {
      if (!target) return 0;
      const before = target.fatigue;
      const after = clamp(before + effect.amount, 0, 100);
      // Condition is smooth, so the cost is the slope: 20 points at 60 fatigue
      // is a tenth of a hero's output. Crossing the planner's rest line is a
      // different cost — he does not deploy at all.
      const lost = (condMod(before) - condMod(after)) * 100;
      const night =
        after >= REST.exhausted && before < REST.exhausted
          ? injuryWeight(state, target) * EVENT_VALUE.injuryDay
          : 0;
      return -(lost * EVENT_VALUE.fatigue + night);
    }

    case "gear": {
      if (!target) return 0;
      // Only an upgrade is worth anything; a 55 iLvl blade for a hero already
      // in 90 iLvl gear is a 250g insult.
      const gain = Math.max(0, effect.ilvl - target.gear[effect.slot]);
      return gain * EVENT_VALUE.ilvl;
    }

    case "injury": {
      if (!target) return 0;
      const caution = 0.6 + personality.caution * 0.8;
      return -effect.days * EVENT_VALUE.injuryDay * caution * injuryWeight(state, target);
    }

    case "leave":
      return target ? -heroValue(target) : 0;

    case "recruit": {
      // A free body is worth what the tavern would charge for the same level.
      const level = Math.max(1, Math.round(bestLevel(state.roster) * effect.levelFactor));
      return feeForLevel(level);
    }
  }
};

export const eventOptionValue = (
  state: GameState,
  option: EventOption,
  personality: Personality,
): number => {
  // The engine applies every effect to the card's target (applyEffect ignores
  // effect.target for heroes), so the valuation must resolve the same body.
  const targetId = state.pendingEvent?.targetHeroId ?? null;
  const target = targetId ? state.roster.find((h) => h.id === targetId) : undefined;
  return option.effects.reduce(
    (total, effect) => total + effectValue(state, effect, target, personality),
    0,
  );
};

export type CardChoice = {
  readonly card: EventCard;
  readonly option: EventOption;
  readonly value: number;
  /** Every affordable option and its price, so the trace can show the margin. */
  readonly scored: readonly { key: string; value: number }[];
};

/**
 * The best affordable option on the pending card. Ties keep the card's own
 * order, so the choice is deterministic without inventing a preference.
 */
export const chooseCardOption = (
  state: GameState,
  personality: Personality,
): CardChoice | null => {
  const pending = state.pendingEvent;
  if (!pending) return null;
  const card = cardById(pending.cardId);
  if (!card) return null;

  const affordable = card.options.filter((o) => optionAffordable(state, o));
  if (affordable.length === 0) return null;

  const scored = affordable.map((option) => ({
    key: option.key,
    value: eventOptionValue(state, option, personality),
    option,
  }));
  let best = scored[0]!;
  for (const entry of scored) if (entry.value > best.value) best = entry;

  return {
    card,
    option: best.option,
    value: best.value,
    scored: scored.map(({ key, value }) => ({ key, value: Math.round(value) })),
  };
};
