import { sum } from "./prelude";
import type { Band, GameState, ScoreLine } from "./types";
import { RAIDS, contentById } from "./content/content";
import { SCORE } from "./content/tuning";
import { squadRating } from "./hero";

export type ScoreResult = {
  total: number;
  lines: ScoreLine[];
  band: Band;
};

export const computeScore = (state: GameState): ScoreResult => {
  const lines: ScoreLine[] = [];

  const raidsCleared = state.progress.filter(
    (p) => contentById(p.contentId)?.kind === "raid" && p.clears > 0,
  ).length;

  let raidPoints = 0;
  for (let i = 0; i < raidsCleared; i += 1) raidPoints += SCORE.raidWeights[i] ?? 0;

  lines.push({ label: "Raids", value: raidPoints, detail: `${raidsCleared}/${RAIDS.length} cleared` });

  const dungeons = state.progress.filter(
    (p) => contentById(p.contentId)?.kind === "dungeon" && p.clears > 0,
  ).length;
  lines.push({ label: "Dungeons", value: dungeons * SCORE.perDungeon, detail: `${dungeons} cleared` });

  const worldFirst = state.worldFirstDay !== null ? SCORE.worldFirst : 0;
  lines.push({
    label: "World First",
    value: worldFirst,
    detail: state.worldFirstDay !== null ? `day ${state.worldFirstDay}` : "not this run",
  });

  const wealth = Math.min(SCORE.wealthCap, Math.max(0, Math.round(state.gold / SCORE.wealthDivisor)));
  lines.push({ label: "Wealth", value: wealth, detail: `${Math.round(state.gold)}g` });

  const rating = Math.round(squadRating(state.roster));
  lines.push({
    label: "Strength",
    value: Math.round(rating * SCORE.powerMultiplier),
    detail: `squad rating ${rating}`,
  });

  lines.push({ label: "Renown", value: state.renown * SCORE.renownPerTier, detail: `tier ${state.renown}` });

  const penalty = -state.arrearsDays * 250;
  lines.push({
    label: "Arrears",
    value: penalty,
    detail: state.arrearsDays === 0 ? "never in debt" : `${state.arrearsDays} days in debt`,
  });

  const total = Math.max(0, sum(lines.map((l) => l.value)));
  return { total, lines, band: bandFor(state, raidsCleared) };
};

const bandFor = (state: GameState, raidsCleared: number): Band => {
  if (raidsCleared >= RAIDS.length && state.worldFirstDay !== null) return "S";
  if (raidsCleared >= RAIDS.length) return "A";
  if (raidsCleared >= 2) return "B";
  if (raidsCleared >= 1) return "C";
  return "D";
};
