import { motion } from "framer-motion";
import { useState } from "react";
import type { TokenSymbol } from "../data/demoSeed";
import { useMotionSafe } from "../lib/motion";
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
};

const TOKENS: TokenSymbol[] = ["ETH", "BTC", "LINK"];

export function CreateStopFlow({ demoMode, onSubmit }: Props) {
  const [draft, setDraft] = useState<CreateStopDraft>({
    token: "ETH",
    amount: "1.0",
    stopType: "trailing",
    trailPct: "5",
    fixedPrice: "",
    safeAddress: "0x0000000000000000000000000000000000000000",
    swapToStable: true,
  });
  const [submitted, setSubmitted] = useState(false);
  const { reduce } = useMotionSafe();

  const update = <K extends keyof CreateStopDraft>(key: K, value: CreateStopDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSubmitted(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(draft);
    setSubmitted(true);
  };

  return (
    <section id="create" className="panel glass create-panel">
      <header className="panel-head">
        <div>
          <h2>Create stop</h2>
          <p className="muted">Configure vault deposit & reactive subscription</p>
        </div>
      </header>
      <form className="create-form" onSubmit={handleSubmit}>
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
            <motion.span
              className="segment-highlight"
              layout={!reduce}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              style={{
                left: draft.stopType === "fixed" ? "4px" : "calc(50% - 2px)",
                width: "calc(50% - 4px)",
              }}
            />
          </div>
        </fieldset>
        {draft.stopType === "trailing" ? (
          <div className="field-block">
            <label className="field-label-row" htmlFor="trail-range">
              Trail %
              <span className="tabular trail-value">{draft.trailPct}%</span>
            </label>
            <input
              id="trail-range"
              className="range-slider"
              type="range"
              min={0.5}
              max={25}
              step={0.5}
              value={Number(draft.trailPct) || 5}
              onChange={(e) => update("trailPct", e.target.value)}
            />
          </div>
        ) : (
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
        <label className="toggle-row glass-row">
          <input
            type="checkbox"
            className="toggle-check"
            checked={draft.swapToStable}
            onChange={(e) => update("swapToStable", e.target.checked)}
          />
          Swap to stable on landing
        </label>
        <motion.button
          type="submit"
          className="btn-primary btn-shine"
          whileHover={reduce ? {} : { scale: 1.01 }}
          whileTap={reduce ? {} : { scale: 0.99 }}
        >
          <span className="btn-shine-layer" aria-hidden />
          {demoMode ? "Simulate arm stop" : "Arm stop (requires deploy)"}
        </motion.button>
        {submitted && (
          <p className="form-note success" role="status">
            Stop configuration staged locally{demoMode ? " — demo timeline updated" : ""}.
          </p>
        )}
      </form>
    </section>
  );
}