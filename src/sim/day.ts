import { clamp, sum } from "./prelude";
import type { ContentKind, GameState, Hero, Stance } from "./types";
import {
  ECONOMY,
  FATIGUE,
  HEALTH_RECOVERY_PER_DAY,
  RUN_DAYS,
  SHARPNESS,
  STANCE,
  TAVERN,
} from "./content/tuning";
import { encounterFatigue, resolveAssignment } from "./encounter";
import { deriveAttention, event, push } from "./events";
import { bestLevel, makeCandidate } from "./content/heroes";
import { gainXp, isAvailable } from "./hero";
import { assignedIds, partyOf } from "./plan";
import { tickRivals } from "./rivals";
import { computeScore } from "./score";
import { contentById } from "./content/content";
import { rngStream } from "./rng";
import { healthRecoveryFor, injuryDaysFor, recruitLevelFactor } from "./facilities";
import { rollEvent } from "./world-events";

const sharpnessFor = (kind: ContentKind): number => {
  switch (kind) {
    case "raid":
      return SHARPNESS.raid;
    case "dungeon":
      return SHARPNESS.dungeon;
    case "mission":
      return SHARPNESS.mission;
    case "farm":
      return SHARPNESS.farm;
  }
};

const fatigueGain = (base: number, endurance: number): number =>
  base * clamp(FATIGUE.endurancePivot - endurance / FATIGUE.enduranceDivisor, 0.55, 1.4);

const heroById = (state: GameState, id: string): Hero | undefined =>
  state.roster.find((h) => h.id === id);

/**
 * The day. Pure from the outside (deep clone in, new state out); locally
 * mutable for readability.
 */
export const resolveDay = (input: GameState): GameState => {
  const state = structuredClone(input);
  const today = state.day;

  // Heroes who cannot fight fall out of their parties and rest.
  const unavailable = new Set(state.roster.filter((h) => !isAvailable(h)).map((h) => h.id));
  if (unavailable.size > 0) {
    state.plan = {
      parties: state.plan.parties.map((p) => ({
        ...p,
        heroes: p.heroes.filter((id) => !unavailable.has(id)),
      })),
    };
  }

  // ── 1. PARTIES ─────────────────────────────────────────────────────────────
  for (const assignment of state.plan.parties.filter((p) => p.heroes.length > 0)) {
    const content = contentById(assignment.contentId);
    if (!content) continue;
    const party = partyOf(state, assignment);
    const result = resolveAssignment(state, assignment);
    if (!result) continue;

    const stance: Stance = assignment.stance;
    state.gold += result.gold;

    for (const hero of party) {
      const xpRng = rngStream(state.seed, "xp", today, hero.id);
      const grown = gainXp(hero, result.xp, xpRng);
      hero.level = grown.hero.level;
      hero.xp = grown.hero.xp;
      hero.attrs = grown.hero.attrs;
      if (grown.levels > 0) {
        push(state, event(today, "level", "good", `${hero.name} reached level ${hero.level}.`, hero.id));
      }
    }

    for (const drop of result.loot) {
      const hero = heroById(state, drop.heroId);
      if (!hero) continue;
      const slot = drop.slot as keyof typeof hero.gear;
      if (slot in hero.gear) hero.gear[slot] = Math.max(hero.gear[slot], drop.ilvl);
    }
    if (result.loot.length > 0) {
      push(
        state,
        event(
          today,
          "loot",
          "good",
          `${content.name}: ${result.loot.map((l) => `${l.name} — ${l.slot} ${l.ilvl}`).join(", ")}.`,
        ),
      );
    }

    for (const hero of party) {
      hero.fatigue = clamp(
        hero.fatigue + fatigueGain(encounterFatigue(content), hero.attrs.endurance) + STANCE[stance].fatigue,
        0,
        100,
      );
      hero.sharpness = clamp(hero.sharpness + sharpnessFor(content.kind), 0, 100);
      hero.daysBenched = 0;
      if (result.cleared && content.kind !== "farm") hero.morale = clamp(hero.morale + 4, 1, 100);
      if (!result.cleared) hero.morale = clamp(hero.morale - 2, 1, 100);
    }

    for (const injury of result.injured) {
      const hero = heroById(state, injury.heroId);
      if (!hero) continue;
      hero.injuryDays = Math.max(hero.injuryDays, injuryDaysFor(injury.days, state.facilities));
      hero.health = clamp(hero.health - 45, 0, 100);
      hero.morale = clamp(hero.morale - 6, 1, 100);
      push(state, event(today, "injury", "bad", `${hero.name} injured — out ${injury.days} days.`, hero.id));
    }

    const progress = state.progress.find((p) => p.contentId === content.id);
    if (progress) {
      progress.attempts += result.pulls.length > 0 ? result.pulls.length : 1;
      progress.bestPull = Math.max(progress.bestPull, result.bestPull);

      if (result.cleared) {
        const firstClear = progress.clears === 0;
        progress.clears += 1;
        if (firstClear) {
          progress.clearedOnDay = today;
          push(state, event(today, "clear", "good", `${content.name} cleared for the first time.`));

          if (content.kind === "dungeon") {
            state.renown += 1;
            if (state.roster.length < 22) {
              const level = Math.max(1, Math.round(bestLevel(state.roster) * 0.55));
              const free = makeCandidate(state.seed, today, 900 + state.roster.length, level, recruitLevelFactor(state.facilities)).hero;
              state.roster.push({ ...free, id: `f${today}-${state.roster.length}` });
              push(
                state,
                event(today, "tavern", "good", `${free.name} heard about ${content.name} and joined for free.`),
              );
            }
          }

          if (content.kind === "raid") {
            state.renown += 3;
            const raidsDone = state.progress.filter(
              (p) => contentById(p.contentId)?.kind === "raid" && p.clears > 0,
            ).length;
            const rivalsAlive = state.rivals.every((r) => r.worldFirstDay === null);
            if (raidsDone >= 3 && rivalsAlive && state.worldFirstDay === null) {
              state.worldFirstDay = today;
              push(state, event(today, "run", "good", "WORLD FIRST. The Obsidian Tyrant falls before any rival guild."));
            }
          }
        }
      } else if (result.pulls.length > 0) {
        push(
          state,
          event(
            today,
            "wipe",
            "bad",
            `${content.name}: ${result.pulls.length} attempts, best ${Math.round(result.bestPull * 100)}%.`,
          ),
        );
      }
    }

    if (content.kind === "raid" && result.pulls.length > 0) {
      state.lastEncounter = {
        day: today,
        contentId: content.id,
        contentName: content.name,
        contentKind: content.kind,
        pulls: result.pulls as never,
        cleared: result.cleared,
        bestPull: result.bestPull,
        injured: result.injured.map((i) => i.name),
        stance,
        xp: result.xp,
        gold: result.gold,
      };
    }
  }

  // ── 2. REST ────────────────────────────────────────────────────────────────
  const deployed = assignedIds(state.plan);
  for (const hero of state.roster) {
    if (deployed.has(hero.id)) continue;
    hero.fatigue = clamp(hero.fatigue + FATIGUE.rest, 0, 100);
    hero.sharpness = clamp(hero.sharpness + SHARPNESS.rest, 0, 100);
    hero.health = clamp(hero.health + healthRecoveryFor(state.facilities), 0, 100);
    if (hero.injuryDays > 0) hero.injuryDays -= 1;
    hero.daysBenched += 1;
    if (hero.daysBenched >= 3) hero.morale = clamp(hero.morale - 4, 1, 100);
  }

  // ── 3. WORLD ───────────────────────────────────────────────────────────────
  tickRivals(state);
  for (const rival of state.rivals) {
    if (rival.worldFirstDay === today) {
      push(state, event(today, "rival", "bad", `${rival.name} cleared a raid.`));
    }
  }

  // ── 4. UPKEEP ──────────────────────────────────────────────────────────────
  for (const hero of state.roster) hero.contract.daysLeft -= 1;

  const leaving = state.roster.filter((h) => h.contract.daysLeft <= 0);
  for (const hero of leaving) {
    state.roster = state.roster.filter((h) => h.id !== hero.id);
    state.plan = {
      parties: state.plan.parties.map((p) => ({
        ...p,
        heroes: p.heroes.filter((id) => id !== hero.id),
      })),
    };
    push(state, event(today, "economy", "bad", `${hero.name} left the guild — contract expired.`, hero.id));
  }

  if (today % 7 === 0) {
    const bill = sum(state.roster.map((h) => h.contract.wage));
    state.gold -= bill;
    push(state, event(today, "economy", "info", `Wages paid: ${bill}g.`));
    const guildLevel = bestLevel(state.roster);
    state.tavern = Array.from({ length: TAVERN.size }, (_, i) =>
      makeCandidate(state.seed, today, i, guildLevel, recruitLevelFactor(state.facilities)),
    );
    push(state, event(today, "tavern", "info", "The tavern has new faces."));
  }

  if (state.gold < 0) {
    state.arrearsDays += 1;
    if (state.arrearsDays === 1 || state.arrearsDays % 5 === 0) {
      push(
        state,
        event(today, "economy", "bad", `In arrears (${state.arrearsDays} days, ${Math.round(state.gold)}g).`),
      );
    }
    for (const hero of state.roster) hero.morale = clamp(hero.morale - 2, 1, 100);
  }

  // ── 5. NEXT DAY ────────────────────────────────────────────────────────────
  state.day = today + 1;

  if (state.day > RUN_DAYS) {
    const result = computeScore(state);
    state.finished = true;
    state.score = result.total;
    state.scoreLines = result.lines;
    state.band = result.band;
    state.attention = [];
  } else {
    state.pendingEvent = state.pendingEvent ?? rollEvent(state);
    state.attention = deriveAttention(state);
  }

  return state;
};

export const wageSummary = (state: GameState) => ({
  bill: sum(state.roster.map((h) => h.contract.wage)),
  budget: ECONOMY.wageBudgetBase + state.renown * ECONOMY.wageBudgetPerRenown,
});
