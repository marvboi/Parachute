import { motion } from "framer-motion";
import type { Position } from "../data/positions";
import { DEFAULT_CHART, buildLiveTimeline } from "../data/positions";
import { buildPositionMiniViz } from "../lib/positionViz";
import { useMotionSafe } from "../lib/motion";
import { CrossChainTimeline } from "./CrossChainTimeline";
import { TokenIcon } from "./TokenIcon";
import { Capsule } from "../fall/svg/Capsule";
import { Expandable } from "./Expandable";
import { VerifiedContractLinks } from "./VerifiedContractLinks";

export type VaultPositionsStatus = "loading" | "ready" | "empty" | "error";

type Props = {
  positions: Position[];
  onSelect: (id: string) => void;
  selectedId: string;
  status: VaultPositionsStatus;
  onRetry?: () => void;
};

function spotFor(position: Position): number {
  return position.liveSpot ?? DEFAULT_CHART[position.token];
}

function triggerDistance(position: Position): number {
  const spot = spotFor(position);
  const dist = spot - position.stopLevel;
  const range = Math.max(position.highWater - position.stopLevel, 1);
  return Math.min(100, Math.max(8, 100 - (dist / range) * 100));
}

const intensity = (d: number) => `rgba(255, 91, 31, ${0.25 + (d / 100) * 0.65})`;

export function PositionCards({ positions, onSelect, selectedId, status, onRetry }: Props) {
  return (
    <section id="positions" className="panel panel-app positions-panel">
      <header className="panel-head panel-head-compact">
        <div>
          <h2>Protected positions</h2>
          <Expandable summary="About the vault" size="sm">
            <p className="muted">Multi-token vault · fixed or trailing stops</p>
            {status === "ready" && <VerifiedContractLinks />}
          </Expandable>
        </div>
      </header>
      {status === "loading" && (
        <VaultState title="Loading vault positions…" detail="Reading SifiVault on Base Sepolia" />
      )}
      {status === "error" && (
        <VaultState
          title="Couldn't load positions"
          detail="RPC or contract call failed. Check network and try again."
          action={
            onRetry ? (
              <button type="button" className="btn-secondary" onClick={onRetry}>
                Retry
              </button>
            ) : undefined
          }
        />
      )}
      {status === "empty" && (
        <VaultState
          title="No positions yet"
          detail="The vault has no active stops. Connect as the vault owner and arm a stop below."
        />
      )}
      {status === "ready" && (
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
      )}
    </section>
  );
}

function VaultState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="vault-empty-state" role="status">
      <h3 className="vault-empty-title">{title}</h3>
      <Expandable summary="Details" size="sm" defaultOpen={false}>
        <p className="muted vault-empty-detail">{detail}</p>
      </Expandable>
      {action}
    </div>
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
  const spot = spotFor(position);
  const viz = buildPositionMiniViz(position, spot);
  const showTimeline = position.status === "triggered" || position.status === "armed";
  const armed = position.status === "armed";

  const details = (
    <>
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
        <div
          className="trigger-track"
          role="progressbar"
          aria-valuenow={Math.round(dist)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
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
          <CrossChainTimeline steps={buildLiveTimeline(position.token, position.vaultId)} compact />
        </div>
      )}
    </>
  );

  return (
    <motion.article
      className={`capsule-position ${active ? "active" : "capsule-position-compact"} state-${position.status} ${armed ? "is-armed" : ""}`}
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
      <p className="tabular pos-amount">
        {position.amount} {position.token}
      </p>
      {active ? (
        details
      ) : (
        <motion.div
          className="capsule-pos-expandable"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Expandable summary={`Metrics · stop $${position.stopLevel.toLocaleString()}`} size="sm">
            {details}
          </Expandable>
        </motion.div>
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