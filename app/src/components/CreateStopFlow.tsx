import { useCallback, useRef, useState } from "react";
import type { TokenSymbol } from "../data/demoSeed";
import { useMotionSafe } from "../lib/motion";
import { Capsule } from "../fall/svg/Capsule";
import { MiniFallChart, triggerPricePreview } from "./MiniFallChart";
import { TokenIcon } from "./TokenIcon";

export type CreateStopDraft = {
  token: TokenSymbol;
  amount: string;
  stopType: "fixed" | "trailing";
  trailPct: string;
  fixedPrice: string;
  safeAddress: string;
  swapToStable: boolean;
};

type Props = {
  demoMode: boolean;
  onSubmit: (draft: CreateStopDraft) => void;
  onLandingMode: (swapToStable: boolean) => void;
  armedCount?: number;
};

const TOKENS: TokenSymbol[] = ["ETH", "BTC", "LINK"];
const HOLD_MS = 800;

export function CreateStopFlow({ demoMode, onSubmit, onLandingMode, armedCount = 0 }: Props) {
  const [draft, setDraft] = useState<CreateStopDraft>({
    token: "ETH",
    amount: "1.0",
    stopType: "trailing",
    trailPct: "5",
    fixedPrice: "",
    safeAddress: "0x0000000000000000000000000000000000000000",
    swapToStable: true,
  });
  const [armed, setArmed] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStart = useRef(0);
  const { reduce } = useMotionSafe();
  const trailNum = Number(draft.trailPct) || 5;
  const triggerAt = triggerPricePreview(draft.token, draft.stopType === "trailing" ? trailNum : 10);

  const update = <K extends keyof CreateStopDraft>(key: K, value: CreateStopDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setArmed(false);
    if (key === "swapToStable") onLandingMode(!!value);
  };

  const finishArm = useCallback(() => {
    onSubmit(draft);
    setArmed(true);
    if (holdTimer.current) clearInterval(holdTimer.current);
    setHoldProgress(0);
  }, [draft, onSubmit]);

  const startHold = () => {
    if (reduce) {
      finishArm();
      return;
    }
    holdStart.current = performance.now();
    holdTimer.current = setInterval(() => {
      const p = Math.min(1, (performance.now() - holdStart.current) / HOLD_MS);
      setHoldProgress(p);
      if (p >= 1) finishArm();
    }, 16);
  };

  const cancelHold = () => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    setHoldProgress(0);
  };

  const landingMode = draft.swapToStable ? "swap" : "withdraw";

  return (
    <section id="create" className="panel panel-app create-panel">
      <header className="panel-head">
        <div>
          <h2>Create stop</h2>
          <p className="muted">Configure vault deposit & reactive subscription</p>
        </div>
        <svg viewBox="0 0 80 48" className="form-capsule-preview" aria-hidden>
          <Capsule x={40} y={24} tokenGlyph={draft.token.slice(0, 1)} />
        </svg>
      </header>
      <form className="create-form" onSubmit={(e) => e.preventDefault()}>
        <div className="field-block">
          <span className="field-label">Token</span>
          <div className="token-select" role="radiogroup" aria-label="Token">
            {TOKENS.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={draft.token === t}
                className={`token-option ${draft.token === t ? "active" : ""}`}
                onClick={() => update("token", t)}
              >
                <TokenIcon symbol={t} size={24} />
                {t}
              </button>
            ))}
          </div>
        </div>
        <label className="field-polished">
          Amount
          <input
            type="text"
            inputMode="decimal"
            value={draft.amount}
            onChange={(e) => update("amount", e.target.value)}
          />
        </label>
        <fieldset className="segmented">
          <legend>Stop type</legend>
          <div className="segmented-track">
            {(["fixed", "trailing"] as const).map((type) => (
              <button
                key={type}
                type="button"
                className={`segment ${draft.stopType === type ? "active" : ""}`}
                onClick={() => update("stopType", type)}
              >
                {type === "fixed" ? "Fixed" : "Trailing"}
              </button>
            ))}
          </div>
        </fieldset>
        {draft.stopType === "trailing" && (
          <div className="trail-vertical-block">
            <div className="trail-chart-wrap">
              <MiniFallChart token={draft.token} trailPct={trailNum} />
              <p className="trigger-preview tabular">
                Would have triggered at ${triggerAt.toFixed(2)}{" "}
                <span className="demo-tag">(example)</span>
              </p>
            </div>
            <div className="trail-slider-vertical">
              <label htmlFor="trail-v" className="field-label">
                Trail %
              </label>
              <input
                id="trail-v"
                type="range"
                min={0.5}
                max={25}
                step={0.5}
                value={trailNum}
                onChange={(e) => update("trailPct", e.target.value)}
                className="range-vertical"
              />
              <span className="tabular trail-value">{trailNum}%</span>
            </div>
          </div>
        )}
        {draft.stopType === "fixed" && (
          <label className="field-polished">
            Fixed stop price (USD)
            <input
              type="text"
              placeholder="e.g. 1500"
              value={draft.fixedPrice}
              onChange={(e) => update("fixedPrice", e.target.value)}
            />
          </label>
        )}
        <fieldset className="landing-mode">
          <legend className="sr-only">Landing mode</legend>
          <div className="segmented-track">
            <button
              type="button"
              className={`segment ${landingMode === "withdraw" ? "active" : ""}`}
              onClick={() => update("swapToStable", false)}
            >
              Withdraw
            </button>
            <button
              type="button"
              className={`segment ${landingMode === "swap" ? "active" : ""}`}
              onClick={() => update("swapToStable", true)}
            >
              Swap to stable
            </button>
          </div>
        </fieldset>
        <label className="field-polished">
          Safe address
          <input
            type="text"
            spellCheck={false}
            className="mono-input"
            value={draft.safeAddress}
            onChange={(e) => update("safeAddress", e.target.value)}
          />
        </label>
        <div className="arm-hold-wrap">
          <button
            type="button"
            className={`btn-arm-hold ${armed ? "armed" : ""}`}
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            style={{ "--hold": holdProgress } as React.CSSProperties}
          >
            <span className="hold-fill" />
            <span className="hold-label">
              {armed ? "Armed, watching" : demoMode ? "Simulate arm stop" : "Arm stop (requires deploy)"}
            </span>
            {!armed && <span className="hold-hint">Press and hold {HOLD_MS / 1000}s</span>}
          </button>
          {armed && <div className="armed-pulse" aria-live="polite" />}
        </div>
        {armed && demoMode && (
          <p className="form-note mint" role="status">
            Stop configuration staged locally — demo timeline updated.
          </p>
        )}
        {armedCount > 0 && armed && (
          <p className="form-note mint tabular">{armedCount} position(s) watching</p>
        )}
      </form>
    </section>
  );
}