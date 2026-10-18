---
description: Restart Easy Composer service by running stop-service then start-service
---

# Restart Easy Composer Service

Runs the stop and start workflows in sequence:

1. **Stop**: `.agents/workflows/stop-service.md` (graceful stop in Herdr, port 3005 clearance)
2. **Start**: `.agents/workflows/start-service.md` (sheet generation, Herdr persistence, Tailscale Serve on port 8444, health verification)

---

## Steps

```bash
cd /home/ubuntu/taigi-composer

# 1. Stop service
herdr --session taigi pane send-keys w1:pE ctrl+c 2>/dev/null || true
pkill -f "next-server.*3005" 2>/dev/null || true
fuser -k 3005/tcp 2>/dev/null || true
ss -tulpn | grep 3005  # expect empty

# 2. Pre-generate sheet assets
npm run predev

# 3. Start service in Herdr pane
herdr --session taigi pane run w1:pE "npm run dev"

# 4. Ensure Tailscale route is set
tailscale serve --bg --https=8444 3005

# 5. Verify health checks
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3005/
curl -k -s -o /dev/null -w "%{http_code}\n" https://cyber.tail683ee1.ts.net:8444/
```
