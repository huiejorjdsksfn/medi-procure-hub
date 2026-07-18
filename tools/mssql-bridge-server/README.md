# mssql-bridge-server

The real, TCP-connecting half of the app's SQL Server Bridge.

## Why this exists

Supabase Edge Functions run on Deno, which can only make HTTP/HTTPS calls —
they cannot open a raw TCP socket, and SQL Server's TDS protocol is
TCP-based. That's a platform constraint of Deno's networking model, not
something any Edge Function code can work around. So the app's `mssql-bridge`
Edge Function can't talk to SQL Server directly.

This script is the other half: it runs on a machine that *does* have real
network access to your SQL Server (your office network, a VM beside it,
etc.), holds the actual `mssql` npm driver, and exposes a small
authenticated HTTPS API. The Edge Function calls this API; this script
makes the real TDS connection.

```
 App (browser)  →  mssql-bridge Edge Function  →  HTTPS  →  this server  →  TDS  →  SQL Server
                    (Supabase, Deno)                        (your network)
```

## Setup

```bash
cd tools/mssql-bridge-server
npm install
cp .env.example .env
```

Fill in `.env`:
- `SQLSERVER_BRIDGE_SECRET` — generate a real random value: `openssl rand -hex 32`
- `MSSQL_SERVER` / `MSSQL_DATABASE` / `MSSQL_USER` / `MSSQL_PASSWORD` — your real SQL Server connection info

```bash
npm start
```

You should see:
```
mssql-bridge-server listening on port 4390
```

## Exposing it to the app

The Supabase Edge Function needs to reach this over HTTPS from the internet.
Two real options:

1. **Reverse tunnel** (fastest to set up, good for testing): `cloudflared
   tunnel --url http://localhost:4390` or `ngrok http 4390`, either gives
   you a real public HTTPS URL.
2. **Real reverse proxy** (for a production setup): put this behind nginx/
   Caddy with a real TLS certificate on a server that has network access to
   SQL Server.

Take that HTTPS URL and paste it into the app: **Admin → Database → SQL
Server Bridge** → Bridge URL, along with the same secret, then toggle
**Enabled**. The app will start showing real, live connection status and
schema data from your actual SQL Server. Toggling it off disconnects
immediately — no requests are sent to the bridge_url while disabled.

## Endpoints

All require header `X-Bridge-Secret: <your secret>`.

| Endpoint | What it really does |
|---|---|
| `POST /ping` | Health check — confirms the bridge process itself is up |
| `POST /test_connection` | Opens a real connection to SQL Server, runs `SELECT @@VERSION` |
| `POST /schema` | Real `INFORMATION_SCHEMA.TABLES` query |
| `POST /query` | Runs a real query — **SELECT statements only**, rejects everything else |

The `/query` endpoint deliberately only allows `SELECT` — this bridge should
never accept arbitrary write SQL from the app side. If you need the app to
trigger real writes to SQL Server, that needs a separate, much more
carefully scoped endpoint with its own allow-list — not a blanket open door.
