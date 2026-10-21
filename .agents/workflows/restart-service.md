---
description: Restart Easy Composer service by running stop-service then start-service, for code and sheet changes to take effect
---

# Restart Easy Composer Service

Runs the two existing workflows in order — no separate logic lives here:

1. **Stop**: `.agents/workflows/stop-service.md` (discover ports, Herdr
   graceful stop, listener force-kill, port verification)
2. **Start**: `.agents/workflows/start-service.md` (discover routing, sheet
   generation, Herdr persistence, Tailscale Serve routing, health checks)

> Execute stop fully (discovered `$LOCAL_PORT` verified clear) before starting.
> Port/host decisions live in `start-service.md` Step 0 — this file defines
> none of its own.

> [!IMPORTANT]
> **Start and manage the service in the `composer-server` tab of the current Herdr session**:
> - Active coding and agent tasks execute in the `coding` tab (e.g. `w1:t3`).
> - The dev server must **always** be stopped and restarted in the dedicated `composer-server` tab (pane `w1:p1`) of the current Herdr session (`easy-composer`). Do not run the server in the current coding pane.
> - **Workspace setup**: If no Herdr workspace exists, create one named `easy-composer` with its working directory set to this repository (`cwd: /home/inno_formosa/easy-composer`):
>   `herdr --session easy-composer workspace create --label "easy-composer" --cwd "/home/inno_formosa/easy-composer"`

## When a restart is needed

- **Backend change** (`app/*`, `lib/*`, `components/*`, `hooks/*` — e.g. routes,
  playback logic): restart required, Next.js dev server picks it up via
  fast-refresh, but a clean restart guarantees a known-good state.
- **Config change** (`next.config.ts`, `package.json` scripts): restart
  required, config is read once at boot.
- **Sheet change** (`data/sheets/*` — added/removed songs): no restart — run
  `npm run predev` to re-review and regenerate `lib/sheetManifest.ts`
  (dev server picks up the regenerated manifest via fast-refresh).

## Steps

Follow `.agents/workflows/stop-service.md` to completion (including its
Step 0 discovery), then follow `.agents/workflows/start-service.md` from its
Step 0 discovery through health checks. Do not copy port numbers or URLs
between runs — re-discover `$TAILSCALE_HOST` / `$TAILSCALE_IP` / `$LOCAL_PORT`
/ `$SERVE_PORT` via the start workflow every time, then verify:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:$LOCAL_PORT/
curl -k -s -o /dev/null -w "%{http_code}\n" https://$TAILSCALE_HOST:$SERVE_PORT/
```

If either phase fails, follow the troubleshooting in that phase's own
workflow file rather than adding restart-specific workarounds here.
