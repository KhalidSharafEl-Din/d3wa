/**
 * D3wa order backend — Cloudflare Worker.
 *
 * Sits in front of the Pages static assets and adds three things the static
 * site cannot do on its own: reserve a permanent slug, hold the order, and
 * decide whether a visitor sees a watermarked preview or the published
 * invitation.
 *
 *   POST /api/orders                 create an order, reserve its slug
 *   GET  /api/orders/:id             order status (public, by id + token)
 *   GET  /api/admin/orders           list orders            [admin]
 *   POST /api/admin/orders/:id/mark  set status             [admin]
 *   POST /api/pay/webhook            gateway callback       (card, later)
 *   GET  /:slug                      the invitation itself
 *
 * Everything else falls through to the static assets.
 */

const TEMPLATES = ["gold", "rose", "rustic", "navy", "emerald", "sahara",
  "lotus", "henna", "deco", "garden", "modern", "grad"];
const PACKAGES = { classic: 1000, signature: 1500, royale: 2500 };
const RUSH_FEE = 300;

/* paths the Worker must never treat as a slug */
const RESERVED = new Set(["", "index.html", "order.html", "studio.html", "admin.html",
  "404.html", "robots.txt", "favicon.ico", "sitemap.xml", "assets", "demos", "api", "worker"]);

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extra }
  });

const nowISO = () => new Date().toISOString();

function hex(bytes) {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

/* ── slug ───────────────────────────────────────────────── */

const AR2LAT = {
  "ا":"a","أ":"a","إ":"i","آ":"a","ب":"b","ت":"t","ث":"th","ج":"g","ح":"h","خ":"kh",
  "د":"d","ذ":"z","ر":"r","ز":"z","س":"s","ش":"sh","ص":"s","ض":"d","ط":"t","ظ":"z",
  "ع":"a","غ":"gh","ف":"f","ق":"q","ك":"k","ل":"l","م":"m","ن":"n","ه":"h","و":"w",
  "ي":"y","ى":"a","ة":"a","ء":"","ئ":"","ؤ":""
};

export function slugifyNames(s) {
  if (!s) return "";
  s = s.replace(/[ً-ْٰ]/g, "");
  let out = "";
  for (const c of s) {
    if (AR2LAT[c] !== undefined) out += AR2LAT[c];
    else if (/[a-zA-Z0-9]/.test(c)) out += c.toLowerCase();
    else if (/[\s\-_&+]/.test(c)) out += "-";
  }
  return out.replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 38);
}

/** Reserve a unique slug. The short code is always appended, so the customer
 *  can be shown their final link the moment they type their names. */
async function reserveSlug(db, nEn, nAr) {
  const base = slugifyNames(nEn) || slugifyNames(nAr) || "d3wa";
  for (let attempt = 0; attempt < 6; attempt++) {
    const id = hex(2).toUpperCase();               // 4 hex chars → 65k
    const slug = `${base}-${id.toLowerCase()}`;
    if (RESERVED.has(slug)) continue;
    const clash = await db.prepare("SELECT 1 FROM orders WHERE slug = ? OR id = ?")
      .bind(slug, id).first();
    if (!clash) return { id, slug };
  }
  throw new Error("could not reserve a unique slug");
}

/* ── validation ─────────────────────────────────────────── */

function validate(b) {
  const errors = [];
  if (!TEMPLATES.includes(b.template)) errors.push("template");
  if (!PACKAGES[b.package]) errors.push("package");
  if (!b.n_ar || !String(b.n_ar).trim()) errors.push("n_ar");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.event_date || "")) errors.push("event_date");
  const wa = String(b.rsvp_wa || "").replace(/\D/g, "");
  if (wa.length < 10 || wa.length > 15) errors.push("rsvp_wa");
  return errors;
}

function priceOf(pkg, rush) {
  return PACKAGES[pkg] + (rush && pkg !== "royale" ? RUSH_FEE : 0);
}

const clip = (v, n) => (v == null ? null : String(v).slice(0, n));

/* ── admin auth ─────────────────────────────────────────── */

/** Constant-time-ish compare so the token can't be probed byte by byte. */
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isAdmin(request, env) {
  if (!env.ADMIN_TOKEN) return false;
  const header = request.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  return safeEqual(bearer, env.ADMIN_TOKEN);
}

/* ── invitation rendering ───────────────────────────────── */

const WATERMARK = `
<style id="d3wa-wm">
  .d3wa-wm{position:fixed;inset-inline:0;bottom:0;z-index:2147483647;
    background:rgba(16,12,8,.92);color:#f3ece0;font:400 13px/1.7 system-ui,sans-serif;
    padding:11px 18px;text-align:center;backdrop-filter:blur(6px)}
  .d3wa-wm b{color:#e0a266}
  @media print{.d3wa-wm{display:none}}
</style>
<div class="d3wa-wm" dir="rtl">معاينة — لسه مش منشورة · <b>Preview</b>, not published yet</div>`;

function paramString(o) {
  const p = new URLSearchParams();
  const put = (k, v) => { if (v) p.set(k, v); };
  put("n_ar", o.n_ar);      put("n_en", o.n_en);
  put("d", o.event_date);   put("t", o.event_time);
  put("v_ar", o.v_ar);      put("v_en", o.v_en);
  put("map", o.map_url);    put("q", o.quote);
  put("wa", o.rsvp_wa);
  return p.toString();
}

/**
 * Serve the invitation at its own clean URL. The template is fetched from the
 * static assets and the order data is injected as `window.__D3WA__`, which the
 * templates read in place of `location.search`.
 */
async function renderInvitation(order, env, request) {
  const url = new URL(request.url);
  const assetURL = new URL(`/demos/${order.template}.html`, url.origin);
  const res = await env.ASSETS.fetch(new Request(assetURL, { headers: request.headers }));
  if (!res.ok) return new Response("Template missing", { status: 500 });

  let html = await res.text();
  const inject = `<script>window.__D3WA__=${JSON.stringify(paramString(order))};</script>`;

  html = html.includes("</head>")
    ? html.replace("</head>", `${inject}\n</head>`)
    : inject + html;

  if (order.status !== "published") {
    html = html.replace("</body>", `${WATERMARK}\n</body>`);
  }

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": order.status === "published"
        ? "public, max-age=300"
        : "no-store",
      "x-robots-tag": order.status === "published" ? "all" : "noindex, nofollow"
    }
  });
}

/* ── routes ─────────────────────────────────────────────── */

async function createOrder(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return json({ error: "invalid_json" }, 400); }

  const errors = validate(body);
  if (errors.length) return json({ error: "invalid_fields", fields: errors }, 400);

  const { id, slug } = await reserveSlug(env.DB, body.n_en, body.n_ar);
  const editToken = hex(16);
  const rush = body.rush ? 1 : 0;
  const amount = priceOf(body.package, rush);

  await env.DB.prepare(`
    INSERT INTO orders (id, slug, edit_token, template, package, occasion,
      n_ar, n_en, event_date, event_time, v_ar, v_en, map_url, quote,
      rsvp_wa, contact_wa, rush, amount, pay_method, status, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?)
  `).bind(
    id, slug, editToken, body.template, body.package, clip(body.occasion, 40),
    clip(body.n_ar, 120), clip(body.n_en, 120), body.event_date, clip(body.event_time, 5),
    clip(body.v_ar, 200), clip(body.v_en, 200), clip(body.map_url, 500), clip(body.quote, 600),
    String(body.rsvp_wa).replace(/\D/g, ""), clip(String(body.contact_wa || "").replace(/\D/g, ""), 15),
    rush, amount, clip(body.pay_method, 20), nowISO()
  ).run();

  return json({ id, slug, editToken, amount, status: "pending" }, 201);
}

async function getOrder(request, env, id) {
  const token = new URL(request.url).searchParams.get("token");
  const row = await env.DB.prepare(
    "SELECT id, slug, status, amount, template, created_at, published_at, edit_token FROM orders WHERE id = ?"
  ).bind(id.toUpperCase()).first();
  if (!row) return json({ error: "not_found" }, 404);
  if (!safeEqual(token || "", row.edit_token)) return json({ error: "forbidden" }, 403);
  delete row.edit_token;
  return json(row);
}

async function adminList(request, env) {
  const status = new URL(request.url).searchParams.get("status");
  const q = status
    ? env.DB.prepare("SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT 200").bind(status)
    : env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 200");
  const { results } = await q.all();
  return json({ orders: results });
}

async function adminMark(request, env, id) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const status = body.status;
  if (!["pending", "paid", "published", "cancelled"].includes(status)) {
    return json({ error: "invalid_status" }, 400);
  }
  const stamps = status === "published"
    ? ", published_at = COALESCE(published_at, ?)"
    : status === "paid" ? ", paid_at = COALESCE(paid_at, ?)" : "";

  const stmt = stamps
    ? env.DB.prepare(`UPDATE orders SET status = ?${stamps} WHERE id = ?`).bind(status, nowISO(), id.toUpperCase())
    : env.DB.prepare("UPDATE orders SET status = ? WHERE id = ?").bind(status, id.toUpperCase());

  const res = await stmt.run();
  if (!res.meta.changes) return json({ error: "not_found" }, 404);
  const row = await env.DB.prepare("SELECT id, slug, status FROM orders WHERE id = ?")
    .bind(id.toUpperCase()).first();
  return json(row);
}

/**
 * Card gateway callback. Dormant until a merchant account exists: set
 * PAY_WEBHOOK_SECRET and point the gateway here, and paid orders publish
 * with no human step. The manual flow keeps working either way.
 */
async function payWebhook(request, env) {
  if (!env.PAY_WEBHOOK_SECRET) return json({ error: "not_configured" }, 503);

  const raw = await request.text();
  const signature = request.headers.get("x-payment-signature") || "";
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(env.PAY_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const macBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  const expected = Array.from(new Uint8Array(macBuf), (b) => b.toString(16).padStart(2, "0")).join("");
  if (!safeEqual(signature.toLowerCase(), expected)) return json({ error: "bad_signature" }, 401);

  let evt;
  try { evt = JSON.parse(raw); } catch { return json({ error: "invalid_json" }, 400); }
  if (!evt.success || !evt.order_id) return json({ ok: true, ignored: true });

  await env.DB.prepare(`
    UPDATE orders
       SET status = 'published', pay_ref = ?, pay_method = 'card',
           paid_at = COALESCE(paid_at, ?), published_at = COALESCE(published_at, ?)
     WHERE id = ? AND status IN ('pending','paid')
  `).bind(clip(evt.transaction_id, 80), nowISO(), nowISO(), String(evt.order_id).toUpperCase()).run();

  return json({ ok: true });
}

/* ── entry ──────────────────────────────────────────────── */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+|\/+$/g, "");
    const method = request.method;

    try {
      if (path === "api/orders" && method === "POST") return await createOrder(request, env);

      const one = path.match(/^api\/orders\/([A-Za-z0-9]{2,12})$/);
      if (one && method === "GET") return await getOrder(request, env, one[1]);

      if (path === "api/pay/webhook" && method === "POST") return await payWebhook(request, env);

      if (path.startsWith("api/admin/")) {
        if (!isAdmin(request, env)) return json({ error: "unauthorized" }, 401);
        if (path === "api/admin/orders" && method === "GET") return await adminList(request, env);
        const mark = path.match(/^api\/admin\/orders\/([A-Za-z0-9]{2,12})\/mark$/);
        if (mark && method === "POST") return await adminMark(request, env, mark[1]);
        return json({ error: "not_found" }, 404);
      }

      /* a single clean segment that isn't a static file → try it as a slug */
      if (method === "GET" && /^[a-z0-9-]+$/.test(path) && !RESERVED.has(path)) {
        const order = await env.DB.prepare(
          "SELECT * FROM orders WHERE slug = ? AND status != 'cancelled'"
        ).bind(path).first();
        if (order) return await renderInvitation(order, env, request);
      }

      return env.ASSETS.fetch(request);
    } catch (err) {
      return json({ error: "server_error", detail: String(err && err.message || err) }, 500);
    }
  }
};
