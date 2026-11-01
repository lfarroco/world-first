import { MARKET, craftCost, lootSellValue, lootTargets, type PendingLoot } from "../../sim";
import { useGameStore } from "../../store/gameStore";
import { Art, itemArtId } from "../components/Art";
import { Modal } from "../components/Modal";
import { Chip } from "../components/Primitives";

export const DropRow = ({ drop }: { drop: PendingLoot }) => {
  const game = useGameStore((s) => s.game);
  const dispatch = useGameStore((s) => s.dispatch);
  if (!game) return null;
  const targets = lootTargets(game, drop, 3);
  const top = targets[0];
  const sell = lootSellValue(drop);
  const forge = craftCost(drop);
  return (
    <div className="loot-row">
      <Art
        base={`/art/items/${drop.item ? itemArtId(drop.item) : `gear-${drop.slot}`}`}
        alt=""
        width={38}
        height={38}
        className="item-icon"
        title={drop.item ?? `${drop.slot} iLvl ${drop.ilvl}`}
      />
      <div style={{ minWidth: 160 }}>
        <div className="small" style={{ fontWeight: 600 }}>
          {drop.item ?? `${drop.slot} ${drop.ilvl}`}
        </div>
        <div className="tiny dim">
          {drop.slot} · iLvl {drop.ilvl} · from {drop.contentName}
        </div>
      </div>
      <div className="row-wrap" style={{ gap: 5 }}>
        {top ? <Chip tone="gold">suggested: {top.hero.name.split(" ")[0]} +{top.gain}</Chip> : <Chip tone="warn">no gain</Chip>}
        {targets.map((target) => (
          <button
            key={target.hero.id}
            className="btn btn-sm"
            onClick={() => dispatch({ type: "assign-loot", lootId: drop.id, heroId: target.hero.id })}
            title={`${target.hero.gear[drop.slot]} → ${drop.ilvl} (+${target.gain}) · morale is unaffected`}
          >
            {target.hero.name.split(" ")[0]} +{target.gain}
          </button>
        ))}
        {top ? (
          <button
            className="btn btn-sm"
            disabled={game.gold < forge}
            onClick={() => dispatch({ type: "craft-loot", lootId: drop.id, heroId: top.hero.id })}
            title={`Forge it for ${top.hero.name}: ${drop.slot} +${MARKET.craftGain} over the better of the drop and his current gear. Costs ${forge}g.`}
          >
            Forge +{MARKET.craftGain} ({forge}g)
          </button>
        ) : null}
        <button
          className="btn btn-sm"
          onClick={() => dispatch({ type: "sell-loot", lootId: drop.id })}
          title={`Sell this drop for ${sell}g`}
        >
          Sell {sell}g
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => dispatch({ type: "discard-loot", lootId: drop.id })}
          title="Discard this drop"
        >
          Discard
        </button>
      </div>
    </div>
  );
};

export const LootModal = ({ onClose }: { onClose: () => void }) => {
  const game = useGameStore((s) => s.game);
  const dispatch = useGameStore((s) => s.dispatch);
  if (!game) return null;
  const loot = game.pendingLoot ?? [];

  return (
    <Modal
      title="Assign the drops"
      subtitle="A clear queues untargeted drops. The suggestion favours need and the raid ten, but a bench hero with a much larger gain still wins."
      onClose={onClose}
      wide
      footer={
        <>
          <span className="tiny dim grow">
            {loot.length === 0 ? "Every drop is assigned." : "The next advance takes the default for anything left."}
          </span>
          <button className="btn" onClick={onClose}>
            Close
          </button>
          {loot.length > 0 ? (
            <button className="btn btn-primary" onClick={() => dispatch({ type: "auto-loot" })}>
              Auto — need pick
            </button>
          ) : null}
        </>
      }
    >
      {loot.length === 0 ? (
        <div className="empty">No drops waiting. The queue is empty.</div>
      ) : (
        <div>
          {loot.map((drop) => (
            <DropRow key={drop.id} drop={drop} />
          ))}
          <div className="tiny dim" style={{ marginTop: 8 }}>
            The suggestion is worked out again for each drop, so two drops for the same slot can go to two heroes. Sell a drop for gold, or spend gold at the forge to turn it into +6 over the better gear. A drop with no gain is discarded.
          </div>
        </div>
      )}
    </Modal>
  );
};
