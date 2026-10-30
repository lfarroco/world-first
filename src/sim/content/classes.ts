import type { AttrKey, CheckType, ClassId } from "../types";

/** How much each attribute contributes to each kind of check. */
export const CHECK_POWER_WEIGHTS: Record<CheckType, Partial<Record<AttrKey, number>>> = {
  dps: { focus: 0.45, agility: 0.3, might: 0.25 },
  mitigation: { might: 0.35, vitality: 0.35, discipline: 0.3 },
  mechanics: { awareness: 0.45, discipline: 0.3, composure: 0.25 },
  sustain: { focus: 0.4, composure: 0.3, endurance: 0.3 },
};

/** How much a class contributes to each check type. */
export const CLASS_CHECK_WEIGHT: Record<ClassId, Record<CheckType, number>> = {
  warrior: { dps: 0.35, mitigation: 1.0, mechanics: 0.9, sustain: 0.6 },
  cleric: { dps: 0.15, mitigation: 0.55, mechanics: 0.9, sustain: 1.0 },
  mage: { dps: 1.0, mitigation: 0.2, mechanics: 1.0, sustain: 0.3 },
  rogue: { dps: 1.0, mitigation: 0.3, mechanics: 1.0, sustain: 0.3 },
};

export const CHECK_LABEL: Record<CheckType, string> = {
  dps: "DPS",
  mitigation: "Mitigation",
  mechanics: "Mechanics",
  sustain: "Sustain",
};
