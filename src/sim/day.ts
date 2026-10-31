import { clamp, sum } from "./prelude";
import type { ContentKind, GameState, Hero, LootItem, Stance } from "./types";
import {
  FATIGUE,
  HEALTH_RECOVERY_PER_DAY,
  PROMISE,
  RUN_DAYS,
  SHARPNESS,
  STANCE,
  TAVERN,
} from "./content/tuning";
import { encounterFatigue, resolveAssignment } from "./encounter";
import { deriveAttention, announceUnlocks, event, push } from "./events";
import { bestLevel, makeCandidate } from "./content/heroes";
import { gainXp } from "./hero";
import { assignedIds, partyOf, pruneUnavailable, sanitizePlan } from "./plan";
import { computeScore } from "./score";
import { CONTENT, contentById } from "./content/content";
import { rngStream } from "./rng";
import { payScaleFor } from "./board";
import { autoAssignLoot, queueLoot } from "./loot";
import { pruneRaidTeam } from "./team";
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
  // The world's guilds are not part of the guild's day. Clone the guild, then
  // attach the rivals by reference: the day only reads their World First flag,
  // and `tickRivals` copies each rival before it touches one. Cloning three
  // growing 84-day states on every day of every sweep was 12 ms/day on its own.
  // A drop from yesterday is applied before today's plan is read. The player
  // had the day to reassign it; an unresolved drop goes to its suggestion.
  const carried = autoAssignLoot(input);
  const { rivals, ...guild } = carried;
  let state = structuredClone(guild) as GameState;
  state.rivals = rivals;
  const today = state.day;

  // A save written before an area existed has no progress row for it. Add the
  // row here so an old save can still clear the new content; without this the
  // payout block below finds no progress and silently keeps the clear count.
  for (const content of CONTENT) {
    if (!state.progress.some((p) => p.contentId === content.id)) {
      state.progress.push({
        contentId: content.id,
        clears: 0,
        clearedOnDay: null,
        attempts: 0,
        bestPull: 0,
      });
    }
  }

  // A plan is player input. Validate it before any gold or XP is paid out:
  // locked content, duplicate heroes and bad stances are dropped, not trusted.
  const sanitized = sanitizePlan(state);
  state.plan = sanitized.plan;
  if (sanitized.problems.length > 0) {
    const first = sanitized.problems[0]!;
    const rest = sanitized.problems.length > 1 ? ` (+${sanitized.problems.length - 1} more)` : "";
    push(state, event(today, "run", "bad", `Plan ignored: ${first.message}${rest}.`));
  }

  // Heroes who cannot fight fall out of their parties and rest. Unless the day
  // says who moved, the player discovers it as a party that quietly went out
  // short — or as an advance that refuses on a plan the game invalidated.
  const opening = pruneUnavailable(state);
  if (opening.notes.length > 0) {
    state.plan = opening.plan;
    for (const note of opening.notes) push(state, event(today, "run", "bad", note));
  }

  // ── 1. PARTIES ─────────────────────────────────────────────────────────────
  for (const assignment of state.plan.parties.filter((p) => p.heroes.length > 0)) {
    const content = contentById(assignment.contentId);
    if (!content) continue;
    const party = partyOf(state, assignment);
    const result = resolveAssignment(state, assignment);
    if (!result) continue;

    const stance: Stance = assignment.stance;
    const economy = result.economy;
    // The day's contract board decides the pay for a repeated mission. The
    // first clear is always full; the scale is read before `progress.clears`
    // moves below, so the night that clears an area is never taxed.
    const pay = payScaleFor(state, content);
    state.gold += Math.round(result.gold * (1 + economy.goldPct) * pay);
    const lowestId = [...party].sort((a, b) => a.level - b.level)[0]?.id;

    for (const hero of party) {
      const xpRng = rngStream(state.seed, "xp", today, hero.id);
      const xp = Math.round(
        result.xp *
          (1 + economy.xpPct + (hero.id === lowestId ? economy.mentorPct : 0)) *
          (state.rewardScale ?? 1) *
          pay,
      );
      const grown = gainXp(hero, xp, xpRng);
      hero.level = grown.hero.level;
      hero.xp = grown.hero.xp;
      hero.attrs = grown.hero.attrs;
      if (grown.levels > 0) {
        push(state, event(today, "level", "good", `${hero.name} reached level ${hero.level}.`, hero.id));
      }
    }

    if (result.loot.length > 0) {
      const queued = queueLoot(state, content, party, result.loot, today);
      const discarded = result.loot.length - queued.length;
      if (queued.length > 0) {
        state.pendingLoot = [...(state.pendingLoot ?? []), ...queued];
        push(
          state,
          event(
            today,
            "loot",
            "good",
            `${content.name}: ${queued
              .map((l) => (l.item ? `${l.item} (${l.slot} ${l.ilvl})` : `${l.slot} ${l.ilvl}`))
              .join(", ")} — run loot to assign.`,
          ),
        );
      }
      if (discarded > 0) {
        push(
          state,
          event(
            today,
            "loot",
            "info",
            `${content.name}: ${discarded} drop${discarded === 1 ? "" : "s"} had no upgrade for any hero.`,
          ),
        );
      }
    }

    for (const hero of party) {
      hero.fatigue = clamp(
        hero.fatigue +
          fatigueGain(encounterFatigue(content) + economy.fatigue, hero.attrs.endurance) +
          STANCE[stance].fatigue,
        0,
        100,
      );
      hero.sharpness = clamp(hero.sharpness + sharpnessFor(content.kind) + economy.sharpness, 0, 100);
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
      const firstAttempt = progress.attempts === 0;
      progress.attempts += result.pulls.length > 0 ? result.pulls.length : 1;
      progress.bestPull = Math.max(progress.bestPull, result.bestPull);

      // The first pull discovers a threat. That is the scouting pull: the
      // report names what the boss does, and the next plan can answer it.
      if (firstAttempt) {
        const seen = new Set<string>();
        for (const pull of result.pulls) {
          for (const phase of pull.phases) {
            const ability = phase.ability;
            if (!ability || ability.known || seen.has(ability.id)) continue;
            seen.add(ability.id);
            const effect = ability.countered
              ? "the party answered it"
              : `${phase.checkLabel.toLowerCase()} checks ${Math.round((1 - ability.mult) * 100)}% harder`;
            push(state, event(today, "progress", "info", `New mechanic at ${content.name}: ${ability.name} — ${effect}.`));
          }
        }
      }

      if (result.cleared) {
        const firstClear = progress.clears === 0;
        progress.clears += 1;
        if (firstClear) {
          progress.clearedOnDay = today;
          push(state, event(today, "clear", "good", `${content.name} cleared for the first time.`));

          if (content.kind === "dungeon") {
            state.renown += 1;
            if (content.firstClearRecruit !== false && state.roster.length < 22) {
              // `makeCandidate` already scales by a factor of the guild's best
              // level. Pass the guild level and the 0.55 factor once; passing
              // 0.55 × best as the guild level double-scaled it to ~34%.
              const free = makeCandidate(state.seed, today, 900 + state.roster.length, bestLevel(state.roster), 0.55).hero;
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
            // A rival guild has no rivals of its own. The world tick is what
            // awards World First to a rival; a guild resolving on its own must
            // not hand itself one just because its `rivals` array is empty.
            const rivalsAlive =
              state.rivals.length > 0 &&
              state.rivals.every((r) => r.guild.worldFirstDay === null);
            if (raidsDone >= 3 && rivalsAlive && state.worldFirstDay === null) {
              state.worldFirstDay = today;
              push(state, event(today, "run", "good", "WORLD FIRST. The Obsidian Tyrant falls before any rival guild."));
            }
          }
        }
      } else if (result.pulls.length > 0) {
        const failed = result.pulls.at(-1)?.phases.find((p) => p.outcome === "fail");
        const detail = failed ? ` — ${failed.checkLabel} ${failed.value}/${failed.requirement}` : "";
        push(
          state,
          event(
            today,
            "wipe",
            "bad",
            `${content.name}: ${result.pulls.length} attempts, best ${Math.round(result.bestPull * 100)}%${detail}.`,
          ),
        );
      }
    }

    // Every non-farm encounter leaves a report, not just raids. A dungeon wipe
    // that only says "best 50%" is the slot machine the design forbids.
    if (content.kind !== "farm" && result.pulls.length > 0) {
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
        xp: Math.round(result.xp * pay),
        gold: Math.round(result.gold * pay),
        payScale: pay,
        loot: result.loot as LootItem[],
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

  // A hero hurt during the day cannot deploy tomorrow. Prune the plan now and
  // name who moved; the alternative is an advance that refuses on a plan the
  // simulation itself invalidated.
  const pruned = pruneUnavailable(state);
  state.plan = pruned.plan;
  for (const note of pruned.notes) push(state, event(today, "run", "info", note));

  // ── 2b. PROMISES ───────────────────────────────────────────────────────────
  // A promise is a debt with a date. Starts are counted while the window is
  // open; on the last day it either stands or falls. Both outcomes are named,
  // because a promise that quietly disappears teaches the player nothing.
  if (state.promises) {
    for (const promise of state.promises) {
      if (promise.status !== "open") continue;
      const hero = heroById(state, promise.heroId);
      if (!hero) {
        promise.status = "broken";
        continue;
      }
      if (deployed.has(hero.id)) promise.daysAssigned += 1;
      if (today < promise.dueOn) continue;

      const kept = promise.daysAssigned >= PROMISE.startsRequired;
      promise.status = kept ? "kept" : "broken";
      hero.morale = clamp(hero.morale + (kept ? PROMISE.keptMorale : PROMISE.brokenMorale), 1, 100);
      // The promise settles the squad status too: a kept promise is the end of
      // the A-team claim, and a broken one is the bench mark the planner sees.
      hero.contract = kept
        ? { ...hero.contract, status: "rotation" }
        : { ...hero.contract, status: "bench" };
      push(
        state,
        event(
          today,
          "morale",
          kept ? "good" : "bad",
          kept
            ? `${hero.name} got his starts — the promise is kept.`
            : `${hero.name} was promised starts he did not get. The promise is broken.`,
          hero.id,
        ),
      );
    }
  }

  // ── 3. UPKEEP ──────────────────────────────────────────────────────────────
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
  state = pruneRaidTeam(state);

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

  // ── 4. NEXT DAY ────────────────────────────────────────────────────────────
  // An area opens when the roster can field it: a level crossed tonight, a
  // fourth hero, a prerequisite cleared. The content list hides closed areas,
  // so this event is how the player learns about it.
  announceUnlocks(state, today);

  state.day = today + 1;

  if (state.day > RUN_DAYS) {
    // The last night's drops are part of the final strength score; apply them
    // before `computeScore` reads the roster.
    state = autoAssignLoot(state);
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
