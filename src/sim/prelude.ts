/**
 * The whole "FP library" for this project: ~60 lines, no dependencies.
 * See docs/adr/0001-functional-ts.md for why there is no fp-ts here.
 */

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** Compile-time exhaustiveness. If a union grows, every switch that forgot it fails to typecheck. */
export const assertNever = (value: never): never => {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
};

export const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

export const round = (value: number, decimals = 0): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export const sum = (values: number[]): number =>
  values.reduce((acc, n) => acc + n, 0);

/** Deterministic pick from a non-empty array, given a [0,1) roll. */
export const pick = <T>(items: T[], roll: number): T => {
  const index = Math.min(items.length - 1, Math.max(0, Math.floor(roll * items.length)));
  const value = items[index];
  if (value === undefined) throw new Error("pick() on empty array");
  return value;
};

export const pct = (value: number): string => `${Math.round(value * 100)}%`;

