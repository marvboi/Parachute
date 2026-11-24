import { chromium } from "playwright";

const SCENES = ["hero", "drop", "tether", "trigger", "landing", "how", "cta"];
const BASE = "/opt/cursor/artifacts";

async function getScene(page) {
  return page.getAttribute(".fall-scroll-wrap", "data-scene");
}

async function scrollToScene(page, target) {
  const maxScroll = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);
  let lo = 0;
  let hi = maxScroll;
  let bestY = 0;

  for (let pass = 0; pass < 28; pass++) {
    const mid = Math.floor((lo + hi) / 2);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), mid);
    await page.waitForTimeout(450);
    await page.evaluate(async () => {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    });
    const scene = (await getScene(page)) ?? "";
    if (scene === target) {
      bestY = mid;
      break;
    }
    const idx = SCENES.indexOf(scene);
    const targetIdx = SCENES.indexOf(target);
    if (idx < targetIdx) lo = mid + 1;
    else hi = mid - 1;
    bestY = mid;
  }

  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), bestY);
  await page.waitForTimeout(1500);
}

const LOAD_SETTLE_MS = 1500;
const SCENE_SETTLE_MS = 1500;

async function captureSet(browser, viewport, prefix) {
  const page = await browser.newPage({ viewport });
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(LOAD_SETTLE_MS);

  for (const name of SCENES) {
    await scrollToScene(page, name);
    const scene = await getScene(page);
    if (scene !== name) console.warn(`${prefix}: expected ${name}, got ${scene}`);
    await page.waitForTimeout(SCENE_SETTLE_MS);
    await page.screenshot({ path: `${BASE}/scene-${prefix}-${name}.png` });
  }

  await page.evaluate(() => document.querySelector("#pack-app")?.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.waitForTimeout(SCENE_SETTLE_MS);
  await page.screenshot({ path: `${BASE}/scene-${prefix}-app.png` });
  await page.close();
}

const browser = await chromium.launch();
await captureSet(browser, { width: 1440, height: 900 }, "desktop");
await captureSet(browser, { width: 390, height: 844 }, "mobile");
await browser.close();
console.log("all scenes captured (desktop + mobile)");