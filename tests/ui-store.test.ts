import { describe, expect, it } from "vitest";
import {
  contentById,
  fieldableParty,
  freeHeroes,
  newGame,
  poachTargets,
  unavailableContent,
  type GameState,
  type Hero,
} from "../src/sim";
import { focusPull, nextLevers } from "../src/sim/report";
import { applyAction, logAction, type GameAction } from "../src/store/actions";
import { SAVE_KEY, loadSave, writeSave, type StorageLike } from "../src/store/save";
import {
  fatigueState,
  filterHeroes,
  nextDoorInfo,
  partyAdvice,
  statusChips,
} from "../src/store/selectors";
import { useGameStore } from "../src/store/gameStore";

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

  it("buys a market good and a forge, and sells a drop", () => {
    const start = newGame(4242);
    const hero = start.roster[0]!;
    const rich = { ...start, gold: 5_000 };
    const bought = applyAction(rich, { type: "buy-good", goodId: "tonic", heroId: hero.id });
    expect(bought.gold).toBeLessThan(rich.gold);
    const drop = {
      id: "loot-test",
      day: 1,
      contentId: "hollow-crypt",
      contentName: "Hollow Crypt",
      slot: "weapon" as const,
      ilvl: 50,
    };
    const waiting = { ...rich, pendingLoot: [drop] };
    const sold = applyAction(waiting, { type: "sell-loot", lootId: drop.id });
    expect(sold.gold).toBeGreaterThan(waiting.gold);
    expect(sold.pendingLoot).toHaveLength(0);
    const forged = applyAction(waiting, { type: "craft-loot", lootId: drop.id, heroId: hero.id });
    expect(forged.gold).toBeLessThan(waiting.gold);
    expect(forged.pendingLoot).toHaveLength(0);
  });

  it("poaches a rival hero through the reducer", () => {
    const start = newGame(4242);
    const rival = start.rivals[0]!;
    const target = poachTargets(start, rival.id)[0]!;
    const rich = { ...start, gold: 20_000 };
    const next = applyAction(rich, { type: "poach", rivalId: rival.id, heroId: target.hero.id });
    expect(next.roster).toHaveLength(start.roster.length + 1);
    expect(next.gold).toBe(rich.gold - target.fee);
    expect(next.poachHeat).toBe(start.day);
  });

  it("sets a raid ten, keeps only real heroes and caps at ten", () => {
    const start = newGame(4242);
    const ids = start.roster.map((h) => h.id);
    const next = applyAction(start, { type: "set-raid-team", heroIds: [...ids, ids[0]!, "ghost"] });
    expect(next.raidTeam).toEqual(ids);
    const auto = applyAction(start, { type: "auto-raid-team" });
    expect(auto.raidTeam?.length).toBe(3);
  });

  it("clears one party's target by removing the party and freeing its heroes", () => {
    const start = newGame(4242);
    expect(start.plan.parties).toHaveLength(1);
    const next = applyAction(start, { type: "set-party", index: 0, assignment: null });
    expect(next.plan.parties).toEqual([]);
    // The heroes are not released, only unassigned: they return to the pool.
    expect(next.roster).toHaveLength(start.roster.length);
    expect(freeHeroes(next)).toHaveLength(start.roster.length);
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

describe("the fatigue readout", () => {
  it("shows a tonic in the roster status chips", () => {
    const start = newGame(4242);
    const hero = start.roster[0]!;
    expect(statusChips({ ...hero, buffDays: 2, buffPower: 0.1 }).some((c) => c.label === "Tonic 2d")).toBe(true);
  });

  it("draws one line for the badge, the chip and the raid-ready filter", () => {
    const start = newGame(4242);
    const base = start.roster[0]!;
    const at = (fatigue: number) => ({ ...base, fatigue });
    expect(fatigueState(at(44))).toBe("fresh");
    expect(fatigueState(at(45))).toBe("tired");
    expect(fatigueState(at(69))).toBe("tired");
    expect(fatigueState(at(70))).toBe("exhausted");
    expect(statusChips(at(70))[0]).toMatchObject({ label: "Exhausted", tone: "bad" });
    expect(filterHeroes(start, [at(70)], "raid-ready")).toHaveLength(0);
    expect(filterHeroes(start, [at(69)], "raid-ready")).toHaveLength(1);
  });

  it("counts exhausted assigned heroes for the party chip", () => {
    const start = newGame(4242);
    const [tiredId, exhaustedId] = start.plan.parties[0]!.heroes;
    const state: GameState = {
      ...start,
      roster: start.roster.map((h) =>
        h.id === tiredId
          ? { ...h, fatigue: 52 }
          : h.id === exhaustedId
            ? { ...h, fatigue: 88 }
            : h,
      ),
    };
    expect(partyAdvice(state, 0).exhausted).toBe(1);
  });
});

describe("the advance gate", () => {
  it("refuses the day while a party is above the hero limit, and frees it when fixed", () => {
    useGameStore.getState().startRun(4242, "Gate");
    const start = useGameStore.getState().game!;
    const ids = start.roster.map((h) => h.id);
    // The Wolf Den fields 3; a fourth body is the over-limit plan the card
    // lets the player build while they decide who leaves.
    const extra: Hero = { ...start.roster[0]!, id: "extra-hero" };
    const over: GameState = {
      ...start,
      roster: [...start.roster, extra],
      plan: { parties: [{ contentId: "wolf-den", heroes: [...ids, extra.id], stance: "steady" }] },
    };
    useGameStore.setState({ game: over, screen: "hall" });

    useGameStore.getState().advance();
    const blocked = useGameStore.getState();
    expect(blocked.game!.day).toBe(start.day);
    expect(blocked.screen).toBe("war");
    expect(blocked.toast?.text).toContain("4/3");

    // Drop the fourth hero: the same advance now resolves the day.
    useGameStore.setState({
      game: { ...over, plan: { parties: [{ contentId: "wolf-den", heroes: ids, stance: "steady" }] } },
    });
    useGameStore.getState().advance();
    expect(useGameStore.getState().game!.day).toBe(start.day + 1);
  });

  it("lets every hero leave a full party, then blocks the day until one is added back", () => {
    useGameStore.getState().startRun(4242, "Short");
    const start = useGameStore.getState().game!;
    const ids = start.roster.map((h) => h.id);
    const party = { ...start.plan.parties[0]!, contentId: "wolf-den" };
    // The Wolf Den fields exactly 3. Removing one is the edit the old card
    // refused; the plan holds 2/3 and the advance gate names the gap.
    useGameStore.setState({
      game: { ...start, plan: { parties: [{ ...party, heroes: ids.slice(0, 2) }] } },
      screen: "war",
    });
    expect(useGameStore.getState().game!.plan.parties[0]!.heroes).toHaveLength(2);

    useGameStore.getState().advance();
    const blocked = useGameStore.getState();
    expect(blocked.game!.day).toBe(start.day);
    expect(blocked.toast?.text).toContain("2/3");
    expect(blocked.toast?.text).toContain("add 1");

    // The last hero can leave too. The target stays; 0/3 blocks the same way.
    useGameStore.setState({
      game: { ...start, plan: { parties: [{ ...party, heroes: [] }] } },
    });
    useGameStore.getState().advance();
    const empty = useGameStore.getState();
    expect(empty.game!.day).toBe(start.day);
    expect(empty.game!.plan.parties[0]!.contentId).toBe("wolf-den");
    expect(empty.toast?.text).toContain("0/3");
    expect(empty.toast?.text).toContain("add 3");

    useGameStore.setState({
      game: {
        ...start,
        plan: { parties: [{ ...party, heroes: ids }] },
      },
    });
    useGameStore.getState().advance();
    expect(useGameStore.getState().game!.day).toBe(start.day + 1);
  });
});

describe("the day report", () => {
  it("keeps a clear's drops on the report instead of opening a sheet", () => {
    useGameStore.getState().startRun(5, "Report");
    const start = useGameStore.getState().game!;
    const at = (hero: Hero): Hero => ({
      ...hero,
      level: 60,
      attrs: {
        might: 20, agility: 20, vitality: 20, endurance: 20,
        focus: 20, discipline: 20, awareness: 20, composure: 20,
      },
      gear: { weapon: 10, chest: 10, helm: 10, trinket: 10 },
      traits: [],
      fatigue: 0,
      sharpness: 60,
      morale: 60,
      health: 100,
    });
    const roster = start.roster.map(at);
    const vault = contentById("plundered-vault")!;
    useGameStore.setState({
      game: {
        ...start,
        roster,
        plan: { parties: [{ contentId: vault.id, heroes: roster.map((h) => h.id), stance: "steady" }] },
        raidTeam: [roster[0]!.id],
        attention: [],
      },
      screen: "hall",
      modal: null,
    });

    useGameStore.getState().advance();
    const after = useGameStore.getState();
    expect(after.game!.pendingLoot?.length).toBe(vault.loot.count);
    expect(after.screen).toBe("report");
    expect(after.report?.day).toBe(start.day);
    expect(after.report?.encounters).toHaveLength(1);
    expect(after.modal).toBeNull();
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

  it("upgrades a v1 save's single encounter into a list", () => {
    const start = newGame(1234);
    const warrens = contentById("warrens")!;
    const party = fieldableParty(start, warrens)!;
    const advanced = run(start, [
      {
        type: "assign-party",
        assignment: { contentId: warrens.id, heroes: party.map((hero) => hero.id), stance: "steady" },
      },
      { type: "advance" },
    ]);
    const victim = advanced.lastEncounters.at(-1)!;
    const { lastEncounters, ...legacy } = advanced;
    expect(lastEncounters).toHaveLength(1);

    const storage = memoryStorage();
    storage.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: 1,
        seed: advanced.seed,
        savedAt: "2026-01-01T00:00:00.000Z",
        state: { ...legacy, lastEncounter: victim },
        actionLog: [],
      }),
    );

    const loaded = loadSave(storage);
    expect(loaded?.version).toBe(2);
    expect(loaded?.state.lastEncounters).toHaveLength(1);
    expect(loaded?.state.lastEncounters[0]?.contentId).toBe(victim.contentId);
    expect(Object.keys(loaded!.state)).not.toContain("lastEncounter");
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
    const clearLog = cleared.lastEncounters.at(-1);
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
    const wipeLog = wiped.lastEncounters.at(-1);
    expect(wipeLog?.cleared).toBe(false);
    expect(focusPull(wipeLog!)?.killed).toBe(false);
    const levers = nextLevers(wiped, wipeLog!);
    expect(levers.length).toBeGreaterThanOrEqual(3);
    // The label names the change; the detail carries the check and the number.
    expect(levers[0]?.label).toBe("Shortfall");
    expect(levers[0]?.detail).toContain("DPS");
    expect(levers.some((lever) => lever.label === "Push stance")).toBe(true);
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

describe("the next door readout", () => {
  it("prints one gate line from the rule's own numbers", () => {
    const base = newGame(4242);
    const roster = Array.from({ length: 12 }, (_, index) => ({
      ...base.roster[index % base.roster.length]!,
      id: `door-${index}`,
      level: 30,
    }));
    const state: GameState = { ...base, roster };
    const info = nextDoorInfo(state)!;
    expect(info.content.id).toBe("pale-market");
    expect(info.shortName).toBe("The Pale Market");
    expect(info.kindLine).toBe("Dungeon · 4–5 heroes");
    expect(info.gateLine).toBe("avg lvl 30.0 / 32 over your best 5 — 2.0 short");
    expect(info.gap).toBe(2);
    // The count in the drawer footer and the panel come from one list.
    expect(info.closed).toBe(unavailableContent(state).length);
  });

  it("names a roster wall without pretending it is a level gap", () => {
    const base = newGame(4242);
    const state: GameState = { ...base, roster: base.roster.map((h) => ({ ...h, level: 60 })) };
    const info = nextDoorInfo(state)!;
    expect(info.content.id).toBe("hollow-crypt");
    expect(info.gateLine).toBe("roster 3 / 4 heroes");
    expect(info.gap).toBeNull();
    expect(info.shortName).toBe("Hollow Crypt");
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
