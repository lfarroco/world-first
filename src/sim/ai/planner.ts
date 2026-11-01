import { sum } from "../prelude";
import type { Assignment, Candidate, ContentDef, GameState, Hero, Plan, RoleId, Stance } from "../types";
import { contentById, FARMS } from "../content/content";
import { MAX_PARTIES, REST, RUN_DAYS } from "../content/tuning";
import { bestPartyFor, levelOk, sizeOk, availableContent, contentAvailability } from "../plan";
import { projectAssignment, withCounters } from "../encounter";
import { heroPower, isAvailable } from "../hero";
import { wageBill } from "../economy";
import { rosterCapFor, wageBudgetFor, nextCost, buyFacility, FACILITIES, type FacilityId } from "../facilities";
import { roleById, rolesForClass } from "../content/roles";
import type { Personality } from "./personalities";
import { effectiveReward, postedContractIds } from "../board";
import { featuredContentFor } from "../featured";
import { rewardContext, rewardValue, type RewardContext } from "./reward";
import { stableRaidParty } from "../team";

export type AiChoice = {
  readonly content: ContentDef;
  readonly party: Hero[];
  readonly stance: Stance;
  readonly ratio: number;
  /** The value the planner compared, in XP-equivalent. */
  readonly score: number;
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
  posted: ReadonlySet<string>,
  valueCtx: RewardContext,
  featuredId: string | undefined,
): AiChoice | null => {
  if (pool.length < content.minHeroes) return null;

  // The level gate is the party's average, the same rule the content list and
  // `validatePlan` use. Filtering heroes one by one here made the planner
  // refuse a party the player was allowed to send.
  const party = withCounters(state, content, bestPartyFor(state, content, pool), pool);
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
    // A farm is a real choice, not a floor. The old constant "1" meant the main
    // loop always took Emberwood and `fallbackFarm` never compared gold farms.
    const farmReward = effectiveReward(state, content, posted, featuredId);
    const farmValue = rewardValue(state, content, party, farmReward, valueCtx);
    return { content, party, stance: "steady", ratio, score: farmValue };
  }

  // The bot will not spend a night on a token repeat. A human may: the token is
  // a price, and the planner is the test harness for "the board changes the
  // pick". First clears are still full pay, so learning a new area is never
  // taxed.
  if (cleared > 0 && content.kind === "mission" && !posted.has(content.id)) return null;

  // Value is mostly XP and gold, at today's contract pay.
  const reward = effectiveReward(state, content, posted, featuredId);
  const value = rewardValue(state, content, party, reward, valueCtx);
  // A clear chance above 100% is not extra reward. The uncapped term made the
  // easiest cleared mission beat the gold run the guild needed, because a
  // maxed party's ratio is 3–5 rather than 1.
  const ratioBonus = 30 * Math.min(ratio, 1.2);
  const priority =
    cleared === 0
      ? 5000 + content.tier * 200 + value + ratioBonus
      : content.tier * 200 + value * 0.45 + ratioBonus;

  if (ratio >= tolerable) {
    return { content, party, stance: stanceFor(ratio, personality), ratio, score: priority };
  }

  // Not clearable, but a training attempt still earns XP and mastery.
  // Better to fail on a mission than to farm forever at level 1.
  if (ratio >= 0.62 && reward.xp > 20) {
    return {
      content,
      party,
      stance: persona(ratio, personality),
      ratio,
      score: priority * 0.35,
    };
  }

  return null;
};

/**
 * The best open farm the remaining pool can field. The old code hardcoded
 * Emberwood and The Old Quarry; the ladder now has three farms, and a hardcoded
 * pair silently caps how many parties can farm on the same day.
 */
const fallbackFarm = (
  state: GameState,
  pool: readonly Hero[],
  usedContent: ReadonlySet<string>,
  posted: ReadonlySet<string>,
  valueCtx: RewardContext,
  featuredId: string | undefined,
): AiChoice | null => {
  let bestContent: ContentDef | null = null;
  let bestParty: Hero[] = [];
  let bestValue = -Infinity;
  for (const content of FARMS) {
    if (usedContent.has(content.id)) continue;
    const availability = contentAvailability(state, content);
    if (availability.status === "locked" || availability.status === "level" || availability.status === "roster") {
      continue;
    }
    const party = bestPartyFor(state, content, pool);
    if (party.length < content.minHeroes || !levelOk(content, party)) continue;
    const reward = effectiveReward(state, content, posted, featuredId);
    const value = rewardValue(state, content, party, reward, valueCtx);
    if (value > bestValue) {
      bestValue = value;
      bestContent = content;
      bestParty = party;
    }
  }
  return bestContent ? { content: bestContent, party: bestParty, stance: "steady", ratio: 1, score: bestValue } : null;
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
  const usedContent = new Set<string>();
  const choices: AiChoice[] = [];
  const candidates = availableContent(state);
  const posted = postedContractIds(state, candidates);
  const valueCtx = rewardContext(state);
  // An empty id means "no star today", which avoids the default parameter in
  // `effectiveReward` recomputing `availableContent` for every area.
  const featuredId = featuredContentFor(state, candidates)?.id ?? "";
  const resting = new Set<string>();
  const daysLeft = RUN_DAYS - state.day;

  // ── Raid prep ─────────────────────────────────────────────────────────────
  // A raid needs ten specific people, fresh. The AI holds them back and rests
  // them rather than grinding dungeons until everyone is tired.
  const nextRaid = candidates.find(
    (c) => c.kind === "raid" && (state.progress.find((p) => p.contentId === c.id)?.clears ?? 0) === 0,
  );
  if (nextRaid) {
    const party = withCounters(state, nextRaid, stableRaidParty(state, nextRaid), available);
    if (party.length >= nextRaid.minHeroes && levelOk(nextRaid, party)) {
      const projection = projectAssignment(state, {
        contentId: nextRaid.id,
        heroes: party.map((h) => h.id),
        stance: "steady",
      });
      // In the last few days, hold the raid party even if it is currently
      // tired and the projection is depressed by fatigue. Using those ten
      // heroes for one more dungeon is how the run ends with no last attempt.
      const endgame = daysLeft <= 4 && daysLeft >= 0;
      const capable = projection
        ? projection.minRatio >= (endgame ? 0.5 : 0.72)
        : false;
      if (projection && capable) {
        const avg = party.reduce((acc, h) => acc + h.fatigue, 0) / party.length;
        const mustTry = daysLeft <= 0;
        if (avg > 42 && !mustTry) {
          for (const hero of party) resting.add(hero.id);
          notes.push(`holding the raid party back (avg fatigue ${Math.round(avg)}) for ${nextRaid.name}`);
        } else {
          // Push at the margin regardless of temperament: the +12% is what
          // moves a 0.90 check into a pass, and the injury multiplier only
          // fires on a scrape (L65). A raid night lost on steady cannot be
          // won by caution.
          const stance: Stance = projection.minRatio < 1.05 ? "push" : "steady";
          parties.push({ contentId: nextRaid.id, heroes: party.map((h) => h.id), stance });
          usedContent.add(nextRaid.id);
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
      // One party per content per day. Two parties on the same dungeon
      // double-dips loot, XP and mastery, and a human cannot do it.
      if (usedContent.has(content.id)) continue;
      const pick = scoreContent(state, content, pool, personality, posted, valueCtx, featuredId);
      if (!pick) continue;
      if (!best || pick.score > best.score) best = pick;
    }

    if (!best) {
      // Nothing viable: farm with whoever is left, in a zone nobody is using.
      const farm = fallbackFarm(state, pool, usedContent, posted, valueCtx, featuredId);
      if (!farm) break;
      best = farm;
    }

    // Never send a party into something it cannot survive if a farm exists.
    const projection = projectAssignment(state, {
      contentId: best.content.id,
      heroes: best.party.map((h) => h.id),
      stance: best.stance,
    });
    if (projection && projection.minRatio < 0.75 && best.content.kind !== "farm") {
      const farm = fallbackFarm(state, pool, usedContent, posted, valueCtx, featuredId);
      if (!farm) break;
      best = farm;
    }

    parties.push({
      contentId: best.content.id,
      heroes: best.party.map((h) => h.id),
      stance: best.stance,
    });
    usedContent.add(best.content.id);
    for (const hero of best.party) assigned.add(hero.id);
    choices.push(best);
    notes.push(
      `${best.content.name} ← ${best.party.map((h) => h.name).join(", ")} (${best.stance}, ${Math.round(best.ratio * 100)}%)`,
    );
  }

  // Tired heroes either farm light content or rest entirely.
  const stillTired = tired.filter((h) => !assigned.has(h.id));
  const exhausted = stillTired.filter((h) => h.fatigue >= REST.exhausted);
  const light = stillTired.filter((h) => h.fatigue < REST.exhausted);
  if (exhausted.length > 0) notes.push(`${exhausted.length} heroes resting`);
  const lightTired = light;
  if (lightTired.length > 0 && parties.length < MAX_PARTIES) {
    const zone = fallbackFarm(state, lightTired, usedContent, posted, valueCtx, featuredId);
    if (zone && zone.party.length >= zone.content.minHeroes) {
      parties.push({ contentId: zone.content.id, heroes: zone.party.map((h) => h.id), stance: "steady" });
      usedContent.add(zone.content.id);
      notes.push(`${zone.party.length} tired heroes sent to ${zone.content.name}`);
    }
  }

  return { plan: { parties }, choices, notes };
};

/** Should the AI hire, and who? */
export const hireDecision = (state: GameState, personality: Personality): Candidate | null => {
  if (state.roster.length >= rosterCapFor(state.facilities)) return null;

  const bill = wageBill(state.roster);
  const budget = wageBudgetFor(state.renown, state.facilities);
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

/**
 * Spend surplus gold on facilities. The AI prioritises the forge (gear compounds),
 * then the infirmary (fewer lost days). It keeps a reserve so it can still hire.
 */
export const facilityDecision = (state: GameState, personality: Personality): FacilityId | null => {
  const reserve = 1200 + personality.thrift * 2500;
  if (state.gold < reserve) return null;

  const order: Array<"forge" | "infirmary" | "tavern" | "hall"> = ["forge", "infirmary", "tavern", "hall"];
  for (const id of order) {
    const cost = nextCost(state.facilities, id);
    if (cost !== null && state.gold - cost >= reserve * 0.5) return id;
  }
  return null;
};

export const applyFacilityDecision = (
  state: GameState,
  personality: Personality,
): GameState => {
  const id = facilityDecision(state, personality);
  if (!id) return state;
  const next = buyFacility(state, id);
  return next ?? state;
};

export const facilityNames = FACILITIES.map((f) => f.name).join(", ");

/** Back to the creation role. The AI re-specs for each night, never carries a flip. */
export const resetRoles = (roster: readonly Hero[]): Hero[] => {
  let changed = false;
  const next = roster.map((h) => {
    const natural = h.naturalRole ?? h.role;
    if (h.role === natural) return h;
    changed = true;
    return { ...h, role: natural };
  });
  return changed ? next : [...roster];
};

/**
 * Give the planned parties their best roles before the night resolves.
 *
 * A wider affinity table made the old reviewer flip on 17-21% of days because
 * it re-specced parties that already cleared, paying the 0.88 fit on checks
 * nobody needed. The reviewer now only touches a party that projects below
 * 1.0, picks the single best alt, allows at most two flips, and reverts the
 * whole party's flips if they do not carry it across 1.0. The result is a
 * small, legible role decision, not nightly churn.
 */
export const reviewRoles = (
  state: GameState,
  plan: Plan,
): { state: GameState; notes: string[] } => {
  let roster = state.roster;
  const notes: string[] = [];
  const changed = new Map<string, string>();

  for (const party of plan.parties) {
    const content = contentById(party.contentId);
    if (!content || content.phases.length === 0) continue;

    let current = roster;
    let flips = 0;
    const partyNotes: { id: string; text: string }[] = [];

    for (let pass = 0; pass < 2; pass += 1) {
      const before = projectAssignment({ ...state, roster: current }, party);
      const best = before?.minRatio ?? 0;
      if (best >= 1.0) break;
      const weakest = before?.phases.reduce((a, b) => (a.ratio <= b.ratio ? a : b));

      // One best flip per pass, not the first one that helps: the reviewer is
      // choosing the role that carries the party, not wandering through alts.
      let pick: { heroId: string; roleId: RoleId; ratio: number } | null = null;
      for (const id of party.heroes) {
        const hero = current.find((h) => h.id === id);
        if (!hero) continue;
        for (const alt of rolesForClass(hero.klass)) {
          if (alt.id === hero.role) continue;
          const trial = current.map((h) => (h.id === id ? { ...h, role: alt.id } : h));
          const ratio = projectAssignment({ ...state, roster: trial }, party)?.minRatio ?? 0;
          if (ratio <= best + 0.015) continue;
          if (!pick || ratio > pick.ratio) pick = { heroId: id, roleId: alt.id, ratio };
        }
      }
      if (!pick) break;

      const hero = current.find((h) => h.id === pick!.heroId);
      const roleName = roleById(pick.roleId).name;
      current = current.map((h) => (h.id === pick!.heroId ? { ...h, role: pick!.roleId } : h));
      flips += 1;
      if (hero) {
        partyNotes.push({
          id: hero.id,
          text: `${hero.name} → ${roleName} (${weakest?.checkLabel ?? "weakest"} ${best.toFixed(2)} → ${pick.ratio.toFixed(2)})`,
        });
      }
      if (flips >= 2) break;
    }

    if (flips > 0) {
      roster = current;
      for (const note of partyNotes) {
        if (!changed.has(note.id)) changed.set(note.id, note.text);
      }
    }
  }

  if (changed.size === 0) return { state, notes };
  return {
    state: { ...state, roster },
    notes: [`roles: ${[...changed.values()].join(", ")}`],
  };
};
