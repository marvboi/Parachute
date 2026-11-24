import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useState } from "react";
import { useMotionSafe } from "../lib/motion";

const INTRO_MS = 2200;

type Props = {
  targetX: number;
  targetY: number;
  onComplete: () => void;
};

export function HeroIntroDrop({ targetX, targetY, onComplete }: Props) {
  const { reduce } = useMotionSafe();
  const body = useAnimationControls();
  const canopy = useAnimationControls();
  const shadow = useAnimationControls();
  const [open, setOpen] = useState(0);

  useEffect(() => {
    if (reduce) {
      onComplete();
      return;
    }

    let cancelled = false;
    const run = async () => {
      await body.start({
        y: [targetY - 95, targetY - 18, targetY],
        scaleY: [1.2, 1.08, 1],
        transition: {
          y: { times: [0, 0.32, 1], duration: INTRO_MS / 1000, ease: [0.55, 0.05, 0.25, 1] },
          scaleY: { duration: 0.35, ease: "easeIn" },
        },
      });
      if (!cancelled) onComplete();
    };

    void body.set({ y: targetY - 95, scaleY: 1.2 });
    void shadow.set({ opacity: 0.05, rx: 10, ry: 3 });

    const deployAt = 380;
    const tDeploy = window.setTimeout(() => {
      setOpen(1);
      void canopy.start({
        scale: [0.05, 1.12, 1],
        rotate: [0, 4, -2, 0],
        transition: { duration: 0.55, ease: [0.34, 1.4, 0.64, 1] },
      });
    }, deployAt);

    const shadowIn = window.setTimeout(() => {
      void shadow.start({
        opacity: [0.05, 0.22],
        rx: [10, 34],
        ry: [3, 7],
        transition: { duration: 1.2, ease: "easeOut" },
      });
    }, deployAt);

    void run();

    return () => {
      cancelled = true;
      window.clearTimeout(tDeploy);
      window.clearTimeout(shadowIn);
    };
  }, [reduce, targetX, targetY, body, canopy, shadow, onComplete]);

  if (reduce) return null;

  const spread = 8 + open * 42;
  const lift = open * -24;
  const lineLen = 8 + open * 14;

  return (
    <g className="hero-intro-drop" aria-hidden>
      <motion.ellipse
        cx={targetX}
        cy={targetY + 14}
        rx={18}
        ry={5}
        fill="#14161C"
        animate={shadow}
        initial={{ opacity: 0.05 }}
      />
      <motion.g
        animate={body}
        initial={{ y: targetY - 95, scaleY: 1.2 }}
        style={{ willChange: "transform" }}
      >
        <g transform={`translate(${targetX}, ${targetY + lift - 10})`}>
          <motion.g animate={canopy} initial={{ scale: 0.05 }} style={{ transformOrigin: "0px 6px" }}>
            <path
              d={`M${-spread} 4 Q0 ${-18 - open * 14} ${spread} 4 L${spread * 0.55} 7 L0 2 L${-spread * 0.55} 7 Z`}
              fill="#FF5B1F"
            />
            <path d={`M${-spread * 0.8} 5.5 H${spread * 0.8}`} stroke="#14161C" strokeWidth="0.8" fill="none" opacity="0.5" />
          </motion.g>
          <line x1={-spread * 0.45} y1={6 + lift * 0} x2={0} y2={lineLen} stroke="#FF5B1F" strokeWidth="1.1" opacity={0.5 + open * 0.5} />
          <line x1={spread * 0.45} y1={6 + lift * 0} x2={0} y2={lineLen} stroke="#FF5B1F" strokeWidth="1.1" opacity={0.5 + open * 0.5} />
          <motion.g
            animate={{ rotate: [0, 2.5, -2, 1, 0] }}
            transition={{ duration: 1.6, delay: 0.5, ease: "easeInOut" }}
          >
            <rect x={-11} y={lineLen - 2} width={22} height={14} rx={7} fill="#FF5B1F" />
            <rect x={-7} y={lineLen + 1} width={14} height={8} rx={4} fill="#ff8f4a" opacity="0.4" />
          </motion.g>
        </g>
      </motion.g>
    </g>
  );
}