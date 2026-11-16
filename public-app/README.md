# Public dashboard and private access

Password authentication for the private dashboard is optional and disabled by default. To enable it, add `LIBRARY_AUTH_ENABLED=true` and `LIBRARY_ADMIN_PASSWORD=<password>` to the project `.env`, and restart both services. Use a unique random password of at least 24 bytes and sign in as `admin`. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Both processes must receive the same authentication setting and password. The public process reads the project `.env` by default. To turn authentication off, set `LIBRARY_AUTH_ENABLED=false` (or remove it) and restart both processes. Other values fail at startup rather than silently changing protection. Never commit or share `.env`.

When authentication is disabled, every device that can reach the private service can use its settings and Telegram controls. Cross-site request checks remain active. Restrict Tailscale access to trusted devices. Do not copy the workstation database to the server.

The private app always listens on `127.0.0.1:3001` (or SERVER_PORT). To also access it over Tailscale, set `SERVER_TAILSCALE_IP` in `.env` to this server's own Tailscale IPv4 address, shown by `tailscale ip -4`, and restart the private app. The public app continues to connect over loopback. Tailscale access must be restricted to trusted devices using the tailnet's access policy. Do not set up a public tunnel to the private port. HTTP Basic credentials are protected in transit by Tailscale between tailnet devices or by loopback locally; do not access the private service over an unencrypted non-Tailscale network.

Run the public app alongside the private app with `node public-app/server.js`; it listens on port `3002` on available network interfaces by default, including the LAN and Tailscale interfaces. Set PUBLIC_PORT and PRIVATE_PORT if needed. Point the public Cloudflare Tunnel only at the public port. Use firewall rules if access from the LAN or other interfaces is unwanted. Verify existing tunnel routes, firewall rules and Tailscale policy before publishing.

The public process only reads the existing occupancy and forecast endpoints on a fixed schedule and never opens the database or sends Telegram messages. Responses expire after 30 minutes without a successful refresh. Configure Cloudflare rate limiting and monitor traffic before opening to the public.

## Occupancy and Telegram schedules

The private backend fetches university occupancy at startup and then 60 seconds after each fetch finishes. Concurrent automatic, manual and scheduled requests share any in-progress fetch. Website requests only read the cached result; visitor count does not multiply university API requests. `/api/get-spaces` includes `updatedAt` (the last successful fetch) and `refreshIntervalSeconds` alongside its existing `data` object. Failed fetches keep the previous data and timestamp, and the next minute retries.

Telegram messages and history writes keep their existing schedule (60 minutes by default), quiet hours and daily forecast behavior. The private dashboard's frequency setting controls this Telegram/history schedule, independently of website occupancy fetching. At the scheduled Telegram time, a successful occupancy fetch from the last minute can be reused.

The public process copies cached occupancy from the private backend every minute, and public browsers check the public cache every minute. These layers can add delay before a new university reading appears on screen. Forecast polling is unchanged.

Run the checks with `node --test tests/*.test.js`. Use an isolated working directory and a temporary database for live-data smoke tests; never seed, upload or replace the production history database with workstation data.
