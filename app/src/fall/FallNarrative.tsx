import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMotionSafe } from "../lib/motion";
import { buildAltitudePath, pointAtProgress, pointsToPath, tetherGap } from "./fallPaths";
import { HowItWorksRail } from "./HowItWorksRail";
import { Canopy } from "./svg/Canopy";
import { Capsule } from "./svg/Capsule";

gsap.registerPlugin(ScrollTrigger);

type Props = {
  ethSpot: number;
  onReachApp: () => void;
};

const SCENES = 7;

function phase(progress: number): number {
  return Math.min(SCENES - 1, Math.floor(progress * SCENES));
}

function localT(progress: number): number {
  const p = progress * SCENES;
  return p - Math.floor(p);
}

export function FallNarrative({ ethSpot, onReachApp }: Props) {
  const { reduce } = useMotionSafe();
  const pinRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [staticScene, setStaticScene] = useState(0);

  const pathPts = useMemo(() => buildAltitudePath(56), []);
  const pathProgress = Math.min(1, progress * 1.05);
  const capPt = pointAtProgress(pathPts, pathProgress);
  const W = 800;
  const H = 520;

  const priceDisplay = useMemo(() => {
    const base = ethSpot;
    const drop = progress < 0.2 ? 0 : Math.min(1, (progress - 0.2) / 0.35);
    const recover = progress > 0.72 ? (progress - 0.72) / 0.28 : 0;
    return base * (1 + 0.06 * (1 - progress)) * (1 - drop * 0.22) + recover * base * 0.04;
  }, [ethSpot, progress]);

  const scene = reduce ? staticScene : phase(progress);
  const t = reduce ? 0.5 : localT(progress);
  const ratchet = scene >= 2 ? Math.min(1, (scene - 2 + t) / 2) : 0;
  const trailPct = 5;
  const tetherLen = tetherGap(trailPct, ratchet) * H;
  const capX = capPt.x * W;
  const capY = capPt.y * H;
  const pathDrawn = pointsToPath(pathPts.slice(0, Math.ceil(pathProgress * pathPts.length)), W, H);
  const fullPath = pointsToPath(pathPts, W, H);
  const canopyOpen = scene >= 3 ? Math.min(1, scene === 3 ? t * 1.4 : scene > 3 ? 1 : 0) : 0;
  const tetherFlash = scene === 3 && t > 0.85;
  const groundGlow = scene >= 5;
  const tilt = scene === 1 ? t * 8 : scene >= 2 && scene < 5 ? 8 + (scene - 1) * 3 : scene >= 5 ? 4 : 0;
  const savedDemo = 482_350;

  useEffect(() => {
    if (reduce || !pinRef.current || !spacerRef.current) return;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: spacerRef.current,
        start: "top top",
        end: "bottom bottom",
        pin: pinRef.current,
        scrub: reduce ? false : 0.85,
        anticipatePin: 1,
        onUpdate: (self) => setProgress(self.progress),
      });
    });
    return () => ctx.revert();
  }, [reduce]);

  useEffect(() => {
    if (progress > 0.92) onReachApp();
  }, [progress, onReachApp]);

  const scrollToApp = () => {
    document.querySelector("#pack-app")?.scrollIntoView({ behavior: "smooth" });
  };

  if (reduce) {
    return (
      <section className="fall-fallback" aria-label="Story preview">
        <PhaseCopy scene={staticScene} price={priceDisplay} ethSpot={ethSpot} />
        <svg viewBox={`0 0 ${W} ${H}`} className="fall-svg fall-svg-static">
          <FallSvgLayer
            W={W}
            H={H}
            pathDrawn={pathDrawn}
            fullPath={fullPath}
            capX={capX}
            capY={capY}
            tetherLen={tetherLen}
            canopyOpen={staticScene >= 4 ? 0.85 : 0}
            tetherFlash={false}
            groundGlow={staticScene >= 5}
            streaks={staticScene === 1}
            trailPct={trailPct}
            ratchetNotches={Math.floor(ratchet * 5)}
          />
        </svg>
        <div className="fall-scene-dots">
          {Array.from({ length: SCENES }).map((_, i) => (
            <button key={i} type="button" className={i === staticScene ? "active" : ""} onClick={() => setStaticScene(i)}>
              {i + 1}
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
    <div className="fall-scroll-wrap">
      <div ref={pinRef} className="fall-pin">
        <div className="fall-grain" aria-hidden />
        <div className="fall-vignette" style={{ opacity: 0.25 + progress * 0.45 }} aria-hidden />
        <div className="fall-altimeter tabular" aria-live="polite">
          <span className="fall-alt-label">Altitude</span>
          <span className="fall-alt-value">${priceDisplay.toFixed(2)}</span>
          <span className="fall-alt-sub">ETH/USD live</span>
        </div>
        <PhaseCopy scene={scene} price={priceDisplay} ethSpot={ethSpot} savedDemo={savedDemo} />
        <div className="fall-stage" style={{ transform: `rotate(${tilt}deg)` }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="fall-svg" role="img" aria-label="Price path and capsule">
            <FallSvgLayer
              W={W}
              H={H}
              pathDrawn={pathDrawn}
              fullPath={fullPath}
              capX={capX}
              capY={capY}
              tetherLen={tetherLen}
              canopyOpen={canopyOpen}
              tetherFlash={tetherFlash}
              groundGlow={groundGlow}
              streaks={scene === 1}
              trailPct={trailPct}
              ratchetNotches={Math.floor(ratchet * 6)}
            />
          </svg>
          {scene === 3 && (
            <RipcordDiagram step={Math.floor(t * 3)} />
          )}
        </div>
        {scene === 5 && (
          <p className="fall-saved tabular">
            Example: funds saved <strong>${Math.floor(savedDemo * (0.4 + t * 0.6)).toLocaleString()}</strong>{" "}
            <span className="demo-tag">(demo)</span>
          </p>
        )}
        {scene === 5 && <HowItWorksRail progress={t} />}
        {scene >= 4 && <div className="fall-ground-glow" style={{ opacity: groundGlow ? 0.5 + t * 0.35 : 0 }} aria-hidden />}
        {scene === 6 && (
          <button type="button" className="fall-capsule-cta" onClick={scrollToApp} aria-label="Create stop">
            <svg viewBox="0 0 72 48" width="72" height="48" aria-hidden>
              <Capsule x={36} y={24} scale={1.2} />
            </svg>
            <span>Pack your parachute</span>
          </button>
        )}
      </div>
      <div ref={spacerRef} className="fall-spacer" style={{ height: `${SCENES * 115}vh` }} aria-hidden />
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
    <div className="fall-copy" key={scene}>
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
      {scene === 5 && savedDemo !== undefined && (
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
  ratchetNotches: number;
}) {
  return (
    <>
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#121829" />
          <stop offset="100%" stopColor="#0A0E1A" />
        </linearGradient>
        <filter id="capsuleGlow">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="priceStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF5B1F" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FF5B1F" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#skyGrad)" />
      {[0.15, 0.35, 0.55, 0.75].map((gy) => (
        <line key={gy} x1="0" x2={W} y1={H * gy} y2={H * gy} className="alt-grid" />
      ))}
      {streaks &&
        Array.from({ length: 8 }).map((_, i) => (
          <line key={i} x1={80 + i * 90} y1={-20} x2={80 + i * 90} y2={H * 0.6} className="speed-streak" opacity={0.15 + (i % 3) * 0.08} />
        ))}
      <path d={fullPath} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <path d={pathDrawn} fill="none" stroke="url(#priceStroke)" strokeWidth="2.5" strokeLinecap="round" />
      {tetherLen > 0 && (
        <>
          <line
            x1={capX}
            y1={capY + 10}
            x2={capX}
            y2={capY + 10 + tetherLen}
            className={`tether-line ${tetherFlash ? "flash-once" : ""}`}
          />
          {Array.from({ length: ratchetNotches }).map((_, i) => (
            <line key={i} x1={capX + 6} y1={capY + 10 + tetherLen - i * 8} x2={capX + 18} y2={capY + 10 + tetherLen - i * 8} className="ratchet-notch" />
          ))}
          <text x={capX + 24} y={capY + 10 + tetherLen * 0.45} className="trail-dim tabular" fontSize="11">
            {trailPct}% trail
          </text>
        </>
      )}
      <Canopy x={capX} y={capY - 8} open={canopyOpen} />
      <Capsule x={capX} y={capY} />
      {groundGlow && (
        <>
          <rect x="0" y={H * 0.82} width={W} height={H * 0.18} className="stable-ground" />
          <text x={W / 2} y={H * 0.95} textAnchor="middle" className="ground-mint" fontSize="14">
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