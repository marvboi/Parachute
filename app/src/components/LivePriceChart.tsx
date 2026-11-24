import { useEffect, useMemo, useState } from "react";
import type { TokenSymbol } from "../data/demoSeed";
import { buildPriceSeries } from "../data/demoSeed";

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

  const { path, stopPath, highIdx } = useMemo(() => {
    const visible = series.slice(0, frame + 1);
    let high = visible[0] ?? basePrice;
    const stops: number[] = [];
    for (const p of visible) {
      if (p > high) high = p;
      stops.push(high * (1 - trailPct / 100));
    }
    const w = 100;
    const h = 48;
    const max = Math.max(...series) * 1.02;
    const min = Math.min(...series) * 0.98;
    const scaleY = (v: number) => h - ((v - min) / (max - min)) * h;
    const scaleX = (i: number) => (i / (series.length - 1)) * w;

    const pricePath = visible.map((v, i) => `${i === 0 ? "M" : "L"}${scaleX(i).toFixed(2)},${scaleY(v).toFixed(2)}`).join(" ");
    const stopLine = stops.map((v, i) => `${i === 0 ? "M" : "L"}${scaleX(i).toFixed(2)},${scaleY(v).toFixed(2)}`).join(" ");

    let highAt = 0;
    for (let i = 0; i < visible.length; i++) {
      if (visible[i] >= high) highAt = i;
    }
    return { path: pricePath, stopPath: stopLine, highIdx: highAt };
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
    }, 120);
    return () => window.clearInterval(id);
  }, [animated, series, token, basePrice]);

  const latest = series[frame] ?? basePrice;
  const stopNow = (() => {
    const slice = series.slice(0, frame + 1);
    const high = Math.max(...slice);
    return high * (1 - trailPct / 100);
  })();

  return (
    <section className="panel chart-panel" aria-label="Live trailing stop chart">
      <header className="panel-head">
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
        <div className="chart-prices">
          <span className="mono">${latest.toFixed(2)}</span>
          <span className="mono stop">${stopNow.toFixed(2)}</span>
        </div>
      </header>
      <div className={`chart-stage ${triggerFlash ? "flash" : ""}`}>
        <svg viewBox="0 0 100 48" preserveAspectRatio="none" className="chart-svg">
          <defs>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF5B1F" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#FF5B1F" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${path} L${(frame / (series.length - 1)) * 100},48 L0,48 Z`} fill="url(#priceFill)" />
          <path d={stopPath} className="stop-line" pathLength={1} />
          <path d={path} className="price-line" />
          <circle cx={(highIdx / (series.length - 1)) * 100} cy={12} r="1.2" className="high-marker" />
          {triggerFlash && <circle cx={100} cy={38} r="2.5" className="trigger-burst" />}
        </svg>
        <p className="chart-caption">
          Trailing stop ratchets with new highs; trigger fires when price closes through the line.
        </p>
      </div>
    </section>
  );
}