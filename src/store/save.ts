import { nowIso } from "../app/clock";
import type { GameState } from "../sim";
import type { LoggedAction } from "./actions";

/**
 * A save is the state plus the action log. The state is a cache the UI can load
 * instantly; the log is what a future replay will read. The version gate is
 * here from the first save so a shape change never silently loads garbage.
 */
export const SAVE_VERSION = 1;
export const SAVE_KEY = "world-first.save";

export type SaveFile = {
  version: number;
  seed: number;
  savedAt: string;
  state: GameState;
  actionLog: LoggedAction[];
};

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

/** Browser storage, or null during tests and on the server. */
export const browserStorage = (): StorageLike | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

const isGameState = (value: unknown): value is GameState => {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<GameState>;
  return (
    typeof state.seed === "number" &&
    typeof state.day === "number" &&
    typeof state.gold === "number" &&
    typeof state.finished === "boolean" &&
    Array.isArray(state.roster) &&
    Array.isArray(state.progress) &&
    Array.isArray(state.rivals) &&
    Array.isArray(state.attention) &&
    Array.isArray(state.events) &&
    Boolean(state.plan) &&
    Array.isArray(state.plan?.parties)
  );
};

/** One function per version step. Today there is only version 1. */
const migrate = (raw: unknown): SaveFile | null => {
  if (!raw || typeof raw !== "object") return null;
  const file = raw as Partial<SaveFile>;
  if (file.version !== SAVE_VERSION) return null;
  if (!isGameState(file.state)) return null;
  return {
    version: SAVE_VERSION,
    seed: typeof file.seed === "number" ? file.seed : file.state.seed,
    savedAt: typeof file.savedAt === "string" ? file.savedAt : nowIso(),
    state: file.state,
    actionLog: Array.isArray(file.actionLog) ? file.actionLog : [],
  };
};

export const loadSave = (storage: StorageLike | null = browserStorage()): SaveFile | null => {
  if (!storage) return null;
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const makeSave = (state: GameState, actionLog: LoggedAction[]): SaveFile => ({
  version: SAVE_VERSION,
  seed: state.seed,
  savedAt: nowIso(),
  state,
  actionLog,
});

export const writeSave = (
  state: GameState,
  actionLog: LoggedAction[],
  storage: StorageLike | null = browserStorage(),
): SaveFile => {
  const file = makeSave(state, actionLog);
  if (storage) {
    try {
      storage.setItem(SAVE_KEY, JSON.stringify(file));
    } catch {
      // A full quota must not crash the game. The run continues unsaved.
    }
  }
  return file;
};

export const clearSave = (storage: StorageLike | null = browserStorage()): void => {
  try {
    storage?.removeItem(SAVE_KEY);
  } catch {
    // Nothing to do: the next run overwrites anyway.
  }
};
