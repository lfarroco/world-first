import type { GameState, Rival } from "./types";
import { RAIDS, contentById } from "./content/content";
import { aiTurn, type AiTurn } from "./ai/turn";
import { personalityById, type Personality } from "./ai/personalities";
import { resolveDay } from "./day";
import { blockingAttention, event, hasBlocking, push } from "./events";
import { rivalPoachTick } from "./poach";
import { rivalRaidsCleared } from "./rivals";

const raidName = (rival: Rival): string => {
  const cleared = rival.guild.progress.filter(
    (p) => contentById(p.contentId)?.kind === "raid" && p.clears > 0,
  );
  return contentById(cleared.at(-1)?.contentId ?? "")?.name ?? "a raid";
};

/**
 * A one-line answer to "what are they doing?". The last encounter is the most
 * honest source: it is the pull that actually happened, not the plan that was
 * supposed to happen.
 */
const activityFor = (rival: Rival): string => {
  const guild = rival.guild;
  if (guild.finished) {
    const raids = rivalRaidsCleared(rival);
    return raids >= RAIDS.length ? "finished the tier" : `run over — ${raids}/${RAIDS.length} raids`;
  }
  const last = guild.lastEncounter;
  if (last && last.day === guild.day - 1) {
    return last.cleared
      ? `cleared ${last.contentName}`
      : `${last.contentName} — best ${Math.round(last.bestPull * 100)}%`;
  }
  const contentId = guild.plan.parties[0]?.contentId;
  if (!contentId) return "resting";
  return `farming ${contentById(contentId)?.name ?? contentId}`;
};

/**
 * Stage 6 of the day: the world. Each rival plays a real day through the same
 * planner and the same `resolveDay`. They are only ticked here, never inside
 * `resolveDay`, so a rival's own resolution cannot recurse into the world.
 */
export const tickRivals = (state: GameState): void => {
  if (state.rivals.length === 0) return;
  const today = state.day - 1;

  // `resolveDay` attached the rival array by reference. Copy each rival before
  // changing its guild, so the caller's state is never mutated.
  const rivals = state.rivals.map((rival) => ({ ...rival }));
  state.rivals = rivals;

  for (const rival of rivals) {
    if (rival.guild.finished) {
      rival.activity = activityFor(rival);
      continue;
    }
    const beforeRaids = rivalRaidsCleared(rival);
    const turn: AiTurn = aiTurn(rival.guild, personalityById(rival.personality));
    rival.guild = turn.state;
    rival.activity = activityFor(rival);
    // Rival events are never shown. Their log otherwise grows to 700 entries
    // and is cloned twice a day, which was the largest cost in an 84-day run.
    if (rival.guild.events.length > 120) {
      rival.guild.events = rival.guild.events.slice(-120);
    }
    // The raid hub's history is the player's screen. A rival is summarised by
    // its activity line and its progress rows; keeping three more bounded logs
    // (40 nights each) only made every save bigger.
    rival.guild.raidLog = [];

    const afterRaids = rivalRaidsCleared(rival);
    if (afterRaids > beforeRaids) {
      push(
        state,
        event(
          today,
          "rival",
          "bad",
          `${rival.name} cleared ${raidName(rival)} — ${afterRaids}/${RAIDS.length} raids.`,
        ),
      );
    }
  }

  // World First is the first third-raid clear. The player's own resolution
  // runs before this tick, so a same-day tie goes to the player; between
  // rivals the table order settles it.
  if (state.worldFirstDay === null) {
    const winner = state.rivals.find(
      (rival) => rival.guild.worldFirstDay === null && rivalRaidsCleared(rival) >= RAIDS.length,
    );
    if (winner) {
      // Copy before writing: a finished rival's guild may still be shared with
      // the caller's state.
      winner.guild = { ...winner.guild, worldFirstDay: today };
      push(
        state,
        event(today, "rival", "bad", `${winner.name} takes World First — the Tyrant falls before you.`),
      );
    }
  }

  // The rivals trade among themselves after their own days. This is ambient:
  // it changes a bench body, not a raid ten, and the Guilds screen shows who
  // moved. It runs after the raid check so it cannot change the World First.
  rivalPoachTick(state);
};

/** One guild day, then the world's. */
export const advanceDay = (state: GameState): GameState => {
  const next = resolveDay(state);
  tickRivals(next);
  return next;
};

export type AdvanceResult = { state: GameState; stopped: string | null };

export const advanceDays = (state: GameState, days = 1): AdvanceResult => {
  let current = state;
  for (let i = 0; i < days; i += 1) {
    if (current.finished) return { state: current, stopped: "the run is over" };
    if (hasBlocking(current)) {
      const blocking = blockingAttention(current);
      const first = blocking[0];
      return {
        state: current,
        stopped: first
          ? `${blocking.length} item(s) need you — starting with "${first.title}"`
          : "attention required",
      };
    }
    current = advanceDay(current);
  }
  return { state: current, stopped: null };
};

/** The player's AI turn, with the rivals' day attached. */
export const playTurn = (state: GameState, personality: Personality): AiTurn => {
  const turn = aiTurn(state, personality);
  tickRivals(turn.state);
  return turn;
};

export const runWorld = (
  state: GameState,
  personality: Personality,
  maxTurns = 200,
): GameState => {
  let current = state;
  let guard = 0;
  while (!current.finished && guard < maxTurns) {
    guard += 1;
    current = playTurn(current, personality).state;
  }
  return current;
};
