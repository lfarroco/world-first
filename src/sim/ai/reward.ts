import { clamp } from "../prelude";
import type { ContentDef, GameState, Hero } from "../types";
import { CONTENT } from "../content/content";
import { bestLevel, LEVEL_CAP } from "../content/heroes";
import { EVENT_VALUE, PLANNER_VALUE, RUN_DAYS } from "../content/tuning";
import { itemLevel, isAvailable } from "../hero";
import { wageBill } from "../economy";
import { lootBonusFor } from "../facilities";
import { bestPartyFor } from "../plan";

/**
 * What the planner wants from tonight, beyond XP. The old score was
 * `xp + gold / 8`: it treated XP as the only currency and undercounted farm
 * gold (per hero) as if it were party gold. The context makes the weights a
 * function of the state, so a broke guild chases the purse and a guild short of
 * the next wall's item level chases gear.
 */
export type RewardContext = {
  /** Multiplier on gold, 0.15 when rich, 1 when full, 32 when broke. */
  goldWeight: number;
  /** Multiplier on XP, 1 while the next wall's level gate is unmet. */
  xpWeight: number;
  /** Multiplier on loot, 0 when the raid party is geared for the next wall. */
  lootWeight: number;
  /** The next uncleared wall, or null when the tier is done. */
  nextWall: ContentDef | null;
  /** The next wall's recommended item level minus the raid party's average. */
  gearGap: number;
  /** The next wall's level gate minus the raid party's average level. */
  levelGap: number;
  /** Average item level of the party the planner would send at the next wall. */
  raidIlvl: number;
};

const average = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;

const cleared = (state: GameState, id: string): number =>
  state.progress.find((p) => p.contentId === id)?.clears ?? 0;

/**
 * The next wall is the first uncleared raid; before the raiding tier it is the
 * first uncleared dungeon. Raids come first because their recommended item
 * level is the gear target the bot was missing: it stalled on the Tyrant at
 * iLvl 148–183 against a 225 recommendation while choosing more XP.
 */
export const nextWall = (state: GameState): ContentDef | null => {
  const nextRaid = CONTENT.find((c) => c.kind === "raid" && cleared(state, c.id) === 0);
  if (nextRaid) return nextRaid;
  return CONTENT.find((c) => c.kind === "dungeon" && cleared(state, c.id) === 0) ?? null;
};

export const rewardContext = (state: GameState): RewardContext => {
  const bill = wageBill(state.roster);
  // A buffer is not the remaining payroll: by day 78 there is one payday left,
  // so a 4×bill "rich" threshold can never be met and the bot chases gold it
  // cannot convert into score.
  const weeksLeft = Math.max(1, Math.ceil((RUN_DAYS - state.day + 1) / 7));
  const purseTarget = bill * Math.min(PLANNER_VALUE.purseWeeks, weeksLeft);
  const purseGap = Math.max(0, purseTarget - state.gold);
  const broke = state.arrearsDays > 0 || state.gold < 0;
  const rich = bill > 0 && state.gold >= bill * Math.min(PLANNER_VALUE.richWeeks, weeksLeft);
  const goldWeight = broke
    ? PLANNER_VALUE.goldWeightBroke
    : rich
      ? PLANNER_VALUE.goldWeightRich
      : PLANNER_VALUE.goldWeightSlack +
        (PLANNER_VALUE.goldWeightBroke - PLANNER_VALUE.goldWeightSlack) *
          clamp(purseGap / Math.max(1, bill), 0, 1);

  const wall = nextWall(state);
  const available = state.roster.filter(isAvailable);
  const party = wall ? bestPartyFor(state, wall, available) : [];
  const raidIlvl = average(party.map((h) => itemLevel(h.gear)));
  const raidLevel = party.length > 0 ? average(party.map((h) => h.level)) : bestLevel(state.roster);
  const levelGap = wall ? Math.max(0, wall.minLevel - raidLevel) : 0;
  const gearGap = wall ? Math.max(0, wall.recommendedIlvl - raidIlvl) : 0;

  // Capped heroes are counted in `rewardValue`, not here: the weight is the
  // same for every uncapped body, and a capped one earns nothing.
  const xpWeight = levelGap > 0 ? PLANNER_VALUE.xpWeightGated : PLANNER_VALUE.xpWeightReady;

  const lootWeight =
    gearGap > 0
      ? clamp(
          1 + (gearGap / 25) * PLANNER_VALUE.lootWeightPer25,
          PLANNER_VALUE.lootWeightAtZero,
          PLANNER_VALUE.lootWeightMax,
        )
      : PLANNER_VALUE.lootWeightAtZero;

  return { goldWeight, xpWeight, lootWeight, nextWall: wall, gearGap, levelGap, raidIlvl };
};

/** Party gold: farm gold is per hero, every other kind pays the party once. */
export const partyGold = (
  content: ContentDef,
  party: readonly Hero[],
  reward: { gold: number },
): number => (content.kind === "farm" ? reward.gold * party.length : reward.gold);

/**
 * What one clear's loot is worth, in XP-equivalent. The expected item level is
 * measured against the party's worst-equipped hero, because that is who gets
 * the drop. A band below the party's gear is worth nothing; a band above it is
 * worth `count × expected gain × 1.25`.
 */
export const lootValue = (
  state: GameState,
  content: ContentDef,
  party: readonly Hero[],
): number => {
  if (content.loot.count === 0 || party.length === 0) return 0;
  const expected =
    (content.loot.ilvlMin + content.loot.ilvlMax) / 2 + lootBonusFor(state.facilities);
  const worst = Math.min(...party.map((h) => itemLevel(h.gear)));
  const gain = Math.max(0, expected - worst);
  return gain * content.loot.count * (EVENT_VALUE.ilvl / 8);
};

/**
 * The full value of a night, in XP-equivalent. `reward` is the contract-scaled
 * gold/XP from `effectiveReward`, so a token repeat is priced at its token.
 */
export const rewardValue = (
  state: GameState,
  content: ContentDef,
  party: readonly Hero[],
  reward: { gold: number; xp: number },
  ctx: RewardContext,
): number => {
  const uncapped = party.filter((h) => h.level < LEVEL_CAP).length;
  const xp = reward.xp * uncapped * ctx.xpWeight;
  const gold = (partyGold(content, party, reward) / 8) * ctx.goldWeight;
  const loot = lootValue(state, content, party) * ctx.lootWeight;
  return xp + gold + loot;
};
