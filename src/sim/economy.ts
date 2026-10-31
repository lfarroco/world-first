import { sum } from "./prelude";
import type { Hero } from "./types";
import { wageForLevel } from "./content/heroes";
import { CONTRACT } from "./content/tuning";

export const wageBill = (heroes: readonly Hero[]): number =>
  sum(heroes.map((h) => h.contract.wage));

/**
 * What a renewal would cost. Renegotiation re-prices to the hero's current
 * level plus the contract premium, and never cuts a wage that is already
 * higher (a rival-match raise stays a raise). One function so the queue, the
 * resolution and the AI cannot disagree about the number on screen.
 */
export const renewalWage = (hero: Hero): number =>
  Math.max(hero.contract.wage, Math.round(wageForLevel(hero.level) * CONTRACT.renewPremium));

// The wage budget depends on renown *and* the Great Hall, so it lives in
// `facilities.ts` as `wageBudgetFor`. Do not add a renown-only copy here:
// it will disagree with the attention queue and the status line.
