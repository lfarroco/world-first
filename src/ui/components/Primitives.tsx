import type { ReactNode } from "react";

export const Meter = ({
  value,
  tone = "good",
  label,
  max = 100,
}: {
  value: number;
  tone?: "good" | "warn" | "bad" | "info";
  label?: string;
  max?: number;
}) => {
  const clamped = Math.max(0, Math.min(max, value));
  const width = max === 0 ? 0 : (clamped / max) * 100;
  return (
    <div className="meter-row">
      <div className={`meter ${tone}`} role="meter" aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
        <div className="meter-fill" style={{ width: `${width}%` }} />
      </div>
      {label ? <span className="mono">{label}</span> : null}
    </div>
  );
};

export const Chip = ({
  children,
  tone,
  title,
  onClick,
}: {
  children: ReactNode;
  tone?: "good" | "warn" | "bad" | "info" | "gold";
  title?: string;
  onClick?: () => void;
}) => (
  <span
    className={`chip${tone ? ` ${tone}` : ""}${onClick ? " chip-button" : ""}`}
    title={title}
    onClick={onClick}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={
      onClick
        ? (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onClick();
            }
          }
        : undefined
    }
  >
    {children}
  </span>
);

export const ClassIcon = ({ klass, label }: { klass: string; label: string }) => (
  <span className={`class-dot class-${klass}`} title={label} aria-hidden="true">
    {label.slice(0, 1)}
  </span>
);
