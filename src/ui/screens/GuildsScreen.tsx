import { useState } from "react";
import {
  CLASS_LABEL,
  RAIDS,
  heroPower,
  itemLevel,
  playerRank,
  personalityById,
  poachTargets,
  rivalRaidsCleared,
  roleById,
  rosterCapFor,
  standings,
  type PoachTarget,
  type Rival,
} from "../../sim";
import { useGameStore } from "../../store/gameStore";
import { Chip, ClassIcon } from "../components/Primitives";

const fmt = (value: number): string => Math.round(value).toLocaleString("en-US");

const RivalCard = ({
  rival,
  selected,
  onSelect,
}: {
  rival: Rival;
  selected: boolean;
  onSelect: () => void;
}) => {
  const game = useGameStore((s) => s.game);
  if (!game) return null;
  const board = standings(game);
  const rank = board.findIndex((row) => row.name === rival.name) + 1;
  const score = board.find((row) => row.name === rival.name)?.score ?? 0;
  const raids = rivalRaidsCleared(rival);
  return (
    <button
      className="card-row"
      data-selected={selected}
      onClick={onSelect}
      style={{
        width: "100%",
        textAlign: "left",
        border: selected ? "1px solid var(--color-gold)" : undefined,
        background: selected ? "rgba(216,179,95,0.06)" : undefined,
      }}
    >
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="row" style={{ gap: 6 }}>
          <span style={{ fontWeight: 700 }}>{rival.name}</span>
          <Chip>rank {rank}</Chip>
        </div>
        <div className="tiny dim">{personalityById(rival.personality).blurb} · {rival.activity}</div>
      </div>
      <div className="stack" style={{ alignItems: "flex-end", gap: 2 }}>
        <span className="mono small">{fmt(score)}</span>
        <span className="tiny dim">{raids}/{RAIDS.length} raids · {rival.guild.roster.length} heroes</span>
      </div>
    </button>
  );
};

const HeroRow = ({
  target,
  onOffer,
}: {
  target: PoachTarget;
  onOffer: (target: PoachTarget) => void;
}) => {
  const { hero, rival, fee, wage, affordable, reason } = target;
  const inPlan = rival.guild.plan.parties.some((p) => p.heroes.includes(hero.id));
  const inTen = (rival.guild.raidTeam ?? []).includes(hero.id);
  return (
    <div className="picker-row guild-hero-row" style={{ cursor: "default" }}>
      <span className="row" style={{ gap: 5, minWidth: 0 }}>
        <ClassIcon klass={hero.klass} label={CLASS_LABEL[hero.klass]} />
        <span style={{ fontWeight: 600 }}>{hero.name}</span>
        <span className="tiny dim">{CLASS_LABEL[hero.klass]} · {roleById(hero.role).name}</span>
        {inTen ? <Chip tone="gold">their ten</Chip> : inPlan ? <Chip tone="info">planned</Chip> : null}
      </span>
      <span className="tiny dim">lvl {hero.level}</span>
      <span className="tiny dim">iLvl {itemLevel(hero.gear)}</span>
      <span className="mono tiny">pow {Math.round(heroPower(hero))}</span>
      <span className="mono tiny dim">{wage}g/wk</span>
      <button
        className="btn btn-sm"
        disabled={!affordable}
        onClick={() => onOffer(target)}
        title={reason || `Offer ${fee}g and ${wage}g/week`}
      >
        {affordable ? `Poach ${fmt(fee)}g` : reason}
      </button>
    </div>
  );
};

export const GuildsScreen = () => {
  const game = useGameStore((s) => s.game);
  const dispatch = useGameStore((s) => s.dispatch);
  const [selectedRival, setSelectedRival] = useState<Rival["id"] | null>(null);
  const [offer, setOffer] = useState<PoachTarget | null>(null);
  if (!game) return null;

  const rival = game.rivals.find((r) => r.id === selectedRival) ?? game.rivals[0];
  const targets = rival ? poachTargets(game, rival.id) : [];
  const cap = rosterCapFor(game.facilities);

  return (
    <div className="stack" style={{ gap: 14 }}>
      <header className="spread">
        <div>
          <h1 className="screen-title">The other guilds</h1>
          <p className="screen-sub">
            Read their rosters. A signing costs the fee on the button and puts that hero on your payroll.
            They answer eventually.
          </p>
        </div>
        <div className="row-wrap small">
          <Chip tone="gold">rank {playerRank(game)} of {game.rivals.length + 1}</Chip>
          <Chip>roster {game.roster.length}/{cap}</Chip>
          <Chip>gold {fmt(game.gold)}g</Chip>
        </div>
      </header>

      {game.rivals.length === 0 ? (
        <div className="empty">No rival guilds in this save.</div>
      ) : (
        <div className="guild-grid">
          <div className="stack" style={{ gap: 8 }}>
            <div className="eyebrow">Guilds</div>
            {game.rivals.map((row) => (
              <RivalCard
                key={row.id}
                rival={row}
                selected={row.id === rival?.id}
                onSelect={() => setSelectedRival(row.id)}
              />
            ))}
            <div className="tiny dim">
              Rivals also sign each other's bench. The report names a move when it happens.
            </div>
          </div>

          <section className="panel">
            {rival ? (
              <>
                <div className="panel-head">
                  <div>
                    <div className="eyebrow">{rival.name}</div>
                    <div className="section-title">{personalityById(rival.personality).name}</div>
                  </div>
                  <div className="row-wrap">
                    <Chip>{rivalRaidsCleared(rival)}/{RAIDS.length} raids</Chip>
                    <Chip>{rival.guild.roster.length} heroes</Chip>
                  </div>
                </div>
                <div className="panel-body stack" style={{ gap: 8 }}>
                  <div className="small muted">{rival.activity}</div>
                  {offer ? (
                    <div className="panel-2" style={{ padding: 10 }}>
                      <div className="spread">
                        <div>
                          <div className="small" style={{ fontWeight: 600 }}>
                            Sign {offer.hero.name} from {offer.rival.name}?
                          </div>
                          <div className="tiny dim">
                            {offer.fee}g fee · {offer.wage}g/week · level {offer.hero.level} ·{" "}
                            {CLASS_LABEL[offer.hero.klass]} {roleById(offer.hero.role).name}
                          </div>
                        </div>
                        <div className="row" style={{ gap: 6 }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              const ok = dispatch({
                                type: "poach",
                                rivalId: offer.rival.id,
                                heroId: offer.hero.id,
                              });
                              if (ok) setOffer(null);
                            }}
                          >
                            Sign for {fmt(offer.fee)}g
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setOffer(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <div className="hero-picker" style={{ maxHeight: 520 }}>
                    {targets.map((target) => (
                      <HeroRow key={target.hero.id} target={target} onOffer={setOffer} />
                    ))}
                  </div>
                  <div className="tiny dim">
                    A poached hero leaves their plan and their raid ten. The fee is the tavern's price
                    for his level times 1.5; the wage is the market rate plus 25%.
                  </div>
                </div>
              </>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
};
