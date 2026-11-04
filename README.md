# D3wa دعوة: digital invitation store

Bilingual (Arabic-first, English) invitation websites for Egyptian weddings, engagements, katb kitab, henna nights, sebou3 and graduations. Each invitation is a fast, static, mobile-first page with a tap-to-open intro, live countdown, one-tap WhatsApp RSVP, venue map, add-to-calendar and instant AR/EN switching.

## The store

- `index.html`: home (hero, designs, what's inside, how it works, packages, paper vs link, FAQ)
- `templates/`: the collection with occasion filters, and one product page per design (generated)
- `order.html`: four-step checkout with a live preview of the customer's own invitation and an order summary. No payment is taken at checkout (see "Orders and payment").
- `policies.html`: terms, payment and refunds, delivery and revisions, privacy
- `demos/`: the 12 invitation templates: gold, rose, rustic, navy, emerald, sahara, henna, deco, garden, modern, lotus, grad
- `admin.html`, `studio.html`: internal tools, not linked from the store
- `worker/`: Cloudflare Worker + D1 order backend (see `worker/README.md`)

## One source of truth

`assets/catalog.js` holds the designs, packages, prices, add-ons and payment rule. The browser reads it as `window.D3WA`, and `scripts/build.mjs` renders from it:

- the shared header and footer on every store page (between `<!-- build:x -->` markers)
- the home page's design tiles, packages, occasion row and comparison table
- `templates/index.html` and the 12 product pages
- `sitemap.xml`

```bash
node scripts/build.mjs          # after editing the catalog, a template, or a marked region
node scripts/build.mjs --check  # fails if any generated file is stale
```

The Worker keeps its own copy of the prices and the minimum package per design (`worker/src/index.js`). Change both together.

## Screenshots and share cards

```bash
node scripts/shots.mjs          # covers + product gallery for all 12, Arabic and English
node scripts/shots.mjs henna    # one design
node scripts/shots.mjs --og     # WhatsApp/social share cards into assets/og/
```

It drives Chrome or Edge headless (set `CHROME=/path` to choose). Templates mark their gallery views with `data-shot="details"` and `data-shot="rsvp"`. Rerun after editing a template, then rerun the build.

## Orders and payment

Checkout asks for no money. While the site runs on static hosting, "Place order" opens WhatsApp with the full order in one message. Once the Worker is deployed, checkout detects it through `GET /api/health`, reserves the customer's link and stores the order instead. Payment happens on WhatsApp after the details are confirmed: Classic once after the preview, Signature and Royale half to start and half before publishing, by InstaPay or Vodafone Cash. A card gateway plugs in at `payment` in the catalog and `POST /api/pay/webhook` in the Worker.

## Tests

```bash
node worker/test/worker.test.mjs
```

No build step for hosting: pure HTML/CSS/JS, Google Fonts only. Currently on GitHub Pages; `DEPLOY.md` covers moving to Cloudflare and a custom domain (`scripts/set-domain.sh` rewrites every absolute URL, including the catalog's).
