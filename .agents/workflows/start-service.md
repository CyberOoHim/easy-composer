---
description: Start Easy Composer with Herdr, dedicated port 3005, Tailscale Serve HTTPS ingress on port 8444 (differentiated from reference service), and verification
---

# Start Easy Composer Service (Differentiated Tailscale Ingress)

This workflow starts the **Easy Composer** score editor application persistently via **Herdr**, routes it through a dedicated **Tailscale Serve** HTTPS port (`8444`), and verifies health checks.

This setup is intentionally differentiated from the reference service (`taigi-agent`), allowing both services to run simultaneously side-by-side without port or URL collision.

---

## 🏛️ Routing Architecture & Differentiated URLs

| Application | Target Local Port | Tailnet Access URL | Description |
| :--- | :--- | :--- | :--- |
| **Easy Composer** | **Port 3005** | **`https://cyber.tail683ee1.ts.net:8444/`** | Dedicated HTTPS endpoint on Tailscale |
| **Easy Composer** | **Port 3005** | **`http://100.126.251.56:3005/`** | Direct Tailscale IP access (iPad Safari) |
| **Easy Composer** | **Port 3005** | **`http://localhost:3005`** | Localhost access on host machine |
| *Taigi Reference Main App* | *Port 3000* | *`https://cyber.tail683ee1.ts.net/`* | Primary Tailscale root ingress |
| *Taigi Reference Reviewer* | *Port 5174* | *`https://cyber.tail683ee1.ts.net:8443/`* | Reviewer Vite dev server ingress |

---

## 1. Pre-flight Checks

Verify working directory and Tailscale connection:

```bash
cd /home/ubuntu/taigi-composer

# Ensure Tailscale is running
tailscale status

# Check whether port 3005 is already in use
ss -tulpn | grep 3005
```

*(If port 3005 is already occupied by a stale instance, run `.agents/workflows/stop-service.md` first).*

---

## 2. Generate Sheet Manifest & Review Sheets

Ensure all built-in sheets and manifests are validated and generated:

```bash
cd /home/ubuntu/taigi-composer
npm run predev
```

---

## 3. Start Persistent Service with Herdr

Launch or reuse the dedicated `composer-server` tab in the `taigi` Herdr session:

```bash
# 1. Ensure headless Herdr server for 'taigi' session is running
herdr --session taigi server 2>/dev/null &

# 2. Check existing panes/tabs
herdr --session taigi tab list

# 3. Create 'composer-server' tab if not already present:
# (If tab already exists, skip creation and target its pane ID)
herdr --session taigi tab create --workspace w1 --cwd "/home/ubuntu/taigi-composer" --label "composer-server" --no-focus 2>/dev/null || true

# 4. Find the pane ID for tab 'composer-server':
# PANE_ID=$(herdr --session taigi tab list --json | jq -r '.result.tabs[] | select(.label=="composer-server") | .tab_id' | sed 's/:t/:p/')
# (Common default pane ID: w1:pE)

# 5. Launch Next.js dev server on port 3005 in the dedicated pane:
herdr --session taigi pane run w1:pE "npm run dev"
```

> **Live Inspection**:
> - Read server logs: `herdr --session taigi pane read w1:pE --lines 50`
> - Attach interactively anytime: `herdr session attach taigi`

---

## 4. Configure Differentiated Tailscale Serve Routing

Expose local port 3005 on dedicated HTTPS port `8444`:

```bash
# Expose port 3005 on HTTPS 8444
tailscale serve --bg --https=8444 3005

# Verify active serve routing table
tailscale serve status
```

Expected output:
```text
https://cyber.tail683ee1.ts.net (tailnet only)
|-- / proxy http://127.0.0.1:3000

http://cyber (tailnet only)
http://cyber.tail683ee1.ts.net (tailnet only)
|-- / proxy http://127.0.0.1:3000

https://cyber.tail683ee1.ts.net:8443 (tailnet only)
|-- / proxy http://127.0.0.1:5174

https://cyber.tail683ee1.ts.net:8444 (tailnet only)
|-- / proxy http://127.0.0.1:3005
```

---

## 5. Health Checks & Verification

Wait 2–3 seconds for compilation, then verify all endpoints:

```bash
# 1. Check local Easy Composer HTTP response
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3005/

# 2. Check Tailscale HTTPS Ingress response (port 8444)
curl -k -s -o /dev/null -w "%{http_code}\n" https://cyber.tail683ee1.ts.net:8444/

# 3. Check direct Tailscale IP response
curl -s -o /dev/null -w "%{http_code}\n" http://100.126.251.56:3005/

# 4. Verify Easy Composer HTML metadata
curl -s http://localhost:3005/ | grep -i "easy-composer"
```

All status checks must return `200`.

---

## 🌐 Access URLs on your Tailnet (iPad & Desktop):

- **iPad Safari (HTTPS Dedicated)**: `https://cyber.tail683ee1.ts.net:8444/`
- **iPad Safari (Direct Tailnet IP)**: `http://100.126.251.56:3005/`
- **Host Machine Localhost**: `http://localhost:3005`
