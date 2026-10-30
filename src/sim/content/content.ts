import type { ContentDef } from "../types";

/**
 * The ladder, in the order a WoW character walks it:
 *
 *   farm → missions → dungeons (three tiers) → three raids
 *
 * Requirements are calibrated against the AI sweep, not against a spreadsheet
 * (docs/progression-report.md explains how). Content is gated by hero level and
 * by prerequisite clears, so a new guild physically cannot skip ahead.
 */
export const CONTENT: ContentDef[] = [
  // ── Tier 0: farm ───────────────────────────────────────────────────────────
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
    blurb: "Gather herbs and pelts. Safe, slow, and where every guild starts.",
  },
  {
    id: "old-quarry",
    name: "The Old Quarry",
    kind: "farm",
    tier: 0,
    minLevel: 6,
    minHeroes: 1,
    maxHeroes: 5,
    recommendedIlvl: 25,
    phases: [],
    gold: 12,
    xp: 22,
    loot: { count: 0, ilvlMin: 0, ilvlMax: 0 },
    requires: [],
    blurb: "Ore and stone. Better money once your people can survive the rockfalls.",
  },

  // ── Tier 1: missions ───────────────────────────────────────────────────────
  {
    id: "wolf-den",
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
    blurb: "Three heroes, one pack. The first real fight.",
  },
  {
    id: "bandit-road",
    name: "The Bandit Road",
    kind: "mission",
    tier: 1,
    minLevel: 5,
    minHeroes: 3,
    maxHeroes: 3,
    recommendedIlvl: 25,
    phases: [{ name: "Ambush", check: "mechanics", requirement: 30, share: 1 }],
    gold: 110,
    xp: 200,
    loot: { count: 1, ilvlMin: 20, ilvlMax: 35 },
    requires: [],
    blurb: "Escort work with a habit of turning into an ambush.",
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
    blurb: "Your first five-man. The first place gear actually matters.",
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
      { name: "The Climb", check: "mechanics", requirement: 170, share: 0.4 },
      { name: "Ashfall", check: "sustain", requirement: 96, share: 0.3 },
      { name: "The Summit", check: "dps", requirement: 108, share: 0.3 },
    ],
    gold: 360,
    xp: 3000,
    loot: { count: 3, ilvlMin: 115, ilvlMax: 148 },
    requires: ["sunken-temple"],
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
      { name: "First Blood", check: "dps", requirement: 520, share: 0.3 },
      { name: "The Long Dark", check: "sustain", requirement: 430, share: 0.3 },
      { name: "Obsidian", check: "dps", requirement: 580, share: 0.4 },
    ],
    gold: 1800,
    xp: 4000,
    loot: { count: 5, ilvlMin: 220, ilvlMax: 250 },
    requires: ["raid-covens"],
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
