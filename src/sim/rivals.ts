import type { GameState, Rival, RivalDef } from "./types";
import { contentById } from "./content/content";
import { RIVAL } from "./content/tuning";
import { foundGuild } from "./founding";
import { computeScore } from "./score";

export const RIVALS: readonly RivalDef[] = [
  { id: "echoes", name: "Echoes", personality: "echoes", note: "raids early and often; spends into the next tier" },
  { id: "methodical", name: "Methodical", personality: "methodical", note: "farms two days for every raid day" },
  { id: "ravensguard", name: "Ravensguard", personality: "ravensguard", note: "balanced; takes the attempt when the odds are good" },
];

/**
 * The rivals are founded from their own seeds. Multiplying rather than adding
 * keeps neighbouring player seeds from handing three guilds the same roster;
 * the multiplier is odd so it stays a permutation modulo 2^32.
 */
export const rivalSeed = (seed: number, index: number): number =>
  (seed * 2654435761 + (index + 1) * 40503) >>> 0;

export const startingRivals = (seed: number): Rival[] =>
  RIVALS.map((def, i) => {
    const guild = foundGuild(rivalSeed(seed, i), def.name);
    // The global pace dial is an XP multiplier. The player's guild keeps 1.0;
    // a rival at 0.9 levels about one step slower over 84 days, which is the
    // difference between finishing the tier before the player and after.
    guild.rewardScale = RIVAL.pace;
    return {
      id: def.id,
      name: def.name,
      personality: def.personality,
      guild,
      activity: "levelling",
    };
  });

/** Raids cleared, for a label that compares with the player's 0/3. */
export const rivalRaidsCleared = (rival: Rival): number =>
  rival.guild.progress.filter(
    (p) => contentById(p.contentId)?.kind === "raid" && p.clears > 0,
  ).length;

export const playerRaidsCleared = (state: GameState): number =>
  state.progress.filter((p) => contentById(p.contentId)?.kind === "raid" && p.clears > 0).length;

/** Every guild scored by the same formula, highest first. */
export type Standing = {
  name: string;
  score: number;
  raids: number;
  isPlayer: boolean;
  worldFirstDay: number | null;
};

export const standings = (state: GameState): Standing[] => {
  const rows: Standing[] = [
    {
      name: state.guildName,
      score: state.score ?? computeScore(state).total,
      raids: playerRaidsCleared(state),
      isPlayer: true,
      worldFirstDay: state.worldFirstDay,
    },
    ...state.rivals.map((rival) => ({
      name: rival.name,
      score: rival.guild.score ?? computeScore(rival.guild).total,
      raids: rivalRaidsCleared(rival),
      isPlayer: false,
      worldFirstDay: rival.guild.worldFirstDay,
    })),
  ];
  // Score is the ranking. Ties break on the earlier final-boss kill, then on
  // the guild that is already further up the raid ladder, then on table order.
  const killDay = (row: Standing): number => row.worldFirstDay ?? Number.MAX_SAFE_INTEGER;
  return rows.sort(
    (a, b) => b.score - a.score || killDay(a) - killDay(b) || b.raids - a.raids,
  );
};

export const playerRank = (state: GameState): number =>
  standings(state).findIndex((row) => row.isPlayer) + 1;

/** One guild's line on one raid, for the raid hub's map and race strip. */
export type RaidRaceRow = {
  name: string;
  isPlayer: boolean;
  score: number;
  clearedOnDay: number | null;
  bestPull: number;
  /** Attempts, which is what the mastery readout is counted from. */
  pulls: number;
};

const raidProgressOf = (
  state: GameState,
  contentId: string,
): Pick<RaidRaceRow, "clearedOnDay" | "bestPull" | "pulls"> => {
  const row = state.progress.find((p) => p.contentId === contentId);
  return {
    clearedOnDay: row?.clearedOnDay ?? null,
    bestPull: row?.bestPull ?? 0,
    pulls: row?.attempts ?? 0,
  };
};

/**
 * The race on one raid. A guild that cleared it ranks by the day it killed it;
 * the rest rank by their best pull. A guild that has not pulled it sorts last
 * at 0%, which is what its progress row says. The player's row keeps its name
 * so a table can render all four without a special case.
 */
export const raidRace = (state: GameState, contentId: string): RaidRaceRow[] => {
  const rows: RaidRaceRow[] = [
    {
      name: state.guildName,
      isPlayer: true,
      score: state.score ?? computeScore(state).total,
      ...raidProgressOf(state, contentId),
    },
    ...state.rivals.map((rival) => ({
      name: rival.name,
      isPlayer: false,
      score: rival.guild.score ?? computeScore(rival.guild).total,
      ...raidProgressOf(rival.guild, contentId),
    })),
  ];
  const killDay = (row: RaidRaceRow): number => row.clearedOnDay ?? Number.MAX_SAFE_INTEGER;
  return rows.sort(
    (a, b) => killDay(a) - killDay(b) || b.bestPull - a.bestPull || b.score - a.score,
  );
};
