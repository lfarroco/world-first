import type { ContentDef, GameState, Hero } from "./types";
import { CONTENT } from "./content/content";
import { availableContent, bestPartyFor, levelOk } from "./plan";
import { heroPower, isAvailable } from "./hero";

/**
 * The stable raid ten. The planner used to pick the best ten every day, which
 * spread gear and levels across the roster and left the raid party at 48–52
 * item level at day 40. The team is a preference, not a lock: the planner fills
 * an injured or retired member from the bench, and the player can edit it.
 */
export const nextRaidContent = (state: GameState): ContentDef | null =>
  CONTENT.find(
    (c) =>
      c.kind === "raid" &&
      (state.progress.find((p) => p.contentId === c.id)?.clears ?? 0) === 0,
  ) ?? null;

/** The next raid the guild can actually enter, not just the next uncleared one. */
export const openRaidContent = (state: GameState): ContentDef | null =>
  availableContent(state).find((c) => c.kind === "raid") ?? null;

/** The best ten for the next raid; the roster's ten strongest after the tier. */
export const bestRaidTeam = (state: GameState): Hero[] => {
  const raid = nextRaidContent(state);
  const available = state.roster.filter(isAvailable);
  if (raid) return bestPartyFor(state, raid, available).slice(0, raid.minHeroes);
  return [...available].sort((a, b) => heroPower(b) - heroPower(a)).slice(0, 10);
};

/**
 * Fill or repair the team. A valid ten is kept even if a bench hero is
 * stronger: that is the point of a stable roster. `raidteam auto` and a new
 * guild use this; the AI calls it at the start of a turn.
 */
export const ensureRaidTeam = (state: GameState): GameState => {
  // Build the team at the raid tier, not on day one. A ten grown from the
  // starting three is the oldest ten, not the strongest; the first raid is the
  // first moment the roster is deep enough for the pick to mean something.
  if (!openRaidContent(state)) return pruneRaidTeam(state);
  const ids = state.raidTeam ?? [];
  const target = Math.min(10, state.roster.length);
  const live = ids.filter((id) => state.roster.some((h) => h.id === id));
  // Append, never replace: a player's eight is grown to ten, and a day-1
  // three-hero team grows as the roster does. Only `autoRaidTeam` re-picks.
  if (live.length >= target) {
    return live.length === ids.length ? state : { ...state, raidTeam: live };
  }
  const next = [...live];
  for (const hero of bestRaidTeam(state)) {
    if (next.length >= target) break;
    if (!next.includes(hero.id)) next.push(hero.id);
  }
  return { ...state, raidTeam: next };
};

/** Drop ids that have left the roster, in place. */
export const pruneRaidTeam = (state: GameState): GameState => {
  const ids = state.raidTeam ?? [];
  const live = ids.filter((id) => state.roster.some((h) => h.id === id));
  return live.length === ids.length ? state : { ...state, raidTeam: live };
};

/** Replace the team with the best ten for the next raid. */
export const autoRaidTeam = (state: GameState): GameState => ({
  ...state,
  raidTeam: bestRaidTeam(state).map((h) => h.id),
});

/**
 * The preferred ten, filled from the best available when a member is hurt or
 * gone. Falls back to the normal ranking if the team cannot meet the gate.
 */
export const stableRaidParty = (state: GameState, content: ContentDef): Hero[] => {
  const available = state.roster.filter(isAvailable);
  const preferred = (state.raidTeam ?? [])
    .map((id) => available.find((h) => h.id === id))
    .filter((h): h is Hero => Boolean(h));
  if (preferred.length === 0) return bestPartyFor(state, content, available);

  // The common path is a full, healthy team. Only rank the roster when a
  // member is missing or the team cannot meet the gate.
  if (preferred.length >= content.minHeroes) {
    const full = preferred.slice(0, content.maxHeroes);
    if (levelOk(content, full)) return full;
  }
  const fallback = bestPartyFor(state, content, available);
  const fill = fallback.filter((h) => !preferred.some((p) => p.id === h.id));
  const party = [...preferred, ...fill].slice(0, content.maxHeroes);
  return party.length >= content.minHeroes && levelOk(content, party) ? party : fallback;
};

/** The team as heroes, in roster order, for display. */
export const raidTeamHeroes = (state: GameState): Hero[] =>
  (state.raidTeam ?? [])
    .map((id) => state.roster.find((h) => h.id === id))
    .filter((h): h is Hero => Boolean(h));
