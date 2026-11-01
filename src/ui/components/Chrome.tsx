import {
  RUN_DAYS,
  blockingAttention,
  partySizeProblems,
  playerRaidsCleared,
  RAIDS,
  contentById,
} from "../../sim";
import { useGameStore } from "../../store/gameStore";
import { guildSummary, nextDoorInfo, wageInfo } from "../../store/selectors";

const fmt = (value: number): string => Math.round(value).toLocaleString("en-US");

export const TopBar = () => {
  const game = useGameStore((s) => s.game);
  const advance = useGameStore((s) => s.advance);
  const openModal = useGameStore((s) => s.openModal);
  if (!game) return null;

  const wage = wageInfo(game);
  const summary = guildSummary(game);
  const blocked = blockingAttention(game);
  const size = partySizeProblems(game);
  const raids = playerRaidsCleared(game);
  const lastCleared = game.progress
    .filter((p) => contentById(p.contentId)?.kind === "raid" && p.clears > 0)
    .at(-1);
  const nextRaid = game.progress.find(
    (p) => contentById(p.contentId)?.kind === "raid" && p.clears === 0,
  );
  const raidLabel = lastCleared
    ? `${contentById(lastCleared.contentId)?.name.split("—").pop()?.trim() ?? "raid"} down`
    : nextRaid
      ? `${contentById(nextRaid.contentId)?.name.split("—").pop()?.trim() ?? "next raid"} next`
      : "no raid left";
  // The brand names the next door, not the next raid: a raid locked behind a
  // dungeon is not the step the guild can take (L108).
  const door = nextDoorInfo(game);
  const stepLabel = door ? `${door.shortName} next` : raidLabel;

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand" title={`${game.guildName} · seed ${game.seed}`}>
          <div className="crest">W</div>
          <div>
            <div className="brand-name">{game.guildName}</div>
            <div className="brand-sub">
              Renown {game.renown} · {stepLabel}
            </div>
          </div>
        </div>

        <div className="vitals">
          <div className="vital">
            <span className="vital-label">Gold</span>
            <span className={`vital-value ${game.gold < 0 ? "bad" : ""}`}>{fmt(game.gold)}g</span>
          </div>
          <div className="vital">
            <span className="vital-label">Day</span>
            <span className="vital-value">
              {Math.min(game.day, RUN_DAYS)}<span className="dim"> / {RUN_DAYS}</span>
            </span>
          </div>
          <div className="vital" title={`Wage bill ${wage.bill}g against a ${wage.budget}g budget`}>
            <span className="vital-label">Wages</span>
            <span className={`vital-value ${wage.over ? "bad" : ""}`}>
              {wage.bill}<span className="dim"> / {wage.budget}</span>
            </span>
          </div>
          <div className="vital" title="Live score from the same formula as the run end">
            <span className="vital-label">Score</span>
            <span className="vital-value">
              {fmt(summary.latestScore)}
              <span className="dim"> · {summary.rank}/{game.rivals.length + 1}</span>
            </span>
          </div>
          <div className="vital col-optional" title="Raids cleared this run">
            <span className="vital-label">Raids</span>
            <span className="vital-value">
              {raids}<span className="dim"> / {RAIDS.length}</span>
            </span>
          </div>
        </div>

        <div className="advance">
          <div className="advance-copy">
            <div className={`advance-note ${blocked.length > 0 || size.length > 0 ? "advance-blocked" : ""}`}>
              {game.finished
                ? "run complete"
                : blocked.length > 0
                  ? `${blocked.length} item${blocked.length === 1 ? "" : "s"} ${blocked.length === 1 ? "needs" : "need"} you`
                  : size.length > 0
                    ? `${size.length} part${size.length === 1 ? "y" : "ies"} outside the hero range`
                    : "ready"}
            </div>
            <div className="tiny dim">
              <span className="kbd">Space</span> to advance
            </div>
          </div>
          <button
            className="btn btn-primary btn-lg"
            onClick={advance}
            disabled={game.finished}
            title={
              game.finished
                ? "The run is over"
                : size.length > 0
                  ? "Blocked while a party is outside its hero range"
                  : "Resolve the day with the current plan"
            }
          >
            {game.finished ? "Run complete" : "Advance day ▸"}
          </button>
          <button
            className="icon-btn"
            onClick={() => openModal({ kind: "help" })}
            title="Shortcuts and numbers"
            aria-label="Shortcuts and numbers"
          >
            ?
          </button>
        </div>
      </div>
    </header>
  );
};

const TABS = [
  { id: "hall", label: "Guild Hall", short: "Hall", key: "1" },
  { id: "roster", label: "Roster", short: "Roster", key: "2" },
  { id: "war", label: "War Room", short: "War", key: "3" },
  { id: "raid", label: "Raid", short: "Raid", key: "4" },
  { id: "report", label: "Report", short: "Report", key: "5" },
] as const;

export const Nav = () => {
  const game = useGameStore((s) => s.game);
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const openModal = useGameStore((s) => s.openModal);
  const report = useGameStore((s) => s.report);
  const seenReportDay = useGameStore((s) => s.seenReportDay);
  if (!game) return null;

  const blocked = blockingAttention(game).length;
  const size = partySizeProblems(game).length;
  const expiring = game.roster.filter((h) => h.contract.daysLeft <= 7).length;
  const injured = game.roster.filter((h) => h.injuryDays > 0).length;
  const planWarnings = game.plan.parties.length === 0;

  const badge = (id: string): number => {
    if (game.finished) return 0;
    if (id === "hall") return blocked;
    if (id === "roster") return expiring + injured;
    if (id === "war") return planWarnings || size > 0 ? 1 : 0;
    return 0;
  };

  /**
   * A count is not a notification until it says what it counts. The tab title
   * used to print the shortcut in the same parentheses as the badge number, so
   * `Guild Hall (1)` looked like it explained the 1 and did not.
   */
  const badgeHint = (id: string, count: number): string => {
    if (id === "hall") {
      return `${count} item${count === 1 ? "" : "s"} need${count === 1 ? "s" : ""} you before Advance`;
    }
    if (id === "roster") {
      const parts = [
        expiring > 0 ? `${expiring} contract${expiring === 1 ? "" : "s"} expiring` : "",
        injured > 0 ? `${injured} injur${injured === 1 ? "y" : "ies"}` : "",
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : `${count} roster alert${count === 1 ? "" : "s"}`;
    }
    if (id === "war") {
      return size > 0 ? "a party is outside its hero range" : "no party planned for tonight";
    }
    return "";
  };

  return (
    <nav className="nav" aria-label="Screens">
      <div className="nav-inner">
        {TABS.map((tab) => {
          const count = badge(tab.id);
          const unread = tab.id === "report" && report !== null && report.day !== seenReportDay;
          const hints = [
            count > 0 ? badgeHint(tab.id, count) : "",
            unread ? "a new day report is waiting" : "",
          ].filter(Boolean);
          // The open tab's content is already on screen; its count is noise.
          const showCount = count > 0 && screen !== tab.id;
          const title = `${tab.label}${hints.length > 0 ? ` — ${hints.join("; ")}` : ""} (press ${tab.key})`;
          return (
            <button
              key={tab.id}
              className="tab"
              data-active={screen === tab.id}
              onClick={() => setScreen(tab.id)}
              title={title}
              aria-label={`${tab.label}${hints.length > 0 ? `, ${hints.join(", ")}` : ""}`}
            >
              <span className="tab-label">{tab.label}</span>
              <span className="tab-label-short">{tab.short}</span>
              {showCount ? (
                <span className="tab-badge" title={badgeHint(tab.id, count)} aria-hidden="true">
                  {count > 9 ? "9+" : count}
                </span>
              ) : null}
              {unread ? (
                <span className="tab-badge soft" title="A day report is waiting" aria-hidden="true">
                  •
                </span>
              ) : null}
            </button>
          );
        })}
        <div className="grow" />
        <button
          className="tab tab-optional"
          onClick={() => openModal({ kind: "new-run" })}
          title="Start a new seed"
        >
          New run
        </button>
      </div>
    </nav>
  );
};
