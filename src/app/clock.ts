/**
 * The only place the shell reads a clock. `src/sim` stays pure; a save needs a
 * human-readable creation time, and a title screen needs a seed when the player
 * asks for a random run.
 */
export const nowIso = (): string => new Date().toISOString();

export const randomSeed = (): number => {
  const seed = Math.floor(Math.random() * 1_000_000);
  return seed === 0 ? 1 : seed;
};
