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

export type CheckType = "dps" | "mitigation" | "mechanics" | "sustain";

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
};

export type Hero = {
  id: string;
  name: string;
  klass: ClassId;
  role: RoleId;
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
  contract: Contract;
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
};

export type ContentDef = {
  id: string;
  name: string;
  kind: ContentKind;
  tier: number;
  /** Every hero in the party must be at least this level. */
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

export type Rival = {
  id: RivalId;
  name: string;
  power: number;
  /** 0..3 raids cleared. */
  raidsCleared: number;
  bestPull: number;
  pulls: number;
  activity: string;
  worldFirstDay: number | null;
};

export type RivalDef = {
  id: RivalId;
  name: string;
  raidAppetite: number;
  growth: number;
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
  | "progress";

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
  | { kind: "release"; heroId: string }
  | { kind: "acknowledge" };

export type AttentionOption = {
  key: string;
  label: string;
  effect: AttentionEffect;
};

export type AttentionKind = "benched-unhappy" | "contract-expiring" | "wage-over-budget" | "fatigue-risk";

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

export type RaidPhaseLog = {
  name: string;
  check: CheckType;
  checkLabel: string;
  value: number;
  requirement: number;
  ratio: number;
  outcome: "clean" | "pass" | "scrape" | "fail";
  offNights: string[];
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
};

export type ScoreLine = {
  label: string;
  value: number;
  detail: string;
};

export type Band = "S" | "A" | "B" | "C" | "D";

export type GameState = {
  seed: number;
  guildName: string;
  day: number;
  gold: number;
  renown: number;
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
};

export type { Rng } from "./rng";
