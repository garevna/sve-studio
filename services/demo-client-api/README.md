# demo-client-api

A made-up client for the Pagewright demo: the hotel chain "Kalyna Hotels"
(invented — no real company, no real data). It stands where a real client's
system would: on an address of its own, apart from the site, so the docking
block (`packages/dock`, `content/settings/client-api.json`) can be tried end to
end. A Cloudflare Worker with a D1 database, deployed on its own.

- **Address:** `https://demo-api.pagewright.pp.ua` (also
  `https://pagewright-demo-api.garevna.workers.dev`)
- **Its API** (`/hotel/...`) — called from the visitor's browser; CORS for
  `ALLOWED_ORIGINS` in `wrangler.toml`.
- **Its booking page** (`/hotel/book`) — the client's own request intake the
  site hands the visitor over to; "Забронювати" records a booking.
- **Its admin** (`/admin`) — bookings, sessions and every request, refreshed
  every 2 s. "Почати демо заново" erases them.

The demo keeps the last 300 requests and 100 bookings, sessions for 14 days.
No secrets: nothing private goes in here.

## Deploy

```sh
cd services/demo-client-api
npx wrangler d1 migrations apply pagewright-demo-api --remote   # new migrations only
npx wrangler deploy
```

Wrangler needs Node ≥ 22.12.
