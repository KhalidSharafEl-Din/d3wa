#!/usr/bin/env node
// Renders the parts of the storefront that come from assets/catalog.js:
//   - header and footer in every store page (between <!-- build:x --> markers)
//   - the product tiles and packages on index.html
//   - templates/index.html (the collection) and templates/<slug>.html (12 product pages)
//   - sitemap.xml
// Output is committed, so hosting stays build-free. Rerun after editing the catalog.
//
//   node scripts/build.mjs          # write
//   node scripts/build.mjs --check  # exit 1 if any output is stale
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = fileURLToPath(new URL("..", import.meta.url)).replace(/[\\/]$/, "");
const CHECK = process.argv.includes("--check");
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(join(ROOT, "assets/catalog.js"), "utf8"), sandbox);
const C = sandbox.window.D3WA;
const BASE = C.base.replace(/\/$/, "");
const PKG = Object.fromEntries(C.packages.map((p) => [p.k, p]));
const RANK = Object.fromEntries(C.packages.map((p, i) => [p.k, i]));
const OCC = Object.fromEntries(C.occasions.map((o) => [o.k, o]));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const bi = (o, tag = "span") => `<${tag} class="t-ar">${esc(o.ar)}</${tag}><${tag} class="t-en">${esc(o.en)}</${tag}>`;
const arNum = (n) => Number(n).toLocaleString("ar-EG");
const enNum = (n) => Number(n).toLocaleString("en-US");
const egp = (n) => `<span class="t-ar">${arNum(n)} جنيه</span><span class="t-en">EGP ${enNum(n)}</span>`;
const fromPrice = (t) => PKG[t.minPkg].price;
/* Demo links carry the demo names and, for wedding-type designs, sample gallery photos. */
const PHOTO_OCC = ["wedding", "engagement", "katb"];
const demoURL = (t, pre) => {
  let q = `n_ar=${encodeURIComponent(t.demo.n_ar)}&amp;n_en=${encodeURIComponent(t.demo.n_en)}`;
  Object.entries(t.demo).forEach(([k, v]) => { if (k !== "n_ar" && k !== "n_en") q += `&amp;${k}=${encodeURIComponent(v)}`; });
  (t.photos || (t.occ.some((o) => PHOTO_OCC.includes(o)) ? C.demoPhotos : [])).forEach((u, i) => { q += `&amp;ph${i + 1}=${encodeURIComponent(u)}`; });
  if (t.minPkg === "royale") q += "&amp;credit=0";   /* Royale invitations carry no D3wa line */
  return `${pre}demos/${t.k}.html?${q}`;
};
const waLink = (text) => `https://wa.me/${C.wa}?text=${encodeURIComponent(text)}`;

/* ── icons: one stroke family, 24 grid ── */
const I = {
  check: '<path d="M5 12.5l4.2 4L19 7"/>',
  wa: null,
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  cal: '<rect x="4" y="5.5" width="16" height="14" rx="1.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  pin: '<path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0113 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/>',
  lang: '<path d="M4 6h9M8.5 4v2M6 6c.6 3.6 3 6.2 6 7.5M11 6c-.8 3.8-3.4 6.8-7 8"/><path d="M13 20l3.5-8.5L20 20M14.2 17h4.6"/>',
  guests: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3.4 2.8-5.2 5.5-5.2s4.9 1.8 5.5 5.2"/><path d="M15.5 5.6a3.2 3.2 0 010 5.8M17.6 14.2c1.7.7 2.6 2.4 2.9 4.8"/>',
  music: '<path d="M9 17.5V6l10-2v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
  env: '<rect x="3.5" y="6" width="17" height="12.5" rx="1.5"/><path d="M4 7l8 6.2L20 7"/>',
  list: '<path d="M9 7h11M9 12h11M9 17h11"/><circle cx="4.8" cy="7" r=".9"/><circle cx="4.8" cy="12" r=".9"/><circle cx="4.8" cy="17" r=".9"/>',
  share: '<circle cx="17.5" cy="6" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><circle cx="17.5" cy="18" r="2.5"/><path d="M8.7 10.8l6.6-3.6M8.7 13.2l6.6 3.6"/>',
  eye: '<path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  shield: '<path d="M12 3.5l7 2.6v5.6c0 4.4-3 7.7-7 8.8-4-1.1-7-4.4-7-8.8V6.1z"/><path d="M8.8 12l2.2 2.2 4.4-4.4"/>',
  pen: '<path d="M4 20l1-4.2L15.6 5.2a2 2 0 012.8 0l.4.4a2 2 0 010 2.8L8.2 19z"/><path d="M13.8 7l3.2 3.2"/>'
};
const WA_PATH = '<path fill="currentColor" d="M12.04 2.5a9.43 9.43 0 00-8.1 14.27L2.6 21.5l4.86-1.28A9.44 9.44 0 1012.04 2.5zm0 17.24a7.8 7.8 0 01-3.98-1.09l-.29-.17-2.88.76.77-2.81-.19-.3a7.8 7.8 0 1114.37-4.17 7.8 7.8 0 01-7.8 7.78zm4.28-5.84c-.23-.12-1.38-.68-1.6-.76-.21-.08-.37-.12-.53.12-.15.23-.6.76-.74.92-.14.15-.27.17-.5.06a6.4 6.4 0 01-1.88-1.16 7.06 7.06 0 01-1.3-1.62c-.14-.23 0-.36.1-.47.1-.1.23-.27.35-.41.12-.14.15-.23.23-.39.08-.15.04-.29-.02-.41-.06-.12-.53-1.27-.72-1.74-.19-.46-.38-.39-.53-.4h-.45a.87.87 0 00-.62.29 2.62 2.62 0 00-.82 1.95 4.55 4.55 0 00.95 2.42 10.4 10.4 0 003.99 3.52c.56.24 1 .38 1.33.49a3.2 3.2 0 001.48.09c.45-.07 1.38-.56 1.57-1.11.2-.55.2-1.02.14-1.12-.06-.1-.21-.16-.44-.27z"/>';
const icon = (k, cls = "") => k === "wa"
  ? `<svg${cls ? ` class="${cls}"` : ""} viewBox="0 0 24 24" aria-hidden="true">${WA_PATH}</svg>`
  : `<svg${cls ? ` class="${cls}"` : ""} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;

/* the seal: a wax-seal outline with the letter dal */
const SEAL = `<svg class="seal" viewBox="0 0 40 40" aria-hidden="true"><path fill="var(--gold)" d="M20 1.8l3.1 2.4 3.9-.6 1.9 3.4 3.7 1.4.1 3.9 2.9 2.7-1.2 3.7 1.2 3.7-2.9 2.7-.1 3.9-3.7 1.4-1.9 3.4-3.9-.6L20 38.2l-3.1-2.4-3.9.6-1.9-3.4-3.7-1.4-.1-3.9-2.9-2.7 1.2-3.7-1.2-3.7 2.9-2.7.1-3.9 3.7-1.4 1.9-3.4 3.9.6z"/><circle cx="20" cy="20" r="12.2" fill="none" stroke="var(--wine)" stroke-width="1.1" opacity=".55"/><text x="20" y="25.6" text-anchor="middle" font-family="Markazi Text,serif" font-weight="700" font-size="19" fill="var(--wine)">د</text></svg>`;

/* ── shared chrome ── */
function head({ pre, title, desc, path, og = "index", extra = "" }) {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#5a1426">
<link rel="canonical" href="${BASE}/${path}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="D3wa دعوة">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${BASE}/${path}">
<meta property="og:image" content="${BASE}/assets/og/${og}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${pre}assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Markazi+Text:wght@500;600;700&family=Readex+Pro:wght@300;400;500;600&display=swap">
<link rel="stylesheet" href="${pre}assets/store.css">
<script>document.documentElement.classList.add("js");try{if(localStorage.getItem("d3wa-lang")==="en"){var h=document.documentElement;h.classList.add("en");h.lang="en";h.dir="ltr"}}catch(e){}</script>
<script src="${pre}assets/catalog.js" defer></script>
<script src="${pre}assets/store.js" defer></script>${extra}`;
}

function header(pre, active) {
  const nav = [
    ["templates", `${pre}templates/`, { ar: "التصاميم", en: "Designs" }],
    ["pricing", `${pre}index.html#pricing`, { ar: "الأسعار", en: "Prices" }],
    ["how", `${pre}index.html#how`, { ar: "إزاي بنشتغل", en: "How it works" }],
    ["faq", `${pre}index.html#faq`, { ar: "أسئلة", en: "Questions" }]
  ];
  return `<a class="skip" href="#main">${bi({ ar: "انتقل للمحتوى", en: "Skip to content" })}</a>
<header class="hdr"><div class="wrap">
  <a class="brand" href="${pre}index.html" aria-label="D3wa دعوة">${SEAL}<b>دعوة</b><small>D3wa</small></a>
  <nav class="nav" id="nav" aria-label="${esc("الأقسام")}">
${nav.map(([k, href, l]) => `    <a href="${href}"${k === active ? ' aria-current="page"' : ""}>${bi(l)}</a>`).join("\n")}
  </nav>
  <div class="hdr-act">
    <button class="lang" id="langBtn" type="button"><span class="t-ar" lang="en">English</span><span class="t-en" lang="ar">العربية</span></button>
    <a class="btn btn-milk hdr-cta" href="${pre}order.html">${bi({ ar: "اطلب دعوتك", en: "Order yours" })}</a>
    <button class="menu-btn" id="menuBtn" type="button" aria-expanded="false" aria-controls="nav"><span class="sr-only">${bi({ ar: "القائمة", en: "Menu" })}</span>${icon("menu")}</button>
  </div>
</div></header>`;
}

function footer(pre) {
  const occ = C.occasions.map((o) => `      <li><a href="${pre}templates/?occ=${o.k}">${bi(o)}</a></li>`).join("\n");
  return `<footer class="ftr"><div class="wrap">
  <div class="about">
    <a class="brand" href="${pre}index.html">${SEAL}<b>دعوة</b><small>D3wa</small></a>
    <p>${bi({ ar: "دعوات رقمية بالعربي والإنجليزي للفرح والخطوبة وكتب الكتاب والحنة والسبوع والتخرج. كل دعوة بتتعمل بإيد.", en: "Digital invitations in Arabic and English for weddings, engagements, katb kitab, henna nights, sebou3 and graduations. Every one is made by hand." })}</p>
  </div>
  <div>
    <h2>${bi({ ar: "التصاميم", en: "Designs" })}</h2>
    <ul>
${occ}
    </ul>
  </div>
  <div>
    <h2>${bi({ ar: "الطلب", en: "Ordering" })}</h2>
    <ul>
      <li><a href="${pre}order.html">${bi({ ar: "اطلب دعوتك", en: "Order an invitation" })}</a></li>
      <li><a href="${pre}index.html#pricing">${bi({ ar: "الباقات والأسعار", en: "Packages and prices" })}</a></li>
      <li><a href="${pre}index.html#faq">${bi({ ar: "أسئلة متكررة", en: "Questions" })}</a></li>
      <li><a href="https://wa.me/${C.wa}" target="_blank" rel="noopener">${bi({ ar: "كلّمنا على واتساب", en: "WhatsApp us" })}</a></li>
    </ul>
  </div>
  <div>
    <h2>${bi({ ar: "السياسات", en: "Policies" })}</h2>
    <ul>
      <li><a href="${pre}policies.html#terms">${bi({ ar: "الشروط", en: "Terms" })}</a></li>
      <li><a href="${pre}policies.html#payment">${bi({ ar: "الدفع والاسترجاع", en: "Payment and refunds" })}</a></li>
      <li><a href="${pre}policies.html#delivery">${bi({ ar: "التسليم والتعديلات", en: "Delivery and revisions" })}</a></li>
      <li><a href="${pre}policies.html#privacy">${bi({ ar: "الخصوصية", en: "Privacy" })}</a></li>
    </ul>
  </div>
  <div class="legal">
    <span>${bi({ ar: "© ٢٠٢٦ دعوة D3wa. الأسعار بالجنيه المصري.", en: "© 2026 D3wa. Prices in Egyptian pounds." })}</span>
    <a href="https://wa.me/${C.wa}" target="_blank" rel="noopener" class="num" dir="ltr">+${C.wa.replace(/^20(\d{3})(\d{3})(\d{4})$/, "20 $1 $2 $3")}</a>
  </div>
</div></footer>
<a class="fab-wa" href="https://wa.me/${C.wa}" target="_blank" rel="noopener" aria-label="WhatsApp">${icon("wa")}</a>`;
}

/* ── product tile ── */
function tile(t, pre, { headingTag = "h3" } = {}) {
  const occ = t.occ.join(" ");
  return `<article class="tile" data-occ="${occ}">
  <a class="mount" href="${pre}templates/${t.k}.html" tabindex="-1" aria-hidden="true">
    <span class="code">${t.code}</span>
    <span class="phone"><span class="scr"><img src="${pre}assets/cards/${t.k}.jpg" data-en="${pre}assets/cards/${t.k}-en.jpg" width="585" height="1266" loading="lazy" decoding="async" alt=""></span></span>
  </a>
  <div class="tile-body">
    <${headingTag}><a href="${pre}templates/${t.k}.html">${bi(t)}</a></${headingTag}>
    <p class="mood">${bi(t.mood)}</p>
    <p class="from">${bi({ ar: "من", en: "From" })} <b>${egp(fromPrice(t))}</b></p>
  </div>
  <a class="try link" href="${demoURL(t, pre)}" target="_blank" rel="noopener">${bi({ ar: "جرّب الديمو", en: "Try the demo" })}</a>
</article>`;
}

/* ── packages (home pricing and product page picker share the data) ── */
function packageCards(pre) {
  return C.packages.map((p, i) => {
    const lead = p.k === "signature";
    const prev = C.packages[i - 1];
    const terms = p.k === C.payment.payOnceUpTo
      ? { ar: "بتدفعوا مرة واحدة بعد ما تشوفوا المعاينة.", en: "Paid once, after you see your preview." }
      : { ar: "نص المبلغ لبدء الشغل، والباقي قبل النشر.", en: "Half to start the work, the rest before publishing." };
    const incl = prev ? `<p class="incl">${bi({ ar: `كل اللي في ${prev.ar}، وكمان:`, en: `Everything in ${prev.en}, plus:` })}</p>` : "";
    return `<article class="pkg${lead ? " lead" : ""}">
    <h3>${bi(p)}</h3>
    <p class="pitch">${bi(p.pitch)}</p>
    <p class="price"><b class="t-ar">${arNum(p.price)}</b><b class="t-en">${enNum(p.price)}</b><span>${bi({ ar: "جنيه", en: "EGP" })}</span></p>
    <p class="terms">${bi(terms)}</p>
    ${incl}
    <ul>
${p.items.map((it) => `      <li>${icon("check")}<span>${bi(it)}</span></li>`).join("\n")}
    </ul>
    <a class="btn ${lead ? "btn-milk" : "btn-line"}" href="${pre}templates/?pkg=${p.k}">${bi({ ar: `اختاروا تصميم ${p.ar}`, en: `Choose a ${p.en} design` })}</a>
  </article>`;
  }).join("\n  ");
}

function addonsLine() {
  const r = C.addons.rush, v = C.addons.revision;
  return bi({
    ar: `إضافات: ${r.ar} ${arNum(r.price)} جنيه (مجاني في ${PKG[r.freeOn].ar})، ${v.ar} ${arNum(v.price)} جنيه.`,
    en: `Add-ons: ${r.en.toLowerCase()} EGP ${enNum(r.price)} (free with ${PKG[r.freeOn].en}), ${v.en.toLowerCase()} EGP ${enNum(v.price)}.`
  });
}

/* ── collection page ── */
function collectionPage() {
  const pre = "../";
  const title = "التصاميم | D3wa دعوة: ١٢ تصميم دعوة رقمية";
  const desc = `١٢ تصميم دعوة رقمية للفرح والخطوبة وكتب الكتاب والحنة والسبوع والتخرج، تبدأ من ${arNum(PKG.classic.price)} جنيه. Twelve digital invitation designs from EGP ${enNum(PKG.classic.price)}.`;
  const ld = {
    "@context": "https://schema.org", "@type": "ItemList", name: "D3wa invitation designs",
    itemListElement: C.templates.map((t, i) => ({ "@type": "ListItem", position: i + 1, url: `${BASE}/templates/${t.k}.html`, name: t.en }))
  };
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
${head({ pre, title, desc, path: "templates/", extra: `\n<script type="application/ld+json">${JSON.stringify(ld)}</script>` })}
</head>
<body>
${header(pre, "templates")}
<main id="main">
<section class="wrap page-head">
  <h1 class="d2">${bi({ ar: "التصاميم", en: "The designs" })}</h1>
  <p class="lede">${bi({ ar: `١٢ تصميم، كل واحد صفحة دعوة كاملة بتفتح على الموبايل. أي تصميم بيتعمل بأساميكم ومعادكم ومكانكم، ويبدأ من ${arNum(PKG.classic.price)} جنيه.`, en: `Twelve designs, each a complete invitation page that opens on a phone. Any of them is made with your names, date and venue, from EGP ${enNum(PKG.classic.price)}.` })}</p>
</section>
<section class="wrap" style="padding-bottom:var(--band)">
  <div class="chips" id="chips" role="group" aria-label="${esc("المناسبة")}">
    <button class="chip" type="button" data-f="all" aria-pressed="true">${bi({ ar: "الكل", en: "All" })}</button>
${C.occasions.map((o) => `    <button class="chip" type="button" data-f="${o.k}" aria-pressed="false">${bi(o)}</button>`).join("\n")}
  </div>
  <p class="count" id="count" aria-live="polite"></p>
  <div class="grid" id="grid">
${C.templates.map((t) => tile(t, pre, { headingTag: "h2" })).join("\n")}
  </div>
</section>
</main>
${footer(pre)}
</body>
</html>
`;
}

/* ── product page ── */
/* What a design's page actually contains, read from its own code so the list never overclaims. */
function sections(t) {
  const src = readFileSync(join(ROOT, "demos", `${t.k}.html`), "utf8");
  const has = (k) => new RegExp(`["']${k}["']`).test(src);
  /* on designs sold below Signature, mark what Signature adds */
  const tier = (l) => (RANK[t.minPkg] < RANK.signature ? { ar: `${l.ar} (سيجنتشر)`, en: `${l.en} (Signature)` } : l);
  const list = [
    [has("intro"), { ar: "افتتاحية بتتفتح بلمسة", en: "A tap-to-open intro" }],
    [true, { ar: "عدّاد لحد اليوم", en: "Countdown to the day" }],
    [has("agenda"), { ar: "برنامج اليوم", en: "The day's schedule" }],
    [has("map"), { ar: "الخريطة والتقويم", en: "Map and calendar" }],
    [has("wa"), { ar: "تأكيد الحضور على واتساب", en: "WhatsApp RSVP" }],
    [has("music"), { ar: "موسيقى بتشتغل بلمسة", en: "Music on tap" }],
    [true, { ar: "عربي وإنجليزي", en: "Arabic and English" }],
    [has("ph1"), tier({ ar: "ألبوم صور", en: "Photo gallery" })],
    [has("dress"), tier({ ar: "دريس كود", en: "Dress code" })],
    [has("gift"), tier({ ar: "رسالة هدايا", en: "Gift note" })]
  ];
  return list.filter(([ok]) => ok).map(([, l]) => l);
}

function productPage(t) {
  const pre = "../";
  const minRank = RANK[t.minPkg];
  const occList = t.occ.map((k) => OCC[k]);
  const related = C.templates.filter((x) => x.k !== t.k && x.occ.some((o) => t.occ.includes(o))).slice(0, 3);
  while (related.length < 3) { const x = C.templates.find((y) => y.k !== t.k && !related.includes(y)); related.push(x); }
  const defPkg = t.minPkg === "royale" ? "royale" : "signature";
  const ask = waLink(`أهلاً، عندي سؤال عن تصميم ${t.ar} (${t.code}).`);
  const title = `${t.ar} ${t.en} | تصميم دعوة رقمية من D3wa دعوة`;
  const desc = `${t.blurb.ar} يبدأ من ${arNum(fromPrice(t))} جنيه. ${t.blurb.en}`;
  const ld = {
    "@context": "https://schema.org", "@type": "Product", name: `${t.en} (${t.ar})`, sku: t.code,
    description: t.blurb.en, image: [`${BASE}/assets/cards/${t.k}.jpg`], brand: { "@type": "Brand", name: "D3wa" },
    offers: {
      "@type": "AggregateOffer", priceCurrency: "EGP", lowPrice: fromPrice(t), highPrice: PKG.royale.price,
      offerCount: C.packages.length - minRank, availability: "https://schema.org/InStock", url: `${BASE}/templates/${t.k}.html`
    }
  };
  const crumbsLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "D3wa", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name: "Designs", item: `${BASE}/templates/` },
      { "@type": "ListItem", position: 3, name: t.en, item: `${BASE}/templates/${t.k}.html` }
    ]
  };
  const opts = C.packages.map((p, i) => {
    const off = i < minRank;
    const firstOff = off && i === 0;
    const note = off
      ? (firstOff ? (t.whyMin || { ar: `التصميم ده متاح في باقة ${PKG[t.minPkg].ar} بس.`, en: `This design comes in the ${PKG[t.minPkg].en} package only.` }) : { ar: "", en: "" })
      : { ar: `${p.pitch.ar} ${p.revisions === 1 ? "جولة تعديل واحدة" : p.revisions === 2 ? "جولتين تعديل" : `${arNum(p.revisions)} جولات تعديل`}، تسليم خلال ${arNum(p.delivery)} ساعة.`,
          en: `${p.pitch.en} ${p.revisions} revision round${p.revisions > 1 ? "s" : ""}, delivered within ${p.delivery} hours.` };
    return `    <label class="opt">
      <input type="radio" name="pkg" value="${p.k}"${p.k === defPkg ? " checked" : ""}${off ? " disabled" : ""}>
      <b>${bi(p)}</b>
      <span class="p">${egp(p.price)}</span>
      <small>${bi(note)}</small>
    </label>`;
  }).join("\n");
  const thumbs = [
    { src: `${pre}assets/cards/${t.k}.jpg`, en: `${pre}assets/cards/${t.k}-en.jpg`, l: { ar: "الغلاف", en: "Cover" } },
    { src: `${pre}assets/shots/${t.k}-details.jpg`, en: `${pre}assets/shots/${t.k}-details-en.jpg`, l: { ar: "التفاصيل", en: "Details" } },
    { src: `${pre}assets/shots/${t.k}-rsvp.jpg`, en: `${pre}assets/shots/${t.k}-rsvp-en.jpg`, l: { ar: "تأكيد الحضور", en: "RSVP" } }
  ];
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
${head({ pre, title, desc, path: `templates/${t.k}.html`, og: t.k, extra: `\n<script type="application/ld+json">${JSON.stringify(ld)}</script>\n<script type="application/ld+json">${JSON.stringify(crumbsLd)}</script>` })}
</head>
<body class="has-buybar" data-tpl="${t.k}">
${header(pre, "templates")}
<main id="main" class="wrap">
<nav class="crumbs" aria-label="${esc("مسار الصفحة")}"><ol>
  <li><a href="${pre}index.html">${bi({ ar: "الرئيسية", en: "Home" })}</a></li>
  <li><a href="${pre}templates/">${bi({ ar: "التصاميم", en: "Designs" })}</a></li>
  <li aria-current="page">${bi(t)}</li>
</ol></nav>
<div class="pdp">
  <div class="pdp-media">
    <div class="pdp-stage">
      <div class="phone"><div class="scr" id="scr">
        <img id="still" src="${thumbs[0].src}" data-en="${thumbs[0].en}" width="585" height="1266" fetchpriority="high" alt="${esc(`${t.ar}: ${t.mood.ar}`)}">
      </div></div>
      <button class="btn btn-pom play" id="play" type="button" data-src="${demoURL(t, pre).replace(/&amp;/g, "&")}">${icon("eye")}${bi({ ar: "جرّبوا الدعوة هنا", en: "Try it here" })}</button>
    </div>
    <div class="thumbs" id="thumbs">
${thumbs.map((s, i) => `      <button type="button" aria-pressed="${i === 0}" data-src="${s.src}" data-en="${s.en}"><img src="${s.src}" data-en="${s.en}" width="66" height="117" alt=""><span class="sr-only">${bi(s.l)}</span></button>`).join("\n")}
    </div>
  </div>
  <div class="pdp-info">
    <span class="code">${t.code}</span>
    <h1>${bi(t)}</h1>
    <p class="mood">${bi(t.mood)}</p>
    <p class="blurb">${bi(t.blurb)}</p>
    <ul class="tags">
${occList.map((o) => `      <li><a href="${pre}templates/?occ=${o.k}">${bi(o)}</a></li>`).join("\n")}
    </ul>
    <fieldset class="pick" id="pick">
      <legend>${bi({ ar: "اختاروا الباقة", en: "Choose a package" })}</legend>
${opts}
    </fieldset>
    <div class="buy">
      <a class="btn btn-pom" id="buy" href="${pre}order.html?t=${t.k}&amp;p=${defPkg}">${bi({ ar: "خصّصوا التصميم ده", en: "Personalise this design" })}</a>
      <a class="btn btn-line" href="${demoURL(t, pre)}" target="_blank" rel="noopener">${bi({ ar: "افتحوا الديمو كامل", en: "Open the full demo" })}</a>
    </div>
    <p style="margin-top:14px;font-size:15px"><a class="link" href="${ask}" target="_blank" rel="noopener">${bi({ ar: "عندكم سؤال؟ اسألونا على واتساب", en: "A question? Ask us on WhatsApp" })}</a></p>
    <ul class="promise">
      <li>${icon("eye")}<span>${bi({ ar: "بتشوفوا الدعوة بأساميكم قبل ما تدفعوا أي حاجة.", en: "You see the invitation with your names before you pay anything." })}</span></li>
      <li>${icon("clock")}<span>${bi(t.minPkg === "royale"
        ? { ar: "بتوصلكم خلال ٢٤ ساعة من تأكيد التفاصيل.", en: "Ready within 24 hours of confirming your details." }
        : { ar: "بتوصلكم خلال ٤٨ ساعة من تأكيد التفاصيل، و٢٤ ساعة في رويال.", en: "Ready within 48 hours of confirming your details, 24 with Royale." })}</span></li>
      <li>${icon("cal")}<span>${bi({ ar: "اللينك شغال سنة كاملة، وتعديل المعاد أو المكان مجاني لحد أسبوع قبل المناسبة.", en: "The link stays live for a year. Date or venue changes are free until a week before." })}</span></li>
    </ul>
    <dl class="spec">
      <dt>${bi({ ar: "المناسبة", en: "Occasion" })}</dt><dd>${occList.map((o) => bi(o)).join("<span>، </span>")}</dd>
      <dt>${bi({ ar: "اللغات", en: "Languages" })}</dt><dd>${bi({ ar: "عربي وإنجليزي، بيتبدّلوا بلمسة", en: "Arabic and English, switched with a tap" })}</dd>
      <dt>${bi({ ar: "الألوان", en: "Palette" })}</dt><dd><span class="swatches">${t.look.map((c) => `<i style="background:${c}"></i>`).join("")}</span></dd>
      <dt>${bi({ ar: "في الصفحة", en: "On the page" })}</dt><dd><ul class="included">
${sections(t).map((s) => `        <li>${bi(s)}</li>`).join("\n")}
      </ul></dd>
    </dl>
  </div>
</div>
<section style="padding-bottom:var(--band)">
  <div class="sec-head"><h2 class="d3">${bi({ ar: "تصاميم قريبة", en: "Similar designs" })}</h2><a class="link" href="${pre}templates/">${bi({ ar: "كل التصاميم", en: "All designs" })}</a></div>
  <div class="grid related">
${related.map((x) => tile(x, pre)).join("\n")}
  </div>
</section>
</main>
<div class="buybar">
  <span class="bb-p">${bi({ ar: "من", en: "From" })} <b>${egp(fromPrice(t))}</b></span>
  <a class="btn btn-pom" id="buy2" href="${pre}order.html?t=${t.k}&amp;p=${defPkg}">${bi({ ar: "خصّصوا التصميم ده", en: "Personalise this design" })}</a>
</div>
${footer(pre)}
</body>
</html>
`;
}

function sitemap() {
  const urls = ["", "templates/", ...C.templates.map((t) => `templates/${t.k}.html`), "order.html", "policies.html"];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${BASE}/${u}</loc></url>`).join("\n")}
</urlset>
`;
}

/* ── write or check ── */
/* read without line endings: a Windows checkout (core.autocrlf) turns LF into CRLF */
const readLF = (p) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
let stale = 0;
function emit(rel, content) {
  const p = join(ROOT, rel);
  const cur = existsSync(p) ? readLF(p) : null;
  if (cur === content) return;
  if (CHECK) { stale++; console.error("stale:", rel); return; }
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, content);
  console.log("wrote", rel);
}
function regions(rel, map) {
  let src = readLF(join(ROOT, rel));
  for (const [name, html] of Object.entries(map)) {
    const re = new RegExp(`(<!-- build:${name} -->)[\\s\\S]*?(<!-- /build:${name} -->)`);
    if (!re.test(src)) throw new Error(`${rel} has no build:${name} region`);
    src = src.replace(re, () => `<!-- build:${name} -->\n${html}\n<!-- /build:${name} -->`);
  }
  emit(rel, src);
}

function occasionRow() {
  return `<ul>
${C.occasions.map((o) => `  <li><a href="templates/?occ=${o.k}">${bi(o)}</a></li>`).join("\n")}
</ul>`;
}
function heroNote() {
  return `<p class="hero-note">${icon("eye")}${bi({ ar: `شوفوا الدعوة بأساميكم قبل ما تدفعوا. الأسعار من ${arNum(PKG.classic.price)} جنيه.`, en: `See it with your names before you pay. Prices from EGP ${enNum(PKG.classic.price)}.` })}</p>`;
}
function pricingLede() {
  const gated = C.templates.filter((t) => t.minPkg !== "classic");
  const g = gated.map((t) => ({ ar: `${t.ar} في ${PKG[t.minPkg].ar} بس`, en: `${t.en}, which comes in ${PKG[t.minPkg].en} only` }));
  return `<p class="lede">${bi({
    ar: `كل التصاميم متاحة في الباقات التلاتة${g.length ? `، ما عدا ${g.map((x) => x.ar).join(" و")}` : ""}. الباقة بتحدد الإضافات، مش شكل التصميم.`,
    en: `Every design comes in all three packages${g.length ? `, except ${g.map((x) => x.en).join(" and ")}` : ""}. The package decides the extras, not the look.`
  })}</p>`;
}
function versus() {
  const rows = [
    [{ ar: "التكلفة لـ١٠٠ ضيف", en: "Cost for 100 guests" }, { ar: "حوالي ١٬٠٠٠ لـ٦٬٠٠٠ جنيه، من ١٠ لـ٦٠ جنيه للكارت", en: "About EGP 1,000 to 6,000, at 10 to 60 per card" }, { ar: `من ${arNum(PKG.classic.price)} جنيه، لأي عدد ضيوف`, en: `From EGP ${enNum(PKG.classic.price)}, for any number of guests` }],
    [{ ar: "تأكيد الحضور", en: "RSVPs" }, { ar: "تليفونات ولفّ على الناس", en: "Phone calls and chasing people" }, { ar: "رسالة واتساب جاهزة من كل ضيف", en: "A ready WhatsApp message from each guest" }],
    [{ ar: "الوصول للقاعة", en: "Finding the venue" }, { ar: "عنوان مكتوب", en: "A printed address" }, { ar: "زرار بيفتح خرايط جوجل", en: "A button that opens Google Maps" }],
    [{ ar: "لو المعاد اتغيّر", en: "If the date changes" }, { ar: "طباعة من الأول", en: "Reprint everything" }, { ar: "بنعدّله، ومجاني لحد أسبوع قبل المناسبة", en: "We update it, free until a week before" }],
    [{ ar: "التوزيع", en: "Delivery" }, { ar: "باليد أو صورة على واتساب", en: "By hand, or a photo on WhatsApp" }, { ar: "لينك واحد في كل الجروبات", en: "One link in every group chat" }],
    [{ ar: "اللغة", en: "Language" }, { ar: "غالبًا لغة واحدة", en: "Usually one language" }, { ar: "عربي وإنجليزي بلمسة", en: "Arabic and English, one tap apart" }]
  ];
  return `<table class="vs">
  <thead><tr><td></td><th scope="col">${bi({ ar: "كروت مطبوعة", en: "Printed cards" })}</th><th scope="col">${bi({ ar: "دعوة D3wa", en: "A D3wa invitation" })}</th></tr></thead>
  <tbody>
${rows.map(([h, a, b]) => `    <tr><th scope="row">${bi(h)}</th><td>${bi(a)}</td><td>${bi(b)}</td></tr>`).join("\n")}
  </tbody>
</table>`;
}

const FEATURED = ["gold", "emerald", "henna", "deco", "lotus", "sahara"];
regions("index.html", {
  head: head({ pre: "", title: "دعوة D3wa | دعوات رقمية للفرح والخطوبة وكتب الكتاب", desc: `دعوة فرحكم على لينك باسمكم: عدّاد، خريطة القاعة، وتأكيد حضور على واتساب، بالعربي والإنجليزي. ١٢ تصميم تبدأ من ${arNum(PKG.classic.price)} جنيه. Digital invitations from EGP ${enNum(PKG.classic.price)}.`, path: "" }),
  header: header("", ""),
  heronote: heroNote(),
  occasions: occasionRow(),
  pricinglede: pricingLede(),
  vs: versus(),
  featured: FEATURED.map((k) => tile(C.templates.find((t) => t.k === k), "")).join("\n"),
  packages: packageCards(""),
  addons: addonsLine(),
  footer: footer("")
});
for (const rel of ["policies.html", "order.html"]) {
  if (!existsSync(join(ROOT, rel))) continue;
  const src = readLF(join(ROOT, rel));
  const map = {};
  if (src.includes("<!-- build:header -->")) map.header = header("", "");
  if (src.includes("<!-- build:footer -->")) map.footer = footer("");
  if (Object.keys(map).length) regions(rel, map);
}
emit("templates/index.html", collectionPage());
for (const t of C.templates) emit(`templates/${t.k}.html`, productPage(t));
emit("sitemap.xml", sitemap());

if (CHECK && stale) { console.error(`${stale} file(s) out of date. Run: node scripts/build.mjs`); process.exit(1); }
if (CHECK) console.log("build output is up to date");
