import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { TokenSymbol } from "../data/positions";
import { buildPriceSeries } from "../data/positions";
import { useMotionSafe } from "../lib/motion";
import { Expandable } from "./Expandable";

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
    let high = series[0] ?? basePrice;
    const stops: number[] = [];
    for (let i = 0; i < visible.length; i++) {
      const p = visible[i] ?? basePrice;
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
  let peak = visible[0] ?? basePrice;
  for (const p of visible) if (p > peak) peak = p;
    const highY = scaleY(peak);
    const cushionPath = `${pricePath} L${dotX.toFixed(2)},${stopY.toFixed(2)} L0,${stopY.toFixed(2)} Z`;

    return { pricePath, stopLine, dotX, dotY, stopY, highY, cushionPath, h, w, high };
  }, [series, frame, basePrice, trailPct]);

  const riseEnd = Math.floor(series.length * 0.82);

  useEffect(() => {
    if (!animated) {
      setFrame(Math.floor(series.length * 0.58));
      setTriggerFlash(false);
      return;
    }
    setFrame(4);
    setTriggerFlash(false);
    let i = 4;
    const id = window.setInterval(() => {
      i += 1;
      setFrame(i);
      if (i >= series.length - 1) {
        window.clearInterval(id);
        setTriggerFlash(true);
      }
    }, reduce ? 0 : 95);
    return () => clearInterval(id);
  }, [animated, series, token, basePrice, reduce, trailPct]);

  const showTriggerPulse = triggerFlash && frame >= riseEnd;

  useEffect(() => {
    if (!animated || !showTriggerPulse) return;
    const reset = window.setTimeout(() => {
      setFrame(Math.floor(series.length * 0.58));
      setTriggerFlash(false);
    }, 2400);
    return () => clearTimeout(reset);
  }, [animated, showTriggerPulse, series.length]);

  const latest = series[frame] ?? basePrice;
  const stopNow = (() => {
    const slice = series.slice(0, frame + 1);
    let high = slice[0] ?? basePrice;
    for (const p of slice) {
      if (p > high) high = p;
    }
    return high * (1 - trailPct / 100);
  })();

  return (
    <section
      id="chart"
      className="panel panel-app chart-panel chart-hero"
      aria-label="Live trailing stop chart"
    >
      <header className="panel-head chart-head panel-head-compact">
        <div>
          <h2>Live chart</h2>
          <div className="chart-prices tabular">
            <motion.span
              key={latest.toFixed(2)}
              initial={reduce ? false : { opacity: 0.6, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              ${latest.toFixed(2)}
            </motion.span>
            <span className="stop">${stopNow.toFixed(2)}</span>
          </div>
          <Expandable summary="Chart details" size="sm" className="chart-legend-expand">
            <p className="muted">
              {token}/USD · {trailPct}% trail
            </p>
            <div className="chart-legend">
              <span>
                <i className="swatch price" /> Price
              </span>
              <span>
                <i className="swatch stop" /> Stop line
              </span>
            </div>
          </Expandable>
        </div>
      </header>
      <div className={`chart-stage chart-stage-fill ${showTriggerPulse ? "flash" : ""}`}>
        <svg viewBox={`0 0 ${chart.w} ${chart.h}`} preserveAspectRatio="none" className="chart-svg chart-svg-tall">
          <defs>
            <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14161C" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#14161C" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${gid}-cushion`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1f9d6b" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#e5484d" stopOpacity="0.12" />
            </linearGradient>
            <linearGradient id={`${gid}-line`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#14161C" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#14161C" />
            </linearGradient>
          </defs>
          {[0.2, 0.4, 0.6, 0.8].map((p) => (
            <line key={p} x1="0" x2={chart.w} y1={chart.h * p} y2={chart.h * p} className="chart-grid-line" />
          ))}
          <path
            d={`${chart.pricePath} L${(frame / (series.length - 1)) * chart.w},${chart.h} L0,${chart.h} Z`}
            fill={`url(#${gid}-fill)`}
          />
          <path d={chart.cushionPath} fill={`url(#${gid}-cushion)`} opacity="0.85" />
          <line x1="0" x2={chart.w} y1={chart.highY} y2={chart.highY} className="chart-peak-tick" />
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
          <circle cx={chart.dotX} cy={chart.dotY} r="2.8" className="price-dot-glow" />
          <circle cx={chart.dotX} cy={chart.dotY} r="1.1" className="price-dot-core" />
          {showTriggerPulse && (
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
        <Expandable summary="How to read this chart" size="sm">
          <p className="chart-caption">
            Trailing stop ratchets with new highs; trigger fires when price closes through the line.
          </p>
        </Expandable>
      </div>
    </section>
  );
}