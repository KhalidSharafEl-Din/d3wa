# D3wa order backend

A single Cloudflare Worker that sits in front of the static site and adds the
three things a static host cannot do: reserve a permanent link, hold the order,
and decide whether a visitor sees a watermarked preview or the published
invitation.

Everything the Worker does not handle falls through to the static files, so the
storefront and the twelve templates keep working exactly as they do today.

## How an order flows

1. The customer builds their invitation on `/order.html`, watching the real
   template render beside the form.
2. On submit the page POSTs to `/api/orders`. The Worker reserves a slug
   (`nada-ahmed-1ea0`) and stores the order with `status = pending`.
3. The customer immediately gets that link. It already shows their invitation,
   with a "معاينة / Preview" bar across the bottom, and is `noindex`.
4. They transfer the deposit by InstaPay or Vodafone Cash.
5. You open `/admin.html`, confirm the money arrived, and tap **انشر الدعوة**.
   The bar disappears, the page becomes indexable and cached, and the link is
   live. Nothing else changes; the customer never has to come back.

The customer only ever contacts you if something is wrong. That path is a
"في مشكلة؟" link on the order page, not a required step.

### When a card gateway is added

Set `PAY_WEBHOOK_SECRET` and point Paymob/Kashier at `POST /api/pay/webhook`.
A verified `success` event publishes the order on its own, so step 5 disappears
for card payments. Manual transfers keep working unchanged. This requires an
Egyptian merchant account (commercial register + tax card), which is the only
reason the flow isn't fully automatic today.

## Deploy

```bash
npm install -g wrangler
wrangler login
```

Create the database and paste the returned id into `wrangler.toml`:

```bash
wrangler d1 create d3wa
```

Create the tables:

```bash
wrangler d1 execute d3wa --remote --file=worker/schema.sql
```

Set the admin password (any long random string; this is what you type into
`/admin.html`):

```bash
wrangler secret put ADMIN_TOKEN
```

Deploy from the `worker/` directory:

```bash
cd worker && wrangler deploy
```

Then point the domain at the Worker in the Cloudflare dashboard
(Workers & Pages → d3wa → Settings → Domains & Routes → add `d3wa.io/*`).

## Routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/orders` | — | Create an order, reserve its slug |
| GET | `/api/orders/:id?token=…` | edit token | Order status for the customer |
| GET | `/api/admin/orders` | Bearer | List orders |
| POST | `/api/admin/orders/:id/mark` | Bearer | `pending` / `paid` / `published` / `cancelled` |
| POST | `/api/pay/webhook` | HMAC | Card gateway callback (dormant until configured) |
| GET | `/:slug` | — | The invitation |

## Tests

No dependencies; the suite stubs D1 and the assets binding.

```bash
node worker/test/worker.test.mjs
```

Covers slug shape and uniqueness, pricing (including rush being free on
Royale), field validation, watermark/noindex on unpublished orders and their
removal on publish, admin auth rejection, edit-token scoping, static
fallthrough, and webhook signature rejection.

## Notes

- `.assetsignore` at the repo root keeps `worker/`, `docs/`, the business plan
  and the context files out of the uploaded assets.
- The slug always carries a short code, so two couples with the same names can
  never collide and the customer can be shown their final link the moment they
  type their names.
- Templates read `window.__D3WA__` when present and fall back to
  `location.search`, which is why `/demos/*.html?n_ar=…` still works for quick
  manual previews via `studio.html`.
