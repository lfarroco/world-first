import type { ContentDef, GameState } from "./types";
import { FEATURED } from "./content/tuning";
import { availableContent } from "./plan";
import { rngStream } from "./rng";

/**
 * The daily star: one open non-raid area pays more gold and XP today. It is
 * derived from `(seed, day)`, so the board, the planner and the payout all read
 * the same location without a save field. Raids are excluded: a 1.5× raid purse
 * would be a different difficulty dial, not a daily incentive.
 */
export const featuredContentFor = (
  state: GameState,
  open: readonly ContentDef[] = availableContent(state),
): ContentDef | null => {
  const pool = open.filter((content) => content.kind !== "raid");
  if (pool.length === 0) return null;
  const rng = rngStream(state.seed, "featured", state.day);
  return pool[Math.floor(rng() * pool.length)] ?? null;
};

/** The gold multiplier on the starred area, 1 everywhere else. */
export const featuredBonusFor = (
  state: GameState,
  content: ContentDef,
  open: readonly ContentDef[] = availableContent(state),
): number => {
  const featured = featuredContentFor(state, open);
  return featured?.id === content.id ? FEATURED.goldMult : 1;
};

/** The XP multiplier. The star is a gold rule; this is 1 by design. */
export const featuredXpBonusFor = (
  state: GameState,
  content: ContentDef,
  open: readonly ContentDef[] = availableContent(state),
): number => {
  const featured = featuredContentFor(state, open);
  return featured?.id === content.id ? FEATURED.xpMult : 1;
};

/** The text the day pays out in the report and the screens show today. */
export const featuredLine = (content: ContentDef): string =>
  `${content.name} is starred today — ${Math.round((FEATURED.goldMult - 1) * 100)}% more gold.`;

/** The name and kind, for a screen that has no room for the full line. */
export const featuredShortName = (content: ContentDef): string =>
  content.name.split("—").pop()?.trim() ?? content.name;
