import { sum } from "./prelude";
import type { Hero } from "./types";
import { ECONOMY } from "./content/tuning";

export const wageBill = (heroes: readonly Hero[]): number =>
  sum(heroes.map((h) => h.contract.wage));

export const wageBudget = (renown: number): number =>
  ECONOMY.wageBudgetBase + renown * ECONOMY.wageBudgetPerRenown;

export const overBudgetBy = (heroes: readonly Hero[], renown: number): number =>
  Math.max(0, wageBill(heroes) - wageBudget(renown));

export const projectedWeekly = (
  heroes: readonly Hero[],
  renown: number,
  dailyIncome: number,
): number => dailyIncome * 7 - wageBill(heroes);
