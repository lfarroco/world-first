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
 * The two lines the screens draw on fatigue. `tired` is a nudge; `exhausted`
 * is the state the daily queue calls "running on empty" and the reason a hero
 * should not be sent out. Both live here so the badge, the picker and the
 * attention line cannot drift apart.
 */
export const FATIGUE_LINES = {
  tired: 45,
  exhausted: 70,
} as const;

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

/**
 * The raid hub's history. One entry is one raid night: its pulls, the best
 * pull and the check that stopped each one. Forty nights is more than a full
 * run's raid nights for one guild, and the log is a screen, not a replay file.
 *
 * Rivals are cleared by the world tick: their race line and progress rows
 * already answer "what are they doing", and three more logs only grew the save
 * (L94 measured a 164–251 kB save).
 */
export const RAID_LOG = {
  maxNights: 40,
} as const;

export const ECONOMY = {
  startGold: 250,
  wageBudgetBase: 200,
  wageBudgetPerRenown: 150,
  arrearsScorePenalty: 250,
  partialMultiplier: 0.4,
} as const;

/**
 * The daily contract board. Two of the guild's open missions are posted at
 * full pay; every other mission pays this fraction of its gold and XP after
 * its first clear. First clears are always full, so the board taxes the repeat
 * faucet, not learning a new area.
 *
 * The AI will not spend a night on a token repeat (`ai/planner.ts`); a human
 * may. The 0.25 is the human price: a token, not a lock. The Drowned Mill's
 * value break-even against the best farm is ~0.086, so a human who ignores
 * the board still gets a real but poor night. The measured effect is in
 * progression-report.md §3.4.
 */
export const CONTRACT_BOARD = {
  tokenPay: 0.25,
  /** How many open missions the daily board posts at full pay. */
  postedCount: 2,
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

/**
 * The renewal counter-offer. A contract inside the window may be renewed at
 * market (safe) or countered 12% under (a cut, with a refusal cost).
 *
 * Acceptance is a threshold, not a roll: the hero takes the cut when it is
 * above his floor. The floor moves with visible morale and days left and with
 * hidden loyalty, so "he looks ready to talk" is a read of the man, not a
 * number. A refusal is final — he names a higher number — so the counter is
 * one decision, not a re-roll.
 *
 * The first numbers (15% cut, 22% maximum, a narrow loyalty band) accepted
 * 398 of 401 counters in 30 runs: a 15% wage cut with no decision. The band
 * below was widened so a happy hero still refuses about one time in four.
 */
export const NEGOTIATION = {
  windowDays: 7,
  /** The cut the queue offers, as a fraction of the market renewal wage. */
  counterDiscount: 0.12,
  /** The largest cut a happy, loyal, unhurried hero will take. */
  maxDiscount: 0.15,
  /** Below this morale the counter option is hidden: no trap options. */
  moraleFloor: 40,
  /** The raise a refused hero demands instead. Big enough that a 12% cut is a
   * real gamble: at the measured ~80% acceptance, the expected saving is 4.6%. */
  counterPenalty: 0.25,
  /**
   * The visible estimate must clear the offered cut by this margin before the
   * label says he looks ready. Without it the hint was true for almost every
   * hero and the counter became a button, not a read (L88).
   */
  hintMargin: 1.1,
  /** Morale for a hero who took the cut. Half a renewal's +8. */
  acceptMorale: 4,
  refuseMorale: -6,
  /** Refusing a transfer request costs the hero this much morale. */
  transferMorale: -10,
  /** The buying guild pays half the hero's recruit fee. */
  transferFeeScale: 0.5,
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

/**
 * How the planner prices a night. The old score was `xp + gold / 8`: it treated
 * XP as the only currency and undercounted farm gold (per hero) as if it were
 * party gold. These weights make the choice depend on the state: the purse, the
 * next wall's level gate, and the raid party's gear gap.
 *
 * Units: one unit is one point of XP-equivalent. Gold converts at 8g = 1, the
 * same rate the old score used; one hero-item-level converts at
 * `EVENT_VALUE.ilvl / 8` = 1.25, the card price for permanent gear.
 */
/**
 * Loot assignment. The default is the largest upgrade, with a small preference
 * for a hero on the stable raid team; the player may overrule it once.
 */
export const LOOT = {
  /** Extra item-level-equivalent priority for a hero on the raid team. */
  teamBias: 4,
} as const;

export const PLANNER_VALUE = {
  /** Weeks of wages the planner wants in the purse before it stops chasing gold. */
  purseWeeks: 2,
  /** Gold weight when the purse is full. */
  goldWeightSlack: 1,
  /** Gold weight when the guild is in arrears or the purse is empty. */
  goldWeightBroke: 32,
  /** Gold weight when the purse is more than `richWeeks` of wages. */
  goldWeightRich: 0.15,
  /** Weeks of wages above which gold stops being a need. */
  richWeeks: 4,
  /** XP weight while the next wall's level gate is unmet. */
  xpWeightGated: 1,
  /** XP weight once the gate is met but the raid party is not at the cap. */
  xpWeightReady: 0.4,
  /** Loot weight at no gear gap; rises by `lootWeightPer25` per 25 iLvl. */
  lootWeightAtZero: 0,
  lootWeightPer25: 2,
  /** Cap on the loot weight. 12 × 1.25 = 15 XP per hero-item-level. */
  lootWeightMax: 12,
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
