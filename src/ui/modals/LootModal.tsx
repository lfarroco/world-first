import { lootTargets, type PendingLoot } from "../../sim";
import { useGameStore } from "../../store/gameStore";
import { Modal } from "../components/Modal";
import { Chip } from "../components/Primitives";

const DropRow = ({ drop }: { drop: PendingLoot }) => {
  const game = useGameStore((s) => s.game);
  const dispatch = useGameStore((s) => s.dispatch);
  if (!game) return null;
  const targets = lootTargets(game, drop, 3);
  const top = targets[0];
  return (
    <div className="loot-row">
      <div style={{ minWidth: 180 }}>
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
      subtitle="A clear queues untargeted drops. The suggestion is need plus a small raid-ten bias; a bench hero with a much larger gain still wins."
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
            The suggested hero is recomputed per drop, so two same-slot drops can both find a home. A drop
            with no positive gain is discarded at queue time or by Auto.
          </div>
        </div>
      )}
    </Modal>
  );
};
