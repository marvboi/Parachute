import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMotionSafe } from "../lib/motion";
import {
  buildAltitudePath,
  narrativePathProgress,
  pointAtProgress,
  pointsToPath,
  tetherLengthPx,
} from "./fallPaths";
import { HowItWorksRail } from "./HowItWorksRail";
import { Canopy } from "./svg/Canopy";
import { Capsule } from "./svg/Capsule";

gsap.registerPlugin(ScrollTrigger);

type Props = {
  ethSpot: number;
  onReachApp: () => void;
};

const SCENES = 7;
const SCENE_NAMES = ["hero", "drop", "tether", "trigger", "landing", "how", "cta"] as const;

function phase(progress: number): number {
  return Math.min(SCENES - 1, Math.floor(progress * SCENES + 0.0001));
}

function localT(progress: number): number {
  const p = progress * SCENES;
  return p - Math.floor(p);
}

export function FallNarrative({ ethSpot, onReachApp }: Props) {
  const { reduce } = useMotionSafe();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [staticScene, setStaticScene] = useState(0);

  const pathPts = useMemo(() => buildAltitudePath(64), []);
  const scene = reduce ? staticScene : phase(progress);
  const t = reduce ? 0.55 : localT(progress);

  const pathProgress = narrativePathProgress(progress, scene);
  const capPt = pointAtProgress(pathPts, pathProgress);
  const W = 520;
  const H = 420;

  const priceDisplay = useMemo(() => {
    const base = ethSpot;
    const drop = progress < 0.2 ? 0 : Math.min(1, (progress - 0.2) / 0.35);
    const recover = progress > 0.72 ? (progress - 0.72) / 0.28 : 0;
    return base * (1 + 0.04 * (1 - progress)) * (1 - drop * 0.18) + recover * base * 0.03;
  }, [ethSpot, progress]);

  const trailPct = 5;
  const ratchet = scene >= 2 ? Math.min(1, (scene - 2 + t * 0.85) / 1.8) : 0;
  const tetherLen = scene >= 2 ? tetherLengthPx(trailPct, ratchet, H) : 0;
  const capX = capPt.x * W;
  const capY = capPt.y * H;
  const sliceEnd = Math.max(2, Math.ceil(pathProgress * pathPts.length));
  const pathDrawn = pointsToPath(pathPts.slice(0, sliceEnd), W, H);
  const fullPath = pointsToPath(pathPts, W, H);
  const canopyOpen =
    scene >= 3 ? Math.min(1, scene === 3 ? t * 1.2 : scene > 3 ? 0.85 + t * 0.15 : 0) : 0;
  const tetherFlash = scene === 3 && t > 0.72 && t < 0.88;
  const groundGlow = scene >= 4;
  const tilt = scene === 1 ? Math.min(6, t * 6) : 0;
  const showTether = scene >= 2;
  const showTrailLabel = scene >= 2 && scene <= 3;
  const savedDemo = 482_350;

  useEffect(() => {
    if (reduce || !wrapRef.current) return;

    const el = wrapRef.current;
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.55,
      onUpdate: (self) => setProgress(self.progress),
    });

    const refresh = () => ScrollTrigger.refresh();
    refresh();
    requestAnimationFrame(refresh);
    const ro = new ResizeObserver(refresh);
    ro.observe(el);

    return () => {
      ro.disconnect();
      st.kill();
    };
  }, [reduce]);

  useEffect(() => {
    if (progress > 0.92) onReachApp();
  }, [progress, onReachApp]);

  const scrollToApp = () => {
    document.querySelector("#pack-app")?.scrollIntoView({ behavior: "smooth" });
  };

  const visualProps = {
    W,
    H,
    pathDrawn,
    fullPath,
    capX,
    capY,
    tetherLen: showTether ? tetherLen : 0,
    canopyOpen,
    tetherFlash,
    groundGlow,
    streaks: scene === 1,
    trailPct,
    showTrailLabel,
    ratchetNotches: Math.floor(ratchet * 6),
  };

  if (reduce) {
    const sp = (staticScene + 0.55) / SCENES;
    const pt = pointAtProgress(pathPts, sp);
    return (
      <section className="fall-fallback" aria-label="Story preview" data-scene={SCENE_NAMES[staticScene]}>
        <div className="fall-split">
          <PhaseCopy scene={staticScene} ethSpot={ethSpot} savedDemo={savedDemo} price={priceDisplay} />
          <div className="fall-visual-panel">
            <svg viewBox={`0 0 ${W} ${H}`} className="fall-svg">
              <FallSvgLayer
                {...visualProps}
                pathDrawn={pointsToPath(pathPts.slice(0, Math.ceil(sp * pathPts.length)), W, H)}
                capX={pt.x * W}
                capY={pt.y * H}
                tetherLen={staticScene >= 2 ? 60 : 0}
                canopyOpen={staticScene >= 3 ? 0.9 : 0}
                tetherFlash={false}
                groundGlow={staticScene >= 4}
                streaks={staticScene === 1}
                showTrailLabel={staticScene >= 2}
                ratchetNotches={4}
              />
            </svg>
          </div>
        </div>
        <div className="fall-scene-dots">
          {SCENE_NAMES.map((name, i) => (
            <button key={name} type="button" className={i === staticScene ? "active" : ""} onClick={() => setStaticScene(i)}>
              {name}
            </button>
          ))}
        </div>
        <button type="button" className="btn-fall-cta" onClick={scrollToApp}>
          Continue to app
        </button>
      </section>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="fall-scroll-wrap"
      style={{ height: `${SCENES * 100}vh` }}
      data-progress={progress.toFixed(3)}
      data-scene={SCENE_NAMES[scene]}
    >
      <div className="fall-pin">
        <div className="fall-grain" aria-hidden />
        <div className="fall-vignette" style={{ opacity: 0.1 + progress * 0.18 }} aria-hidden />
        <div className="fall-altimeter tabular" aria-live="polite">
          <span className="fall-alt-label">Altitude</span>
          <span className="fall-alt-value">${priceDisplay.toFixed(2)}</span>
          <span className="fall-alt-sub">ETH/USD live</span>
        </div>

        <div className="fall-split">
          <PhaseCopy scene={scene} ethSpot={ethSpot} savedDemo={savedDemo} price={priceDisplay} />
          <div className="fall-visual-panel">
            <div className="fall-stage" style={{ transform: `rotate(${tilt}deg)` }}>
              <svg viewBox={`0 0 ${W} ${H}`} className="fall-svg" role="img" aria-label="Price path and capsule">
                <FallSvgLayer {...visualProps} />
              </svg>
            </div>
            {showTrailLabel && <span className="fall-trail-badge tabular">{trailPct}% trail</span>}
          </div>
        </div>

        {scene === 3 && <RipcordDiagram step={Math.min(2, Math.floor(t * 3.2))} />}
        {scene === 4 && (
          <p className="fall-saved tabular">
            Example: funds saved <strong>${Math.floor(savedDemo * (0.35 + t * 0.65)).toLocaleString()}</strong>{" "}
            <span className="demo-tag">(demo)</span>
          </p>
        )}
        {scene === 5 && <HowItWorksRail progress={t} />}
        {groundGlow && <div className="fall-ground-glow" style={{ opacity: 0.35 + t * 0.35 }} aria-hidden />}
        {scene === 6 && (
          <button type="button" className="fall-capsule-cta" onClick={scrollToApp} aria-label="Create stop">
            <svg viewBox="0 0 72 48" width="72" height="48" aria-hidden>
              <Capsule x={36} y={24} scale={1.2} />
            </svg>
            <span>Pack your parachute</span>
          </button>
        )}
      </div>
    </div>
  );
}

function PhaseCopy({
  scene,
  price,
  ethSpot,
  savedDemo,
}: {
  scene: number;
  price: number;
  ethSpot: number;
  savedDemo?: number;
}) {
  return (
    <div className="fall-copy" data-scene-index={scene}>
      {scene === 0 && (
        <>
          <p className="fall-eyebrow">Reactive Omni · Set It and Forget It</p>
          <h1 className="fall-h1">
            Automated stop-loss
            <br />
            <span className="fall-accent">that actually lands</span>
          </h1>
          <p className="fall-lede">
            Parachute watches real Chainlink <code>AnswerUpdated</code> events on Base Sepolia, reacts on Lasna, and
            callbacks your vault before the dip becomes a crash.
          </p>
          <p className="fall-live tabular">ETH/USD ${ethSpot.toFixed(2)}</p>
        </>
      )}
      {scene === 1 && <h2 className="fall-scene-h2 proposed-copy">Crashes don&apos;t wait for you to wake up.</h2>}
      {scene === 2 && <h2 className="fall-scene-h2 proposed-copy">A stop that climbs with you.</h2>}
      {scene === 3 && <h2 className="fall-scene-h2 proposed-copy">Price breaks the line. The chute opens.</h2>}
      {scene === 4 && <h2 className="fall-scene-h2 proposed-copy">Land safely in stables.</h2>}
      {scene === 4 && savedDemo !== undefined && (
        <p className="fall-ground-label">stable ground · ${price.toFixed(0)}</p>
      )}
      {scene === 6 && <h2 className="fall-scene-h2 proposed-copy">Pack your parachute</h2>}
    </div>
  );
}

function FallSvgLayer({
  W,
  H,
  pathDrawn,
  fullPath,
  capX,
  capY,
  tetherLen,
  canopyOpen,
  tetherFlash,
  groundGlow,
  streaks,
  trailPct,
  showTrailLabel,
  ratchetNotches,
}: {
  W: number;
  H: number;
  pathDrawn: string;
  fullPath: string;
  capX: number;
  capY: number;
  tetherLen: number;
  canopyOpen: number;
  tetherFlash: boolean;
  groundGlow: boolean;
  streaks: boolean;
  trailPct: number;
  showTrailLabel: boolean;
  ratchetNotches: number;
}) {
  return (
    <>
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a2238" />
          <stop offset="100%" stopColor="#0A0E1A" />
        </linearGradient>
        <filter id="capsuleGlow">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="priceStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF5B1F" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#FF5B1F" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} rx="12" fill="url(#skyGrad)" stroke="rgba(255,255,255,0.08)" />
      {[0.2, 0.4, 0.6, 0.8].map((gy) => (
        <line key={gy} x1="8" x2={W - 8} y1={H * gy} y2={H * gy} className="alt-grid" />
      ))}
      {streaks &&
        Array.from({ length: 6 }).map((_, i) => (
          <line
            key={i}
            x1={60 + i * 70}
            y1={0}
            x2={60 + i * 70}
            y2={H * 0.55}
            className="speed-streak"
            opacity={0.2 + (i % 2) * 0.1}
          />
        ))}
      <path d={fullPath} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
      <path d={pathDrawn} fill="none" stroke="url(#priceStroke)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {tetherLen > 8 && (
        <>
          <line
            x1={capX}
            y1={capY + 12}
            x2={capX}
            y2={Math.min(H - 16, capY + 12 + tetherLen)}
            className={`tether-line ${tetherFlash ? "flash-once" : ""}`}
          />
          {ratchetNotches > 0 &&
            Array.from({ length: ratchetNotches }).map((_, i) => (
              <line
                key={i}
                x1={capX + 8}
                y1={Math.min(H - 20, capY + 12 + tetherLen) - i * 10}
                x2={capX + 22}
                y2={Math.min(H - 20, capY + 12 + tetherLen) - i * 10 - 4}
                className="ratchet-notch"
              />
            ))}
          {showTrailLabel && false && (
            <text x={capX + 28} y={capY + 12 + tetherLen * 0.5} className="trail-dim tabular" fontSize="11">
              {trailPct}% trail
            </text>
          )}
        </>
      )}
      <Canopy x={capX} y={capY - 10} open={canopyOpen} />
      <Capsule x={capX} y={capY} scale={1.15} />
      {groundGlow && (
        <>
          <rect x="0" y={H * 0.8} width={W} height={H * 0.2} className="stable-ground" rx="0" />
          <text x={W / 2} y={H * 0.94} textAnchor="middle" className="ground-mint" fontSize="13">
            stable
          </text>
        </>
      )}
    </>
  );
}

function RipcordDiagram({ step }: { step: number }) {
  const nodes = ["Base Sepolia feed pulse", "Reactive contract on Lasna", "Callback to vault"];
  return (
    <div className="ripcord-diagram">
      {nodes.map((label, i) => (
        <div key={label} className={`ripcord-step ${i <= step ? "lit" : ""}`}>
          <span className="ripcord-dot" />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

export { SCENE_NAMES, SCENES };