import { sum } from "../prelude";
import type { Assignment, Candidate, ContentDef, GameState, Hero, Plan, Stance } from "../types";
import { contentById } from "../content/content";
import { MAX_PARTIES, ROSTER_CAP } from "../content/tuning";
import { bestPartyFor, levelOk, rankFor, sizeOk, unlockedContent } from "../plan";
import { projectAssignment } from "../encounter";
import { heroPower, isAvailable } from "../hero";
import { wageBill, wageBudget } from "../economy";
import type { Personality } from "./personalities";

const KIND_BONUS: Record<string, number> = {
  raid: 320,
  dungeon: 220,
  mission: 120,
  farm: 0,
};

export type AiChoice = {
  readonly content: ContentDef;
  readonly party: Hero[];
  readonly stance: Stance;
  readonly ratio: number;
  readonly reason: string;
};

const persona = (ratio: number, personality: Personality): Stance => {
  if (ratio < 1.02 && personality.ambition > 0.4) return "push";
  return "steady";
};

const stanceFor = (ratio: number, personality: Personality): Stance => {
  if (ratio >= 0.9 && ratio < 1.02 && personality.ambition > 0.6) return "push";
  if (ratio > 1.35 && personality.caution > 0.55) return "cautious";
  return "steady";
};

/** Score a content for this pool. Higher is better; -Infinity means not viable. */
const scoreContent = (
  state: GameState,
  content: ContentDef,
  pool: readonly Hero[],
  personality: Personality,
): AiChoice | null => {
  if (pool.length < content.minHeroes) return null;
  const eligible = pool.filter((h) => h.level >= content.minLevel);
  if (eligible.length < content.minHeroes) return null;

  const party = bestPartyFor(state, content, pool);
  if (!sizeOk(content, party) || !levelOk(content, party)) return null;

  const attempt: Assignment = {
    contentId: content.id,
    heroes: party.map((h) => h.id),
    stance: "steady",
  };
  const projection = projectAssignment(state, attempt);
  if (!projection) return null;

  const ratio = projection.minRatio;
  const tolerable = 1 - personality.ambition * 0.18;
  const cleared = state.progress.find((p) => p.contentId === content.id)?.clears ?? 0;

  if (content.kind === "farm") {
    return { content, party, stance: "steady", ratio, reason: "1" };
  }

  // Value is mostly XP and gold: the AI should climb, not camp a low dungeon.
  const value = content.xp + content.gold / 8;
  const priority =
    cleared === 0
      ? 5000 + content.tier * 200 + value + ratio * 30
      : content.tier * 200 + value * 0.45 + ratio * 30;

  if (ratio >= tolerable) {
    return { content, party, stance: stanceFor(ratio, personality), ratio, reason: priority.toFixed(0) };
  }

  // Not clearable, but a training attempt still earns XP and mastery.
  // Better to fail on a mission than to farm forever at level 1.
  if (ratio >= 0.62 && content.xp > 20) {
    return {
      content,
      party,
      stance: persona(ratio, personality),
      ratio,
      reason: (priority * 0.35).toFixed(0),
    };
  }

  return null;
};

/**
 * The planner. Framework-free and personality-driven so the same code can drive
 * the player's bot, the balance sweep, and (later) the rival guilds.
 */
export const planDay = (
  state: GameState,
  personality: Personality,
): { plan: Plan; choices: AiChoice[]; notes: string[] } => {
  const notes: string[] = [];
  const available = state.roster.filter(isAvailable);
  const restThreshold = 58 + personality.caution * 30;

  const parties: Assignment[] = [];
  const assigned = new Set<string>();
  const choices: AiChoice[] = [];
  const candidates = unlockedContent(state);
  const resting = new Set<string>();

  // ── Raid prep ─────────────────────────────────────────────────────────────
  // A raid needs ten specific people, fresh. The AI holds them back and rests
  // them rather than grinding dungeons until everyone is tired.
  const nextRaid = candidates.find(
    (c) => c.kind === "raid" && (state.progress.find((p) => p.contentId === c.id)?.clears ?? 0) === 0,
  );
  if (nextRaid) {
    const eligible = available.filter((h) => h.level >= nextRaid.minLevel);
    if (eligible.length >= nextRaid.minHeroes) {
      const party = bestPartyFor(state, nextRaid, eligible);
      const projection = projectAssignment(state, {
        contentId: nextRaid.id,
        heroes: party.map((h) => h.id),
        stance: "steady",
      });
      if (projection && projection.minRatio >= 0.72) {
        const avg = party.reduce((acc, h) => acc + h.fatigue, 0) / party.length;
        if (avg > 42) {
          for (const hero of party) resting.add(hero.id);
          notes.push(`holding the raid party back (avg fatigue ${Math.round(avg)}) for ${nextRaid.name}`);
        } else {
          const stance: Stance = projection.minRatio < 1.0 && personality.ambition > 0.6 ? "push" : "steady";
          parties.push({ contentId: nextRaid.id, heroes: party.map((h) => h.id), stance });
          for (const hero of party) assigned.add(hero.id);
          notes.push(`RAID — ${nextRaid.name} (${Math.round(projection.minRatio * 100)}% of requirement)`);
        }
      }
    }
  }

  const ready = available.filter((h) => h.fatigue < restThreshold && !assigned.has(h.id) && !resting.has(h.id));
  const tired = available.filter(
    (h) => h.fatigue >= restThreshold && !assigned.has(h.id) && !resting.has(h.id),
  );

  for (let slot = parties.length; slot < MAX_PARTIES; slot += 1) {
    const pool = ready.filter((h) => !assigned.has(h.id));
    if (pool.length === 0) break;

    let best: AiChoice | null = null;
    for (const content of candidates) {
      const pick = scoreContent(state, content, pool, personality);
      if (!pick) continue;
      if (!best || Number(pick.reason) > Number(best.reason)) best = pick;
    }

    if (!best) {
      // Nothing viable: farm with whoever is left.
      const farm = contentById("emberwood");
      if (!farm || pool.length === 0) break;
      const party = rankFor(pool, farm).slice(0, farm.maxHeroes);
      best = { content: farm, party, stance: "steady", ratio: 1, reason: "farm" };
    }

    // Never send a party into something it cannot survive if a farm exists.
    const projection = projectAssignment(state, {
      contentId: best.content.id,
      heroes: best.party.map((h) => h.id),
      stance: best.stance,
    });
    if (projection && projection.minRatio < 0.75 && best.content.kind !== "farm") {
      const farm = contentById("emberwood");
      if (farm) {
        const party = rankFor(pool, farm).slice(0, farm.maxHeroes);
        best = { content: farm, party, stance: "steady", ratio: 1, reason: "farm" };
      }
    }

    parties.push({
      contentId: best.content.id,
      heroes: best.party.map((h) => h.id),
      stance: best.stance,
    });
    for (const hero of best.party) assigned.add(hero.id);
    choices.push(best);
    notes.push(
      `${best.content.name} ← ${best.party.map((h) => h.name.split(" ")[0]).join(", ")} (${best.stance}, ${Math.round(best.ratio * 100)}%)`,
    );
  }

  // Tired heroes either farm light content or rest entirely.
  const stillTired = tired.filter((h) => !assigned.has(h.id));
  const exhausted = stillTired.filter((h) => h.fatigue >= 84);
  const light = stillTired.filter((h) => h.fatigue < 84);
  if (exhausted.length > 0) notes.push(`${exhausted.length} heroes resting`);
  const lightTired = light;
  if (lightTired.length > 0 && parties.length < MAX_PARTIES) {
    const farm = contentById("old-quarry");
    const fallback = contentById("emberwood");
    const zone = farm && bestPartyFor(state, farm, lightTired).length >= farm.minHeroes ? farm : fallback;
    if (zone) {
      const party = rankFor(lightTired, zone).slice(0, zone.maxHeroes);
      if (party.length >= zone.minHeroes) {
        parties.push({ contentId: zone.id, heroes: party.map((h) => h.id), stance: "steady" });
        notes.push(`${party.length} tired heroes sent to ${zone.name}`);
      }
    }
  }

  return { plan: { parties }, choices, notes };
};

/** Should the AI hire, and who? */
export const hireDecision = (state: GameState, personality: Personality): Candidate | null => {
  if (state.roster.length >= ROSTER_CAP) return null;

  const bill = wageBill(state.roster);
  const budget = wageBudget(state.renown);
  const reserve = 80 + personality.thrift * 500;

  // Stop hiring when wages are already tight: the roster has to be affordable.
  const wageHeadroom = budget - bill;
  const targetSize = state.roster.length < 12 ? 12 : 14;
  if (state.roster.length >= targetSize) return null;

  const affordable = state.tavern.filter(
    (c) => c.fee <= state.gold - reserve && c.hero.contract.wage <= Math.max(20, wageHeadroom),
  );
  if (affordable.length === 0) return null;

  return [...affordable].sort((a, b) => heroPower(b.hero) - heroPower(a.hero))[0] ?? null;
};

export const rosterStrength = (heroes: readonly Hero[]): number => sum(heroes.map(heroPower));
