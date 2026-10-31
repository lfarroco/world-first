import { clamp } from "./prelude";
import type { GameState, Rival, RivalDef } from "./types";
import { RAIDS, contentById } from "./content/content";
import { MASTERY, RIVAL } from "./content/tuning";
import { rngStream } from "./rng";

export const RIVALS: readonly RivalDef[] = [
  { id: "echoes", name: "Echoes", raidAppetite: 0.95, growth: 0.048, note: "raids every night; burns out late" },
  { id: "methodical", name: "Methodical", raidAppetite: 0.55, growth: 0.053, note: "farms two days for every raid day" },
  { id: "ravensguard", name: "Ravensguard", raidAppetite: 0.75, growth: 0.050, note: "balanced; waits for others to stumble" },
];

/** The order a rival walks the same ladder the player does. */
export const RIVAL_LADDER = [
  "hollow-crypt",
  "sunken-temple",
  "ashen-spire",
  "raid-gatewarden",
  "raid-covens",
  "raid-tyrant",
] as const;

export const startingRivals = (seed: number): Rival[] =>
  RIVALS.map((def, i) => ({
    id: def.id,
    name: def.name,
    power: 30 + i * 4 + rngStream(seed, "rivalStart", def.id)() * 8,
    raidsCleared: 0,
    bestPull: 0,
    pulls: 0,
    activity: "levelling",
    worldFirstDay: null,
  }));

/**
 * Rivals run the same content rules as the player, compressed to one power
 * number. Personality changes appetite and growth, not the rules.
 */
export const tickRivals = (state: GameState): void => {
  for (const rival of state.rivals) {
    const def = RIVALS.find((r) => r.id === rival.id);
    if (!def) continue;

    const rng = rngStream(state.seed, "rival", state.day, rival.id);
    const burnOut =
      rival.id === "echoes" && state.day > RIVAL.burnoutDay ? RIVAL.burnoutFactor : 1;
    const growth = def.growth * RIVAL.pace * burnOut;
    const stageId = RIVAL_LADDER[rival.raidsCleared];
    const stage = stageId ? contentById(stageId) : undefined;

    if (!stage) {
      rival.activity = "finished the tier";
      continue;
    }

    const requirement = Math.max(...stage.phases.map((p) => p.requirement), 1);
    const wantsAttempt = rng() < def.raidAppetite || rival.bestPull > 0.5;
    const mastery = clamp(rival.pulls * MASTERY.perPull, 0, MASTERY.cap);

    if (!wantsAttempt) {
      rival.power *= 1 + growth * RIVAL.farmGrowth;
      rival.activity = "farming";
      continue;
    }

    rival.pulls += 1;
    rival.activity = `attempting ${stage.name}`;
    const value = rival.power * (1 + mastery);

    if (value >= requirement) {
      rival.raidsCleared += 1;
      rival.bestPull = 0;
      rival.pulls = 0;
      rival.power *= 1 + growth * RIVAL.clearGrowth;
      rival.activity = `cleared ${stage.name}`;
      // `raidsCleared` counts every stage of RIVAL_LADDER, including the three
      // dungeons. World First is the *final* raid, so it only fires when the
      // whole ladder is behind them. The old `>= 3` check fired on the first
      // raid (after three dungeon clears) and handed rivals a World First they
      // had not earned.
      if (
        stage.kind === "raid" &&
        rival.raidsCleared === RIVAL_LADDER.length &&
        rival.worldFirstDay === null
      ) {
        rival.worldFirstDay = state.day;
      }
    } else {
      rival.bestPull = Math.max(rival.bestPull, clamp(value / requirement, 0, 0.99));
      rival.power *= 1 + growth * RIVAL.attemptGrowth;
    }
  }
};

export const rivalProgressLabel = (rival: Rival): string => {
  const stageId = RIVAL_LADDER[rival.raidsCleared];
  if (!stageId) return "finished the tier";
  const def = contentById(stageId);
  return `${def?.name ?? stageId} — ${Math.round(rival.bestPull * 100)}%`;
};

/** Raids (not dungeon stages) cleared, for a label that compares with the player's 0/3. */
export const rivalRaidsCleared = (rival: Rival): number =>
  RIVAL_LADDER.slice(0, rival.raidsCleared).filter((id) => contentById(id)?.kind === "raid").length;

export const raidCount = RAIDS.length;
