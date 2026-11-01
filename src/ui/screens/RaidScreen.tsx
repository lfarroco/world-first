import { useState } from "react";
import {
  CHECK_LABEL,
  RAIDS,
  RAID_LOG,
  RUN_DAYS,
  averageItemLevel,
  contentAvailability,
  masteryFor,
  nextRaidContent,
  playerRank,
  raidNights,
  raidRace,
  raidTeamHeroes,
  type ContentAvailability,
  type ContentDef,
  type GameState,
} from "../../sim";
import { useGameStore } from "../../store/gameStore";
import { guildSummary } from "../../store/selectors";
import { Chip, Meter } from "../components/Primitives";

const fmt = (value: number): string => Math.round(value).toLocaleString("en-US");
const pct = (value: number): string => `${Math.round(value * 100)}%`;

const shortName = (raid: ContentDef): string => raid.name.split("—").pop()?.trim() ?? raid.name;

/** The tier's own name, taken from the content so a rename is a data edit. */
const tierName = (): string => RAIDS[0]?.name.split("—")[0]?.trim() ?? "The raid tier";

const isLocked = (status: ContentAvailability["status"]): boolean =>
  status === "locked" || status === "roster" || status === "level";

const openStatus = (game: GameState, raid: ContentDef): string => {
  const progress = game.progress.find((p) => p.contentId === raid.id);
  if (progress?.clearedOnDay !== null && progress?.clearedOnDay !== undefined) {
    return `killed day ${progress.clearedOnDay}`;
  }
  if (isLocked(contentAvailability(game, raid).status)) return "locked";
  return (progress?.attempts ?? 0) > 0 ? "open" : "new";
};

const RacePanel = ({ game, raid }: { game: GameState; raid: ContentDef }) => {
  const summary = guildSummary(game);
  const activities = new Map(game.rivals.map((rival) => [rival.name, rival.activity]));
  const boss = new Map(raidRace(game, raid.id).map((row) => [row.name, row]));

  return (
    <section className="panel">
      <div className="panel-head">
        <span className="eyebrow">The race</span>
        <span className="tiny dim">best on {shortName(raid)}</span>
      </div>
      {summary.standings.map((row, index) => {
        const mine = boss.get(row.name);
        const line = mine?.clearedOnDay
          ? `killed it day ${mine.clearedOnDay}`
          : `best ${pct(mine?.bestPull ?? 0)}`;
        const suffix = row.isPlayer
          ? game.worldFirstDay !== null
            ? `World First day ${game.worldFirstDay}`
            : ""
          : (activities.get(row.name) ?? "—");
        const activity = suffix ? `${line} · ${suffix}` : line;
        return (
          <div className="race-row" key={row.name} data-player={row.isPlayer}>
            <span className="standings-rank">{index + 1}</span>
            <span className="race-name">
              <span style={{ fontWeight: row.isPlayer ? 700 : 500 }}>{row.name}</span>
              {row.isPlayer ? <Chip tone="gold">you</Chip> : null}
            </span>
            <span className="mono" style={{ textAlign: "right" }}>
              {fmt(row.score)}
            </span>
            <span className="mono dim" style={{ textAlign: "right" }}>
              {row.raids}/{RAIDS.length}
            </span>
            <span className="race-detail" title={activity}>
              {activity}
            </span>
          </div>
        );
      })}
    </section>
  );
};

const RaidMap = ({
  game,
  selectedId,
  onSelect,
}: {
  game: GameState;
  selectedId: string;
  onSelect: (id: string) => void;
}) => (
  <section className="panel">
    <div className="panel-head">
      <span className="eyebrow">The ladder</span>
      <span className="tiny dim">three bosses, one door at a time</span>
    </div>
    <div>
      {RAIDS.map((raid, index) => {
        const availability = contentAvailability(game, raid);
        const locked = isLocked(availability.status);
        const race = raidRace(game, raid.id);
        const you = race.find((row) => row.isPlayer);
        const rival = race.find((row) => !row.isPlayer && row.bestPull > 0);
        const best = you?.bestPull ?? 0;
        return (
          <button
            key={raid.id}
            className="raid-row"
            data-selected={raid.id === selectedId}
            data-locked={locked}
            onClick={() => onSelect(raid.id)}
            title={availability.reason || `Read the log for ${shortName(raid)}`}
          >
            <span className="raid-index">{index + 1}</span>
            <span className="raid-body">
              <span className="raid-line">
                <span className="raid-name">{shortName(raid)}</span>
                <span className="raid-state">{openStatus(game, raid)}</span>
              </span>
              <span className="raid-meta">
                average level {raid.minLevel} · ten heroes · recommended iLvl{" "}
                {raid.recommendedIlvl}
              </span>
              {locked ? (
                <span className="raid-reason tiny dim">{availability.reason}</span>
              ) : (
                <span className="raid-race">
                  {you?.clearedOnDay
                    ? `you cleared it on day ${you.clearedOnDay}`
                    : `you ${pct(best)}`}
                  {rival
                    ? rival.clearedOnDay !== null
                      ? ` · ${rival.name} killed it day ${rival.clearedOnDay}`
                      : ` · best rival ${rival.name} ${pct(rival.bestPull)}`
                    : you?.clearedOnDay
                      ? ""
                      : " · no rival pull yet"}
                </span>
              )}
            </span>
            {locked ? null : (
              <span className="raid-bar" aria-hidden="true">
                <span
                  className={best >= 0.92 ? "good" : best >= 0.6 ? "warn" : "bad"}
                  style={{ width: `${Math.round(best * 100)}%` }}
                />
              </span>
            )}
          </button>
        );
      })}
    </div>
  </section>
);

const PullLog = ({ game, raid }: { game: GameState; raid: ContentDef }) => {
  const setScreen = useGameStore((s) => s.setScreen);
  const nights = raidNights(game, raid.id);
  const progress = game.progress.find((p) => p.contentId === raid.id);
  const attempts = progress?.attempts ?? 0;
  const best = progress?.bestPull ?? 0;
  const mastery = masteryFor(attempts);
  // Newest pull first: a stall is read from the top, like a feed.
  const rows = nights
    .flatMap((night) => night.pulls.map((pull) => ({ night, pull })))
    .reverse();
  const last = game.lastEncounter;

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Pull log</div>
          <div className="section-title">{shortName(raid)}</div>
        </div>
        <div className="row-wrap">
          <Chip tone={progress?.clearedOnDay ? "good" : attempts > 0 ? "warn" : "info"}>
            {progress?.clearedOnDay
              ? `killed day ${progress.clearedOnDay}`
              : attempts > 0
                ? `best ${pct(best)}`
                : "untouched"}
          </Chip>
          <button className="btn btn-sm" onClick={() => setScreen("war")}>
            Plan the pull
          </button>
        </div>
      </div>

      <div className="panel-body" style={{ paddingBottom: 8 }}>
        <div className="pull-stats">
          <span>
            best <b className="mono">{pct(best)}</b>
          </span>
          <span>
            <b className="mono">{attempts}</b> pull{attempts === 1 ? "" : "s"}
          </span>
          <span>
            <b className="mono">{nights.length}</b> night{nights.length === 1 ? "" : "s"}
          </span>
          <span>
            mastery <b className="mono">{pct(mastery)}</b>
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty" style={{ padding: "14px 12px" }}>
          {attempts > 0
            ? `${attempts} earlier pull${attempts === 1 ? "" : "s"} are older than the last ${RAID_LOG.maxNights} raid nights. The next raid night adds a row.`
            : "No raid night is logged for this boss. The War Room sets the party; the log starts with the first pull."}
        </div>
      ) : (
        <div className="pull-log">
          <div className="pull-head">
            <span>Day</span>
            <span>Pull</span>
            <span>Best</span>
            <span>What stopped it</span>
            <span>Stance</span>
          </div>
          {rows.map(({ night, pull }) => (
            <div
              className="pull-row"
              data-outcome={pull.killed ? "kill" : "fail"}
              key={`${night.day}-${pull.index}`}
            >
              <span className="mono dim">day {night.day}</span>
              <span className="mono dim">#{pull.index}</span>
              <span className="mono">{pct(pull.progress)}</span>
              <span className="pull-check">
                {pull.killed ? (
                  <span className="good">killed</span>
                ) : pull.failed ? (
                  <>
                    <span className="bad">{pull.failed.name}</span>{" "}
                    <span className="dim">
                      {CHECK_LABEL[pull.failed.check]} {pull.failed.value}/
                      {pull.failed.requirement} · short{" "}
                      {Math.max(0, pull.failed.requirement - pull.failed.value)}
                    </span>
                    {pull.failed.ability ? (
                      <span className="tiny dim">
                        {" "}
                        ·{" "}
                        {pull.failed.ability.countered
                          ? `${pull.failed.ability.name} answered`
                          : `${pull.failed.ability.name} uncountered`}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="dim">no failed phase logged</span>
                )}
              </span>
              <span className="mono dim">{night.stance}</span>
            </div>
          ))}
        </div>
      )}

      {last?.contentId === raid.id && last.contentKind === "raid" ? (
        <div className="panel-body" style={{ borderTop: "1px solid var(--color-line-soft)" }}>
          <div className="spread">
            <span className="tiny dim">
              The full analysis of the last night — every phase, the threat, the next lever — is on
              the report.
            </span>
            <button className="btn btn-sm" onClick={() => setScreen("report")}>
              Open the report
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
};

const WallPanel = ({ game, raid }: { game: GameState; raid: ContentDef }) => {
  const setScreen = useGameStore((s) => s.setScreen);
  const team = raidTeamHeroes(game);
  const teamIlvl = averageItemLevel(team);
  const progress = game.progress.find((p) => p.contentId === raid.id);
  const race = raidRace(game, raid.id);
  const you = race.find((row) => row.isPlayer);
  const leader = race.find((row) => !row.isPlayer && (row.pulls > 0 || row.clearedOnDay !== null));
  const youKill = you?.clearedOnDay ?? null;
  const leaderKill = leader?.clearedOnDay ?? null;
  // Progress is 0..1; the phrase is in points, so the subtraction is first.
  const gap = Math.round(((you?.bestPull ?? 0) - (leader?.bestPull ?? 0)) * 100);
  const ratio =
    raid.recommendedIlvl === 0 ? 0 : (teamIlvl / raid.recommendedIlvl) * 100;

  return (
    <section className="panel">
      <div className="panel-head">
        <span className="eyebrow">The wall</span>
        <span className="tiny dim">{shortName(raid)}</span>
      </div>
      <div className="panel-body stack" style={{ gap: 9 }}>
        <div className="spread small">
          <span className="muted">Your best pull</span>
          <span className="mono">{pct(you?.bestPull ?? 0)}</span>
        </div>
        <div className="spread small">
          <span className="muted">Mastery</span>
          <span className="mono">{pct(masteryFor(progress?.attempts ?? 0))}</span>
        </div>
        <div className="spread small">
          <span className="muted">Raid ten</span>
          <span className="mono dim">
            {team.length} hero{team.length === 1 ? "" : "es"}
          </span>
        </div>
        {team.length === 0 ? (
          <p className="tiny dim">
            No raid ten yet — the planner builds one when the first raid opens.
          </p>
        ) : (
          <div>
            <div className="spread tiny dim" style={{ marginBottom: 3 }}>
              <span>gear against the recommendation</span>
              <span className="mono">
                {teamIlvl} / {raid.recommendedIlvl}
              </span>
            </div>
            <Meter
              value={Math.min(100, ratio)}
              tone={ratio >= 100 ? "good" : ratio >= 75 ? "warn" : "bad"}
            />
          </div>
        )}
        <hr className="sep" />
        <div className="small">
          {leader ? (
            youKill !== null ? (
              leaderKill !== null ? (
                youKill <= leaderKill ? (
                  <span>
                    You killed it on day {youKill}; <b>{leader.name}</b> on day {leaderKill}.
                  </span>
                ) : (
                  <span>
                    <b>{leader.name}</b> killed it on day {leaderKill}; you on day {youKill}.
                  </span>
                )
              ) : (
                <span>
                  You killed it on day {youKill}. <b>{leader.name}</b> is at{" "}
                  {pct(leader.bestPull)}.
                </span>
              )
            ) : leaderKill !== null ? (
              <span>
                <b>{leader.name}</b> killed it on day {leaderKill}; you are at{" "}
                {pct(you?.bestPull ?? 0)}.
              </span>
            ) : gap === 0 ? (
              <span>
                <b>{leader.name}</b> is level with you on this boss.
              </span>
            ) : gap > 0 ? (
              <span>
                You are <b>{gap}</b> point{gap === 1 ? "" : "s"} ahead of {leader.name} on this
                boss.
              </span>
            ) : (
              <span>
                <b>{leader.name}</b> is <b>{Math.abs(gap)}</b> point
                {gap === -1 ? "" : "s"} ahead on this boss.
              </span>
            )
          ) : (
            <span className="dim">No rival has pulled this boss yet.</span>
          )}
        </div>
        <button className="btn btn-block" onClick={() => setScreen("war")}>
          Set tonight&apos;s party ▸
        </button>
      </div>
    </section>
  );
};

export const RaidScreen = () => {
  const game = useGameStore((s) => s.game);
  // Before the null return: hooks must run in the same order every render.
  const [chosen, setChosen] = useState<string | null>(null);
  if (!game) return null;

  const initial = nextRaidContent(game)?.id ?? RAIDS.at(-1)?.id ?? RAIDS[0]!.id;
  const raid = RAIDS.find((row) => row.id === (chosen ?? initial)) ?? RAIDS[0]!;
  const summary = guildSummary(game);

  return (
    <div className="stack" style={{ gap: 14 }}>
      <header className="spread">
        <div>
          <h1 className="screen-title">{tierName()}</h1>
          <p className="screen-sub">
            The race up the tier. The standings are scored every day by the same formula as the
            verdict; the pull log is every raid night this guild has fought, so a stall is a
            record and not a feeling.
          </p>
        </div>
        <div className="row-wrap small">
          <Chip tone="gold">
            rank {playerRank(game)} of {game.rivals.length + 1}
          </Chip>
          <Chip>
            {summary.raids} / {RAIDS.length} raids
          </Chip>
          {game.worldFirstDay !== null ? (
            <Chip tone="gold">World First · day {game.worldFirstDay}</Chip>
          ) : null}
          <span className="small muted">
            day {Math.min(game.day, RUN_DAYS)} / {RUN_DAYS}
          </span>
        </div>
      </header>

      <div className="raid-grid">
        <div className="raid-main">
          <RaidMap game={game} selectedId={raid.id} onSelect={setChosen} />
          <PullLog game={game} raid={raid} />
        </div>
        <aside className="raid-side">
          <RacePanel game={game} raid={raid} />
          <WallPanel game={game} raid={raid} />
        </aside>
      </div>
    </div>
  );
};
