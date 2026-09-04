#!/usr/bin/env node
// Screenshots every demo into assets/cards/<slug>.jpg, or (with --page) one page to a PNG.
// Drives Google Chrome headless over the DevTools protocol. No dependencies. Node 22+.
//
//   node scripts/shots.mjs                      # all 12 cards
//   node scripts/shots.mjs gold henna           # a subset
//   node scripts/shots.mjs --page index.html --out /tmp/idx.png --w 375 --h 4000 --scheme dark
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ROOT = resolve(new URL("..", import.meta.url).pathname);

// One couple per template. index.html links each card with the same params.
export const CARDS = [
  { slug: "gold",    n_ar: "يوسف ومريم",  n_en: "Youssef & Mariam" },
  { slug: "rose",    n_ar: "كريم ونور",    n_en: "Karim & Nour" },
  { slug: "rustic",  n_ar: "محمود وهنا",   n_en: "Mahmoud & Hana" },
  { slug: "navy",    n_ar: "أحمد وفريدة",  n_en: "Ahmed & Farida" },
  { slug: "emerald", n_ar: "مصطفى وجنى",   n_en: "Mostafa & Jana" },
  { slug: "sahara",  n_ar: "زياد ولينا",   n_en: "Ziad & Lina" },
  { slug: "henna",   n_ar: "ملك",          n_en: "Malak" },
  { slug: "deco",    n_ar: "عمر ونادين",   n_en: "Omar & Nadine" },
  { slug: "garden",  n_ar: "سيف ورنا",     n_en: "Seif & Rana" },
  { slug: "modern",  n_ar: "علي ودينا",    n_en: "Ali & Dina" },
  { slug: "lotus",   n_ar: "ياسين",        n_en: "Yassin" },
  { slug: "grad",    n_ar: "سارة",         n_en: "Sara" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withChrome(fn) {
  const port = 9300 + Math.floor(Math.random() * 600);
  const profile = `/tmp/d3wa-shots-${port}-${Date.now()}`;
  const chrome = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--hide-scrollbars",
    // A built-in component extension aborts some file:// navigations (modern.html, reproducibly)
    // and can hang Page.captureScreenshot. Extensions off fixes both.
    "--disable-extensions", "--disable-component-extensions-with-background-pages",
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
    const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
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
    killChrome();
    process.off("exit", killChrome);
    rmSync(profile, { recursive: true, force: true });
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
  const q = new URLSearchParams({ n_ar: card.n_ar, n_en: card.n_en }).toString();
  const url = `file://${ROOT}/demos/${card.slug}.html?${q}`;
  const out = `${ROOT}/assets/cards/${card.slug}.jpg`;
  await withChrome(async (cdp) => {
    await load(cdp, url, { w: 390, h: 844, scale: 1.5, mobile: true, scheme: "light" });
    await cdp.evaluate(`(() => { const el = document.querySelector(".intro"); if (el) el.click(); return !!el; })()`);
    await sleep(2800);
    const shot = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 82, clip: { x: 0, y: 0, width: 390, height: 844, scale: 1 } });
    writeFileSync(out, Buffer.from(shot.result.data, "base64"));
  });
  console.log("wrote", out.replace(ROOT + "/", ""));
}

async function shootPage(args) {
  const page = args.get("--page"), out = args.get("--out");
  const w = +(args.get("--w") || 375), h = +(args.get("--h") || 4000), scheme = args.get("--scheme") || "light";
  if (!page || !out) throw new Error("--page and --out are required");
  await withChrome(async (cdp) => {
    await load(cdp, `file://${resolve(page)}`, { w, h, scale: 1, mobile: w < 700, scheme });
    const sh = await cdp.evaluate("document.documentElement.scrollHeight");
    const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: Math.min(sh, h), scale: 1 } });
    writeFileSync(out, Buffer.from(shot.result.data, "base64"));
    console.log("wrote", out, `${w}x${Math.min(sh, h)} (page height ${sh})`);
  });
}

const argv = process.argv.slice(2);
const flags = new Map(); const slugs = [];
for (let i = 0; i < argv.length; i++) argv[i].startsWith("--") ? flags.set(argv[i], argv[++i]) : slugs.push(argv[i]);

if (flags.has("--page")) {
  await shootPage(flags);
} else {
  mkdirSync(`${ROOT}/assets/cards`, { recursive: true });
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
