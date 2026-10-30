import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  CONTENT,
  LEVEL_CAP,
  RAIDS,
  aiRun,
  aiTurn,
  blockedItems,
  contentById,
  gainXp,
  itemLevel,
  newGame,
  personalityById,
  resolveDay,
  unlockedContent,
  advanceDays,
  resolveAttention,
  buyFacility,
  rosterCapFor,
  lootBonusFor,
  injuryDaysFor,
  wageBudgetFor,
  nextCost,
  type GameState,
} from "../src/sim/index";
import { heroPower, squadRating } from "../src/sim/hero";

const STEWARD = personalityById("steady");

const playAi = (seed: number, personality = STEWARD): GameState =>
  aiRun(newGame(seed, "Test"), personality, 400);

const idle = (seed: number): GameState => {
  let s = newGame(seed, "Idle");
  s = { ...s, plan: { parties: [] } };
  let guard = 0;
  while (!s.finished && guard < 400) {
    guard += 1;
    s = resolveDay(s);
    if (s.attention.length > 0) s = { ...s, attention: [] };
  }
  return s;
};

const raidsCleared = (s: GameState): number =>
  s.progress.filter((p) => contentById(p.contentId)?.kind === "raid" && p.clears > 0).length;

describe("starting position", () => {
  it("begins with three level-1 heroes", () => {
    const s = newGame(1, "Start");
    expect(s.roster).toHaveLength(3);
    expect(s.roster.every((h) => h.level === 1)).toBe(true);
    expect(s.day).toBe(1);
  });

  it("starts on a farm party, not a raid", () => {
    const s = newGame(1, "Start");
    expect(s.plan.parties).toHaveLength(1);
    expect(contentById(s.plan.parties[0]!.contentId)?.kind).toBe("farm");
  });

  it("has the whole ladder defined, three raids deep", () => {
    expect(RAIDS).toHaveLength(3);
    expect(CONTENT.filter((c) => c.kind === "dungeon")).toHaveLength(3);
  });
});

describe("the ladder gates", () => {
  it("locks later content behind earlier clears", () => {
    const s = newGame(3, "Ladder");
    const unlocked = unlockedContent(s).map((c) => c.id);
    expect(unlocked).toContain("hollow-crypt");
    expect(unlocked).not.toContain("sunken-temple");
    expect(unlocked).not.toContain("raid-gatewarden");
  });

  it("unlocks the next dungeon once the previous one is cleared", () => {
    const base = newGame(3, "Ladder");
    const s: GameState = {
      ...base,
      progress: base.progress.map((p) =>
        p.contentId === "hollow-crypt" ? { ...p, clears: 1, clearedOnDay: 5 } : p,
      ),
    };
    expect(unlockedContent(s).map((c) => c.id)).toContain("sunken-temple");
  });
});

describe("determinism", () => {
  it("resolveDay is a pure function", () => {
    const s = newGame(99, "Det");
    expect(resolveDay(s)).toEqual(resolveDay(s));
  });

  it("does not mutate its input", () => {
    const s = newGame(7, "Immutable");
    const snapshot = JSON.stringify(s);
    resolveDay(s);
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it("an AI run reproduces exactly from the seed", () => {
    const a = playAi(4242);
    const b = playAi(4242);
    expect(a.score).toBe(b.score);
    expect(a.band).toBe(b.band);
    expect(raidsCleared(a)).toBe(raidsCleared(b));
  });
});

describe("progression", () => {
  it("heroes level up over a run and respect the cap", () => {
    const s = playAi(11);
    expect(Math.max(...s.roster.map((h) => h.level))).toBeGreaterThan(10);
    expect(s.roster.every((h) => h.level <= LEVEL_CAP)).toBe(true);
  });

  it("gear improves as the guild progresses", () => {
    const start = newGame(11, "Gear");
    const end = playAi(11);
    const startIlvl = Math.max(...start.roster.map((h) => itemLevel(h.gear)));
    const endIlvl = Math.max(...end.roster.map((h) => itemLevel(h.gear)));
    expect(endIlvl).toBeGreaterThan(startIlvl);
  });

  it("gainXp stops at the cap", () => {
    const hero = newGame(1, "Cap").roster[0]!;
    const capped = { ...hero, level: LEVEL_CAP };
    const { hero: after, levels } = gainXp(capped, 99999, () => 0.5);
    expect(after.level).toBe(LEVEL_CAP);
    expect(levels).toBe(0);
  });
});

describe("balance", () => {
  it("doing nothing clears no dungeon", () => {
    const s = idle(5);
    const dungeons = s.progress.filter((p) => contentById(p.contentId)?.kind === "dungeon" && p.clears > 0);
    expect(dungeons).toHaveLength(0);
  });

  it("the AI clears most of the tier", () => {
    const runs = [1, 2, 3, 4, 5].map((seed) => raidsCleared(playAi(seed)));
    const avg = runs.reduce((a, b) => a + b, 0) / runs.length;
    expect(avg).toBeGreaterThanOrEqual(2);
    expect(avg).toBeLessThanOrEqual(3);
  });

  it("finishes with a score and a band", () => {
    const s = playAi(4);
    expect(s.finished).toBe(true);
    expect(s.score).not.toBeNull();
    expect(["S", "A", "B", "C", "D"]).toContain(s.band);
  });
});

describe("invariants", () => {
  it("keeps every value in range across seeds", () => {
    for (const seed of [1, 2, 3]) {
      const s = playAi(seed);
      for (const h of s.roster) {
        expect(h.fatigue).toBeGreaterThanOrEqual(0);
        expect(h.fatigue).toBeLessThanOrEqual(100);
        expect(h.sharpness).toBeGreaterThanOrEqual(0);
        expect(h.sharpness).toBeLessThanOrEqual(100);
        expect(h.health).toBeGreaterThanOrEqual(0);
        expect(h.morale).toBeGreaterThanOrEqual(1);
        expect(Number.isFinite(heroPower(h))).toBe(true);
      }
      expect(Number.isFinite(squadRating(s.roster))).toBe(true);
    }
  });

  it("never puts one hero in two parties", () => {
    let s = newGame(5, "Slots");
    for (let i = 0; i < 20; i += 1) {
      const turn = aiTurn(s, STEWARD);
      s = turn.state;
      const ids = s.plan.parties.flatMap((p) => p.heroes);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("property: a day never produces NaN", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 5000 }), (seed) => {
        const s = resolveDay(newGame(seed, "Prop"));
        return s.roster.every((h) => Number.isFinite(heroPower(h)) && Number.isFinite(h.fatigue));
      }),
      { numRuns: 30 },
    );
  });
});

describe("events", () => {
  it("a pending event blocks the day and can be resolved", () => {
    let s = newGame(31, "Events");
    s = {
      ...s,
      pendingEvent: { cardId: "old-wound", day: s.day, targetHeroId: s.roster[0]!.id },
      attention: [],
    };
    const blocked = advanceDays(s, 1);
    expect(blocked.stopped).not.toBeNull();
    expect(blocked.state.day).toBe(s.day);

    const resolved = resolveAttention(s, `event:old-wound:${s.day}`, "rest");
    expect(resolved.pendingEvent).toBeNull();
    expect(resolved.roster[0]!.injuryDays).toBeGreaterThan(0);
  });

  it("events appear over a long run and never repeat immediately", () => {
    const s = aiRun(newGame(55, "Events"), STEWARD, 400);
    expect(s.eventLog.length).toBeGreaterThan(3);
    for (let i = 1; i < s.eventLog.length; i += 1) {
      expect(s.eventLog[i]).not.toBe(s.eventLog[i - 1]);
    }
  });

  it("the same seed produces the same event sequence", () => {
    expect(playAi(77).eventLog).toEqual(playAi(77).eventLog);
  });
});

describe("facilities", () => {
  it("buying a facility costs gold and raises its level", () => {
    const s = newGame(9, "Build");
    const withGold: GameState = { ...s, gold: 5000 };
    const next = buyFacility(withGold, "forge");
    expect(next).not.toBeNull();
    expect(next!.facilities.forge).toBe(1);
    expect(next!.gold).toBe(5000 - nextCost(withGold.facilities, "forge")!);
  });

  it("cannot buy without gold", () => {
    const s: GameState = { ...newGame(9, "Build"), gold: 10 };
    expect(buyFacility(s, "forge")).toBeNull();
  });

  it("facility effects change the derived numbers", () => {
    const base = newGame(9, "Build");
    const built: GameState = {
      ...base,
      facilities: { infirmary: 2, forge: 2, tavern: 2, hall: 2 },
    };
    expect(rosterCapFor(built.facilities)).toBeGreaterThan(rosterCapFor(base.facilities));
    expect(lootBonusFor(built.facilities)).toBeGreaterThan(0);
    expect(injuryDaysFor(4, built.facilities)).toBeLessThan(4);
    expect(wageBudgetFor(10, built.facilities)).toBeGreaterThan(wageBudgetFor(10, base.facilities));
  });

  it("the AI spends surplus gold on facilities", () => {
    const s = aiRun(newGame(3, "Build"), STEWARD, 400);
    const total = Object.values(s.facilities).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(0);
  });
});
