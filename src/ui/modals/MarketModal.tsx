import { useState } from "react";
import {
  CLASS_LABEL,
  MARKET_GOODS,
  itemLevel,
  marketGearIlvl,
  marketGoodApplies,
  marketPrice,
  rosterCapFor,
  type Hero,
  type MarketGood,
  type MarketGoodId,
} from "../../sim";
import { useGameStore } from "../../store/gameStore";
import { Art } from "../components/Art";
import { Modal } from "../components/Modal";
import { Chip, ClassIcon } from "../components/Primitives";

const fmt = (value: number): string => Math.round(value).toLocaleString("en-US");

const HeroLine = ({ hero }: { hero: Hero }) => (
  <span className="row" style={{ gap: 5, minWidth: 0 }}>
    <ClassIcon klass={hero.klass} label={CLASS_LABEL[hero.klass]} />
    <span style={{ fontWeight: 600 }}>{hero.name}</span>
    <span className="tiny dim">lvl {hero.level}</span>
    <span className="tiny dim">iLvl {itemLevel(hero.gear)}</span>
    {hero.injuryDays > 0 ? <Chip tone="bad">out {hero.injuryDays}d</Chip> : null}
    {hero.fatigue >= 70 ? <Chip tone="warn">fatigue {Math.round(hero.fatigue)}</Chip> : null}
  </span>
);

const GoodRow = ({
  good,
  price,
  selected,
  onSelect,
}: {
  good: MarketGood;
  price: number;
  selected: boolean;
  onSelect: () => void;
}) => (
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
    <Art base={`/art/items/${good.id}`} alt="" width={36} height={36} className="item-icon" />
    <div className="grow" style={{ minWidth: 0 }}>
      <div className="row" style={{ gap: 6 }}>
        <span className="small" style={{ fontWeight: 600 }}>{good.name}</span>
        <span className="mono tiny gold">{fmt(price)}g</span>
      </div>
      <div className="tiny dim">{good.blurb}</div>
    </div>
  </button>
);

export const MarketModal = ({ onClose }: { onClose: () => void }) => {
  const game = useGameStore((s) => s.game);
  const dispatch = useGameStore((s) => s.dispatch);
  const [selectedId, setSelectedId] = useState<MarketGoodId>("salve");
  if (!game) return null;

  const cap = rosterCapFor(game.facilities);
  const full = game.roster.length >= cap;
  const good = MARKET_GOODS.find((row) => row.id === selectedId) ?? MARKET_GOODS[0]!;
  const price = marketPrice(game, good);
  const gearIlvl = marketGearIlvl(game);

  const heroes = game.roster
    .map((hero) => ({
      hero,
      price: marketPrice(game, good, hero),
      applies: marketGoodApplies(game, good, hero),
    }))
    .sort((a, b) => Number(b.applies) - Number(a.applies) || a.hero.level - b.hero.level);

  return (
    <Modal
      title="The market"
      subtitle={`${fmt(game.gold)}g · gear tier iLvl ${gearIlvl} · roster ${game.roster.length}/${cap}`}
      onClose={onClose}
      wide
      footer={
        <>
          <span className="tiny dim grow">
            {full
              ? "The roster is full. Gear, salves, rations and tonics still work."
              : "Gear tracks your best hero. Consumables act immediately; the tonic lasts three days."}
          </span>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <div className="market-grid">
        <div className="stack" style={{ gap: 5 }}>
          <div className="eyebrow">Stock</div>
          {MARKET_GOODS.map((row) => (
            <GoodRow
              key={row.id}
              good={row}
              price={marketPrice(game, row)}
              selected={row.id === good.id}
              onSelect={() => setSelectedId(row.id)}
            />
          ))}
        </div>
        <div className="stack" style={{ gap: 5 }}>
          <div className="spread">
            <span className="eyebrow">{good.name}</span>
            <span className="mono small gold">{fmt(price)}g</span>
          </div>
          <div className="tiny dim">{good.blurb}</div>
          {good.kind === "gear" ? (
            <div className="tiny dim">
              This tier sells {good.slot} iLvl {gearIlvl}. A hero below that gains the difference.
            </div>
          ) : null}
          <div className="hero-picker" style={{ maxHeight: 360 }}>
            {heroes.length === 0 ? (
              <div className="empty">No hero in the roster.</div>
            ) : (
              heroes.map(({ hero, price: heroPrice, applies }) => {
                const affordable = game.gold >= heroPrice;
                const disabled = !applies || !affordable;
                return (
                  <div className="picker-row market-hero-row" key={hero.id} style={{ cursor: "default" }}>
                    <HeroLine hero={hero} />
                    <span className="mono tiny">
                      {good.kind === "gear"
                        ? `${good.slot} ${hero.gear[good.slot!]} → ${gearIlvl}`
                        : good.kind === "salve"
                          ? `${hero.injuryDays}d out`
                          : good.kind === "rations"
                            ? `fatigue ${Math.round(hero.fatigue)}`
                            : `${(hero.buffDays ?? 0) > 0 ? `buff ${hero.buffDays}d` : "no buff"}`}
                    </span>
                    <button
                      className="btn btn-sm"
                      disabled={disabled}
                      onClick={() => dispatch({ type: "buy-good", goodId: good.id, heroId: hero.id })}
                      title={
                        !applies
                          ? "Nothing to change for this hero"
                          : game.gold < heroPrice
                            ? `Need ${heroPrice}g`
                            : `Buy for ${hero.name}`
                      }
                    >
                      {good.kind === "gear"
                        ? applies
                          ? `Buy ${fmt(heroPrice)}g`
                          : "no upgrade"
                        : !applies
                          ? "nothing to do"
                          : `Buy ${fmt(heroPrice)}g`}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
