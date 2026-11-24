import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export type DriftZone = "hero" | "bridge" | "landing" | "cta";

type Spec = {
  left: string;
  top?: string;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  sway: number;
};

const ZONE_SPECS: Record<DriftZone, Spec[]> = {
  hero: [
    { left: "12%", size: 28, duration: 48, delay: 0, opacity: 0.22, sway: 14 },
    { left: "78%", size: 22, duration: 62, delay: 8, opacity: 0.16, sway: 10 },
    { left: "44%", size: 18, duration: 70, delay: 4, opacity: 0.12, sway: 8 },
  ],
  bridge: [
    { left: "18%", size: 24, duration: 55, delay: 2, opacity: 0.18, sway: 12 },
    { left: "62%", size: 20, duration: 58, delay: 6, opacity: 0.14, sway: 9 },
  ],
  landing: [
    { left: "8%", size: 26, duration: 52, delay: 1, opacity: 0.2, sway: 11 },
    { left: "88%", size: 20, duration: 64, delay: 5, opacity: 0.15, sway: 9 },
    { left: "52%", size: 16, duration: 72, delay: 3, opacity: 0.11, sway: 7 },
  ],
  cta: [
    { left: "22%", size: 22, duration: 50, delay: 0, opacity: 0.17, sway: 10 },
    { left: "70%", size: 18, duration: 58, delay: 4, opacity: 0.13, sway: 8 },
  ],
};

function MiniParachute({ size }: { size: number }) {
  const w = size;
  const h = size * 1.05;
  return (
    <svg width={w} height={h} viewBox="0 0 38 40" fill="none" aria-hidden className="drift-chute-svg">
      <path d="M4 12 L19 6 L34 12 L28 18 L19 15 L10 18 Z" fill="#FF5B1F" opacity="0.92" />
      <path
        d="M5 12.2 H12 V14 L14 13.2 L17 14.8 L20 13 L23 15.2 L26 13.5 L29 14.6 L33 12.2"
        stroke="#14161C"
        strokeWidth="1.1"
        fill="none"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <path d="M10 18 L19 34 L28 18" stroke="#FF5B1F" strokeWidth="1.1" strokeLinecap="round" opacity="0.85" />
      <path d="M19 16 V34" stroke="#14161C" strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
      <path d="M15 31 L19 36 L23 31 Z" fill="#FF5B1F" opacity="0.9" />
    </svg>
  );
}

type Props = {
  zone: DriftZone;
  className?: string;
};

export function DriftingParachutes({ zone, className = "" }: Props) {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { rootMargin: "120px 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const specs = ZONE_SPECS[zone];

  return (
    <div ref={rootRef} className={`drift-parachutes drift-${zone} ${className}`} aria-hidden>
      {specs.map((s, i) => (
        <motion.div
          key={`${zone}-${i}`}
          className="drift-chute"
          style={{
            left: s.left,
            top: s.top,
            opacity: s.opacity,
            width: s.size,
          }}
          initial={reduce ? { y: "18vh", x: 0 } : { y: "-20vh", x: 0 }}
          animate={
            reduce || !active
              ? { y: "22vh", rotate: 0 }
              : {
                  y: ["-18vh", "100vh"],
                  rotate: [0, 2.5, -2, 1.5, 0],
                }
          }
          transition={
            reduce
              ? { duration: 0 }
              : {
                  y: { duration: s.duration, delay: s.delay, repeat: Infinity, ease: "linear" },
                  rotate: { duration: s.duration * 0.35, delay: s.delay, repeat: Infinity, ease: "easeInOut" },
                }
          }
        >
          <MiniParachute size={s.size} />
        </motion.div>
      ))}
    </div>
  );
}

type DropProps = {
  active: boolean;
};

/** Small chute that drops beside a CTA on hover / arm */
export function HoverLandParachute({ active }: DropProps) {
  const reduce = useReducedMotion();
  if (!active) return null;
  return (
    <motion.span className="hover-land-chute" aria-hidden initial={false}>
      <motion.span
        className="hover-land-inner"
        initial={reduce ? { y: 0, opacity: 1 } : { y: -36, opacity: 0 }}
        animate={reduce ? { y: 0, opacity: 1 } : { y: [ -36, 4, 0 ], opacity: [0, 1, 1] }}
        transition={reduce ? { duration: 0 } : { duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      >
        <MiniParachute size={22} />
      </motion.span>
    </motion.span>
  );
}