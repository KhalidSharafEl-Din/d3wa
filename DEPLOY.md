# Deploying D3wa to Cloudflare

The site runs on GitHub Pages today. This walks through moving it to Cloudflare,
in two stages you can do weeks apart.

| Stage | What you get | Time | Cost |
|---|---|---|---|
| **A — Static on your domain** | `d3wa.io` instead of a github.io link. Storefront and all 12 demos. | ~20 min | domain only |
| **B — Worker + D1** | Real order links (`d3wa.io/nada-ahmed-1ea0`), admin publish button | ~30 min | free tier |

Stage A alone is a complete, sellable site — you keep taking orders over
WhatsApp exactly as you do now. Stage B is what removes the WhatsApp step.

Both stay inside Cloudflare's free plan. See "What this costs" at the end.

---

## Before you start

You need:

- A Cloudflare account (free) with your domain added to it. If you registered
  through Cloudflare Registrar it is already there.
- Node.js installed. Check with `node --version`.
- This repo cloned locally.

Install the Cloudflare CLI once:

```bash
npm install -g wrangler
```

```bash
wrangler login
```

That opens a browser to authorize. It is the only login step.

---

## Stage A — put the static site on your domain

### A1. Point the pages at the new domain

Every page carries absolute `og:url`, `og:image` and `canonical` tags, so the
domain is baked into 13 files. One command rewrites all of them:

```bash
./scripts/set-domain.sh https://d3wa.io
```

Use your real domain. Check what changed, then commit:

```bash
git diff --stat && git commit -am "Point the site at d3wa.io" && git push
```

If you ever need to go back, run the same script with the old URL. It is
reversible and safe to re-run.

### A2. Create the Pages project

In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to
Git**, pick the `d3wa` repo, and leave the build settings empty:

- Framework preset: **None**
- Build command: *(blank)*
- Build output directory: `/`

There is no build step — the site is plain HTML.

### A3. Attach your domain

In the Pages project: **Custom domains → Set up a domain**, enter `d3wa.io`,
and add `www.d3wa.io` too if you want it. Cloudflare creates the DNS records
itself. HTTPS is automatic and takes a few minutes.

### A4. Check it

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://d3wa.io/
curl -s -o /dev/null -w "%{http_code}\n" https://d3wa.io/demos/henna.html
```

Then confirm the private files did **not** ship — all three must be 404:

```bash
for f in PRODUCT.md DESIGN.md d3wa-business-plan.md; do
  printf "%-26s %s\n" "$f" "$(curl -s -o /dev/null -w '%{http_code}' https://d3wa.io/$f)"
done
```

Finally, paste `https://d3wa.io/demos/henna.html` into a WhatsApp chat with
yourself and confirm the preview card appears.

**Stage A is done.** You can stop here indefinitely.

---

## Stage B — the order backend

This is what makes `d3wa.io/nada-ahmed-1ea0` a real link and gives you the
publish button. Full technical detail is in [worker/README.md](worker/README.md).

### B1. Create the database

```bash
wrangler d1 create d3wa
```

It prints a `database_id`. Paste it into [worker/wrangler.toml](worker/wrangler.toml),
replacing `REPLACE_WITH_ID_FROM_wrangler_d1_create`.

### B2. Create the tables

```bash
wrangler d1 execute d3wa --remote --file=worker/schema.sql
```

### B3. Deploy the Worker

```bash
cd worker && wrangler deploy
```

### B4. Set your admin password

Generate a strong random value and keep it in your password manager:

```bash
openssl rand -base64 24
```

Then store it as a secret (it prompts, you paste; nothing is written to disk):

```bash
cd worker && wrangler secret put ADMIN_TOKEN
```

Until this is set, the admin API refuses everyone — it fails closed.

### B5. Route your domain to the Worker

In **Workers & Pages → d3wa → Settings → Domains & Routes**, add a route for
`d3wa.io/*`.

The Worker serves the static files itself and only intercepts order slugs and
`/api/*`, so the storefront and demos keep working exactly as before. If you
did Stage A, the Pages project is now redundant — you can delete it once the
Worker route is confirmed working.

### B6. Check it end to end

1. Open `https://d3wa.io/order.html`, build a test invitation, and submit.
2. You should land on a link like `d3wa.io/test-name-4f2a`. Open it — your
   invitation renders with a "معاينة / Preview" bar at the bottom.
3. Open `https://d3wa.io/admin.html`, paste your admin token, and you should
   see the test order.
4. Tap **انشر الدعوة**. Reload the invitation link — the preview bar is gone.
5. Cancel the test order so it does not sit in your list.

Run the test suite any time:

```bash
node worker/test/worker.test.mjs
```

---

## Later: automatic publish on card payment

Right now you confirm the InstaPay or Vodafone Cash transfer yourself and tap
publish. That manual step exists because **InstaPay and Vodafone Cash have no
way to notify a server that money arrived.**

To remove it you need a card gateway — Paymob or Kashier — which requires an
Egyptian commercial register and tax card. Once you have a merchant account:

```bash
cd worker && wrangler secret put PAY_WEBHOOK_SECRET
```

Point the gateway's webhook at `https://d3wa.io/api/pay/webhook`. The Worker
verifies the HMAC signature and publishes paid orders on its own. Nothing else
changes, and manual transfers keep working alongside it.

---

## What this costs

Cloudflare's free plan covers this comfortably:

| | Free allowance | Your expected use |
|---|---|---|
| Worker requests | 100,000 / day | ~1 per invitation view |
| Static assets | unlimited, free | storefront, demos, images |
| D1 storage | 5 GB | orders are small text rows |
| D1 rows read | 5M / day | 1 per invitation view |
| D1 rows written | 100,000 / day | a few per order |

At 10–15 orders a month you are using a fraction of a percent of this.
Published invitations are also edge-cached for 5 minutes, so repeat views
mostly never reach the Worker.

The only recurring cost is the domain renewal. Cloudflare Registrar sells at
cost — roughly $10/yr for `.com`, $35–40/yr for `.io`.

---

## If something goes wrong

**The site shows a Cloudflare error after adding the domain.** DNS and
certificates take a few minutes. Wait 5 and retry before changing anything.

**Order links 404.** The Worker route is not active. Check
Settings → Domains & Routes has `d3wa.io/*`, not just `d3wa.io`.

**Admin panel says the token is wrong.** Confirm the secret is set on the
deployed Worker: `cd worker && wrangler secret list`.

**You need to roll back to GitHub Pages.** Everything still lives there:

```bash
./scripts/set-domain.sh https://khalidsharafel-din.github.io/d3wa
git commit -am "Roll back to GitHub Pages" && git push
```

Then remove the custom domain in Cloudflare. Nothing is lost — the repo is the
source of truth.

**Test from an Egyptian connection before announcing.** The business plan
notes `*.netlify.app` is blocked in Egypt; Cloudflare with a custom domain
avoids that, but confirm on an Egyptian SIM before you post the first reel.
