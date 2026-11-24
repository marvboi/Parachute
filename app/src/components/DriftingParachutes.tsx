import type { CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export type DriftZone = "hero" | "bridge" | "landing" | "cta";

type Spec = {
  left: string;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  /** Static / paused vertical position */
  pauseY: string;
};

const ZONE_SPECS: Record<DriftZone, Spec[]> = {
  hero: [
    { left: "54%", size: 64, duration: 34, delay: 0, opacity: 0.88, pauseY: "32vh" },
    { left: "72%", size: 48, duration: 42, delay: 7, opacity: 0.78, pauseY: "48vh" },
    { left: "86%", size: 36, duration: 38, delay: 12, opacity: 0.72, pauseY: "58vh" },
    { left: "61%", size: 52, duration: 46, delay: 18, opacity: 0.85, pauseY: "38vh" },
  ],
  bridge: [
    { left: "22%", size: 40, duration: 40, delay: 0, opacity: 0.75, pauseY: "40vh" },
    { left: "68%", size: 34, duration: 44, delay: 6, opacity: 0.68, pauseY: "52vh" },
  ],
  landing: [
    { left: "6%", size: 44, duration: 48, delay: 0, opacity: 0.85, pauseY: "62vh" },
    { left: "16%", size: 36, duration: 52, delay: 5, opacity: 0.78, pauseY: "70vh" },
    { left: "26%", size: 32, duration: 46, delay: 10, opacity: 0.72, pauseY: "56vh" },
  ],
  cta: [
    { left: "76%", size: 40, duration: 42, delay: 2, opacity: 0.78, pauseY: "44vh" },
    { left: "88%", size: 32, duration: 48, delay: 8, opacity: 0.72, pauseY: "52vh" },
    { left: "64%", size: 28, duration: 50, delay: 12, opacity: 0.68, pauseY: "36vh" },
  ],
};

function MiniParachute({ size }: { size: number }) {
  const w = size;
  const h = size * 1.08;
  return (
    <svg width={w} height={h} viewBox="0 0 38 40" fill="none" aria-hidden className="drift-chute-svg">
      <path d="M4 12 L19 6 L34 12 L28 18 L19 15 L10 18 Z" fill="#FF5B1F" />
      <path
        d="M5 12.2 H12 V14 L14 13.2 L17 14.8 L20 13 L23 15.2 L26 13.5 L29 14.6 L33 12.2"
        stroke="#14161C"
        strokeWidth="1.2"
        fill="none"
        strokeLinejoin="round"
        opacity="0.85"
      />
      <path d="M10 18 L19 34 L28 18" stroke="#FF5B1F" strokeWidth="1.15" strokeLinecap="round" />
      <path d="M19 16 V34" stroke="#14161C" strokeWidth="0.85" strokeLinecap="round" opacity="0.75" />
      <path d="M15 31 L19 36 L23 31 Z" fill="#FF5B1F" stroke="#14161C" strokeWidth="0.4" />
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
      { rootMargin: "80px 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const specs = ZONE_SPECS[zone];
  const motionOn = !reduce && active;

  return (
    <div ref={rootRef} className={`drift-parachutes drift-${zone} ${className}`} aria-hidden>
      {specs.map((s, i) => (
        <div
          key={`${zone}-${i}`}
          className={`drift-chute ${motionOn ? "drift-chute-anim" : "drift-chute-paused"}`}
          style={
            {
              left: s.left,
              opacity: s.opacity,
              width: s.size,
              ["--drift-dur" as string]: `${s.duration}s`,
              ["--drift-delay" as string]: `${s.delay}s`,
              ["--drift-pause-y" as string]: s.pauseY,
            } as CSSProperties
          }
        >
          <MiniParachute size={s.size} />
        </div>
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
    <span
      className={`hover-land-chute ${reduce ? "hover-land-chute-static" : "hover-land-chute-drop"}`}
      aria-hidden
    >
      <span className="hover-land-inner">
        <MiniParachute size={28} />
      </span>
    </span>
  );
}