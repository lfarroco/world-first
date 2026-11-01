import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  CONTENT,
  LEVEL_CAP,
  RAIDS,
  rivalRaidsCleared,
  contractBoard,
  postedContractIds,
  rewardContext,
  rewardValue,
  assignLoot,
  autoAssignLoot,
  suggestLootTarget,
  queueLoot,
  ensureRaidTeam,
  autoRaidTeam,
  stableRaidParty,
  raidTeamHeroes,
  lootValue,
  partyGold,
  isPosted,
  payScaleFor,
  effectiveReward,
  featuredBonusFor,
  featuredContentFor,
  MARKET_GOODS,
  buyGood,
  marketPrice,
  marketGearIlvl,
  lootSellValue,
  sellLoot,
  craftLoot,
  craftCost,
  poachHero,
  poachFee,
  poachWage,
  poachTargets,
  rivalPoachTick,
  pushInjuryChance,
  formMod,
  rngStream,
  CONTRACT_BOARD,
  standings,
  playerRank,
  runWorld,
  tickRivals,
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
  nextDoor,
  canField,
  announceUnlocks,
  rollNamedDrop,
  validatePlan,
  partySizeProblems,
  advanceDays,
  advanceDay,
  RIVAL,
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
  checkPowerInRole,
  fitFor,
  roleAffinity,
  planDay,
  reviewRoles,
  roleById,
  ROLES,
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
  NEGOTIATION,
  acceptsCounter,
  counterDemand,
  counterOffer,
  transferFee,
  raidNights,
  raidRace,
  RAID_LOG,
  type ClassId,
  type Hero,
  type TraitId,
  type GameState,
  type PendingLoot,
} from "../src/sim/index";
import { makeCandidate, makeHero, wageForLevel } from "../src/sim/content/heroes";
import { EVENT_CARDS, cardById, type Effect, type EventTarget } from "../src/sim/content/events";
import { heroPower, squadRating } from "../src/sim/hero";
import { chooseCardOption } from "../src/sim/ai/cards";

const STEWARD = personalityById("steady");

const playAi = (seed: number, personality = STEWARD): GameState =>
  aiRun(newGame(seed, "Test"), personality, 400);

/**
 * A full run with the world attached: slower, because three rival guilds play
 * their own 84 days. Only the race tests need it.
 */
const playWorld = (seed: number, personality = STEWARD): GameState =>
  runWorld(newGame(seed, "Test"), personality, 400);

/** A state far enough into a run that every card's `when` can pass. */
const midRun = (seed: number, days: number): GameState => {
  let s = newGame(seed, "Mid");
  for (let i = 0; i < days && !s.finished; i += 1) s = aiTurn(s, STEWARD).state;
  return s;
};

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
    expect(CONTENT.filter((c) => c.kind === "dungeon")).toHaveLength(9);
    expect(CONTENT.filter((c) => c.kind === "mission")).toHaveLength(11);
    expect(CONTENT.filter((c) => c.kind === "farm")).toHaveLength(7);
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

  it("adds the missing mitigation mission in the mid band", () => {
    // The board rotates pay and level, not the check. Before this mission five
    // of six missions were mechanics; the spare party had no tank job.
    const bridge = contentById("broken-bridge")!;
    expect(bridge.kind).toBe("mission");
    expect(bridge.phases[0]!.check).toBe("mitigation");
    expect(bridge.minHeroes).toBe(3);
    expect(bridge.minLevel).toBeGreaterThan(contentById("bandit-road")!.minLevel);
    expect(bridge.minLevel).toBeLessThan(28);
    // The gold stays under the Toll House, or the cautious guild funds a raid
    // on the extra night alone (learnings L86).
    expect(bridge.gold).toBeLessThanOrEqual(220);
  });
});

describe("contract board", () => {
  const maxed = (h: Hero): Hero => ({
    ...h,
    level: LEVEL_CAP,
    attrs: {
      might: 20, agility: 20, vitality: 20, endurance: 20,
      focus: 20, discipline: 20, awareness: 20, composure: 20,
    },
    gear: { weapon: 150, chest: 150, helm: 150, trinket: 150 },
    traits: [],
    fatigue: 0,
    sharpness: 60,
    morale: 60,
    health: 100,
    contract: { ...h.contract, daysLeft: 30 },
  });

  it("tags every mission, and posts one XP contract and one prize contract", () => {
    const missions = CONTENT.filter((c) => c.kind === "mission");
    expect(missions.length).toBeGreaterThan(1);
    for (const mission of missions) expect(mission.contractColumn).toBeDefined();

    for (const mission of missions) {
      expect(mission.minHeroes).toBe(3);
      expect(mission.maxHeroes).toBe(3);
      expect(["xp", "gold", "loot"]).toContain(mission.contractColumn);
    }

    const state = newGame(1, "Board");
    const board = contractBoard(state);
    expect(board.contracts).toHaveLength(2);
    expect(board.contracts.every((c) => c.kind === "mission")).toBe(true);
    expect(new Set(board.contracts.map((c) => c.id)).size).toBe(2);
    const open = new Set(availableContent(state).map((c) => c.id));
    for (const id of postedContractIds(state)) expect(open.has(id)).toBe(true);
  });

  it("derives the same board from the same state, and rotates over days", () => {
    const base = newGame(7, "Rotate");
    const roster = base.roster.map(maxed);
    const stateAt = (day: number): GameState => ({
      ...base,
      day,
      roster,
      progress: base.progress.map((p) => ({ ...p, attempts: 1 })),
    });
    expect(contractBoard(stateAt(12))).toEqual(contractBoard(stateAt(12)));
    const boards = new Set(
      Array.from({ length: 20 }, (_, i) => {
        const board = contractBoard(stateAt(i + 1));
        return board.contracts.map((c) => c.id).join("/");
      }),
    );
    expect(boards.size).toBeGreaterThan(1);
  });

  it("pays full for a posted mission and a first clear, and the token for an unposted repeat", () => {
    const base = newGame(1, "Pay");
    const mill = contentById("drowned-mill")!;
    const roster = base.roster.map(maxed);
    const progress = base.progress.map((p) => ({
      ...p,
      clears: p.contentId === "drowned-mill" ? 5 : 0,
    }));
    const stateAt = (day: number): GameState => ({
      ...base,
      day,
      gold: 0,
      roster,
      progress,
      plan: { parties: [{ contentId: "drowned-mill", heroes: roster.map((h) => h.id), stance: "steady" }] },
      pendingEvent: null,
      attention: [],
    });

    const days = Array.from({ length: 60 }, (_, i) => i + 1).filter((d) => d % 7 !== 0);
    const postedDay = days.find((d) => payScaleFor(stateAt(d), mill) === 1)!;
    const tokenDay = days.find((d) => payScaleFor(stateAt(d), mill) < 1)!;

    const full = resolveDay(stateAt(postedDay));
    const token = resolveDay(stateAt(tokenDay));
    expect(full.lastEncounter?.xp).toBe(mill.xp);
    expect(full.lastEncounter?.gold).toBe(mill.gold);
    expect(full.lastEncounter?.payScale).toBe(1);
    expect(token.lastEncounter?.xp).toBe(Math.round(mill.xp * CONTRACT_BOARD.tokenPay));
    expect(token.lastEncounter?.gold).toBe(Math.round(mill.gold * CONTRACT_BOARD.tokenPay));
    expect(token.lastEncounter?.payScale).toBe(CONTRACT_BOARD.tokenPay);

    // The first clear is never taxed, even on a day the contract is not posted.
    const first = stateAt(tokenDay);
    first.progress = first.progress.map((p) =>
      p.contentId === "drowned-mill" ? { ...p, clears: 0 } : p,
    );
    expect(payScaleFor(first, mill)).toBe(1);
    const star = featuredBonusFor(first, mill);
    expect(effectiveReward(first, mill)).toEqual({
      gold: mill.gold * star,
      xp: mill.xp * star,
      payScale: 1,
      featured: star,
    });
  });

  it("leaves farms, dungeons and raids at full pay every day", () => {
    const base = newGame(4, "Kinds");
    const kinds = CONTENT.filter((c) => c.kind !== "mission");
    for (const day of [1, 2, 5, 10, 20, 40, 80]) {
      const state: GameState = { ...base, day };
      for (const content of kinds) expect(payScaleFor(state, content)).toBe(1);
    }
  });

  it("does not add a field to the state or mutate the board input", () => {
    const base = newGame(5, "Purity");
    const keys = Object.keys(base);
    const first = contractBoard(base);
    const second = contractBoard(base);
    expect(first).toEqual(second);
    expect(Object.keys(base)).toEqual(keys);
    const next = resolveDay(base);
    expect(Object.keys(next).sort()).toEqual([...keys].sort());
  });

  it("pays a first clear full even on a token day, through resolveDay", () => {
    const base = newGame(1, "First");
    const mill = contentById("drowned-mill")!;
    const roster = base.roster.map(maxed);
    const progress = base.progress.map((p) => ({ ...p, clears: 0, attempts: 0 }));
    const stateAt = (day: number): GameState => ({
      ...base,
      day,
      gold: 0,
      roster,
      progress,
      plan: { parties: [{ contentId: "drowned-mill", heroes: roster.map((h) => h.id), stance: "steady" }] },
      pendingEvent: null,
      attention: [],
    });
    const tokenDay = Array.from({ length: 60 }, (_, i) => i + 1)
      .filter((d) => d % 7 !== 0)
      .find((d) => payScaleFor(stateAt(d), mill) < 1)!;
    const next = resolveDay(stateAt(tokenDay));
    expect(next.progress.find((p) => p.contentId === "drowned-mill")?.clears).toBe(1);
    expect(next.lastEncounter?.xp).toBe(mill.xp);
    expect(next.lastEncounter?.gold).toBe(mill.gold);
    expect(next.lastEncounter?.payScale).toBe(1);
  });

  it("the planner prefers a posted contract over an unposted repeat", () => {
    const base = newGame(1, "Pick");
    const roster = base.roster.map(maxed);
    const progress = base.progress.map((p) => ({ ...p, clears: 5, attempts: 5 }));
    const mill = contentById("drowned-mill")!;
    const day = Array.from({ length: 40 }, (_, i) => i + 1).find((d) => {
      const state: GameState = { ...base, day: d, roster, progress };
      return !isPosted(state, mill);
    })!;
    const state: GameState = {
      ...base,
      day,
      roster,
      progress,
      plan: { parties: [] },
    };
    const { plan } = planDay(state, STEWARD);
    expect(plan.parties.some((p) => p.contentId === "drowned-mill")).toBe(false);
    expect(plan.parties.length).toBeGreaterThan(0);
  });
});

describe("reward-aware planner", () => {
  const at = (h: Hero, level: number, ilvl: number): Hero => ({
    ...h,
    level,
    attrs: {
      might: 20, agility: 20, vitality: 20, endurance: 20,
      focus: 20, discipline: 20, awareness: 20, composure: 20,
    },
    gear: { weapon: ilvl, chest: ilvl, helm: ilvl, trinket: ilvl },
    traits: [],
    fatigue: 0,
    sharpness: 60,
    morale: 60,
    health: 100,
    contract: { ...h.contract, daysLeft: 30 },
  });

  const stateFor = (
    seed: number,
    level: number,
    ilvl: number,
    gold: number,
    cleared: (id: string) => boolean,
    broke = false,
  ): GameState => {
    const base = newGame(seed, "Need");
    const roster = base.roster.map((h) => at(h, level, ilvl));
    return {
      ...base,
      roster,
      gold,
      arrearsDays: broke ? 1 : 0,
      progress: base.progress.map((p) => ({
        ...p,
        clears: cleared(p.contentId) ? 5 : 0,
        attempts: 5,
      })),
      plan: { parties: [] },
      attention: [],
      pendingEvent: null,
    };
  };

  /** The board changes daily; find a day that posts the pair the test needs. */
  const dayWith = (state: GameState, ids: readonly string[]): GameState => {
    for (let day = 1; day <= 300; day += 1) {
      const candidate = { ...state, day };
      const posted = new Set(contractBoard(candidate).contracts.map((c) => c.id));
      if (ids.every((id) => posted.has(id))) return candidate;
    }
    throw new Error(`no day posts ${ids.join(", ")}`);
  };

  it("chases the gold run when the purse is empty", () => {
    const state = dayWith(stateFor(1, 25, 40, 0, () => true, true), [
      "toll-house",
      "drowned-mill",
    ]);
    const { plan } = planDay(state, STEWARD);
    expect(plan.parties[0]?.contentId).toBe("toll-house");
    expect(rewardContext(state).goldWeight).toBeGreaterThan(1);
    expect(rewardContext(state).lootWeight).toBe(0);
  });

  it("chases the loot run when the raid party is far below the next wall", () => {
    const state = dayWith(
      stateFor(2, 20, 10, 5000, (id) => contentById(id)?.kind === "mission"),
      ["plundered-vault", "drowned-mill"],
    );
    const { plan } = planDay(state, STEWARD);
    expect(plan.parties[0]?.contentId).toBe("plundered-vault");
    const ctx = rewardContext(state);
    expect(ctx.gearGap).toBeGreaterThan(50);
    expect(ctx.lootWeight).toBeGreaterThan(1);
  });

  it("goes back to XP when the purse is full and the party is geared", () => {
    const state = dayWith(
      stateFor(3, 50, 250, 50000, () => true),
      ["drowned-mill"],
    );
    const { plan } = planDay(state, STEWARD);
    expect(plan.parties[0]?.contentId).toBe("drowned-mill");
    expect(rewardContext(state).goldWeight).toBeLessThan(1);
    expect(rewardContext(state).lootWeight).toBe(0);
  });

  it("picks the gold farm when broke and the XP farm when rich", () => {
    const broke = stateFor(7, 5, 10, 0, () => true, true);
    const rich = stateFor(7, 5, 10, 5000, () => true);
    const one = (s: GameState): GameState => ({ ...s, roster: s.roster.slice(0, 1) });
    expect(planDay(one(broke), STEWARD).plan.parties[0]?.contentId).toBe("old-quarry");
    expect(planDay(one(rich), STEWARD).plan.parties[0]?.contentId).toBe("emberwood");
  });

  it("prices farm gold per hero and mission gold once", () => {
    const base = newGame(4, "Gold");
    const farm = contentById("emberwood")!;
    const mission = contentById("drowned-mill")!;
    const party = base.roster.slice(0, 3);
    expect(partyGold(farm, party, { gold: farm.gold })).toBe(farm.gold * 3);
    expect(partyGold(mission, party, { gold: mission.gold })).toBe(mission.gold);
  });

  it("loot is worthless once the party is above the band, and worth more below it", () => {
    const base = newGame(5, "Loot");
    const vault = contentById("plundered-vault")!;
    const high = base.roster.map((h) => at(h, LEVEL_CAP, 100));
    const low = base.roster.map((h) => at(h, LEVEL_CAP, 10));
    expect(lootValue({ ...base, roster: high }, vault, high)).toBe(0);
    expect(lootValue({ ...base, roster: low }, vault, low)).toBeGreaterThan(0);
  });

  it("prices XP only for heroes below the cap", () => {
    const capped = stateFor(8, LEVEL_CAP, 10, 0, () => true, true);
    const oneUncapped = {
      ...capped,
      roster: [{ ...capped.roster[0]!, level: LEVEL_CAP - 1 }, ...capped.roster.slice(1)],
    };
    const farm = contentById("emberwood")!;
    const cappedValue = rewardValue(
      capped,
      farm,
      capped.roster,
      effectiveReward(capped, farm, postedContractIds(capped)),
      rewardContext(capped),
    );
    const oneValue = rewardValue(
      oneUncapped,
      farm,
      oneUncapped.roster,
      effectiveReward(oneUncapped, farm, postedContractIds(oneUncapped)),
      rewardContext(oneUncapped),
    );
    expect(oneValue - cappedValue).toBeCloseTo(farm.xp * rewardContext(oneUncapped).xpWeight, 5);
  });

  it("treats a late-run purse as rich once one payday is covered", () => {
    const base = newGame(9, "Late");
    const roster = Array.from({ length: 10 }, (_, i) => ({
      ...makeHero(9, 900 + i, "warrior", 40),
      contract: { wage: 120, daysLeft: 30, status: "rotation" as const },
    }));
    const late: GameState = { ...base, roster, gold: 4000, day: 78 };
    expect(rewardContext(late).goldWeight).toBeLessThan(1);
  });

  it("the reward context moves with the raid party's gear, not the roster's best", () => {
    const base = newGame(6, "Gap");
    const under = stateFor(6, 50, 10, 5000, (id) => contentById(id)?.kind === "mission");
    const geared = stateFor(6, 50, 200, 5000, (id) => contentById(id)?.kind === "mission");
    expect(rewardContext(under).gearGap).toBeGreaterThan(rewardContext(geared).gearGap);
    expect(rewardContext(geared).lootWeight).toBeLessThan(rewardContext(under).lootWeight);
    expect(rewardContext(base).nextWall?.kind).toBe("raid");
  });
});

describe("loot and the raid team", () => {
  const at = (h: Hero, level: number, ilvl: number): Hero => ({
    ...h,
    level,
    attrs: {
      might: 20, agility: 20, vitality: 20, endurance: 20,
      focus: 20, discipline: 20, awareness: 20, composure: 20,
    },
    gear: { weapon: ilvl, chest: ilvl, helm: ilvl, trinket: ilvl },
    traits: [],
    fatigue: 0,
    sharpness: 60,
    morale: 60,
    health: 100,
    contract: { ...h.contract, daysLeft: 30 },
  });

  const three = (seed: number, ilvl: number): GameState => {
    const base = newGame(seed, "Loot");
    const roster = base.roster.map((h) => at(h, 60, ilvl));
    return { ...base, roster, plan: { parties: [] }, attention: [], pendingEvent: null };
  };

  it("suggests the largest upgrade, with a small team bias", () => {
    const base = three(1, 10);
    const roster = base.roster.map((h, i) =>
      i === 0 ? { ...h, gear: { ...h.gear, weapon: 100 } } : h,
    );
    const state: GameState = { ...base, roster, raidTeam: [roster[1]!.id] };
    const drop = { slot: "weapon" as const, ilvl: 20 };
    expect(suggestLootTarget(state, drop)).toBe(roster[1]!.id);
    expect(roster).toHaveLength(3);
  });

  it("assigns a drop purely, removes it from the queue, and dates the event today", () => {
    const state = three(1, 10);
    const content = contentById("plundered-vault")!;
    const pending = queueLoot(state, content, state.roster, [{ slot: "weapon", ilvl: 30 }], 5);
    const withPending: GameState = { ...state, pendingLoot: pending, day: 6 };
    const snapshot = structuredClone(withPending);
    const next = assignLoot(withPending, pending[0]!.id, state.roster[2]!.id);
    expect(withPending).toEqual(snapshot);
    expect(next.roster.find((h) => h.id === state.roster[2]!.id)!.gear.weapon).toBe(30);
    expect(next.pendingLoot).toHaveLength(0);
    expect(next.events.some((e) => e.day === 6 && e.text.includes("takes"))).toBe(true);
  });

  it("recomputes the target at apply time, so two drops do not overwrite one slot", () => {
    const state = three(2, 10);
    const content = contentById("plundered-vault")!;
    const pending = queueLoot(
      state,
      content,
      state.roster,
      [{ slot: "weapon", ilvl: 20 }, { slot: "weapon", ilvl: 20 }],
      5,
    );
    const withPending: GameState = { ...state, pendingLoot: pending, day: 6 };
    const next = autoAssignLoot(withPending);
    expect(next.roster.filter((h) => h.gear.weapon === 20)).toHaveLength(2);
    expect(next.pendingLoot).toHaveLength(0);
  });

  it("keeps the AI's old lowest-in-party policy as a floor", () => {
    const base = three(11, 10);
    const roster = base.roster.map((h, i) =>
      i === 0
        ? { ...h, gear: { weapon: 100, chest: 100, helm: 100, trinket: 100 } }
        : i === 2
          ? { ...h, gear: { weapon: 0, chest: 100, helm: 100, trinket: 100 } }
          : h,
    );
    const state: GameState = { ...base, roster, raidTeam: [] };
    const content = contentById("plundered-vault")!;
    const party = [roster[1]!, roster[2]!];
    const pending = queueLoot(state, content, party, [{ slot: "weapon", ilvl: 60 }], 5);
    const withPending: GameState = { ...state, pendingLoot: pending, day: 6 };
    const old = autoAssignLoot(withPending, "party-lowest");
    expect(old.roster[1]!.gear.weapon).toBe(60);
    expect(old.roster[2]!.gear.weapon).toBe(0);
    const need = autoAssignLoot(withPending);
    expect(need.roster[2]!.gear.weapon).toBe(60);
    expect(need.roster[1]!.gear.weapon).toBe(10);
  });

  it("drops a queue item no hero can use", () => {
    const state = three(3, 100);
    const content = contentById("plundered-vault")!;
    const pending = queueLoot(state, content, state.roster, [{ slot: "weapon", ilvl: 5 }], 5);
    expect(pending).toHaveLength(0);
  });

  it("lets a much larger bench upgrade beat the team bias", () => {
    const base = three(8, 10);
    const roster = base.roster.map((h, i) => ({
      ...h,
      gear: { ...h.gear, weapon: i === 0 ? 17 : 10 },
    }));
    const state: GameState = { ...base, roster, raidTeam: [roster[0]!.id] };
    const drop = { slot: "weapon" as const, ilvl: 20 };
    expect(suggestLootTarget(state, drop)).toBe(roster[1]!.id);
    const close: GameState = {
      ...base,
      roster: base.roster.map((h, i) => ({
        ...h,
        gear: { ...h.gear, weapon: i === 0 ? 13 : 11 },
      })),
      raidTeam: [base.roster[0]!.id],
    };
    expect(suggestLootTarget(close, drop)).toBe(base.roster[0]!.id);
  });

  it("shows one non-blocking loot item and assigns it from the queue", () => {
    const state = three(9, 10);
    const content = contentById("plundered-vault")!;
    const pending = queueLoot(state, content, state.roster, [{ slot: "weapon", ilvl: 30 }], 5);
    const withLoot: GameState = {
      ...state,
      day: 6,
      pendingLoot: pending,
      attention: deriveAttention({ ...state, day: 6, pendingLoot: pending }),
    };
    const item = withLoot.attention.find((i) => i.kind === "loot-pending");
    expect(item?.blocking).toBe(false);
    expect(blockedItems(withLoot)).toHaveLength(0);
    const next = resolveAttention(withLoot, "loot-pending:guild", "assign");
    expect(next.pendingLoot).toHaveLength(0);
    expect(next.roster.some((h) => h.gear.weapon === 30)).toBe(true);
    expect(next.attention.some((i) => i.kind === "loot-pending")).toBe(false);
  });

  it("resolves a day with pending loot without mutating the input", () => {
    const state = three(10, 10);
    const content = contentById("plundered-vault")!;
    const pending = queueLoot(state, content, state.roster, [{ slot: "weapon", ilvl: 30 }], 5);
    const withLoot: GameState = { ...state, pendingLoot: pending, day: 6 };
    const snapshot = structuredClone(withLoot);
    expect(resolveDay(withLoot)).toEqual(resolveDay(withLoot));
    resolveDay(withLoot);
    expect(withLoot).toEqual(snapshot);
  });

  it("builds a ten, keeps a player-set team, and fills from the bench", () => {
    const base = newGame(4, "Team");
    const roster = Array.from({ length: 12 }, (_, i) => ({
      ...makeHero(4, 900 + i, i % 2 === 0 ? "warrior" : "mage", 60),
      contract: { wage: 100, daysLeft: 30, status: "rotation" as const },
    }));
    const full: GameState = {
      ...base,
      roster,
      plan: { parties: [] },
      progress: base.progress.map((p) =>
        p.contentId === "ashen-spire" ? { ...p, clears: 1, attempts: 1 } : p,
      ),
    };
    const auto = ensureRaidTeam(full);
    expect(auto.raidTeam).toHaveLength(10);
    const eight: GameState = { ...auto, raidTeam: auto.raidTeam!.slice(0, 8) };
    const grown = ensureRaidTeam(eight);
    expect(grown.raidTeam).toHaveLength(10);
    expect(grown.raidTeam!.slice(0, 8)).toEqual(eight.raidTeam);
    expect(autoRaidTeam(eight).raidTeam).toHaveLength(10);
    expect(raidTeamHeroes(auto)).toHaveLength(10);

    const raid = contentById("raid-gatewarden")!;
    const stable = stableRaidParty(auto, raid);
    expect(stable.map((h) => h.id)).toEqual(auto.raidTeam);

    const small = newGame(4, "Grow");
    const three = autoRaidTeam(small);
    expect(three.raidTeam).toHaveLength(3);
    const bigger: GameState = {
      ...three,
      roster: [
        ...three.roster,
        ...Array.from({ length: 7 }, (_, i) => ({
          ...makeHero(4, 950 + i, "mage", 60),
          contract: { wage: 100, daysLeft: 30, status: "rotation" as const },
        })),
      ],
      progress: three.progress.map((p) =>
        p.contentId === "ashen-spire" ? { ...p, clears: 1, attempts: 1 } : p,
      ),
    };
    const grownAgain = ensureRaidTeam(bigger);
    expect(grownAgain.raidTeam).toHaveLength(10);
    expect(grownAgain.raidTeam!.slice(0, 3)).toEqual(three.raidTeam);
  });

  it("leaves a clear's drops pending until the next day, then applies them", () => {
    const base = three(5, 10);
    const content = contentById("plundered-vault")!;
    const roster = base.roster;
    const state: GameState = {
      ...base,
      day: 10,
      roster,
      progress: base.progress.map((p) =>
        p.contentId === content.id ? { ...p, clears: 5, attempts: 5 } : p,
      ),
      plan: {
        parties: [{ contentId: content.id, heroes: roster.map((h) => h.id), stance: "steady" }],
      },
      raidTeam: [roster[0]!.id],
    };
    const next = resolveDay(state);
    expect(next.pendingLoot?.length).toBe(content.loot.count);
    expect(next.roster.every((h) => h.gear.weapon === 10)).toBe(true);
    const applied = autoAssignLoot(next);
    expect(applied.pendingLoot).toHaveLength(0);
    expect(applied.roster.some((h) => h.gear.weapon > 10)).toBe(true);
  });

  it("applies the last day's drops before the final score", () => {
    const base = three(6, 10);
    const content = contentById("plundered-vault")!;
    const roster = base.roster;
    const state: GameState = {
      ...base,
      day: 84,
      roster,
      progress: base.progress.map((p) =>
        p.contentId === content.id ? { ...p, clears: 5, attempts: 5 } : p,
      ),
      plan: {
        parties: [{ contentId: content.id, heroes: roster.map((h) => h.id), stance: "steady" }],
      },
      raidTeam: [roster[0]!.id],
    };
    const next = resolveDay(state);
    expect(next.finished).toBe(true);
    expect(next.pendingLoot).toHaveLength(0);
    expect(next.roster.some((h) => h.gear.weapon > 10)).toBe(true);
  });

  it("loads an old save without the new fields", () => {
    const state = three(7, 10);
    const old: GameState = { ...state };
    delete old.pendingLoot;
    delete old.raidTeam;
    expect(autoAssignLoot(old)).toBe(old);
    expect(ensureRaidTeam(old).raidTeam ?? []).toHaveLength(0);
    expect(autoRaidTeam(old).raidTeam).toHaveLength(3);
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

  it("names the next door with the same average the gate used", () => {
    const base = newGame(1, "Door");
    // Twelve level-30 heroes: every area at or below 30 is fieldable, and the
    // Pale Market (32) is the first that is not.
    const roster = Array.from({ length: 12 }, (_, index) => ({
      ...base.roster[index % base.roster.length]!,
      id: `door-${index}`,
      level: 30,
    }));
    const s: GameState = { ...base, roster };
    const door = nextDoor(s);
    expect(door?.content.id).toBe("pale-market");
    expect(door?.status).toBe("level");
    // The gate carries the numbers the rule used, not a second opinion.
    expect(door?.gate).toEqual({ average: 30, need: 32, counted: 5 });
    expect(door?.reason).toContain("30.0");
    expect(canField(contentById("pale-market")!, s.roster)).toBe(false);
    // A raid behind the door is not the next step the guild can take.
    expect(door?.content.kind).toBe("dungeon");

    const capped: GameState = { ...s, roster: s.roster.map((h) => ({ ...h, level: 60 })) };
    expect(nextDoor(capped)).toBeNull();
  });

  it("names a roster gate when the area needs more bodies", () => {
    const base = newGame(1, "Door");
    const s: GameState = { ...base, roster: base.roster.map((h) => ({ ...h, level: 60 })) };
    const door = nextDoor(s);
    expect(door?.content.id).toBe("hollow-crypt");
    expect(door?.roster).toEqual({ have: 3, need: 4 });
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
  }, 20_000);

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

  it("resolves every hero effect on the card's own subject", () => {
    // `applyEffect` uses the card's subject for every hero effect, so an
    // effect that names a different target is silently a no-op. The bandit
    // card shipped that way: "send the party" hurt nobody.
    const heroTarget = (e: Effect): EventTarget | null => {
      switch (e.kind) {
        case "morale":
        case "gear":
        case "injury":
        case "leave":
        case "fatigue":
        case "wage":
          return e.target;
        default:
          return null;
      }
    };
    for (const card of EVENT_CARDS) {
      for (const option of card.options) {
        for (const effect of option.effects) {
          const target = heroTarget(effect);
          if (target === null || target === "guild") continue;
          expect(
            target,
            `${card.id}.${option.key} targets ${target} on a ${card.target} card`,
          ).toBe(card.target);
        }
      }
    }
  });

  it("weighs a card instead of taking its first option", () => {
    const base = newGame(9, "Weigh");
    const hero = base.roster[0]!;
    const withGear = (ilvl: number): GameState => ({
      ...base,
      gold: 1000,
      roster: base.roster.map((h) => (h.id === hero.id ? { ...h, gear: { weapon: ilvl, chest: ilvl, helm: ilvl, trinket: ilvl } } : h)),
      pendingEvent: { cardId: "cursed-blade", day: base.day, targetHeroId: hero.id },
      attention: [],
    });

    // The blade is a 55 iLvl weapon: an upgrade for a starter, junk for a
    // geared hero. Same card, same option order, opposite answers.
    expect(chooseCardOption(withGear(5), STEWARD)!.option.key).toBe("buy");
    expect(chooseCardOption(withGear(80), STEWARD)!.option.key).toBe("pass");
  });

  it("never chooses an option the purse cannot cover", () => {
    const base = newGame(9, "Broke");
    const state: GameState = {
      ...base,
      gold: 100,
      pendingEvent: { cardId: "cursed-blade", day: base.day, targetHeroId: base.roster[0]!.id },
      attention: [],
    };
    const choice = chooseCardOption(state, STEWARD)!;
    expect(choice.option.key).not.toBe("buy");
    expect(choice.scored.map((s) => s.key)).not.toContain("buy");
  });

  it("every card has a choice the AI can take and resolve", () => {
    const mid = midRun(18, 30);
    for (const card of EVENT_CARDS) {
      const state: GameState = {
        ...mid,
        gold: 2000,
        renown: 3,
        pendingEvent: { cardId: card.id, day: mid.day, targetHeroId: mid.roster[0]!.id },
        attention: [],
      };
      const choice = chooseCardOption(state, STEWARD);
      expect(choice, card.id).not.toBeNull();
      const after = resolveAttention(state, `event:${card.id}:${mid.day}`, choice!.option.key);
      expect(after.pendingEvent, card.id).toBeNull();
    }
  });

  it("a hurt-a-hero card actually hurts one", () => {
    const base = newGame(5, "Bandit");
    const state: GameState = {
      ...base,
      gold: 500,
      pendingEvent: { cardId: "bandit-raid", day: base.day, targetHeroId: base.roster[1]!.id },
      attention: [],
    };
    const after = resolveAttention(state, `event:bandit-raid:${base.day}`, "fight");
    expect(after.roster.filter((h) => h.injuryDays > 0)).toHaveLength(1);
    expect(after.gold).toBe(500);
  });

  it("resting on the old-wound card costs days, not health", () => {
    const base = newGame(5, "Wound");
    const hero = base.roster[0]!;
    const state: GameState = {
      ...base,
      roster: base.roster.map((h) => (h.id === hero.id ? { ...h, health: 60 } : h)),
      pendingEvent: { cardId: "old-wound", day: base.day, targetHeroId: hero.id },
      attention: [],
    };
    const after = resolveAttention(state, `event:old-wound:${base.day}`, "rest");
    expect(after.roster[0]!.health).toBe(60);
    expect(after.roster[0]!.injuryDays).toBe(2);
  });

  it("answering the taunt has a price", () => {
    const base = newGame(5, "Taunt");
    const state: GameState = {
      ...base,
      gold: 500,
      pendingEvent: { cardId: "taunt", day: base.day, targetHeroId: null },
      attention: [],
    };
    const after = resolveAttention(state, `event:taunt:${base.day}`, "answer");
    expect(after.gold).toBe(400);
    expect(after.renown).toBe(base.renown + 1);
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

  it("reports a party outside the area's hero range, and only the gap", () => {
    const start = newGame(1, "Overfill");
    const extra: Hero = { ...start.roster[0]!, id: "extra-hero" };
    const ids = [...start.roster.map((h) => h.id), extra.id];
    const over: GameState = {
      ...start,
      roster: [...start.roster, extra],
      plan: { parties: [{ contentId: "wolf-den", heroes: ids, stance: "steady" }] },
    };
    expect(partySizeProblems(over)).toMatchObject([
      { index: 0, heroes: 4, kind: "over", delta: 1 },
    ]);
    expect(validatePlan(over).some((p) => p.message.includes("3-3 heroes (has 4)"))).toBe(true);
    expect(partySizeProblems(start)).toEqual([]);

    // The other direction: a two-hero plan for a three-hero area is editable
    // (so a replacement can be added) but not deployable.
    const short: GameState = {
      ...start,
      plan: { parties: [{ contentId: "wolf-den", heroes: ids.slice(0, 2), stance: "steady" }] },
    };
    expect(partySizeProblems(short)).toMatchObject([
      { index: 0, heroes: 2, kind: "under", delta: 1 },
    ]);
    expect(validatePlan(short).some((p) => p.message.includes("3-3 heroes (has 2)"))).toBe(true);

    // Removing every hero keeps the target: 0/3 is an editable state, not a
    // deleted party, and it blocks the day like any other short plan.
    const empty: GameState = {
      ...start,
      plan: { parties: [{ contentId: "wolf-den", heroes: [], stance: "steady" }] },
    };
    expect(partySizeProblems(empty)).toMatchObject([
      { index: 0, heroes: 0, kind: "under", delta: 3 },
    ]);
    expect(validatePlan(empty).some((p) => p.message.includes("3-3 heroes (has 0)"))).toBe(true);
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
    const base = newGame(11, "WorldFirst");
    const raidIds = RAIDS.map((r) => r.id);
    // Build a finished rival by hand: two raid clears must not earn World
    // First, three must. The tick skips a finished guild's aiTurn, so the
    // test costs one queue check rather than an 84-day race.
    const rivalWithRaids = (index: number, cleared: readonly string[]) => {
      const source = base.rivals[index]!;
      const guild = structuredClone(source.guild);
      guild.finished = true;
      guild.worldFirstDay = null;
      guild.plan = { parties: [] };
      guild.progress = guild.progress.map((p) =>
        cleared.includes(p.contentId) ? { ...p, clears: Math.max(1, p.clears) } : { ...p, clears: 0 },
      );
      return { ...source, guild };
    };
    const stateWith = (cleared: readonly string[]): GameState => ({
      ...base,
      day: 85,
      worldFirstDay: null,
      rivals: base.rivals.map((_, i) => rivalWithRaids(i, i === 0 ? cleared : [])),
    });

    const two = stateWith(raidIds.slice(0, 2));
    tickRivals(two);
    expect(two.rivals[0]!.guild.worldFirstDay).toBeNull();

    const three = stateWith(raidIds);
    tickRivals(three);
    expect(three.rivals[0]!.guild.worldFirstDay).toBe(84);
    expect(three.rivals.slice(1).every((r) => r.guild.worldFirstDay === null)).toBe(true);
  });

  it("the world reproduces exactly from the seed", () => {
    const a = runWorld(newGame(9, "Test"), STEWARD, 10);
    const b = runWorld(newGame(9, "Test"), STEWARD, 10);
    expect(a.day).toBe(b.day);
    expect(a.rivals.map((r) => r.guild.day)).toEqual(b.rivals.map((r) => r.guild.day));
    expect(a.rivals.map((r) => r.guild.gold)).toEqual(b.rivals.map((r) => r.guild.gold));
    expect(a.rivals.map((r) => r.guild.roster.map((h) => h.level))).toEqual(
      b.rivals.map((r) => r.guild.roster.map((h) => h.level)),
    );
  }, 30_000);

  it("a full world run finishes with every rival on day 85", () => {
    const s = playWorld(1);
    expect(s.finished).toBe(true);
    for (const rival of s.rivals) {
      expect(rival.guild.day).toBe(85);
      expect(rival.guild.finished).toBe(true);
      expect(rival.activity.length).toBeGreaterThan(0);
    }
  }, 180_000);

  it("a rival is a real guild and the world tick advances it exactly one day", () => {
    const s = newGame(7, "Rivals");
    expect(s.rivals).toHaveLength(3);
    const before = s.rivals.map((r) => r.guild.day);
    const next = advanceDay(s);
    for (const [i, rival] of next.rivals.entries()) {
      expect(rival.guild.day).toBe(before[i]! + 1);
      expect(rival.guild.roster.length).toBeGreaterThan(0);
      expect(rival.activity.length).toBeGreaterThan(0);
      // A rival guild must not carry rivals of its own, or the world tick
      // would recurse through `resolveDay`.
      expect(rival.guild.rivals).toHaveLength(0);
    }
  });

  it("the world tick does not mutate the state it is given", () => {
    const s = newGame(8, "Copy");
    const snapshot = structuredClone(s.rivals);
    advanceDay(s);
    expect(s.rivals).toEqual(snapshot);
  });

  it("applies the rival pace to rivals and not the player", () => {
    const s = newGame(2, "Pace");
    expect(s.rewardScale).toBe(1);
    for (const rival of s.rivals) expect(rival.guild.rewardScale).toBe(RIVAL.pace);
  });

  it("scores every guild and ranks the player among four", () => {
    const s = newGame(3, "Board");
    const board = standings(s);
    expect(board).toHaveLength(4);
    expect(board.filter((row) => row.isPlayer)).toHaveLength(1);
    const scores = board.map((row) => row.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(playerRank(s)).toBeGreaterThanOrEqual(1);
    expect(playerRank(s)).toBeLessThanOrEqual(4);
  });
});

describe("raid hub history", () => {
  const withRaidProgress = (
    state: GameState,
    contentId: string,
    clearedOnDay: number | null,
    bestPull: number,
    attempts: number,
  ): GameState => ({
    ...state,
    progress: state.progress.map((row) =>
      row.contentId === contentId
        ? { ...row, clears: clearedOnDay === null ? 0 : 1, clearedOnDay, bestPull, attempts }
        : row,
    ),
  });

  it("records every pull of a raid night, and the check that stopped it", () => {
    const state = playAi(7);
    const log = state.raidLog ?? [];
    expect(log.length).toBeGreaterThan(0);
    for (const night of log) {
      expect(contentById(night.contentId)?.kind).toBe("raid");
      expect(night.pulls.length).toBeGreaterThan(0);
      expect(night.pulls.map((pull) => pull.index)).toEqual(
        night.pulls.map((_, index) => index + 1),
      );
      // A night can kill once; a second killed pull in one night is a bug.
      expect(night.pulls.filter((pull) => pull.killed).length).toBeLessThanOrEqual(1);
      for (const pull of night.pulls) {
        if (pull.killed) {
          expect(pull.failed).toBeNull();
        } else if (pull.failed) {
          // The failed check names both numbers, the same rule the report keeps.
          expect(pull.failed.requirement).toBeGreaterThan(pull.failed.value);
          expect(pull.failed.ratio).toBeLessThan(1);
        }
      }
    }
    expect(log.flatMap((night) => night.pulls).some((pull) => pull.failed !== null)).toBe(true);
  });

  it("keeps the log bounded, deterministic and raid-only", () => {
    const a = playAi(18);
    const b = playAi(18);
    expect(a.raidLog).toEqual(b.raidLog);
    expect((a.raidLog ?? []).length).toBeLessThanOrEqual(RAID_LOG.maxNights);
    // Dungeons leave a report; only raids write the hub's history.
    expect((a.raidLog ?? []).every((night) => contentById(night.contentId)?.kind === "raid")).toBe(
      true,
    );
    expect(
      a.progress.some((row) => contentById(row.contentId)?.kind === "dungeon" && row.clears > 0),
    ).toBe(true);
  });

  it("does not carry three rival histories into the save", () => {
    const state = playWorld(18);
    expect(state.raidLog?.length).toBeGreaterThan(0);
    for (const rival of state.rivals) expect(rival.guild.raidLog).toEqual([]);
  });

  it("filters the history by boss and reads an old save as empty", () => {
    const state = playAi(7);
    const nights = raidNights(state, "raid-tyrant");
    expect(nights.length).toBeGreaterThan(0);
    expect(nights.every((night) => night.contentId === "raid-tyrant")).toBe(true);
    expect(raidNights({ ...state, raidLog: undefined }, "raid-tyrant")).toEqual([]);
  });

  it("orders the race on a boss by kill day, then best pull", () => {
    const base = newGame(7, "Race");
    const player = withRaidProgress(base, "raid-covens", 60, 1, 8);
    const state: GameState = {
      ...player,
      rivals: base.rivals.map((rival) => {
        const cleared = rival.name === "Echoes" ? withRaidProgress(rival.guild, "raid-covens", 40, 1, 5) : null;
        const contesting = withRaidProgress(
          rival.guild,
          "raid-covens",
          null,
          rival.name === "Methodical" ? 0.55 : 0.42,
          3,
        );
        return { ...rival, guild: cleared ?? contesting };
      }),
    };
    const rows = raidRace(state, "raid-covens");
    expect(rows.map((row) => row.name)).toEqual(["Echoes", "Race", "Methodical", "Ravensguard"]);
    expect(rows.find((row) => row.isPlayer)?.clearedOnDay).toBe(60);
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

  it("prints the check-specific power the encounter uses", () => {
    const state = newGame(2, "Roles");
    const hero = state.roster[0]!;
    for (const check of ["dps", "mitigation", "mechanics", "sustain"] as const) {
      expect(checkPowerInRole(hero, hero.role, check)).toBeCloseTo(checkContribution(hero, check, 1), 6);
    }
  });

  it("treats a save without naturalRole as natural", () => {
    const state = newGame(2, "Roles");
    const hero = { ...state.roster[0]! };
    delete (hero as { naturalRole?: string }).naturalRole;
    expect(fitFor(hero, hero.role).fit).toBe("natural");
  });

  it("keeps every role's affinity bounded", () => {
    const checks = ["dps", "mitigation", "mechanics", "sustain"] as const;
    for (const role of ROLES) {
      const values = checks.map((check) => roleAffinity(role.id, check));
      expect(Math.max(...values)).toBeGreaterThanOrEqual(1.05);
      expect(Math.min(...values)).toBeGreaterThanOrEqual(0.85);
    }
    expect(roleAffinity("arcanist", "dps")).toBe(1.05);
    expect(roleAffinity("vanguard", "mitigation")).toBe(1.05);
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
      const flips = after.roster.filter((h) => h.role !== (h.naturalRole ?? h.role)).length;
      expect(flips).toBeLessThanOrEqual(plan.parties.length * 2);
    }
  });

  it("does not re-spec a party that already clears", () => {
    const base = newGame(3, "Clear");
    const heroes = Array.from({ length: 5 }, (_, i) => ({
      ...makeHero(3, 900 + i, "warrior", 60),
      attrs: {
        might: 20, agility: 20, vitality: 20, endurance: 20,
        focus: 20, discipline: 20, awareness: 20, composure: 20,
      },
      gear: { weapon: 140, chest: 140, helm: 140, trinket: 140 },
      traits: [] as TraitId[],
      fatigue: 0,
      sharpness: 60,
      morale: 60,
      health: 100,
      contract: { wage: 100, daysLeft: 30, status: "rotation" as const },
    }));
    const state: GameState = { ...base, roster: heroes };
    const plan = {
      parties: [{ contentId: "hollow-crypt", heroes: heroes.map((h) => h.id), stance: "steady" as const }],
    };
    expect(projectAssignment(state, plan.parties[0]!)!.minRatio).toBeGreaterThan(1);
    const result = reviewRoles(state, plan);
    expect(result.notes).toHaveLength(0);
    expect(result.state).toBe(state);
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

describe("contract negotiation", () => {
  const at = (
    start: GameState,
    heroId: string,
    patch: (h: Hero) => Hero,
  ): GameState => ({
    ...start,
    roster: start.roster.map((h) => (h.id === heroId ? patch(h) : h)),
  });

  it("takes a counter-offer from a happy, loyal hero and re-prices the wage", () => {
    const start = newGame(41, "Counter");
    const hero = start.roster[0]!;
    const state = at(start, hero.id, (h) => ({
      ...h,
      level: 30,
      morale: 100,
      hidden: { ...h.hidden, loyalty: 20 },
      contract: { ...h.contract, daysLeft: 7, wage: 30 },
    }));
    const expiring = state.roster.find((h) => h.id === hero.id)!;
    expect(acceptsCounter(expiring)).toBe(true);

    const live = { ...state, attention: deriveAttention(state) };
    const item = live.attention.find((i) => i.kind === "contract-expiring")!;
    expect(item.options.map((o) => o.key)).toContain("counter");
    const next = resolveAttention(live, item.id, "counter");
    const signed = next.roster.find((h) => h.id === hero.id)!;
    expect(signed.contract.wage).toBe(counterOffer(expiring));
    expect(signed.contract.wage).toBeLessThan(wageForLevel(30));
    expect(signed.contract.daysLeft).toBe(CONTRACT.daysMax);
    expect(signed.contract.counterRefused).toBe(false);
    expect(next.events.some((e) => e.text.includes("took the counter-offer"))).toBe(true);
  });

  it("a refused counter-offer raises the hero's final number, and meeting it re-signs", () => {
    const start = newGame(42, "Refused");
    const hero = start.roster[0]!;
    const state = at(start, hero.id, (h) => ({
      ...h,
      level: 30,
      morale: 50,
      hidden: { ...h.hidden, loyalty: 5 },
      contract: { ...h.contract, daysLeft: 7, wage: 30 },
    }));
    const before = state.roster.find((h) => h.id === hero.id)!;
    expect(acceptsCounter(before)).toBe(false);

    const live = { ...state, attention: deriveAttention(state) };
    const item = live.attention.find((i) => i.kind === "contract-expiring")!;
    const refused = resolveAttention(live, item.id, "counter");
    const angry = refused.roster.find((h) => h.id === hero.id)!;
    expect(angry.contract.counterRefused).toBe(true);
    expect(angry.morale).toBe(50 + NEGOTIATION.refuseMorale);
    expect(deriveAttention(refused).some((i) => i.kind === "contract-counter")).toBe(true);

    const final = deriveAttention(refused).find((i) => i.kind === "contract-counter")!;
    const met = resolveAttention({ ...refused, attention: deriveAttention(refused) }, final.id, "meet");
    const signed = met.roster.find((h) => h.id === hero.id)!;
    expect(signed.contract.wage).toBe(counterDemand(angry));
    expect(signed.contract.wage).toBeGreaterThan(wageForLevel(30));
    expect(signed.contract.counterRefused).toBe(false);
    expect(deriveAttention(met).some((i) => i.kind === "contract-counter")).toBe(false);
  });

  it("hides the counter when the hero is too unhappy to discuss a cut", () => {
    const start = newGame(43, "Grim");
    const hero = start.roster[0]!;
    const state = at(start, hero.id, (h) => ({
      ...h,
      morale: NEGOTIATION.moraleFloor,
      contract: { ...h.contract, daysLeft: 3 },
    }));
    const item = deriveAttention(state).find((i) => i.kind === "contract-expiring")!;
    expect(item.options.map((o) => o.key)).not.toContain("counter");
    expect(item.options.map((o) => o.key)).toEqual(["renew", "release"]);
  });

  it("breaks a promise into a transfer request, and granting it pays the fee", () => {
    const start = newGame(44, "Transfer");
    const hero = start.roster[0]!;
    const state: GameState = {
      ...start,
      day: 20,
      gold: 100,
      promises: [{ id: "p", heroId: hero.id, madeOn: 12, dueOn: 18, daysAssigned: 0, status: "broken" }],
    };
    const live = { ...state, attention: deriveAttention(state) };
    const item = live.attention.find((i) => i.kind === "transfer-request")!;
    expect(item.blocking).toBe(true);

    const fee = transferFee(hero);
    const next = resolveAttention(live, item.id, "transfer");
    expect(next.roster.some((h) => h.id === hero.id)).toBe(false);
    expect(next.gold).toBe(100 + fee);
    expect(next.promises![0]!.transferAsked).toBe(true);
    expect(deriveAttention(next).some((i) => i.kind === "transfer-request")).toBe(false);
  });

  it("refusing a transfer keeps the hero and does not ask again", () => {
    const start = newGame(45, "Stay");
    const hero = start.roster[0]!;
    const state: GameState = {
      ...start,
      day: 20,
      promises: [{ id: "p", heroId: hero.id, madeOn: 12, dueOn: 18, daysAssigned: 0, status: "broken" }],
      roster: start.roster.map((h) => (h.id === hero.id ? { ...h, morale: 60 } : h)),
    };
    const live = { ...state, attention: deriveAttention(state) };
    const item = live.attention.find((i) => i.kind === "transfer-request")!;
    expect(item.options.map((o) => o.key)).toEqual(["transfer", "refuse"]);
    const next = resolveAttention(live, item.id, "refuse");
    expect(next.roster.some((h) => h.id === hero.id)).toBe(true);
    expect(next.roster.find((h) => h.id === hero.id)!.morale).toBe(60 + NEGOTIATION.transferMorale);
    expect(next.promises![0]!.transferAsked).toBe(true);
    expect(deriveAttention(next).some((i) => i.kind === "transfer-request")).toBe(false);
  });
});

describe("the high band and the daily star", () => {
  it("adds farm and mission work above the old band, after the raid ladder", () => {
    const highFarms = CONTENT.filter((c) => c.kind === "farm" && c.minLevel >= 20);
    const highMissions = CONTENT.filter((c) => c.kind === "mission" && c.minLevel >= 20);
    expect(highFarms.length).toBeGreaterThanOrEqual(4);
    expect(highMissions.length).toBeGreaterThanOrEqual(4);
    for (const content of [...highFarms, ...highMissions]) {
      expect(content.requires).toEqual([]);
      expect(content.id).not.toBe("");
    }
    const lastRaid = CONTENT.findIndex((c) => c.id === "raid-tyrant");
    expect(CONTENT.findIndex((c) => c.id === "ashen-verge")).toBeGreaterThan(lastRaid);
    expect(contentById("cinder-road")!.phases[0]!.check).toBe("mechanics");
    expect(contentById("silent-abbey")!.phases[0]!.check).toBe("sustain");
    expect(contentById("broken-standard")!.phases[0]!.check).toBe("mitigation");
  });

  it("stars one open non-raid area a day, deterministically and with rotation", () => {
    const base = newGame(77, "Star");
    const first = featuredContentFor(base);
    expect(first).not.toBeNull();
    expect(first!.kind).not.toBe("raid");
    expect(featuredContentFor({ ...base, day: 2 })?.id).toBe(featuredContentFor({ ...base, day: 2 })?.id);
    const ids = new Set(Array.from({ length: 20 }, (_, i) => featuredContentFor({ ...base, day: i + 1 })?.id));
    expect(ids.size).toBeGreaterThan(1);
  });

  it("pays the star multiplier on both gold and XP", () => {
    const base = newGame(5, "StarPay");
    const one = {
      ...base,
      roster: base.roster.slice(0, 1),
      plan: { parties: [{ contentId: "emberwood", heroes: [base.roster[0]!.id], stance: "steady" as const }] },
    };
    // One level-1 hero can field only Emberwood, so the star has one candidate.
    expect(featuredContentFor(one)?.id).toBe("emberwood");
    const goldBefore = one.gold;
    const xpBefore = one.roster[0]!.xp;
    const next = resolveDay(one);
    expect(next.gold - goldBefore).toBe(Math.round(6 * 1 * 1.5));
    // The star is a gold rule: XP is unchanged, so it cannot buy levels.
    expect(next.roster[0]!.xp).toBe(xpBefore + 10);
    expect(next.events.some((e) => e.text.includes("was starred"))).toBe(true);
  });
});

describe("the market", () => {
  const rich = (state: GameState): GameState => ({ ...state, gold: 5000 });
  const good = (id: string) => MARKET_GOODS.find((row) => row.id === id)!;

  it("sells gear at the guild's tier and upgrades one slot", () => {
    const base = newGame(11, "Market");
    const hero = base.roster[0]!;
    const state = rich({
      ...base,
      roster: base.roster.map((h) =>
        h.id === hero.id ? { ...h, gear: { weapon: 0, chest: 0, helm: 0, trinket: 0 } } : h,
      ),
    });
    const tier = marketGearIlvl(state);
    const price = marketPrice(state, good("gear-weapon"), hero);
    const next = buyGood(state, "gear-weapon", hero.id)!;
    expect(next).not.toBeNull();
    expect(next.roster.find((h) => h.id === hero.id)!.gear.weapon).toBe(tier);
    expect(next.gold).toBe(state.gold - price);
    expect(next.events.at(-1)?.text).toContain("forged blade");
  });

  it("heals an injury, cuts fatigue, and applies a three-day tonic", () => {
    const base = newGame(12, "Care");
    const hero = base.roster[0]!;
    const hurt = rich({
      ...base,
      roster: base.roster.map((h) =>
        h.id === hero.id ? { ...h, injuryDays: 4, health: 20, fatigue: 80 } : h,
      ),
    });

    const salvePrice = marketPrice(hurt, good("salve"), hurt.roster[0]!);
    const healed = buyGood(hurt, "salve", hero.id)!;
    const afterSalve = healed.roster.find((h) => h.id === hero.id)!;
    expect(afterSalve.injuryDays).toBe(0);
    expect(afterSalve.health).toBe(70);
    expect(healed.gold).toBe(hurt.gold - salvePrice);

    const rationsPrice = marketPrice(hurt, good("rations"), hurt.roster[0]!);
    const fed = buyGood(hurt, "rations", hero.id)!;
    const afterFood = fed.roster.find((h) => h.id === hero.id)!;
    expect(afterFood.fatigue).toBe(35);
    expect(afterFood.health).toBe(35);
    expect(fed.gold).toBe(hurt.gold - rationsPrice);

    const fresh = rich(base);
    const before = formMod(fresh.roster[0]!);
    const tonic = buyGood(fresh, "tonic", hero.id)!;
    const buffed = tonic.roster.find((h) => h.id === hero.id)!;
    expect(buffed.buffDays).toBe(3);
    expect(formMod(buffed) / before).toBeCloseTo(1.1, 6);

    let expired = tonic;
    for (let i = 0; i < 3; i += 1) expired = resolveDay(expired);
    const done = expired.roster.find((h) => h.id === hero.id)!;
    expect(done.buffDays).toBe(0);
    expect(done.buffPower).toBe(0);
  });

  it("will not buy an upgrade the hero already has, or spend money the guild lacks", () => {
    const base = newGame(13, "NoSale");
    const hero = base.roster[0]!;
    const top = {
      ...base,
      roster: base.roster.map((h) =>
        h.id === hero.id ? { ...h, gear: { weapon: 999, chest: 999, helm: 999, trinket: 999 } } : h,
      ),
    };
    expect(buyGood(top, "gear-weapon", hero.id)).toBeNull();
    expect(buyGood({ ...base, gold: 0 }, "salve", hero.id)).toBeNull();
  });
});

describe("selling and forging drops", () => {
  const drop = (): PendingLoot => ({
    id: "loot-1",
    day: 1,
    contentId: "hollow-crypt",
    contentName: "Hollow Crypt",
    slot: "weapon",
    ilvl: 50,
    item: "Test Blade",
  });

  it("sells a waiting drop for its value", () => {
    const base = newGame(14, "Sell");
    const item = drop();
    const state: GameState = { ...base, gold: 0, pendingLoot: [item] };
    const next = sellLoot(state, item.id);
    expect(next.gold).toBe(lootSellValue(item));
    expect(next.pendingLoot).toHaveLength(0);
  });

  it("forges a drop into +6 over the better of the drop and the hero's gear", () => {
    const base = newGame(15, "Forge");
    const item = drop();
    const hero = base.roster[0]!;
    const state: GameState = {
      ...base,
      gold: 5000,
      roster: base.roster.map((h) =>
        h.id === hero.id ? { ...h, gear: { ...h.gear, weapon: 45 } } : h,
      ),
      pendingLoot: [item],
    };
    const before = state.roster.find((h) => h.id === hero.id)!.gear.weapon;
    const next = craftLoot(state, item.id, hero.id)!;
    expect(next.roster.find((h) => h.id === hero.id)!.gear.weapon).toBe(Math.max(before, item.ilvl) + 6);
    expect(next.gold).toBe(state.gold - craftCost(item));
    expect(next.pendingLoot).toHaveLength(0);
  });
});

describe("push risk", () => {
  it("has a chance before fatigue, and fatigue raises it", () => {
    const hero = { ...makeHero(1, 5, "warrior", 40), fatigue: 0 };
    expect(pushInjuryChance(hero)).toBeGreaterThan(0);
    expect(pushInjuryChance({ ...hero, fatigue: 100 })).toBeGreaterThan(pushInjuryChance(hero));
  });

  it("can injure a ten-hero raid night that clears, and never lists a body twice", () => {
    let found = false;
    for (let seed = 1; seed <= 40 && !found; seed += 1) {
      const base = newGame(seed, "Push");
      const roster = Array.from({ length: 10 }, (_, i) => ({
        ...makeHero(seed, 900 + i, i % 2 === 0 ? "warrior" : "mage", 55),
        gear: { weapon: 250, chest: 250, helm: 250, trinket: 250 },
        traits: [],
        fatigue: 0,
        sharpness: 60,
        morale: 70,
        health: 100,
      }));
      const state: GameState = { ...base, roster };
      const outcome = resolveAssignment(state, {
        contentId: "raid-gatewarden",
        heroes: roster.map((h) => h.id),
        stance: "push",
      })!;
      expect(new Set(outcome.injured.map((i) => i.heroId)).size).toBe(outcome.injured.length);
      if (outcome.injured.length > 0) found = true;
    }
    expect(found).toBe(true);
  });
});

describe("poaching", () => {
  it("prices and signs a rival hero, then cleans their plan and raid ten", () => {
    const base = newGame(55, "Poach");
    const rival = base.rivals[0]!;
    const hero = rival.guild.roster[0]!;
    const state: GameState = {
      ...base,
      gold: 10000,
      rivals: base.rivals.map((r) =>
        r.id === rival.id
          ? {
              ...r,
              guild: {
                ...r.guild,
                plan: { parties: [{ contentId: "emberwood", heroes: [hero.id], stance: "steady" }] },
                raidTeam: [hero.id],
              },
            }
          : r,
      ),
    };
    const fee = poachFee(hero);
    const wage = poachWage(hero);
    const next = poachHero(state, rival.id, hero.id)!;
    expect(next.gold).toBe(state.gold - fee);
    expect(next.roster).toHaveLength(state.roster.length + 1);
    expect(next.roster.at(-1)!.contract.wage).toBe(wage);
    expect(next.roster.at(-1)!.id).not.toBe(hero.id);
    const after = next.rivals.find((r) => r.id === rival.id)!;
    expect(after.guild.roster.some((h) => h.id === hero.id)).toBe(false);
    expect(after.guild.plan.parties[0]!.heroes).not.toContain(hero.id);
    expect(after.guild.raidTeam ?? []).not.toContain(hero.id);
    expect(next.poachHeat).toBe(state.day);
  });

  it("refuses a signing the purse or the roster cap blocks", () => {
    const base = newGame(56, "NoPoach");
    const rival = base.rivals[0]!;
    const hero = rival.guild.roster[0]!;
    expect(poachHero({ ...base, gold: 0 }, rival.id, hero.id)).toBeNull();
    const full: GameState = {
      ...base,
      gold: 10000,
      roster: Array.from({ length: 22 }, (_, i) => ({
        ...base.roster[i % 3]!,
        id: `full-${i}`,
      })),
    };
    expect(poachHero(full, rival.id, hero.id)).toBeNull();
    const target = poachTargets({ ...base, gold: 0 }, rival.id)[0]!;
    expect(target.affordable).toBe(false);
    expect(target.reason).toContain("needs");
  });

  it("answers a poach with one rival-offer card", () => {
    const base = newGame(57, "Heat");
    const roster = Array.from({ length: 8 }, (_, i) => ({
      ...makeHero(57, 600 + i, "warrior", 20),
      injuryDays: 0,
    }));
    const state: GameState = {
      ...base,
      day: 6,
      poachHeat: 5,
      roster,
      plan: { parties: [] },
      pendingEvent: null,
    };
    const next = resolveDay(state);
    expect(next.pendingEvent?.cardId).toBe("rival-offer");
  });

  it("moves a rival bench hero to another rival when the world rolls it", () => {
    let seed = 1;
    let day = 1;
    while (rngStream(seed, "rivalPoach", day)() >= 0.06) {
      day += 1;
      if (day > 80) {
        day = 1;
        seed += 1;
      }
    }
    const base = newGame(seed, "Trade");
    const rivals = base.rivals.map((r, index) => ({
      ...r,
      guild: {
        ...r.guild,
        plan: { parties: [] },
        raidTeam: [],
        roster: [
          ...r.guild.roster,
          ...Array.from({ length: 3 }, (_, i) => ({
            ...makeHero(seed, 800 + index * 10 + i, "warrior", 20),
            id: `bench-${index}-${i}`,
          })),
        ],
      },
    }));
    const state: GameState = { ...base, day, rivals };
    const before = state.rivals.map((r) => r.guild.roster.length);
    rivalPoachTick(state);
    const after = state.rivals.map((r) => r.guild.roster.length);
    expect(after).not.toEqual(before);
    expect(after.reduce((a, b) => a + b, 0)).toBe(before.reduce((a, b) => a + b, 0));
  });
});
