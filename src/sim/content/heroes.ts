import { clamp } from "../prelude";
import { rngStream, rollInt } from "../rng";
import type { Attributes, AttrKey, ClassId, Gear, Hero, Hidden } from "../types";
import { CLASS_IDS, rolesForClass } from "./roles";
import { rollTraits } from "./traits";

const FIRST_NAMES = [
  "Gareth", "Elaria", "Ignis", "Varis", "Thorne", "Lyra", "Ansel", "Bram",
  "Sable", "Corin", "Wren", "Ottilie", "Perrin", "Isolde", "Cael", "Rowan",
  "Aaria", "Bartholomew", "Vaelen", "Maud", "Oriel", "Soren", "Tamsin", "Ulric",
];

const EPITHETS = [
  "the Steady", "the Unyielding", "of the Vale", "the Quiet", "the Bold",
  "Ashborn", "the Patient", "Ironhand", "the Pale", "Duskwalker",
];

const ATTR_KEYS: AttrKey[] = [
  "might", "agility", "vitality", "endurance",
  "focus", "discipline", "awareness", "composure",
];

export const LEVEL_CAP = 60;

/**
 * XP needed to go from `level` to `level + 1`.
 * Deliberately shallow: an 84-day run must reach the cap with two parties a day.
 */
export const xpToNext = (level: number): number => 40 + level * 16;

export const wageForLevel = (level: number): number => Math.max(12, Math.round(8 + level * 2.6));

const feeForLevel = (level: number): number => Math.round(40 + level * level * 0.35);

const zeroGear = (ilvl: number): Gear => ({
  weapon: ilvl,
  chest: ilvl,
  helm: ilvl,
  trinket: ilvl,
});

const makeAttributes = (rng: () => number, level: number): Attributes => {
  // Level 1 heroes start weak; growth comes from levelling, not from the roll.
  const base = 3 + Math.floor(level / 6);
  const attrs = {} as Record<AttrKey, number>;
  for (const key of ATTR_KEYS) attrs[key] = clamp(base + rollInt(rng, -2, 2), 1, 20);
  return attrs;
};

const makeHidden = (rng: () => number): Hidden => ({
  consistency: rollInt(rng, 7, 17),
  professionalism: rollInt(rng, 5, 17),
  ambition: rollInt(rng, 4, 18),
  loyalty: rollInt(rng, 5, 18),
  pressure: rollInt(rng, 5, 17),
});

const pickClassRole = (attrs: Attributes, klass: ClassId) => {
  const candidates = rolesForClass(klass);
  let best = candidates[0]?.id ?? "bulwark";
  let bestScore = -1;
  for (const role of candidates) {
    let score = 0;
    for (const [key, weight] of Object.entries(role.weights) as [AttrKey, number][]) {
      score += (attrs[key] / 20) * weight;
    }
    if (score > bestScore) {
      bestScore = score;
      best = role.id;
    }
  }
  return best;
};

export const makeHero = (
  seed: number,
  index: number,
  klass: ClassId,
  level: number,
  nameIndex?: number,
): Hero => {
  const rng = rngStream(seed, "hero", index);
  const cappedLevel = clamp(level, 1, LEVEL_CAP);
  const nameBase = nameIndex ?? index;
  const first = FIRST_NAMES[nameBase % FIRST_NAMES.length] ?? "Nameless";
  const epithet = EPITHETS[(nameBase * 7 + index) % EPITHETS.length] ?? "the Unknown";
  const gearIlvl = Math.round(6 + cappedLevel * 1.8 + rollInt(rng, 0, 12));

  const attrs = makeAttributes(rng, cappedLevel);
  const role = pickClassRole(attrs, klass);

  // Traits use their own named stream: adding a roll here must not reshuffle
  // the attributes, gear or hidden attributes of the same seed.
  const traits = rollTraits(klass, rngStream(seed, "traits", index));

  return {
    id: `h${index}`,
    name: `${first} ${epithet}`,
    klass,
    role,
    naturalRole: role,
    level: cappedLevel,
    xp: 0,
    attrs,
    gear: zeroGear(gearIlvl),
    hidden: makeHidden(rng),
    health: 100,
    fatigue: 0,
    sharpness: 60,
    morale: 62 + rollInt(rng, -8, 8),
    injuryDays: 0,
    daysBenched: 0,
    traits,
    contract: {
      wage: wageForLevel(cappedLevel),
      daysLeft: rollInt(rng, 14, 28),
      status: cappedLevel > 20 ? "a-team" : "rotation",
    },
  };
};

/** Three level-1 heroes and nothing else. That is the whole starting position. */
export const startingRoster = (seed: number): Hero[] => {
  const plan: ClassId[] = ["warrior", "cleric", "mage"];
  return plan.map((klass, i) => makeHero(seed, i + 1, klass, 1, i));
};

export const randomClass = (rng: () => number): ClassId => {
  const idx = Math.floor(rng() * CLASS_IDS.length);
  return CLASS_IDS[Math.min(idx, CLASS_IDS.length - 1)] ?? "warrior";
};

/**
 * Recruits are not level 1 forever: a guild of veterans attracts experienced
 * adventurers. This is what makes a 10-man raid reachable inside a run.
 */
export const makeCandidate = (seed: number, day: number, index: number, guildLevel = 1, factor = 0.68) => {
  const rng = rngStream(seed, "tavern", day, index);
  const klass = randomClass(rng);
  const level = clamp(Math.round(guildLevel * factor) + rollInt(rng, -3, 3), 1, LEVEL_CAP - 5);
  const hero = makeHero(seed, 1000 + day * 10 + index, klass, level, day * 3 + index);
  return { hero, fee: feeForLevel(level) };
};

export const bestLevel = (heroes: readonly Hero[]): number =>
  heroes.reduce((max, h) => Math.max(max, h.level), 0);
