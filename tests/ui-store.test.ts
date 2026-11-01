import { describe, expect, it } from "vitest";
import {
  contentById,
  fieldableParty,
  newGame,
  type GameState,
} from "../src/sim";
import { focusPull, nextLevers } from "../src/sim/report";
import { applyAction, logAction, type GameAction } from "../src/store/actions";
import { SAVE_KEY, loadSave, writeSave, type StorageLike } from "../src/store/save";
import { filterHeroes, partyAdvice } from "../src/store/selectors";

const memoryStorage = (): StorageLike => {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
};

const run = (state: GameState, actions: GameAction[]): GameState =>
  actions.reduce((current, action) => applyAction(current, action), state);

describe("the UI action reducer", () => {
  it("reproduces the same state from the seed and the action log", () => {
    const actions: GameAction[] = [{ type: "advance" }, { type: "advance" }, { type: "advance" }];
    const a = run(newGame(4242), actions);
    const b = run(newGame(4242), actions);
    expect(a.day).toBe(b.day);
    expect(a.gold).toBe(b.gold);
    expect(a.roster.map((h) => [h.name, h.level, h.fatigue])).toEqual(
      b.roster.map((h) => [h.name, h.level, h.fatigue]),
    );
    expect(a.events.map((e) => e.text)).toEqual(b.events.map((e) => e.text));
  });

  it("advances the rivals with the player, not ahead of them", () => {
    const start = newGame(4242);
    expect(start.rivals.every((r) => r.guild.day === 1)).toBe(true);
    const next = applyAction(start, { type: "advance" });
    expect(next.day).toBe(2);
    expect(next.rivals.every((r) => r.guild.day === 2)).toBe(true);
  });

  it("changes a role without spending a day", () => {
    const start = newGame(4242);
    const hero = start.roster[0]!;
    const next = applyAction(start, {
      type: "set-role",
      heroId: hero.id,
      role: hero.role === "bulwark" ? "vanguard" : "bulwark",
    });
    expect(next.day).toBe(start.day);
    expect(next.roster.find((h) => h.id === hero.id)?.role).toBe(
      hero.role === "bulwark" ? "vanguard" : "bulwark",
    );
  });

  it("signs a tavern candidate and spends the fee", () => {
    const start = newGame(4242);
    const candidate = start.tavern[0]!;
    const next = applyAction(start, { type: "hire", heroId: candidate.hero.id });
    expect(next.roster).toHaveLength(start.roster.length + 1);
    expect(next.gold).toBe(start.gold - candidate.fee);
    expect(next.tavern).toHaveLength(start.tavern.length - 1);
  });

  it("only buys a facility when the gold covers it", () => {
    const start = newGame(4242);
    expect(applyAction(start, { type: "buy-facility", id: "infirmary" })).toBe(start);
    const rich = { ...start, gold: 5_000 };
    const bought = applyAction(rich, { type: "buy-facility", id: "infirmary" });
    expect(bought.facilities.infirmary).toBe(1);
    expect(bought.gold).toBe(5_000 - 900);
  });

  it("sets a raid ten, keeps only real heroes and caps at ten", () => {
    const start = newGame(4242);
    const ids = start.roster.map((h) => h.id);
    const next = applyAction(start, { type: "set-raid-team", heroIds: [...ids, ids[0]!, "ghost"] });
    expect(next.raidTeam).toEqual(ids);
    const auto = applyAction(start, { type: "auto-raid-team" });
    expect(auto.raidTeam?.length).toBe(3);
  });

  it("does not mutate the state it is given", () => {
    const start = newGame(4242);
    const snapshot = structuredClone(start);
    run(start, [
      { type: "advance" },
      { type: "set-role", heroId: start.roster[0]!.id, role: "trickster" },
      { type: "auto-raid-team" },
    ]);
    expect(start).toEqual(snapshot);
  });
});

describe("the save file", () => {
  it("round-trips the state and the action log", () => {
    const start = newGame(9001);
    const advanced = applyAction(start, { type: "advance" });
    const log = [logAction(start, { type: "advance" })];
    const storage = memoryStorage();
    writeSave(advanced, log, storage);
    const loaded = loadSave(storage);
    expect(loaded).not.toBeNull();
    expect(loaded?.state.day).toBe(2);
    expect(loaded?.state.gold).toBe(advanced.gold);
    expect(loaded?.actionLog).toHaveLength(1);
  });

  it("rejects a save with an unknown version or a broken state", () => {
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 99, state: {} }));
    expect(loadSave(storage)).toBeNull();
    storage.setItem(SAVE_KEY, "{not json");
    expect(loadSave(storage)).toBeNull();
  });

  it("is a cache: the state alone is enough for the screens", () => {
    const start = newGame(9001);
    const loaded = loadSave((() => {
      const storage = memoryStorage();
      writeSave(start, [], storage);
      return storage;
    })());
    expect(loaded?.state.roster).toHaveLength(3);
    expect(loaded?.state.plan.parties[0]?.contentId).toBe("emberwood");
  });
});

describe("the shared legal-party helper", () => {
  it("returns the best legal party or null, never a party the game would refuse", () => {
    const start = newGame(1234);
    const warrens = fieldableParty(start, contentById("warrens")!);
    expect(warrens).toHaveLength(3);
    expect(fieldableParty(start, contentById("hollow-crypt")!)).toBeNull();
    expect(fieldableParty(start, contentById("raid-gatewarden")!)).toBeNull();
  });
});

describe("the report helpers used by the UI and the CLI", () => {
  it("shows the killing pull on a clear and the last failure on a wipe", () => {
    const start = newGame(1234);
    const warrens = contentById("warrens")!;
    const party = fieldableParty(start, warrens)!;
    const cleared = run(start, [
      {
        type: "assign-party",
        assignment: { contentId: "warrens", heroes: party.map((h) => h.id), stance: "steady" },
      },
      { type: "advance" },
    ]);
    const clearLog = cleared.lastEncounter;
    expect(clearLog?.cleared).toBe(true);
    expect(focusPull(clearLog!)?.killed).toBe(true);

    const wolf = contentById("wolf-den")!;
    const wipeParty = fieldableParty(start, wolf)!;
    const wiped = run(start, [
      {
        type: "assign-party",
        assignment: { contentId: "wolf-den", heroes: wipeParty.map((h) => h.id), stance: "steady" },
      },
      { type: "advance" },
    ]);
    const wipeLog = wiped.lastEncounter;
    expect(wipeLog?.cleared).toBe(false);
    expect(focusPull(wipeLog!)?.killed).toBe(false);
    const levers = nextLevers(wiped, wipeLog!);
    expect(levers.length).toBeGreaterThanOrEqual(3);
    expect(levers[0]?.label).toContain("DPS");
    expect(levers.some((lever) => lever.detail.includes("Push"))).toBe(true);
  });
});

describe("party advice for the level gate", () => {
  it("exposes the party average and keeps the gate out of the warning list", () => {
    const start = newGame(4242);
    const party = start.plan.parties[0]!;
    const advice = partyAdvice(start, 0);
    const levels = party.heroes.map(
      (id) => start.roster.find((hero) => hero.id === id)!.level,
    );
    const average = levels.reduce((total, level) => total + level, 0) / levels.length;
    expect(advice.averageLevel).toBeCloseTo(average, 5);
    // The card prints the gate on every party, not only when it is missed.
    expect(advice.warnings.some((warning) => warning.includes("average level"))).toBe(false);

    const below: GameState = {
      ...start,
      plan: {
        parties: [{ contentId: "old-quarry", heroes: party.heroes, stance: "steady" }],
      },
    };
    expect(partyAdvice(below, 0).averageLevel).toBeLessThan(
      contentById("old-quarry")!.minLevel,
    );
    expect(partyAdvice(below, 0).warnings.some((warning) => warning.includes("average level"))).toBe(
      false,
    );
    expect(partyAdvice({ ...start, plan: { parties: [] } }, 0).averageLevel).toBe(0);
  });
});

describe("the roster Injured view", () => {
  it("answers with the same set the tab badge counts", () => {
    const state = newGame(4242);
    const [first, second] = state.roster;
    // A hero at 99 health is recovering and deployable; only injuryDays makes
    // him count as an injury on the tab and in the view.
    const recovering = { ...first!, health: 80, injuryDays: 0 };
    const injured = { ...second!, health: 60, injuryDays: 2 };
    const heroes = [recovering, injured];
    expect(filterHeroes(state, heroes, "injured")).toEqual([injured]);
  });
});
