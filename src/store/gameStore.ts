import { create } from "zustand";
import {
  blockingAttention,
  deriveAttention,
  hasBlocking,
  newGame,
  type EncounterLog,
  type GameEvent,
  type GameState,
  type Stance,
} from "../sim";
import { digestForDay } from "../sim/report";
import { applyAction, logAction, type GameAction, type LoggedAction } from "./actions";
import { clearSave, loadSave, writeSave } from "./save";

export type Screen = "hall" | "roster" | "war" | "report";

export type Modal =
  | { kind: "attention" }
  | { kind: "inspect"; contentId: string }
  | { kind: "loot" }
  | { kind: "tavern" }
  | { kind: "new-run" }
  | { kind: "help" }
  | null;

export type Toast = {
  id: number;
  text: string;
  severity: "good" | "bad" | "info";
};

export type DayReport = {
  day: number;
  events: GameEvent[];
  encounter: EncounterLog | null;
};

export type GameStore = {
  booting: boolean;
  game: GameState | null;
  screen: Screen;
  drawerHeroId: string | null;
  selectedParty: number;
  modal: Modal;
  report: DayReport | null;
  /** The report day the player has already opened; the nav dot clears on view. */
  seenReportDay: number | null;
  toast: Toast | null;
  actionLog: LoggedAction[];

  boot: () => void;
  startRun: (seed: number, name: string) => void;
  abandonRun: () => void;
  setScreen: (screen: Screen) => void;
  selectHero: (heroId: string | null) => void;
  selectParty: (index: number) => void;
  openModal: (modal: Modal) => void;
  closeModal: () => void;
  dismissToast: () => void;

  dispatch: (action: GameAction) => boolean;
  advance: () => void;
  resolveAttention: (itemId: string, optionKey: string) => void;
  setStance: (index: number, stance: Stance) => void;
};

let toastId = 0;
const toast = (text: string, severity: Toast["severity"] = "info"): Toast => {
  toastId += 1;
  return { id: toastId, text, severity };
};

export const reportFor = (state: GameState, day: number): DayReport => ({
  day,
  events: digestForDay(state, day),
  encounter: state.lastEncounter && state.lastEncounter.day === day ? state.lastEncounter : null,
});

const initialReport = (state: GameState): DayReport => {
  const day = state.lastEncounter?.day ?? Math.max(1, state.day - 1);
  return reportFor(state, day);
};

export const useGameStore = create<GameStore>()((set, get) => {
  /**
   * Every game mutation goes through here: apply the action, re-derive the
   * queue (so a release cannot leave a stale contract item blocking the day),
   * then write the save. UI state never touches this path.
   */
  const commit = (action: GameAction, reportDay?: number): boolean => {
    const current = get().game;
    if (!current) return false;
    const applied = applyAction(current, action);
    if (applied === current) {
      set({ toast: toast("That action would change nothing.") });
      return false;
    }
    const next =
      action.type === "advance" ? applied : { ...applied, attention: deriveAttention(applied) };
    const log = [...get().actionLog, logAction(current, action)];
    writeSave(next, log);
    set({
      game: next,
      actionLog: log,
      ...(reportDay !== undefined ? { report: reportFor(next, reportDay) } : {}),
    });
    return true;
  };

  return {
    booting: true,
    game: null,
    screen: "hall",
    drawerHeroId: null,
    selectedParty: 0,
    modal: null,
    report: null,
    seenReportDay: null,
    toast: null,
    actionLog: [],

    boot: () => {
      const save = loadSave();
      if (!save) {
        set({ booting: false, game: null });
        return;
      }
      set({
        booting: false,
        game: save.state,
        actionLog: save.actionLog,
        report: initialReport(save.state),
        seenReportDay: save.state.finished ? initialReport(save.state).day : null,
        screen: save.state.finished ? "report" : "hall",
        selectedParty: 0,
      });
    },

    startRun: (seed, name) => {
      const game = newGame(seed, name);
      clearSave();
      const log: LoggedAction[] = [{ day: 1, action: { type: "new-game", seed, name } }];
      writeSave(game, log);
      set({
        booting: false,
        game,
        actionLog: log,
        screen: "hall",
        drawerHeroId: null,
        selectedParty: 0,
        modal: null,
        report: reportFor(game, 1),
        seenReportDay: null,
        toast: toast(`${name} is founded. Set a party, then advance the day.`, "good"),
      });
    },

    abandonRun: () => {
      clearSave();
      set({
        game: null,
        actionLog: [],
        screen: "hall",
        drawerHeroId: null,
        selectedParty: 0,
        modal: null,
        report: null,
        seenReportDay: null,
        toast: null,
      });
    },

    setScreen: (screen) =>
      set({
        screen,
        ...(screen === "report" ? { seenReportDay: get().report?.day ?? null } : {}),
      }),
    selectHero: (heroId) => set({ drawerHeroId: heroId }),
    selectParty: (index) => set({ selectedParty: index }),
    openModal: (modal) => set({ modal }),
    closeModal: () => set({ modal: null }),
    dismissToast: () => set({ toast: null }),

    dispatch: (action) => {
      const changed = commit(action);
      if (changed) {
        const state = get().game;
        if (state && get().selectedParty >= state.plan.parties.length) {
          set({ selectedParty: Math.max(0, state.plan.parties.length - 1) });
        }
      }
      return changed;
    },

    advance: () => {
      const state = get().game;
      if (!state) return;
      if (state.finished) {
        set({ screen: "report", toast: toast("This run is over. Start a new one.") });
        return;
      }
      if (hasBlocking(state)) {
        const blocked = blockingAttention(state);
        set({
          modal: { kind: "attention" },
          toast: toast(
            `Day ${state.day} is waiting on you${blocked[0] ? ` — ${blocked[0].title}` : ""}.`,
            "bad",
          ),
        });
        return;
      }
      const day = state.day;
      const changed = commit({ type: "advance" }, day);
      if (!changed) return;
      const next = get().game;
      if (!next) return;
      set({
        screen: "report",
        seenReportDay: day,
        modal: null,
        drawerHeroId: null,
        toast: next.finished
          ? toast("The run is over. The verdict is on the report.", "good")
          : toast(`Day ${day} resolved.`, "good"),
      });
    },

    resolveAttention: (itemId, optionKey) => {
      const changed = get().dispatch({ type: "resolve-attention", itemId, optionKey });
      if (!changed) return;
      const state = get().game;
      if (!state) return;
      const stillBlocked = blockingAttention(state);
      if (stillBlocked.length === 0) {
        set({ modal: null, toast: toast("Settled. The day can move.", "good") });
      } else {
        set({
          toast: toast(
            `Done. ${stillBlocked.length} more item${stillBlocked.length === 1 ? "" : "s"} need an answer.`,
            "info",
          ),
        });
      }
    },

    setStance: (index, stance) => {
      get().dispatch({ type: "set-stance", index, stance });
    },
  };
});
