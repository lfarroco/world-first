import type { ContentDef } from "../types";

/**
 * The ladder, in the order a WoW character walks it:
 *
 *   farm → missions → dungeons (four, three of them on the ladder) → three raids
 *
 * Requirements are calibrated against the AI sweep, not against a spreadsheet
 * (docs/progression-report.md explains how). Content is gated by prerequisite
 * clears, roster size and the party's average level, so a new guild physically
 * cannot skip ahead. `availableContent` hides what the guild cannot field.
 *
 * Each band carries more than one job, and the reward columns are the choice:
 * a gold run, an XP run and a loot run sit side by side. A farm is the safe
 * floor; a mission is three bodies; a dungeon is the gear ladder. The AI sweep
 * is what keeps a side job from becoming the only job (docs/progression-report.md §1.1).
 *
 * `inspect <id>` prints `mobs` and `drops` exactly as the sim uses them, so
 * every number here is a claim the game can be held to.
 */
export const CONTENT: ContentDef[] = [
  // ── Tier 0: farms ─────────────────────────────────────────────────────────
  {
    id: "emberwood",
    name: "Emberwood",
    kind: "farm",
    tier: 0,
    minLevel: 1,
    minHeroes: 1,
    maxHeroes: 5,
    recommendedIlvl: 10,
    phases: [],
    gold: 6,
    xp: 10,
    loot: { count: 0, ilvlMin: 0, ilvlMax: 0 },
    requires: [],
    mobs: [
      { name: "Emberwood Boar", role: "Game", note: "Hunted for pelts. It runs before it fights." },
      { name: "Timber Wolf", role: "Beast", note: "Rarely alone. The packs keep the wood honest." },
    ],
    drops: [],
    blurb: "Gather herbs and pelts. Safe, slow, and where every guild starts.",
  },
  {
    id: "old-quarry",
    name: "The Old Quarry",
    kind: "farm",
    tier: 0,
    minLevel: 5,
    minHeroes: 1,
    maxHeroes: 5,
    recommendedIlvl: 22,
    phases: [],
    gold: 14,
    xp: 6,
    loot: { count: 0, ilvlMin: 0, ilvlMax: 0 },
    requires: [],
    mobs: [
      { name: "Quarry Bat", role: "Vermin", note: "Nests in the shafts; more nuisance than danger." },
      { name: "Rubble Golem", role: "Hazard", note: "A rockfall with opinions. The reason the pay is better." },
    ],
    drops: [],
    blurb: "Ore and stone. Twice the coin of the wood, half the lesson.",
  },
  {
    id: "whisper-glade",
    name: "Whispering Glade",
    kind: "farm",
    tier: 0,
    minLevel: 10,
    minHeroes: 1,
    maxHeroes: 5,
    recommendedIlvl: 40,
    phases: [],
    gold: 3,
    xp: 22,
    loot: { count: 0, ilvlMin: 0, ilvlMax: 0 },
    requires: [],
    mobs: [
      { name: "Glade Sprite", role: "Fey", note: "Curious, not hostile. It follows anyone who listens." },
      { name: "Mossback Stag", role: "Beast", note: "Old and slow. The glade pays in patience, not pelts." },
    ],
    drops: [],
    blurb: "Old magic in quiet ground. The cheapest place to learn, and the worst place to earn.",
  },

  // ── Tier 1: missions ───────────────────────────────────────────────────────
  {
    id: "warrens",
    contractColumn: "loot",
    name: "The Warrens",
    kind: "mission",
    tier: 1,
    minLevel: 1,
    minHeroes: 3,
    maxHeroes: 3,
    recommendedIlvl: 8,
    phases: [{ name: "The Cellar", check: "sustain", requirement: 12, share: 1 }],
    gold: 30,
    xp: 60,
    loot: { count: 1, ilvlMin: 4, ilvlMax: 10 },
    requires: [],
    mobs: [
      { name: "Warren Rat", role: "Vermin", note: "Too many to fight cleanly. Endurance, not damage, wins.", check: "sustain" },
      { name: "Rat King", role: "Brood leader", note: "Sits at the back and sends the others. Kill the nest.", check: "sustain" },
    ],
    drops: [
      { name: "Warren Fang", slot: "weapon", ilvl: 10, chance: 0.18 },
      { name: "Ratcatcher's Charm", slot: "trinket", ilvl: 9, chance: 0.12 },
    ],
    blurb: "Rats in the cellar. Your first contract, and the one that teaches the ledger.",
  },
  {
    id: "wolf-den",
    contractColumn: "xp",
    name: "The Wolf Den",
    kind: "mission",
    tier: 1,
    minLevel: 1,
    minHeroes: 3,
    maxHeroes: 3,
    recommendedIlvl: 12,
    phases: [{ name: "The Den", check: "dps", requirement: 16, share: 1 }],
    gold: 70,
    xp: 120,
    loot: { count: 1, ilvlMin: 8, ilvlMax: 18 },
    requires: [],
    mobs: [
      { name: "Grey Wolf", role: "Pack", note: "Circles and bites. Three heroes can hold a line; two cannot.", check: "dps" },
      { name: "Wolf Matriarch", role: "Pack leader", note: "Calls the pack in waves. The den is a damage race.", check: "dps" },
    ],
    drops: [
      { name: "Wolf-Fang Cleaver", slot: "weapon", ilvl: 18, chance: 0.2 },
      { name: "Cured Pelt Vest", slot: "chest", ilvl: 16, chance: 0.14 },
    ],
    blurb: "Three heroes, one pack. The first real fight.",
  },
  {
    id: "drowned-mill",
    contractColumn: "xp",
    name: "The Drowned Mill",
    kind: "mission",
    tier: 1,
    minLevel: 4,
    minHeroes: 3,
    maxHeroes: 3,
    recommendedIlvl: 20,
    phases: [{ name: "The Wheelhouse", check: "mechanics", requirement: 22, share: 1 }],
    gold: 30,
    // The XP run. It pays almost nothing and drops nothing, so it is only
    // worth a night when levels are the bottleneck. Bandit Road is the coin
    // and the loot at the same band (L68).
    xp: 260,
    loot: { count: 0, ilvlMin: 0, ilvlMax: 0 },
    requires: [],
    mobs: [
      { name: "Waterlogged Hound", role: "Undead", note: "Fast in the shallows, slow on dry stone. Use the stairs.", check: "mechanics" },
      { name: "Drowned Miller", role: "Wraith", note: "Still turning a wheel that is not there. Time the room.", check: "mechanics" },
    ],
    drops: [],
    blurb: "Something in the wheelhouse. It pays little and teaches a lot.",
  },
  {
    id: "bandit-road",
    contractColumn: "gold",
    name: "The Bandit Road",
    kind: "mission",
    tier: 1,
    minLevel: 5,
    minHeroes: 3,
    maxHeroes: 3,
    recommendedIlvl: 25,
    phases: [{ name: "Ambush", check: "mechanics", requirement: 30, share: 1 }],
    gold: 110,
    // The coin-and-gear run of the band. The XP is deliberately below the
    // Drowned Mill's: one night can pay levels or pay a purse, not both (L68).
    xp: 120,
    loot: { count: 1, ilvlMin: 20, ilvlMax: 35 },
    requires: [],
    mobs: [
      { name: "Road Archer", role: "Bandit", note: "Shoots from the treeline. Break line of sight or break first.", check: "mechanics" },
      { name: "Bandit Captain", role: "Bandit", note: "Fights in the open and calls the ambush early. Punish the call.", check: "mechanics" },
    ],
    drops: [
      { name: "Roadkeeper's Blade", slot: "weapon", ilvl: 34, chance: 0.18 },
      { name: "Bandit's Purse", slot: "trinket", ilvl: 30, chance: 0.14 },
    ],
    blurb: "Escort work with a habit of turning into an ambush.",
  },
  {
    id: "toll-house",
    contractColumn: "gold",
    name: "The Toll House",
    kind: "mission",
    tier: 1,
    minLevel: 9,
    minHeroes: 3,
    maxHeroes: 3,
    recommendedIlvl: 30,
    phases: [{ name: "The Gate", check: "mechanics", requirement: 34, share: 1 }],
    gold: 260,
    xp: 40,
    loot: { count: 0, ilvlMin: 0, ilvlMax: 0 },
    requires: [],
    mobs: [
      { name: "Gate Hound", role: "Guard", note: "Holds the arch. The whole fight is who owns the doorway.", check: "mechanics" },
      { name: "Toll Collector", role: "Boss", note: "Counts coin while his sword counts seconds.", check: "mechanics" },
    ],
    drops: [],
    blurb: "A toll house that stopped paying its toll. The heaviest purse on the road.",
  },
  {
    id: "plundered-vault",
    contractColumn: "loot",
    name: "The Plundered Vault",
    kind: "mission",
    tier: 1,
    minLevel: 14,
    minHeroes: 3,
    maxHeroes: 3,
    recommendedIlvl: 42,
    phases: [{ name: "The Vault", check: "mechanics", requirement: 44, share: 1 }],
    gold: 40,
    xp: 60,
    loot: { count: 2, ilvlMin: 36, ilvlMax: 52 },
    requires: [],
    mobs: [
      { name: "Gilded Sentry", role: "Construct", note: "Walks a fixed line. Learn it and it never touches you.", check: "mechanics" },
      { name: "Vault Warden", role: "Boss", note: "Seals a door each time it is hit. Two items, one way out.", check: "mechanics" },
    ],
    drops: [
      { name: "Vaultwarden's Key", slot: "trinket", ilvl: 50, chance: 0.16 },
      { name: "Gilded Coffer Plate", slot: "chest", ilvl: 48, chance: 0.13 },
      { name: "Vaultsteel Dirk", slot: "weapon", ilvl: 50, chance: 0.11 },
    ],
    blurb: "Opened from the inside. Two items guaranteed, and something still waiting.",
  },

  // ── Tier 2: dungeons ───────────────────────────────────────────────────────
  {
    id: "hollow-crypt",
    name: "Hollow Crypt",
    kind: "dungeon",
    tier: 2,
    minLevel: 10,
    minHeroes: 4,
    maxHeroes: 5,
    recommendedIlvl: 40,
    phases: [
      { name: "The Descent", check: "dps", requirement: 42, share: 0.5 },
      { name: "The Warden", check: "mitigation", requirement: 46, share: 0.5 },
    ],
    gold: 120,
    xp: 500,
    loot: { count: 2, ilvlMin: 40, ilvlMax: 62 },
    requires: [],
    mobs: [
      { name: "Crypt Rat", role: "Vermin", note: "Packs in the dark. Clear them before the Warden wakes.", check: "dps" },
      { name: "Bone Warden", role: "Elite", note: "Holds the last door. Hits like the door is the point.", check: "mitigation" },
      { name: "The Warden", role: "Boss", note: "Old stone and older orders. Kill it before it kills the light.", check: "mitigation" },
    ],
    drops: [
      { name: "Cryptsteel Blade", slot: "weapon", ilvl: 60, chance: 0.18 },
      { name: "Warden's Bulwark", slot: "chest", ilvl: 58, chance: 0.13 },
      { name: "Gravewarden's Sigil", slot: "trinket", ilvl: 56, chance: 0.11 },
    ],
    blurb: "Your first five-man. The first place gear actually matters.",
  },
  {
    id: "wailing-mines",
    name: "The Wailing Mines",
    kind: "dungeon",
    tier: 2,
    minLevel: 16,
    minHeroes: 4,
    maxHeroes: 5,
    recommendedIlvl: 55,
    phases: [
      { name: "The Side Shaft", check: "mechanics", requirement: 62, share: 0.5 },
      { name: "The Deep Gallery", check: "sustain", requirement: 40, share: 0.5 },
    ],
    gold: 140,
    xp: 300,
    loot: { count: 3, ilvlMin: 44, ilvlMax: 64 },
    requires: [],
    // A side dungeon: it pays in gear, not in a free body. The three ladder
    // dungeons are what fund the raid roster.
    firstClearRecruit: false,
    mobs: [
      { name: "Tunnel Crawler", role: "Vermin", note: "Drops from the ceiling. Watch the dark above the lantern.", check: "mechanics" },
      { name: "Wailing Shade", role: "Undead", note: "Screams until the gallery answers. Silence it fast.", check: "sustain" },
      { name: "Mine Warden", role: "Boss", note: "Sealed the shaft from the other side. Pays in ore and teeth.", check: "mechanics" },
    ],
    drops: [
      { name: "Miner's Last Lamp", slot: "trinket", ilvl: 62, chance: 0.15 },
      { name: "Wailing Pick", slot: "weapon", ilvl: 63, chance: 0.13 },
      { name: "Tunnel Plate", slot: "chest", ilvl: 58, chance: 0.11 },
    ],
    blurb: "A side shaft the dwarves sealed. Rich, loud, and it does not care who hears.",
  },
  {
    id: "sunken-temple",
    name: "Sunken Temple",
    kind: "dungeon",
    tier: 2,
    minLevel: 22,
    minHeroes: 4,
    maxHeroes: 5,
    recommendedIlvl: 80,
    phases: [
      { name: "Flooded Halls", check: "sustain", requirement: 65, share: 0.5 },
      { name: "The Idol", check: "dps", requirement: 74, share: 0.5 },
    ],
    gold: 180,
    xp: 900,
    loot: { count: 2, ilvlMin: 78, ilvlMax: 108 },
    requires: ["hollow-crypt"],
    mobs: [
      { name: "Drowned Acolyte", role: "Cultist", note: "Prays while the water rises. Every second costs a healer.", check: "sustain" },
      { name: "Temple Guardian", role: "Construct", note: "Wakes only when the Idol is touched.", check: "dps" },
      { name: "The Idol", role: "Boss", note: "Does not move. Does not need to. Break it before the hall fills.", check: "dps" },
    ],
    drops: [
      { name: "Idol of the Deep", slot: "trinket", ilvl: 106, chance: 0.17 },
      { name: "Tidebound Harness", slot: "chest", ilvl: 102, chance: 0.13 },
    ],
    blurb: "Long fights. Healers earn their wage here.",
  },
  {
    id: "ashen-spire",
    name: "Ashen Spire",
    kind: "dungeon",
    tier: 2,
    minLevel: 35,
    minHeroes: 4,
    maxHeroes: 5,
    recommendedIlvl: 120,
    phases: [
      { name: "The Climb", check: "mechanics", requirement: 170, share: 0.4, ability: "ash-veil" },
      { name: "Ashfall", check: "sustain", requirement: 96, share: 0.3 },
      { name: "The Summit", check: "dps", requirement: 108, share: 0.3 },
    ],
    gold: 360,
    xp: 3000,
    loot: { count: 3, ilvlMin: 115, ilvlMax: 148 },
    requires: ["sunken-temple"],
    mobs: [
      { name: "Ash Cultist", role: "Cultist", note: "Chants behind the veil. The Climb is a positioning test.", check: "mechanics" },
      { name: "Cinder Hound", role: "Beast", note: "Burns the ground behind it. Keep moving up.", check: "dps" },
      { name: "The Veiled One", role: "Elite", note: "Fights from inside the ash. You cannot hit what you cannot see.", check: "mechanics" },
      { name: "Spire Sentinel", role: "Boss", note: "Holds the summit. The last check before raiding.", check: "sustain" },
    ],
    drops: [
      { name: "Ashfall Greatblade", slot: "weapon", ilvl: 146, chance: 0.15 },
      { name: "Veilwalker's Crown", slot: "helm", ilvl: 142, chance: 0.12 },
      { name: "Spirebound Aegis", slot: "chest", ilvl: 138, chance: 0.1 },
    ],
    blurb: "The last dungeon before raiding. It is a gear check with a view.",
  },

  // ── Tier 3: raids ──────────────────────────────────────────────────────────
  {
    id: "raid-gatewarden",
    name: "Obsidian Citadel — Gatewarden",
    kind: "raid",
    tier: 3,
    minLevel: 28,
    minHeroes: 10,
    maxHeroes: 10,
    recommendedIlvl: 150,
    phases: [
      { name: "The Gate", check: "mitigation", requirement: 225, share: 0.3 },
      { name: "Shield Wall", check: "dps", requirement: 240, share: 0.3 },
      { name: "Last Stand", check: "mitigation", requirement: 255, share: 0.4 },
    ],
    gold: 900,
    xp: 3000,
    loot: { count: 4, ilvlMin: 148, ilvlMax: 172 },
    requires: ["ashen-spire"],
    mobs: [
      { name: "Obsidian Guard", role: "Elite", note: "Two ranks, shields locked. The Gate is a tank check.", check: "mitigation" },
      { name: "Shieldbearer", role: "Elite", note: "Feeds the wall. Burn them or never break through.", check: "dps" },
      { name: "Gatewarden Oros", role: "Boss", note: "Ten heroes, three phases, and a gate that does not open for less.", check: "mitigation" },
    ],
    drops: [
      { name: "Gatewarden's Bulwark", slot: "chest", ilvl: 170, chance: 0.16 },
      { name: "Oros' Iron Will", slot: "trinket", ilvl: 168, chance: 0.12 },
      { name: "Citadel Gateblade", slot: "weapon", ilvl: 171, chance: 0.1 },
    ],
    blurb: "Ten heroes, three phases, and a gate that does not open for less.",
  },
  {
    id: "raid-covens",
    name: "Obsidian Citadel — Twin Covens",
    kind: "raid",
    tier: 3,
    minLevel: 40,
    minHeroes: 10,
    maxHeroes: 10,
    recommendedIlvl: 185,
    phases: [
      { name: "Split Focus", check: "dps", requirement: 380, share: 0.35 },
      { name: "Hex Volley", check: "mechanics", requirement: 560, share: 0.3 },
      { name: "Attrition", check: "sustain", requirement: 320, share: 0.35 },
    ],
    gold: 1200,
    xp: 3000,
    loot: { count: 4, ilvlMin: 182, ilvlMax: 205 },
    requires: ["raid-gatewarden"],
    mobs: [
      { name: "Coven Acolyte", role: "Cultist", note: "Heals the sisters. The first job is the adds.", check: "sustain" },
      { name: "Hex Sister", role: "Boss", note: "Casts while her twin tanks. Interrupt or drown in hexes.", check: "mechanics" },
      { name: "The Twin Covens", role: "Boss", note: "Two bosses at once. The composition check.", check: "dps" },
    ],
    drops: [
      { name: "Coven Hexblade", slot: "weapon", ilvl: 203, chance: 0.15 },
      { name: "Twin Sigil", slot: "trinket", ilvl: 200, chance: 0.12 },
      { name: "Covenant Shroud", slot: "chest", ilvl: 198, chance: 0.1 },
    ],
    blurb: "Two bosses at once. The composition check.",
  },
  {
    id: "raid-tyrant",
    name: "Obsidian Citadel — The Tyrant",
    kind: "raid",
    tier: 3,
    minLevel: 52,
    minHeroes: 10,
    maxHeroes: 10,
    recommendedIlvl: 225,
    phases: [
      { name: "First Blood", check: "dps", requirement: 750, share: 0.3 },
      { name: "The Long Dark", check: "sustain", requirement: 620, share: 0.3, ability: "dread-roar" },
      { name: "Obsidian", check: "dps", requirement: 835, share: 0.4 },
    ],
    gold: 1800,
    xp: 4000,
    loot: { count: 5, ilvlMin: 220, ilvlMax: 250 },
    requires: ["raid-covens"],
    mobs: [
      { name: "Obsidian Reaver", role: "Elite", note: "Clears the floor. The Tyrant does not fight alone.", check: "dps" },
      { name: "Tyrant's Herald", role: "Caster", note: "The roar is his. Kill the voice and the dark lifts.", check: "sustain" },
      { name: "The Obsidian Tyrant", role: "Boss", note: "The last door. Whoever opens it first owns the tier.", check: "dps" },
    ],
    drops: [
      { name: "Tyrant's Obsidian Crown", slot: "helm", ilvl: 248, chance: 0.15 },
      { name: "Worldbreaker", slot: "weapon", ilvl: 250, chance: 0.13 },
      { name: "Obsidian Heart", slot: "trinket", ilvl: 246, chance: 0.11 },
      { name: "Tyrantplate", slot: "chest", ilvl: 244, chance: 0.09 },
    ],
    blurb: "The last door. Whoever opens it first owns the tier.",
  },
];

export const contentById = (id: string): ContentDef | undefined => CONTENT.find((c) => c.id === id);

export const RAIDS = CONTENT.filter((c) => c.kind === "raid");
export const DUNGEONS = CONTENT.filter((c) => c.kind === "dungeon");
export const MISSIONS = CONTENT.filter((c) => c.kind === "mission");
export const FARMS = CONTENT.filter((c) => c.kind === "farm");

export const KIND_LABEL: Record<ContentDef["kind"], string> = {
  farm: "Farm",
  mission: "Mission",
  dungeon: "Dungeon",
  raid: "Raid",
};
