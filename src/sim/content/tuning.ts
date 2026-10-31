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
  /** Injury chance rises with the hero's fatigue: ×1.8 at 100, ×1.0 at 0. */
  fatigueMultiplier: 0.8,
} as const;

export const HEALTH_RECOVERY_PER_DAY = 14;

/**
 * The line the planner uses to pull a hero out of the plan. It is also what an
 * event card's fatigue cost means: a push that puts a hero over this line costs
 * the night, not a percentage of his output.
 */
export const REST = {
  exhausted: 84,
} as const;

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
  wageBudgetPerRenown: 150,
  arrearsScorePenalty: 250,
  partialMultiplier: 0.4,
} as const;

export const CONTRACT = {
  daysMin: 14,
  daysMax: 28,
  /**
   * Renewal re-prices the contract to the hero's current level plus this
   * premium. Without it a starter who reaches level 60 still pays the level-1
   * wage, and the wage budget — the design's "real constraint" — never binds.
   * The premium replaces the old wage; it does not compound with it.
   */
  renewPremium: 1.0,
} as const;

/**
 * A promise of playing time. The player has a week to give the hero
 * `startsRequired` starts; anything less is a broken promise.
 */
export const PROMISE = {
  windowDays: 7,
  startsRequired: 3,
  keptMorale: 5,
  brokenMorale: -15,
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

export const RIVAL = {
  /**
   * Global difficulty dial for the race: the multiplier on XP a rival guild
   * earns. 1 makes a rival exactly as fast as the player; 0.9 makes it level
   * about one step slower. The rivals now run the planner, so the dial is no
   * longer a growth rate in a compressed model — it is the player's own reward
   * pipeline, scaled. Measured 2026-10-31 on the standard 20 seeds per
   * personality: with 3 rivals the player holds its documented line (23,515 /
   * 24,293 / 20,814; World First 3/20, 6/20, 3/20), the rivals average
   * 23.4–23.9k, and the player's average rank is 2.35–2.90 of 4. See
   * progression-report.md §3.2.
   */
  pace: 0.9,
} as const;

/**
 * Zero-sum payoff weights for an event card, in gold, and the one scale
 * `src/sim/ai/cards.ts` uses to compare the options of a card. Hand-set; each
 * line names the in-game number it came from, and the check is the per-card
 * trace in progression-report.md §5.4, not the arithmetic.
 */
export const EVENT_VALUE = {
  /**
   * One XP. No shipped card pays XP; the number comes from the band trade: the
   * Wolf Den pays 60 XP and 40g more than the Warrens, plus four item levels.
   */
  xp: 0.5,
  /** One morale point. moraleMod spans 0.952–1.06, so 10 points is 1.2% of a
   *  check — about three item levels on one hero. */
  morale: 2,
  /** One item level on a hero. Anchored on the merchant card's own price:
   *  300g for a 40 iLvl chest. Permanent gear is worth more than a night. */
  ilvl: 10,
  /** One day a hero cannot deploy: the farm gold he would have earned, his
   *  daily wage, and the substitute's lost output. A raid body costs more,
   *  which the caller applies. */
  injuryDay: 45,
  /** One percentage point of a hero's output lost to fatigue. condMod moves
   *  0.38 over 70 points, so a 20-point push is about a tenth of a hero. */
  fatigue: 2,
  /** One renown point when the wage bill is slack: half the weekly budget
   *  (150g) and 250 final score (SCORE.renownPerTier). */
  renown: 150,
  /** One renown point when the bill is at the budget: the headroom is live. */
  renownTight: 300,
} as const;

export const EVENTS = {
  /** Chance per day of a card, once the run has started. */
  chance: 0.4,
  minDay: 3,
  /** Do not repeat a card seen in the last N draws. */
  cooldown: 4,
} as const;

/** Trait rolls at hero creation. */
export const TRAIT_ROLL = {
  /** Chance of the class counter (Keen Eye / Steadfast). */
  counter: 0.3,
  /** Chance of one general trait (bond, craft or flaw). */
  general: 0.4,
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
