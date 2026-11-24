import { useState } from "react";
import type { TokenSymbol } from "../data/demoSeed";

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
    <section id="create" className="panel create-panel">
      <header className="panel-head">
        <div>
          <h2>Create stop</h2>
          <p className="muted">Configure vault deposit & reactive subscription</p>
        </div>
      </header>
      <form className="create-form" onSubmit={handleSubmit}>
        <label>
          Token
          <select value={draft.token} onChange={(e) => update("token", e.target.value as TokenSymbol)}>
            {TOKENS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Amount
          <input
            type="text"
            inputMode="decimal"
            value={draft.amount}
            onChange={(e) => update("amount", e.target.value)}
          />
        </label>
        <fieldset className="stop-type">
          <legend>Stop type</legend>
          <label>
            <input
              type="radio"
              name="stopType"
              checked={draft.stopType === "fixed"}
              onChange={() => update("stopType", "fixed")}
            />
            Fixed
          </label>
          <label>
            <input
              type="radio"
              name="stopType"
              checked={draft.stopType === "trailing"}
              onChange={() => update("stopType", "trailing")}
            />
            Trailing
          </label>
        </fieldset>
        {draft.stopType === "trailing" ? (
          <label>
            Trail %
            <input
              type="number"
              min={0.5}
              max={50}
              step={0.5}
              value={draft.trailPct}
              onChange={(e) => update("trailPct", e.target.value)}
            />
          </label>
        ) : (
          <label>
            Fixed stop price (USD)
            <input
              type="text"
              placeholder="e.g. 1500"
              value={draft.fixedPrice}
              onChange={(e) => update("fixedPrice", e.target.value)}
            />
          </label>
        )}
        <label>
          Safe address
          <input
            type="text"
            spellCheck={false}
            value={draft.safeAddress}
            onChange={(e) => update("safeAddress", e.target.value)}
          />
        </label>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={draft.swapToStable}
            onChange={(e) => update("swapToStable", e.target.checked)}
          />
          Swap to stable on landing
        </label>
        <button type="submit" className="btn-primary">
          {demoMode ? "Simulate arm stop" : "Arm stop (requires deploy)"}
        </button>
        {submitted && (
          <p className="form-note success" role="status">
            Stop configuration staged locally{demoMode ? " — demo timeline updated" : ""}.
          </p>
        )}
      </form>
    </section>
  );
}