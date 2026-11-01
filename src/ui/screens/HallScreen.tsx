import {
  FACILITIES,
  PROMISE,
  RUN_DAYS,
  contentById,
  digestForDay,
  lootUpgrade,
  nextCost,
  partySizeProblems,
  sizeProblemLine,
  rosterCapFor,
  suggestLootTarget,
  type AttentionItem,
} from "../../sim";
import { useGameStore } from "../../store/gameStore";
import {
  contractInfo,
  guildSummary,
  weekCells,
  wageInfo,
} from "../../store/selectors";
import { EventLine } from "../components/EventLine";
import { Chip } from "../components/Primitives";

const fmt = (value: number): string => Math.round(value).toLocaleString("en-US");

const AttentionActions = ({ item }: { item: AttentionItem }) => {
  const resolveAttention = useGameStore((s) => s.resolveAttention);
  return (
    <div className="attention-actions">
      {item.options.map((option) => (
        <button
          key={option.key}
          className={`btn btn-sm ${option.key === "ignore" ? "btn-ghost" : ""}`}
          onClick={() => resolveAttention(item.id, option.key)}
          title={`${option.key}: ${option.label}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

const NeedsYou = () => {
  const game = useGameStore((s) => s.game);
  const openModal = useGameStore((s) => s.openModal);
  if (!game) return null;
  const blocking = game.attention.filter((i) => i.blocking);
  const fyi = game.attention.filter((i) => !i.blocking);

  return (
    <section className="panel">
      <div className="panel-head">
        <div className="row">
          <span className="eyebrow">Needs you</span>
          <span className={`chip ${blocking.length > 0 ? "warn" : "good"}`}>{blocking.length}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => openModal({ kind: "attention" })}>
          Open queue
        </button>
      </div>
      <div className="card-list">
        {blocking.length === 0 ? (
          <div className="empty">
            {game.finished
              ? "The run is over. There is no next day."
              : "Nothing needs you. Review the plan, then advance the day."}
          </div>
        ) : (
          blocking.map((item) => (
            <div className="card-row" key={item.id}>
              <div className="attention-card" style={{ flex: 1 }}>
                <div className="spread">
                  <span className="attention-title">{item.title}</span>
                  <span className="tiny dim">blocking</span>
                </div>
                <div className="attention-detail">{item.detail}</div>
                <AttentionActions item={item} />
              </div>
            </div>
          ))
        )}
        {fyi.length > 0 ? (
          <div className="card-row" style={{ flexDirection: "column", gap: 6 }}>
            <span className="eyebrow">FYI · never blocks</span>
            {fyi.map((item) => (
              <div className="row" key={item.id} style={{ alignItems: "flex-start", gap: 8 }}>
                <span className="chip">{item.kind === "loot-pending" ? "loot" : "note"}</span>
                <span className="small muted grow">{item.title} — {item.detail}</span>
                <div className="row" style={{ gap: 4 }}>
                  {item.options.map((option) => (
                    <button
                      key={option.key}
                      className="btn btn-ghost btn-sm"
                      onClick={() => useGameStore.getState().resolveAttention(item.id, option.key)}
                    >
                      {option.key === "ack" ? "Noted" : option.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};

const Yesterday = () => {
  const game = useGameStore((s) => s.game);
  const report = useGameStore((s) => s.report);
  const setScreen = useGameStore((s) => s.setScreen);
  if (!game) return null;

  const day = Math.min(RUN_DAYS, Math.max(1, game.day - 1));
  const events = report?.day === day ? report.events : digestForDay(game, day);
  const encounter =
    report?.day === day
      ? report.encounter
      : game.lastEncounter?.day === day
        ? game.lastEncounter
        : null;
  const shown = events.slice(-7);

  return (
    <section className="panel">
      <div className="panel-head">
        <div className="row">
          <span className="eyebrow">Yesterday · day {day}</span>
          {game.finished ? <Chip tone="gold">run complete</Chip> : null}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setScreen("report")}>
          Full report
        </button>
      </div>
      <div className="panel-body" style={{ paddingBottom: 4 }}>
        {encounter ? (
          <div className="row-wrap" style={{ marginBottom: 8 }}>
            <Chip tone={encounter.cleared ? "good" : "bad"}>
              {encounter.cleared ? "cleared" : "wipe"} · {encounter.contentName}
            </Chip>
            <span className="small muted">
              {encounter.pulls.length} pull{encounter.pulls.length === 1 ? "" : "s"} · best{" "}
              {Math.round(encounter.bestPull * 100)}%
            </span>
          </div>
        ) : null}
        {shown.length === 0 ? (
          <div className="empty" style={{ padding: "12px 0" }}>
            Nothing was logged. A quiet farm or a rest day is a real day.
          </div>
        ) : (
          shown.map((event) => <EventLine key={event.id} event={event} />)
        )}
      </div>
    </section>
  );
};

const Standings = () => {
  const game = useGameStore((s) => s.game);
  const setScreen = useGameStore((s) => s.setScreen);
  if (!game) return null;
  const summary = guildSummary(game);
  const activities = new Map(game.rivals.map((r) => [r.name, r.activity]));

  return (
    <section className="panel">
      <div className="panel-head">
        <span className="eyebrow">The race</span>
        <div className="row" style={{ gap: 8 }}>
          <span className="tiny dim">same planner, same day</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setScreen("raid")}>
            Raid hub ▸
          </button>
        </div>
      </div>
      {summary.standings.map((row, index) => (
        <div className="standings-row" key={row.name} data-player={row.isPlayer}>
          <span className="standings-rank">{index + 1}</span>
          <span className="row" style={{ gap: 6, minWidth: 0 }}>
            <span style={{ fontWeight: row.isPlayer ? 700 : 500 }}>{row.name}</span>
            {row.isPlayer ? <Chip tone="gold">you</Chip> : null}
          </span>
          <span className="mono" style={{ textAlign: "right" }}>
            {fmt(row.score)}
          </span>
          <span className="mono dim" style={{ textAlign: "right" }}>
            {row.raids}/3
          </span>
          <span className="standings-activity small dim" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {row.isPlayer
              ? game.worldFirstDay !== null
                ? `World First · day ${game.worldFirstDay}`
                : "you"
              : (activities.get(row.name) ?? "—")}
          </span>
        </div>
      ))}
    </section>
  );
};

const WeekPanel = () => {
  const game = useGameStore((s) => s.game);
  if (!game) return null;
  const cells = weekCells(game);
  const summary = guildSummary(game);
  const nextReset = Math.ceil(game.day / 7) * 7;

  return (
    <section className="panel">
      <div className="panel-head">
        <span className="eyebrow">The week</span>
        <span className="tiny dim">wages + market refresh every 7th day</span>
      </div>
      <div className="panel-body">
        <div className="spread" style={{ marginBottom: 9 }}>
          <div>
            <span className="eyebrow">Score so far</span>
            <div className="row" style={{ gap: 8, alignItems: "baseline" }}>
              <span className="mono" style={{ fontFamily: "var(--font-display)", fontSize: 24 }}>
                {fmt(summary.latestScore)}
              </span>
              <span className="small muted">
                rank {summary.rank} of {game.rivals.length + 1}
              </span>
            </div>
          </div>
          <div className="small dim" style={{ textAlign: "right" }}>
            next reset <span className="mono">day {nextReset}</span>
          </div>
        </div>
        <div className="week-strip">
          {cells.map((cell) => (
            <div
              key={cell.day}
              className="week-cell"
              data-today={cell.today}
              title={`Day ${cell.day}: ${cell.detail}`}
            >
              <div className="week-day">{cell.weekday}</div>
              <div className={`week-mark ${cell.tone}`}>{cell.glyph}</div>
              <div className="week-reset">{cell.reset ? "RESET" : ""}</div>
            </div>
          ))}
        </div>
        <div className="tiny dim" style={{ marginTop: 6 }}>
          A filled mark means the log recorded something; a blank day was quiet, not broken.
        </div>
      </div>
    </section>
  );
};

const Contracts = () => {
  const game = useGameStore((s) => s.game);
  if (!game) return null;
  const info = contractInfo(game);
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="eyebrow">Contract board</span>
        <span className="tiny dim">others pay {info.tokenPct}% after the first clear</span>
      </div>
      <div className="panel-body">
        {info.contracts.length === 0 ? (
          <div className="small dim">No open mission is fieldable today. Farms and first clears are always full pay.</div>
        ) : (
          <div className="stack" style={{ gap: 5 }}>
            {info.contracts.map((contract) => (
              <div className="spread" key={contract.id}>
                <span className="small">{contract.name}</span>
                <Chip tone="gold">{contract.contractColumn ?? "mission"} · full</Chip>
              </div>
            ))}
          </div>
        )}
        <div className="tiny dim" style={{ marginTop: 8 }}>
          First clears are never taxed. A posted contract cannot fund a raid by itself.
        </div>
      </div>
    </section>
  );
};

const Promises = () => {
  const game = useGameStore((s) => s.game);
  if (!game) return null;
  const open = (game.promises ?? []).filter((p) => p.status === "open");
  if (open.length === 0) return null;
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="eyebrow">Promises</span>
        <span className="tiny dim">starts due by the date</span>
      </div>
      <div className="panel-body stack" style={{ gap: 6 }}>
        {open.map((promise) => {
          const hero = game.roster.find((h) => h.id === promise.heroId);
          if (!hero) return null;
          const late = promise.daysAssigned < PROMISE.startsRequired && promise.dueOn - game.day <= 1;
          return (
            <div className="spread small" key={promise.id}>
              <span style={late ? { color: "var(--color-warn)" } : undefined}>{hero.name}</span>
              <span className="mono dim">
                {promise.daysAssigned}/{PROMISE.startsRequired} starts · due day {promise.dueOn}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const LootPanel = () => {
  const game = useGameStore((s) => s.game);
  const openModal = useGameStore((s) => s.openModal);
  if (!game) return null;
  const loot = game.pendingLoot ?? [];
  if (loot.length === 0) return null;
  const first = loot[0]!;
  const target = game.roster.find((h) => h.id === suggestLootTarget(game, first));
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="eyebrow">Loot waiting</span>
        <Chip tone="warn">{loot.length}</Chip>
      </div>
      <div className="panel-body">
        <div className="spread">
          <div>
            <div className="small">
              {first.item ?? `${first.slot} ${first.ilvl}`} from {first.contentName}
            </div>
            <div className="tiny dim">
              {target ? `${target.name} gains +${lootUpgrade(target, first)}` : "no positive gain"}
            </div>
          </div>
          <button className="btn btn-sm" onClick={() => openModal({ kind: "loot" })}>
            Assign
          </button>
        </div>
        <div className="tiny dim" style={{ marginTop: 6 }}>
          Non-blocking. The next advance takes the default.
        </div>
      </div>
    </section>
  );
};

const Facilities = () => {
  const game = useGameStore((s) => s.game);
  const dispatch = useGameStore((s) => s.dispatch);
  if (!game) return null;
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="eyebrow">Guild hall</span>
        <span className="tiny dim">gold sink, real effects</span>
      </div>
      <div className="card-list">
        {FACILITIES.map((facility) => {
          const level = game.facilities[facility.id];
          const cost = nextCost(game.facilities, facility.id);
          const effect = level > 0 ? facility.levels[level - 1] : facility.levels[0] ? `next: ${facility.levels[0]}` : "";
          return (
            <div className="card-row" key={facility.id} style={{ alignItems: "center" }}>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row" style={{ gap: 6 }}>
                  <span className="small">{facility.name}</span>
                  <span className="tiny dim">lvl {level}/3</span>
                </div>
                <div className="tiny dim" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {effect}
                </div>
              </div>
              <button
                className="btn btn-sm"
                disabled={cost === null || game.gold < cost || game.finished}
                onClick={() => dispatch({ type: "buy-facility", id: facility.id })}
                title={cost === null ? "Maxed" : `${facility.blurb} · ${cost}g`}
              >
                {cost === null ? "max" : `${fmt(cost)}g`}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const RunPanel = () => {
  const game = useGameStore((s) => s.game);
  const openModal = useGameStore((s) => s.openModal);
  const setScreen = useGameStore((s) => s.setScreen);
  if (!game) return null;
  const wage = wageInfo(game);
  const recruit = (game.tavern ?? []).length;

  return (
    <section className="panel">
      <div className="panel-head">
        <span className="eyebrow">Guild</span>
        <span className="tiny dim">
          roster {game.roster.length}/{rosterCapFor(game.facilities)}
        </span>
      </div>
      <div className="panel-body stack" style={{ gap: 7 }}>
        <div className="spread small">
          <span className="muted">Wage bill</span>
          <span className={`mono ${wage.over ? "bad" : ""}`}>
            {wage.bill}g / {wage.budget}g
          </span>
        </div>
        <div className="spread small">
          <span className="muted">Tavern</span>
          <span className="row" style={{ gap: 6 }}>
            <span className="mono dim">{recruit} candidate{recruit === 1 ? "" : "s"}</span>
            <button className="btn btn-sm" onClick={() => openModal({ kind: "tavern" })}>
              Visit
            </button>
          </span>
        </div>
        <hr className="sep" />
        <div className="spread small">
          <span className="dim">Seed {game.seed}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => openModal({ kind: "new-run" })}>
            New run
          </button>
        </div>
        <button className="btn btn-block" onClick={() => setScreen(game.finished ? "report" : "war")}>
          {game.finished ? "See the run report" : "Plan tonight ▸"}
        </button>
      </div>
    </section>
  );
};

export const HallScreen = () => {
  const game = useGameStore((s) => s.game);
  if (!game) return null;
  const partyLine = game.plan.parties
    .map((p) => {
      const name = contentById(p.contentId)?.name.split("—").pop()?.trim() ?? p.contentId;
      return `${name} (${p.heroes.length})`;
    })
    .join(" · ");
  const size = partySizeProblems(game);

  return (
    <div className="stack" style={{ gap: 14 }}>
      <header className="spread">
        <div>
          <h1 className="screen-title">
            {game.finished ? "The run is over" : `Day ${game.day} of ${RUN_DAYS}`}
          </h1>
          <p className="screen-sub">
            {game.finished
              ? "The verdict and the moments that made it are on the report."
              : game.plan.parties.length > 0
                ? size.length > 0
                  ? `Tonight: ${partyLine}. ${sizeProblemLine(size[0]!)}`
                  : `Tonight: ${partyLine}. ${game.attention.some((i) => i.blocking) ? "Answer what needs you first." : "The queue is clear — advance when ready."}`
                : "No party is set. The day will resolve as a rest day unless you plan one."}
          </p>
        </div>
        <div className="row-wrap">
          {game.worldFirstDay !== null ? <Chip tone="gold">World First · day {game.worldFirstDay}</Chip> : null}
          {game.arrearsDays > 0 ? <Chip tone="bad">{game.arrearsDays} days in arrears</Chip> : null}
        </div>
      </header>

      <div className="hall-grid">
        <div className="hall-col">
          <NeedsYou />
          <Yesterday />
          <Standings />
        </div>
        <div className="hall-col">
          <WeekPanel />
          <RunPanel />
          <Contracts />
          <LootPanel />
          <Promises />
          <Facilities />
        </div>
      </div>
    </div>
  );
};
