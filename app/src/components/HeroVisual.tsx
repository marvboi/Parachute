import { motion } from "framer-motion";
import { useMotionSafe } from "../lib/motion";

/** Large hero parachute + trailing-stop motif */
export function HeroVisual() {
  const { reduce, tween } = useMotionSafe();

  return (
    <motion.div
      className="hero-visual"
      aria-hidden
      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...tween, duration: 0.8 }}
    >
      <svg viewBox="0 0 400 320" className="hero-visual-svg">
        <defs>
          <linearGradient id="canopy" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF5B1F" />
            <stop offset="100%" stopColor="#ff8f4a" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <motion.path
          fill="url(#canopy)"
          filter="url(#glow)"
          initial={{ opacity: 0.7 }}
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={reduce ? { duration: 0 } : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
          d="M60 100 L200 50 L340 100 L280 150 L200 125 L120 150 Z"
        />
        <path d="M70 98 H330" stroke="rgba(0,0,0,0.2)" strokeWidth="1" fill="none" />
        <path
          d="M72 98 L95 108 L118 102 L145 112 L175 105 L200 115 L225 108 L255 118 L285 110 L310 115 L328 98"
          stroke="#0A0E1A"
          strokeWidth="2.5"
          fill="none"
          strokeLinejoin="round"
        />
        <motion.path
          d="M120 150 L200 255 L280 150"
          stroke="#FF5B1F"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          animate={reduce ? {} : { opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <path d="M200 125 V255" stroke="#FF5B1F" strokeWidth="1.5" opacity="0.7" />
        <path d="M185 238 L200 268 L215 238 Z" fill="#FF5B1F" />
        {/* trailing stop line ratcheting */}
        <motion.polyline
          fill="none"
          stroke="#6ee7b7"
          strokeWidth="2"
          strokeDasharray="6 4"
          points="40,200 120,180 200,165 280,175 360,195"
          animate={reduce ? {} : { strokeDashoffset: [0, -20] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        />
        <motion.circle
          cx="360"
          cy="195"
          r="6"
          fill="#FF5B1F"
          filter="url(#glow)"
          animate={reduce ? {} : { r: [5, 7, 5] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      </svg>
    </motion.div>
  );
}