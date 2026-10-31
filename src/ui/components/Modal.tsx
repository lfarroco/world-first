import { useEffect, useState, type ReactNode } from "react";

export const Modal = ({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) => {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`modal${wide ? " wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : "Dialog"}
      >
        <div className="modal-head">
          <div>
            <h2 className="section-title">{title}</h2>
            {subtitle ? <div className="small muted" style={{ marginTop: 2 }}>{subtitle}</div> : null}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
};

export const ConfirmButton = ({
  label,
  confirmLabel = "Confirm",
  onConfirm,
  children,
  className = "btn btn-danger",
}: {
  label: string;
  confirmLabel?: string;
  onConfirm: () => void;
  children?: ReactNode;
  className?: string;
}) => {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(timer);
  }, [armed]);
  return (
    <button
      className={className}
      onClick={() => {
        if (armed) onConfirm();
        else setArmed(true);
      }}
      title={armed ? "Click again to confirm" : label}
    >
      {armed ? confirmLabel : (children ?? label)}
    </button>
  );
};

