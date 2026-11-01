import type { ContentDef, GameState } from "./types";
import { CONTRACT_BOARD, FEATURED } from "./content/tuning";
import { availableContent } from "./plan";
import { featuredContentFor } from "./featured";
import { rngStream } from "./rng";

/**
 * The daily contract board: two of the guild's open missions are posted at
 * full pay. Every other mission still exists, but a repeated clear pays the
 * token rate. The board is derived from the state, not stored, so a save does
 * not need a new field and a replay picks the same pair.
 *
 * The AI will not spend a night on a token repeat (see `ai/planner.ts`); a
 * human may, which is the point of a price rather than a lock.
 */
export type ContractBoard = {
  contracts: ContentDef[];
};

const pickContracts = (
  pool: readonly ContentDef[],
  rng: () => number,
  count: number,
): ContentDef[] => {
  const remaining = [...pool];
  const picked: ContentDef[] = [];
  for (let i = 0; i < count && remaining.length > 0; i += 1) {
    const index = Math.floor(rng() * remaining.length);
    const chosen = remaining[index];
    if (!chosen) break;
    picked.push(chosen);
    remaining.splice(index, 1);
  }
  return picked;
};

export const contractBoard = (
  state: GameState,
  openContent: readonly ContentDef[] = availableContent(state),
): ContractBoard => {
  // Only what the guild can field today. A board of jobs it cannot take is
  // noise, and it would hide the one contract the spare party can run.
  const open = openContent.filter((c) => c.kind === "mission" && c.contractColumn);
  return {
    contracts: pickContracts(
      open,
      rngStream(state.seed, "contracts", state.day),
      CONTRACT_BOARD.postedCount,
    ),
  };
};

export const boardFor = (state: GameState): ContractBoard => contractBoard(state);

export const postedContractIds = (
  state: GameState,
  openContent: readonly ContentDef[] = availableContent(state),
): Set<string> => new Set(contractBoard(state, openContent).contracts.map((c) => c.id));

export const isPosted = (
  state: GameState,
  content: ContentDef,
  posted: ReadonlySet<string> = postedContractIds(state),
): boolean => content.kind === "mission" && posted.has(content.id);

/**
 * What a clear pays today. First clears are always full; a repeated mission
 * that is not on the board pays the token rate of its gold and XP. Loot is
 * untouched: the board is a pay rule, not a drop rule.
 */
export const payScaleFor = (
  state: GameState,
  content: ContentDef,
  posted: ReadonlySet<string> = postedContractIds(state),
): number => {
  if (content.kind !== "mission" || isPosted(state, content, posted)) return 1;
  const cleared = (state.progress.find((p) => p.contentId === content.id)?.clears ?? 0) > 0;
  return cleared ? CONTRACT_BOARD.tokenPay : 1;
};

export const effectiveReward = (
  state: GameState,
  content: ContentDef,
  posted: ReadonlySet<string> = postedContractIds(state),
  /**
   * The star id, when the caller already computed it. The planner prices every
   * open area each day; letting each call recompute the star through
   * `availableContent` made a world run 2.2 s instead of 1.1 s. A caller with
   * one state should compute the id once.
   */
  featuredId: string | undefined = featuredContentFor(state)?.id,
): { gold: number; xp: number; payScale: number; featured: number } => {
  const payScale = payScaleFor(state, content, posted);
  const starred = content.id === featuredId;
  const featured = starred ? FEATURED.goldMult : 1;
  const featuredXp = starred ? FEATURED.xpMult : 1;
  return { gold: content.gold * payScale * featured, xp: content.xp * payScale * featuredXp, payScale, featured };
};

/** A short, stable board line for the CLI and the report. */
export const boardLine = (state: GameState): string => {
  const { contracts } = boardFor(state);
  if (contracts.length === 0) return "no contracts posted";
  return contracts
    .map((c) => `${c.name} (${c.contractColumn ?? "mission"})`)
    .join(" · ");
};
