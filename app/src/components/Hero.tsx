import type { TokenSymbol } from "../data/demoSeed";

type Props = {
  activeToken: TokenSymbol;
  spot: number;
  reactiveReady: boolean;
};

export function Hero({ activeToken, spot, reactiveReady }: Props) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">Reactive Omni · Set It and Forget It</p>
        <h1>
          Automated stop-loss
          <br />
          <span className="accent">that actually lands</span>
        </h1>
        <p className="lede">
          Parachute watches real Chainlink <code>AnswerUpdated</code> events on Base Sepolia, reacts on Lasna, and
          callbacks your vault before the dip becomes a crash.
        </p>
        <HeroStats token={activeToken} spot={spot} reactiveReady={reactiveReady} />
      </div>
      <div className="hero-glow" aria-hidden />
    </section>
  );
}

function HeroStats({ token, spot, reactiveReady }: Omit<Props, "activeToken"> & { token: TokenSymbol }) {
  return (
    <ul className="hero-stats">
      <li>
        <span className="stat-label">Spot</span>
        <span className="stat-value mono">
          {token}/USD ${spot.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
      </li>
      <li>
        <span className="stat-label">Reactive</span>
        <span className={`stat-pill ${reactiveReady ? "ok" : "muted"}`}>
          {reactiveReady ? "Lasna armed" : "Awaiting deploy"}
        </span>
      </li>
      <li>
        <span className="stat-label">Feeds</span>
        <span className="stat-value">ETH · BTC · LINK</span>
      </li>
    </ul>
  );
}