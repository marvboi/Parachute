import { motion, useSpring, useMotionValueEvent } from "framer-motion";
import { useEffect, useState } from "react";
import { useMotionSafe } from "../lib/motion";

type Props = { x: number; y: number; open: number };

const DEPLOY_SPRING = { stiffness: 340, damping: 15, mass: 0.55 };

/** Canopy with spring snap on deploy (scroll trigger + intro). */
export function SpringCanopy({ x, y, open }: Props) {
  const { reduce } = useMotionSafe();
  const springOpen = useSpring(open, reduce ? { duration: 0.01 } : DEPLOY_SPRING);
  const [o, setO] = useState(reduce ? open : 0);

  useEffect(() => {
    springOpen.set(open);
  }, [open, springOpen]);

  useMotionValueEvent(springOpen, "change", (v) => setO(v));

  const spread = 8 + o * 42;
  const lift = o * -28;
  const lineReach = 6 + o * 16;
  const wobble = reduce ? 0 : Math.sin(o * Math.PI) * 2;

  return (
    <motion.g
      transform={`translate(${x}, ${y + lift})`}
      style={{ opacity: 0.25 + o * 0.75 }}
      animate={reduce ? {} : { rotate: wobble }}
      transition={{ type: "spring", stiffness: 120, damping: 12 }}
    >
      <motion.g
        style={{ transformOrigin: "0px 6px" }}
        animate={{ scale: reduce ? 1 : 0.15 + o * 0.95 }}
        transition={reduce ? { duration: 0 } : { type: "spring", ...DEPLOY_SPRING }}
      >
        <path
          d={`M${-spread} 4 Q0 ${-20 - o * 16} ${spread} 4 L${spread * 0.6} 8 L0 2 L${-spread * 0.6} 8 Z`}
          fill="#FF5B1F"
          stroke="#14161C"
          strokeWidth="0.5"
          strokeOpacity="0.25"
        />
        <path
          d={`M${-spread * 0.85} 6 H${spread * 0.85}`}
          stroke="#14161C"
          strokeWidth="0.9"
          fill="none"
          opacity={0.45}
        />
      </motion.g>
      <line x1={-spread * 0.5} y1="6" x2="0" y2={lineReach} stroke="#FF5B1F" strokeWidth="1.2" opacity={0.4 + o * 0.6} />
      <line x1={spread * 0.5} y1="6" x2="0" y2={lineReach} stroke="#FF5B1F" strokeWidth="1.2" opacity={0.4 + o * 0.6} />
    </motion.g>
  );
}