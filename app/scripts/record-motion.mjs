import { chromium } from "playwright";
import { readdirSync, renameSync } from "fs";
import { join } from "path";

const ARTIFACTS = "/opt/cursor/artifacts";
const OUT = join(ARTIFACTS, "parachute-motion.webm");
const VIEWPORT = { width: 1280, height: 800 };
const HERO_HOLD_MS = 4000;
const SCROLL_MS = 10500;
const SCROLL_TARGET = 0.9;

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: VIEWPORT,
  recordVideo: {
    dir: ARTIFACTS,
    size: VIEWPORT,
  },
});
const page = await context.newPage();

await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await page.waitForTimeout(HERO_HOLD_MS);

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