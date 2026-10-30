import { clamp, sum } from "./prelude";
import type { Attributes, AttrKey, CheckType, Gear, Hero, RoleId } from "./types";
import { LEVEL_CAP } from "./content/heroes";
import { CHECK_POWER_WEIGHTS, CLASS_CHECK_WEIGHT } from "./content/classes";
import { ROLES, roleById } from "./content/roles";
import { ROLE_AFFINITY, ROLE_FIT } from "./content/tuning";

/** Average equipped item level, rounded. The headline number players trade in. */
export const itemLevel = (gear: Gear): number =>
  Math.round((gear.weapon + gear.chest + gear.helm + gear.trinket) / 4);

/**
 * Gear multiplies output rather than adding attributes, so heroes stay
 * recognisable and gear never flattens everyone into one number.
 */
export const gearFactor = (hero: Hero): number => 0.55 + itemLevel(hero.gear) / 260;

export const roleScore = (attrs: Attributes, roleId: RoleId): number => {
  const role = roleById(roleId);
  let score = 0;
  for (const [key, weight] of Object.entries(role.weights) as [keyof Attributes, number][]) {
    score += (attrs[key] / 20) * weight;
  }
  return clamp(score, 0, 1);
};

export type RoleFitResult = {
  roleId: RoleId;
  score: number;
  fit: keyof typeof ROLE_FIT;
};

/** Best role for a hero, and the fit multiplier that role would produce. */
export const bestRole = (hero: Hero): RoleFitResult => {
  let best: RoleFitResult = { roleId: "bulwark", score: 0, fit: "natural" };
  for (const role of ROLES.filter((r) => r.klass === hero.klass)) {
    const score = roleScore(hero.attrs, role.id);
    if (score > best.score) {
      best = { roleId: role.id, score, fit: fitFor(hero, role.id).fit };
    }
  }
  return best;
};

const ADJACENT: Record<string, string[]> = {
  warrior: ["rogue"],
  rogue: ["warrior"],
  mage: ["cleric"],
  cleric: ["mage"],
};

export const fitFor = (hero: Hero, roleId: RoleId): { fit: keyof typeof ROLE_FIT; multiplier: number } => {
  const role = roleById(roleId);
  if (role.klass === hero.klass) {
    const sameClass = ROLES.filter((r) => r.klass === hero.klass);
    const scores = sameClass
      .map((r) => ({ id: r.id, score: roleScore(hero.attrs, r.id) }))
      .sort((a, b) => b.score - a.score);
    const top = scores[0]?.id;
    if (top === roleId) return { fit: "natural", multiplier: ROLE_FIT.natural };
    return { fit: "trained", multiplier: ROLE_FIT.trained };
  }
  const adjacent = ADJACENT[hero.klass] ?? [];
  if (adjacent.includes(role.klass)) return { fit: "makeshift", multiplier: ROLE_FIT.makeshift };
  return { fit: "wrong", multiplier: ROLE_FIT.wrong };
};

/** Condition: smooth, not a step function. 1.00 up to 30 fatigue, 0.62 at 100. */
export const condMod = (fatigue: number): number =>
  fatigue <= 30 ? 1 : 1 - ((fatigue - 30) / 70) * 0.38;

/** Sharpness: decays when you rest, climbs when you raid. */
export const sharpMod = (sharpness: number): number => 0.86 + (sharpness / 100) * 0.18;

export const moraleMod = (morale: number): number => 0.94 + (morale / 100) * 0.12;

export const healthMod = (health: number): number => 0.6 + health / 250;

export const formMod = (hero: Hero): number =>
  condMod(hero.fatigue) * sharpMod(hero.sharpness) * moraleMod(hero.morale) * healthMod(hero.health);

/** What the roster table shows: quality at the hero's best role. */
export const heroPower = (hero: Hero): number =>
  bestRole(hero).score * gearFactor(hero) * formMod(hero) * 100;

/** What the hero actually contributes when used in a given role. */
export const powerInRole = (hero: Hero, roleId: RoleId): number => {
  const { multiplier } = fitFor(hero, roleId);
  return roleScore(hero.attrs, roleId) * multiplier * gearFactor(hero) * formMod(hero) * 100;
};

/** Raw attribute strength for a check type, on the same 0..1 scale as a role score. */
export const checkAttributePower = (hero: Hero, check: CheckType): number => {
  const weights = CHECK_POWER_WEIGHTS[check];
  let total = 0;
  for (const [key, weight] of Object.entries(weights) as [keyof Attributes, number][]) {
    total += (hero.attrs[key] / 20) * weight;
  }
  return total;
};

/** Contribution to a boss check, including the class's suitability for that check. */
export const checkContribution = (hero: Hero, check: CheckType, consistencyFactor = 1): number =>
  checkAttributePower(hero, check) *
  CLASS_CHECK_WEIGHT[hero.klass][check] *
  roleAffinity(hero.role, check) *
  gearFactor(hero) *
  formMod(hero) *
  consistencyFactor *
  100;

/** Meta summary used in reports: how big is the squad, on average. */
export const squadRating = (heroes: Hero[]): number => sum(heroes.map(heroPower));

export const averageItemLevel = (heroes: Hero[]): number =>
  heroes.length === 0 ? 0 : Math.round(sum(heroes.map((h) => itemLevel(h.gear))) / heroes.length);

export const isAvailable = (hero: Hero): boolean => hero.injuryDays === 0 && hero.health > 0;

/** A role's affinity for a check: the reason two heroes at the same power differ. */
export const roleAffinity = (roleId: RoleId, check: CheckType): number =>
  ROLE_AFFINITY[roleId]?.[check] ?? 1;

/** XP and levelling. Levelling is the progression spine of the game. */
export const gainXp = (
  hero: Hero,
  amount: number,
  rng: () => number,
): { hero: Hero; levels: number } => {
  let level = hero.level;
  let xp = hero.xp + amount;
  let levels = 0;
  const attrs = { ...hero.attrs };

  while (level < LEVEL_CAP && xp >= XP_TABLE(level)) {
    xp -= XP_TABLE(level);
    level += 1;
    levels += 1;
    const first = ATTR_ORDER[Math.floor(rng() * ATTR_ORDER.length)] ?? "might";
    const second = ATTR_ORDER[Math.floor(rng() * ATTR_ORDER.length)] ?? "focus";
    attrs[first] = clamp(attrs[first] + 1, 1, 20);
    attrs[second] = clamp(attrs[second] + 1, 1, 20);
  }

  return {
    hero: { ...hero, level, xp: level >= LEVEL_CAP ? 0 : xp, attrs },
    levels,
  };
};

const ATTR_ORDER: AttrKey[] = [
  "might", "agility", "vitality", "endurance",
  "focus", "discipline", "awareness", "composure",
];

const XP_TABLE = (level: number): number => 40 + level * 16;
