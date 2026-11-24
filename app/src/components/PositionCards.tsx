import type { Position } from "../data/demoSeed";

type Props = {
  positions: Position[];
  onSelect: (id: string) => void;
  selectedId: string;
};

export function PositionCards({ positions, onSelect, selectedId }: Props) {
  return (
    <section id="positions" className="panel">
      <header className="panel-head">
        <div>
          <h2>Protected positions</h2>
          <p className="muted">Multi-token vault · fixed or trailing stops</p>
        </div>
      </header>
      <div className="card-grid">
        {positions.map((p) => (
          <PositionCard
            key={p.id}
            position={p}
            active={p.id === selectedId}
            onSelect={() => onSelect(p.id)}
          />
        ))}
      </div>
    </section>
  );
}

function PositionCard({
  position,
  active,
  onSelect,
}: {
  position: Position;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      className={`position-card ${active ? "active" : ""} status-${position.status}`}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
    >
      <div className="card-top">
        <span className="token-badge">{position.token}</span>
        <StatusChip status={position.status} />
      </div>
      <p className="amount mono">
        {position.amount} {position.token}
      </p>
      <dl className="card-meta">
        <span>
          <dt>Stop</dt>
          <dd>{position.stopType === "fixed" ? "Fixed" : `Trailing ${position.trailPct}%`}</dd>
        </span>
        <span>
          <dt>High</dt>
          <dd className="mono">${position.highWater.toLocaleString()}</dd>
        </span>
        <span>
          <dt>Level</dt>
          <dd className="mono accent">${position.stopLevel.toLocaleString()}</dd>
        </span>
      </dl>
      <footer className="card-foot">
        <span className="mono safe">{position.safeAddress}</span>
        {position.swapToStable && <span className="chip">Swap → stable</span>}
      </footer>
    </article>
  );
}

function StatusChip({ status }: { status: Position["status"] }) {
  const label = status === "armed" ? "Armed" : status === "triggered" ? "Triggered" : "Landed";
  return <span className={`status-chip ${status}`}>{label}</span>;
}