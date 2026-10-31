import type { GameEvent } from "../../sim";

const MARK: Record<GameEvent["severity"], string> = {
  good: "✓",
  info: "·",
  bad: "✗",
};

export const EventLine = ({ event }: { event: GameEvent }) => (
  <div className="digest-line">
    <span className={`digest-mark ${event.severity === "good" ? "good" : event.severity === "bad" ? "bad" : "dim"}`}>
      {MARK[event.severity]}
    </span>
    <span>{event.text}</span>
  </div>
);

export const EventMark = ({ severity }: { severity: GameEvent["severity"] }) => (
  <span className={severity === "good" ? "good" : severity === "bad" ? "bad" : "dim"}>{MARK[severity]}</span>
);
