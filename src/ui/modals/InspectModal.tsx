import { CHECK_LABEL, KIND_LABEL } from "../../sim";
import { useGameStore } from "../../store/gameStore";
import { inspectInfo } from "../../store/selectors";
import { Art, itemArtId } from "../components/Art";
import { Modal } from "../components/Modal";
import { Chip } from "../components/Primitives";

const fmt = (value: number): string => Math.round(value).toLocaleString("en-US");

export const InspectModal = ({ contentId, onClose }: { contentId: string; onClose: () => void }) => {
  const game = useGameStore((s) => s.game);
  const setScreen = useGameStore((s) => s.setScreen);
  if (!game) return null;
  const info = inspectInfo(game, contentId);

  if (!info) {
    return (
      <Modal title="Unknown area" onClose={onClose} footer={<button className="btn" onClick={onClose}>Close</button>}>
        <div className="empty">That area is not in the content data.</div>
      </Modal>
    );
  }

  const { content, party, projection } = info;
  const status =
    info.clears > 0
      ? `cleared ×${info.clears}`
      : info.attempts > 0
        ? `open · ${info.attempts} attempts · best ${Math.round(info.bestPull * 100)}%`
        : "new";

  return (
    <Modal
      title={content.name}
      subtitle={`${KIND_LABEL[content.kind]} · average level ${content.minLevel}+ · ${content.minHeroes}-${content.maxHeroes} heroes · recommended iLvl ${content.recommendedIlvl} · ${status}`}
      onClose={onClose}
      wide
      footer={
        <>
          <span className="tiny dim grow">Read-only. Nothing changes until you advance the day.</span>
          <button
            className="btn"
            onClick={() => {
              setScreen("war");
              onClose();
            }}
          >
            Go to War Room
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <Art
        base={`/art/places/${content.id}`}
        alt={`${content.name} key art`}
        width="100%"
        className="inspect-banner"
      />
      <p className="small muted" style={{ marginBottom: 10 }}>{content.blurb}</p>
      <div className="inspect-grid">
        <div>
          <dl style={{ margin: 0 }}>
            <div className="kv">
              <dt>Rewards</dt>
              <dd>
                {content.kind === "farm"
                  ? `${content.gold}g and ${content.xp} xp per hero`
                  : `${fmt(content.gold)}g · ${content.xp} xp per hero`}
              </dd>
            </div>
            <div className="kv">
              <dt>Drops</dt>
              <dd>{content.loot.count === 0 ? "none" : `${content.loot.count} item · iLvl ${content.loot.ilvlMin}-${content.loot.ilvlMax}`}</dd>
            </div>
            {content.kind === "mission" ? (
              <div className="kv">
                <dt>Contract</dt>
                <dd className={info.payScale < 1 ? "warn" : ""}>
                  {info.payScale < 1
                    ? `not posted — pays ${Math.round(info.payScale * 100)}%`
                    : info.posted
                      ? "posted — full pay"
                      : "first clear — full pay"}
                </dd>
              </div>
            ) : null}
            <div className="kv">
              <dt>Average level</dt>
              <dd>{content.minLevel}</dd>
            </div>
          </dl>

          <div className="eyebrow" style={{ margin: "14px 0 5px" }}>
            Phases
          </div>
          {content.phases.length === 0 ? (
            <div className="small dim">No phases: the run always succeeds.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Phase</th>
                    <th>Check</th>
                    <th className="num">Needs</th>
                    <th className="num">Share</th>
                    <th>Threat</th>
                  </tr>
                </thead>
                <tbody>
                  {content.phases.map((phase) => {
                    const ability = info.abilities.find((a) => a.id === phase.ability);
                    return (
                      <tr key={phase.name}>
                        <td>{phase.name}</td>
                        <td className="muted">{CHECK_LABEL[phase.check]}</td>
                        <td className="num">{phase.requirement}</td>
                        <td className="num">{Math.round(phase.share * 100)}%</td>
                        <td className={ability ? "warn" : "dim"}>
                          {ability ? `${ability.name} ×${ability.penalty.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="eyebrow" style={{ margin: "14px 0 5px" }}>
            Bestiary
          </div>
          <div className="stack" style={{ gap: 5 }}>
            {content.mobs.map((mob) => (
              <div key={mob.name} className="small">
                <span style={{ fontWeight: 600 }}>{mob.name}</span>{" "}
                <span className="dim">· {mob.role} · {mob.check ? CHECK_LABEL[mob.check] : "—"}</span>
                <div className="tiny muted">{mob.note}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 5 }}>
            Drops
          </div>
          {content.drops.length === 0 ? (
            <div className="small dim">
              {content.kind === "farm"
                ? "None. Farms pay gold and XP."
                : "None. A contract pays gold and XP."}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Slot</th>
                    <th className="num">iLvl</th>
                    <th className="num">Chance</th>
                  </tr>
                </thead>
                <tbody>
                  {content.drops.map((drop) => (
                    <tr key={drop.name}>
                      <td>
                        <span className="row" style={{ gap: 7 }}>
                          <Art
                            base={`/art/items/${itemArtId(drop.name)}`}
                            alt=""
                            width={26}
                            height={26}
                            className="item-icon"
                          />
                          {drop.name}
                        </span>
                      </td>
                      <td className="muted">{drop.slot}</td>
                      <td className="num">{drop.ilvl}</td>
                      <td className="num">{Math.round(drop.chance * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="tiny dim" style={{ marginTop: 5 }}>
            Chance is per clear. At most one named item drops; on a hit it replaces one guaranteed item.
          </div>

          <div className="spread" style={{ margin: "14px 0 5px" }}>
            <span className="eyebrow">Your party tonight</span>
            {projection ? (
              <Chip tone={projection.estimatedBestPull >= 0.999 ? "good" : undefined}>
                best pull {Math.round(projection.estimatedBestPull * 100)}%
              </Chip>
            ) : null}
          </div>
          {!party ? (
            <div className="small warn">
              Not enough heroes ready: {game.roster.filter((h) => h.injuryDays === 0 && h.health > 0).length} fit,
              needs {content.minHeroes}. Injured and resting heroes do not count.
            </div>
          ) : (
            <>
              <div className="small">
                {party.map((hero) => `${hero.name} (lvl ${hero.level})`).join(", ")}
              </div>
              <div style={{ marginTop: 6 }}>
                {projection?.phases.map((phase) => (
                  <div className="phase-row" key={phase.name}>
                    <span className="phase-name">{phase.checkLabel}</span>
                    <div className="mono small">
                      {phase.value} / {phase.requirement}
                    </div>
                    <span className={`phase-numbers verdict-${phase.verdict}`}>{phase.ratio.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="tiny dim" style={{ marginTop: 5 }}>
                Steady stance and the best legal party. The War Room shows the party you plan to send.
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
