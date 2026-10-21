---
description: Cleanly stop Easy Composer service from Herdr and verify port clearance
---

# Stop Easy Composer Service

This workflow cleanly terminates the Easy Composer dev service:

1. **Easy Composer** (`npm run dev`, Next.js on discovered `$LOCAL_PORT`)

It clears the process from the **Herdr** session, ensures lingering port
listeners are freed, and verifies complete clearance.

Reference: multi-service stop-service workflow pattern
(single-service adaptation: discovered backend port only).

> **Convention:** ports come from live host state, never from memory. Read
> `$LOCAL_PORT` / `$SERVE_PORT` from the start workflow's Step 0 if still
> known; otherwise re-discover here before acting.

---

## 0. Discover What to Stop (always run first)

```bash
# 1. Which Serve routes exist right now:
tailscale serve status

# 2. Which backend port is our server actually on:
ss -tlnp | grep -E "next-server|3005|3006" || echo "no backend listener"
pgrep -fla "next-server" || echo "no next-server process"
```

Rules:

- `$LOCAL_PORT` = the port our Next.js server is on (default candidate
  `3005`; confirm via `ss`, not memory).
- `$SERVE_PORT` = the Serve `https://<host>:<port>` entry proxying to
  `127.0.0.1:$LOCAL_PORT` (confirm via `tailscale serve status`).
- If neither exists, there is nothing to stop — skip to verification.

---

## 1. Stop Running Service Process

> [!NOTE]
> **Herdr Workspace & Tab**:
> The server runs in the dedicated `composer-server` tab (pane `w1:p1`) of the Herdr session (`easy-composer`). If no Herdr workspace exists, create one named `easy-composer` with its working directory set to this repository (`cwd: /home/inno_formosa/easy-composer`):
> ```bash
> herdr --session easy-composer workspace create --label "easy-composer" --cwd "/home/inno_formosa/easy-composer" 2>/dev/null || true
> ```

Gracefully interrupt the server in its Herdr pane (located in the `composer-server` tab of the current Herdr session, pane `w1:p1`):

```bash
# 1. Gracefully interrupt the process in the 'composer-server' tab pane:
herdr --session easy-composer pane send-keys w1:p1 ctrl+c 2>/dev/null || true

# 2. Terminate any remaining Next.js dev processes:
pkill -f "next-server" 2>/dev/null || true
```

---

## 2. Force Kill Any Lingering Listener (Safety Net)

If `$LOCAL_PORT` remains bound after a moment, force-release only that port:

```bash
fuser -k $LOCAL_PORT/tcp 2>/dev/null || true
```

---

## 3. Tailscale Serve Handling (Optional)

> **Note**: Tailscale Serve routes are preserved by default. When the backend
> process is stopped, Tailscale will return `502 Bad Gateway` until the
> service is restarted via `.agents/workflows/start-service.md`. Leaving the
> route intact allows instant resumption upon restart.

If you wish to completely turn off the Easy Composer route (leaving other
routes on this host untouched — do **NOT** `tailscale serve reset` here):

```bash
# Turn off only the discovered Easy Composer route:
tailscale serve --https=$SERVE_PORT off
```

---

## 4. Verification

Confirm that the process and port have been cleanly cleared:

```bash
# Check if $LOCAL_PORT is free (should return empty output):
ss -tulpn | grep -E "$LOCAL_PORT"

# Check process list (should return empty output):
pgrep -fl "next-server" || true
```
