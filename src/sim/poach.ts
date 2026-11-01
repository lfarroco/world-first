import { clamp } from "./prelude";
import type { GameState, Hero, Rival, RivalId } from "./types";
import { CONTRACT, POACH } from "./content/tuning";
import { feeForLevel, wageForLevel } from "./content/heroes";
import { rosterCapFor } from "./facilities";
import { event, push } from "./events";
import { rngStream } from "./rng";

/** What the guild pays a rival to release a hero. */
export const poachFee = (hero: Hero): number =>
  Math.round(feeForLevel(hero.level) * POACH.feeScale);

/** What the player must put on the hero's contract. */
export const poachWage = (hero: Hero): number =>
  Math.round(wageForLevel(hero.level) * POACH.wagePremium);

export type PoachTarget = {
  rival: Rival;
  hero: Hero;
  fee: number;
  wage: number;
  /** False when the purse or the roster cap blocks the signing. */
  affordable: boolean;
  reason: string;
};

/**
 * The heroes a guild can sign away, with the two numbers the screen prints.
 * Every rival hero is browsable; the fee is the tavern's price at his level
 * times the poach premium, so a veteran costs what a veteran costs.
 */
export const poachTargets = (state: GameState, rivalId: RivalId): PoachTarget[] => {
  const rival = state.rivals.find((r) => r.id === rivalId);
  if (!rival) return [];
  const cap = rosterCapFor(state.facilities);
  return rival.guild.roster.map((hero) => {
    const fee = poachFee(hero);
    const wage = poachWage(hero);
    const reason =
      state.gold < 0
        ? "in arrears"
        : state.roster.length >= cap
          ? `roster full (${state.roster.length}/${cap})`
          : state.gold < fee
            ? `needs ${fee}g`
            : "";
    return { rival, hero, fee, wage, affordable: reason === "", reason };
  });
};

/**
 * Sign one rival hero. The rival's plan and raid ten are cleaned in the same
 * transaction: a hero cannot be on two rosters. Returns null when the purse,
 * the cap or the id makes the signing illegal.
 */
export const poachHero = (state: GameState, rivalId: RivalId, heroId: string): GameState | null => {
  const rival = state.rivals.find((r) => r.id === rivalId);
  const hero = rival?.guild.roster.find((h) => h.id === heroId);
  if (!rival || !hero) return null;
  if (state.gold < 0 || state.roster.length >= rosterCapFor(state.facilities)) return null;
  const fee = poachFee(hero);
  if (state.gold < fee) return null;

  const wage = poachWage(hero);
  const joined: Hero = {
    ...hero,
    id: `p${state.day}-${rival.id}-${hero.id}`,
    // A poached hero starts at the same condition but on a fresh contract. He
    // is not a free transfer: the fee is in the purse and the wage is a raise.
    contract: {
      ...hero.contract,
      wage,
      daysLeft: CONTRACT.daysMax,
      status: "rotation",
      counterRefused: false,
    },
    morale: clamp(hero.morale + 4, 1, 100),
  };

  const rivals = state.rivals.map((r) => {
    if (r.id !== rivalId) return r;
    const guild = {
      ...r.guild,
      roster: r.guild.roster.filter((h) => h.id !== heroId),
      plan: {
        parties: r.guild.plan.parties.map((p) => ({
          ...p,
          heroes: p.heroes.filter((id) => id !== heroId),
        })),
      },
      raidTeam: (r.guild.raidTeam ?? []).filter((id) => id !== heroId),
    };
    return { ...r, guild, activity: `lost ${hero.name} to your bid` };
  });

  const next: GameState = {
    ...state,
    gold: state.gold - fee,
    roster: [...state.roster, joined],
    rivals,
    poachHeat: state.day,
    events: [...state.events],
  };
  push(
    next,
    event(
      state.day,
      "tavern",
      "good",
      `${joined.name} (lvl ${joined.level}) leaves ${rival.name} for ${fee}g and ${wage}g/week.`,
      joined.id,
    ),
  );
  return next;
};

/**
 * The world's own transfer market. Once a day a rival may sign a bench body
 * from another rival. This is the answer to "do offers happen to enemy guilds
 * too?": yes, and the guild screen shows the roster that moved. It is bounded
 * to bench bodies so it changes the race by a body, not by a raid ten.
 */
export const rivalPoachTick = (state: GameState): void => {
  if (state.rivals.length < 2) return;
  const rng = rngStream(state.seed, "rivalPoach", state.day);
  if (rng() > POACH.rivalPoachChance) return;

  const donors = state.rivals.filter((r) => !r.guild.finished && r.guild.roster.length > 4);
  const targets = state.rivals.filter(
    (r) => !r.guild.finished && r.guild.roster.length < rosterCapFor(r.guild.facilities),
  );
  if (donors.length === 0 || targets.length < 2) return;

  const donor = donors[Math.floor(rng() * donors.length)] ?? donors[0];
  if (!donor) return;
  const pool = donor.guild.roster.filter(
    (h) =>
      h.level >= POACH.minRivalLevel &&
      !donor.guild.plan.parties.some((p) => p.heroes.includes(h.id)) &&
      !(donor.guild.raidTeam ?? []).includes(h.id),
  );
  if (pool.length === 0) return;
  const hero = pool[Math.floor(rng() * pool.length)];
  if (!hero) return;

  const others = targets.filter((r) => r.id !== donor.id);
  const target = others[Math.floor(rng() * others.length)];
  if (!target) return;

  const moved: Hero = {
    ...hero,
    id: `x${state.day}-${target.id}-${hero.id}`,
    contract: { ...hero.contract, daysLeft: CONTRACT.daysMax },
  };
  donor.guild = {
    ...donor.guild,
    roster: donor.guild.roster.filter((h) => h.id !== hero.id),
  };
  target.guild = {
    ...target.guild,
    roster: [...target.guild.roster, moved],
  };
  target.activity = `signed ${hero.name} from ${donor.name}`;
  push(
    state,
    event(
      state.day - 1,
      "rival",
      "info",
      `${target.name} signed ${hero.name} (lvl ${hero.level}) from ${donor.name}.`,
    ),
  );
};
