import {
  advanceDay,
  assignLoot,
  assignParty,
  assignRole,
  autoAssignLoot,
  autoRaidTeam,
  buyFacility,
  buyGood,
  clearPlan,
  craftLoot,
  discardLoot,
  hireCandidate,
  newGame,
  poachHero,
  refreshAttention,
  releaseHero,
  resolveAttention,
  sellLoot,
  setParty,
  type Assignment,
  type FacilityId,
  type GameState,
  type MarketGoodId,
  type RoleId,
  type RivalId,
  type Stance,
} from "../sim";

/**
 * Every mutation the UI can perform. The store is a shell: `applyAction` is a
 * pure function from state to state, which is what makes the action log worth
 * saving and the screens testable without a browser.
 */
export type GameAction =
  | { type: "new-game"; seed: number; name: string }
  | { type: "advance" }
  | { type: "assign-party"; assignment: Assignment }
  | { type: "set-party"; index: number; assignment: Assignment | null }
  | { type: "clear-plan" }
  | { type: "set-stance"; index: number; stance: Stance }
  | { type: "set-role"; heroId: string; role: RoleId }
  | { type: "hire"; heroId: string }
  | { type: "release"; heroId: string }
  | { type: "buy-facility"; id: FacilityId }
  | { type: "buy-good"; goodId: MarketGoodId; heroId: string }
  | { type: "poach"; rivalId: RivalId; heroId: string }
  | { type: "resolve-attention"; itemId: string; optionKey: string }
  | { type: "assign-loot"; lootId: string; heroId: string }
  | { type: "auto-loot" }
  | { type: "sell-loot"; lootId: string }
  | { type: "craft-loot"; lootId: string; heroId: string }
  | { type: "discard-loot"; lootId: string }
  | { type: "set-raid-team"; heroIds: string[] }
  | { type: "auto-raid-team" };

export type LoggedAction = { day: number; action: GameAction };

const withAttention = (state: GameState): GameState => refreshAttention(state);

export const applyAction = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case "new-game":
      return newGame(action.seed, action.name);

    case "advance":
      return advanceDay(state);

    case "assign-party":
      return assignParty(state, action.assignment);

    case "set-party":
      return setParty(state, action.index, action.assignment);

    case "clear-plan":
      return clearPlan(state);

    case "set-stance": {
      const party = state.plan.parties[action.index];
      if (!party) return state;
      return setParty(state, action.index, { ...party, stance: action.stance });
    }

    case "set-role":
      return assignRole(state, action.heroId, action.role);

    case "hire": {
      const candidate = state.tavern.find((c) => c.hero.id === action.heroId);
      return candidate ? hireCandidate(state, candidate) : state;
    }

    case "release":
      return releaseHero(state, action.heroId);

    case "buy-facility":
      return buyFacility(state, action.id) ?? state;

    case "buy-good": {
      const next = buyGood(state, action.goodId, action.heroId);
      return next ? withAttention(next) : state;
    }

    case "poach": {
      const next = poachHero(state, action.rivalId, action.heroId);
      return next ? withAttention(next) : state;
    }

    case "resolve-attention": {
      const next = resolveAttention(state, action.itemId, action.optionKey);
      return next === state ? state : withAttention(next);
    }

    case "assign-loot": {
      const next = assignLoot(state, action.lootId, action.heroId);
      return next === state ? state : withAttention(next);
    }

    case "auto-loot": {
      const next = autoAssignLoot(state);
      return next === state ? state : withAttention(next);
    }

    case "sell-loot": {
      const next = sellLoot(state, action.lootId);
      return next === state ? state : withAttention(next);
    }

    case "craft-loot": {
      const next = craftLoot(state, action.lootId, action.heroId);
      return next ? withAttention(next) : state;
    }

    case "discard-loot": {
      const drop = (state.pendingLoot ?? []).find((l) => l.id === action.lootId);
      return drop ? withAttention(discardLoot(state, drop)) : state;
    }

    case "set-raid-team": {
      const ids = [...new Set(action.heroIds)].filter((id) =>
        state.roster.some((h) => h.id === id),
      );
      return { ...state, raidTeam: ids.slice(0, 10) };
    }

    case "auto-raid-team":
      return autoRaidTeam(state);
  }
};

/** Actions worth writing to the log. UI-only state never reaches this module. */
export const logAction = (state: GameState, action: GameAction): LoggedAction => ({
  day: state.day,
  action,
});
