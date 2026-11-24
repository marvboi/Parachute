import { motion } from "framer-motion";
import type { Position } from "../data/demoSeed";
import { PROOF_PRICES, buildPriceSeries } from "../data/demoSeed";
import { useMotionSafe } from "../lib/motion";
import { TokenIcon } from "./TokenIcon";

type Props = {
  positions: Position[];
  onSelect: (id: string) => void;
  selectedId: string;
};

function sparklinePoints(position: Position): string {
  const base = PROOF_PRICES[position.token] * (0.98 + position.amount * 0.001);
  const pts = buildPriceSeries(base, 24);
  const w = 80;
  const h = 22;
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  return pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function progressToStop(position: Position): number {
  const spot = PROOF_PRICES[position.token];
  if (position.status === "landed" || position.status === "triggered") return 100;
  const range = position.highWater - position.stopLevel;
  if (range <= 0) return 0;
  const traveled = position.highWater - spot;
  return Math.min(100, Math.max(4, (traveled / range) * 100));
}

export function PositionCards({ positions, onSelect, selectedId }: Props) {
  return (
    <section id="positions" className="panel glass positions-panel">
      <header className="panel-head">
        <div>
          <h2>Protected positions</h2>
          <p className="muted">Multi-token vault · fixed or trailing stops</p>
        </div>
      </header>
      <div className="card-grid rich">
        {positions.map((p, i) => (
          <PositionCard
            key={p.id}
            position={p}
            active={p.id === selectedId}
            index={i}
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
  index,
  onSelect,
}: {
  position: Position;
  active: boolean;
  index: number;
  onSelect: () => void;
}) {
  const { tween, stagger, reduce } = useMotionSafe();
  const progress = progressToStop(position);

  return (
    <motion.article
      className={`position-card rich ${active ? "active" : ""} status-${position.status}`}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      layout
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...tween, delay: index * stagger }}
      whileHover={reduce ? {} : { y: -3 }}
    >
      <div className="card-top">
        <span className="token-row">
          <TokenIcon symbol={position.token} size={28} />
          <span className="token-badge">{position.token}</span>
        </span>
        <StatusChip status={position.status} />
      </div>
      <p className="amount tabular">
        {position.amount} {position.token}
      </p>
      <svg viewBox="0 0 80 22" className="sparkline" aria-hidden>
        <defs>
          <linearGradient id={`sp-${position.id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FF5B1F" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FF5B1F" />
          </linearGradient>
        </defs>
        <path d={sparklinePoints(position)} fill="none" stroke={`url(#sp-${position.id})`} strokeWidth="1.4" />
      </svg>
      <div className="progress-stop">
        <div className="progress-label">
          <span>Progress to stop</span>
          <span className="tabular">{progress.toFixed(0)}%</span>
        </div>
        <div className="progress-track">
          <motion.div
            className="progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={tween}
          />
        </div>
      </div>
      <dl className="card-meta">
        <span>
          <dt>Stop</dt>
          <dd>{position.stopType === "fixed" ? "Fixed" : `Trailing ${position.trailPct}%`}</dd>
        </span>
        <span>
          <dt>High</dt>
          <dd className="tabular">${position.highWater.toLocaleString()}</dd>
        </span>
        <span>
          <dt>Level</dt>
          <dd className="tabular accent">${position.stopLevel.toLocaleString()}</dd>
        </span>
      </dl>
      <footer className="card-foot">
        <span className="tabular safe">{position.safeAddress}</span>
        {position.swapToStable && <span className="chip glass-pill">Swap → stable</span>}
      </footer>
    </motion.article>
  );
}

function StatusChip({ status }: { status: Position["status"] }) {
  const label = status === "armed" ? "Armed" : status === "triggered" ? "Triggered" : "Landed";
  return <span className={`status-chip glow ${status}`}>{label}</span>;
}