---
description: Start Easy Composer dev server with Herdr, Tailscale Serve routing, and verification
---

# Start Easy Composer Service (Next.js Dev Server)

This workflow starts the Easy Composer score editor application:

1. **Easy Composer** (`npm run dev`, Next.js on discovered `$LOCAL_PORT` —
   sheet review + manifest generation via `npm run predev`, realistic sheet
   score canvas, playback engine)

The service is launched persistently via **Herdr**, secured through
**Tailscale Serve**, and verified with health checks.

Reference: multi-service start-service workflow pattern
(single-service adaptation: `npm run predev` replaces the frontend build step —
sheets are reviewed incrementally and `lib/sheetManifest.ts` is regenerated).

> **Convention used below:** nothing is hardwired. Step 0 discovers four
> values from live host state — `$TAILSCALE_HOST`, `$TAILSCALE_IP`,
> `$LOCAL_PORT`, `$SERVE_PORT` — and every later step uses them. Defaults are
> `3005` / `8444` (first candidates, not decisions).

---

## 0. Discover Current Routing (always run first)

Do not skip this step. Tailscale routes and free ports differ per host and
change over time — the final URLs come from here, never from memory.

```bash
cd /home/inno_formosa/easy-composer

# 1. Who am I on the tailnet (no hardwired hostname):
tailscale status
TAILSCALE_HOST=$(tailscale status --json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); s=d.get('Self',{}); print((str(s.get('HostName','')).strip()+'.'+str(d.get('MagicDNSSuffix','')).strip()).strip('.'))")
TAILSCALE_IP=$(tailscale ip -4 2>/dev/null | head -n 1)
echo "TAILSCALE_HOST=$TAILSCALE_HOST"
echo "TAILSCALE_IP=$TAILSCALE_IP"

# 2. Existing Serve routes (decides $SERVE_PORT):
tailscale serve status

# 3. Local listeners (decides $LOCAL_PORT):
ss -tlnp | grep -E ':3005|:3006|:844|:443' || echo "candidate ports free"
```

Decision rules:

- `$LOCAL_PORT`: default `3005` (matches the `PORT` default in
  `package.json` `dev` / `start` scripts). If bound by our own Next.js
  server, reuse it. If bound by something else, pick the next free port in
  `3005-3099` (verify with `ss -tlnp | grep -E ":<candidate>"`, then launch
  with `PORT=<candidate> npm run dev`) and carry that value into every step
  below.
- `$SERVE_PORT`: if `tailscale serve status` already shows
  `https://$TAILSCALE_HOST:<port>` proxying to `127.0.0.1:$LOCAL_PORT`,
  reuse that `<port>`. Otherwise pick the first port in `8444-8499` absent
  from **both** `tailscale serve status` and `ss -tlnp`.
- Never run `tailscale serve reset` — this host may carry routes owned by
  other projects.

> One-time permission fix: if any `tailscale serve` command reports
> `Access denied: serve config denied`, run
> `sudo tailscale set --operator=$USER` once, then retry.

---

## 1. Pre-flight Checks

Working directory and Tailscale state come from Step 0 — re-check only that
the chosen backend port is still free (or owned by our server):

```bash
ss -tulpn | grep -E "$LOCAL_PORT"
```

*(If bound by something other than our server, stop the existing holder first
or return to Step 0 and pick the next free port — e.g.
`herdr --session easy-composer pane read w1:p1` to inspect, then kill or
reuse that pane).*

---

## 2. Generate Sheet Manifest & Review Sheets

Ensure all built-in sheets and manifests are validated and generated
(incremental — only added, modified, or deleted sheets are checked):

```bash
cd /home/inno_formosa/easy-composer
npm run predev
```

---

## 3. Start Persistent Service with Herdr

> [!IMPORTANT]
> **Start the service in the `composer-server` tab of the current Herdr session**:
> - Development and coding agent sessions run in the `coding` tab (e.g. `w1:t3`).
> - The dev server must **always** be started and managed in the dedicated `composer-server` tab (pane `w1:p1`) of the current Herdr session (`easy-composer`). Never run the blocking server in the active coding pane.
> - **Workspace setup**: If no Herdr workspace exists, create one named `easy-composer` with its working directory set to this repository (`cwd: /home/inno_formosa/easy-composer`):
>   `herdr --session easy-composer workspace create --label "easy-composer" --cwd "/home/inno_formosa/easy-composer"`

Herdr provides socket-managed, attachable terminal sessions ideal for
autonomous agents:

```bash
# 1. Start headless Herdr server for 'easy-composer' session (if not already running)
herdr --session easy-composer server 2>/dev/null &

# 2. If no workspace exists, create one named 'easy-composer' with cwd set to this repo
herdr --session easy-composer workspace create --label "easy-composer" --cwd "/home/inno_formosa/easy-composer" 2>/dev/null || true

# 3. Ensure the dedicated 'composer-server' tab exists in the workspace
herdr --session easy-composer tab rename w1:t1 composer-server 2>/dev/null || herdr --session easy-composer tab create --label "composer-server" --cwd "/home/inno_formosa/easy-composer"

# 4. Start the service in the 'composer-server' tab pane (typically w1:p1; binds 0.0.0.0 so Tailscale Serve can reach it)
# Find the pane ID of the composer-server tab dynamically if needed:
# PANE_ID=$(python3 -c "import json, subprocess; panes=json.loads(subprocess.check_output(['herdr','pane','list']))['result']['panes']; tabs=json.loads(subprocess.check_output(['herdr','tab','list']))['result']['tabs']; cs=[t['tab_id'] for t in tabs if t.get('label')=='composer-server']; print(next((p['pane_id'] for p in panes if p.get('tab_id') in cs), 'w1:p1'))")
herdr --session easy-composer pane run w1:p1 "npm run dev"
# (If $LOCAL_PORT is not 3005: PORT=$LOCAL_PORT npm run dev — note package.json
# reads ${PORT:-3005}, so prefix the run command with PORT=$LOCAL_PORT.)
```

> **Live Inspection**:
> - Server logs: `herdr --session easy-composer pane read w1:p1 --source recent-unwrapped --lines 50`
> - Attach interactively anytime: `herdr session attach easy-composer`

---

## 4. Configure Tailscale Serve Routing

Expose `$LOCAL_PORT` on the discovered `$SERVE_PORT` so existing Serve routes
on this host are left untouched (do **NOT** `tailscale serve reset` here —
this host may carry routes owned by other projects):

```bash
# Expose Easy Composer on the discovered Serve port
tailscale serve --bg --https=$SERVE_PORT $LOCAL_PORT
```

Verify serve routing table:

```bash
tailscale serve status
```

Expected addition (alongside any pre-existing routes, with discovered values
filled in — e.g. `TAILSCALE_HOST=inno-tools.tail683ee1.ts.net`,
`SERVE_PORT=8444`, `LOCAL_PORT=3005`):

```text
https://$TAILSCALE_HOST:$SERVE_PORT (tailnet only)
|-- / proxy http://127.0.0.1:$LOCAL_PORT
```

---

## 5. Health Checks & Verification

Wait for Next.js compilation to finish (first compile can take 30+ seconds),
then verify:

```bash
# 1. Check local Easy Composer HTTP response
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:$LOCAL_PORT/

# 2. Check Tailscale HTTPS Ingress response
curl -k -s -o /dev/null -w "%{http_code}\n" https://$TAILSCALE_HOST:$SERVE_PORT/

# 3. Check direct Tailscale IP response (iPad Safari fallback)
curl -s -o /dev/null -w "%{http_code}\n" http://$TAILSCALE_IP:$LOCAL_PORT/

# 4. Verify Easy Composer HTML metadata
curl -s http://localhost:$LOCAL_PORT/ | grep -i "easy-composer"
```

All status checks must return `200`.

---

## Access URLs on your Tailnet (iPad & Desktop):

- **Easy Composer (HTTPS)**: `https://$TAILSCALE_HOST:$SERVE_PORT/`
- **Easy Composer (direct Tailnet IP)**: `http://$TAILSCALE_IP:$LOCAL_PORT/`
- **Local (same host)**: `http://localhost:$LOCAL_PORT/`
