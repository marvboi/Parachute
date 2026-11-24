import { motion } from "framer-motion";
import { useMotionSafe } from "../lib/motion";
import type { Position } from "../data/positions";

type Props = {
  positions: Position[];
};

export function StatsStrip({ positions }: Props) {
  const { tween, stagger, reduce } = useMotionSafe();
  const armed = positions.filter((p) => p.status === "armed").length;
  const notional = positions.reduce((sum, p) => {
    const px = p.liveSpot ?? 0;
    return sum + p.amount * (p.token === "ETH" ? px : p.token === "BTC" ? px : px);
  }, 0);

  const items = [
    { label: "Positions protected", value: String(positions.length), hint: "Active in vault" },
    { label: "Armed stops", value: String(armed), hint: "Reactive watching" },
    {
      label: "Notional (USD est.)",
      value: notional > 0 ? `$${notional.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—",
      hint: "Spot × position size",
    },
  ];

  return (
    <section className="stats-strip" aria-label="Vault statistics">
      <div className="stats-strip-grid">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            className="glass stat-card"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...tween, delay: i * stagger }}
          >
            <span className="stat-card-label">{item.label}</span>
            <span className="stat-card-value tabular">{item.value}</span>
            <span className="stat-card-hint">{item.hint}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}