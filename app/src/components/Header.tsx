import { motion } from "framer-motion";
import { ParachuteLogo } from "./ParachuteLogo";
import { WalletConnect } from "./WalletConnect";
import { useMotionSafe } from "../lib/motion";

type Props = {
  demoMode: boolean;
  onToggleDemo: () => void;
  minimal?: boolean;
};

export function Header({ demoMode, onToggleDemo, minimal }: Props) {
  const { reduce } = useMotionSafe();

  return (
    <motion.header
      className={`site-header glass header-bar ${minimal ? "header-minimal" : "header-shell"}`}
      initial={reduce ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="header-inner">
        <ParachuteLogo size={36} />
        <nav className="header-nav" aria-label="Primary">
          <a href="#positions">Positions</a>
          <a href="#create">Create stop</a>
          <a href="#timeline">Cross-chain</a>
        </nav>
        <div className="header-actions">
          <WalletConnect />
          <MotionToggle demoMode={demoMode} onToggleDemo={onToggleDemo} />
        </div>
      </div>
    </motion.header>
  );
}

function MotionToggle({ demoMode, onToggleDemo }: Props) {
  const { reduce } = useMotionSafe();

  return (
    <motion.button
      type="button"
      className={`demo-toggle glass-pill ${demoMode ? "on" : ""}`}
      onClick={onToggleDemo}
      whileTap={reduce ? {} : { scale: 0.97 }}
    >
      <span className="demo-dot" />
      {demoMode ? "Demo mode" : "Live prices"}
    </motion.button>
  );
}