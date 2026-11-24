import { chromium } from "playwright";
import { execSync, spawn } from "child_process";
import { readdirSync, renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");

async function ensurePreview() {
  try {
    const r = await fetch("http://127.0.0.1:4173/");
    if (r.ok) return null;
  } catch {
    /* start preview */
  }
  const child = spawn("npx", ["vite", "preview", "--host", "127.0.0.1", "--port", "4173"], {
    cwd: APP_DIR,
    stdio: "ignore",
    detached: true,
  });
  child.unref();
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 400));
    try {
      if ((await fetch("http://127.0.0.1:4173/")).ok) return child;
    } catch {
      /* retry */
    }
  }
  return child;
}

const ARTIFACTS = "/opt/cursor/artifacts";
const OUT = join(ARTIFACTS, "parachute-motion.webm");
const VIEWPORT = { width: 1280, height: 800 };
const HERO_HOLD_MS = 5000;
const SCROLL_MS = 10500;
const SCROLL_TARGET = 0.9;
const STILLS_MS = [500, 1000, 1600, 2400];

execSync("npm run build", { cwd: APP_DIR, stdio: "inherit" });
await ensurePreview();

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: VIEWPORT,
  recordVideo: {
    dir: ARTIFACTS,
    size: VIEWPORT,
  },
  reducedMotion: "no-preference",
});
const page = await context.newPage();
await page.emulateMedia({ reducedMotion: "no-preference" });
await page.addInitScript(() => {
  window.__PARACHUTE_FORCE_MOTION__ = true;
});

await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle", cache: "no-cache" });
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
try {
  await page.waitForSelector(".hero-intro-chute", { timeout: 12000 });
} catch {
  console.warn("hero intro chute not found — capturing anyway");
}

let last = 0;
for (const t of STILLS_MS) {
  await page.waitForTimeout(t - last);
  last = t;
  const stamp = String(t).padStart(4, "0");
  await page.screenshot({ path: join(ARTIFACTS, `hero-drop-${stamp}.png`) });
}

await page.waitForTimeout(Math.max(0, HERO_HOLD_MS - last));
last = HERO_HOLD_MS;

const maxScroll = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);
const endY = Math.floor(maxScroll * SCROLL_TARGET);
const steps = 70;
const stepMs = Math.floor(SCROLL_MS / steps);

for (let i = 1; i <= steps; i++) {
  const y = Math.floor((endY * i) / steps);
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
  await page.waitForTimeout(stepMs);
}

await page.waitForTimeout(600);
const video = page.video();
await context.close();
await browser.close();

if (video) {
  const tmp = await video.path();
  renameSync(tmp, OUT);
  console.log(`saved ${OUT}`);
} else {
  const webms = readdirSync(ARTIFACTS).filter((f) => f.endsWith(".webm"));
  if (webms.length) {
    renameSync(join(ARTIFACTS, webms[webms.length - 1]), OUT);
    console.log(`saved ${OUT} (from dir scan)`);
  } else {
    console.error("no video file produced");
    process.exit(1);
  }
}

console.log(`hero stills: ${STILLS_MS.map((t) => `hero-drop-${String(t).padStart(4, "0")}.png`).join(", ")}`);