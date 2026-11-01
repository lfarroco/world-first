import type { ContentDef, GameState, Hero, LootItem, PendingLoot } from "./types";
import { itemLevel } from "./hero";
import { event, push } from "./events";
import { LOOT, MARKET } from "./content/tuning";
import { lootUpgrade, suggestLootTarget } from "./loot-target";

export * from "./loot-target";

const itemLevelOf = (hero: Hero): number => itemLevel(hero.gear);

/** The drops a clear queues for assignment, with a suggested target. */
export const queueLoot = (
  state: GameState,
  content: ContentDef,
  party: readonly Hero[],
  loot: readonly LootItem[],
  day: number,
): PendingLoot[] =>
  loot
    .map((drop, i) => ({
      ...drop,
      id: `loot-${day}-${content.id}-${i}`,
      day,
      contentId: content.id,
      contentName: content.name,
      partyIds: party.map((h) => h.id),
    }))
    .filter((drop) => suggestLootTarget(state, drop) !== "");

/** Give one waiting drop to a hero. The drop is consumed even if it is no upgrade. */
export const assignLoot = (state: GameState, lootId: string, heroId: string): GameState => {
  const pending = state.pendingLoot ?? [];
  const drop = pending.find((l) => l.id === lootId);
  const hero = state.roster.find((h) => h.id === heroId);
  if (!drop || !hero) return state;
  const gain = lootUpgrade(hero, drop);
  const before = hero.gear[drop.slot];
  const after = Math.max(before, drop.ilvl);
  const nextHero: Hero = {
    ...hero,
    gear: { ...hero.gear, [drop.slot]: after },
  };
  const next: GameState = {
    ...state,
    roster: state.roster.map((h) => (h.id === heroId ? nextHero : h)),
    pendingLoot: pending.filter((l) => l.id !== lootId),
    // `push` appends to this array. Copy it or the caller's state changes.
    events: [...state.events],
  };
  const label = drop.item ? `${drop.item} (${drop.slot} ${drop.ilvl})` : `${drop.slot} ${drop.ilvl}`;
  push(
    next,
    event(
      state.day,
      "loot",
      "good",
      `${hero.name} takes ${label} from ${drop.contentName} (${before} → ${after}${gain > 0 ? `, +${gain}` : ", no upgrade"}).`,
      hero.id,
    ),
  );
  return next;
};

/** A drop no living hero can use is removed, with one line saying so. */
export const discardLoot = (state: GameState, drop: PendingLoot): GameState => {
  const next: GameState = {
    ...state,
    pendingLoot: (state.pendingLoot ?? []).filter((l) => l.id !== drop.id),
    events: [...state.events],
  };
  const label = drop.item ? `${drop.item} (${drop.slot} ${drop.ilvl})` : `${drop.slot} ${drop.ilvl}`;
  push(next, event(state.day, "loot", "info", `${drop.contentName}: ${label} — no hero gains; discarded.`));
  return next;
};

/** What a waiting drop is worth in gold. A floor plus item level. */
export const lootSellValue = (drop: LootItem): number =>
  Math.round(LOOT.sellBase + drop.ilvl * LOOT.sellPerIlvl);

/** Sell a waiting drop instead of assigning it. */
export const sellLoot = (state: GameState, lootId: string): GameState => {
  const pending = state.pendingLoot ?? [];
  const drop = pending.find((l) => l.id === lootId);
  if (!drop) return state;
  const value = lootSellValue(drop);
  const next: GameState = {
    ...state,
    gold: state.gold + value,
    pendingLoot: pending.filter((l) => l.id !== lootId),
    events: [...state.events],
  };
  const label = drop.item ? `${drop.item} (${drop.slot} ${drop.ilvl})` : `${drop.slot} ${drop.ilvl}`;
  push(next, event(state.day, "economy", "good", `${drop.contentName}: ${label} sold for ${value}g.`));
  return next;
};

/** What a craft costs: gold plus the drop's item level. */
export const craftCost = (drop: LootItem): number =>
  Math.round(MARKET.craftBase + drop.ilvl * MARKET.craftPerIlvl);

/**
 * Spend one waiting drop plus gold at the forge. The hero's slot ends
 * `craftGain` above the better of the drop and the gear already there, so a
 * drop that is not an upgrade can still be turned into one. This is the second
 * use for a bad drop and the second gold sink next to the market.
 */
export const craftLoot = (state: GameState, lootId: string, heroId: string): GameState | null => {
  const pending = state.pendingLoot ?? [];
  const drop = pending.find((l) => l.id === lootId);
  const hero = state.roster.find((h) => h.id === heroId);
  if (!drop || !hero) return null;
  const cost = craftCost(drop);
  if (state.gold < cost) return null;
  const before = hero.gear[drop.slot];
  const after = Math.max(before, drop.ilvl) + MARKET.craftGain;
  const nextHero: Hero = { ...hero, gear: { ...hero.gear, [drop.slot]: after } };
  const next: GameState = {
    ...state,
    gold: state.gold - cost,
    roster: state.roster.map((h) => (h.id === heroId ? nextHero : h)),
    pendingLoot: pending.filter((l) => l.id !== lootId),
    events: [...state.events],
  };
  push(
    next,
    event(
      state.day,
      "loot",
      "good",
      `${hero.name} forges ${drop.item ?? `${drop.slot} ${drop.ilvl}`} into ${drop.slot} ${before} → ${after} for ${cost}g.`,
      hero.id,
    ),
  );
  return next;
};

/**
 * Apply every waiting drop to its best current target. This is what the AI does
 * at the end of a turn and what a human's next Advance does if they did not
 * choose. The target is recomputed at apply time, not taken from the stored
 * suggestion: two drops in one clear would otherwise both aim at the same hero.
 */
export type LootPolicy = "need" | "party-lowest";

export const autoAssignLoot = (
  state: GameState,
  policy: LootPolicy = "need",
): GameState => {
  const pending = state.pendingLoot ?? [];
  if (pending.length === 0) return state;
  let next = state;
  for (const drop of [...pending]) {
    let target: string;
    if (policy === "need") {
      target = suggestLootTarget(next, drop);
    } else {
      // The AI's floor: the old lowest-geared-in-the-clearing-party pick. It
      // keeps the measured ladder where it was; the player can beat it with
      // the need suggestion. The AI is the harness, not the ceiling.
      const party = (drop.partyIds ?? [])
        .map((id) => next.roster.find((h) => h.id === id))
        .filter((h): h is Hero => Boolean(h));
      const pool = party.length > 0 ? party : next.roster;
      target = [...pool].sort((a, b) => itemLevelOf(a) - itemLevelOf(b))[0]?.id ?? "";
    }
    if (!target) {
      next = discardLoot(next, drop);
      continue;
    }
    next = assignLoot(next, drop.id, target);
  }
  return next;
};

