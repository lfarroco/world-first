import type { GearSlot } from "../types";

/**
 * The market's stock. Prices are not stored here: they depend on the hero's
 * level (consumables) or the guild's current gear tier (equipment), and
 * `sim/market.ts` owns those formulas. This file is the catalogue.
 */
export type MarketGoodId =
  | "salve"
  | "rations"
  | "tonic"
  | "gear-weapon"
  | "gear-chest"
  | "gear-helm"
  | "gear-trinket";

export type MarketGoodKind = "salve" | "rations" | "tonic" | "gear";

export type MarketGood = {
  id: MarketGoodId;
  name: string;
  kind: MarketGoodKind;
  /** Equipment only: the slot the piece fills. */
  slot?: GearSlot;
  /** One line shown under the name. */
  blurb: string;
};

export const MARKET_GOODS: readonly MarketGood[] = [
  {
    id: "salve",
    name: "Field Salve",
    kind: "salve",
    blurb: "Clears an injury and restores 50 health.",
  },
  {
    id: "rations",
    name: "Trail Rations",
    kind: "rations",
    blurb: "−45 fatigue and +15 health for one hero.",
  },
  {
    id: "tonic",
    name: "Oiled Tonic",
    kind: "tonic",
    blurb: "+10% to every check for 3 days. Stacks as a refresh, not a second buff.",
  },
  {
    id: "gear-weapon",
    name: "Forged Blade",
    kind: "gear",
    slot: "weapon",
    blurb: "An item-level upgrade for the weapon slot.",
  },
  {
    id: "gear-chest",
    name: "Riveted Cuirass",
    kind: "gear",
    slot: "chest",
    blurb: "An item-level upgrade for the chest slot.",
  },
  {
    id: "gear-helm",
    name: "Tempered Helm",
    kind: "gear",
    slot: "helm",
    blurb: "An item-level upgrade for the helm slot.",
  },
  {
    id: "gear-trinket",
    name: "Warded Charm",
    kind: "gear",
    slot: "trinket",
    blurb: "An item-level upgrade for the trinket slot.",
  },
];

export const marketGoodById = (id: string): MarketGood | undefined =>
  MARKET_GOODS.find((good) => good.id === id);
