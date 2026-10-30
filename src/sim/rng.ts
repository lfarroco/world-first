/**
 * Seeded, replicable randomness with independent named streams.
 *
 * The whole game must be reconstructable from (seed, actionLog). That means:
 *  - no Math.random anywhere in sim/
 *  - every consumer asks for a named stream, so adding a roll in one system
 *    does not reshuffle another system's outcomes.
 */

export type Rng = () => number;

/** xmur3 string hash -> 32-bit seed generator. */
const xmur3 = (str: string): (() => number) => {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
};

/** mulberry32: small, fast, good enough for a management sim. */
const mulberry32 = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * A stream derived from (seed, name, extras...).
 * `extras` lets a caller scope a stream to a day or an entity without
 * creating a new generator per call.
 */
export const rngStream = (
  seed: number,
  name: string,
  ...extras: (string | number)[]
): Rng => {
  const key = [seed, name, ...extras].join("|");
  const seedFn = xmur3(key);
  return mulberry32(seedFn());
};

/** Convenience: a roll in [0,1) from a stream. */
export const roll = (rng: Rng): number => rng();

/** Integer in [min, max] inclusive. */
export const rollInt = (rng: Rng, min: number, max: number): number =>
  min + Math.floor(rng() * (max - min + 1));
