import {
  CHECK_LABEL,
  CLASS_IDS,
  CLASS_LABEL,
  CONTRACT_BOARD,
  ROLES,
  ROSTER_CAP,
  abilityById,
  availableContent,
  boardFor,
  boardLine,
  checkPowerInRole,
  contentAvailability,
  contentById,
  fieldableParty,
  fitFor,
  formMod,
  heroPower,
  isAvailable,
  isPosted,
  itemLevel,
  payScaleFor,
  playerRank,
  postedContractIds,
  projectAssignment,
  raidTeamHeroes,
  standings,
  traitById,
  wageBill,
  wageBudgetFor,
  type Assignment,
  type CheckType,
  type ContentAvailability,
  type ContentDef,
  type GameState,
  type Hero,
  type Projection,
  type RoleId,
  type ScoreLine,
  type SquadStatus,
} from "../sim";

export type WageInfo = {
  bill: number;
  budget: number;
  over: boolean;
  week: number;
  balance: number;
};

export const wageInfo = (state: GameState): WageInfo => {
  const bill = wageBill(state.roster);
  const budget = wageBudgetFor(state.renown, state.facilities);
  return {
    bill,
    budget,
    over: bill > budget,
    week: Math.ceil(state.day / 7),
    balance: state.gold - bill,
  };
};

export const guildSummary = (state: GameState) => {
  const raids = state.progress.filter(
    (p) => contentById(p.contentId)?.kind === "raid" && p.clears > 0,
  ).length;
  const dungeons = state.progress.filter(
    (p) => contentById(p.contentId)?.kind === "dungeon" && p.clears > 0,
  ).length;
  return {
    raids,
    dungeons,
    rank: playerRank(state),
    standings: standings(state),
    latestScore: state.score ?? standings(state).find((row) => row.isPlayer)?.score ?? 0,
  };
};

export type ContentChoice = {
  content: ContentDef;
  availability: ContentAvailability;
  clears: number;
  attempts: number;
  posted: boolean;
  payScale: number;
  /** Best legal party from the whole roster, and its steady-stance projection. */
  projection: Projection | null;
  party: Hero[] | null;
};

export const contentChoices = (state: GameState): ContentChoice[] => {
  const posted = postedContractIds(state);
  return availableContent(state).map((content) => {
    const progress = state.progress.find((p) => p.contentId === content.id);
    const party = fieldableParty(state, content);
    const projection =
      party && party.length > 0
        ? projectAssignment(state, {
            contentId: content.id,
            heroes: party.map((h) => h.id),
            stance: "steady",
          })
        : null;
    return {
      content,
      availability: contentAvailability(state, content),
      clears: progress?.clears ?? 0,
      attempts: progress?.attempts ?? 0,
      posted: isPosted(state, content, posted),
      payScale: payScaleFor(state, content, posted),
      projection,
      party,
    };
  });
};

export const contractInfo = (state: GameState) => {
  const posted = postedContractIds(state);
  return {
    line: boardLine(state),
    tokenPct: Math.round(CONTRACT_BOARD.tokenPay * 100),
    contracts: boardFor(state).contracts,
    posted,
  };
};

export const inspectInfo = (state: GameState, contentId: string) => {
  const content = contentById(contentId);
  if (!content) return null;
  const availability = contentAvailability(state, content);
  const progress = state.progress.find((p) => p.contentId === content.id);
  const party = fieldableParty(state, content);
  const projection =
    party && party.length > 0
      ? projectAssignment(state, {
          contentId: content.id,
          heroes: party.map((h) => h.id),
          stance: "steady",
        })
      : null;
  return {
    content,
    availability,
    clears: progress?.clears ?? 0,
    attempts: progress?.attempts ?? 0,
    bestPull: progress?.bestPull ?? 0,
    party,
    projection,
    payScale: payScaleFor(state, content),
    posted: isPosted(state, content),
    abilities: content.phases
      .map((p) => (p.ability ? abilityById(p.ability) : null))
      .filter((a): a is NonNullable<typeof a> => Boolean(a)),
  };
};

export const partyProjection = (state: GameState, index: number): Projection | null => {
  const party = state.plan.parties[index];
  return party ? projectAssignment(state, party) : null;
};

/** Rows for the War Room's spatial party board. */
export type SlotRow = "front" | "mid" | "back";
export const ROW_LABEL: Record<SlotRow, string> = { front: "Front", mid: "Mid", back: "Back" };
const ROLE_ROW: Record<RoleId, SlotRow> = {
  bulwark: "front",
  vanguard: "front",
  oracle: "mid",
  trickster: "mid",
  assassin: "mid",
  evoker: "back",
  arcanist: "back",
  lightbringer: "back",
};

export const slotRowFor = (hero: Hero): SlotRow => ROLE_ROW[hero.role] ?? "mid";

export const assignedHeroIds = (state: GameState): Set<string> =>
  new Set(state.plan.parties.flatMap((p) => p.heroes));

/** Heroes the party picker may offer: available, and not in another party. */
export const freeHeroesFor = (state: GameState, partyIndex: number): Hero[] => {
  const assigned = assignedHeroIds(state);
  const current = new Set(state.plan.parties[partyIndex]?.heroes ?? []);
  return state.roster.filter(
    (h) => isAvailable(h) && (!assigned.has(h.id) || current.has(h.id)),
  );
};

export type PartyAdvice = {
  projection: Projection | null;
  weakest: Projection["phases"][number] | null;
  sizeProblem: string | null;
  /** Party average level; 0 for an empty party. The War Room gates on this. */
  averageLevel: number;
  payScale: number;
  warnings: string[];
};

export const partyAdvice = (state: GameState, index: number): PartyAdvice => {
  const party = state.plan.parties[index];
  if (!party) {
    return {
      projection: null,
      weakest: null,
      sizeProblem: null,
      averageLevel: 0,
      payScale: 1,
      warnings: [],
    };
  }
  const content = contentById(party.contentId);
  const heroes = party.heroes
    .map((id) => state.roster.find((h) => h.id === id))
    .filter((h): h is Hero => Boolean(h));
  const projection = projectAssignment(state, party);
  const weakest = projection
    ? [...projection.phases].sort((a, b) => a.ratio - b.ratio)[0] ?? null
    : null;
  const averageLevel =
    heroes.length === 0 ? 0 : heroes.reduce((total, hero) => total + hero.level, 0) / heroes.length;
  const warnings: string[] = [];
  if (content) {
    if (heroes.length < content.minHeroes) {
      warnings.push(`needs ${content.minHeroes} heroes — has ${heroes.length}`);
    }
    // The level gate is printed on every party card, so it is not repeated in
    // this list; the card needs the number whether the gate passes or not.
    const payScale = payScaleFor(state, content);
    if (payScale < 1) {
      warnings.push(
        `not posted — pays ${Math.round(payScale * 100)}% of gold and XP`,
      );
    }
  }
  return {
    projection,
    weakest,
    sizeProblem:
      content && heroes.length < content.minHeroes
        ? `${heroes.length}/${content.minHeroes} heroes`
        : null,
    averageLevel,
    payScale: content ? payScaleFor(state, content) : 1,
    warnings,
  };
};

export const roundLabel = (value: number): string => `${Math.round(value * 100)}%`;

export const meterTone = (value: number, kind: "fatigue" | "sharpness" | "morale" | "health"): string => {
  if (kind === "fatigue") return value >= 70 ? "bad" : value >= 45 ? "warn" : "good";
  if (kind === "sharpness") return value < 40 ? "bad" : value < 60 ? "warn" : "good";
  if (kind === "morale") return value < 40 ? "bad" : value < 60 ? "warn" : "good";
  return value < 50 ? "bad" : value < 75 ? "warn" : "good";
};

export const heroChecks = (hero: Hero, role: RoleId): { check: CheckType; label: string; value: number }[] =>
  (["dps", "mitigation", "mechanics", "sustain"] as CheckType[]).map((check) => ({
    check,
    label: CHECK_LABEL[check],
    value: Math.round(checkPowerInRole(hero, role, check)),
  }));

export const roleOptions = (hero: Hero) =>
  ROLES.map((role) => {
    const fit = fitFor(hero, role.id);
    return {
      ...role,
      fit: fit.fit,
      multiplier: fit.multiplier,
      power: Math.round(checkPowerInRole(hero, role.id, checkForRole(role.id))),
      checks: heroChecks(hero, role.id),
    };
  });

/** The check a role is built for, so the chip has one comparable number. */
const checkForRole = (roleId: RoleId): CheckType => {
  const affinity: Record<RoleId, CheckType> = {
    bulwark: "mitigation",
    vanguard: "dps",
    lightbringer: "sustain",
    oracle: "sustain",
    evoker: "dps",
    arcanist: "dps",
    assassin: "dps",
    trickster: "mechanics",
  };
  return affinity[roleId];
};

export const traitChips = (hero: Hero) => (hero.traits ?? []).map((id) => traitById(id));

export const heroHistory = (state: GameState, heroId: string, days = 10) => {
  const cells: { day: number; mark: string; tone: string; title: string }[] = [];
  for (let day = Math.max(1, state.day - days); day < state.day; day += 1) {
    const events = state.events.filter((e) => e.day === day && e.heroId === heroId);
    if (events.some((e) => e.severity === "bad")) {
      cells.push({ day, mark: "✗", tone: "bad", title: events.find((e) => e.severity === "bad")?.text ?? "" });
    } else if (events.some((e) => e.severity === "good")) {
      cells.push({ day, mark: "✓", tone: "good", title: events.find((e) => e.severity === "good")?.text ?? "" });
    } else if (events.length > 0) {
      cells.push({ day, mark: "·", tone: "muted", title: events.map((e) => e.text).join(" · ") });
    } else {
      cells.push({ day, mark: "—", tone: "dim", title: "no event logged" });
    }
  }
  return cells;
};

export const WEEKDAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type WeekCell = {
  day: number;
  weekday: string;
  glyph: string;
  tone: string;
  detail: string;
  reset: boolean;
  today: boolean;
  future: boolean;
};

/**
 * The current seven-day block. Activity is read from the event log; the log
 * only records what changed, so a quiet farm night is genuinely blank. The
 * day-7 marker is the wage-and-market reset.
 */
export const weekCells = (state: GameState): WeekCell[] => {
  const weekday = (day: number): string => WEEKDAY[(day - 1) % 7] ?? "";
  const start = state.day - ((state.day - 1) % 7);
  return Array.from({ length: 7 }, (_, i) => {
    const day = start + i;
    const future = day > state.day;
    const events = state.events.filter((e) => e.day === day);
    const bad = events.filter((e) => e.severity === "bad").length;
    const good = events.filter((e) => e.severity === "good").length;
    const tone = future
      ? "dim"
      : bad > 0 && good === 0
        ? "bad"
        : good > 0
          ? "good"
          : events.length > 0
            ? "warn"
            : "dim";
    const party = day === state.day ? state.plan.parties[0] : undefined;
    const todayPlan = party ? contentById(party.contentId)?.name.split("—").pop()?.trim() ?? party.contentId : "";
    return {
      day,
      weekday: weekday(day),
      glyph: future ? "·" : events.length > 0 ? (bad > 0 ? "▓" : "▒") : "░",
      tone,
      detail: future ? "ahead" : day === state.day ? todayPlan || "no plan" : `${events.length} event${events.length === 1 ? "" : "s"}`,
      reset: day % 7 === 0,
      today: day === state.day,
      future,
    };
  });
};

export type HeroView = "all" | "raid-ready" | "resting" | "unhappy" | "expiring" | "injured" | "team";

export const HERO_VIEWS: { id: HeroView; label: string }[] = [
  { id: "all", label: "All" },
  { id: "raid-ready", label: "Raid-ready" },
  { id: "team", label: "Raid ten" },
  { id: "resting", label: "Resting" },
  { id: "unhappy", label: "Unhappy" },
  { id: "expiring", label: "Expiring" },
  { id: "injured", label: "Injured" },
];

export const filterHeroes = (state: GameState, heroes: Hero[], view: HeroView): Hero[] => {
  const assigned = assignedHeroIds(state);
  const team = new Set(state.raidTeam ?? []);
  switch (view) {
    case "all":
      return heroes;
    case "raid-ready":
      return heroes.filter((h) => isAvailable(h) && h.fatigue < 70);
    case "team":
      return heroes.filter((h) => team.has(h.id));
    case "resting":
      return heroes.filter((h) => !assigned.has(h.id));
    case "unhappy":
      return heroes.filter((h) => h.morale < 50);
    case "expiring":
      return heroes.filter((h) => h.contract.daysLeft <= 7);
    case "injured":
      return heroes.filter((h) => !isAvailable(h) || h.health < 100);
  }
};

export const statusChips = (hero: Hero): { label: string; tone: string }[] => {
  const chips: { label: string; tone: string }[] = [];
  if (hero.injuryDays > 0) chips.push({ label: `OUT ${hero.injuryDays}d`, tone: "bad" });
  if (hero.fatigue >= 70) chips.push({ label: "Exhausted", tone: "warn" });
  else if (hero.fatigue >= 45) chips.push({ label: "Tired", tone: "warn" });
  if (hero.morale < 40) chips.push({ label: "Unhappy", tone: "bad" });
  if (hero.contract.daysLeft <= 7) chips.push({ label: `${hero.contract.daysLeft}d left`, tone: "warn" });
  if (hero.contract.counterRefused) chips.push({ label: "Counter refused", tone: "bad" });
  return chips;
};

export const squadStatusLabel = (status: SquadStatus): string => {
  if (status === "a-team") return "A-team";
  if (status === "rotation") return "Rotation";
  return "Bench";
};

export const valueLabel = (value: number): string =>
  value >= 0 ? `+${value.toLocaleString("en-US")}` : value.toLocaleString("en-US");

export const scoreTotal = (state: GameState): { total: number; lines: ScoreLine[]; band: string } | null => {
  if (state.score === null || state.scoreLines === null) return null;
  return { total: state.score, lines: state.scoreLines, band: state.band ?? "-" };
};

export const partyNames = (state: GameState): string[] =>
  state.plan.parties.map((p) => contentById(p.contentId)?.name ?? p.contentId);

export const teamLine = (state: GameState): Hero[] => raidTeamHeroes(state);

export type PartyAssignment = Assignment;
export { CLASS_IDS, CLASS_LABEL, itemLevel, heroPower, formMod, ROSTER_CAP };
