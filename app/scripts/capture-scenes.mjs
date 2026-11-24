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
  let bestScene = "";

  for (let pass = 0; pass < 24; pass++) {
    const mid = Math.floor((lo + hi) / 2);
    await page.evaluate((y) => {
      window.scrollTo({ top: y, behavior: "instant" });
    }, mid);
    await page.waitForTimeout(350);
    await page.evaluate(async () => {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    });
    const scene = (await getScene(page)) ?? "";
    if (scene === target) {
      bestY = mid;
      bestScene = scene;
      break;
    }
    const idx = SCENES.indexOf(scene);
    const targetIdx = SCENES.indexOf(target);
    if (idx < targetIdx) lo = mid + 1;
    else hi = mid - 1;
    bestY = mid;
    bestScene = scene;
  }

  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), bestY);
  await page.waitForTimeout(500);
  const final = await getScene(page);
  if (final !== target) {
    console.warn(`scroll target ${target}: landed on ${final} (y=${bestY})`);
  }
  return final;
}

async function runDesktop(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  for (const name of SCENES) {
    await scrollToScene(page, name);
    await page.screenshot({ path: `${BASE}/scene-desktop-${name}.png` });
  }

  await page.evaluate(() => document.querySelector("#pack-app")?.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${BASE}/scene-desktop-app.png` });
  await page.close();
}

async function runMobile(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await scrollToScene(page, "hero");
  await page.screenshot({ path: `${BASE}/scene-mobile-hero.png` });
  await page.evaluate(() => document.querySelector("#pack-app")?.scrollIntoView({ behavior: "instant" }));
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${BASE}/scene-mobile-app.png`, fullPage: true });
  await page.close();
}

const browser = await chromium.launch();
await runDesktop(browser);
await runMobile(browser);
await browser.close();
console.log("all scenes captured");