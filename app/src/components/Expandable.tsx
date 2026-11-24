import { useId, useState, type ReactNode } from "react";
import { useMotionSafe } from "../lib/motion";

type Props = {
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  size?: "sm" | "md";
};

export function Expandable({ summary, children, defaultOpen = false, className = "", size = "md" }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const { reduce } = useMotionSafe();
  const panelId = useId();

  return (
    <div className={`expandable ${size} ${open ? "is-open" : ""} ${className}`.trim()}>
      <button
        type="button"
        className="expandable-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="expandable-summary">{summary}</span>
        <span className="expandable-chevron" aria-hidden />
      </button>
      <div
        id={panelId}
        className={`expandable-panel ${reduce ? "reduce-motion" : ""}`}
        data-open={open || undefined}
        aria-hidden={!open}
      >
        <div className="expandable-inner">{children}</div>
      </div>
    </div>
  );
}

type StepProps = {
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

/** Accordion step inside multi-step forms — one section at a time feel. */
export function FormFlowStep({
  step,
  title,
  subtitle,
  children,
  defaultOpen = false,
  open,
  onRequestToggle,
}: StepProps & { open?: boolean; onRequestToggle?: () => void }) {
  const controlled = open !== undefined;
  const [internal, setInternal] = useState(defaultOpen);
  const isOpen = controlled ? open : internal;
  const { reduce } = useMotionSafe();
  const bodyId = useId();

  const toggle = () => {
    if (controlled) onRequestToggle?.();
    else setInternal((v) => !v);
  };

  return (
    <div className={`form-flow-step glass-inset ${isOpen ? "is-open" : ""}`}>
      <button
        type="button"
        className="form-flow-step-head"
        aria-expanded={isOpen}
        aria-controls={bodyId}
        onClick={toggle}
      >
        <span className="form-flow-step-num tabular">{step}</span>
        <span className="form-flow-step-titles">
          <span className="form-flow-step-title">{title}</span>
          {subtitle && !isOpen && <span className="form-flow-step-sub muted">{subtitle}</span>}
        </span>
        <span className="expandable-chevron" aria-hidden />
      </button>
      <div
        id={bodyId}
        className={`expandable-panel form-flow-step-body ${reduce ? "reduce-motion" : ""}`}
        data-open={isOpen || undefined}
        aria-hidden={!isOpen}
      >
        <div className="expandable-inner">{children}</div>
      </div>
    </div>
  );
}