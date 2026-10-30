import type { GameState, GearSlot } from "../types";

/** How a card finds its subject. */
export type EventTarget = "best" | "weakest" | "poorest" | "guild" | "highest-wage";

export type Effect =
  | { kind: "gold"; amount: number }
  | { kind: "morale"; target: EventTarget; amount: number }
  | { kind: "gear"; target: EventTarget; ilvl: number; slot: GearSlot }
  | { kind: "injury"; target: EventTarget; days: number }
  | { kind: "leave"; target: EventTarget }
  | { kind: "xp"; amount: number }
  | { kind: "renown"; amount: number }
  | { kind: "recruit"; levelFactor: number }
  | { kind: "fatigue"; target: EventTarget; amount: number }
  | { kind: "wage"; target: EventTarget; multiplier: number };

export type EventOption = {
  key: string;
  /** What the player is told will happen. Never lie here. */
  label: string;
  hint: string;
  effects: Effect[];
};

export type EventCard = {
  id: string;
  title: string;
  /** `{hero}` is replaced with the target's name. */
  text: string;
  weight: number;
  once?: boolean;
  target: EventTarget;
  /** Small predicate: is this card allowed right now? */
  when: (state: GameState) => boolean;
  options: EventOption[];
};

const anyHero = (s: GameState): boolean => s.roster.length > 0;
const richEnough = (s: GameState) => s.gold >= 150;

/**
 * The drama layer. Every card is a decision with a cost on both sides, and
 * every effect is resolved through the systems that already exist.
 */
export const EVENT_CARDS: readonly EventCard[] = [
  {
    id: "rival-offer",
    title: "A rival comes calling",
    text: "An agent for a rival guild offers {hero} double wages. He is listening.",
    weight: 3,
    target: "best",
    when: anyHero,
    options: [
      {
        key: "match",
        label: "Match the offer",
        hint: "Pay a signing bonus and raise his wage permanently.",
        effects: [{ kind: "gold", amount: -400 }, { kind: "wage", target: "best", multiplier: 1.6 }],
      },
      {
        key: "refuse",
        label: "Refuse to be held to ransom",
        hint: "−18 morale now. He might remember it later.",
        effects: [{ kind: "morale", target: "best", amount: -18 }],
      },
      {
        key: "let-go",
        label: "Let him go",
        hint: "Lose the hero. The guild survives; the roster gets thinner.",
        effects: [{ kind: "leave", target: "best" }],
      },
    ],
  },
  {
    id: "cursed-blade",
    title: "The cursed blade",
    text: "A pedlar sells a blade that sings. Cheap, sharp, and it whispers. {hero} wants it.",
    weight: 2,
    target: "weakest",
    when: anyHero,
    options: [
      {
        key: "buy",
        label: "Buy it (250g)",
        hint: "Big item level now. The whispers cost morale.",
        effects: [
          { kind: "gold", amount: -250 },
          { kind: "gear", target: "weakest", ilvl: 55, slot: "weapon" },
          { kind: "morale", target: "weakest", amount: -12 },
        ],
      },
      {
        key: "pass",
        label: "Walk away",
        hint: "Nothing changes.",
        effects: [],
      },
    ],
  },
  {
    id: "bandit-raid",
    title: "Bandits hit the farm",
    text: "Raiders took the supply cart. They want payment to leave the wood.",
    weight: 3,
    target: "guild",
    when: (s) => s.gold > 100,
    options: [
      {
        key: "pay",
        label: "Pay them off",
        hint: "Lose gold, keep the party working.",
        effects: [{ kind: "gold", amount: -180 }],
      },
      {
        key: "fight",
        label: "Send the party",
        hint: "Free, but someone gets hurt.",
        effects: [{ kind: "injury", target: "weakest", days: 3 }],
      },
    ],
  },
  {
    id: "apprentice",
    title: "An apprentice asks to join",
    text: "A young adventurer has walked three days to find your guild. No fee, just a bunk.",
    weight: 2,
    once: true,
    target: "guild",
    when: (s) => s.roster.length < 20,
    options: [
      {
        key: "take",
        label: "Take them in",
        hint: "A free recruit at roughly a third of your level.",
        effects: [{ kind: "recruit", levelFactor: 0.35 }],
      },
      {
        key: "send-away",
        label: "Send them home",
        hint: "Kindness is a cost. The guild stays lean.",
        effects: [{ kind: "morale", target: "guild", amount: 1 }],
      },
    ],
  },
  {
    id: "homesick",
    title: "Homesick",
    text: "{hero} has family in the south and cannot stop thinking about them.",
    weight: 2,
    target: "weakest",
    when: anyHero,
    options: [
      {
        key: "leave",
        label: "Give him a week",
        hint: "Out of the rotation for three days. Morale recovers.",
        effects: [
          { kind: "injury", target: "weakest", days: 3 },
          { kind: "morale", target: "weakest", amount: 12 },
        ],
      },
      {
        key: "stay",
        label: "The raid needs him",
        hint: "Keep him working. Morale falls.",
        effects: [
          { kind: "fatigue", target: "weakest", amount: 15 },
          { kind: "morale", target: "weakest", amount: -10 },
        ],
      },
    ],
  },
  {
    id: "sponsor",
    title: "A patron with coin",
    text: "A merchant house will sponsor the guild — for a price in prestige.",
    weight: 2,
    once: true,
    target: "guild",
    when: richEnough,
    options: [
      {
        key: "accept",
        label: "Take the coin (900g)",
        hint: "Gold now, and the guild owes them a result.",
        effects: [{ kind: "gold", amount: 900 }, { kind: "renown", amount: -1 }],
      },
      {
        key: "decline",
        label: "Stay independent",
        hint: "No coin. Your reputation stays yours.",
        effects: [{ kind: "renown", amount: 1 }],
      },
    ],
  },
  {
    id: "taunt",
    title: "Public provocation",
    text: "A rival guildmaster calls your people 'farmhands with swords'.",
    weight: 2,
    target: "guild",
    when: () => true,
    options: [
      {
        key: "answer",
        label: "Answer in the square",
        hint: "Renown up if the guild is confident; morale up either way.",
        effects: [{ kind: "renown", amount: 1 }, { kind: "morale", target: "guild", amount: 6 }],
      },
      {
        key: "ignore",
        label: "Say nothing",
        hint: "Silence is free. Someone will read it as fear.",
        effects: [{ kind: "morale", target: "guild", amount: -3 }],
      },
    ],
  },
  {
    id: "poacher",
    title: "Poachers in the wood",
    text: "Someone is hunting your farm routes. {hero} can end it quietly.",
    weight: 2,
    target: "best",
    when: anyHero,
    options: [
      {
        key: "hunt",
        label: "Send him to deal with it",
        hint: "Gear upgrades, but he loses days.",
        effects: [
          { kind: "gear", target: "best", ilvl: 30, slot: "chest" },
          { kind: "injury", target: "best", days: 2 },
        ],
      },
      {
        key: "ignore",
        label: "Ignore it",
        hint: "Lose a little gold per day's work.",
        effects: [{ kind: "gold", amount: -120 }],
      },
    ],
  },
  {
    id: "old-wound",
    title: "An old wound",
    text: "{hero} is favouring a leg he broke two winters ago.",
    weight: 2,
    target: "highest-wage",
    when: anyHero,
    options: [
      {
        key: "rest",
        label: "Rest him properly",
        hint: "Two days out, health restored.",
        effects: [{ kind: "injury", target: "highest-wage", days: 2 }],
      },
      {
        key: "push",
        label: "He can fight through it",
        hint: "Fatigue and a nagging injury.",
        effects: [
          { kind: "fatigue", target: "highest-wage", amount: 20 },
          { kind: "morale", target: "highest-wage", amount: -6 },
        ],
      },
    ],
  },
  {
    id: "merchant",
    title: "A merchant at the gate",
    text: "A caravan is selling armour at a price that is almost an insult. It is also the only armour for a hundred miles.",
    weight: 2,
    target: "weakest",
    when: (s) => s.gold >= 300,
    options: [
      {
        key: "buy",
        label: "Buy the plate (300g)",
        hint: "A large chest upgrade for your weakest hero.",
        effects: [
          { kind: "gold", amount: -300 },
          { kind: "gear", target: "weakest", ilvl: 40, slot: "chest" },
        ],
      },
      {
        key: "pass",
        label: "Not today",
        hint: "Save the coin.",
        effects: [],
      },
    ],
  },
];

export const cardById = (id: string): EventCard | undefined =>
  EVENT_CARDS.find((c) => c.id === id);
