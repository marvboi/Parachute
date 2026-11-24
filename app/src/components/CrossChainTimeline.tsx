import { EXPLORERS } from "../config/contracts";
import type { TimelineStep } from "../data/demoSeed";

type Props = { steps: TimelineStep[] };

export function CrossChainTimeline({ steps }: Props) {
  return (
    <section id="timeline" className="panel timeline-panel">
      <header className="panel-head">
        <div>
          <h2>Cross-chain timeline</h2>
          <p className="muted">Base Sepolia event → Lasna reactive → Base Sepolia callback</p>
        </div>
      </header>
      <ol className="timeline">
        {steps.map((step, idx) => (
          <li key={step.id} className={`timeline-step ${step.status}`}>
            <div className="rail">
              <span className="dot" />
              {idx < steps.length - 1 && <span className="line" />}
            </div>
            <div className="step-body">
              <StepTitle step={step} />
              <p className="detail">{step.detail}</p>
              {step.txHash && (
                <a
                  className="tx-link mono"
                  href={`${EXPLORERS[step.explorer]}/tx/${step.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {step.txHash.slice(0, 10)}…{step.txHash.slice(-8)}
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StepTitle({ step }: { step: TimelineStep }) {
  return (
    <div className="step-title">
      <h3>{step.label}</h3>
      <span className="chain-pill">
        {step.chain} · {step.chainId}
      </span>
    </div>
  );
}