import {
  CHECK_BANDS,
  KIND_LABEL,
  MASTERY,
  OFF_NIGHT_FACTOR,
  RAIDS,
  RUN_DAYS,
  computeScore,
  contentById,
  focusPull,
  masteryReport,
  nextLevers,
  playerRank,
  pullTraits,
  type CheckType,
  type EncounterLog,
  type GameEvent,
  type GameState,
  type ScoreLine,
} from "../../sim";
import { randomSeed } from "../../app/clock";
import { useGameStore } from "../../store/gameStore";
import { guildSummary } from "../../store/selectors";
import { EventLine } from "../components/EventLine";
import { DropRow } from "../modals/LootModal";
import { Chip, Hint } from "../components/Primitives";
import { Art } from "../components/Art";

const fmt = (value: number): string => Math.round(value).toLocaleString("en-US");

/** `-0` is a real JS number and reads as "+-0" if you are not careful. */
const signed = (value: number): string => {
  const rounded = Math.abs(value) < 0.5 ? 0 : Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded.toLocaleString("en-US")}`;
};

const pct = (value: number): string => `${Math.round(value * 100)}%`;

/** What each check is built from. The weights are `CHECK_POWER_WEIGHTS`. */
const CHECK_HINT: Record<CheckType, string> = {
  dps: "DPS is built from Focus 45%, Agility 30% and Might 25%, adjusted for class, role, gear and condition.",
  mitigation:
    "Mitigation is built from Might 35%, Vitality 35% and Discipline 30%, adjusted for class, role, gear and condition.",
  mechanics:
    "Mechanics is built from Awareness 45%, Discipline 30% and Composure 25%, adjusted for class, role, gear and condition.",
  sustain:
    "Sustain is built from Focus 40%, Composure 30% and Endurance 30%, adjusted for class, role, gear and condition.",
};

const EncounterReport = ({
  game,
  encounter,
  position,
}: {
  game: GameState;
  encounter: EncounterLog;
  /** Party order for a day that fielded more than one. */
  position: { index: number; total: number };
}) => {
  const setScreen = useGameStore((s) => s.setScreen);
  const pull = focusPull(encounter);
  const levers = nextLevers(game, encounter);
  const mastery = masteryReport(game, encounter);
  const traits = pullTraits(encounter);

  return (
    <section className="panel">
      <Art
        base={`/art/places/${encounter.contentId}`}
        alt=""
        width="100%"
        height={96}
        className="encounter-banner"
      />
      <div className="panel-head">
        <div>
          <div className="eyebrow">
            {position.total > 1 ? `Party ${position.index} of ${position.total} · ` : ""}
            {KIND_LABEL[encounter.contentKind]} · day {encounter.day} · {encounter.stance} stance
          </div>
          <div className="section-title">{encounter.contentName}</div>
        </div>
        <div className="row-wrap">
          {encounter.payScale !== undefined && encounter.payScale < 1 ? (
            <Chip
              tone="warn"
              title={`This mission was not on today's board, so it paid ${Math.round(encounter.payScale * 100)}% of its gold and XP. A first clear always pays full.`}
            >
              token {Math.round(encounter.payScale * 100)}%
            </Chip>
          ) : null}
          {encounter.featuredBonus !== undefined && encounter.featuredBonus > 1 ? (
            <Chip tone="gold">★ star +{Math.round((encounter.featuredBonus - 1) * 100)}%</Chip>
          ) : null}
          <Chip
            tone={encounter.cleared ? "good" : "bad"}
            title={
              encounter.cleared
                ? "The party killed it tonight."
                : "No kill. The percentage is how far the party got across tonight's attempts. A phase that passed adds its full share; a phase that failed adds the fraction it reached."
            }
          >
            {encounter.cleared ? "cleared" : `wipe · best ${Math.round(encounter.bestPull * 100)}%`}
          </Chip>
        </div>
      </div>

      {pull ? (
        <div className="panel-body">
          <div className="spread" style={{ marginBottom: 6 }}>
            <Hint
              label={`One pull is one attempt at the area. Raids get 2–7 attempts a night; missions and dungeons get one. ${encounter.cleared ? "This is the attempt that killed it." : "This is the last attempt that failed."}`}
            >
              <span className="small muted">
                {encounter.cleared ? "Killing" : "Last"} pull {pull.index} of {encounter.pulls.length}
              </span>
            </Hint>
            <Hint
              align="right"
              label={`Mastery adds ${pct(MASTERY.perPull)} to every check for each pull already logged on this area, up to ${pct(MASTERY.cap)}. This pull used ${pct(mastery.mastery)}. The area has ${mastery.attempts} pull${mastery.attempts === 1 ? "" : "s"} logged in total.`}
            >
              <span className="tiny dim">
                mastery {pct(mastery.mastery)} · {mastery.attempts}{" "}
                {mastery.attempts === 1 ? "attempt" : "attempts"} logged
              </span>
            </Hint>
          </div>
          {pull.phases.map((phase) => (
            <div className="phase-result" data-outcome={phase.outcome} key={phase.name}>
              <div className="spread">
                <span style={{ fontWeight: 600 }}>{phase.name}</span>
                <Hint
                  align="right"
                  label={`Your party's ${phase.checkLabel} is ${phase.value}. The phase needs ${phase.requirement}, so the ratio is ${phase.ratio.toFixed(2)}. ${CHECK_BANDS.clean.toFixed(2)} or more is clean. ${CHECK_BANDS.pass.toFixed(2)} or more is a pass. ${CHECK_BANDS.scrape.toFixed(2)} or more is a scrape, and a scrape can injure a hero. Below ${CHECK_BANDS.scrape.toFixed(2)} the phase fails.`}
                >
                  <span
                    className={`small ${phase.outcome === "fail" ? "bad" : phase.outcome === "scrape" ? "warn" : "good"}`}
                  >
                    {phase.outcome === "fail" ? "FAIL" : phase.outcome}{" "}
                    <span className="mono dim">
                      {phase.value}/{phase.requirement} · {phase.ratio.toFixed(2)}
                    </span>
                  </span>
                </Hint>
              </div>
              <div className="tiny dim">
                <Hint label={CHECK_HINT[phase.check]}>{phase.checkLabel}</Hint>
                {phase.offNights.length > 0 ? (
                  <>
                    {" · "}
                    <Hint
                      label={`Each hero can have a bad pull. These did on this check, so they counted for ${pct(OFF_NIGHT_FACTOR)} of their normal value. A hero who appears here often is unreliable.`}
                    >
                      off nights: {phase.offNights.join(", ")}
                    </Hint>
                  </>
                ) : null}
                {phase.ability
                  ? ` · ${phase.ability.name}${phase.ability.countered ? ` countered by ${phase.ability.counterHero ?? "the party"}` : ` uncountered ×${phase.ability.mult.toFixed(2)}`}`
                  : ""}
              </div>
            </div>
          ))}
          {traits.length > 0 ? (
            <div className="tiny dim" style={{ marginTop: 6 }}>
              Traits in the pull: {traits.join(", ")}.
            </div>
          ) : null}
          {encounter.injured.length > 0 ? (
            <div className="small bad" style={{ marginTop: 6 }}>
              Injured: {encounter.injured.join(", ")}.
            </div>
          ) : null}
          {encounter.loot && encounter.loot.length > 0 ? (
            <div className="small dim" style={{ marginTop: 6 }}>
              Drops: {encounter.loot.map((l) => (l.item ? `${l.item} (${l.slot} ${l.ilvl})` : `${l.slot} ${l.ilvl}`)).join(", ")}.
            </div>
          ) : null}
        </div>
      ) : (
        <div className="empty">No pull was logged.</div>
      )}

      {levers.length > 0 ? (
        <div className="panel-body" style={{ borderTop: "1px solid var(--color-line-soft)" }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            What would close the gap
          </div>
          {levers.map((lever, index) => (
            // Two lines can carry the same label (the shortfall and a stance
            // bonus round to the same check), so the label is not a key.
            <div className="lever" key={`${lever.label}-${index}`}>
              <span className={`lever-value ${lever.gain > 0 ? "good" : "dim"}`}>{lever.label}</span>
              <span className="lever-detail">{lever.detail}</span>
            </div>
          ))}
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setScreen("war")}>
              Go to War Room
            </button>
            <span className="tiny dim">The failed check shows what to change. The party card shows the new projection.</span>
          </div>
        </div>
      ) : null}
    </section>
  );
};

const ScoreCard = ({ game, lines }: { game: GameState; lines: ScoreLine[] }) => {
  const max = Math.max(1, ...lines.map((line) => Math.abs(line.value)));
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="eyebrow">Score so far</span>
        <span className="tiny dim">same formula at the end</span>
      </div>
      <div className="panel-body">
        {lines.map((line) => (
          <div className="score-line" key={line.label}>
            <span className="small muted">{line.label}</span>
            <span className="mono small" style={{ textAlign: "right" }}>
              {signed(line.value)}
            </span>
            <div className="score-bar" title={line.detail}>
              <div style={{ width: `${Math.max(0, Math.min(100, (line.value / max) * 100))}%` }} />
            </div>
          </div>
        ))}
        <div className="spread" style={{ marginTop: 8 }}>
          <span className="eyebrow">Total</span>
          <span className="mono" style={{ fontSize: 18 }}>
            {fmt(game.score ?? guildSummary(game).latestScore)}
          </span>
        </div>
      </div>
    </section>
  );
};

const momentsFor = (game: GameState): { day: number; text: string }[] => {
  const cleared = game.progress
    .map((p) => ({ progress: p, content: contentById(p.contentId) }))
    .filter((entry) => entry.content && entry.progress.clearedOnDay !== null)
    .sort((a, b) => (a.progress.clearedOnDay ?? 0) - (b.progress.clearedOnDay ?? 0));
  const raids = cleared.filter((entry) => entry.content?.kind === "raid");
  const firstDungeon = cleared.find((entry) => entry.content?.kind === "dungeon");
  const firstRaid = raids[0];
  const lastRaid = raids.at(-1);
  const lastWipe = [...game.events].reverse().find((event: GameEvent) => event.kind === "wipe");

  // The arc, not the first three dated rows: the first way in, the first raid,
  // and the run's ending (World First if it happened, otherwise the last raid).
  const picks: { day: number; text: string }[] = [];
  const push = (day: number | null | undefined, text: string): void => {
    if (day === null || day === undefined) return;
    if (picks.some((pick) => pick.text === text)) return;
    picks.push({ day, text });
  };
  if (firstDungeon) {
    push(
      firstDungeon.progress.clearedOnDay,
      `First dungeon clear: ${firstDungeon.content?.name ?? "a dungeon"}.`,
    );
  }
  if (firstRaid) {
    push(firstRaid.progress.clearedOnDay, `${firstRaid.content?.name ?? "raid"} fell for the first time.`);
  }
  if (game.worldFirstDay !== null) {
    push(game.worldFirstDay, "World First: the Tyrant fell before any rival.");
  } else if (lastRaid && lastRaid !== firstRaid) {
    push(lastRaid.progress.clearedOnDay, `${lastRaid.content?.name ?? "raid"} fell for the first time.`);
  }
  if (picks.length < 3 && lastWipe) push(lastWipe.day, lastWipe.text);
  if (picks.length < 3) {
    const first = cleared[0];
    if (first) {
      push(first.progress.clearedOnDay, `First clear: ${first.content?.name ?? "an area"}.`);
    }
  }
  return picks.slice(0, 3).sort((a, b) => a.day - b.day);
};

const LootWaiting = ({ game }: { game: GameState }) => {
  const dispatch = useGameStore((s) => s.dispatch);
  const loot = game.pendingLoot ?? [];
  if (loot.length === 0) return null;
  return (
    <section className="panel" style={{ borderColor: "rgba(216,179,95,0.4)" }}>
      <div className="panel-head">
        <span className="eyebrow">Drops waiting</span>
        <Chip tone="warn">{loot.length}</Chip>
      </div>
      <div className="stack" style={{ gap: 6, padding: 10 }}>
        {loot.map((drop) => <DropRow key={drop.id} drop={drop} />)}
        <div className="row" style={{ marginTop: 4 }}>
          <button className="btn btn-primary btn-sm" onClick={() => dispatch({ type: "auto-loot" })}>
            Auto — need pick
          </button>
          <span className="tiny dim">
            Assign, sell, or forge each drop. Anything left when you advance takes the need default.
          </span>
        </div>
      </div>
    </section>
  );
};

const RunEnd = ({ game }: { game: GameState }) => {
  const startRun = useGameStore((s) => s.startRun);
  const openModal = useGameStore((s) => s.openModal);
  const lines = game.scoreLines ?? [];
  const rank = playerRank(game);
  const summary = guildSummary(game);
  const moments = momentsFor(game);

  return (
    <div className="panel run-end">
      <div className="run-card">
        <div className="title-kicker">The run is complete</div>
        <div className="row" style={{ justifyContent: "center", gap: 22 }}>
          <div>
            <div className="eyebrow">Rank</div>
            <div className="band">
              {rank}
              <span className="small muted" style={{ fontSize: 13 }}>
                {" "}/ {game.rivals.length + 1}
              </span>
            </div>
          </div>
          <div>
            <div className="eyebrow">Band</div>
            <div className="band">{game.band ?? "—"}</div>
          </div>
          <div>
            <div className="eyebrow">Score</div>
            <div className="run-score">{fmt(game.score ?? 0)}</div>
          </div>
        </div>

        <div style={{ marginTop: 18, textAlign: "left" }}>
          {lines.map((line) => {
            const max = Math.max(1, ...lines.map((l) => Math.abs(l.value)));
            return (
              <div className="score-line" key={line.label}>
                <span className="small muted">{line.label}</span>
                <span className="mono small" style={{ textAlign: "right" }}>
                  {signed(line.value)}
                </span>
                <div className="score-bar">
                  <div style={{ width: `${Math.max(0, Math.min(100, (line.value / max) * 100))}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {moments.length > 0 ? (
          <div style={{ marginTop: 18, textAlign: "left" }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>
              Three moments that mattered
            </div>
            {moments.map((moment) => (
              <div className="small" key={`${moment.day}-${moment.text}`} style={{ padding: "3px 0" }}>
                <span className="mono dim">Day {moment.day}</span> — {moment.text}
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ marginTop: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 4, textAlign: "left" }}>
            The table
          </div>
          {summary.standings.map((row, index) => (
            <div className="standings-row" key={row.name} data-player={row.isPlayer}>
              <span className="standings-rank">{index + 1}</span>
              <span style={{ fontWeight: row.isPlayer ? 700 : 500 }}>{row.name}</span>
              <span className="mono" style={{ textAlign: "right" }}>
                {fmt(row.score)}
              </span>
              <span className="mono dim" style={{ textAlign: "right" }}>
                {row.raids}/{RAIDS.length}
              </span>
              <span className="standings-activity tiny dim">
                {row.worldFirstDay !== null ? `World First day ${row.worldFirstDay}` : "—"}
              </span>
            </div>
          ))}
        </div>

        <div className="row-wrap" style={{ justifyContent: "center", marginTop: 20 }}>
          <button className="btn btn-primary" onClick={() => startRun(game.seed, game.guildName)}>
            New run — same seed
          </button>
          <button className="btn" onClick={() => startRun(randomSeed(), game.guildName)}>
            New run — new seed
          </button>
          <button className="btn" onClick={() => openModal({ kind: "new-run" })}>
            Custom
          </button>
        </div>
        <div className="tiny dim" style={{ marginTop: 8 }}>
          Same seed and the same actions reproduce this run. Day {Math.min(game.day, RUN_DAYS)} of {RUN_DAYS}.
        </div>
      </div>
    </div>
  );
};

export const ReportScreen = () => {
  const game = useGameStore((s) => s.game);
  const report = useGameStore((s) => s.report);
  const setScreen = useGameStore((s) => s.setScreen);
  if (!game) return null;

  const summary = guildSummary(game);
  // During a run the report shows the live breakdown; at the end the run-end
  // card owns the same numbers, so the side card is dropped to avoid a repeat.
  const liveScore = game.finished ? null : computeScore(game);
  // One card per party. A day can field three; each encounter is a separate
  // fight with its own pulls, mastery and failed check.
  const encounters =
    report && report.encounters.length > 0
      ? report.encounters
      : (game.lastEncounters ?? []).filter((encounter) => encounter.day === report?.day);

  return (
    <div className="stack" style={{ gap: 12 }}>
      <header className="spread">
        <div>
          <h1 className="screen-title">
            {game.finished ? "Run report" : report ? `Day ${report.day} report` : "Report"}
          </h1>
          <p className="screen-sub">
            {game.finished
              ? "The verdict, the components, and the moments that made the run. The next run can use the same seed."
              : "The drops to assign, the digest, one card per party that fought, and what would close the gap. A wipe names the failed check."}
          </p>
        </div>
        <div className="row-wrap small">
          <Chip tone="info">rank {summary.rank} of {game.rivals.length + 1}</Chip>
          <Chip>score {fmt(summary.latestScore)}</Chip>
          <button className="btn btn-sm" onClick={() => setScreen("hall")}>
            Guild Hall
          </button>
          <button className="btn btn-sm" onClick={() => setScreen("war")}>
            War Room
          </button>
        </div>
      </header>

      {game.finished ? <RunEnd game={game} /> : null}

      <div className="report-grid">
        <div className="stack" style={{ gap: 12 }}>
          {/* The drops sit at the top: a clear's loot is the decision the day
              hands back, and it must not be a panel to scroll for. */}
          <LootWaiting game={game} />

          <section className="panel">
            <div className="panel-head">
              <span className="eyebrow">{report ? `Digest · day ${report.day}` : "Digest"}</span>
              <span className="tiny dim">{report ? `${report.events.length} entries` : "no day resolved"}</span>
            </div>
            <div className="card-list">
              {!report ? (
                <div className="empty">Advance the day to produce a report.</div>
              ) : report.events.length === 0 ? (
                <div className="empty">Nothing happened this day.</div>
              ) : (
                report.events.map((event) => <EventLine key={event.id} event={event} />)
              )}
            </div>
          </section>

          {encounters.length > 0 ? (
            encounters.map((encounter, index) => (
              <EncounterReport
                key={`${encounter.contentId}-${index}`}
                game={game}
                encounter={encounter}
                position={{ index: index + 1, total: encounters.length }}
              />
            ))
          ) : (
            <section className="panel">
              <div className="empty">No fight this day. The digest is all there is.</div>
            </section>
          )}
        </div>

        <aside className="stack" style={{ gap: 12 }}>
          {liveScore ? <ScoreCard game={game} lines={liveScore.lines} /> : null}
          <section className="panel">
            <div className="panel-head">
              <span className="eyebrow">The race</span>
            </div>
            <div className="panel-body stack" style={{ gap: 6 }}>
              {summary.standings.map((row) => (
                <div className="spread small" key={row.name}>
                  <span className={row.isPlayer ? "gold" : ""}>
                    {row.name}
                    {row.isPlayer ? " (you)" : ""}
                  </span>
                  <span className="mono">{fmt(row.score)}</span>
                </div>
              ))}
            </div>
          </section>
          {!game.finished ? (
            <section className="panel">
              <div className="panel-head">
                <span className="eyebrow">Next</span>
              </div>
              <div className="panel-body stack" style={{ gap: 6 }}>
                <button className="btn btn-block" onClick={() => setScreen("war")}>
                  Plan tomorrow
                </button>
                <button className="btn btn-ghost btn-block" onClick={() => setScreen("hall")}>
                  Back to the hall
                </button>
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
};
