/** All balance numbers in one place. Tuning is a data edit, not a code change. */

export const RUN_DAYS = 84;
export const ROSTER_START = 3;
export const ROSTER_CAP = 22;
export const MAX_PARTIES = 3;

export const FATIGUE = {
  raid: 22,
  dungeon: 14,
  mission: 8,
  farm: 6,
  rest: -38,
  endurancePivot: 1.15,
  enduranceDivisor: 40,
} as const;

export const SHARPNESS = {
  raid: 7,
  dungeon: 5,
  mission: 3,
  farm: 1,
  rest: -5,
  start: 60,
} as const;

export const INJURY = {
  baseChance: 0.12,
  pushMultiplier: 1.9,
  cautiousMultiplier: 0.4,
  vitalityDivisor: 40,
  daysMin: 1,
  daysMax: 5,
  healthHit: 45,
} as const;

export const HEALTH_RECOVERY_PER_DAY = 14;

export const STANCE = {
  cautious: { check: -0.1, injury: 0.4, fatigue: -4 },
  steady: { check: 0, injury: 1, fatigue: 0 },
  push: { check: 0.12, injury: 1.55, fatigue: 8 },
} as const;

export const MASTERY = {
  perPull: 0.02,
  cap: 0.3,
} as const;

export const ECONOMY = {
  startGold: 250,
  wageBudgetBase: 200,
  wageBudgetPerRenown: 120,
  arrearsScorePenalty: 250,
  partialMultiplier: 0.4,
} as const;

export const CONTRACT = {
  daysMin: 14,
  daysMax: 28,
} as const;

export const TAVERN = {
  size: 3,
  refreshFee: 120,
} as const;

export const SCORE = {
  /** Raid 1 / 2 / 3. */
  raidWeights: [4000, 6000, 8000] as readonly number[],
  perDungeon: 200,
  worldFirst: 3000,
  wealthDivisor: 10,
  wealthCap: 1500,
  powerMultiplier: 2,
  renownPerTier: 250,
} as const;

export const RENOWN = {
  perDungeon: 1,
  perRaid: 3,
  perWorldFirst: 4,
} as const;

export const EVENTS = {
  /** Chance per day of a card, once the run has started. */
  chance: 0.4,
  minDay: 3,
  /** Do not repeat a card seen in the last N draws. */
  cooldown: 4,
} as const;

export const ROLE_FIT = {
  natural: 1.0,
  trained: 0.88,
  makeshift: 0.72,
  wrong: 0.55,
} as const;

/** How much a role's specialisation helps each kind of check. */
export const ROLE_AFFINITY: Record<string, Record<string, number>> = {
  bulwark: { mitigation: 1.15, mechanics: 1.0, sustain: 1.0, dps: 0.9 },
  vanguard: { dps: 1.1, mitigation: 1.05, mechanics: 0.95, sustain: 0.9 },
  lightbringer: { sustain: 1.15, mitigation: 1.0, dps: 0.85, mechanics: 0.95 },
  oracle: { mechanics: 1.1, sustain: 1.05, dps: 0.95, mitigation: 0.95 },
  evoker: { dps: 1.15, mechanics: 1.0, sustain: 0.9, mitigation: 0.85 },
  arcanist: { dps: 1.05, sustain: 1.0, mechanics: 1.0, mitigation: 0.85 },
  assassin: { dps: 1.15, mechanics: 0.95, sustain: 0.85, mitigation: 0.9 },
  trickster: { mechanics: 1.15, dps: 1.0, sustain: 0.9, mitigation: 0.9 },
};
