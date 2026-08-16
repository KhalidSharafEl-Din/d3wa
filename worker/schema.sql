-- D3wa order store (Cloudflare D1)
-- apply:  wrangler d1 execute d3wa --remote --file=worker/schema.sql

CREATE TABLE IF NOT EXISTS orders (
  id           TEXT PRIMARY KEY,          -- short public ref, e.g. "1EA0"
  slug         TEXT NOT NULL UNIQUE,      -- "nada-ahmed-1ea0"
  edit_token   TEXT NOT NULL,             -- lets the customer reopen their own draft

  template     TEXT NOT NULL,             -- gold | rose | ... | grad
  package      TEXT NOT NULL,             -- classic | signature | royale
  occasion     TEXT,

  n_ar         TEXT NOT NULL,
  n_en         TEXT,
  event_date   TEXT,                      -- YYYY-MM-DD
  event_time   TEXT,                      -- HH:MM
  v_ar         TEXT,
  v_en         TEXT,
  map_url      TEXT,
  quote        TEXT,

  rsvp_wa      TEXT NOT NULL,             -- guests' confirmations go here
  contact_wa   TEXT,                      -- only used if something is wrong

  rush         INTEGER NOT NULL DEFAULT 0,
  amount       INTEGER NOT NULL,          -- EGP
  pay_method   TEXT,                      -- instapay | vcash | card
  pay_ref      TEXT,                      -- gateway txn id once card is live

  -- draft: still editing · pending: awaiting payment · paid: confirmed, publishing
  -- published: live · cancelled
  status       TEXT NOT NULL DEFAULT 'pending',

  created_at   TEXT NOT NULL,
  paid_at      TEXT,
  published_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
