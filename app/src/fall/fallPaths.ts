/** SVG path samples for scroll-scrubbed fall narrative (normalized 0–1 coords). */

export type PathKeyframe = { x: number; y: number };

/** Calm rise then sharp drop — prices inverted as altitude (high y = low altitude). */
export function buildAltitudePath(steps = 48): PathKeyframe[] {
  const pts: PathKeyframe[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let y: number;
    let x: number;
    if (t < 0.22) {
      const u = t / 0.22;
      x = 0.08 + u * 0.35;
      y = 0.72 - u * 0.12;
    } else if (t < 0.38) {
      const u = (t - 0.22) / 0.16;
      x = 0.43 + u * 0.18;
      y = 0.6 + u * 0.28;
    } else if (t < 0.55) {
      const u = (t - 0.38) / 0.17;
      x = 0.61 + u * 0.12;
      y = 0.88 - u * 0.08;
    } else if (t < 0.72) {
      const u = (t - 0.55) / 0.17;
      x = 0.73 + u * 0.1;
      y = 0.8 + u * 0.12;
    } else {
      const u = (t - 0.72) / 0.28;
      x = 0.83 + u * 0.1;
      y = 0.92 - u * 0.35;
    }
    pts.push({ x, y });
  }
  return pts;
}

export function pointsToPath(pts: PathKeyframe[], width: number, height: number): string {
  return pts
    .map((p, i) => {
      const px = p.x * width;
      const py = p.y * height;
      return `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(" ");
}

export function pointAtProgress(pts: PathKeyframe[], progress: number): PathKeyframe {
  const idx = Math.min(pts.length - 1, Math.floor(progress * (pts.length - 1)));
  return pts[idx] ?? pts[0];
}

/** Trailing tether Y offset (fraction of height below capsule). Ratchets up as progress advances in tether phase. */
export function tetherGap(trailPct: number, ratchet: number): number {
  return (trailPct / 100) * 0.18 * (1 - ratchet * 0.35);
}