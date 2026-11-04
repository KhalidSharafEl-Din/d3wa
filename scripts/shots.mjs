#!/usr/bin/env node
// Screenshots every demo for the store, in Arabic and in English:
//   assets/cards/<slug>.jpg and <slug>-en.jpg            the opened cover (cards, product page)
//   assets/shots/<slug>-details.jpg, -rsvp.jpg (+ -en)   product-page gallery, from [data-shot]
// or (with --page) one page to a PNG. Drives Chrome or Edge headless over the DevTools
// protocol. No dependencies. Node 22+.
//
//   node scripts/shots.mjs                      # all 12 designs
//   node scripts/shots.mjs gold henna           # a subset
//   node scripts/shots.mjs --og [slugs]         # share cards into assets/og/
//   node scripts/shots.mjs --page index.html --out /tmp/idx.png --w 375 --h 4000 --scheme dark
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import vm from "node:vm";
import { spawn } from "node:child_process";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

// Any Chromium works. Set CHROME to override the search.
const CHROME = process.env.CHROME || [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
].find((p) => existsSync(p));
if (!CHROME) throw new Error("No Chrome or Edge found. Set CHROME=/path/to/chrome");
const ROOT = fileURLToPath(new URL("..", import.meta.url)).replace(/[\\/]$/, "");
const fileURL = (p) => pathToFileURL(p).href;

// Demo names come from the catalog, the same ones the store links each demo with.
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(join(ROOT, "assets/catalog.js"), "utf8"), sandbox);
export const CARDS = sandbox.window.D3WA.templates.map((t) => ({ slug: t.k, ...t.demo }));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withChrome(fn, lang = "en-US") {
  const port = 9300 + Math.floor(Math.random() * 600);
  const profile = join(tmpdir(), `d3wa-shots-${port}-${Date.now()}`);
  const chrome = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--hide-scrollbars",
    // A built-in component extension aborts some file:// navigations (modern.html, reproducibly)
    // and can hang Page.captureScreenshot. Extensions off fixes both.
    "--disable-extensions", "--disable-component-extensions-with-background-pages",
    `--lang=${lang}`, `--accept-lang=${lang}`,
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore" });
  const killChrome = () => { try { chrome.kill("SIGKILL"); } catch {} };
  process.on("exit", killChrome);
  try {
    let targets;
    for (let i = 0; i < 60; i++) {
      try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.length) break; } catch {}
      await sleep(250);
    }
    if (!targets?.length) throw new Error("Chrome did not expose a DevTools target");
    const ws = new WebSocket((targets.find((t) => t.type === "page") || targets[0]).webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    let id = 0; const pending = new Map();
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
    // Every CDP call times out, so a hung capture throws and `finally` still kills Chrome.
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const i = ++id;
      const timer = setTimeout(() => { pending.delete(i); reject(new Error(`${method} did not answer within 45s`)); }, 45000);
      pending.set(i, (m) => { clearTimeout(timer); resolve(m); });
      ws.send(JSON.stringify({ id: i, method, params }));
    });
    const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.result.value;
    try { return await fn({ send, evaluate }); } finally { ws.close(); }
  } finally {
    // Windows keeps the profile locked until the browser has fully exited.
    const exited = new Promise((r) => (chrome.exitCode !== null ? r() : chrome.once("exit", r)));
    killChrome();
    process.off("exit", killChrome);
    await Promise.race([exited, sleep(5000)]);
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch {}
  }
}

// Navigate, force the viewport, and reload until Chrome honours the viewport meta
// (it sometimes lays out at 980px on the first pass). An aborted reload leaves a blank
// document behind, so every pass verifies the page is real and re-navigates if not.
async function load({ send, evaluate }, url, { w, h, scale, mobile, scheme }) {
  const navigate = async () => {
    let nav;
    for (let k = 0; k < 4; k++) {
      nav = await send("Page.navigate", { url });
      if (!nav.result?.errorText) return;
      await sleep(600);
    }
    throw new Error(`navigation failed: ${nav.result.errorText} ${url}`);
  };
  const laidOut = () => evaluate(`innerWidth === ${w} && document.querySelectorAll("*").length > 20`);
  await send("Page.enable");
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
  await navigate();
  await sleep(1200);
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: scale, mobile, screenWidth: w, screenHeight: h });
  for (let k = 0; k < 5; k++) {
    await send("Page.reload");
    await sleep(3000);
    if (await laidOut()) break;
    await navigate();
    await sleep(1500);
  }
  if (!(await laidOut())) throw new Error(`page never laid out at ${w}px: ${url}`);
  // Bounded waits: fonts, then any eager image still loading. Lazy images below the fold never start, so skip them.
  await Promise.race([evaluate("document.fonts.ready.then(() => true)"), sleep(5000)]);
  await Promise.race([
    evaluate("Promise.all([...document.images].filter(i => !i.complete && i.loading !== 'lazy').map(i => new Promise(r => { i.onload = i.onerror = r; }))).then(() => true)"),
    sleep(5000),
  ]);
}

async function shootCard(card) {
  const p = { n_ar: card.n_ar, n_en: card.n_en };
  // Lotus's live demo counts down a week (a sebou3); a still image needs a date that stays ahead for months
  if (card.slug === "lotus") p.d = new Date(Date.now() + 120 * 864e5).toISOString().slice(0, 10);
  const q = new URLSearchParams(p).toString();
  const url = `${fileURL(join(ROOT, "demos", card.slug + ".html"))}?${q}`;
  mkdirSync(join(ROOT, "assets", "shots"), { recursive: true });
  // The templates pick their language from navigator.language, so each language gets its own browser.
  for (const [lang, sfx] of [["ar-EG", ""], ["en-US", "-en"]]) {
    const outs = [];
    await withChrome(async (cdp) => {
      await load(cdp, url, { w: 390, h: 844, scale: 1.5, mobile: true, scheme: "light" });
      await sleep(800);
      await cdp.evaluate(`(() => { const el = document.querySelector(".intro"); if (el) el.click(); return !!el; })()`);
      await sleep(2800);
      // Some templates open in Arabic whatever the device says: use the page's own toggle.
      const want = sfx ? "en" : "ar";
      const isLang = `(document.documentElement.lang || "").toLowerCase().startsWith("${want}")`;
      if (!(await cdp.evaluate(isLang))) {
        await cdp.evaluate(`(() => { const b = [...document.querySelectorAll("button, a, [role=button]")].find((x) =>
          /lang/i.test(x.id || "") || /^(en|english|ع|عربي|العربية)$/i.test((x.textContent || "").trim())); if (b) b.click(); })()`);
        await sleep(900);
        if (!(await cdp.evaluate(isLang))) throw new Error(`${card.slug} did not switch to ${want}`);
      }
      await cdp.evaluate("scrollTo(0, 0)");
      await sleep(400);
      const jpeg = async (rel) => {
        const shot = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 80 });
        writeFileSync(join(ROOT, rel), Buffer.from(shot.result.data, "base64"));
        outs.push(rel);
      };
      await jpeg(`assets/cards/${card.slug}${sfx}.jpg`);
      for (const part of ["details", "rsvp"]) {
        const found = await cdp.evaluate(`(() => { const e = document.querySelector('[data-shot="${part}"]'); if (!e) return false;
          scrollTo(0, Math.max(0, e.getBoundingClientRect().top + scrollY - 40)); return true; })()`);
        if (!found) throw new Error(`${card.slug} has no [data-shot="${part}"]`);
        await sleep(1200);
        await jpeg(`assets/shots/${card.slug}-${part}${sfx}.jpg`);
      }
    }, lang);
    console.log("wrote", outs.join(", "));
  }
}

// Share cards for WhatsApp and social previews: assets/og/<slug>.png and index.png.
async function shootOG(slugs) {
  for (const slug of [...slugs, "index"]) {
    const q = slug === "index" ? "" : `?t=${slug}`;
    await withChrome(async (cdp) => {
      await load(cdp, fileURL(join(ROOT, "scripts", "og-card.html")) + q, { w: 1200, h: 630, scale: 1, mobile: false, scheme: "light" });
      await sleep(600);
      const shot = await cdp.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 } });
      writeFileSync(join(ROOT, "assets", "og", `${slug}.png`), Buffer.from(shot.result.data, "base64"));
    }, "ar-EG");
    console.log("wrote", `assets/og/${slug}.png`);
  }
}

async function shootPage(args) {
  const page = args.get("--page"), out = args.get("--out");
  const w = +(args.get("--w") || 375), h = +(args.get("--h") || 4000), scheme = args.get("--scheme") || "light";
  if (!page || !out) throw new Error("--page and --out are required");
  await withChrome(async (cdp) => {
    await load(cdp, fileURL(resolve(page)), { w, h, scale: 1, mobile: w < 700, scheme });
    const sh = await cdp.evaluate("document.documentElement.scrollHeight");
    const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: Math.min(sh, h), scale: 1 } });
    writeFileSync(out, Buffer.from(shot.result.data, "base64"));
    console.log("wrote", out, `${w}x${Math.min(sh, h)} (page height ${sh})`);
  });
}

const argv = process.argv.slice(2);
const flags = new Map(); const slugs = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--og") flags.set("--og", true);
  else if (argv[i].startsWith("--")) flags.set(argv[i], argv[++i]);
  else slugs.push(argv[i]);
}

if (flags.has("--page")) {
  await shootPage(flags);
} else if (flags.has("--og")) {
  const wanted = slugs.length ? slugs : CARDS.map((c) => c.slug);
  await shootOG(wanted);
} else {
  mkdirSync(join(ROOT, "assets", "cards"), { recursive: true });
  const wanted = slugs.length ? CARDS.filter((c) => slugs.includes(c.slug)) : CARDS;
  let failed = 0;
  for (const card of wanted) {
    try {
      await shootCard(card);
    } catch (e) {
      console.error(`retry ${card.slug}: ${e.message}`);
      try { await shootCard(card); } catch (e2) { failed++; console.error(`FAILED ${card.slug}: ${e2.message}`); }
    }
  }
  if (failed) process.exit(1);
}
