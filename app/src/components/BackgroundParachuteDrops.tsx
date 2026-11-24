import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ParachuteRigGraphic } from "./ParachuteRigGraphic";

type Scheduled = { id: number; left: number; size: number; opacity: number };

const HERO_WAVE: Omit<Scheduled, "id">[] = [
  { left: 56, size: 72, opacity: 0.88 },
  { left: 70, size: 64, opacity: 0.84 },
  { left: 82, size: 56, opacity: 0.78 },
];
const HERO_AT_MS = [1200, 3500, 6000];

let dropId = 0;

type Props = {
  /** narrative scenes 0–5 */
  storyActive: boolean;
  variant?: "hero" | "landing";
};

declare global {
  interface Window {
    __PARACHUTE_FORCE_MOTION__?: boolean;
  }
}

export function BackgroundParachuteDrops({ storyActive, variant = "hero" }: Props) {
  const reducePref = useReducedMotion();
  const reduce = reducePref && !window.__PARACHUTE_FORCE_MOTION__;
  const [drops, setDrops] = useState<Scheduled[]>([]);
  const [waveComplete, setWaveComplete] = useState(false);

  useEffect(() => {
    if (!storyActive || reduce || variant !== "hero") return;
    const timers: number[] = [];
    HERO_AT_MS.forEach((ms, i) => {
      const spec = HERO_WAVE[i];
      if (!spec) return;
      timers.push(
        window.setTimeout(() => {
          setDrops((prev) => [...prev, { id: ++dropId, ...spec }]);
        }, ms),
      );
    });
    timers.push(
      window.setTimeout(() => {
        setWaveComplete(true);
      }, HERO_AT_MS[HERO_AT_MS.length - 1]! + 100),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [storyActive, reduce, variant]);

  useEffect(() => {
    if (!storyActive || reduce || variant !== "hero" || !waveComplete) return;
    const iv = window.setInterval(() => {
      setDrops((prev) => [
        ...prev.slice(-2),
        {
          id: ++dropId,
          left: 48 + Math.random() * 38,
          size: 48 + Math.random() * 42,
          opacity: 0.7 + Math.random() * 0.2,
        },
      ]);
    }, 6200);
    return () => window.clearInterval(iv);
  }, [storyActive, reduce, variant, waveComplete]);

  useEffect(() => {
    if (!storyActive || reduce || variant !== "landing") return;
    const t = window.setTimeout(() => {
      setDrops([
        { id: ++dropId, left: 8, size: 58, opacity: 0.82 },
        { id: ++dropId, left: 18, size: 52, opacity: 0.78 },
        { id: ++dropId, left: 26, size: 48, opacity: 0.74 },
      ]);
    }, 400);
    return () => window.clearTimeout(t);
  }, [storyActive, reduce, variant]);

  if (reduce) return null;

  return (
    <div className={`bg-drop-field bg-drop-${variant}`} aria-hidden>
      {drops.map((d) => (
        <BackgroundDrop key={d.id} {...d} onDone={() => setDrops((prev) => prev.filter((x) => x.id !== d.id))} />
      ))}
    </div>
  );
}

function BackgroundDrop({
  left,
  size,
  opacity,
  onDone,
}: Scheduled & { onDone: () => void }) {
  const [deploy, setDeploy] = useState(0);
  const ended = useRef(false);

  useEffect(() => {
    const open = window.setTimeout(() => setDeploy(1), 480);
    const done = window.setTimeout(() => {
      if (!ended.current) {
        ended.current = true;
        onDone();
      }
    }, 4800);
    return () => {
      window.clearTimeout(open);
      window.clearTimeout(done);
    };
  }, [onDone]);

  return (
    <motion.div
      className="bg-drop-unit"
      style={{ left: `${left}%`, opacity, width: size }}
      initial={{ y: "-16vh", scaleY: 1.18, rotate: 0 }}
      animate={{
        y: ["-16vh", "12vh", "95vh"],
        scaleY: [1.18, 1.05, 1],
        rotate: [0, 6, -5, 3, 0],
      }}
      transition={{
        y: { duration: 4.2, times: [0, 0.25, 1], ease: [0.45, 0.05, 0.25, 1] },
        scaleY: { duration: 0.5, ease: "easeIn" },
        rotate: { duration: 3.4, ease: "easeInOut" },
      }}
    >
      <motion.div
        animate={{ scale: deploy ? [0.1, 1.08, 1] : 0.1 }}
        transition={{ duration: 0.4, ease: [0.34, 1.4, 0.64, 1] }}
        style={{ transformOrigin: "50% 30%" }}
      >
        <ParachuteRigGraphic width={size} deployed={deploy} capsuleOnly={deploy < 0.45} />
      </motion.div>
    </motion.div>
  );
}