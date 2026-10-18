---
description: Cleanly stop Easy Composer service from Herdr and release port 3005
---

# Stop Easy Composer Service

This workflow cleanly terminates the **Easy Composer** service process and verifies port clearance.

---

## 1. Stop Running Service Process

Gracefully interrupt the process in Herdr and terminate any lingering Next.js dev server:

```bash
# 1. Gracefully interrupt process in Herdr pane (e.g. w1:pE)
herdr --session taigi pane send-keys w1:pE ctrl+c 2>/dev/null || true

# 2. Terminate running Next.js dev processes bound to port 3005
pkill -f "next-server.*3005" 2>/dev/null || true
```

---

## 2. Force Kill Any Lingering Listeners (Safety Net)

If port 3005 remains bound, force-release it:

```bash
fuser -k 3005/tcp 2>/dev/null || true
```

---

## 3. Tailscale Serve Handling (Optional)

> **Note**: Tailscale Serve routes are preserved by default. When the service is stopped, Tailscale will return `502 Bad Gateway` on port 8444 until restarted via `.agents/workflows/start-service.md`.

To completely disable Tailscale routing on port 8444:

```bash
tailscale serve --https=8444 off
```

---

## 4. Verification

Confirm port 3005 is free:

```bash
ss -tulpn | grep 3005
```

*(Expected output: empty / no listeners on port 3005).*
