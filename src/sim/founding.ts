import { ECONOMY, TAVERN } from "./content/tuning";
import type { GameState, Plan } from "./types";
import { CONTENT } from "./content/content";
import { bestLevel, makeCandidate, startingRoster } from "./content/heroes";
import { announceUnlocks, event } from "./events";
import { emptyFacilities } from "./facilities";

/**
 * The state every guild starts from. It deliberately has no rivals: the player
 * `newGame` adds them afterwards, and each rival guild is founded with none of
 * its own, so `resolveDay` on a rival cannot recurse into the world tick.
 */
export const foundGuild = (seed: number, guildName: string): GameState => {
  const roster = startingRoster(seed);
  const plan: Plan = {
    parties: [{ contentId: "emberwood", heroes: roster.map((h) => h.id), stance: "steady" }],
  };

  const state: GameState = {
    seed,
    guildName,
    day: 1,
    gold: ECONOMY.startGold,
    renown: 0,
    rewardScale: 1,
    roster,
    plan,
    progress: CONTENT.map((c) => ({
      contentId: c.id,
      clears: 0,
      clearedOnDay: null,
      attempts: 0,
      bestPull: 0,
    })),
    rivals: [],
    tavern: Array.from({ length: TAVERN.size }, (_, i) =>
      makeCandidate(seed, 1, i, bestLevel(roster)),
    ),
    attention: [],
    events: [
      event(1, "run", "info", `${guildName} is founded: three adventurers, one wood, and 84 days.`),
    ],
    arrearsDays: 0,
    worldFirstDay: null,
    finished: false,
    score: null,
    scoreLines: null,
    band: null,
    lastEncounter: null,
    facilities: emptyFacilities(),
    pendingEvent: null,
    eventLog: [],
    attentionMutedUntil: {},
    promises: [],
    pendingLoot: [],
    raidTeam: [],
    raidLog: [],
  };

  // The starting areas are open from day one; seed the ledger so the first
  // digest does not announce the wood the guild already stands in.
  announceUnlocks(state, 1);
  return state;
};
