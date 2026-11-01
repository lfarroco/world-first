import {
  RUN_DAYS,
  blockingAttention,
  playerRaidsCleared,
  RAIDS,
  contentById,
} from "../../sim";
import { useGameStore } from "../../store/gameStore";
import { guildSummary, wageInfo } from "../../store/selectors";

const fmt = (value: number): string => Math.round(value).toLocaleString("en-US");

export const TopBar = () => {
  const game = useGameStore((s) => s.game);
  const advance = useGameStore((s) => s.advance);
  const openModal = useGameStore((s) => s.openModal);
  if (!game) return null;

  const wage = wageInfo(game);
  const summary = guildSummary(game);
  const blocked = blockingAttention(game);
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

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand" title={`${game.guildName} · seed ${game.seed}`}>
          <div className="crest">W</div>
          <div>
            <div className="brand-name">{game.guildName}</div>
            <div className="brand-sub">
              Renown {game.renown} · {raidLabel}
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
            <div className={`advance-note ${blocked.length > 0 ? "advance-blocked" : ""}`}>
              {game.finished
                ? "run complete"
                : blocked.length > 0
                  ? `${blocked.length} item${blocked.length === 1 ? "" : "s"} ${blocked.length === 1 ? "needs" : "need"} you`
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
            title={game.finished ? "The run is over" : "Resolve the day with the current plan"}
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
  const expiring = game.roster.filter((h) => h.contract.daysLeft <= 7).length;
  const injured = game.roster.filter((h) => h.injuryDays > 0).length;
  const planWarnings = game.plan.parties.length === 0;

  const badge = (id: string): number => {
    if (game.finished) return 0;
    if (id === "hall") return blocked;
    if (id === "roster") return expiring + injured;
    if (id === "war") return planWarnings ? 1 : 0;
    return 0;
  };

  return (
    <nav className="nav" aria-label="Screens">
      <div className="nav-inner">
        {TABS.map((tab) => {
          const count = badge(tab.id);
          return (
            <button
              key={tab.id}
              className="tab"
              data-active={screen === tab.id}
              onClick={() => setScreen(tab.id)}
              title={`${tab.label} (${tab.key})`}
            >
              <span className="tab-label">{tab.label}</span>
              <span className="tab-label-short">{tab.short}</span>
              {count > 0 ? <span className="tab-badge">{count > 9 ? "9+" : count}</span> : null}
              {tab.id === "report" && report && report.day !== seenReportDay ? (
                <span className="tab-badge soft" title="A day report is waiting">
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
