import { motion } from "framer-motion";
import { EXPLORERS } from "../config/contracts";
import type { TimelineStep } from "../data/positions";
import { useMotionSafe } from "../lib/motion";
import { Expandable } from "./Expandable";

type Props = { steps: TimelineStep[]; compact?: boolean };

export function CrossChainTimeline({ steps, compact }: Props) {
  const { tween, stagger, reduce } = useMotionSafe();

  return (
    <section id="timeline" className={`panel panel-app timeline-panel ${compact ? "timeline-compact" : ""}`}>
      {!compact && (
        <header className="panel-head panel-head-compact">
          <div>
            <h2>Cross-chain timeline</h2>
            <Expandable summary="What happens across chains" size="sm">
              <p className="muted">Base Sepolia event → Lasna reactive → Base Sepolia callback</p>
            </Expandable>
          </div>
        </header>
      )}
      <ol className="timeline timeline-premium">
        {steps.map((step, idx) => (
          <motion.li
            key={step.id}
            className={`timeline-step ${step.status}`}
            initial={reduce ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...tween, delay: idx * stagger }}
          >
            <div className="rail">
              <motion.span
                className="dot"
                animate={step.status === "active" && !reduce ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
              {idx < steps.length - 1 && (
                <span className="line-wrap">
                  <span className="line" />
                  <motion.span
                    className="line-glow"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: step.status !== "pending" ? 1 : 0.2 }}
                    transition={tween}
                  />
                </span>
              )}
            </div>
            <div className="step-body glass-inset">
              <StepTitle step={step} />
              <Expandable summary="Step detail" size="sm" className="timeline-step-expand">
                <p className="detail">{step.detail}</p>
                {step.txHash && (
                  <a
                    className="tx-link tabular"
                    href={`${EXPLORERS[step.explorer]}/tx/${step.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {step.txHash.slice(0, 10)}…{step.txHash.slice(-8)}
                  </a>
                )}
                {!step.txHash && step.contractAddress && (
                  <a
                    className="tx-link tabular"
                    href={`${EXPLORERS[step.explorer]}/address/${step.contractAddress}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {step.contractAddress.slice(0, 10)}…{step.contractAddress.slice(-8)}
                  </a>
                )}
              </Expandable>
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

function StepTitle({ step }: { step: TimelineStep }) {
  return (
    <div className="step-title">
      <h3>{step.label}</h3>
      <span className="chain-pill glass-pill">
        {step.chain} · {step.chainId}
      </span>
    </div>
  );
}