import { useMemo } from "react";
import type { TokenSymbol } from "../data/demoSeed";
import { PROOF_PRICES, buildPriceSeries } from "../data/demoSeed";

type Props = {
  token: TokenSymbol;
  trailPct: number;
  height?: number;
};

export function MiniFallChart({ token, trailPct, height = 120 }: Props) {
  const base = PROOF_PRICES[token];
  const series = useMemo(() => buildPriceSeries(base, 32), [base]);
  const high = Math.max(...series);
  const trigger = high * (1 - trailPct / 100);
  const w = 200;
  const h = height;

  const { pricePath, stopY } = useMemo(() => {
    const min = Math.min(...series) * 0.98;
    const max = high * 1.02;
    const sy = (v: number) => h - ((v - min) / (max - min)) * h;
    const sx = (i: number) => (i / (series.length - 1)) * w;
    const pricePath = series.map((v, i) => `${i === 0 ? "M" : "L"}${sx(i)},${sy(v)}`).join(" ");
    return { pricePath, stopY: sy(trigger) };
  }, [series, h, high, trigger]);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mini-fall-chart" aria-hidden>
      <path d={`${pricePath} L${w},${h} L0,${h} Z`} fill="rgba(20,22,28,0.06)" />
      <path d={pricePath} fill="none" stroke="#14161C" strokeWidth="1.5" />
      <line x1="0" y1={stopY} x2={w} y2={stopY} className="mini-stop-line" strokeDasharray="4 3" />
      <circle cx={w - 2} cy={stopY} r="3" fill="#1F9D6B" stroke="#14161C" strokeWidth="0.5" />
    </svg>
  );
}

export function triggerPricePreview(token: TokenSymbol, trailPct: number): number {
  const series = buildPriceSeries(PROOF_PRICES[token], 32);
  const high = Math.max(...series);
  return high * (1 - trailPct / 100);
}