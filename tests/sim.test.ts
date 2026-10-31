import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  CONTENT,
  LEVEL_CAP,
  RAIDS,
  RIVAL_LADDER,
  aiRun,
  aiTurn,
  assignParty,
  blockedItems,
  bestLevel,
  contentById,
  deriveAttention,
  gainXp,
  hireCandidate,
  itemLevel,
  newGame,
  personalityById,
  resolveDay,
  unlockedContent,
  availableContent,
  unavailableContent,
  contentAvailability,
  announceUnlocks,
  rollNamedDrop,
  validatePlan,
  advanceDays,
  resolveAttention,
  buyFacility,
  rosterCapFor,
  lootBonusFor,
  injuryDaysFor,
  wageBudgetFor,
  nextCost,
  projectAssignment,
  resolveAssignment,
  withCounters,
  ABILITIES,
  MAX_TRAITS,
  assignRole,
  checkContribution,
  fitFor,
  roleAffinity,
  planDay,
  reviewRoles,
  roleById,
  traitSelfFactor,
  traitPartyFactor,
  traitEconomy,
  TRAITS,
  attentionKey,
  injuryChanceFor,
  pruneUnavailable,
  sharpMod,
  PROMISE,
  CONTRACT,
  type ClassId,
  type Hero,
  type TraitId,
  type GameState,
} from "../src/sim/index";
import { makeCandidate, makeHero, wageForLevel } from "../src/sim/content/heroes";
import { cardById } from "../src/sim/content/events";
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
    expect(CONTENT.filter((c) => c.kind === "dungeon")).toHaveLength(4);
    expect(CONTENT.filter((c) => c.kind === "mission")).toHaveLength(6);
    expect(CONTENT.filter((c) => c.kind === "farm")).toHaveLength(3);
  });
});

describe("content data", () => {
  it("has unique ids and every prerequisite points at real content", () => {
    const ids = new Set(CONTENT.map((c) => c.id));
    expect(ids.size).toBe(CONTENT.length);
    for (const content of CONTENT) {
      for (const required of content.requires) {
        expect(ids.has(required)).toBe(true);
        expect(required).not.toBe(content.id);
      }
    }
  });

  it("gives every non-farm a whole run of phases, and every farm no phases", () => {
    for (const content of CONTENT) {
      if (content.kind === "farm") {
        expect(content.phases).toHaveLength(0);
        continue;
      }
      expect(content.phases.length).toBeGreaterThan(0);
      const shares = content.phases.reduce((total, phase) => total + phase.share, 0);
      expect(shares).toBeCloseTo(1, 6);
    }
  });

  it("gives every content a bestiary, and every mob pressures a real check", () => {
    for (const content of CONTENT) {
      expect(content.mobs.length).toBeGreaterThan(0);
      const checks = new Set(content.phases.map((phase) => phase.check));
      for (const mob of content.mobs) {
        if (mob.check) expect(checks.has(mob.check)).toBe(true);
      }
    }
  });

  it("keeps named drops inside the loot band, with chances that cannot exceed one", () => {
    for (const content of CONTENT) {
      if (content.loot.count === 0) expect(content.drops).toHaveLength(0);
      const total = content.drops.reduce((sum, drop) => sum + drop.chance, 0);
      expect(total).toBeLessThanOrEqual(1);
      for (const drop of content.drops) {
        expect(drop.ilvl).toBeGreaterThanOrEqual(content.loot.ilvlMin);
        expect(drop.ilvl).toBeLessThanOrEqual(content.loot.ilvlMax);
        expect(["weapon", "chest", "helm", "trinket"]).toContain(drop.slot);
      }
    }
  });

  it("puts the XP run and the coin run in the same band, trading XP for gold and loot", () => {
    // A reward trade only exists if the alternatives open at the same time.
    // The Mill is the XP night; the Road is the purse and the drop.
    const mill = contentById("drowned-mill")!;
    const road = contentById("bandit-road")!;
    expect(Math.abs(mill.minLevel - road.minLevel)).toBeLessThanOrEqual(1);
    expect(mill.xp).toBeGreaterThan(road.xp);
    expect(mill.gold).toBeLessThan(road.gold);
    expect(mill.loot.count).toBeLessThan(road.loot.count);
  });
});

describe("content availability", () => {
  it("hides content the roster cannot field, not just prerequisite locks", () => {
    const s = newGame(1, "Open");
    const open = availableContent(s).map((c) => c.id);
    expect(open).toContain("warrens");
    expect(open).not.toContain("hollow-crypt"); // a four-man, three heroes
    expect(open).not.toContain("old-quarry"); // average level 1 < 5
    expect(open).not.toContain("sunken-temple"); // prerequisite
    expect(unavailableContent(s).map((a) => a.content.id)).toContain("old-quarry");
  });

  it("opens a level-gated area when the party average reaches it", () => {
    const base = newGame(1, "Open");
    const s: GameState = { ...base, roster: base.roster.map((h) => ({ ...h, level: 5 })) };
    expect(contentAvailability(s, contentById("old-quarry")!).status).toBe("new");
  });

  it("emits one unlock event per area, ever", () => {
    const base = newGame(1, "Unlock");
    const s: GameState = {
      ...base,
      events: [...base.events],
      roster: base.roster.map((h) => ({ ...h, level: 5 })),
    };
    announceUnlocks(s, 5);
    const unlocked = s.events.filter((e) => e.kind === "unlock" && e.day === 5);
    expect(unlocked.map((e) => e.text).join(" ")).toContain("The Old Quarry");
    announceUnlocks(s, 6);
    expect(s.events.filter((e) => e.kind === "unlock" && e.day === 6)).toHaveLength(0);
  });

  it("starts a save written before the unlock ledger existed silent", () => {
    const base = newGame(1, "Legacy");
    const s: GameState = {
      ...base,
      events: [...base.events],
      knownContent: undefined,
      roster: base.roster.map((h) => ({ ...h, level: 5 })),
    };
    announceUnlocks(s, 1);
    expect(s.events.filter((e) => e.kind === "unlock")).toHaveLength(0);
    expect(s.knownContent?.length).toBeGreaterThan(0);
  });

  it("gives an old save a progress row for an area that did not exist", () => {
    const base = newGame(1, "Old");
    const s: GameState = { ...base, progress: base.progress.filter((p) => p.contentId !== "warrens") };
    const next = resolveDay(s);
    expect(next.progress.some((p) => p.contentId === "warrens")).toBe(true);
  });

  it("rolls one named drop per clear, with exact per-clear odds", () => {
    const content = contentById("hollow-crypt")!;
    const [first, second] = content.drops;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(rollNamedDrop(content, () => 0)?.name).toBe(first!.name);
    expect(rollNamedDrop(content, () => first!.chance + second!.chance / 2)?.name).toBe(second!.name);
    expect(rollNamedDrop(content, () => 0.99)).toBeUndefined();
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

  it("never sends two parties to the same content", () => {
    let s = newGame(7, "OneTarget");
    for (let i = 0; i < 30; i += 1) {
      s = aiTurn(s, STEWARD).state;
      const contentIds = s.plan.parties.map((p) => p.contentId);
      expect(new Set(contentIds).size).toBe(contentIds.length);
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

  it("does not offer or accept a gold cost the purse cannot cover", () => {
    let s = newGame(31, "Afford");
    s = {
      ...s,
      gold: 100,
      pendingEvent: { cardId: "cursed-blade", day: s.day, targetHeroId: s.roster[0]!.id },
      attention: [],
    };
    const item = deriveAttention(s).find((i) => i.kind === "event");
    expect(item).toBeDefined();
    expect(item!.options.map((o) => o.key)).not.toContain("buy");
    expect(item!.options.map((o) => o.key)).toContain("pass");

    const tried = resolveAttention(s, item!.id, "buy");
    expect(tried).toBe(s);
    expect(tried.pendingEvent).not.toBeNull();
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

describe("plan safety", () => {
  it("assigning a hero moves them out of their old party", () => {
    const start = newGame(1, "Slots");
    const ids = start.roster.map((h) => h.id);
    const next = assignParty(start, { contentId: "wolf-den", heroes: ids, stance: "steady" });
    expect(next.plan.parties).toHaveLength(1);
    expect(next.plan.parties[0]!.contentId).toBe("wolf-den");
  });

  it("drops a party that falls below its minimum size", () => {
    const start = newGame(1, "Slots");
    const ids = start.roster.map((h) => h.id);
    const mission = assignParty(start, { contentId: "wolf-den", heroes: ids, stance: "steady" });
    const split = assignParty(mission, { contentId: "emberwood", heroes: [ids[0]!], stance: "steady" });
    expect(split.plan.parties.map((p) => p.contentId)).toEqual(["emberwood"]);
  });

  it("rejects a duplicate hero, a bad stance and locked content", () => {
    const start = newGame(1, "Rules");
    const id = start.roster[0]!.id;
    const dup: GameState = {
      ...start,
      plan: { parties: [{ contentId: "emberwood", heroes: [id, id, id], stance: "steady" }] },
    };
    expect(validatePlan(dup).some((p) => p.message.includes("twice"))).toBe(true);

    const badStance = {
      ...start,
      plan: { parties: [{ contentId: "emberwood", heroes: [id], stance: "bananas" }] },
    } as unknown as GameState;
    expect(validatePlan(badStance).some((p) => p.message.includes("stance"))).toBe(true);

    const locked: GameState = {
      ...start,
      plan: {
        parties: [{ contentId: "raid-tyrant", heroes: start.roster.map((h) => h.id), stance: "steady" }],
      },
    };
    expect(validatePlan(locked).some((p) => p.message.includes("locked"))).toBe(true);
  });

  it("rejects and drops two parties on the same content", () => {
    const start = newGame(1, "DupContent");
    const [a, b] = start.roster.map((h) => h.id);
    const dup: GameState = {
      ...start,
      plan: {
        parties: [
          { contentId: "emberwood", heroes: [a!], stance: "steady" },
          { contentId: "emberwood", heroes: [b!], stance: "steady" },
        ],
      },
    };
    expect(validatePlan(dup).some((p) => p.message.includes("two parties"))).toBe(true);
    expect(resolveDay(dup).plan.parties).toHaveLength(1);
  });

  it("never pays out for a duplicated party", () => {
    const start = newGame(5, "Exploit");
    const id = start.roster[0]!.id;
    const exploit: GameState = {
      ...start,
      plan: { parties: [{ contentId: "emberwood", heroes: [id, id, id], stance: "steady" }] },
    };
    const next = resolveDay(exploit);
    expect(next.plan.parties).toHaveLength(0);
    expect(next.events.some((e) => e.text.includes("Plan ignored"))).toBe(true);
    expect(next.roster.every((h) => h.level === 1)).toBe(true);
  });

  it("a bad stance is dropped instead of crashing the day", () => {
    const start = newGame(6, "Stance");
    const id = start.roster[0]!.id;
    const bad = {
      ...start,
      plan: { parties: [{ contentId: "emberwood", heroes: [id], stance: "bananas" }] },
    } as unknown as GameState;
    expect(() => resolveDay(bad)).not.toThrow();
    expect(resolveDay(bad).plan.parties).toHaveLength(0);
  });

  it("arrears freeze recruitment", () => {
    const start = newGame(2, "Broke");
    const broke: GameState = { ...start, gold: -10 };
    const candidate = broke.tavern[0]!;
    expect(hireCandidate(broke, candidate)).toBe(broke);
  });
});

describe("rewards and clear-ups", () => {
  it("a free recruit arrives at the intended 55% level, not a double-scaled 34%", () => {
    const base = newGame(12, "Free");
    const maxed = (h: (typeof base.roster)[number]) => ({
      ...h,
      level: LEVEL_CAP,
      attrs: {
        might: 20, agility: 20, vitality: 20, endurance: 20,
        focus: 20, discipline: 20, awareness: 20, composure: 20,
      },
      gear: { weapon: 140, chest: 140, helm: 140, trinket: 140 },
    });
    const roster = [...base.roster.map(maxed), maxed(base.tavern[0]!.hero)];
    const s: GameState = {
      ...base,
      roster,
      plan: {
        parties: [
          { contentId: "hollow-crypt", heroes: roster.map((h) => h.id), stance: "steady" },
        ],
      },
    };
    const expected = makeCandidate(s.seed, s.day, 900 + s.roster.length, LEVEL_CAP, 0.55).hero.level;
    const next = resolveDay(s);
    expect(next.progress.find((p) => p.contentId === "hollow-crypt")?.clears).toBe(1);
    const free = next.roster.find((h) => h.id.startsWith("f"));
    expect(free).toBeDefined();
    expect(free!.level).toBe(expected);
    expect(free!.level).toBeGreaterThan(25);
  });

  it("a side dungeon pays in loot, not a free body", () => {
    const base = newGame(12, "Side");
    const maxed = (h: (typeof base.roster)[number]) => ({
      ...h,
      level: LEVEL_CAP,
      attrs: {
        might: 20, agility: 20, vitality: 20, endurance: 20,
        focus: 20, discipline: 20, awareness: 20, composure: 20,
      },
      gear: { weapon: 140, chest: 140, helm: 140, trinket: 140 },
    });
    const roster = [...base.roster.map(maxed), maxed(base.tavern[0]!.hero)];
    const s: GameState = {
      ...base,
      roster,
      plan: {
        parties: [{ contentId: "wailing-mines", heroes: roster.map((h) => h.id), stance: "steady" }],
      },
    };
    const next = resolveDay(s);
    expect(next.progress.find((p) => p.contentId === "wailing-mines")?.clears).toBe(1);
    expect(next.roster).toHaveLength(roster.length);
  });

  it("a clear still pays exactly the listed number of items", () => {
    const base = newGame(12, "Loot");
    const maxed = (h: (typeof base.roster)[number], id?: string) => ({
      ...h,
      ...(id ? { id } : {}),
      level: LEVEL_CAP,
      attrs: {
        might: 20, agility: 20, vitality: 20, endurance: 20,
        focus: 20, discipline: 20, awareness: 20, composure: 20,
      },
      gear: { weapon: 140, chest: 140, helm: 140, trinket: 140 },
    });
    for (const id of ["hollow-crypt", "wailing-mines"]) {
      const content = contentById(id)!;
      const party = Array.from({ length: content.minHeroes }, (_, i) =>
        maxed(base.roster[i % base.roster.length]!, `test-${i}`),
      );
      const s: GameState = { ...base, roster: party };
      const outcome = resolveAssignment(s, {
        contentId: id,
        heroes: party.map((h) => h.id),
        stance: "steady",
      });
      expect(outcome).not.toBeNull();
      expect(outcome!.cleared).toBe(true);
      expect(outcome!.loot).toHaveLength(content.loot.count);
    }
  });

  it("a finished run has no attention items", () => {
    const s = playAi(4);
    expect(s.finished).toBe(true);
    expect(s.attention).toHaveLength(0);
    expect(deriveAttention(s)).toHaveLength(0);
  });

  it("a rival only claims World First after the final raid", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const s = playAi(seed);
      for (const rival of s.rivals) {
        if (rival.worldFirstDay !== null) {
          expect(rival.raidsCleared).toBe(RIVAL_LADDER.length);
        }
      }
    }
  });
});

describe("legibility", () => {
  it("a dungeon wipe leaves a report that names the failed check", () => {
    const base = newGame(3, "Report");
    const undergeared = (h: (typeof base.roster)[number]) => ({
      ...h,
      level: 10,
      gear: { weapon: 4, chest: 4, helm: 4, trinket: 4 },
      fatigue: 0,
      sharpness: 60,
      morale: 60,
    });
    const roster = [...base.roster.map(undergeared), undergeared(base.tavern[0]!.hero)];
    const s: GameState = {
      ...base,
      roster,
      plan: {
        parties: [
          { contentId: "hollow-crypt", heroes: roster.map((h) => h.id), stance: "steady" },
        ],
      },
    };
    const next = resolveDay(s);
    expect(next.lastEncounter?.contentId).toBe("hollow-crypt");
    expect(next.lastEncounter?.contentKind).toBe("dungeon");
    expect(next.lastEncounter?.cleared).toBe(false);
    const wipe = next.events.find((e) => e.kind === "wipe");
    expect(wipe?.text).toMatch(/DPS|Mitigation/);
  });

  it("the sponsor card cannot appear before there is prestige to spend", () => {
    const card = cardById("sponsor");
    expect(card).toBeDefined();
    const s = newGame(1, "Sponsor");
    expect(card!.when({ ...s, gold: 1000, renown: 0 })).toBe(false);
    expect(card!.when({ ...s, gold: 1000, renown: 1 })).toBe(true);
  });
});

describe("traits probe", () => {
  const partyOfFive = (seed: number) => {
    const state = newGame(seed, "Traits");
    state.roster = Array.from({ length: 5 }, (_, i) => ({
      ...makeHero(seed, 500 + i, "mage", 60),
      traits: [],
    }));
    return state;
  };

  it("an uncountered ability makes the check harder", () => {
    const state = partyOfFive(11);
    const heroes = state.roster.map((h) => h.id);
    const plain = resolveAssignment(state, { contentId: "ashen-spire", heroes, stance: "steady" });
    const answered = resolveAssignment(
      { ...state, roster: state.roster.map((h, i) => (i === 0 ? { ...h, traits: ["keen-eye" as const] } : h)) },
      { contentId: "ashen-spire", heroes, stance: "steady" },
    );
    const before = plain!.pulls[0]!.phases[0]!;
    const after = answered!.pulls[0]!.phases[0]!;

    expect(before.ability?.countered).toBe(false);
    expect(before.ability?.mult).toBeCloseTo(ABILITIES["ash-veil"].penalty);
    expect(after.ability?.countered).toBe(true);
    expect(after.ability?.counterHero).toBeDefined();
    expect(after.value).toBeGreaterThan(before.value);
    expect(after.value / before.value).toBeCloseTo(1 / ABILITIES["ash-veil"].penalty, 1);
  });

  it("an ability is unknown until the first pull", () => {
    const state = partyOfFive(12);
    const assignment = {
      contentId: "ashen-spire",
      heroes: state.roster.map((h) => h.id),
      stance: "steady" as const,
    };
    const before = projectAssignment(state, assignment)!;
    const discovered = {
      ...state,
      progress: state.progress.map((p) => (p.contentId === "ashen-spire" ? { ...p, attempts: 1 } : p)),
    };
    const after = projectAssignment(discovered, assignment)!;

    expect(after.phases[0]!.ratio).toBeLessThan(before.phases[0]!.ratio);
    // 18% penalty, offset by the 2% mastery the first pull banks.
    expect(after.phases[0]!.ratio / before.phases[0]!.ratio).toBeCloseTo(
      ABILITIES["ash-veil"].penalty * 1.02,
      1,
    );
  });

  it("rolls the same traits from the same seed, and never more than three", () => {
    const a = makeHero(3, 77, "rogue", 20);
    const b = makeHero(3, 77, "rogue", 20);
    expect(a.traits).toEqual(b.traits);
    expect(a.traits.length).toBeLessThanOrEqual(MAX_TRAITS);
    for (const id of a.traits) {
      const trait = TRAITS[id];
      expect(!trait.classes || trait.classes.includes("rogue")).toBe(true);
    }
  });

  it("does not field a counter for a threat nobody has seen yet", () => {
    const state = partyOfFive(13);
    // Mechanics is the bottleneck, so answering Ash Veil is worth a body.
    const weak = { awareness: 1, discipline: 1, composure: 1 };
    state.roster = state.roster.map((h) => ({ ...h, attrs: { ...h.attrs, ...weak } }));
    // Identical twin on the bench, with the answer.
    const twin = { ...state.roster[0]!, id: "twin", traits: ["keen-eye" as const] };
    state.roster = [...state.roster, twin];
    const party = state.roster.slice(0, 5);
    const content = contentById("ashen-spire")!;

    const unseen = withCounters(state, content, party, state.roster);
    expect(unseen.some((h) => h.id === "twin")).toBe(false);

    const discovered = {
      ...state,
      progress: state.progress.map((p) => (p.contentId === "ashen-spire" ? { ...p, attempts: 1 } : p)),
    };
    const seen = withCounters(discovered, content, party, state.roster);
    expect(seen.some((h) => h.id === "twin")).toBe(true);
  });
});

describe("role assignment", () => {
  it("an off-role hero pays the fit multiplier on every check", () => {
    const state = newGame(2, "Roles");
    const hero = state.roster.find((h) => h.klass === "warrior")!;
    const other = hero.role === "bulwark" ? "vanguard" : "bulwark";
    const before = checkContribution(hero, "mitigation", 1);
    const next = assignRole(state, hero.id, other);
    const changed = next.roster.find((h) => h.id === hero.id)!;

    expect(fitFor(changed, changed.role).fit).toBe("trained");
    expect(checkContribution(changed, "mitigation", 1)).toBeLessThan(before);
    const affinity = roleAffinity(changed.role, "mitigation") / roleAffinity(hero.role, "mitigation");
    expect(checkContribution(changed, "mitigation", 1) / before).toBeCloseTo(affinity * 0.88, 6);
  });

  it("ignores an unknown role or hero", () => {
    const state = newGame(2, "Roles");
    const hero = state.roster[0]!;
    expect(assignRole(state, hero.id, "nonsense" as never)).toBe(state);
    expect(assignRole(state, "nobody", "bulwark")).toBe(state);
  });
});

describe("planner role review", () => {
  it("never makes a planned party worse, and never changes class", () => {
    for (const seed of [1, 18, 35]) {
      const state = aiRun(newGame(seed, "Roles"), STEWARD, 40);
      const { plan } = planDay(state, STEWARD);
      const before = plan.parties.map((p) => projectAssignment(state, p)?.minRatio ?? 0);
      const { state: after } = reviewRoles(state, plan);
      plan.parties.forEach((p, i) => {
        const ratio = projectAssignment(after, p)?.minRatio ?? 0;
        expect(ratio).toBeGreaterThanOrEqual(before[i]! - 1e-9);
      });
      for (const hero of after.roster) {
        expect(roleById(hero.role).klass).toBe(hero.klass);
      }
    }
  });
});

describe("trait effects", () => {
  const content = contentById("ashen-spire")!; // mechanics, sustain, dps
  const hero = (id: string, klass: ClassId, traits: TraitId[]): Hero => ({
    ...makeHero(9, 900 + Number(id), klass, 60),
    id,
    traits,
  });
  const ctx = (h: Hero, party: Hero[], phaseIndex: number) => ({
    hero: h,
    party,
    content,
    phaseIndex,
    afterWipe: false,
    topId: party[0]!.id,
  });

  it("pack hunter scales with other rogues and punishes being alone", () => {
    const a = hero("1", "rogue", ["pack-hunter"]);
    const b = hero("2", "rogue", []);
    const c = hero("3", "rogue", []);
    expect(traitSelfFactor(a, "dps", ctx(a, [a], 2))).toBeCloseTo(0.94);
    expect(traitSelfFactor(a, "dps", ctx(a, [a, b, c], 2))).toBeCloseTo(1.1);
  });

  it("executioner pays on the last phase and takes on the first", () => {
    const a = hero("1", "rogue", ["executioner"]);
    expect(traitSelfFactor(a, "dps", ctx(a, [a], 2))).toBeCloseTo(1.12);
    expect(traitSelfFactor(a, "dps", ctx(a, [a], 0))).toBeCloseTo(0.95);
    // A one-phase mission has no last-phase bonus to stack on the first.
    const mission = contentById("wolf-den")!;
    expect(
      traitSelfFactor(a, "dps", { ...ctx(a, [a], 0), content: mission }),
    ).toBeCloseTo(0.95);
  });

  it("shield wall buffs the whole check for a second warrior", () => {
    const a = hero("1", "warrior", ["shield-wall"]);
    const b = hero("2", "warrior", []);
    expect(traitPartyFactor([a], "mitigation", ctx(a, [a], 0))).toBeCloseTo(1);
    expect(traitPartyFactor([a, b], "mitigation", ctx(a, [a, b], 0))).toBeCloseTo(1.03);
  });

  it("craft traits change the day, not the check", () => {
    const a = hero("1", "warrior", ["pathfinder", "quartermaster", "mentor"]);
    const dungeon = traitEconomy([a], content);
    expect(dungeon.fatigue).toBe(-3);
    expect(dungeon.mentorPct).toBe(0.25);
    expect(traitEconomy([a], contentById("emberwood")!).goldPct).toBe(0.2);
    expect(traitEconomy([a], contentById("raid-tyrant")!).fatigue).toBe(0);
  });
});

describe("playthrough fixes", () => {
  it("drops an unavailable hero from tomorrow's plan and names who moved", () => {
    const start = newGame(21, "Prune");
    const [a, b, c] = start.roster.map((h) => h.id);
    const injured = {
      ...start,
      roster: start.roster.map((h) => (h.id === b ? { ...h, injuryDays: 2 } : h)),
      plan: { parties: [{ contentId: "emberwood", heroes: [a!, b!, c!], stance: "steady" as const }] },
    };

    const pruned = pruneUnavailable(injured);
    expect(pruned.plan.parties[0]!.heroes).toEqual([a, c]);
    expect(pruned.notes.join(" ")).toContain(injured.roster.find((h) => h.id === b)!.name);

    const next = resolveDay(injured);
    expect(next.plan.parties.flatMap((p) => p.heroes)).not.toContain(b);
    expect(next.events.some((e) => e.text.includes("unavailable") && e.text.includes("Emberwood"))).toBe(true);
  });

  it("banks the failed check's partial progress instead of reporting 0%", () => {
    const base = newGame(3, "Partial");
    const roster = Array.from({ length: 5 }, (_, i) => ({
      ...makeHero(3, 700 + i, "mage", 10),
      gear: { weapon: 4, chest: 4, helm: 4, trinket: 4 },
      fatigue: 0,
      sharpness: 60,
      morale: 60,
    }));
    const s: GameState = {
      ...base,
      roster,
      plan: {
        parties: [{ contentId: "hollow-crypt", heroes: roster.map((h) => h.id), stance: "steady" }],
      },
    };
    const assignment = s.plan.parties[0]!;
    const projection = projectAssignment(s, assignment)!;
    const phases = contentById("hollow-crypt")!.phases;
    const failed = projection.phases.findIndex((p) => p.ratio < 1);
    expect(failed).toBeGreaterThanOrEqual(0);

    const expected =
      projection.phases.slice(0, failed).reduce((acc, _, i) => acc + (phases[i]?.share ?? 0), 0) +
      Math.min(projection.phases[failed]!.ratio, 1) * (phases[failed]?.share ?? 0);
    expect(projection.estimatedBestPull).toBeCloseTo(expected, 6);
    expect(projection.estimatedBestPull).toBeGreaterThan(0);
    expect(projection.form).toBeGreaterThan(0);

    const outcome = resolveAssignment(s, assignment)!;
    if (!outcome.cleared) {
      expect(outcome.bestPull).toBeGreaterThan(0);
      expect(outcome.bestPull).toBeCloseTo(
        Math.max(...outcome.pulls.map((p) => p.progress)),
        6,
      );
    }
  });

  it("sharpness spans 26% with an unchanged ceiling", () => {
    expect(sharpMod(0)).toBeCloseTo(0.78);
    expect(sharpMod(100)).toBeCloseTo(1.04);
    expect(sharpMod(60)).toBeCloseTo(0.936);
    expect(sharpMod(100) - sharpMod(0)).toBeGreaterThan(0.18);
  });

  it("a tired hero is more likely to be hurt on a scrape", () => {
    const hero = { ...makeHero(1, 5, "warrior", 40), attrs: { ...makeHero(1, 5, "warrior", 40).attrs, vitality: 20 } };
    const fresh = { ...hero, fatigue: 0 };
    const tired = { ...hero, fatigue: 100 };
    expect(injuryChanceFor(tired, "steady")).toBeGreaterThan(injuryChanceFor(fresh, "steady"));
    expect(injuryChanceFor(tired, "steady") / injuryChanceFor(fresh, "steady")).toBeCloseTo(1.8, 5);
  });

  it("every attention option clears its own item", () => {
    const start = newGame(21, "Queue");
    const [a, b, c] = start.roster.map((h) => h.id);
    const party = { parties: [{ contentId: "emberwood", heroes: [b!, c!], stance: "steady" as const }] };
    const heroA = start.roster[0]!;

    const states: GameState[] = [
      { ...start, plan: party, roster: start.roster.map((h) => (h.id === a ? { ...h, daysBenched: 4, morale: 40 } : h)) },
      { ...start, roster: start.roster.map((h) => (h.id === a ? { ...h, contract: { ...h.contract, daysLeft: 3 } } : h)) },
      { ...start, roster: start.roster.map((h) => ({ ...h, contract: { ...h.contract, wage: 900 } })) },
      { ...start, plan: party, roster: start.roster.map((h) => (h.id === a ? { ...h, fatigue: 90 } : h)) },
      {
        ...start,
        gold: 1000,
        pendingEvent: { cardId: "rival-offer", day: start.day, targetHeroId: heroA.id },
      },
    ];

    for (const state of states) {
      const live = { ...state, attention: deriveAttention(state) };
      for (const item of live.attention) {
        const key = attentionKey(item.kind, item.heroId);
        expect(item.options.length).toBeGreaterThan(0);
        for (const option of item.options) {
          const next = resolveAttention(live, item.id, option.key);
          expect(next, `${item.kind} → ${option.key} did nothing`).not.toBe(live);
          const returned = deriveAttention(next).find(
            (i) => attentionKey(i.kind, i.heroId) === key,
          );
          expect(returned, `${item.kind} → ${option.key} came straight back`).toBeUndefined();
        }
      }
    }
  });

  it("hides rotate when there is no party to rotate into", () => {
    const start = newGame(21, "NoSlots");
    const a = start.roster[0]!.id;
    const state = {
      ...start,
      plan: { parties: [] },
      roster: start.roster.map((h) => (h.id === a ? { ...h, daysBenched: 4, morale: 40 } : h)),
    };
    const item = deriveAttention(state).find((i) => i.kind === "benched-unhappy");
    expect(item).toBeDefined();
    expect(item!.options.map((o) => o.key)).not.toContain("rotate");
  });

  it("re-prices a renewal to the hero's level, not the wage he signed at", () => {
    const start = newGame(31, "Market");
    const hero = start.roster[0]!;
    const state: GameState = {
      ...start,
      roster: start.roster.map((h) =>
        h.id === hero.id ? { ...h, level: 60, contract: { ...h.contract, daysLeft: 3, wage: 12 } } : h,
      ),
    };
    const live = { ...state, attention: deriveAttention(state) };
    const item = live.attention.find((i) => i.kind === "contract-expiring")!;
    const next = resolveAttention(live, item.id, "renew");
    const renewed = next.roster.find((h) => h.id === hero.id)!;
    expect(renewed.contract.wage).toBe(Math.max(12, Math.round(wageForLevel(60) * CONTRACT.renewPremium)));
    // The level-1 starter wage must not survive to level 60.
    expect(renewed.contract.wage).toBeGreaterThan(12 * 5);
  });

  it("counts the starts a promise needs and settles it as kept", () => {
    const start = newGame(32, "Promise");
    const hero = start.roster[0]!;
    const angry: GameState = {
      ...start,
      plan: { parties: [{ contentId: "emberwood", heroes: [hero.id], stance: "steady" }] },
      roster: start.roster.map((h) => (h.id === hero.id ? { ...h, daysBenched: 4, morale: 40 } : h)),
    };
    const live = { ...angry, attention: deriveAttention(angry) };
    const item = live.attention.find((i) => i.kind === "benched-unhappy")!;
    let state = resolveAttention(live, item.id, "promise");

    const record = state.promises![0]!;
    expect(record.status).toBe("open");
    expect(record.dueOn).toBe(state.day + PROMISE.windowDays - 1);

    for (let i = 0; i < PROMISE.windowDays; i += 1) state = resolveDay(state);
    const settled = state.promises![0]!;
    expect(settled.status).toBe("kept");
    expect(settled.daysAssigned).toBeGreaterThanOrEqual(PROMISE.startsRequired);
  });

  it("a broken promise costs morale and names itself", () => {
    const start = newGame(33, "Broken");
    const hero = start.roster[0]!;
    const state: GameState = {
      ...start,
      day: 10,
      plan: { parties: [] },
      promises: [{ id: "p", heroId: hero.id, madeOn: 4, dueOn: 10, daysAssigned: 1, status: "open" }],
      roster: start.roster.map((h) => (h.id === hero.id ? { ...h, morale: 60, daysBenched: 0 } : h)),
    };
    const next = resolveDay(state);
    expect(next.promises![0]!.status).toBe("broken");
    expect(next.roster.find((h) => h.id === hero.id)!.morale).toBe(60 + PROMISE.brokenMorale);
    expect(next.events.some((e) => e.text.includes("promise is broken"))).toBe(true);
  });

  it("warns the day before a promise falls due", () => {
    const start = newGame(35, "Due");
    const hero = start.roster[0]!;
    const state: GameState = {
      ...start,
      day: 12,
      promises: [{ id: "p", heroId: hero.id, madeOn: 6, dueOn: 13, daysAssigned: 2, status: "open" }],
    };
    const item = deriveAttention(state).find((i) => i.kind === "promise-due");
    expect(item).toBeDefined();
    expect(item!.blocking).toBe(false);
    expect(item!.detail).toContain("2/3");
  });

  it("prints one fatigue line for the whole rotation, not one per body", () => {
    const start = newGame(34, "Tired");
    const state: GameState = {
      ...start,
      plan: {
        parties: [{ contentId: "emberwood", heroes: start.roster.map((h) => h.id), stance: "steady" }],
      },
      roster: start.roster.map((h) => ({ ...h, fatigue: 85 })),
    };
    const items = deriveAttention(state).filter((i) => i.kind === "fatigue-risk");
    expect(items).toHaveLength(1);
    expect(items[0]!.title).toContain("3 heroes");
  });
});
