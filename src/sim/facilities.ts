import type { GameState } from "./types";
import { HEALTH_RECOVERY_PER_DAY, ROSTER_CAP, ECONOMY } from "./content/tuning";

export type FacilityId = "infirmary" | "forge" | "tavern" | "hall";

export type Facilities = Record<FacilityId, number>;

export type FacilityDef = {
  id: FacilityId;
  name: string;
  blurb: string;
  /** One line per level: what you get. */
  levels: [string, string, string];
  /** Cost to reach level 1, 2, 3. */
  costs: [number, number, number];
};

export const FACILITIES: readonly FacilityDef[] = [
  {
    id: "infirmary",
    name: "Infirmary",
    blurb: "Injuries heal faster and people come back sooner.",
    levels: ["−15% injury duration", "−30% injury duration", "−45% injury duration, +4 health/day"],
    costs: [900, 2400, 4200],
  },
  {
    id: "forge",
    name: "Forge",
    blurb: "Better steel. Loot drops at a higher item level.",
    levels: ["+4 item level on loot", "+8 item level on loot", "+12 item level on loot"],
    costs: [1000, 2600, 4500],
  },
  {
    id: "tavern",
    name: "Tavern",
    blurb: "A famous guild attracts better recruits.",
    levels: ["+6% recruit level", "+12% recruit level", "+18% recruit level"],
    costs: [800, 2200, 4000],
  },
  {
    id: "hall",
    name: "Great Hall",
    blurb: "More room, more payroll. Raises roster cap and wage budget.",
    levels: ["+2 roster, +150g/week budget", "+4 roster, +300g/week", "+6 roster, +450g/week"],
    costs: [1100, 2800, 4800],
  },
];

export const emptyFacilities = (): Facilities => ({
  infirmary: 0,
  forge: 0,
  tavern: 0,
  hall: 0,
});

export const facilityById = (id: string): FacilityDef | undefined =>
  FACILITIES.find((f) => f.id === id);

export const nextCost = (facilities: Facilities, id: FacilityId): number | null => {
  const def = facilityById(id);
  if (!def) return null;
  const level = facilities[id];
  if (level >= def.levels.length) return null;
  return def.costs[level] ?? null;
};

export const buyFacility = (state: GameState, id: FacilityId): GameState | null => {
  const cost = nextCost(state.facilities, id);
  if (cost === null || state.gold < cost) return null;
  return {
    ...state,
    gold: state.gold - cost,
    facilities: { ...state.facilities, [id]: state.facilities[id] + 1 },
  };
};

// ── effects ─────────────────────────────────────────────────────────────────

export const injuryDaysFor = (base: number, facilities: Facilities): number => {
  const reduction = 0.15 * facilities.infirmary;
  return Math.max(1, Math.round(base * (1 - reduction)));
};

export const healthRecoveryFor = (facilities: Facilities): number =>
  HEALTH_RECOVERY_PER_DAY + (facilities.infirmary >= 3 ? 4 : 0);

export const lootBonusFor = (facilities: Facilities): number => 4 * facilities.forge;

export const recruitLevelFactor = (facilities: Facilities): number => 0.62 + 0.06 * facilities.tavern;

export const rosterCapFor = (facilities: Facilities): number => ROSTER_CAP + 2 * facilities.hall;

export const wageBudgetFor = (renown: number, facilities: Facilities): number =>
  ECONOMY.wageBudgetBase + renown * ECONOMY.wageBudgetPerRenown + 150 * facilities.hall;

export const facilitySummary = (facilities: Facilities): string =>
  FACILITIES.map((f) => `${f.name} ${facilities[f.id]}`).join(" · ");
