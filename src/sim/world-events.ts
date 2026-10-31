import { clamp } from "./prelude";
import type { EventTarget, Effect } from "./content/events";
import { EVENT_CARDS, cardById, optionAffordable } from "./content/events";
import type { GameState, Hero, PendingEvent } from "./types";
import { EVENTS } from "./content/tuning";
import { bestLevel, makeHero } from "./content/heroes";
import { recruitLevelFactor } from "./facilities";
import { gainXp, heroPower } from "./hero";
import { rngStream } from "./rng";
import { event, push } from "./events";

/** Pick the subject of a card. Deterministic: the caller passes a seeded stream. */
const selectTarget = (state: GameState, target: EventTarget, rng: () => number): Hero | null => {
  if (state.roster.length === 0) return null;
  if (target === "guild") return null;
  const byBest = [...state.roster].sort((a, b) => heroPower(b) - heroPower(a));
  switch (target) {
    case "best":
      return byBest[0] ?? null;
    case "weakest":
      return byBest[byBest.length - 1] ?? null;
    case "highest-wage":
      return [...state.roster].sort((a, b) => b.contract.wage - a.contract.wage)[0] ?? null;
    case "poorest":
      return byBest[Math.floor(rng() * byBest.length)] ?? null;
    default:
      return byBest[0] ?? null;
  }
};

/** Should a card fire today? */
export const rollEvent = (state: GameState): PendingEvent | null => {
  if (state.pendingEvent) return null;
  if (state.day < EVENTS.minDay) return null;
  if (state.finished) return null;

  const rng = rngStream(state.seed, "event", state.day);
  if (rng() > EVENTS.chance) return null;

  const recent = new Set(state.eventLog.slice(-EVENTS.cooldown));
  const eligible = EVENT_CARDS.filter((card) => {
    if (recent.has(card.id)) return false;
    if (card.once && state.eventLog.includes(card.id)) return false;
    return card.when(state);
  });
  if (eligible.length === 0) return null;

  const total = eligible.reduce((acc, c) => acc + c.weight, 0);
  let roll = rng() * total;
  let chosen = eligible[eligible.length - 1]!;
  for (const card of eligible) {
    roll -= card.weight;
    if (roll <= 0) {
      chosen = card;
      break;
    }
  }

  return {
    cardId: chosen.id,
    day: state.day,
    targetHeroId: selectTarget(state, chosen.target, rng)?.id ?? null,
  };
};

const applyEffect = (state: GameState, effect: Effect, targetId: string | null): void => {
  const hero = targetId ? state.roster.find((h) => h.id === targetId) : undefined;
  switch (effect.kind) {
    case "gold":
      state.gold += effect.amount;
      return;
    case "renown":
      state.renown = Math.max(0, state.renown + effect.amount);
      return;
    case "xp": {
      const targets = hero ? [hero] : state.roster;
      for (const h of targets) {
        // Go through gainXp, not `xp +=`: a card can hand out enough XP to
        // cross a level boundary and must level the hero on the same day.
        const rng = rngStream(state.seed, "eventXp", state.day, h.id);
        const grown = gainXp(h, effect.amount, rng);
        h.level = grown.hero.level;
        h.xp = grown.hero.xp;
        h.attrs = grown.hero.attrs;
      }
      return;
    }
    case "morale": {
      const delta = effect.amount;
      if (effect.target === "guild" || !hero) {
        for (const h of state.roster) h.morale = clamp(h.morale + delta, 1, 100);
      } else {
        hero.morale = clamp(hero.morale + delta, 1, 100);
      }
      return;
    }
    case "fatigue":
      if (hero) hero.fatigue = clamp(hero.fatigue + effect.amount, 0, 100);
      return;
    case "gear":
      if (hero) {
        hero.gear[effect.slot] = Math.max(hero.gear[effect.slot], effect.ilvl);
      }
      return;
    case "injury":
      if (hero) {
        hero.injuryDays = Math.max(hero.injuryDays, effect.days);
        hero.health = clamp(hero.health - 30, 0, 100);
      }
      return;
    case "wage":
      if (hero) hero.contract.wage = Math.round(hero.contract.wage * effect.multiplier);
      return;
    case "leave":
      if (hero) {
        state.roster = state.roster.filter((h) => h.id !== hero.id);
        state.plan = {
          parties: state.plan.parties.map((p) => ({
            ...p,
            heroes: p.heroes.filter((id) => id !== hero.id),
          })),
        };
        push(state, event(state.day, "morale", "bad", `${hero.name} left the guild.`, hero.id));
      }
      return;
    case "recruit": {
      if (state.roster.length >= 20) return;
      const level = Math.max(1, Math.round(bestLevel(state.roster) * effect.levelFactor));
      const rng = rngStream(state.seed, "eventRecruit", state.day);
      const heroIndex = 5000 + state.roster.length + Math.floor(rng() * 1000);
      const klass = (["warrior", "cleric", "mage", "rogue"] as const)[Math.floor(rng() * 3.999)] ?? "warrior";
      const recruit = makeHero(state.seed, heroIndex, klass, level, state.roster.length + 7);
      state.roster.push({ ...recruit, id: `e${state.day}-${state.roster.length}` });
      push(state, event(state.day, "tavern", "good", `${recruit.name} joined the guild.`));
      return;
    }
  }
};

/** Resolve the pending card with one of its options. */
export const resolveEvent = (state: GameState, cardId: string, optionKey: string): GameState => {
  const card = cardById(cardId);
  if (!card) return state;
  const option = card.options.find((o) => o.key === optionKey);
  if (!option) return state;
  if (!optionAffordable(state, option)) return state;
  if (state.pendingEvent?.cardId !== cardId) return state;

  const next: GameState = structuredClone(state);
  const targetId = next.pendingEvent?.targetHeroId ?? null;

  for (const effect of option.effects) applyEffect(next, effect, targetId);

  const targetName = targetId ? next.roster.find((h) => h.id === targetId)?.name : undefined;
  push(
    next,
    event(
      next.day,
      "progress",
      "info",
      `${card.title} — you chose "${option.label}"${targetName ? ` (${targetName})` : ""}.`,
    ),
  );

  next.pendingEvent = null;
  next.eventLog = [...next.eventLog, card.id];
  return next;
};

/** Text shown to the player, with the target's name filled in. */
export const renderEventText = (state: GameState, cardId: string): { title: string; text: string } => {
  const card = cardById(cardId);
  if (!card) return { title: "Unknown event", text: "" };
  const target = state.pendingEvent?.targetHeroId
    ? state.roster.find((h) => h.id === state.pendingEvent?.targetHeroId)
    : undefined;
  return {
    title: card.title,
    text: card.text.replace("{hero}", target?.name ?? "one of your heroes"),
  };
};

export { recruitLevelFactor };
