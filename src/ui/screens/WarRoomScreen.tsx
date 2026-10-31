import { useMemo, useState } from "react";
import {
  KIND_LABEL,
  MAX_PARTIES,
  averageItemLevel,
  contentById,
  fieldableParty,
  heroPower,
  itemLevel,
  lootUpgrade,
  nextRaidContent,
  openRaidContent,
  rankFor,
  suggestLootTarget,
  unavailableContent,
  type Assignment,
  type ContentDef,
  type GameState,
  type Hero,
  type Stance,
} from "../../sim";
import { useGameStore } from "../../store/gameStore";
import {
  ROW_LABEL,
  contractInfo,
  contentChoices,
  freeHeroesFor,
  partyAdvice,
  partyProjection,
  slotRowFor,
  teamLine,
  type ContentChoice,
  type SlotRow,
} from "../../store/selectors";
import { Chip, Meter } from "../components/Primitives";
import { ConfirmButton, Modal as Dialog } from "../components/Modal";

const STANCES: { id: Stance; label: string; hint: string }[] = [
  { id: "cautious", label: "Cautious", hint: "−10% checks, 60% less injury risk" },
  { id: "steady", label: "Steady", hint: "no check or injury modifier" },
  { id: "push", label: "Push", hint: "+12% checks, +55% injury risk" },
];

const partyHeroes = (state: GameState, index: number): Hero[] => {
  const party = state.plan.parties[index];
  if (!party) return [];
  return party.heroes
    .map((id) => state.roster.find((h) => h.id === id))
    .filter((h): h is Hero => Boolean(h));
};

const PayTag = ({ choice }: { choice: ContentChoice }) => {
  if (choice.content.kind !== "mission") return <span className="dim">—</span>;
  if (choice.payScale >= 1) return <Chip tone="gold">full</Chip>;
  return <Chip tone="warn">{Math.round(choice.payScale * 100)}%</Chip>;
};

const ContentPicker = ({
  partyIndex,
  onClose,
}: {
  partyIndex: number;
  onClose: () => void;
}) => {
  const game = useGameStore((s) => s.game);
  const dispatch = useGameStore((s) => s.dispatch);
  const setSelected = useGameStore((s) => s.selectParty);
  const openModal = useGameStore((s) => s.openModal);
  if (!game) return null;

  const choices = contentChoices(game);
  const hidden = unavailableContent(game);
  const usedByAnother = new Set(
    game.plan.parties.filter((_, index) => index !== partyIndex).map((p) => p.contentId),
  );

  const choose = (content: ContentDef): void => {
    if (usedByAnother.has(content.id)) return;
    const current = game.plan.parties[partyIndex];
    const pool = freeHeroesFor(game, partyIndex);
    const best = fieldableParty(game, content, pool);
    const assignment: Assignment = {
      contentId: content.id,
      heroes: (best ?? []).map((h) => h.id),
      stance: current?.stance ?? "steady",
    };
    dispatch({ type: "set-party", index: partyIndex, assignment });
    setSelected(partyIndex);
    onClose();
  };

  return (
    <Dialog
      title="Choose a target"
      subtitle="Only areas the guild can field are listed. Projected is the best legal party's best pull."
      onClose={onClose}
      wide
      footer={
        <button className="btn" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Area</th>
              <th>Kind</th>
              <th className="num">Avg lvl</th>
              <th className="num">Party</th>
              <th className="num">Gold</th>
              <th className="num">XP</th>
              <th>Loot</th>
              <th>Pay</th>
              <th className="num">Projected</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {choices.map((choice) => {
              const c = choice.content;
              const clash = usedByAnother.has(c.id);
              const status =
                choice.clears > 0
                  ? `cleared ×${choice.clears}`
                  : choice.attempts > 0
                    ? "open"
                    : "new";
              return (
                <tr
                  key={c.id}
                  data-clickable={!clash}
                  onClick={() => choose(c)}
                  style={clash ? { opacity: 0.42 } : undefined}
                  title={clash ? "Already planned by another party" : "Choose this target"}
                >
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td className="muted">{KIND_LABEL[c.kind]}</td>
                  <td className="num">{c.minLevel}</td>
                  <td className="num">
                    {c.minHeroes}-{c.maxHeroes}
                  </td>
                  <td className="num">{c.kind === "farm" ? `${c.gold}/hero` : c.gold}</td>
                  <td className="num">{c.xp}</td>
                  <td className="dim">{c.loot.count === 0 ? "—" : `${c.loot.count} · ${c.loot.ilvlMin}-${c.loot.ilvlMax}`}</td>
                  <td>
                    <PayTag choice={choice} />
                  </td>
                  <td className="num">
                    {choice.projection ? `${Math.round(choice.projection.estimatedBestPull * 100)}%` : "—"}
                  </td>
                  <td className={clash ? "warn" : choice.clears > 0 ? "good" : choice.attempts > 0 ? "info" : ""}>
                    {clash ? "in another party" : status}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        openModal({ kind: "inspect", contentId: c.id });
                      }}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="tiny dim" style={{ marginTop: 8 }}>
        {choices.length} open today · {hidden.length} area{hidden.length === 1 ? "" : "s"} not open yet. You
        are told when one opens. First clears are never taxed by the board.
      </div>
    </Dialog>
  );
};

const HeroPicker = ({
  partyIndex,
  replaceId,
  onClose,
}: {
  partyIndex: number;
  replaceId?: string;
  onClose: () => void;
}) => {
  const game = useGameStore((s) => s.game);
  const dispatch = useGameStore((s) => s.dispatch);
  const [query, setQuery] = useState("");
  if (!game) return null;

  const party = game.plan.parties[partyIndex];
  const content = party ? contentById(party.contentId) : null;
  if (!party || !content) return null;

  const current = new Set(party.heroes);
  const pool = freeHeroesFor(game, partyIndex).filter((h) =>
    replaceId ? h.id === replaceId || !current.has(h.id) : !current.has(h.id),
  );
  const ranked = content ? rankFor(pool, content) : pool;
  const filtered = query.trim()
    ? ranked.filter((h) => h.name.toLowerCase().includes(query.trim().toLowerCase()))
    : ranked;
  const atMax = party.heroes.length >= content.maxHeroes;

  const pick = (hero: Hero): void => {
    let heroes: string[];
    if (replaceId) {
      heroes = party.heroes.map((id) => (id === replaceId ? hero.id : id));
    } else {
      if (atMax) return;
      heroes = [...party.heroes, hero.id];
    }
    dispatch({ type: "assign-party", assignment: { ...party, heroes } });
    onClose();
  };

  return (
    <Dialog
      title={replaceId ? "Swap a hero" : "Add a hero"}
      subtitle={`${content.name} · ${party.heroes.length}/${content.maxHeroes} slots · ranked by contribution to its checks`}
      onClose={onClose}
      footer={
        <>
          <span className="tiny dim grow">
            {atMax && !replaceId ? "Party is full — click a deployed hero to swap." : "Only available heroes are listed."}
          </span>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <input
        className="input"
        style={{ width: "100%", marginBottom: 8 }}
        placeholder="Search the bench"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        autoFocus
      />
      <div className="hero-picker">
        {filtered.length === 0 ? (
          <div className="empty">No free hero. An injured or resting hero does not appear until he can fight.</div>
        ) : (
          filtered.map((hero) => {
            const already = current.has(hero.id);
            const disabled = already && !replaceId;
            return (
              <button className="picker-row" key={hero.id} onClick={() => pick(hero)} disabled={disabled}>
                <span className="hero-cell">
                  <span className={`class-dot class-${hero.klass}`}>{hero.klass.slice(0, 1).toUpperCase()}</span>
                  <span style={{ fontWeight: 600 }}>{hero.name}</span>
                  {already ? <Chip tone="info">in party</Chip> : null}
                  {hero.injuryDays > 0 ? <Chip tone="bad">out {hero.injuryDays}d</Chip> : null}
                </span>
                <span className="dim">
                  lvl {hero.level}
                </span>
                <span className="dim">iLvl {itemLevel(hero.gear)}</span>
                <span className="mono">{Math.round(heroPower(hero))}</span>
                <span className="tiny dim">{Math.round(hero.fatigue)} fat</span>
              </button>
            );
          })
        )}
      </div>
    </Dialog>
  );
};

const TeamPicker = ({ onClose }: { onClose: () => void }) => {
  const game = useGameStore((s) => s.game);
  const dispatch = useGameStore((s) => s.dispatch);
  const [ids, setIds] = useState<string[]>(game?.raidTeam ?? []);
  if (!game) return null;

  const toggle = (id: string): void => {
    setIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : current.length >= 10
          ? current
          : [...current, id],
    );
  };

  const roster = [...game.roster].sort((a, b) => heroPower(b) - heroPower(a));

  return (
    <Dialog
      title="Set the raid ten"
      subtitle="The team is a preference, not a lock. Injuries are filled from the bench for one night."
      onClose={onClose}
      wide
      footer={
        <>
          <span className="tiny dim grow">{ids.length}/10 selected</span>
          <button
            className="btn"
            onClick={() => {
              dispatch({ type: "auto-raid-team" });
              onClose();
            }}
          >
            Pick the best ten
          </button>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              dispatch({ type: "set-raid-team", heroIds: ids });
              onClose();
            }}
          >
            Save team
          </button>
        </>
      }
    >
      <div className="hero-picker">
        {roster.map((hero) => {
          const checked = ids.includes(hero.id);
          return (
            <button
              className="picker-row"
              key={hero.id}
              onClick={() => toggle(hero.id)}
              style={checked ? { background: "rgba(216,179,95,0.07)" } : undefined}
            >
              <span className="hero-cell">
                <span className={`class-dot class-${hero.klass}`}>{hero.klass.slice(0, 1).toUpperCase()}</span>
                <span style={{ fontWeight: 600 }}>{hero.name}</span>
                {checked ? <Chip tone="gold">ten</Chip> : null}
              </span>
              <span className="dim">lvl {hero.level}</span>
              <span className="dim">iLvl {itemLevel(hero.gear)}</span>
              <span className="mono">{Math.round(heroPower(hero))}</span>
              <span className="tiny dim">{hero.injuryDays > 0 ? `out ${hero.injuryDays}d` : `${Math.round(hero.fatigue)} fat`}</span>
            </button>
          );
        })}
      </div>
    </Dialog>
  );
};

const ContentButton = ({
  partyIndex,
  onOpen,
}: {
  partyIndex: number;
  onOpen: () => void;
}) => {
  const game = useGameStore((s) => s.game);
  if (!game) return null;
  const party = game.plan.parties[partyIndex];
  if (!party) return null;
  const content = contentById(party.contentId);
  return (
    <button className="party-target" onClick={onOpen} title="Choose the target">
      <span>{content?.name ?? party.contentId}</span>
      <span className="tiny dim">▾</span>
    </button>
  );
};

const PartyCard = ({
  index,
  onPick,
  onContent,
  onInspect,
}: {
  index: number;
  onPick: (partyIndex: number, replaceId?: string) => void;
  onContent: (partyIndex: number) => void;
  onInspect: (contentId: string) => void;
}) => {
  const game = useGameStore((s) => s.game);
  const dispatch = useGameStore((s) => s.dispatch);
  const selected = useGameStore((s) => s.selectedParty);
  const selectParty = useGameStore((s) => s.selectParty);
  if (!game) return null;
  const party = game.plan.parties[index];
  if (!party) return null;
  const content = contentById(party.contentId);
  if (!content) return null;
  const heroes = partyHeroes(game, index);
  const advice = partyAdvice(game, index);
  const free = freeHeroesFor(game, index).filter((h) => !party.heroes.includes(h.id));
  const rows: SlotRow[] = ["front", "mid", "back"];

  const autoFill = (): void => {
    const pool = freeHeroesFor(game, index);
    const best = fieldableParty(game, content, pool);
    if (!best) return;
    dispatch({
      type: "assign-party",
      assignment: { ...party, heroes: best.map((h) => h.id) },
    });
  };

  const add = (heroId: string): void => {
    if (heroes.length >= content.maxHeroes) return;
    dispatch({ type: "assign-party", assignment: { ...party, heroes: [...party.heroes, heroId] } });
  };

  const remove = (heroId: string): void => {
    if (heroes.length <= content.minHeroes) return;
    dispatch({
      type: "assign-party",
      assignment: { ...party, heroes: party.heroes.filter((id) => id !== heroId) },
    });
  };

  return (
    <section
      className="party-card"
      data-selected={selected === index}
      onClick={() => selectParty(index)}
      aria-label={`Party ${index + 1}`}
    >
      <div className="party-head">
        <span className="party-index">{index + 1}</span>
        <ContentButton partyIndex={index} onOpen={() => onContent(index)} />
        <Chip tone="info">
          {heroes.length}/{content.maxHeroes}
        </Chip>
        <div className="seg" onClick={(event) => event.stopPropagation()}>
          {STANCES.map((stance) => (
            <button
              key={stance.id}
              data-active={party.stance === stance.id}
              onClick={() => dispatch({ type: "set-stance", index, stance: stance.id })}
              title={stance.hint}
            >
              {stance.label}
            </button>
          ))}
        </div>
        <span className="grow" />
        <button
          className="btn btn-sm"
          onClick={(event) => {
            event.stopPropagation();
            autoFill();
          }}
          title="Fill from the best free heroes for this area"
        >
          Auto-fill
        </button>
        <button
          className="btn btn-sm"
          onClick={(event) => {
            event.stopPropagation();
            onInspect(content.id);
          }}
        >
          Inspect
        </button>
      </div>

      <div className="slots">
        {rows.map((row) => {
          const rowHeroes = heroes.filter((h) => slotRowFor(h) === row);
          return (
            <div className="slot-row" key={row}>
              <span className="slot-label">{ROW_LABEL[row]}</span>
              <div className="slot-line">
                {rowHeroes.length === 0 ? <span className="tiny dim">—</span> : null}
                {rowHeroes.map((hero) => (
                  <span
                    className="hero-slot"
                    key={hero.id}
                    data-team={(game.raidTeam ?? []).includes(hero.id)}
                    title={`${hero.name} · ${hero.role} · lvl ${hero.level} · iLvl ${itemLevel(hero.gear)}`}
                  >
                    <button
                      className="btn-ghost"
                      style={{ border: 0, background: "transparent", padding: 0, fontSize: 11 }}
                      onClick={(event) => {
                        event.stopPropagation();
                        onPick(index, hero.id);
                      }}
                      title="Click to swap this hero"
                    >
                      <span className={(game.raidTeam ?? []).includes(hero.id) ? "gold" : ""}>
                        {(game.raidTeam ?? []).includes(hero.id) ? "★ " : ""}
                        {hero.name}
                      </span>
                    </button>
                    <span className="tiny dim">{Math.round(heroPower(hero))}</span>
                    <button
                      className="hero-slot-remove"
                      disabled={heroes.length <= content.minHeroes}
                      onClick={(event) => {
                        event.stopPropagation();
                        remove(hero.id);
                      }}
                      title={
                        heroes.length <= content.minHeroes
                          ? `Needs ${content.minHeroes} heroes`
                          : "Remove from this party"
                      }
                      aria-label={`Remove ${hero.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  className="slot-add"
                  onClick={(event) => {
                    event.stopPropagation();
                    onPick(index);
                  }}
                  disabled={heroes.length >= content.maxHeroes}
                >
                  + add
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bench-line">
        <span className="tiny dim">Bench</span>
        {free.length === 0 ? (
          <span className="tiny dim">— no free hero</span>
        ) : (
          free.map((hero) => (
            <button
              className="bench-chip"
              key={hero.id}
              onClick={(event) => {
                event.stopPropagation();
                add(hero.id);
              }}
              title={`Add ${hero.name} · lvl ${hero.level} · power ${Math.round(heroPower(hero))}`}
              disabled={heroes.length >= content.maxHeroes}
            >
              {hero.name.split(" ")[0]} <span className="dim">{hero.level}</span>
            </button>
          ))
        )}
      </div>

      {advice.warnings.length > 0 ? (
        <div className="card-row" style={{ gap: 6, flexWrap: "wrap" }}>
          {advice.warnings.map((warning) => (
            <Chip key={warning} tone="warn">
              {warning}
            </Chip>
          ))}
        </div>
      ) : null}
    </section>
  );
};

const AddParty = ({ onOpen }: { onOpen: () => void }) => (
  <button
    className="party-card"
    style={{ padding: 18, borderStyle: "dashed", color: "var(--color-muted)", width: "100%", textAlign: "center" }}
    onClick={onOpen}
  >
    + Add a party (max {MAX_PARTIES})
  </button>
);

const ProjectionStrip = () => {
  const game = useGameStore((s) => s.game);
  const selected = useGameStore((s) => s.selectedParty);
  const advance = useGameStore((s) => s.advance);
  const dispatch = useGameStore((s) => s.dispatch);
  if (!game) return null;
  const party = game.plan.parties[selected];
  const projection = partyProjection(game, selected);
  const advice = partyAdvice(game, selected);
  const content = party ? contentById(party.contentId) : null;

  if (!party || !content) {
    return (
      <section className="projection-panel panel-pad">
        <div className="eyebrow">Projection</div>
        <div className="empty" style={{ padding: "18px 0" }}>
          Add a party to see its checks.
        </div>
      </section>
    );
  }

  return (
    <section className="projection-panel">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Projection · party {selected + 1}</div>
          <div className="section-title">{content.name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="tiny dim">best pull</div>
          <div className="big-pull" style={{ color: projection ? undefined : "var(--color-bad)" }}>
            {projection ? `${Math.round(projection.estimatedBestPull * 100)}%` : "—"}
          </div>
        </div>
      </div>
      {projection ? (
        <>
          {projection.phases.map((phase) => {
            const tone =
              phase.ratio >= 1.15 ? "good" : phase.ratio >= 1 ? "info" : phase.ratio >= 0.92 ? "warn" : "bad";
            return (
              <div className="phase-row" key={phase.name}>
                <span className="phase-name">{phase.name}</span>
                <Meter
                  value={Math.min(150, phase.ratio * 100)}
                  max={150}
                  tone={tone as "good" | "warn" | "bad" | "info"}
                />
                <span className="phase-numbers">
                  {phase.value}/{phase.requirement} ·{" "}
                  <span className={`verdict-${phase.verdict}`}>{phase.ratio.toFixed(2)}</span>
                </span>
              </div>
            );
          })}
          <div className="panel-body stack" style={{ gap: 4 }}>
            <div className="spread small">
              <span className="muted">Weakest check</span>
              <span>
                {advice.weakest
                  ? `${advice.weakest.checkLabel} ${advice.weakest.ratio.toFixed(2)}`
                  : "—"}
              </span>
            </div>
            <div className="spread small">
              <span className="muted">Party form</span>
              <span className="mono">{Math.round(projection.form * 100)}%</span>
            </div>
            <div className="spread small">
              <span className="muted">Pay</span>
              <span>
                {content.kind === "mission"
                  ? advice.payScale < 1
                    ? `token · ${Math.round(advice.payScale * 100)}%`
                    : "full contract"
                  : content.kind === "farm"
                    ? `${content.gold}g / hero`
                    : `${content.gold}g`}
              </span>
            </div>
            <div className="tiny dim" style={{ marginTop: 2 }}>
              A failed check banks its ratio toward the best pull. 0.92–1.00 is a scrape: it clears,
              but can roll into a wipe.
            </div>
          </div>
        </>
      ) : (
        <div className="panel-body small muted">
          The party has no check to project. Add heroes, or pick a target.
        </div>
      )}
      <div className="panel-body" style={{ borderTop: "1px solid var(--color-line-soft)" }}>
        <button
          className="btn btn-primary btn-block"
          onClick={advance}
          disabled={game.finished}
          title="Resolve the day with every party as planned"
        >
          {game.finished ? "Run complete" : "Advance day ▸"}
        </button>
        {game.pendingLoot && game.pendingLoot.length > 0 ? (
          <div className="tiny warn" style={{ marginTop: 6 }}>
            {game.pendingLoot.length} drop{game.pendingLoot.length === 1 ? "" : "s"} will take the
            default if you advance.
          </div>
        ) : null}
        {game.plan.parties.length > 0 ? (
          <div style={{ marginTop: 6 }}>
            <ConfirmButton
              label="Rest the whole guild"
              confirmLabel="Confirm: send nobody"
              className="btn btn-ghost btn-sm btn-block"
              onConfirm={() => dispatch({ type: "clear-plan" })}
            >
              Rest the whole guild
            </ConfirmButton>
            <div className="tiny dim" style={{ marginTop: 3, textAlign: "center" }}>
              Removes every party tonight. Fatigue recovers; sharpness drops.
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};

const BoardPanel = () => {
  const game = useGameStore((s) => s.game);
  if (!game) return null;
  const info = contractInfo(game);
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="eyebrow">Contract board</span>
        <span className="tiny dim">{info.tokenPct}% token</span>
      </div>
      <div className="panel-body stack" style={{ gap: 5 }}>
        {info.contracts.length === 0 ? (
          <span className="small dim">No open mission is fieldable today.</span>
        ) : (
          info.contracts.map((contract) => (
            <div className="spread small" key={contract.id}>
              <span>{contract.name}</span>
              <Chip tone="gold">{contract.contractColumn ?? "mission"} · full</Chip>
            </div>
          ))
        )}
        <div className="tiny dim">
          A planned token repeat says so on the party card. First clears are always full.
        </div>
      </div>
    </section>
  );
};

const TeamPanel = ({ onOpen }: { onOpen: () => void }) => {
  const game = useGameStore((s) => s.game);
  const dispatch = useGameStore((s) => s.dispatch);
  if (!game) return null;
  const team = teamLine(game);
  const raid = openRaidContent(game) ?? nextRaidContent(game);
  const avg = averageItemLevel(team);
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="eyebrow">Raid ten</span>
        <span className="tiny dim">{team.length}/10</span>
      </div>
      <div className="panel-body stack" style={{ gap: 7 }}>
        {team.length === 0 ? (
          <span className="small dim">No standing ten yet. It is built at the first open raid; the planner prefers it and loot defaults to it.</span>
        ) : (
          <div className="team-strip">
            {team.map((hero) => (
              <button
                className="team-chip"
                data-team="true"
                key={hero.id}
                title="Remove from the raid ten"
                onClick={() =>
                  dispatch({
                    type: "set-raid-team",
                    heroIds: (game.raidTeam ?? []).filter((id) => id !== hero.id),
                  })
                }
              >
                ★ {hero.name.split(" ")[0]}
              </button>
            ))}
          </div>
        )}
        {raid ? (
          <div className="small dim">
            Next: {raid.name} · recommended iLvl {raid.recommendedIlvl} ·{" "}
            {team.length === 0 ? (
              <span className="warn">no ten yet</span>
            ) : (
              <>
                your ten{" "}
                <span className={avg < raid.recommendedIlvl ? "warn" : "good"}>{avg}</span>
                {avg < raid.recommendedIlvl ? ` (−${raid.recommendedIlvl - avg})` : ""}
              </>
            )}
          </div>
        ) : (
          <div className="small dim">Every open raid is down.</div>
        )}
        <div className="row">
          <button className="btn btn-sm" onClick={() => dispatch({ type: "auto-raid-team" })}>
            Auto ten
          </button>
          <button className="btn btn-sm" onClick={onOpen}>
            Set team
          </button>
          {team.length > 0 ? (
            <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: "set-raid-team", heroIds: [] })}>
              Clear
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
};

const LootStrip = ({ onOpen }: { onOpen: () => void }) => {
  const game = useGameStore((s) => s.game);
  if (!game) return null;
  const loot = game.pendingLoot ?? [];
  if (loot.length === 0) return null;
  const first = loot[0]!;
  const target = game.roster.find((h) => h.id === suggestLootTarget(game, first));
  return (
    <section className="panel" style={{ borderColor: "rgba(214,162,74,0.4)" }}>
      <div className="panel-body">
        <div className="spread">
          <div>
            <div className="eyebrow">Drops waiting</div>
            <div className="small">
              {first.item ?? `${first.slot} ${first.ilvl}`} · iLvl {first.ilvl} —{" "}
              {target ? `${target.name} +${lootUpgrade(target, first)}` : "no positive gain"}
            </div>
          </div>
          <button className="btn btn-sm" onClick={onOpen}>
            Assign
          </button>
        </div>
        <div className="tiny dim" style={{ marginTop: 4 }}>
          Non-blocking. Your pick; the next advance takes the default.
        </div>
      </div>
    </section>
  );
};

export const WarRoomScreen = () => {
  const game = useGameStore((s) => s.game);
  const selected = useGameStore((s) => s.selectedParty);
  const setSelected = useGameStore((s) => s.selectParty);
  const openModal = useGameStore((s) => s.openModal);
  const [contentPicker, setContentPicker] = useState<number | null>(null);
  const [heroPicker, setHeroPicker] = useState<{ index: number; replaceId?: string } | null>(null);
  const [teamPicker, setTeamPicker] = useState(false);

  const choices = useMemo(() => (game ? contentChoices(game) : []), [game]);
  if (!game) return null;

  const openContent = (index: number): void => setContentPicker(index);

  return (
    <div className="stack" style={{ gap: 12 }}>
      <header className="spread">
        <div>
          <h1 className="screen-title">War Room</h1>
          <p className="screen-sub">
            The decision of the day. Pick a target each party can field, set the stance, watch the checks
            move. The projection is the same function the resolution uses.
          </p>
        </div>
        <div className="row-wrap small">
          <Chip tone="info">{choices.length} areas open</Chip>
          <Chip>{game.plan.parties.length} part{game.plan.parties.length === 1 ? "y" : "ies"}</Chip>
          <button
            className="btn btn-sm"
            onClick={() => setSelected((selected + 1) % Math.max(1, game.plan.parties.length))}
          >
            Next party ▸
          </button>
        </div>
      </header>

      <div className="war-grid">
        <div className="war-main">
          {game.plan.parties.map((party, index) => (
            <PartyCard
              key={`${party.contentId}-${index}`}
              index={index}
              onPick={(partyIndex, replaceId) => setHeroPicker({ index: partyIndex, replaceId })}
              onContent={openContent}
              onInspect={(contentId) => openModal({ kind: "inspect", contentId })}
            />
          ))}
          {game.plan.parties.length < MAX_PARTIES ? (
            <AddParty onOpen={() => setContentPicker(game.plan.parties.length)} />
          ) : null}
        </div>
        <aside className="war-side">
          <ProjectionStrip />
          <LootStrip onOpen={() => openModal({ kind: "loot" })} />
          <BoardPanel />
          <TeamPanel onOpen={() => setTeamPicker(true)} />
        </aside>
      </div>

      {contentPicker !== null ? (
        <ContentPicker partyIndex={contentPicker} onClose={() => setContentPicker(null)} />
      ) : null}
      {heroPicker !== null ? (
        <HeroPicker
          partyIndex={heroPicker.index}
          replaceId={heroPicker.replaceId}
          onClose={() => setHeroPicker(null)}
        />
      ) : null}
      {teamPicker ? <TeamPicker onClose={() => setTeamPicker(false)} /> : null}
    </div>
  );
};
