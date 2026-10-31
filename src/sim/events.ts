import type {
  AttentionItem,
  AttentionKind,
  EventKind,
  GameEvent,
  GameState,
  Hero,
  SquadStatus,
} from "./types";
import { assignedIds, availableContent } from "./plan";
import { counterDemand, counterHint, counterOffer, renewalWage, transferFee, wageBill } from "./economy";
import { wageBudgetFor } from "./facilities";
import { cardById, optionAffordable } from "./content/events";
import { lootUpgrade, suggestLootTarget } from "./loot-target";
import { CONTENT, KIND_LABEL } from "./content/content";
import { CONTRACT, NEGOTIATION, PROMISE } from "./content/tuning";

/** Deterministic id: no global counters, or replays diverge. */
const hashText = (text: string): number => {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h;
};

export const event = (
  day: number,
  kind: EventKind,
  severity: GameEvent["severity"],
  text: string,
  heroId?: string,
): GameEvent => {
  const base = `e${day}-${hashText(text).toString(36)}`;
  return heroId === undefined
    ? { id: base, day, kind, severity, text }
    : { id: base, day, kind, severity, text, heroId };
};

export const push = (state: GameState, e: GameEvent): void => {
  state.events.push({ ...e, id: `${e.id}-${state.events.length}` });
};

const partyLabel = (min: number, max: number): string =>
  min === max ? `${min} ${min === 1 ? "hero" : "heroes"}` : `${min}-${max} heroes`;

/**
 * The content list hides what the guild cannot field, so this is the only
 * place the player hears that a new area opened. One event per area, ever:
 * a roster that shrinks and grows again must not re-announce the same place.
 * A save written before `knownContent` existed starts silent — those areas
 * are already visible in `content`, and a burst on load is noise.
 */
export const announceUnlocks = (state: GameState, day: number): void => {
  const open = availableContent(state);
  const known = new Set(state.knownContent ?? open.map((c) => c.id));

  for (const content of open) {
    if (known.has(content.id)) continue;
    known.add(content.id);
    push(
      state,
      event(
        day,
        "unlock",
        "good",
        `New area open: ${content.name} — ${KIND_LABEL[content.kind]}, average level ${content.minLevel}, ${partyLabel(content.minHeroes, content.maxHeroes)}.`,
      ),
    );
  }

  state.knownContent = CONTENT.filter((c) => known.has(c.id)).map((c) => c.id);
};

const itemId = (kind: string, heroId: string | undefined, day: number): string =>
  `${kind}:${heroId ?? "guild"}:${day}`;

/** Stable identity of an item across days. Mutes are keyed by this, not the id. */
export const attentionKey = (kind: AttentionKind, heroId: string | undefined): string =>
  `${kind}:${heroId ?? "guild"}`;

/**
 * Attention items are derived, never authored. At most three block the day;
 * everything else is an FYI line.
 */
export const deriveAttention = (state: GameState): AttentionItem[] => {
  // A finished run has no tomorrow to plan for. Without this guard the CLI
  // re-derives contract and bench items for day 85 and shows "NEEDS YOU".
  if (state.finished) return [];

  const items: AttentionItem[] = [];
  const today = state.day;

  for (const hero of state.roster) {
    if (hero.daysBenched >= 3 && hero.morale <= 58) {
      // Rotating needs somewhere to rotate him into. Without a plan the
      // option used to report success and change nothing, which is a trap.
      const canRotate = state.plan.parties.length > 0;
      items.push({
        id: itemId("benched-unhappy", hero.id, today),
        kind: "benched-unhappy",
        day: today,
        blocking: true,
        heroId: hero.id,
        title: `${hero.name} wants words`,
        detail: `Benched ${hero.daysBenched} days, morale ${Math.round(hero.morale)}. He expects to be in the A-team.`,
        options: [
          {
            key: "promise",
            label: `Promise him a spot (${PROMISE.startsRequired} starts in ${PROMISE.windowDays} days)`,
            effect: { kind: "promise", heroId: hero.id, status: "a-team" },
          },
          ...(canRotate
            ? [{ key: "rotate", label: "Rotate him into the raid tomorrow", effect: { kind: "rotate" as const, heroId: hero.id } }]
            : []),
          { key: "ignore", label: "Ignore it for now", effect: { kind: "ignore" } },
        ],
      });
    }
  }

  for (const hero of state.roster) {
    if (hero.contract.counterRefused) {
      // He turned the counter down and named a final number. The market rate
      // is off the table: meet the raise or lose him. This is the second half
      // of the negotiation, not a re-roll.
      const demand = counterDemand(hero);
      items.push({
        id: itemId("contract-counter", hero.id, today),
        kind: "contract-counter",
        day: today,
        blocking: true,
        heroId: hero.id,
        title: `${hero.name}'s final number`,
        detail: `He turned down ${counterOffer(hero)}g/week. He wants ${demand}g/week for ${CONTRACT.daysMax} days.`,
        options: [
          {
            key: "meet",
            label: `Meet it (${hero.contract.wage}g → ${demand}g/week)`,
            effect: { kind: "meet-counter", heroId: hero.id },
          },
          { key: "release", label: "Let him walk", effect: { kind: "release", heroId: hero.id } },
        ],
      });
      continue;
    }
    if (hero.contract.daysLeft <= NEGOTIATION.windowDays) {
      // Renewal re-prices to the hero's current level. Show the number: a
      // level-60 wage can be ten times the level-1 one, and the player is
      // choosing between that and losing the hero.
      const market = renewalWage(hero);
      const offer = counterOffer(hero);
      const hint = counterHint(hero) ? "he looks ready to talk" : "he may refuse";
      items.push({
        id: itemId("contract-expiring", hero.id, today),
        kind: "contract-expiring",
        day: today,
        blocking: true,
        heroId: hero.id,
        title: `${hero.name}'s contract`,
        detail: `${hero.contract.daysLeft} days left at ${hero.contract.wage}g/week. Market rate at level ${hero.level}: ${market}g.`,
        options: [
          {
            key: "renew",
            label: `Renew at market (${hero.contract.wage}g → ${market}g/week, ${CONTRACT.daysMax} days)`,
            effect: { kind: "renew", heroId: hero.id },
          },
          // A counter is a real cut, and a refusal is final. Hide it only when
          // no cut is possible, so it is never a trap option.
          ...(hero.morale > NEGOTIATION.moraleFloor
            ? [
                {
                  key: "counter",
                  label: `Counter ${offer}g/week (${Math.round((1 - offer / market) * 100)}% under) — ${hint}`,
                  effect: { kind: "counter" as const, heroId: hero.id },
                },
              ]
            : []),
          { key: "release", label: "Let him walk", effect: { kind: "release", heroId: hero.id } },
        ],
      });
    }
  }

  const bill = wageBill(state.roster);
  const budget = wageBudgetFor(state.renown, state.facilities);
  if (bill > budget) {
    items.push({
      id: itemId("wage-over-budget", undefined, today),
      kind: "wage-over-budget",
      day: today,
      blocking: false,
      title: "The coffers are thin",
      detail: `Wage bill ${bill}g vs budget ${budget}g.`,
      options: [{ key: "ack", label: "Noted", effect: { kind: "acknowledge" } }],
    });
  }

  // One line for the whole rotation, not one card per body. The roster's
  // fatigue column already carries the number; the queue only needs to say
  // that the night is being fought on empty.
  const assigned = assignedIds(state.plan);
  const exhausted = state.roster.filter((h) => h.fatigue >= 70 && assigned.has(h.id));
  if (exhausted.length > 0) {
    items.push({
      id: itemId("fatigue-risk", undefined, today),
      kind: "fatigue-risk",
      day: today,
      blocking: false,
      title:
        exhausted.length === 1
          ? `${exhausted[0]!.name} is running on empty`
          : `${exhausted.length} heroes are running on empty`,
      detail: exhausted
        .slice()
        .sort((a, b) => b.fatigue - a.fatigue)
        .map((h) => `${h.name} ${Math.round(h.fatigue)}%`)
        .join(" · "),
      options: [{ key: "ack", label: "Noted", effect: { kind: "acknowledge" } }],
    });
  }

  // A promise closes tomorrow: that is the last night that can keep it.
  for (const promise of state.promises ?? []) {
    if (promise.status !== "open") continue;
    const hero = state.roster.find((h) => h.id === promise.heroId);
    if (!hero) continue;
    if (promise.dueOn - today > 1) continue;
    items.push({
      id: itemId("promise-due", hero.id, today),
      kind: "promise-due",
      day: today,
      blocking: false,
      heroId: hero.id,
      title: `${hero.name} expects his spot`,
      detail: `${promise.daysAssigned}/${PROMISE.startsRequired} starts, promise due ${promise.dueOn === today ? "tonight" : "tomorrow"}.`,
      options: [{ key: "ack", label: "Noted", effect: { kind: "acknowledge" } }],
    });
  }

  // A broken promise costs more than a morale hit: he asks to leave. The
  // request is derived from the ledger until it is answered, so it cannot be
  // missed by a missed digest line. Rare enough to sit ahead of the ordinary
  // blockers, and blocking because the answer changes the roster.
  for (const promise of state.promises ?? []) {
    if (promise.status !== "broken" || promise.transferAsked) continue;
    const hero = state.roster.find((h) => h.id === promise.heroId);
    if (!hero) continue;
    const fee = transferFee(hero);
    items.unshift({
      id: `transfer-request:${hero.id}`,
      kind: "transfer-request",
      day: today,
      blocking: true,
      heroId: hero.id,
      title: `${hero.name} asks for a transfer`,
      detail: `You promised him starts and he did not get them. A rival will take him for ${fee}g.`,
      options: [
        {
          key: "transfer",
          label: `Grant it (${fee}g)`,
          effect: { kind: "transfer", heroId: hero.id, accept: true },
        },
        {
          key: "refuse",
          label: "Refuse — he stays, unhappy",
          effect: { kind: "transfer", heroId: hero.id, accept: false },
        },
      ],
    });
  }

  // One non-blocking pointer while drops wait. A raid clear can drop five
  // items; a per-item gate would turn a decision into a chore. The `loot`
  // screen is where the choice lives; this line only says it is there.
  const loot = state.pendingLoot ?? [];
  if (loot.length > 0) {
    const first = loot[0]!;
    const target = state.roster.find((h) => h.id === suggestLootTarget(state, first));
    const label = first.item ?? `${first.slot} ${first.ilvl}`;
    items.push({
      id: "loot-pending:guild",
      kind: "loot-pending",
      day: today,
      blocking: false,
      title: `${loot.length} drop${loot.length === 1 ? "" : "s"} waiting`,
      detail: `${first.contentName}: ${label}${target ? ` — ${target.name} +${lootUpgrade(target, first)}` : ""}. Assign before you advance.`,
      options: [{ key: "assign", label: "Assign the drops", effect: { kind: "assign-loot" } }],
    });
  }

  const pending = state.pendingEvent;
  if (pending) {
    const card = cardById(pending.cardId);
    if (card) {
      const target = pending.targetHeroId
        ? state.roster.find((h) => h.id === pending.targetHeroId)
        : undefined;
      items.unshift({
        id: `event:${card.id}:${pending.day}`,
        kind: "event",
        day: today,
        blocking: true,
        ...(target ? { heroId: target.id } : {}),
        title: card.title,
        detail: card.text.replace("{hero}", target?.name ?? "one of your heroes"),
        options: card.options
          .filter((o) => optionAffordable(state, o))
          .map((o) => ({
            key: o.key,
            label: `${o.label} — ${o.hint}`,
            effect: { kind: "event" as const, cardId: card.id, optionKey: o.key },
          })),
      });
    }
  }

  // Acknowledged or ignored items are deferred, not deleted: the same item
  // comes back tomorrow if nothing changed. The queue must always have an
  // answer that moves it forward, even when the answer is "not today".
  const mutes = state.attentionMutedUntil ?? {};
  const live = items.filter((i) => (mutes[attentionKey(i.kind, i.heroId)] ?? -1) < today);

  const blocking = live.filter((i) => i.blocking).slice(0, 3);
  const fyi = live.filter((i) => !i.blocking);
  return [...blocking, ...fyi];
};

export const blockingAttention = (state: GameState): AttentionItem[] =>
  state.attention.filter((i) => i.blocking);

export const describeHeroStatus = (hero: Hero): string => {
  if (hero.injuryDays > 0) return `injured ${hero.injuryDays}d`;
  if (hero.health < 70) return "banged up";
  if (hero.fatigue >= 70) return "exhausted";
  if (hero.morale < 35) return "unhappy";
  return "ready";
};

export const statusLabel = (status: SquadStatus): string => {
  switch (status) {
    case "a-team":
      return "A-team";
    case "rotation":
      return "Rotation";
    case "bench":
      return "Bench";
  }
};

export const RAID_SIZE = 10;

/**
 * The real gate. A stale cached `attention` array must never let the day slip
 * through, so a pending event blocks even if it has not been re-derived yet.
 */
export const hasBlocking = (state: GameState): boolean =>
  state.pendingEvent !== null || state.attention.some((i) => i.blocking);
