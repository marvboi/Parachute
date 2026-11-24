import { motion } from "framer-motion";
import type { Position } from "../data/demoSeed";
import { PROOF_PRICES, buildPriceSeries, buildDemoTimeline } from "../data/demoSeed";
import { useMotionSafe } from "../lib/motion";
import { CrossChainTimeline } from "./CrossChainTimeline";
import { TokenIcon } from "./TokenIcon";
import { Capsule } from "../fall/svg/Capsule";

type Props = {
  positions: Position[];
  onSelect: (id: string) => void;
  selectedId: string;
};

function miniLinePath(token: Position["token"]): string {
  const base = PROOF_PRICES[token];
  const pts = buildPriceSeries(base, 20);
  const w = 140;
  const h = 56;
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

function triggerDistance(position: Position): number {
  const spot = PROOF_PRICES[position.token];
  const dist = spot - position.stopLevel;
  const range = position.highWater - position.stopLevel;
  return Math.min(100, Math.max(8, 100 - (dist / range) * 100));
}

const intensity = (d: number) => `rgba(255, 91, 31, ${0.25 + (d / 100) * 0.65})`;

export function PositionCards({ positions, onSelect, selectedId }: Props) {
  return (
    <section id="positions" className="panel panel-app positions-panel">
      <header className="panel-head">
        <div>
          <h2>Protected positions</h2>
          <p className="muted">Multi-token vault · fixed or trailing stops</p>
        </div>
      </header>
      <div className="capsule-positions">
        {positions.map((p, i) => (
          <CapsulePositionCard
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

function CapsulePositionCard({
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
  const dist = triggerDistance(position);
  const spot = PROOF_PRICES[position.token];
  const line = miniLinePath(position.token);
  const showTimeline = position.status === "triggered";

  return (
    <motion.article
      className={`capsule-position ${active ? "active" : ""} state-${position.status}`}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...tween, delay: index * stagger }}
    >
      <div className="capsule-pos-head">
        <TokenIcon symbol={position.token} size={22} />
        <StatusChip status={position.status} />
      </div>
      <div className="capsule-pos-svg">
        <svg viewBox="0 0 140 56" className="capsule-line-svg">
          <path d={line} fill="none" stroke="#14161C" strokeWidth="1.2" opacity="0.85" />
          <line
            x1="0"
            y1={40}
            x2="140"
            y2={40}
            stroke="#FF5B1F"
            strokeDasharray="3 3"
            opacity="0.45"
          />
          <g transform="translate(110, 22)">
            <Capsule x={0} y={0} scale={0.85} tokenGlyph={position.token.slice(0, 1)} />
          </g>
          {position.status === "triggered" && (
            <path d="M100 10 Q115 0 130 10" fill="rgba(255,91,31,0.5)" stroke="#FF5B1F" strokeWidth="0.8" />
          )}
        </svg>
      </div>
      <p className="tabular pos-amount">
        {position.amount} {position.token}
      </p>
      <dl className="capsule-metrics tabular stats-row-3">
        <div className="stat-cell">
          <dt>Price</dt>
          <dd className="live-value">${spot.toFixed(2)}</dd>
        </div>
        <div className="stat-cell">
          <dt>Peak</dt>
          <dd>${position.highWater.toLocaleString()}</dd>
        </div>
        <div className="stat-cell">
          <dt>Stop</dt>
          <dd>${position.stopLevel.toLocaleString()}</dd>
        </div>
      </dl>
      <div className="trigger-distance">
        <span>Trigger distance</span>
        <div className="trigger-track">
          <div className="trigger-fill" style={{ width: `${dist}%`, background: intensity(dist) }} />
        </div>
      </div>
      <p className="pos-stop-type">
        {position.stopType === "fixed" ? "Fixed" : `Trailing ${position.trailPct}%`}
      </p>
      {showTimeline && (
        <div className="pos-trigger-timeline">
          <CrossChainTimeline steps={buildDemoTimeline(position.token)} compact />
        </div>
      )}
    </motion.article>
  );
}

function StatusChip({ status }: { status: Position["status"] }) {
  const label = status === "armed" ? "Armed" : status === "triggered" ? "Triggered" : "Landed";
  return <span className={`status-chip glow-mint ${status}`}>{label}</span>;
}