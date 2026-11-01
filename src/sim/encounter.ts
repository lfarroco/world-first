import { clamp, sum } from "./prelude";
import type {
  AbilityId,
  Assignment,
  CheckType,
  ContentDef,
  ContentDrop,
  EncounterLog,
  EncounterPullLog,
  GameState,
  Hero,
  RaidPhaseLog,
  Stance,
} from "./types";
import { CHECK_LABEL } from "./content/classes";
import { FATIGUE as CONTENT_FATIGUE, INJURY, MASTERY, STANCE } from "./content/tuning";
import { contentById } from "./content/content";
import {
  abilityById,
  activeTraitNames,
  countersAbility,
  traitEconomy,
  traitPartyFactor,
  type TraitContext,
  type TraitEconomy,
} from "./content/traits";
import { checkContribution, formMod, heroPower } from "./hero";
import { rngStream } from "./rng";
import { levelOk, partyOf } from "./plan";
import type { LootItem } from "./types";
import { lootBonusFor } from "./facilities";

export type EncounterOutcome = {
  readonly content: ContentDef;
  readonly pulls: readonly EncounterPullLog[];
  readonly cleared: boolean;
  readonly bestPull: number;
  readonly injured: { heroId: string; name: string; days: number }[];
  readonly loot: LootItem[];
  readonly xp: number;
  readonly gold: number;
  readonly economy: TraitEconomy;
};

/**
 * The ratio bands every check resolves against. Exported so the report's
 * tooltip and the projection cannot describe a different ladder from the one
 * the fight used.
 */
export const CHECK_BANDS = { clean: 1.15, pass: 1, scrape: 0.92 } as const;

/** What an off night costs that hero on the check, as a multiplier. */
export const OFF_NIGHT_FACTOR = 0.86;

const outcomeFor = (ratio: number): RaidPhaseLog["outcome"] =>
  ratio >= CHECK_BANDS.clean
    ? "clean"
    : ratio >= CHECK_BANDS.pass
      ? "pass"
      : ratio >= CHECK_BANDS.scrape
        ? "scrape"
        : "fail";

/** Deterministic consistency check, per hero per pull. */
const consistencyRoll = (state: GameState, hero: Hero, pull: number): number => {
  const rng = rngStream(state.seed, "consistency", state.day, pull, hero.id);
  return rng() < clamp(hero.hidden.consistency, 1, 20) / 20 ? 1 : OFF_NIGHT_FACTOR;
};

const stanceMod = (stance: Stance): number => 1 + STANCE[stance].check;

export const masteryFor = (attempts: number): number =>
  Math.min(MASTERY.cap, attempts * MASTERY.perPull);

/** Raids get several pulls a night; dungeons and missions are one run. */
export const attemptsFor = (content: ContentDef, party: readonly Hero[], stance: Stance): number => {
  if (content.kind === "farm") return 0;
  if (content.kind === "mission") return 1;
  if (content.kind === "dungeon") return 1;
  const worst = party.reduce((max, h) => Math.max(max, h.fatigue), 0);
  const headroom = Math.max(0, 100 - worst);
  const base = clamp(Math.floor(headroom / 18) + 2, 2, 6);
  return stance === "push" ? Math.min(7, base + 1) : base;
};

const attemptCost = (content: ContentDef): number => {
  switch (content.kind) {
    case "raid":
      return CONTENT_FATIGUE.raid;
    case "dungeon":
      return CONTENT_FATIGUE.dungeon;
    case "mission":
      return CONTENT_FATIGUE.mission;
    case "farm":
      return CONTENT_FATIGUE.farm;
  }
};

/**
 * Chance a hero is hurt on a scrape. Fatigue is a direct cost here, not only a
 * multiplier on the check: working a tired party risks bodies, which is the
 * reason rest has a price the player can weigh.
 */
export const injuryChanceFor = (hero: Hero, stance: Stance, economyMult = 1): number => {
  const stanceMult = STANCE[stance].injury;
  const resist = 1 - hero.attrs.vitality / 40;
  const fatigueMult = 1 + (hero.fatigue / 100) * INJURY.fatigueMultiplier;
  return clamp(INJURY.baseChance * stanceMult * resist * economyMult * fatigueMult, 0.01, 0.6);
};

/**
 * Push's own risk, rolled once per hero per pull regardless of the phase
 * result. The scrape roll cannot carry the stance: the same +12% that makes
 * Push useful moves the party out of the scrape band first (L65). This chance
 * is before the resistance and fatigue terms, and it is lower than the scrape
 * chance so a push night is a risk, not a guaranteed casualty.
 */
export const pushInjuryChance = (hero: Hero, economyMult = 1): number => {
  const resist = 1 - hero.attrs.vitality / INJURY.vitalityDivisor;
  const fatigueMult = 1 + (hero.fatigue / 100) * INJURY.fatigueMultiplier;
  return clamp(INJURY.pushChance * resist * economyMult * fatigueMult, 0.005, 0.5);
};

/**
 * Roll a content's named drop for one clear. At most one drops, so every
 * `chance` is the exact per-clear probability. The data test keeps a
 * content's chances at or below 1.
 */
export const rollNamedDrop = (content: ContentDef, rng: () => number): ContentDrop | undefined => {
  if (content.loot.count === 0 || content.drops.length === 0) return undefined;
  const roll = rng();
  let cumulative = 0;
  for (const drop of content.drops) {
    cumulative += drop.chance;
    if (roll < cumulative) return drop;
  }
  return undefined;
};

/**
 * Resolve one party's assigned content for the day.
 * Farm is an automatic success; everything else walks its phases.
 */
export const resolveAssignment = (state: GameState, assignment: Assignment): EncounterOutcome | null => {
  const content = contentById(assignment.contentId);
  if (!content) return null;
  const party = partyOf(state, assignment);
  if (party.length === 0) return null;

  const progress = state.progress.find((p) => p.contentId === content.id);
  const priorAttempts = progress?.attempts ?? 0;
  const economy = traitEconomy(party, content);
  const topId = [...party].sort((a, b) => heroPower(b) - heroPower(a))[0]?.id ?? "";

  // Farms always succeed: they are the floor of the ladder.
  if (content.kind === "farm") {
    return {
      content,
      pulls: [],
      cleared: true,
      bestPull: 1,
      injured: [],
      loot: [],
      xp: content.xp,
      gold: content.gold * party.length,
      economy,
    };
  }

  const pullCount = attemptsFor(content, party, assignment.stance);
  const pulls: EncounterPullLog[] = [];
  const injured: { heroId: string; name: string; days: number }[] = [];
  const injuredIds = new Set<string>();
  const addInjury = (hero: Hero, days: number): void => {
    // A body is out once, not once per phase. Before this, a scrape on two
    // phases could set the same hero twice and the day took two 45-health hits.
    if (injuredIds.has(hero.id)) return;
    injuredIds.add(hero.id);
    injured.push({ heroId: hero.id, name: hero.name, days });
  };
  let cleared = false;
  let bestPull = 0;
  let lastFailed = false;

  for (let pull = 0; pull < pullCount; pull += 1) {
    const mastery = Math.min(MASTERY.cap, (priorAttempts + pull) * MASTERY.perPull);
    const phases: RaidPhaseLog[] = [];
    let cumulative = 0;
    let pullProgress = 0;
    let failed = false;

    for (const [phaseIndex, phase] of content.phases.entries()) {
      const offNights: string[] = [];
      const ctx: TraitContext = {
        hero: party[0]!,
        party,
        content,
        phaseIndex,
        afterWipe: lastFailed,
        topId,
      };
      const contributions = party.map((hero) => {
        const factor = consistencyRoll(state, hero, pull);
        if (factor < 1) offNights.push(hero.name);
        return checkContribution(hero, phase.check, factor, { ...ctx, hero });
      });
      const traitMult = traitPartyFactor(party, phase.check, ctx);
      const traitNames = activeTraitNames(party, phase.check, ctx);

      // A threat applies whether or not the party has seen it before. The
      // first pull is the scouting pull; the report names what it found.
      const ability = phase.ability ? abilityById(phase.ability) : null;
      const counterHero = ability ? party.find((h) => countersAbility(h.traits, ability.id)) : undefined;
      const countered = Boolean(counterHero);
      const abilityMult = ability && !countered ? ability.penalty : 1;

      const value =
        sum(contributions) * traitMult * stanceMod(assignment.stance) * (1 + mastery) * abilityMult;
      const ratio = phase.requirement === 0 ? 2 : value / phase.requirement;
      const outcome = outcomeFor(ratio);

      phases.push({
        name: phase.name,
        check: phase.check,
        checkLabel: CHECK_LABEL[phase.check],
        value: Math.round(value),
        requirement: phase.requirement,
        ratio,
        outcome,
        offNights,
        traits: traitNames.length > 0 ? traitNames : undefined,
        ability: ability
          ? {
              id: ability.id,
              name: ability.name,
              countered,
              mult: abilityMult,
              counterHero: counterHero?.name,
              known: priorAttempts + pull > 0,
            }
          : undefined,
      });

      if (outcome === "fail") {
        failed = true;
        // A near miss at 0.94 is 94% of a pull, not 0%. Bank the failed
        // phase's partial progress so "best pull" never reads as a slot roll.
        pullProgress = cumulative + clamp(ratio, 0, 1) * phase.share;
        break;
      }
      cumulative += phase.share;

      if (outcome === "scrape") {
        for (const hero of party) {
          const roll = rngStream(state.seed, "scrapeChance", state.day, pull, hero.id);
          if (roll() > 0.28) continue;
          const injuryRoll = rngStream(state.seed, "injuryRoll", state.day, pull, hero.id);
          const chance = injuryChanceFor(hero, assignment.stance, economy.injuryMult);
          if (injuryRoll() < chance) {
            addInjury(hero, 1 + Math.floor(injuryRoll() * 4));
          }
        }
      }
    }

    // Push carries its own risk on every pull, not only on a scrape. A party
    // that turns a 0.92 fail into a 1.03 pass has still taken the risk that
    // bought the pass, and the report must show the body it cost.
    if (assignment.stance === "push") {
      for (const hero of party) {
        const roll = rngStream(state.seed, "pushInjury", state.day, pull, hero.id)();
        if (roll >= pushInjuryChance(hero, economy.injuryMult)) continue;
        const daysRoll = rngStream(state.seed, "pushInjuryDays", state.day, pull, hero.id)();
        addInjury(hero, 1 + Math.floor(daysRoll * 4));
      }
    }

    lastFailed = failed;
    bestPull = Math.max(bestPull, failed ? pullProgress : 1);
    pulls.push({ index: pull + 1, progress: failed ? pullProgress : 1, killed: !failed, phases });

    if (!failed) {
      cleared = true;
      break;
    }
  }

  // The loot is generated without a hero. The day decides the default target
  // (the raid team's best upgrade) and the player may reassign it.
  const loot: LootItem[] = [];
  if (cleared && content.loot.count > 0) {
    const lootRng = rngStream(state.seed, "loot", state.day, content.id);
    // A separate stream: adding named drops must not reshuffle the generic
    // item rolls a seed already made.
    const named = rollNamedDrop(content, rngStream(state.seed, "namedDrop", state.day, content.id));
    const slots = ["weapon", "chest", "helm", "trinket"] as const;
    for (let i = 0; i < content.loot.count; i += 1) {
      if (i === 0 && named) {
        // The named item is the clear's headline: fixed slot, fixed ilvl, and
        // the same forge/scavenger bonuses as any other drop.
        loot.push({
          slot: named.slot,
          ilvl: named.ilvl + lootBonusFor(state.facilities) + economy.lootIlvl,
          item: named.name,
        });
        continue;
      }
      const slot = slots[Math.floor(lootRng() * 3.999)] ?? "weapon";
      const ilvl =
        content.loot.ilvlMin +
        Math.floor(lootRng() * (content.loot.ilvlMax - content.loot.ilvlMin + 1)) +
        lootBonusFor(state.facilities) +
        economy.lootIlvl;
      loot.push({ slot, ilvl });
    }
  }

  return {
    content,
    pulls,
    cleared,
    bestPull,
    injured,
    loot,
    xp: cleared ? content.xp : Math.round(content.xp * 0.35),
    gold: cleared
      ? content.gold
      : Math.round(content.gold * (content.kind === "raid" ? 0 : 0.4)),
    economy,
  };
};



export const encounterFatigue = (content: ContentDef): number => attemptCost(content);

/** Projection used by the AI and by the UI: will this party clear this content? */
export type Projection = {
  readonly content: ContentDef;
  readonly phases: {
    name: string;
    check: CheckType;
    checkLabel: string;
    value: number;
    requirement: number;
    ratio: number;
    verdict: "pass" | "marginal" | "fail";
  }[];
  readonly estimatedBestPull: number;
  readonly partySize: number;
  readonly minRatio: number;
  /** Average condition × sharpness × morale × health. Explains a low tonight. */
  readonly form: number;
};

export const projectAssignment = (
  state: GameState,
  assignment: Assignment,
): Projection | null => {
  const content = contentById(assignment.contentId);
  if (!content) return null;
  const party = partyOf(state, assignment);
  if (party.length === 0) return null;

  const progress = state.progress.find((p) => p.contentId === content.id);
  const mastery = masteryFor(progress?.attempts ?? 0);

  // The projection is what the player knows. An ability that has never been
  // pulled is not in the numbers yet; the resolution still applies it.
  const known = (progress?.attempts ?? 0) > 0;

  const topId = [...party].sort((a, b) => heroPower(b) - heroPower(a))[0]?.id ?? "";

  const phases = content.phases.map((phase, phaseIndex) => {
    const ability = known && phase.ability ? abilityById(phase.ability) : null;
    const countered = ability ? party.some((h) => countersAbility(h.traits, ability.id)) : true;
    const abilityMult = ability && !countered ? ability.penalty : 1;
    const ctx: TraitContext = { hero: party[0]!, party, content, phaseIndex, afterWipe: false, topId };

    const value =
      sum(
        party.map((hero) => {
          const p = clamp(hero.hidden.consistency, 1, 20) / 20;
          const expected = p + (1 - p) * OFF_NIGHT_FACTOR;
          return checkContribution(hero, phase.check, expected, { ...ctx, hero });
        }),
      ) *
      traitPartyFactor(party, phase.check, ctx) *
      stanceMod(assignment.stance) *
      (1 + mastery) *
      abilityMult;
    const ratio = phase.requirement === 0 ? 2 : value / phase.requirement;
    return {
      name: phase.name,
      check: phase.check,
      checkLabel: CHECK_LABEL[phase.check],
      value: Math.round(value),
      requirement: phase.requirement,
      ratio,
      verdict: (ratio >= CHECK_BANDS.clean
        ? "pass"
        : ratio >= CHECK_BANDS.scrape
          ? "marginal"
          : "fail") as "pass" | "marginal" | "fail",
    };
  });

  // Bank the phases that pass. The first phase that does not pass still
  // contributes its ratio, so "0.94 on the last check" reads as 94%, not 0%.
  let cumulative = 0;
  for (const [i, phase] of phases.entries()) {
    const share = content.phases[i]?.share ?? 0;
    if (phase.ratio >= 1) {
      cumulative += share;
      continue;
    }
    cumulative += share * clamp(phase.ratio, 0, 1);
    break;
  }

  const minRatio = phases.length === 0 ? 1 : phases.reduce((min, p) => Math.min(min, p.ratio), Number.POSITIVE_INFINITY);
  const form = party.reduce((acc, h) => acc + formMod(h), 0) / party.length;

  return {
    content,
    phases,
    estimatedBestPull: phases.length === 0 ? 1 : Number.isFinite(minRatio) ? cumulative : 0,
    partySize: party.length,
    minRatio,
    form,
  };
};

const counterHeroFor = (party: readonly Hero[], abilityId: AbilityId): Hero | undefined =>
  party.find((h) => countersAbility(h.traits, abilityId));

/**
 * Try to answer a content's threats by swapping one party body for a counter.
 * Only single swaps are considered, only against the party's three weakest
 * contributors to the threatened check, and only when the projection improves.
 * This is the manager's heuristic — the same decision the player makes — not an
 * optimum solver.
 */
export const withCounters = (
  state: GameState,
  content: ContentDef,
  party: readonly Hero[],
  pool: readonly Hero[],
  stance: Stance = "steady",
): Hero[] => {
  const threats = content.phases
    .map((phase) => ({ ability: phase.ability, check: phase.check }))
    .filter((t): t is { ability: AbilityId; check: CheckType } => Boolean(t.ability));
  if (threats.length === 0) return [...party];

  // An undiscovered threat cannot be planned around: the first pull is the
  // scouting pull. That is the point of the mechanic, so do not cheat here.
  const known = (state.progress.find((p) => p.contentId === content.id)?.attempts ?? 0) > 0;
  if (!known) return [...party];

  const uncovered = threats.filter((t) => !counterHeroFor(party, t.ability));
  if (uncovered.length === 0) return [...party];

  const project = (heroes: readonly Hero[]): number =>
    projectAssignment(state, { contentId: content.id, heroes: heroes.map((h) => h.id), stance })?.minRatio ??
    0;

  const topId = [...party].sort((a, b) => heroPower(b) - heroPower(a))[0]?.id ?? "";
  const threatScore = (h: Hero): number =>
    Math.min(
      ...uncovered.map((t) =>
        checkContribution(h, t.check, 1, { hero: h, party, content, afterWipe: false, topId }),
      ),
    );

  // Try the three strongest candidates for the threatened check, not the first
  // three in roster order. Roster order is recruitment order, which is noise.
  const counterCandidates = pool
    .filter(
      (h) =>
        !party.some((p) => p.id === h.id) &&
        uncovered.some((t) => countersAbility(h.traits, t.ability)),
    )
    .sort((a, b) => threatScore(b) - threatScore(a))
    .slice(0, 3);
  if (counterCandidates.length === 0) return [...party];

  const weakest = [...party].sort((a, b) => threatScore(a) - threatScore(b)).slice(0, 3);
  let best = [...party];
  let bestRatio = project(best);

  for (const out of weakest) {
    for (const hero of counterCandidates) {
      const next = party.map((h) => (h.id === out.id ? hero : h));
      if (!levelOk(content, next)) continue;
      const ratio = project(next);
      if (ratio > bestRatio + 0.002) {
        best = next;
        bestRatio = ratio;
      }
    }
  }

  return best;
};
