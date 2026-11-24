import { motion } from "framer-motion";
import { useMotionSafe } from "../lib/motion";
import type { Position } from "../data/demoSeed";

type Props = {
  positions: Position[];
  demoMode: boolean;
};

/** Demo-labeled aggregate stats — shown only in demo mode */
export function StatsStrip({ positions, demoMode }: Props) {
  const { tween, stagger, reduce } = useMotionSafe();
  if (!demoMode) return null;

  const tvlDemo = 4.2;
  const reactionMs = 1180;

  const items = [
    { label: "TVL", value: `$${tvlDemo.toFixed(1)}M`, hint: "Demo vault notional" },
    { label: "Positions protected", value: String(positions.length), hint: "Active in vault" },
    { label: "Avg reaction time", value: `${(reactionMs / 1000).toFixed(1)}s`, hint: "Lasna → callback (demo)" },
  ];

  return (
    <section className="stats-strip" aria-label="Demo statistics">
      <span className="stats-strip-badge">Demo metrics</span>
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