import type {
  AbilityId,
  CheckType,
  ClassId,
  ContentDef,
  ContentKind,
  Hero,
  TraitId,
} from "../types";
import type { Rng } from "../rng";
import { TRAIT_ROLL } from "./tuning";

/**
 * Traits.
 *
 * A trait is one line of character with one rule attached. Four kinds:
 *   counter    — answers a named boss threat (see ABILITIES)
 *   bond       — depends on the rest of the party
 *   craft      — costs and yields outside the fight (fatigue, gold, XP, wounds)
 *   flaw       — a rule that only ever costs
 *   specialist — pays on one phase and takes on another
 *
 * Cap: `MAX_TRAITS` per hero. Effects are evaluated by one pure function used
 * by resolution, projection and the planner, so a trait can never mean two
 * different things in two places.
 */

export const MAX_TRAITS = 3;

export type BoolCondition =
  | { kind: "always" }
  | { kind: "phase"; at: "first" | "middle" | "last" }
  | { kind: "afterWipe" }
  | { kind: "notTop" }
  | { kind: "contentKind"; of: ContentKind }
  | { kind: "partySize"; atLeast: number };

export type TraitEffect =
  | { kind: "counter"; ability: AbilityId }
  | {
      kind: "flat";
      check: CheckType | "all";
      mult: number;
      when?: BoolCondition;
      scope?: "self" | "party";
    }
  | {
      kind: "classAlly";
      check: CheckType | "all";
      klass: ClassId;
      per: number;
      none: number;
      scope?: "self" | "party";
    }
  | {
      kind: "economy";
      fatigue?: number;
      goldPct?: number;
      xpPct?: number;
      injuryMult?: number;
      sharpness?: number;
      lootIlvl?: number;
      when?: BoolCondition;
    }
  | { kind: "mentor"; xpPct: number };

export type Trait = {
  readonly id: TraitId;
  readonly name: string;
  /** One line the hero card can show without a tooltip. */
  readonly text: string;
  readonly kind: "counter" | "bond" | "craft" | "flaw" | "specialist";
  readonly classes?: readonly ClassId[];
  /** Relative chance in the general pool. Flaws are twice as likely. */
  readonly weight?: number;
  readonly effects: readonly TraitEffect[];
};

export type Ability = {
  readonly id: AbilityId;
  readonly name: string;
  /** Multiplier on the phase's check when nobody in the party answers it. */
  readonly penalty: number;
  readonly text: string;
};

export const ABILITIES: Record<AbilityId, Ability> = {
  "ash-veil": {
    id: "ash-veil",
    name: "Ash Veil",
    penalty: 0.82,
    text: "Ash chokes the hall. The mechanics check is 18% harder unless someone can read the drift.",
  },
  "dread-roar": {
    id: "dread-roar",
    name: "Dread Roar",
    penalty: 0.85,
    text: "A roar that breaks concentration. The sustain check is 15% harder unless someone holds the line.",
  },
};

export const TRAITS: Record<TraitId, Trait> = {
  "keen-eye": {
    id: "keen-eye",
    name: "Keen Eye",
    text: "Counters Ash Veil: reads the drift and calls it.",
    kind: "counter",
    classes: ["mage", "rogue"],
    effects: [{ kind: "counter", ability: "ash-veil" }],
  },
  steadfast: {
    id: "steadfast",
    name: "Steadfast",
    text: "Counters Dread Roar: does not break under the roar.",
    kind: "counter",
    classes: ["warrior", "cleric"],
    effects: [{ kind: "counter", ability: "dread-roar" }],
  },
  "pack-hunter": {
    id: "pack-hunter",
    name: "Pack Hunter",
    text: "+5% damage per other rogue, -6% alone.",
    kind: "bond",
    classes: ["rogue"],
    effects: [{ kind: "classAlly", check: "dps", klass: "rogue", per: 0.05, none: -0.06 }],
  },
  "kindred-spirits": {
    id: "kindred-spirits",
    name: "Kindred Spirits",
    text: "+5% damage per other mage, -4% alone.",
    kind: "bond",
    classes: ["mage"],
    effects: [{ kind: "classAlly", check: "dps", klass: "mage", per: 0.05, none: -0.04 }],
  },
  "shield-wall": {
    id: "shield-wall",
    name: "Shield Wall",
    text: "+3% mitigation to the party per other warrior.",
    kind: "bond",
    classes: ["warrior"],
    effects: [
      { kind: "classAlly", check: "mitigation", klass: "warrior", per: 0.03, none: 0, scope: "party" },
    ],
  },
  "field-medic": {
    id: "field-medic",
    name: "Field Medic",
    text: "+8% sustain in a party of four or more.",
    kind: "bond",
    classes: ["cleric"],
    effects: [{ kind: "flat", check: "sustain", mult: 0.08, when: { kind: "partySize", atLeast: 4 } }],
  },
  mentor: {
    id: "mentor",
    name: "Mentor",
    text: "The party's lowest-level hero gains +25% XP; you deal 8% less.",
    kind: "bond",
    classes: ["cleric"],
    effects: [
      { kind: "flat", check: "all", mult: -0.08 },
      { kind: "mentor", xpPct: 0.25 },
    ],
  },
  pathfinder: {
    id: "pathfinder",
    name: "Pathfinder",
    text: "Dungeon runs cost 3 less fatigue.",
    kind: "craft",
    effects: [{ kind: "economy", fatigue: -3, when: { kind: "contentKind", of: "dungeon" } }],
  },
  quartermaster: {
    id: "quartermaster",
    name: "Quartermaster",
    text: "+20% gold from farms.",
    kind: "craft",
    effects: [{ kind: "economy", goldPct: 0.2, when: { kind: "contentKind", of: "farm" } }],
  },
  student: {
    id: "student",
    name: "Student",
    text: "+12% XP from everything.",
    kind: "craft",
    effects: [{ kind: "economy", xpPct: 0.12 }],
  },
  ironhide: {
    id: "ironhide",
    name: "Ironhide",
    text: "-20% injury chance.",
    kind: "craft",
    effects: [{ kind: "economy", injuryMult: 0.8 }],
  },
  "night-owl": {
    id: "night-owl",
    name: "Night Owl",
    text: "+2 sharpness from raids.",
    kind: "craft",
    effects: [{ kind: "economy", sharpness: 2, when: { kind: "contentKind", of: "raid" } }],
  },
  scavenger: {
    id: "scavenger",
    name: "Scavenger",
    text: "+3 loot item level.",
    kind: "craft",
    effects: [{ kind: "economy", lootIlvl: 3 }],
  },
  "hot-headed": {
    id: "hot-headed",
    name: "Hot-Headed",
    text: "-8% on every check after the party wipes.",
    kind: "flaw",
    weight: 2,
    effects: [{ kind: "flat", check: "all", mult: -0.08, when: { kind: "afterWipe" } }],
  },
  frail: {
    id: "frail",
    name: "Frail",
    text: "+50% injury chance.",
    kind: "flaw",
    weight: 2,
    effects: [{ kind: "economy", injuryMult: 1.5 }],
  },
  "glory-hound": {
    id: "glory-hound",
    name: "Glory Hound",
    text: "-7% unless you are the strongest hero in the party.",
    kind: "flaw",
    weight: 2,
    effects: [{ kind: "flat", check: "all", mult: -0.07, when: { kind: "notTop" } }],
  },
  "slow-starter": {
    id: "slow-starter",
    name: "Slow Starter",
    text: "-8% on the first phase.",
    kind: "flaw",
    weight: 2,
    effects: [{ kind: "flat", check: "all", mult: -0.08, when: { kind: "phase", at: "first" } }],
  },
  executioner: {
    id: "executioner",
    name: "Executioner",
    text: "+12% damage on the last phase, -5% on the first.",
    kind: "specialist",
    classes: ["rogue"],
    effects: [
      { kind: "flat", check: "dps", mult: 0.12, when: { kind: "phase", at: "last" } },
      { kind: "flat", check: "dps", mult: -0.05, when: { kind: "phase", at: "first" } },
    ],
  },
  stonewall: {
    id: "stonewall",
    name: "Stonewall",
    text: "+10% mitigation on the first phase, -5% on the last.",
    kind: "specialist",
    classes: ["warrior"],
    effects: [
      { kind: "flat", check: "mitigation", mult: 0.1, when: { kind: "phase", at: "first" } },
      { kind: "flat", check: "mitigation", mult: -0.05, when: { kind: "phase", at: "last" } },
    ],
  },
  ritualist: {
    id: "ritualist",
    name: "Ritualist",
    text: "+10% mechanics on the middle phase, -4% everywhere.",
    kind: "specialist",
    classes: ["mage"],
    effects: [
      { kind: "flat", check: "mechanics", mult: 0.1, when: { kind: "phase", at: "middle" } },
      { kind: "flat", check: "all", mult: -0.04 },
    ],
  },
};

/** Fixed order: trait rolls must not depend on object key order. */
export const TRAIT_IDS = Object.keys(TRAITS) as TraitId[];

export const abilityById = (id: AbilityId): Ability => ABILITIES[id];

export const traitById = (id: TraitId): Trait => TRAITS[id];

/** Does this trait list answer the ability? Tolerates saves written before traits. */
export const countersAbility = (
  traits: readonly TraitId[] | undefined,
  abilityId: AbilityId,
): boolean => (traits ?? []).some((id) => TRAITS[id]?.effects.some((e) => e.kind === "counter" && e.ability === abilityId));

/** One class counter and one general trait, when the rolls fall that way. */
export const rollTraits = (klass: ClassId, rng: Rng): TraitId[] => {
  const eligible = TRAIT_IDS.filter((id) => {
    const trait = TRAITS[id];
    return trait !== undefined && (!trait.classes || trait.classes.includes(klass));
  });
  const counters = eligible.filter((id) => TRAITS[id]!.effects.some((e) => e.kind === "counter"));
  const others = eligible.filter((id) => !counters.includes(id));
  const pick = (pool: TraitId[]): TraitId => {
    const total = pool.reduce((acc, id) => acc + (TRAITS[id]?.weight ?? 1), 0);
    let roll = rng() * total;
    for (const id of pool) {
      roll -= TRAITS[id]?.weight ?? 1;
      if (roll <= 0) return id;
    }
    return pool[pool.length - 1]!;
  };
  const traits: TraitId[] = [];
  if (counters.length > 0 && rng() < TRAIT_ROLL.counter) traits.push(pick(counters));
  if (others.length > 0 && rng() < TRAIT_ROLL.general && traits.length < MAX_TRAITS) traits.push(pick(others));
  return traits;
};

export type TraitContext = {
  readonly hero: Hero;
  readonly party: readonly Hero[];
  readonly content: ContentDef;
  readonly phaseIndex?: number;
  readonly afterWipe: boolean;
  readonly topId: string;
};

export type TraitEconomy = {
  fatigue: number;
  goldPct: number;
  xpPct: number;
  injuryMult: number;
  sharpness: number;
  lootIlvl: number;
  mentorPct: number;
};

const conditionHolds = (when: BoolCondition | undefined, ctx: TraitContext): boolean => {
  if (!when || when.kind === "always") return true;
  switch (when.kind) {
    case "phase": {
      if (ctx.phaseIndex === undefined) return false;
      const last = ctx.content.phases.length - 1;
      if (when.at === "first") return ctx.phaseIndex === 0;
      // A one-phase fight has no "last phase" bonus; otherwise both would fire.
      if (when.at === "last") return last > 0 && ctx.phaseIndex === last;
      return ctx.phaseIndex > 0 && ctx.phaseIndex < last;
    }
    case "afterWipe":
      return ctx.afterWipe;
    case "notTop":
      return ctx.hero.id !== ctx.topId;
    case "contentKind":
      return ctx.content.kind === when.of;
    case "partySize":
      return ctx.party.length >= when.atLeast;
  }
};

const selfFactorForTrait = (trait: Trait, hero: Hero, check: CheckType, ctx: TraitContext): number => {
  let factor = 1;
  for (const effect of trait.effects) {
    if (effect.kind === "flat" && (effect.scope ?? "self") === "self") {
      if (effect.check !== "all" && effect.check !== check) continue;
      if (!conditionHolds(effect.when, ctx)) continue;
      factor *= 1 + effect.mult;
    } else if (effect.kind === "classAlly" && (effect.scope ?? "self") === "self") {
      if (effect.check !== "all" && effect.check !== check) continue;
      const allies = ctx.party.filter((h) => h.id !== hero.id && h.klass === effect.klass).length;
      factor *= 1 + (allies === 0 ? effect.none : effect.per * allies);
    }
  }
  return factor;
};

/** The hero's own trait multiplier for one check. */
export const traitSelfFactor = (hero: Hero, check: CheckType, ctx: TraitContext): number => {
  let factor = 1;
  for (const id of hero.traits ?? []) {
    const trait = TRAITS[id];
    if (trait) factor *= selfFactorForTrait(trait, hero, check, ctx);
  }
  return factor;
};

const partyFactorForTrait = (
  trait: Trait,
  owner: Hero,
  party: readonly Hero[],
  check: CheckType,
  ctx: TraitContext,
): number => {
  let factor = 1;
  for (const effect of trait.effects) {
    if (effect.kind !== "flat" && effect.kind !== "classAlly") continue;
    if ((effect.scope ?? "self") !== "party") continue;
    if (effect.check !== "all" && effect.check !== check) continue;
    if (effect.kind === "flat") {
      if (!conditionHolds(effect.when, ctx)) continue;
      factor *= 1 + effect.mult;
    } else if (effect.kind === "classAlly") {
      const allies = party.filter((h) => h.id !== owner.id && h.klass === effect.klass).length;
      factor *= 1 + (allies === 0 ? effect.none : effect.per * allies);
    }
  }
  return factor;
};

/** A multiplier applied once to the whole check (Shield Wall and friends). */
export const traitPartyFactor = (
  party: readonly Hero[],
  check: CheckType,
  ctx: TraitContext,
): number => {
  let factor = 1;
  for (const hero of party) {
    for (const id of hero.traits ?? []) {
      const trait = TRAITS[id];
      if (trait) factor *= partyFactorForTrait(trait, hero, party, check, ctx);
    }
  }
  return factor;
};

/** Names for the report. Only traits that actually moved this check. */
export const activeTraitNames = (
  party: readonly Hero[],
  check: CheckType,
  ctx: TraitContext,
): string[] => {
  const names = new Set<string>();
  for (const hero of party) {
    for (const id of hero.traits ?? []) {
      const trait = TRAITS[id];
      if (!trait) continue;
      const self = selfFactorForTrait(trait, hero, check, { ...ctx, hero });
      const partyFactor = partyFactorForTrait(trait, hero, party, check, ctx);
      if (Math.abs(self - 1) > 0.001 || Math.abs(partyFactor - 1) > 0.001) names.add(trait.name);
    }
  }
  return [...names].slice(0, 4);
};

const economyWhen = (when: BoolCondition | undefined, content: ContentDef): boolean => {
  if (!when || when.kind === "always") return true;
  return when.kind === "contentKind" && when.of === content.kind;
};

/** What the party's craft and flaw traits change about the day. */
export const traitEconomy = (party: readonly Hero[], content: ContentDef): TraitEconomy => {
  const economy: TraitEconomy = {
    fatigue: 0,
    goldPct: 0,
    xpPct: 0,
    injuryMult: 1,
    sharpness: 0,
    lootIlvl: 0,
    mentorPct: 0,
  };
  for (const hero of party) {
    for (const id of hero.traits ?? []) {
      const trait = TRAITS[id];
      if (!trait) continue;
      for (const effect of trait.effects) {
        if (effect.kind === "economy") {
          if (!economyWhen(effect.when, content)) continue;
          economy.fatigue += effect.fatigue ?? 0;
          economy.goldPct += effect.goldPct ?? 0;
          economy.xpPct += effect.xpPct ?? 0;
          economy.injuryMult *= effect.injuryMult ?? 1;
          economy.sharpness += effect.sharpness ?? 0;
          economy.lootIlvl += effect.lootIlvl ?? 0;
        } else if (effect.kind === "mentor") {
          economy.mentorPct = Math.max(economy.mentorPct, effect.xpPct);
        }
      }
    }
  }
  return economy;
};
