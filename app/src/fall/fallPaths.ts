/** SVG path samples for scroll-scrubbed fall narrative (normalized 0–1 coords). */

export type PathKeyframe = { x: number; y: number };

/** Calm rise (scene 0–2), drop (1), tether ratchet (2–3), trigger & land (4–6). Y: smaller = higher altitude. */
export function buildAltitudePath(steps = 56): PathKeyframe[] {
  const pts: PathKeyframe[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let x: number;
    let y: number;
    if (t < 0.25) {
      const u = t / 0.25;
      x = 0.12 + u * 0.45;
      y = 0.78 - u * 0.32;
    } else if (t < 0.42) {
      const u = (t - 0.25) / 0.17;
      x = 0.57 + u * 0.08;
      y = 0.46 + u * 0.32;
    } else if (t < 0.58) {
      const u = (t - 0.42) / 0.16;
      x = 0.65 + u * 0.1;
      y = 0.78 - u * 0.22;
    } else if (t < 0.75) {
      const u = (t - 0.58) / 0.17;
      x = 0.75 + u * 0.08;
      y = 0.56 + u * 0.2;
    } else {
      const u = (t - 0.75) / 0.25;
      x = 0.83 + u * 0.12;
      y = 0.76 - u * 0.38;
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
  const clamped = Math.max(0, Math.min(1, progress));
  const idx = Math.min(pts.length - 1, Math.floor(clamped * (pts.length - 1)));
  const next = Math.min(pts.length - 1, idx + 1);
  const frac = clamped * (pts.length - 1) - idx;
  const a = pts[idx] ?? pts[0];
  const b = pts[next] ?? a;
  return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
}

export function tetherLengthPx(trailPct: number, ratchet: number, height: number): number {
  const baseGap = (trailPct / 100) * height * 0.22;
  return baseGap * (1 - ratchet * 0.25);
}

/** Map scroll progress 0–1 to narrative scene progress for path sampling. */
export function narrativePathProgress(scrollProgress: number, scene: number): number {
  const sceneStarts = [0, 0.08, 0.22, 0.36, 0.5, 0.64, 0.78, 1];
  const start = sceneStarts[scene] ?? 0;
  const end = sceneStarts[scene + 1] ?? 1;
  const span = end - start;
  const within = Math.max(0, Math.min(1, (scrollProgress - start) / span));
  return start + within * span;
}