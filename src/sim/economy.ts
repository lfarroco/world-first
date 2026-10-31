import { clamp, sum } from "./prelude";
import type { Hero } from "./types";
import { feeForLevel, wageForLevel } from "./content/heroes";
import { CONTRACT, NEGOTIATION } from "./content/tuning";

export const wageBill = (heroes: readonly Hero[]): number =>
  sum(heroes.map((h) => h.contract.wage));

/**
 * What a renewal would cost. Renegotiation re-prices to the hero's current
 * level plus the contract premium, and never cuts a wage that is already
 * higher (a rival-match raise stays a raise). One function so the queue, the
 * resolution and the AI cannot disagree about the number on screen.
 *
 * The counter-offer below is the one way a wage goes down.
 */
export const renewalWage = (hero: Hero): number =>
  Math.max(hero.contract.wage, Math.round(wageForLevel(hero.level) * CONTRACT.renewPremium));

/** The wage the queue offers when the player counters. */
export const counterOffer = (hero: Hero): number =>
  Math.round(renewalWage(hero) * (1 - NEGOTIATION.counterDiscount));

/**
 * The visible part of the threshold: morale and days left, both on screen.
 * Hidden loyalty scales it below.
 */
const visibleSlack = (hero: Hero): number => {
  const morale = clamp(
    (hero.morale - NEGOTIATION.moraleFloor) / (100 - NEGOTIATION.moraleFloor),
    0,
    1,
  );
  const days =
    0.6 + 0.4 * clamp(hero.contract.daysLeft / NEGOTIATION.windowDays, 0, 1);
  return NEGOTIATION.maxDiscount * morale * days;
};

/**
 * The largest cut this hero will take. The visible part is morale and days
 * left; the hidden part is loyalty, which is why "he looks ready to talk" can
 * still be refused. No RNG: a threshold, so a replay is identical.
 */
const counterSlack = (hero: Hero): number => {
  const loyalty = 0.45 + hero.hidden.loyalty / 22;
  return visibleSlack(hero) * loyalty;
};

/** The lowest wage the hero would accept instead of walking. */
export const counterFloor = (hero: Hero): number =>
  Math.round(renewalWage(hero) * (1 - counterSlack(hero)));

/** Whether the hero takes the queue's counter-offer. */
export const acceptsCounter = (hero: Hero): boolean =>
  counterOffer(hero) >= counterFloor(hero);

/**
 * What the player can see before pressing the button: the visible part of the
 * same threshold, without hidden loyalty, and a margin so "ready to talk"
 * means a real chance rather than a rounding error. The AI uses this too, so
 * the bot's read is the player's read and not a peek at the sheet.
 */
export const counterHint = (hero: Hero): boolean =>
  visibleSlack(hero) > NEGOTIATION.counterDiscount * NEGOTIATION.hintMargin;

/** The raise a hero demands after a refused counter-offer. */
export const counterDemand = (hero: Hero): number =>
  Math.round(renewalWage(hero) * (1 + NEGOTIATION.counterPenalty));

/** What a rival pays for a hero who asked to leave. */
export const transferFee = (hero: Hero): number =>
  Math.round(feeForLevel(hero.level) * NEGOTIATION.transferFeeScale);

// The wage budget depends on renown *and* the Great Hall, so it lives in
// `facilities.ts` as `wageBudgetFor`. Do not add a renown-only copy here:
// it will disagree with the attention queue and the status line.
