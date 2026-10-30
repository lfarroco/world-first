import { clamp, sum } from "./prelude";
import type {
  Assignment,
  CheckType,
  ContentDef,
  EncounterLog,
  EncounterPullLog,
  GameState,
  Hero,
  RaidPhaseLog,
  Stance,
} from "./types";
import { CHECK_LABEL } from "./content/classes";
import { FATIGUE as CONTENT_FATIGUE, MASTERY, STANCE } from "./content/tuning";
import { contentById } from "./content/content";
import { checkContribution } from "./hero";
import { rngStream } from "./rng";
import { partyOf } from "./plan";

export type EncounterOutcome = {
  readonly content: ContentDef;
  readonly pulls: readonly EncounterPullLog[];
  readonly cleared: boolean;
  readonly bestPull: number;
  readonly injured: { heroId: string; name: string; days: number }[];
  readonly loot: { heroId: string; name: string; slot: string; ilvl: number }[];
  readonly xp: number;
  readonly gold: number;
};

const outcomeFor = (ratio: number): RaidPhaseLog["outcome"] =>
  ratio >= 1.15 ? "clean" : ratio >= 1 ? "pass" : ratio >= 0.92 ? "scrape" : "fail";

/** Deterministic consistency check, per hero per pull. */
const consistencyRoll = (state: GameState, hero: Hero, pull: number): number => {
  const rng = rngStream(state.seed, "consistency", state.day, pull, hero.id);
  return rng() < clamp(hero.hidden.consistency, 1, 20) / 20 ? 1 : 0.86;
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
    };
  }

  const pullCount = attemptsFor(content, party, assignment.stance);
  const pulls: EncounterPullLog[] = [];
  const injured: { heroId: string; name: string; days: number }[] = [];
  let cleared = false;
  let bestPull = 0;

  for (let pull = 0; pull < pullCount; pull += 1) {
    const mastery = Math.min(MASTERY.cap, (priorAttempts + pull) * MASTERY.perPull);
    const phases: RaidPhaseLog[] = [];
    let cumulative = 0;
    let failed = false;

    for (const phase of content.phases) {
      const offNights: string[] = [];
      const contributions = party.map((hero) => {
        const factor = consistencyRoll(state, hero, pull);
        if (factor < 1) offNights.push(hero.name);
        return checkContribution(hero, phase.check, factor);
      });
      const value = sum(contributions) * stanceMod(assignment.stance) * (1 + mastery);
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
      });

      if (outcome === "fail") {
        failed = true;
        break;
      }
      cumulative += phase.share;

      if (outcome === "scrape") {
        for (const hero of party) {
          const roll = rngStream(state.seed, "scrapeChance", state.day, pull, hero.id);
          if (roll() > 0.28) continue;
          const injuryRoll = rngStream(state.seed, "injuryRoll", state.day, pull, hero.id);
          const stanceMult = STANCE[assignment.stance].injury;
          const resist = 1 - hero.attrs.vitality / 40;
          if (injuryRoll() < clamp(0.12 * stanceMult * resist, 0.01, 0.6)) {
            const days = 1 + Math.floor(injuryRoll() * 4);
            injured.push({ heroId: hero.id, name: hero.name, days });
          }
        }
      }
    }

    bestPull = Math.max(bestPull, failed ? cumulative : 1);
    pulls.push({ index: pull + 1, progress: failed ? cumulative : 1, killed: !failed, phases });

    if (!failed) {
      cleared = true;
      break;
    }
  }

  const loot: { heroId: string; name: string; slot: string; ilvl: number }[] = [];
  if (cleared && content.loot.count > 0) {
    const lootRng = rngStream(state.seed, "loot", state.day, content.id);
    const slots = ["weapon", "chest", "helm", "trinket"] as const;
    for (let i = 0; i < content.loot.count; i += 1) {
      const target = [...party].sort((a, b) => itemLevelOf(a) - itemLevelOf(b))[i % party.length];
      if (!target) break;
      const slot = slots[Math.floor(lootRng() * 3.999)] ?? "weapon";
      const ilvl =
        content.loot.ilvlMin + Math.floor(lootRng() * (content.loot.ilvlMax - content.loot.ilvlMin + 1));
      loot.push({ heroId: target.id, name: target.name, slot, ilvl });
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
  };
};

const itemLevelOf = (hero: Hero): number =>
  Math.round((hero.gear.weapon + hero.gear.chest + hero.gear.helm + hero.gear.trinket) / 4);

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

  const phases = content.phases.map((phase) => {
    const value =
      sum(
        party.map((hero) => {
          const p = clamp(hero.hidden.consistency, 1, 20) / 20;
          const expected = p + (1 - p) * 0.86;
          return checkContribution(hero, phase.check, expected);
        }),
      ) *
      stanceMod(assignment.stance) *
      (1 + mastery);
    const ratio = phase.requirement === 0 ? 2 : value / phase.requirement;
    return {
      name: phase.name,
      check: phase.check,
      checkLabel: CHECK_LABEL[phase.check],
      value: Math.round(value),
      requirement: phase.requirement,
      ratio,
      verdict: (ratio >= 1.15 ? "pass" : ratio >= 0.92 ? "marginal" : "fail") as
        | "pass"
        | "marginal"
        | "fail",
    };
  });

  let cumulative = 0;
  for (const phase of phases) {
    if (phase.verdict === "fail") break;
    cumulative += content.phases.find((p) => p.name === phase.name)?.share ?? 0;
  }

  const minRatio = phases.length === 0 ? 1 : phases.reduce((min, p) => Math.min(min, p.ratio), Number.POSITIVE_INFINITY);

  return {
    content,
    phases,
    estimatedBestPull: phases.length === 0 ? 1 : Number.isFinite(minRatio) ? cumulative : 0,
    partySize: party.length,
    minRatio,
  };
};
