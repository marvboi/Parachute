import { motion, useReducedMotion } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";
import { ParachuteRigGraphic } from "../components/ParachuteRigGraphic";

const INTRO_S = 2.8;
const CANOPY_W = 140;
const LAND_SCALE = 0.26;

type Props = {
  active: boolean;
  panelEl: HTMLDivElement | null;
  capX: number;
  capY: number;
  viewW: number;
  viewH: number;
  onComplete: () => void;
};

declare global {
  interface Window {
    __PARACHUTE_FORCE_MOTION__?: boolean;
  }
}

export function HeroIntroOverlay({ active, panelEl, capX, capY, viewW, viewH, onComplete }: Props) {
  const reducePref = useReducedMotion();
  const reduce = reducePref && !window.__PARACHUTE_FORCE_MOTION__;
  const [armed, setArmed] = useState(false);
  const [deploy, setDeploy] = useState(0);
  const [land, setLand] = useState<{ left: number; top: number } | null>(null);
  const doneRef = useRef(false);

  useLayoutEffect(() => {
    if (!active) return;

    const measure = () => {
      const panel = panelEl;
      if (!panel) return false;
      const svg = panel.querySelector(".fall-svg");
      const pRect = panel.getBoundingClientRect();
      let left = pRect.width * 0.62 - CANOPY_W / 2;
      let top = pRect.height * 0.52;
      if (svg) {
        const sRect = svg.getBoundingClientRect();
        if (sRect.width > 8) {
          left = sRect.left - pRect.left + (capX / viewW) * sRect.width - CANOPY_W / 2;
          top = sRect.top - pRect.top + (capY / viewH) * sRect.height - CANOPY_W * 0.45;
        }
      }
      setLand({ left, top });
      return true;
    };

    const arm = () => {
      if (!measure()) return false;
      setArmed(true);
      return true;
    };

    if (!arm() && panelEl) {
      const ro = new ResizeObserver(() => arm());
      ro.observe(panelEl);
      return () => ro.disconnect();
    }
    return undefined;
  }, [active, panelEl, capX, capY, viewW, viewH]);

  useLayoutEffect(() => {
    if (!active || reduce) {
      if (reduce && active && !doneRef.current) {
        doneRef.current = true;
        onComplete();
      }
      return;
    }
    if (!armed) return;
    const d1 = window.setTimeout(() => setDeploy(1), 600);
    const d2 = window.setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        onComplete();
      }
    }, INTRO_S * 1000);
    return () => {
      window.clearTimeout(d1);
      window.clearTimeout(d2);
    };
  }, [armed, onComplete]);

  if (!active || reduce) return null;

  return (
    <div className="hero-intro-overlay" aria-hidden data-hero-intro={armed && land ? "playing" : "pending"}>
      {!land || !armed ? null : (
        <>
      <motion.div
        className="hero-intro-shadow"
        initial={{ opacity: 0.04, scale: 0.4 }}
        animate={{
          opacity: [0.04, 0.08, 0.22, 0.18],
          scale: [0.4, 0.55, 1, 1],
        }}
        transition={{ duration: INTRO_S, times: [0, 0.21, 0.75, 1], ease: "easeOut" }}
        style={{ left: land.left + CANOPY_W / 2, top: land.top + CANOPY_W * 0.95 }}
      />
      <motion.div
        className="hero-intro-chute"
        style={{ width: CANOPY_W, left: land.left, top: 0, willChange: "transform" }}
        initial={false}
        animate={{
          y: armed ? [-200, land.top * 0.38, land.top + 10, land.top] : -200,
          scale: armed ? [1, 1.02, 1, LAND_SCALE] : 1,
          rotate: [0, 0, 5, -4, 2, 0],
          x: [0, 0, 10, -8, 4, 0],
        }}
        transition={{
          duration: INTRO_S,
          delay: 0,
          times: [0, 0.21, 0.86, 1],
          ease: [0.55, 0.04, 0.2, 1],
          rotate: { duration: 1.8, delay: 0.6, ease: "easeInOut" },
          x: { duration: 1.8, delay: 0.6, ease: "easeInOut" },
          scale: {
            times: [0, 0.21, 0.86, 1],
            duration: INTRO_S,
            ease: [0.4, 0, 0.2, 1],
          },
        }}
      >
        <motion.div
          initial={{ scaleY: 1.22, scaleX: 0.92 }}
          animate={{
            scaleY: [1.22, 1.12, 1.05, 1],
            scaleX: [0.92, 0.96, 1, 1],
          }}
          transition={{ duration: 0.6, ease: [0.55, 0.1, 0.9, 0.45] }}
        >
          <motion.div
            animate={{ scale: deploy ? [0.08, 1.14, 1] : 0.08 }}
            transition={{ duration: 0.45, ease: [0.34, 1.45, 0.64, 1] }}
            style={{ transformOrigin: "50% 28%" }}
          >
            <ParachuteRigGraphic width={CANOPY_W} deployed={deploy} capsuleOnly={deploy < 0.5} />
          </motion.div>
        </motion.div>
      </motion.div>
        </>
      )}
    </div>
  );
}