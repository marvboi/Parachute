import { motion } from "framer-motion";
import type { Position } from "../data/demoSeed";
import { PROOF_PRICES, buildDemoTimeline, buildLiveTimeline } from "../data/demoSeed";
import { buildPositionMiniViz } from "../lib/positionViz";
import { contracts, explorerAddress } from "../config/contracts";
import { useMotionSafe } from "../lib/motion";
import { CrossChainTimeline } from "./CrossChainTimeline";
import { TokenIcon } from "./TokenIcon";
import { Capsule } from "../fall/svg/Capsule";

type Props = {
  positions: Position[];
  onSelect: (id: string) => void;
  selectedId: string;
  liveSource?: boolean;
};

function triggerDistance(position: Position): number {
  const spot = position.liveSpot ?? PROOF_PRICES[position.token];
  const dist = spot - position.stopLevel;
  const range = position.highWater - position.stopLevel;
  return Math.min(100, Math.max(8, 100 - (dist / range) * 100));
}

const intensity = (d: number) => `rgba(255, 91, 31, ${0.25 + (d / 100) * 0.65})`;

export function PositionCards({ positions, onSelect, selectedId, liveSource }: Props) {
  return (
    <section id="positions" className="panel panel-app positions-panel">
      <header className="panel-head">
        <div>
          <h2>Protected positions</h2>
          <p className="muted">Multi-token vault · fixed or trailing stops</p>
          {liveSource && (
            <p className="onchain-links muted">
              <a href={explorerAddress("baseSepolia", contracts.vault)} target="_blank" rel="noreferrer">
                Vault
              </a>
              {" · "}
              <a href={explorerAddress("lasna", contracts.reactive)} target="_blank" rel="noreferrer">
                Reactive
              </a>
            </p>
          )}
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
  const spot = position.liveSpot ?? PROOF_PRICES[position.token];
  const viz = buildPositionMiniViz(position, spot);
  const showTimeline = position.status === "triggered" || (position.onChain && position.status === "armed");
  const armed = position.status === "armed";

  return (
    <motion.article
      className={`capsule-position ${active ? "active" : ""} state-${position.status} ${armed ? "is-armed" : ""}`}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, scale: active ? 1.01 : 1 }}
      whileTap={reduce ? {} : { scale: 0.992 }}
      transition={{ ...tween, delay: index * stagger }}
      layout={!reduce}
    >
      {armed && <span className="armed-aura" aria-hidden />}
      <div className="capsule-pos-head">
        <TokenIcon symbol={position.token} size={22} />
        <StatusChip status={position.status} />
      </div>
      <div className="capsule-pos-svg">
        <svg viewBox={`0 0 ${viz.w} ${viz.h}`} className="capsule-line-svg">
          <defs>
            <linearGradient id={`pos-fill-${position.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1f9d6b" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#e5484d" stopOpacity="0.06" />
            </linearGradient>
          </defs>
          <line x1="0" x2={viz.w} y1={viz.highY} y2={viz.highY} className="viz-high-tick" />
          <path d={viz.zonePath} fill={`url(#pos-fill-${position.id})`} opacity="0.9" />
          <path d={viz.stopPath} className="viz-stop-line" />
          <path d={viz.pricePath} className="viz-price-line" />
          <motion.circle
            cx={viz.dotX}
            cy={viz.dotY}
            r="3.2"
            className="viz-price-dot"
            animate={reduce || !armed ? {} : { opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <g transform={`translate(${viz.dotX - 12}, ${viz.dotY + 4})`}>
            <Capsule x={0} y={0} scale={0.72} tokenGlyph={position.token.slice(0, 1)} />
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
        <div className="trigger-track" role="progressbar" aria-valuenow={Math.round(dist)} aria-valuemin={0} aria-valuemax={100}>
          <motion.div
            className="trigger-fill"
            initial={false}
            animate={{ width: `${dist}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 22 }}
            style={{ background: intensity(dist) }}
          />
          {armed && <span className="trigger-needle" style={{ left: `${dist}%` }} aria-hidden />}
        </div>
      </div>
      <p className="pos-stop-type">
        {position.stopType === "fixed" ? "Fixed" : `Trailing ${position.trailPct}%`}
      </p>
      {showTimeline && (
        <div className="pos-trigger-timeline">
          <CrossChainTimeline
            steps={
              position.onChain
                ? buildLiveTimeline(position.token, position.vaultId)
                : buildDemoTimeline(position.token)
            }
            compact
          />
        </div>
      )}
    </motion.article>
  );
}

function StatusChip({ status }: { status: Position["status"] }) {
  const label =
    status === "armed"
      ? "Armed"
      : status === "triggered"
        ? "Triggered"
        : status === "idle"
          ? "Idle"
          : "Landed";
  return <span className={`status-chip glow-mint ${status}`}>{label}</span>;
}