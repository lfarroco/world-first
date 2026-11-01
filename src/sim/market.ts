import { clamp } from "./prelude";
import type { GameState, Hero } from "./types";
import { bestLevel } from "./content/heroes";
import { MARKET } from "./content/tuning";
import {
  MARKET_GOODS,
  marketGoodById,
  type MarketGood,
  type MarketGoodId,
} from "./content/market";
import { event, push } from "./events";

export { MARKET_GOODS } from "./content/market";
export type { MarketGood, MarketGoodId, MarketGoodKind } from "./content/market";

/**
 * The gear tier the market sells. It tracks the guild's best level, so the
 * shop is an alternative to a bad drop, not a private progression ladder.
 */
export const marketGearIlvl = (state: GameState): number =>
  Math.min(
    MARKET.gearIlvlCap,
    Math.round(MARKET.gearIlvlBase + bestLevel(state.roster) * MARKET.gearIlvlPerLevel),
  );

/** The level a targeted price is computed from. Untargeted screens use the best. */
const priceLevel = (state: GameState, hero?: Hero): number =>
  hero?.level ?? Math.max(1, bestLevel(state.roster));

export const marketPrice = (state: GameState, good: MarketGood, hero?: Hero): number => {
  switch (good.kind) {
    case "gear":
      return Math.round(MARKET.gearBasePrice + marketGearIlvl(state) * MARKET.gearPricePerIlvl);
    case "salve":
      return Math.round(MARKET.salveBase + priceLevel(state, hero) * MARKET.salvePerLevel);
    case "rations":
      return Math.round(MARKET.rationsBase + priceLevel(state, hero) * MARKET.rationsPerLevel);
    case "tonic":
      return Math.round(MARKET.tonicBase + priceLevel(state, hero) * MARKET.tonicPerLevel);
  }
};

/**
 * Whether the purchase would do anything. The screen disables the rest, so a
 * buy button is never a way to spend gold and learn nothing.
 */
export const marketGoodApplies = (state: GameState, good: MarketGood, hero: Hero): boolean => {
  switch (good.kind) {
    case "gear": {
      const slot = good.slot;
      return Boolean(slot) && marketGearIlvl(state) > hero.gear[slot!];
    }
    case "salve":
      return hero.injuryDays > 0 || hero.health < 100;
    case "rations":
      return hero.fatigue > 0 || hero.health < 100;
    case "tonic":
      return true;
  }
};

export type MarketStock = {
  gearIlvl: number;
  goods: { good: MarketGood; price: number }[];
};

export const marketStock = (state: GameState): MarketStock => ({
  gearIlvl: marketGearIlvl(state),
  goods: MARKET_GOODS.map((good) => ({ good, price: marketPrice(state, good) })),
});

/**
 * Buy one good for one hero. Pure: returns null when the purse, the hero or the
 * good's effect makes the purchase illegal. The caller shows the reason.
 */
export const buyGood = (
  state: GameState,
  goodId: MarketGoodId | string,
  heroId: string,
): GameState | null => {
  const good = marketGoodById(goodId);
  const hero = state.roster.find((h) => h.id === heroId);
  if (!good || !hero) return null;
  const price = marketPrice(state, good, hero);
  if (state.gold < price || !marketGoodApplies(state, good, hero)) return null;

  const nextHero: Hero = { ...hero };
  let line = "";

  switch (good.kind) {
    case "gear": {
      const slot = good.slot;
      if (!slot) return null;
      const ilvl = marketGearIlvl(state);
      const before = nextHero.gear[slot];
      if (ilvl <= before) return null;
      nextHero.gear = { ...nextHero.gear, [slot]: ilvl };
      line = `${hero.name} buys a ${good.name.toLowerCase()} for ${price}g (${slot} ${before} → ${ilvl}).`;
      break;
    }
    case "salve": {
      const days = nextHero.injuryDays;
      nextHero.injuryDays = 0;
      nextHero.health = clamp(nextHero.health + MARKET.salveHealth, 0, 100);
      line = `${hero.name} takes a field salve for ${price}g${days > 0 ? ` — ${days} injury day${days === 1 ? "" : "s"} cleared` : ""}.`;
      break;
    }
    case "rations": {
      const before = Math.round(nextHero.fatigue);
      nextHero.fatigue = clamp(nextHero.fatigue - MARKET.rationsFatigue, 0, 100);
      nextHero.health = clamp(nextHero.health + MARKET.rationsHealth, 0, 100);
      line = `${hero.name} eats trail rations for ${price}g (fatigue ${before} → ${Math.round(nextHero.fatigue)}).`;
      break;
    }
    case "tonic": {
      // A refresh, not a stack: the second tonic is still +10% for three days.
      nextHero.buffPower = Math.max(nextHero.buffPower ?? 0, MARKET.tonicPower);
      nextHero.buffDays = Math.max(nextHero.buffDays ?? 0, MARKET.tonicDays);
      line = `${hero.name} drinks an oiled tonic for ${price}g (+${Math.round(MARKET.tonicPower * 100)}% checks for ${MARKET.tonicDays} days).`;
      break;
    }
  }

  const next: GameState = {
    ...state,
    gold: state.gold - price,
    roster: state.roster.map((h) => (h.id === hero.id ? nextHero : h)),
    events: [...state.events],
  };
  push(next, event(state.day, "economy", "good", line, hero.id));
  return next;
};
