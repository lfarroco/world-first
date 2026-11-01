/** Domain types. Plain data only: JSON-serialisable, no classes. */

export type ClassId = "warrior" | "cleric" | "mage" | "rogue";

export type RoleId =
  | "bulwark"
  | "vanguard"
  | "lightbringer"
  | "oracle"
  | "evoker"
  | "arcanist"
  | "assassin"
  | "trickster";

export type AttrKey =
  | "might"
  | "agility"
  | "vitality"
  | "endurance"
  | "focus"
  | "discipline"
  | "awareness"
  | "composure";

export type Attributes = Record<AttrKey, number>;

export type GearSlot = "weapon" | "chest" | "helm" | "trinket";
export type Gear = Record<GearSlot, number>;

/** One item a clear dropped, before it is assigned to a hero. */
export type LootItem = {
  slot: GearSlot;
  ilvl: number;
  item?: string;
};

export type CheckType = "dps" | "mitigation" | "mechanics" | "sustain";

/** A named threat on a content phase. See content/traits.ts. */
export type AbilityId = "ash-veil" | "dread-roar";

/** One line of character with one rule attached. Cap: 3 per hero. */
export type TraitId =
  | "keen-eye"
  | "steadfast"
  | "pack-hunter"
  | "kindred-spirits"
  | "shield-wall"
  | "field-medic"
  | "mentor"
  | "pathfinder"
  | "quartermaster"
  | "student"
  | "ironhide"
  | "night-owl"
  | "scavenger"
  | "hot-headed"
  | "frail"
  | "glory-hound"
  | "slow-starter"
  | "executioner"
  | "stonewall"
  | "ritualist";

export type Stance = "cautious" | "steady" | "push";

export type SquadStatus = "a-team" | "rotation" | "bench";

export type Hidden = {
  consistency: number;
  professionalism: number;
  ambition: number;
  loyalty: number;
  pressure: number;
};

export type Contract = {
  wage: number;
  daysLeft: number;
  status: SquadStatus;
  /**
   * The hero turned down a counter-offer. His new number is final: the queue
   * shows `contract-counter` instead of the usual renewal until it is met or
   * he walks. Optional so a save written before negotiation loads.
   */
  counterRefused?: boolean;
};

export type Hero = {
  id: string;
  name: string;
  klass: ClassId;
  role: RoleId;
  /** The role the hero was made for. Fit never drifts with level growth. */
  naturalRole: RoleId;
  level: number;
  xp: number;
  attrs: Attributes;
  gear: Gear;
  hidden: Hidden;
  health: number;
  fatigue: number;
  sharpness: number;
  morale: number;
  injuryDays: number;
  daysBenched: number;
  traits: TraitId[];
  contract: Contract;
  /**
   * A bought tonic: `buffPower` is added to every check for `buffDays` more
   * days. Optional so an old save loads unbuffed. `formMod` is the one place
   * the multiplier is applied, so the screens show it as form.
   */
  buffPower?: number;
  buffDays?: number;
};

export type Candidate = {
  hero: Hero;
  fee: number;
};

/** farm → mission → dungeon → raid. The whole progression ladder. */
export type ContentKind = "farm" | "mission" | "dungeon" | "raid";

export type ContentPhase = {
  name: string;
  check: CheckType;
  requirement: number;
  share: number;
  /** A threat that makes this check harder unless a hero counters it. */
  ability?: AbilityId;
};

/** One inhabitant of a content, shown by `inspect`. Flavour with a hook: the check it pressures. */
export type ContentMob = {
  name: string;
  role: string;
  note: string;
  /** The phase check this mob is the reason for. Farms have no checks. */
  check?: CheckType;
};

/**
 * A named item the content can drop. At most one named item drops per clear,
 * so `chance` is the exact per-clear probability and a content's chances sum
 * to at most 1. On a hit it replaces one generic item; the clear still pays
 * exactly `loot.count` items.
 */
export type ContentDrop = {
  name: string;
  slot: GearSlot;
  ilvl: number;
  chance: number;
};

export type ContractColumn = "xp" | "gold" | "loot";

export type ContentDef = {
  id: string;
  name: string;
  kind: ContentKind;
  tier: number;
  /** The party's average level must reach this. */
  minLevel: number;
  minHeroes: number;
  maxHeroes: number;
  recommendedIlvl: number;
  /** Empty phases = always succeeds (farm). */
  phases: ContentPhase[];
  gold: number;
  xp: number;
  loot: { count: number; ilvlMin: number; ilvlMax: number };
  /** Content ids that must be cleared first. */
  requires: string[];
  /**
   * Missions sit on the daily contract board. Two open missions are posted at
   * full pay; the tag is the reward column the board line shows. An unposted
   * mission pays the token rate after its first clear. Other kinds have none.
   */
  contractColumn?: ContractColumn;
  /**
   * Dungeons hand over a free recruit on the first clear unless this is false.
   * Side dungeons pay in gear, not in bodies: the three ladder dungeons are
   * what fund a ten-man raid.
   */
  firstClearRecruit?: boolean;
  /** The bestiary the inspect screen prints. */
  mobs: ContentMob[];
  /** Named loot the inspect screen prints. Empty when the content drops nothing. */
  drops: ContentDrop[];
  blurb: string;
};

export type ContentProgress = {
  contentId: string;
  clears: number;
  clearedOnDay: number | null;
  attempts: number;
  bestPull: number;
};

export type Assignment = {
  contentId: string;
  heroes: string[];
  stance: Stance;
};

export type Plan = {
  /** Up to three parties. Absent slots are simply not there. */
  parties: Assignment[];
};

export type RivalId = "echoes" | "methodical" | "ravensguard";

/**
 * A rival is a guild, not a number. `guild` is a full `GameState` (with an
 * empty `rivals` array) played by the same planner the player's bot uses.
 * Everything shown on the leaderboard is read from that state; only `activity`
 * is cached, because a one-line summary is cheaper than re-reading a plan.
 */
export type Rival = {
  id: RivalId;
  name: string;
  /** Id in `PERSONALITIES`, so the same planner can play the rival's days. */
  personality: string;
  guild: GameState;
  activity: string;
};

export type RivalDef = {
  id: RivalId;
  name: string;
  personality: string;
  note: string;
};

export type EventKind =
  | "kill"
  | "wipe"
  | "clear"
  | "farm"
  | "loot"
  | "injury"
  | "level"
  | "tavern"
  | "economy"
  | "rival"
  | "morale"
  | "run"
  | "progress"
  | "unlock";

export type GameEvent = {
  id: string;
  day: number;
  kind: EventKind;
  severity: "good" | "info" | "bad";
  text: string;
  heroId?: string;
};

export type AttentionEffect =
  | { kind: "promise"; heroId: string; status: SquadStatus }
  | { kind: "rotate"; heroId: string }
  | { kind: "ignore" }
  | { kind: "renew"; heroId: string }
  | { kind: "counter"; heroId: string }
  | { kind: "meet-counter"; heroId: string }
  | { kind: "transfer"; heroId: string; accept: boolean }
  | { kind: "release"; heroId: string }
  | { kind: "acknowledge" }
  | { kind: "event"; cardId: string; optionKey: string }
  | { kind: "assign-loot" };

export type AttentionOption = {
  key: string;
  label: string;
  effect: AttentionEffect;
};

export type AttentionKind =
  | "benched-unhappy"
  | "contract-expiring"
  | "contract-counter"
  | "transfer-request"
  | "wage-over-budget"
  | "fatigue-risk"
  | "promise-due"
  | "loot-pending"
  | "event";

export type AttentionItem = {
  id: string;
  kind: AttentionKind;
  day: number;
  blocking: boolean;
  title: string;
  detail: string;
  heroId?: string;
  options: AttentionOption[];
};

export type PhaseAbilityLog = {
  id: AbilityId;
  name: string;
  countered: boolean;
  /** 1 when countered, the ability's penalty when not. */
  mult: number;
  /** Name of the hero who answered it, if any. */
  counterHero?: string;
  /** False on the pull that discovered it. */
  known: boolean;
};

export type RaidPhaseLog = {
  name: string;
  check: CheckType;
  checkLabel: string;
  value: number;
  requirement: number;
  ratio: number;
  outcome: "clean" | "pass" | "scrape" | "fail";
  offNights: string[];
  /** Traits that moved this check, for the report. */
  traits?: string[];
  ability?: PhaseAbilityLog;
};

export type EncounterPullLog = {
  index: number;
  progress: number;
  killed: boolean;
  phases: RaidPhaseLog[];
};

export type EncounterLog = {
  day: number;
  contentId: string;
  contentName: string;
  contentKind: ContentKind;
  pulls: EncounterPullLog[];
  cleared: boolean;
  bestPull: number;
  injured: string[];
  stance: Stance;
  xp: number;
  gold: number;
  /** 1 for full pay; the board's token rate when this mission was not posted. */
  payScale?: number;
  /**
   * The daily star's multiplier when this clear was on the starred area. The
   * report prints the bonus; `payScale` stays the contract board's rule.
   */
  featuredBonus?: number;
  /** Items this clear dropped, for the report after the queue is empty. */
  loot?: LootItem[];
};

/**
 * The check that stopped a pull, reduced to what the raid hub prints. The
 * full phase lives in `EncounterLog` on the report; the log needs the number
 * and the name, not a copy of the whole encounter.
 */
export type RaidLogCheck = {
  name: string;
  check: CheckType;
  value: number;
  requirement: number;
  ratio: number;
  /** The phase's threat, already resolved against the party. */
  ability?: {
    name: string;
    countered: boolean;
    mult: number;
    counterHero?: string;
  };
};

/** One pull in a raid night. `failed` is null when the pull killed the boss. */
export type RaidLogPull = {
  /** 1-based within the night. */
  index: number;
  /** The furthest phase the pull banked, 0..1. */
  progress: number;
  killed: boolean;
  failed: RaidLogCheck | null;
};

/**
 * One raid night in the hub's history. `lastEncounter` answers "what happened
 * last night"; the log answers "how long have we been stuck", which is the
 * question the race screen exists for. A night is one party's raid pull, not a
 * whole day: two raid parties in one day write two nights.
 */
export type RaidLogNight = {
  day: number;
  contentId: string;
  stance: Stance;
  cleared: boolean;
  bestPull: number;
  pulls: RaidLogPull[];
};

export type ScoreLine = {
  label: string;
  value: number;
  detail: string;
};

export type Band = "S" | "A" | "B" | "C" | "D";

export type PendingEvent = {
  cardId: string;
  day: number;
  targetHeroId: string | null;
};

/**
 * A promise the player made to a hero. The queue creates the debt, the day
 * pipeline collects it: starts are counted while the window is open, and the
 * player is told a day before it closes. Every promise resolves to kept or
 * broken — there is no silent third state.
 */
export type PromiseRecord = {
  id: string;
  heroId: string;
  madeOn: number;
  /** Last day that counts. The window is madeOn..dueOn inclusive. */
  dueOn: number;
  daysAssigned: number;
  status: "open" | "kept" | "broken";
  /**
   * The transfer request a broken promise raised has been answered. Without
   * this the request would be derived every day after the promise closes.
   */
  transferAsked?: boolean;
};

export type PendingLoot = LootItem & {
  id: string;
  day: number;
  contentId: string;
  contentName: string;
  /** The party that cleared it; the AI's conservative default uses it. */
  partyIds?: string[];
};

export type GameState = {
  seed: number;
  guildName: string;
  day: number;
  gold: number;
  renown: number;
  /**
   * Multiplier on XP earned. The player's guild uses 1; a rival's guild uses
   * `RIVAL.pace`. Optional so a save written before the field existed loads as
   * the full rate.
   */
  rewardScale?: number;
  roster: Hero[];
  plan: Plan;
  progress: ContentProgress[];
  rivals: Rival[];
  tavern: Candidate[];
  attention: AttentionItem[];
  events: GameEvent[];
  arrearsDays: number;
  worldFirstDay: number | null;
  finished: boolean;
  score: number | null;
  scoreLines: ScoreLine[] | null;
  band: Band | null;
  lastEncounter: EncounterLog | null;
  facilities: Record<"infirmary" | "forge" | "tavern" | "hall", number>;
  pendingEvent: PendingEvent | null;
  eventLog: string[];
  /**
   * `${kind}:${heroId ?? "guild"}` → last day the player answered that item.
   * An acknowledgement defers the item for a day; it never blocks the queue.
   * Optional so a save written before the field existed still loads.
   */
  attentionMutedUntil?: Record<string, number>;
  /**
   * Ids of content the guild has been told is open. Written by
   * `announceUnlocks`; a save without it is initialised silently so an old
   * save does not dump every open area into one day's digest.
   */
  knownContent?: string[];
  /**
   * Open and settled promises. Optional so a save written before the ledger
   * existed still loads; a missing ledger is an empty one.
   */
  promises?: PromiseRecord[];
  /**
   * Drops from the last resolved day that have not been assigned. Optional:
   * a save written before the field existed loads as an empty queue.
   */
  pendingLoot?: PendingLoot[];
  /**
   * The ten heroes the guild wants at the next raid. The planner prefers them
   * and the loot default funnels gear to them. Optional for old saves.
   */
  raidTeam?: string[];
  /**
   * The last raid nights, oldest first. Written by `resolveDay`, bounded by
   * `RAID_LOG.maxNights`. Optional: a save written before the field existed
   * loads with no history, and the hub shows progress without the pull rows.
   */
  raidLog?: RaidLogNight[];
  /**
   * The day the player last signed a rival's hero away. A rival answers with a
   * counter-offer card inside two weeks; optional for old saves.
   */
  poachHeat?: number;
};

export type { Rng } from "./rng";
