import { motion } from "framer-motion";
import type { TokenSymbol } from "../data/positions";
import { useMotionSafe } from "../lib/motion";
import { HeroVisual } from "./HeroVisual";

type Props = {
  activeToken: TokenSymbol;
  spot: number;
  reactiveReady: boolean;
};

export function Hero({ activeToken, spot, reactiveReady }: Props) {
  const { tween, stagger, reduce } = useMotionSafe();

  return (
    <section className="hero hero-premium">
      <div className="hero-mesh" aria-hidden />
      <div className="hero-noise" aria-hidden />
      <section className="hero-grid">
        <div className="hero-copy">
          <motion.p
            className="eyebrow"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...tween }}
          >
            Reactive Omni · Set It and Forget It
          </motion.p>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...tween, delay: stagger }}
          >
            Automated stop-loss
            <br />
            <span className="accent">that actually lands</span>
          </motion.h1>
          <motion.p
            className="lede"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...tween, delay: stagger * 2 }}
          >
            Parachute watches real Chainlink <code>AnswerUpdated</code> events on Base Sepolia, reacts on Lasna, and
            callbacks your vault before the dip becomes a crash.
          </motion.p>
          <HeroStats token={activeToken} spot={spot} reactiveReady={reactiveReady} />
        </div>
        <HeroVisual />
      </section>
    </section>
  );
}

function HeroStats({ token, spot, reactiveReady }: Omit<Props, "activeToken"> & { token: TokenSymbol }) {
  const { tween, stagger, reduce } = useMotionSafe();

  const items = [
    {
      label: "Spot",
      node: (
        <span className="stat-value tabular">
          {token}/USD ${spot.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      label: "Reactive",
      node: (
        <span className={`stat-pill glass-pill ${reactiveReady ? "ok" : "muted"}`}>
          {reactiveReady ? "Lasna armed" : "Awaiting deploy"}
        </span>
      ),
    },
    {
      label: "Feeds",
      node: <span className="stat-value">ETH · BTC · LINK</span>,
    },
  ];

  return (
    <ul className="hero-stats">
      {items.map((item, i) => (
        <motion.li
          key={item.label}
          className="glass hero-stat-card"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...tween, delay: stagger * (3 + i) }}
        >
          <span className="stat-label">{item.label}</span>
          {item.node}
        </motion.li>
      ))}
    </ul>
  );
}