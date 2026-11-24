import { motion } from "framer-motion";
import { ParachuteLogo } from "./ParachuteLogo";
import { WalletConnect } from "./WalletConnect";
import { useMotionSafe } from "../lib/motion";

type Props = {
  minimal?: boolean;
};

export function Header({ minimal }: Props) {
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
        <motion.div
          className="header-actions"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
        >
          <WalletConnect />
        </motion.div>
      </div>
    </motion.header>
  );
}