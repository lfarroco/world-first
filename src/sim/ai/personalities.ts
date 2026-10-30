/** Personalities are data: the same planner runs the player's bot and the rivals. */
export type Personality = {
  id: string;
  name: string;
  /** 0..1 — rests earlier, prefers cautious stance, avoids risk. */
  caution: number;
  /** 0..1 — willing to attempt content it is not quite ready for. */
  ambition: number;
  /** 0..1 — hoards gold instead of hiring. */
  thrift: number;
  blurb: string;
};

export const PERSONALITIES: readonly Personality[] = [
  {
    id: "steady",
    name: "The Steward",
    caution: 0.55,
    ambition: 0.5,
    thrift: 0.5,
    blurb: "Balanced. Farms when tired, pushes when close.",
  },
  {
    id: "reckless",
    name: "The Gambler",
    caution: 0.3,
    ambition: 0.7,
    thrift: 0.25,
    blurb: "Pushes into content a tier early and spends every coin.",
  },
  {
    id: "careful",
    name: "The Quartermaster",
    caution: 0.68,
    ambition: 0.32,
    thrift: 0.6,
    blurb: "Over-gears, under-risks, and never misses a wage bill.",
  },
  {
    id: "echoes",
    name: "Echoes",
    caution: 0.25,
    ambition: 0.85,
    thrift: 0.15,
    blurb: "The meta chasers: raid every night, burn out late.",
  },
  {
    id: "methodical",
    name: "Methodical",
    caution: 0.7,
    ambition: 0.45,
    thrift: 0.6,
    blurb: "The grinders: two farm days for every raid day.",
  },
  {
    id: "ravensguard",
    name: "Ravensguard",
    caution: 0.5,
    ambition: 0.6,
    thrift: 0.4,
    blurb: "Opportunists: take the fight only when the odds are good.",
  },
];

export const personalityById = (id: string): Personality =>
  PERSONALITIES.find((p) => p.id === id) ?? PERSONALITIES[0]!;
