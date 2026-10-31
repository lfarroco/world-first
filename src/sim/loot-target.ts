import type { GameState, Hero, LootItem, PendingLoot } from "./types";
import { itemLevel } from "./hero";
import { LOOT } from "./content/tuning";

/**
 * Pure loot-target arithmetic. This file must not import `events.ts`: the
 * attention queue reads a suggestion from here, and `loot.ts` emits events.
 */
export const lootUpgrade = (hero: Hero, drop: LootItem): number =>
  Math.max(0, drop.ilvl - hero.gear[drop.slot]);

const itemLevelOf = (hero: Hero): number => itemLevel(hero.gear);

const rankedTargets = (
  state: GameState,
  drop: LootItem,
): { hero: Hero; gain: number; score: number }[] => {
  const team = new Set(state.raidTeam ?? []);
  return state.roster
    .map((hero) => {
      const gain = lootUpgrade(hero, drop);
      const score = gain > 0 ? gain + (team.has(hero.id) ? LOOT.teamBias : 0) : Number.NEGATIVE_INFINITY;
      return { hero, gain, score };
    })
    .filter((t) => t.gain > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.gain - a.gain ||
        itemLevelOf(a.hero) - itemLevelOf(b.hero) ||
        state.roster.indexOf(a.hero) - state.roster.indexOf(b.hero),
    );
};

/**
 * The best recipient across the whole roster. A raid-team hero gets a small
 * bias, but a bench hero with a much larger upgrade still wins. Returns "" when
 * no hero would gain, so the auto policy can discard rather than waste the item.
 */
export const suggestLootTarget = (state: GameState, drop: LootItem): string =>
  rankedTargets(state, drop)[0]?.hero.id ?? "";

/** The best few targets for a drop, for the `loot` screen and the FYI line. */
export const lootTargets = (
  state: GameState,
  drop: PendingLoot,
  limit = 3,
): { hero: Hero; gain: number }[] =>
  rankedTargets(state, drop)
    .slice(0, limit)
    .map(({ hero, gain }) => ({ hero, gain }));
