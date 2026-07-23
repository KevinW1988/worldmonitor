# Deploy World Monitor (Silent Sentinel fork) to Vercel

Get a **permanent public URL** for:

- Dashboard + Colorado FWI panel
- `GET /api/silent-sentinel/fwi` (live NIFC + NWS)
- `POST/GET /api/silent-sentinel/events` (edge bridge)

**No API keys are required** for the FWI panel or basic dashboard. Optional keys unlock more feeds (see `.env.example`).

---

## Method A — Dashboard (recommended, ~5 minutes)

### 1. Create a Vercel account

1. Open [https://vercel.com/signup](https://vercel.com/signup)
2. Choose **Continue with GitHub**
3. Authorize Vercel to access your GitHub account

### 2. Import this repository

1. Open [https://vercel.com/new](https://vercel.com/new)
2. Find **KevinW1988/worldmonitor** (or paste `https://github.com/KevinW1988/worldmonitor`)
3. Click **Import**

### 3. Project settings

Use these values (most auto-detect):

| Setting | Value |
|---------|--------|
| Framework Preset | **Vite** |
| Root Directory | `.` (leave default) |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| Node.js Version | **20.x** (Project Settings → General) |

### 4. Environment variables (optional for FWI)

You can **Deploy with zero env vars**. Add later if you want:

| Variable | Why |
|----------|-----|
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Persist Silent Sentinel events across restarts ([upstash.com](https://upstash.com/) free tier) |
| `SILENT_SENTINEL_INGEST_KEY` | Optional shared secret for `POST /api/silent-sentinel/events` |
| `VITE_VARIANT` | `full` (default) |

Skip Clerk, Dodo, Convex, etc. unless you need auth/billing.

### 5. Deploy

Click **Deploy**. First build can take **8–15 minutes** (blog + TypeScript + Vite).

When it finishes, Vercel shows a URL like:

```
https://worldmonitor-xxxx.vercel.app
```

### 6. Your permanent FWI links

Replace `YOUR_DEPLOY` with that hostname:

**Colorado FWI panel + map**

```
https://YOUR_DEPLOY.vercel.app/dashboard?lat=39.7392&lon=-104.9903&zoom=8.0&view=colorado-fwi&timeRange=7d&layers=conflicts,hotspots,weather,outages,natural&fwi=1&silentSentinel=1
```

**Live FWI JSON API**

```
https://YOUR_DEPLOY.vercel.app/api/silent-sentinel/fwi
```

**Edge bridge ingest**

```
POST https://YOUR_DEPLOY.vercel.app/api/silent-sentinel/events
Content-Type: application/json
```

Bookmark the dashboard URL. Every push to `main` redeploys automatically.

---

## Method B — Vercel CLI

```bash
# One-time
npm i -g vercel

git clone https://github.com/KevinW1988/worldmonitor.git
cd worldmonitor
npm install

# Login + link project (interactive)
vercel login
vercel link

# Preview deploy
vercel

# Production
vercel --prod
```

Copy the production URL from the CLI output and use the same path patterns as above.

---

## Method C — Local full stack (API + UI without public URL)

```bash
npm i -g vercel
cd worldmonitor
npm install
vercel link   # optional but helps env pull
vercel dev    # serves Vite + /api/* on one port
```

Then open:

```
http://localhost:3000/dashboard?...&fwi=1&silentSentinel=1
```

(`vercel dev` runs edge functions; plain `npm run dev` still works for FWI via direct NIFC/NWS fallback.)

---

## After deploy checklist

1. Open `/api/silent-sentinel/fwi` — expect JSON with `fires`, `alerts`, `cascade`
2. Open dashboard with `&fwi=1` — left panel **CO FWI · Fire / Water / Infra**
3. Open with `&silentSentinel=1` — right panel **Silent Sentinel Edge** (Demo button works offline)
4. From Jetson / silent-sentinel-edge, set bridge URL to:

   ```
   https://YOUR_DEPLOY.vercel.app/api/silent-sentinel/events
   ```

---

## Build failures (common)

| Symptom | Fix |
|---------|-----|
| Out of memory / timeout | Hobby is usually fine; retry **Redeploy without cache**. Upgrade plan if persistent. |
| Node version errors | Settings → General → Node.js **20.x** |
| `blog-site` install fails | Ensure `npm install` runs `postinstall`; do not set `npm ci --omit=dev` |
| TypeScript errors on your edits | Run `npm run typecheck` locally before push |
| Ignored Build Step skips deploy | Touch a file under `src/` or `api/` and push again |

---

## Custom domain (optional)

Vercel → Project → **Settings → Domains** → add e.g. `monitor.yourdomain.com`.

Then FWI URL becomes:

```
https://monitor.yourdomain.com/dashboard?...&fwi=1
```

---

## What you do not need for FWI

- Redis (FWI always live-fetches NIFC + NWS)
- Clerk / payments / Convex
- Railway relay
- Map API keys (OpenFreeMap default)

Upstash Redis is only useful if you want **persistent** Silent Sentinel event history across cold starts.

---

*Maintained for KevinW1988/worldmonitor — Silent Sentinel Edition.*
