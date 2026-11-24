import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { TokenSymbol } from "../data/demoSeed";
import { buildPriceSeries } from "../data/demoSeed";
import { useMotionSafe } from "../lib/motion";

type Props = {
  token: TokenSymbol;
  basePrice: number;
  trailPct: number;
  animated: boolean;
};

export function LivePriceChart({ token, basePrice, trailPct, animated }: Props) {
  const series = useMemo(() => buildPriceSeries(basePrice), [basePrice]);
  const [frame, setFrame] = useState(series.length - 1);
  const [triggerFlash, setTriggerFlash] = useState(false);
  const { reduce } = useMotionSafe();
  const gid = `chart-${token}`;

  const chart = useMemo(() => {
    const visible = series.slice(0, frame + 1);
    let high = visible[0] ?? basePrice;
    const stops: number[] = [];
    for (const p of visible) {
      if (p > high) high = p;
      stops.push(high * (1 - trailPct / 100));
    }
    const w = 100;
    const h = 56;
    const max = Math.max(...series) * 1.02;
    const min = Math.min(...series) * 0.98;
    const scaleY = (v: number) => h - ((v - min) / (max - min)) * h;
    const scaleX = (i: number) => (i / (series.length - 1)) * w;

    const pricePath = visible
      .map((v, i) => `${i === 0 ? "M" : "L"}${scaleX(i).toFixed(2)},${scaleY(v).toFixed(2)}`)
      .join(" ");
    const stopLine = stops.map((v, i) => `${i === 0 ? "M" : "L"}${scaleX(i).toFixed(2)},${scaleY(v).toFixed(2)}`).join(" ");

    const lastI = frame;
    const dotX = scaleX(lastI);
    const dotY = scaleY(visible[visible.length - 1] ?? basePrice);
    const stopY = scaleY(stops[stops.length - 1] ?? basePrice);

    return { pricePath, stopLine, dotX, dotY, stopY, h, w, high };
  }, [series, frame, basePrice, trailPct]);

  useEffect(() => {
    if (!animated) {
      setFrame(series.length - 1);
      return;
    }
    setFrame(8);
    setTriggerFlash(false);
    let i = 8;
    const id = window.setInterval(() => {
      i += 1;
      setFrame(i);
      if (i >= series.length - 1) {
        window.clearInterval(id);
        setTriggerFlash(true);
      }
    }, reduce ? 0 : 95);
    return () => window.clearInterval(id);
  }, [animated, series, token, basePrice, reduce]);

  const latest = series[frame] ?? basePrice;
  const stopNow = (() => {
    const slice = series.slice(0, frame + 1);
    const high = Math.max(...slice);
    return high * (1 - trailPct / 100);
  })();

  return (
    <section className="panel glass chart-panel chart-hero" aria-label="Live trailing stop chart">
      <header className="panel-head chart-head">
        <div>
          <h2>Live chart</h2>
          <p className="muted">
            {token}/USD · {trailPct}% trail
          </p>
        </div>
        <div className="chart-legend">
          <span>
            <i className="swatch price" /> Price
          </span>
          <span>
            <i className="swatch stop" /> Stop line
          </span>
        </div>
        <div className="chart-prices tabular">
          <span>${latest.toFixed(2)}</span>
          <span className="stop">${stopNow.toFixed(2)}</span>
        </div>
      </header>
      <div className={`chart-stage chart-stage-fill ${triggerFlash ? "flash" : ""}`}>
        <svg viewBox={`0 0 ${chart.w} ${chart.h}`} preserveAspectRatio="none" className="chart-svg chart-svg-tall">
          <defs>
            <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF5B1F" stopOpacity="0.55" />
              <stop offset="55%" stopColor="#FF5B1F" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#FF5B1F" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${gid}-line`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ff8f4a" />
              <stop offset="100%" stopColor="#FF5B1F" />
            </linearGradient>
            <filter id={`${gid}-dot`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {[0.2, 0.4, 0.6, 0.8].map((p) => (
            <line key={p} x1="0" x2={chart.w} y1={chart.h * p} y2={chart.h * p} className="chart-grid-line" />
          ))}
          <path
            d={`${chart.pricePath} L${(frame / (series.length - 1)) * chart.w},${chart.h} L0,${chart.h} Z`}
            fill={`url(#${gid}-fill)`}
          />
          <motion.path
            d={chart.stopLine}
            className="stop-line stop-line-glow"
            initial={false}
            animate={reduce ? {} : { opacity: [0.65, 1, 0.65] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
          <path
            d={chart.pricePath}
            className="price-line price-line-gradient"
            style={{ stroke: `url(#${gid}-line)` }}
          />
          <circle cx={chart.dotX} cy={chart.dotY} r="2.8" className="price-dot-glow" filter={`url(#${gid}-dot)`} />
          <circle cx={chart.dotX} cy={chart.dotY} r="1.1" className="price-dot-core" />
          {triggerFlash && (
            <motion.circle
              cx={chart.dotX}
              cy={chart.dotY}
              r="1.5"
              className="trigger-pulse"
              initial={{ scale: 1, opacity: 1 }}
              animate={reduce ? {} : { scale: [1, 6, 8], opacity: [0.8, 0.2, 0] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          )}
          <line x1={chart.dotX} x2={chart.dotX} y1={chart.dotY} y2={chart.stopY} className="chart-vert-guide" />
        </svg>
        <p className="chart-caption">
          Trailing stop ratchets with new highs; trigger fires when price closes through the line.
        </p>
      </div>
    </section>
  );
}