import type { EncounterLog, EncounterPullLog, GameEvent, GameState } from "./types";
import { STANCE } from "./content/tuning";
import { masteryFor } from "./encounter";

/** The exact lever the post-fight report shows for one gear tier. */
export const GEAR_TIER_GAIN = 0.15;

export const digestForDay = (state: GameState, day: number): GameEvent[] =>
  state.events.filter((e) => e.day === day);

/**
 * The pull worth reading. A clear must show the pull that killed the boss; a
 * wipe must show the last failure. Showing the last failed pull under a CLEARED
 * banner teaches the wrong lesson about a fight that is over.
 */
export const focusPull = (log: EncounterLog): EncounterPullLog | undefined => {
  const pulls = log.cleared
    ? [...log.pulls].reverse().find((p) => p.killed)
    : [...log.pulls].reverse().find((p) => !p.killed);
  return pulls ?? log.pulls.at(-1);
};

export type NextLever = {
  /** The gain, in check points, and the check it buys. */
  label: string;
  /** What to do, and the cost of doing it. */
  detail: string;
  gain: number;
};

/**
 * The report's "next lever" block, as numbers the player can act on. The report
 * and the CLI both read this, so the browser and the terminal cannot disagree
 * about why a night failed.
 */
export const nextLevers = (state: GameState, log: EncounterLog): NextLever[] => {
  const failed = focusPull(log)?.phases.find((p) => p.outcome === "fail");
  if (!failed) return [];

  const levers: NextLever[] = [];
  const gap = Math.max(0, failed.requirement - failed.value);
  levers.push({
    label: `+${gap} ${failed.checkLabel}`,
    detail: `what the failed check was short (${failed.value}/${failed.requirement})`,
    gain: gap,
  });

  if (log.stance === "push") {
    levers.push({
      label: "Already on Push",
      detail: `the ${Math.round(STANCE.push.check * 100)}% check bonus is already in these numbers`,
      gain: 0,
    });
  } else {
    levers.push({
      label: `+${Math.round(failed.value * STANCE.push.check)} ${failed.checkLabel}`,
      detail: `switch stance to Push (+${Math.round(STANCE.push.check * 100)}% checks, +55% injury risk)`,
      gain: Math.round(failed.value * STANCE.push.check),
    });
  }

  levers.push({
    label: `+${Math.round(failed.value * GEAR_TIER_GAIN)} ${failed.checkLabel}`,
    detail: "one gear tier from the next dungeon clear",
    gain: Math.round(failed.value * GEAR_TIER_GAIN),
  });

  const attempts = state.progress.find((p) => p.contentId === log.contentId)?.attempts ?? 0;
  if (attempts > 0) {
    levers.push({
      label: `mastery ${Math.round(masteryFor(attempts) * 100)}%`,
      detail: `${attempts} pull${attempts === 1 ? "" : "s"} so far (2% per pull, cap 30%)`,
      gain: 0,
    });
  }

  return levers;
};

/** Attempts and mastery on the content that was fought, for the report header. */
export const masteryReport = (
  state: GameState,
  log: EncounterLog,
): { attempts: number; mastery: number } => {
  const attempts = state.progress.find((p) => p.contentId === log.contentId)?.attempts ?? 0;
  return { attempts, mastery: masteryFor(attempts) };
};

/** Traits that moved any phase of the focus pull, as names, deduplicated. */
export const pullTraits = (log: EncounterLog): string[] => {
  const seen = new Set<string>();
  for (const phase of focusPull(log)?.phases ?? []) {
    for (const name of phase.traits ?? []) seen.add(name);
  }
  return [...seen];
};
