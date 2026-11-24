import type { Position } from "../data/demoSeed";

export type MiniViz = {
  pricePath: string;
  stopPath: string;
  zonePath: string;
  dotX: number;
  dotY: number;
  stopY: number;
  highY: number;
  w: number;
  h: number;
};

/** Mini chart from live position fields (spot, peak, stop). */
export function buildPositionMiniViz(position: Position, spot: number): MiniViz {
  const w = 140;
  const h = 56;
  const high = Math.max(position.highWater, spot);
  const stop = position.stopLevel;
  const min = Math.min(stop, spot) * 0.94;
  const max = high * 1.04 || spot * 1.02;
  const span = max - min || 1;
  const sy = (v: number) => h - ((v - min) / span) * h;
  const sx = (i: number, n: number) => (i / (n - 1)) * w;

  const n = 14;
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const wave = Math.sin(i * 0.55) * span * 0.012;
    const v = min + u * (spot - min) * 0.35 + u * u * (high - min) * 0.72 + wave;
    pts.push(Math.min(high * 1.01, Math.max(min, v)));
  }
  pts[pts.length - 1] = spot;

  const pricePath = pts
    .map((v, i) => `${i === 0 ? "M" : "L"}${sx(i, n).toFixed(1)},${sy(v).toFixed(1)}`)
    .join(" ");

  const stopY = sy(stop);
  const dotY = sy(spot);
  const highY = sy(high);
  const dotX = w - 8;
  const stopPath = `M0,${stopY.toFixed(1)} H${w}`;
  const zonePath = `${pricePath} L${dotX},${stopY.toFixed(1)} L0,${stopY.toFixed(1)} Z`;

  return { pricePath, stopPath, zonePath, dotX, dotY, stopY, highY, w, h };
}