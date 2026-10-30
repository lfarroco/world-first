import type { AttrKey, ClassId, RoleId } from "../types";

export type RoleDef = {
  id: RoleId;
  name: string;
  klass: ClassId;
  /** Weights sum to 1.0. This is the whole "role" mechanic: same hero, different tool. */
  weights: Partial<Record<AttrKey, number>>;
  description: string;
};

export const ROLES: RoleDef[] = [
  {
    id: "bulwark",
    name: "Bulwark",
    klass: "warrior",
    weights: { might: 0.35, vitality: 0.3, discipline: 0.2, awareness: 0.15 },
    description: "Holds the line and absorbs the big hit.",
  },
  {
    id: "vanguard",
    name: "Vanguard",
    klass: "warrior",
    weights: { might: 0.45, agility: 0.2, vitality: 0.2, discipline: 0.15 },
    description: "Threat and damage; takes pressure off the DPS.",
  },
  {
    id: "lightbringer",
    name: "Lightbringer",
    klass: "cleric",
    weights: { focus: 0.45, discipline: 0.2, awareness: 0.2, composure: 0.15 },
    description: "Maximum throughput healing.",
  },
  {
    id: "oracle",
    name: "Oracle",
    klass: "cleric",
    weights: { focus: 0.35, awareness: 0.3, discipline: 0.2, composure: 0.15 },
    description: "Buffs and dispels; raises the party ceiling.",
  },
  {
    id: "evoker",
    name: "Evoker",
    klass: "mage",
    weights: { focus: 0.55, composure: 0.2, awareness: 0.15, endurance: 0.1 },
    description: "Burst windows; excels on enrage checks.",
  },
  {
    id: "arcanist",
    name: "Arcanist",
    klass: "mage",
    weights: { focus: 0.45, endurance: 0.25, awareness: 0.2, composure: 0.1 },
    description: "Sustained damage; better on long fights.",
  },
  {
    id: "assassin",
    name: "Assassin",
    klass: "rogue",
    weights: { agility: 0.45, might: 0.25, composure: 0.2, focus: 0.1 },
    description: "Single-target burst; kills the add.",
  },
  {
    id: "trickster",
    name: "Trickster",
    klass: "rogue",
    weights: { agility: 0.35, awareness: 0.3, composure: 0.2, focus: 0.15 },
    description: "Debuffs, interrupts, mechanics.",
  },
];

export const roleById = (id: RoleId): RoleDef => {
  const role = ROLES.find((r) => r.id === id);
  if (!role) throw new Error(`Unknown role: ${id}`);
  return role;
};

export const rolesForClass = (klass: ClassId): RoleDef[] =>
  ROLES.filter((r) => r.klass === klass);

export const CLASS_LABEL: Record<ClassId, string> = {
  warrior: "Warrior",
  cleric: "Cleric",
  mage: "Mage",
  rogue: "Rogue",
};

export const CLASS_IDS: ClassId[] = ["warrior", "cleric", "mage", "rogue"];
