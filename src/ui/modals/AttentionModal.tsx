import { blockingAttention, type AttentionItem } from "../../sim";
import { useGameStore } from "../../store/gameStore";
import { Modal } from "../components/Modal";
import { Chip } from "../components/Primitives";

const KIND_LABEL: Record<AttentionItem["kind"], string> = {
  "benched-unhappy": "Roster",
  "contract-expiring": "Contract",
  "contract-counter": "Contract",
  "transfer-request": "Transfer",
  "wage-over-budget": "Finances",
  "fatigue-risk": "Condition",
  "promise-due": "Promise",
  "loot-pending": "Loot",
  event: "Event",
};

const ItemCard = ({ item }: { item: AttentionItem }) => {
  const resolveAttention = useGameStore((s) => s.resolveAttention);
  return (
    <div className={`attention-card ${item.blocking ? "" : "fyi"}`} style={{ marginTop: 10 }}>
      <div className="spread">
        <div className="row" style={{ gap: 7 }}>
          <Chip tone={item.blocking ? "warn" : undefined}>{KIND_LABEL[item.kind]}</Chip>
          <span className="attention-title">{item.title}</span>
        </div>
        <span className="tiny dim">{item.blocking ? "blocks advance" : "fyi"}</span>
      </div>
      <div className="attention-detail">{item.detail}</div>
      <div className="attention-actions">
        {item.options.map((option) => (
          <button
            key={option.key}
            className={`btn btn-sm ${option.key === "ignore" || option.key === "ack" ? "btn-ghost" : ""}`}
            onClick={() => resolveAttention(item.id, option.key)}
            title={`Option key: ${option.key}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export const AttentionModal = ({ onClose }: { onClose: () => void }) => {
  const game = useGameStore((s) => s.game);
  if (!game) return null;
  const blocking = blockingAttention(game);
  const fyi = game.attention.filter((i) => !i.blocking);

  return (
    <Modal
      title="The queue"
      subtitle="At most three items block the day. Every option shows its consequence before you commit."
      onClose={onClose}
      footer={
        <>
          <span className="tiny dim grow">
            {blocking.length === 0
              ? "Nothing is blocking. Close this and advance."
              : `${blocking.length} blocking item${blocking.length === 1 ? "" : "s"} left.`}
          </span>
          <button className="btn" onClick={onClose}>
            {blocking.length === 0 ? "Close" : "Close for now"}
          </button>
        </>
      }
    >
      {game.attention.length === 0 ? (
        <div className="empty">Nothing needs you. The day is ready.</div>
      ) : null}
      {blocking.length > 0 ? <div className="eyebrow">Needs you</div> : null}
      {blocking.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
      {fyi.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <div className="eyebrow">FYI · never blocks the day</div>
          {fyi.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : null}
    </Modal>
  );
};
