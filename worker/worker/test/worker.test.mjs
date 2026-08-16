/* Exercises the Worker's routing, validation, slug reservation and rendering
   against an in-memory stand-in for D1 + the static assets. */
import worker from "../src/index.js";
import { readFileSync } from "node:fs";

const ROOT = new URL("../../", import.meta.url).pathname.replace(/\/$/, "");
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗", name, extra); }
};

/* ── tiny D1 stand-in: only the query shapes the Worker actually issues ── */
function makeDB() {
  const rows = [];
  const run = (sql, args) => {
    const s = sql.replace(/\s+/g, " ").trim();
    if (s.startsWith("SELECT 1 FROM orders WHERE slug")) {
      const [slug, id] = args;
      return { first: rows.find((r) => r.slug === slug || r.id === id) || null };
    }
    if (s.startsWith("INSERT INTO orders")) {
      const k = ["id","slug","edit_token","template","package","occasion","n_ar","n_en",
        "event_date","event_time","v_ar","v_en","map_url","quote","rsvp_wa","contact_wa",
        "rush","amount","pay_method","created_at"];
      const row = { status: "pending" };
      k.forEach((key, i) => (row[key] = args[i]));
      rows.push(row);
      return { meta: { changes: 1 } };
    }
    if (s.startsWith("SELECT id, slug, status, amount")) {
      return { first: rows.find((r) => r.id === args[0]) || null };
    }
    if (s.startsWith("SELECT * FROM orders WHERE slug")) {
      return { first: rows.find((r) => r.slug === args[0] && r.status !== "cancelled") || null };
    }
    if (s.startsWith("SELECT * FROM orders WHERE status")) {
      return { all: { results: rows.filter((r) => r.status === args[0]) } };
    }
    if (s.startsWith("SELECT * FROM orders ORDER BY")) return { all: { results: rows } };
    if (s.startsWith("UPDATE orders SET status")) {
      const id = args[args.length - 1];
      const r = rows.find((x) => x.id === id);
      if (!r) return { meta: { changes: 0 } };
      r.status = args[0];
      return { meta: { changes: 1 } };
    }
    if (s.startsWith("SELECT id, slug, status FROM orders")) {
      return { first: rows.find((r) => r.id === args[0]) || null };
    }
    throw new Error("unhandled SQL: " + s.slice(0, 70));
  };
  const prepare = (sql) => ({
    bind: (...args) => ({
      first: async () => run(sql, args).first,
      run: async () => run(sql, args),
      all: async () => run(sql, args).all
    }),
    first: async () => run(sql, []).first,
    all: async () => run(sql, []).all
  });
  return { prepare, _rows: rows };
}

const ASSETS = {
  fetch: async (req) => {
    let p = new URL(req.url).pathname;
    if (p.endsWith("/")) p += "index.html";           // as the assets binding does
    try { return new Response(readFileSync(ROOT + p, "utf8"), { headers: { "content-type": "text/html" } }); }
    catch { return new Response("not found", { status: 404 }); }
  }
};

const env = { DB: makeDB(), ASSETS, ADMIN_TOKEN: "s3cret" };
const call = (path, init) => worker.fetch(new Request("https://d3wa.io" + path, init), env);
const post = (path, body, headers) => call(path, {
  method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body)
});

const VALID = {
  template: "henna", package: "signature", occasion: "wedding",
  n_ar: "ندى وأحمد", n_en: "Nada & Ahmed",
  event_date: "2026-11-19", event_time: "19:30",
  v_ar: "قاعة النيل، الزمالك", rsvp_wa: "201012345678", rush: 1, pay_method: "instapay"
};

console.log("\ncreate order");
const created = await post("/api/orders", VALID);
const order = await created.json();
ok("201 created", created.status === 201, created.status);
ok("slug is names-uid", /^nada-ahmed-[0-9a-f]{4}$/.test(order.slug), order.slug);
ok("rush priced in (1500+300)", order.amount === 1800, order.amount);
ok("edit token returned", typeof order.editToken === "string" && order.editToken.length === 32);

console.log("\nvalidation");
for (const [name, patch] of [
  ["bad template", { template: "nope" }],
  ["bad package", { package: "nope" }],
  ["missing names", { n_ar: "" }],
  ["bad date", { event_date: "19-11-2026" }],
  ["short phone", { rsvp_wa: "123" }]
]) {
  const r = await post("/api/orders", { ...VALID, ...patch });
  ok(name + " → 400", r.status === 400, r.status);
}
const royale = await (await post("/api/orders", { ...VALID, package: "royale", rush: 1 })).json();
ok("rush free on royale (2500)", royale.amount === 2500, royale.amount);

console.log("\nslug uniqueness");
const second = await (await post("/api/orders", VALID)).json();
ok("same names get different slugs", second.slug !== order.slug, second.slug + " vs " + order.slug);

console.log("\ninvitation rendering");
const pending = await call("/" + order.slug);
const pendingHTML = await pending.text();
ok("200 at clean slug", pending.status === 200, pending.status);
ok("order data injected", pendingHTML.includes("window.__D3WA__="), "");
const injected = new URLSearchParams(JSON.parse(pendingHTML.match(/window\.__D3WA__=("(?:[^"\\]|\\.)*");/)[1]));
ok("names reach the page", injected.get("n_ar") === "ندى وأحمد", injected.get("n_ar"));
ok("date + venue reach the page",
  injected.get("d") === "2026-11-19" && injected.get("v_ar") === "قاعة النيل، الزمالك");
ok("rsvp number reaches the page", injected.get("wa") === "201012345678", injected.get("wa"));
ok("unpublished is watermarked", pendingHTML.includes("d3wa-wm"));
ok("unpublished is noindex", (pending.headers.get("x-robots-tag") || "").includes("noindex"));
ok("unpublished not cached", (pending.headers.get("cache-control") || "").includes("no-store"));

console.log("\nadmin");
const noAuth = await call("/api/admin/orders");
ok("no token → 401", noAuth.status === 401, noAuth.status);
const badAuth = await call("/api/admin/orders", { headers: { authorization: "Bearer wrong!" } });
ok("wrong token → 401", badAuth.status === 401, badAuth.status);
const listed = await call("/api/admin/orders", { headers: { authorization: "Bearer s3cret" } });
ok("valid token → 200", listed.status === 200, listed.status);
ok("lists orders", (await listed.json()).orders.length === 3);

const marked = await post("/api/admin/orders/" + order.id + "/mark", { status: "published" },
  { authorization: "Bearer s3cret" });
ok("publish → 200", marked.status === 200, marked.status);

const live = await call("/" + order.slug);
const liveHTML = await live.text();
ok("published drops watermark", !liveHTML.includes("d3wa-wm"));
ok("published is indexable", (live.headers.get("x-robots-tag") || "") === "all");
ok("published is cached", (live.headers.get("cache-control") || "").includes("max-age"));

const badStatus = await post("/api/admin/orders/" + order.id + "/mark", { status: "hacked" },
  { authorization: "Bearer s3cret" });
ok("invalid status → 400", badStatus.status === 400, badStatus.status);

console.log("\norder lookup");
const noTok = await call("/api/orders/" + order.id);
ok("no token → 403", noTok.status === 403, noTok.status);
const withTok = await call("/api/orders/" + order.id + "?token=" + order.editToken);
ok("with token → 200", withTok.status === 200, withTok.status);
ok("token not echoed back", !("edit_token" in await withTok.json()));

console.log("\nfallthrough + reserved paths");
const idx = await call("/");
ok("/ serves the storefront", (await idx.text()).includes("D3wa"), idx.status);
for (const p of ["/order.html", "/admin.html", "/demos/henna.html"]) {
  const r = await call(p);
  ok(p + " served as a file", r.status === 200 && !(await r.text()).includes("window.__D3WA__="));
}
const missing = await call("/no-such-slug-9999");
ok("unknown slug falls through", missing.status === 404, missing.status);

console.log("\nwebhook");
const wh = await post("/api/pay/webhook", { success: true, order_id: order.id });
ok("no secret configured → 503", wh.status === 503, wh.status);
const wh2 = await worker.fetch(
  new Request("https://d3wa.io/api/pay/webhook", { method: "POST", body: "{}", headers: { "x-payment-signature": "deadbeef" } }),
  { ...env, PAY_WEBHOOK_SECRET: "shh" });
ok("bad signature → 401", wh2.status === 401, wh2.status);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
