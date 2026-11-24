import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useMemo, useRef, useState } from "react";
import { BackgroundParachuteDrops } from "../components/BackgroundParachuteDrops";
import { HoverLandParachute } from "../components/HoverLandParachute";
import { HeroIntroOverlay } from "./HeroIntroOverlay";
import { useMotionSafe } from "../lib/motion";
import {
  buildAltitudePath,
  narrativePathProgress,
  pointAtProgress,
  pointsToPath,
  tetherLengthPx,
} from "./fallPaths";
import { HowItWorksRail } from "./HowItWorksRail";
import { Capsule } from "./svg/Capsule";
import { SpringCanopy } from "./SpringCanopy";
import { motion } from "framer-motion";

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

declare global {
  interface Window {
    __PARACHUTE_FORCE_MOTION__?: boolean;
  }
}

export function FallNarrative({ ethSpot, onReachApp }: Props) {
  const { reduce: reducePref } = useMotionSafe();
  const reduce = reducePref && !window.__PARACHUTE_FORCE_MOTION__;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visualPanelEl, setVisualPanelEl] = useState<HTMLDivElement | null>(null);
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
    if (progress < 1 / SCENES) return base;
    const drop = progress < 0.2 ? 0 : Math.min(1, (progress - 0.2) / 0.35);
    const recover = progress > 0.72 ? (progress - 0.72) / 0.28 : 0;
    return base * (1 - drop * 0.18) + recover * base * 0.03;
  }, [ethSpot, progress]);

  const [ctaHover, setCtaHover] = useState(false);
  const [narrativeExited, setNarrativeExited] = useState(false);
  const [heroIntroDone, setHeroIntroDone] = useState(() => reduce);
  const showScrollCta = scene === 6 && progress < 0.93 && !narrativeExited;
  const showHeroIntro = scene === 0 && !heroIntroDone;

  useEffect(() => {
    if (scene > 0) setHeroIntroDone(true);
  }, [scene]);

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
  const skyScene = scene >= 3;
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

    const exitSt = ScrollTrigger.create({
      trigger: el,
      start: "bottom bottom+=1",
      onEnter: () => setNarrativeExited(true),
      onLeaveBack: () => setNarrativeExited(false),
    });

    const refresh = () => ScrollTrigger.refresh();
    refresh();
    requestAnimationFrame(refresh);
    const ro = new ResizeObserver(refresh);
    ro.observe(el);

    return () => {
      ro.disconnect();
      st.kill();
      exitSt.kill();
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
    scene,
    sceneT: t,
    showHeroIntro,
  };

  if (reduce) {
    const sp = (staticScene + 0.55) / SCENES;
    const pt = pointAtProgress(pathPts, sp);
    return (
      <section className="fall-fallback" aria-label="Story preview" data-scene={SCENE_NAMES[staticScene]}>
        <div className="fall-split">
          <PhaseCopy scene={staticScene} savedDemo={savedDemo} price={priceDisplay} />
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
                scene={staticScene}
                sceneT={0.55}
                showHeroIntro={false}
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
      <div className={`fall-pin ${skyScene ? "fall-sky" : ""} ${narrativeExited ? "fall-pin-exited" : ""}`}>
        <div className="fall-grain" aria-hidden />
        <div className="fall-cloud-drift" aria-hidden />
        <BackgroundParachuteDrops storyActive={scene < 6 && !narrativeExited} variant="hero" />
        {scene === 4 && <BackgroundParachuteDrops storyActive variant="landing" />}
        <div className="fall-altimeter tabular" aria-live="polite">
          <span className="fall-alt-label">ALT</span>
          <span className="fall-alt-value">${priceDisplay.toFixed(2)}</span>
          <span className="fall-alt-sub">
            ETH/USD · <span className="fall-alt-mode">live</span>
          </span>
        </div>

        <div className="fall-split">
          <PhaseCopy
            scene={scene}
            savedDemo={savedDemo}
            price={priceDisplay}
            fundsSaved={scene === 4 ? Math.floor(savedDemo * (0.35 + t * 0.65)) : undefined}
          />
          <div className="fall-visual-panel" ref={setVisualPanelEl}>
            {showHeroIntro && (
              <HeroIntroOverlay
                active
                panelEl={visualPanelEl}
                capX={capX}
                capY={capY}
                viewW={W}
                viewH={H}
                onComplete={() => setHeroIntroDone(true)}
              />
            )}
            <div className="fall-stage" style={{ transform: `rotate(${tilt}deg)` }}>
              <svg viewBox={`0 0 ${W} ${H}`} className="fall-svg" role="img" aria-label="Price path and capsule">
                <FallSvgLayer {...visualProps} />
              </svg>
            </div>
            {showTrailLabel && <span className="fall-trail-badge tabular">TRAIL {trailPct}%</span>}
          </div>
        </div>

        {scene === 3 && <RipcordDiagram step={Math.min(2, Math.floor(t * 3.2))} />}
        {scene === 5 && <HowItWorksRail progress={t} />}
        {groundGlow && <div className="fall-ground-glow" style={{ opacity: 0.35 + t * 0.35 }} aria-hidden />}
        {showScrollCta && (
          <button
            type="button"
            className="fall-capsule-cta"
            onClick={scrollToApp}
            onMouseEnter={() => setCtaHover(true)}
            onMouseLeave={() => setCtaHover(false)}
            onFocus={() => setCtaHover(true)}
            onBlur={() => setCtaHover(false)}
            aria-label="Create stop"
          >
            <HoverLandParachute active={ctaHover} />
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
  savedDemo,
  fundsSaved,
}: {
  scene: number;
  price: number;
  savedDemo?: number;
  fundsSaved?: number;
}) {
  return (
    <div className="fall-copy" data-scene-index={scene}>
      {scene === 0 && (
        <>
          <p className="fall-eyebrow">Reactive Omni · Set It and Forget It</p>
          <h1 className="fall-h1">
            Automated <span className="fall-nb">stop{"\u2011"}loss</span>
            <br />
            <span className="fall-accent">that actually lands</span>
          </h1>
          <p className="fall-lede">
            Parachute watches real Chainlink <code>AnswerUpdated</code> events on Base Sepolia, reacts on Lasna, and
            callbacks your vault before the dip becomes a crash.
          </p>
          <p className="fall-live tabular">
            ETH/USD ${price.toFixed(2)} <span className="fall-alt-mode-inline">· live</span>
          </p>
        </>
      )}
      {scene === 1 && <h2 className="fall-scene-h2 proposed-copy">Crashes don&apos;t wait for you to wake up.</h2>}
      {scene === 2 && <h2 className="fall-scene-h2 proposed-copy">A stop that climbs with you.</h2>}
      {scene === 3 && <h2 className="fall-scene-h2 proposed-copy">Price breaks the line. The chute opens.</h2>}
      {scene === 4 && <h2 className="fall-scene-h2 proposed-copy">Land safely in stables.</h2>}
      {scene === 4 && savedDemo !== undefined && (
        <>
          <p className="fall-ground-label">stable ground · ${price.toFixed(0)}</p>
          {fundsSaved !== undefined && (
            <p className="fall-saved fall-saved-inline tabular">
              Example: funds saved <strong>${fundsSaved.toLocaleString()}</strong>
            </p>
          )}
        </>
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
  scene,
  sceneT,
  showHeroIntro,
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
  scene: number;
  sceneT: number;
  showHeroIntro?: boolean;
}) {
  const stableY = H * 0.8;
  const touchdown = scene === 4;
  const bounceY =
    touchdown && sceneT > 0.38
      ? 11 * Math.sin((sceneT - 0.38) * Math.PI * 2.4) * Math.exp(-(sceneT - 0.38) * 3.2)
      : 0;
  const collapseOpen =
    touchdown && sceneT > 0.58 ? Math.max(0, canopyOpen * (1 - (sceneT - 0.58) * 2.4)) : canopyOpen;
  const ripples = touchdown && sceneT > 0.42 && sceneT < 0.9;
  return (
    <>
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={groundGlow || canopyOpen > 0 ? "#CFE3F2" : "#F3EEE4"} />
          <stop offset="100%" stopColor={groundGlow ? "#EAE3D6" : "#F3EEE4"} />
        </linearGradient>
        <filter id="capsuleGlow">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14161C" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#14161C" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} rx="8" fill="url(#skyGrad)" stroke="rgba(20,22,28,0.12)" />
      {[0.2, 0.4, 0.6, 0.8].map((gy) => (
        <g key={gy}>
          <line x1="8" x2={W - 8} y1={H * gy} y2={H * gy} className="alt-grid" />
          {[0.25, 0.5, 0.75].map((tx) => (
            <line key={tx} x1={8 + (W - 16) * tx} x2={8 + (W - 16) * tx} y1={H * gy - 3} y2={H * gy + 3} className="chart-tick" />
          ))}
        </g>
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
      <path
        d={fullPath}
        fill="none"
        stroke="#14161C"
        strokeOpacity="0.42"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {(() => {
        const m = pathDrawn.match(/^M([\d.]+),([\d.]+)/);
        const sx = m ? Number(m[1]) : 12;
        const floor = H - 10;
        if (pathDrawn.length <= 8) return null;
        return (
          <path d={`${pathDrawn} L${capX.toFixed(1)},${floor} L${sx},${floor} Z`} fill="url(#priceFill)" />
        );
      })()}
      <path
        d={pathDrawn}
        fill="none"
        stroke="#5C6170"
        strokeWidth="2.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
      {!showHeroIntro && (
        <>
          <SpringCanopy x={capX} y={capY + bounceY - 10} open={collapseOpen} scene={scene} />
          <Capsule x={capX} y={capY + bounceY} scale={1.15} />
        </>
      )}
      {groundGlow && (
        <>
          <rect x="0" y={stableY} width={W} height={H * 0.2} className="stable-ground" rx="0" />
          {ripples && (
            <motion.ellipse
              cx={capX}
              cy={stableY + 2}
              rx={8}
              ry={3}
              fill="none"
              stroke="#14161C"
              strokeOpacity={0.25}
              initial={false}
              animate={{ rx: [8, 54, 72], ry: [3, 8, 4], opacity: [0.45, 0.2, 0] }}
              transition={{ duration: 0.85, ease: "easeOut" }}
            />
          )}
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