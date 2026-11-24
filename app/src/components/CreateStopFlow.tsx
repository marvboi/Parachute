import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import type { TokenSymbol } from "../data/positions";
import { DEFAULT_CHART } from "../data/positions";
import { useChainlinkPrices } from "../hooks/useChainlinkPrice";
import { useMotionSafe } from "../lib/motion";
import { Capsule } from "../fall/svg/Capsule";
import { MiniFallChart, triggerPricePreview } from "./MiniFallChart";
import { TokenIcon } from "./TokenIcon";
import { useVaultActions } from "../hooks/useVaultActions";
import { Expandable, FormFlowStep } from "./Expandable";

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
  onLandingMode: (swapToStable: boolean) => void;
  armedCount?: number;
  onChainReady?: boolean;
  isVaultOwner?: boolean;
  connectedAddress?: Address;
  spotPrice?: number;
  onVaultRefresh?: () => void;
};

const TOKENS: TokenSymbol[] = ["ETH", "BTC", "LINK"];
const HOLD_MS = 800;

export function CreateStopFlow({
  onLandingMode,
  armedCount = 0,
  onChainReady = false,
  isVaultOwner = false,
  connectedAddress,
  spotPrice,
  onVaultRefresh,
}: Props) {
  const [draft, setDraft] = useState<CreateStopDraft>({
    token: "ETH",
    amount: "1.0",
    stopType: "trailing",
    trailPct: "5",
    fixedPrice: "",
    safeAddress: "0x0000000000000000000000000000000000000000",
    swapToStable: true,
  });
  const [wrapEth, setWrapEth] = useState(false);
  const [armed, setArmed] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [openStep, setOpenStep] = useState(1);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStart = useRef(0);
  const { reduce } = useMotionSafe();
  const live = useChainlinkPrices(TOKENS, true);
  const draftSpot = spotPrice ?? live.data?.[draft.token]?.price ?? DEFAULT_CHART[draft.token];
  const trailNum = Number(draft.trailPct) || 5;
  const triggerAt = triggerPricePreview(
    draft.token,
    draft.stopType === "trailing" ? trailNum : 10,
    draftSpot,
  );

  const canOnChain = onChainReady && isVaultOwner && !!connectedAddress;

  const { state, run, reset } = useVaultActions(() => {
    setArmed(true);
    setOpenStep(4);
    onVaultRefresh?.();
  });

  useEffect(() => {
    if (connectedAddress && draft.safeAddress === "0x0000000000000000000000000000000000000000") {
      setDraft((d) => ({ ...d, safeAddress: connectedAddress }));
    }
  }, [connectedAddress, draft.safeAddress]);

  const update = <K extends keyof CreateStopDraft>(key: K, value: CreateStopDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setArmed(false);
    reset();
    if (key === "swapToStable") onLandingMode(!!value);
  };

  const finishArm = useCallback(async () => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    setHoldProgress(0);
    if (!canOnChain) return;
    try {
      await run(draft, wrapEth && draft.token === "ETH");
    } catch {
      return;
    }
  }, [canOnChain, run, draft, wrapEth]);

  const startHold = () => {
    if (!canOnChain) return;
    if (reduce) {
      void finishArm();
      return;
    }
    holdStart.current = performance.now();
    holdTimer.current = setInterval(() => {
      const p = Math.min(1, (performance.now() - holdStart.current) / HOLD_MS);
      setHoldProgress(p);
      if (p >= 1) void finishArm();
    }, 16);
  };

  const cancelHold = () => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    setHoldProgress(0);
  };

  const landingMode = draft.swapToStable ? "swap" : "withdraw";
  const armDisabled = !canOnChain;

  const holdLabel = armed
    ? "Armed, watching"
    : canOnChain
      ? "Arm stop on vault"
      : !onChainReady
        ? "Vault not configured"
        : !connectedAddress
          ? "Connect wallet"
          : "Vault owner only";

  const toggleStep = (n: number) => setOpenStep((cur) => (cur === n ? 0 : n));

  const stopSummary =
    draft.stopType === "trailing" ? `Trailing ${trailNum}%` : draft.fixedPrice ? `Fixed $${draft.fixedPrice}` : "Fixed stop";

  return (
    <section id="create" className="panel panel-app create-panel">
      <header className="panel-head panel-head-compact">
        <div>
          <h2>Create stop</h2>
          <Expandable summary="What this flow does" size="sm">
            <p className="muted">Configure vault deposit & reactive subscription</p>
            {onChainReady && connectedAddress && !isVaultOwner && (
              <p className="form-note vault-readonly" role="status">
                This vault is read-only for your wallet. Only the vault owner can open or arm positions.
              </p>
            )}
          </Expandable>
        </div>
        <svg viewBox="0 0 80 48" className="form-capsule-preview" aria-hidden>
          <Capsule x={40} y={24} tokenGlyph={draft.token.slice(0, 1)} />
        </svg>
      </header>
      <form className="create-form" onSubmit={(e) => e.preventDefault()}>
        <div className="form-flow-stack">
          <FormFlowStep
            step={1}
            title="Asset"
            subtitle={`${draft.amount} ${draft.token}`}
            open={openStep === 1}
            onRequestToggle={() => toggleStep(1)}
          >
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
            {canOnChain && draft.token === "ETH" && (
              <label className="field-check">
                <input type="checkbox" checked={wrapEth} onChange={(e) => setWrapEth(e.target.checked)} />
                Wrap ETH to WETH first
              </label>
            )}
          </FormFlowStep>

          <FormFlowStep
            step={2}
            title="Stop rules"
            subtitle={stopSummary}
            open={openStep === 2}
            onRequestToggle={() => toggleStep(2)}
          >
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
                  <MiniFallChart token={draft.token} trailPct={trailNum} spotPrice={draftSpot} />
                  <p className="trigger-preview tabular">
                    Preview trigger near ${triggerAt.toFixed(2)}{" "}
                    <span className="muted">(at {trailNum}% trail)</span>
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
          </FormFlowStep>

          <FormFlowStep
            step={3}
            title="Landing"
            subtitle={landingMode === "swap" ? "Swap to stable" : "Withdraw"}
            open={openStep === 3}
            onRequestToggle={() => toggleStep(3)}
          >
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
          </FormFlowStep>

          <FormFlowStep
            step={4}
            title="Arm on vault"
            subtitle={holdLabel}
            open={openStep === 4}
            onRequestToggle={() => toggleStep(4)}
          >
            <TxStatus state={state.phase} message={state.message} hash={state.hash} />
            <div className="arm-hold-wrap">
              <button
                type="button"
                className={`btn-arm-hold ${armed ? "armed" : ""}`}
                disabled={
                  armDisabled ||
                  state.phase === "pending" ||
                  state.phase === "wrap" ||
                  state.phase === "approve" ||
                  state.phase === "open" ||
                  state.phase === "arm"
                }
                onPointerDown={startHold}
                onPointerUp={cancelHold}
                onPointerLeave={cancelHold}
                style={{ "--hold": holdProgress } as React.CSSProperties}
              >
                <span className="hold-fill" />
                <span className="hold-label">{holdLabel}</span>
                {!armed && !armDisabled && (
                  <span className="hold-hint">Press and hold {HOLD_MS / 1000}s</span>
                )}
              </button>
              {armed && <div className="armed-pulse" aria-live="polite" />}
            </div>
            {state.phase === "cancelled" && (
              <p className="form-note" role="alert">
                Cancelled in wallet ·{" "}
                <button type="button" className="linkish" onClick={reset}>
                  Try again
                </button>
              </p>
            )}
            {armedCount > 0 && armed && (
              <p className="form-note mint tabular">{armedCount} position(s) watching</p>
            )}
          </FormFlowStep>
        </div>
      </form>
    </section>
  );
}

function TxStatus({
  state,
  message,
  hash,
}: {
  state: string;
  message?: string;
  hash?: `0x${string}`;
}) {
  if (state === "idle" || state === "confirmed" || state === "cancelled") return null;
  const label =
    state === "pending"
      ? "Pending…"
      : state === "failed"
        ? "Failed"
        : state === "wrap"
          ? "Wrapping ETH…"
          : state === "approve"
            ? "Approving…"
            : state === "open"
              ? "Opening position…"
              : state === "arm"
                ? "Arming stop…"
                : "Pending…";
  return (
    <p className="form-note tx-status tabular" role="status">
      {label}
      {message && state === "failed" ? ` — ${message}` : ""}
      {hash && (
        <a
          className="tx-link"
          href={`https://sepolia.basescan.org/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
        >
          {hash.slice(0, 10)}…
        </a>
      )}
    </p>
  );
}