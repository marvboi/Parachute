import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

type Drop = {
  id: number;
  left: number;
  size: number;
  opacity: number;
  delay: number;
};

function DropIcon({ size, open }: { size: number; open: number }) {
  const w = size;
  const h = size * 1.08;
  const canopyY = open > 0.2 ? 0 : 2;
  return (
    <svg width={w} height={h} viewBox="0 0 38 40" fill="none" aria-hidden>
      {open > 0.15 && (
        <path d="M4 12 L19 6 L34 12 L28 18 L19 15 L10 18 Z" fill="#FF5B1F" opacity={0.35 + open * 0.65} />
      )}
      {open > 0.4 && (
        <>
          <path
            d="M5 12.2 H12 V14 L14 13.2 L17 14.8 L20 13 L23 15.2 L26 13.5 L29 14.6 L33 12.2"
            stroke="#14161C"
            strokeWidth="1"
            fill="none"
            opacity="0.7"
          />
          <path d="M10 18 L19 34 L28 18" stroke="#FF5B1F" strokeWidth="1" opacity="0.9" />
          <path d="M15 31 L19 36 L23 31 Z" fill="#FF5B1F" />
        </>
      )}
      {open <= 0.4 && (
        <rect x="14" y={14 + canopyY} width="10" height="14" rx="5" fill="#FF5B1F" opacity="0.95" />
      )}
    </svg>
  );
}

type Props = {
  enabled: boolean;
  /** left-side landing accents */
  variant?: "hero" | "landing";
};

let dropId = 0;

export function BackgroundParachuteDrops({ enabled, variant = "hero" }: Props) {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  const [drops, setDrops] = useState<Drop[]>([]);

  const spawn = useCallback(() => {
    if (!enabled || !active || reduce) return;
    const left =
      variant === "landing"
        ? 4 + Math.random() * 22
        : 52 + Math.random() * 34;
    const size = variant === "landing" ? 28 + Math.random() * 16 : 32 + Math.random() * 20;
    const opacity = 0.55 + Math.random() * 0.3;
    setDrops((prev) => [...prev.slice(-2), { id: ++dropId, left, size, opacity, delay: 0 }]);
  }, [enabled, active, reduce, variant]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!enabled || reduce) return;
    const first = window.setTimeout(spawn, variant === "hero" ? 2800 : 800);
  const loop = window.setInterval(spawn, variant === "hero" ? 4800 : 5500);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(loop);
    };
  }, [enabled, reduce, spawn, variant]);

  if (reduce) return null;

  return (
    <div ref={rootRef} className={`bg-drop-field bg-drop-${variant}`} aria-hidden>
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
}: Drop & { onDone: () => void }) {
  const [open, setOpen] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setOpen(1), 520);
    const done = window.setTimeout(onDone, 4200);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(done);
    };
  }, [onDone]);

  return (
    <motion.div
      className="bg-drop-unit"
      style={{ left: `${left}%`, opacity, width: size }}
      initial={{ y: "-12vh", scaleY: 1.15, rotate: 0 }}
      animate={{
        y: ["-12vh", "18vh", "88vh"],
        scaleY: [1.15, 1.05, 1],
        rotate: [0, 5, -4, 3, 0],
      }}
      transition={{
        y: { duration: 3.8, times: [0, 0.22, 1], ease: [0.4, 0, 0.2, 1] },
        scaleY: { duration: 0.45 },
        rotate: { duration: 3.2, ease: "easeInOut" },
      }}
    >
      <DropIcon size={size} open={open} />
    </motion.div>
  );
}

export { DropIcon as MiniParachuteMark };