# Cloudflare Architecture: How Frontend Connects to API

## Overview

Your application has **two separate deployments**:

1. **Frontend (Pages)**: Static React app served from CDN
2. **API (Workers)**: Serverless API functions

They communicate via HTTP requests.

## Deployment Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Platform                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐         ┌──────────────────┐    │
│  │  Cloudflare Pages │         │ Cloudflare Worker │    │
│  │   (Frontend)     │────────▶│     (API)        │    │
│  │                  │  HTTP   │                  │    │
│  │  Static Files   │ Requests│  API Endpoints   │    │
│  │  (dist/)         │         │  (worker.js)     │    │
│  └──────────────────┘         └──────────────────┘    │
│         │                              │                │
│         │                              │                │
│         ▼                              ▼                │
│  ┌──────────────────┐         ┌──────────────────┐    │
│  │   CDN (Global)   │         │   R2 (Images)   │    │
│  │                  │         │   KV (Analytics) │    │
│  └──────────────────┘         └──────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Step-by-Step Connection

### Step 1: Deploy API (Worker)

```bash
# Deploy the Worker
wrangler deploy
```

**Output**: You'll get a URL like:
```
https://dnd-card-crafter-api.your-subdomain.workers.dev
```

**This is your API URL** - save it!

### Step 2: Deploy Frontend (Pages)

1. Deploy to Cloudflare Pages (via GitHub or wrangler)
2. **Set environment variable** in Pages settings:
   - Variable: `VITE_API_URL`
   - Value: `https://dnd-card-crafter-api.your-subdomain.workers.dev`

### Step 3: How They Connect

The frontend code (`src/lib/api-config.ts`) automatically:
1. Reads `VITE_API_URL` from environment variables
2. Uses it to build API request URLs
3. Makes HTTP requests to your Worker

**Example**:
- Frontend calls: `apiUrl('/api/generate-monster-image')`
- Becomes: `https://dnd-card-crafter-api.your-subdomain.workers.dev/api/generate-monster-image`
- Worker handles the request and responds

## Configuration

### Worker Configuration (`wrangler.toml`)

```toml
name = "dnd-card-crafter-api"
main = "cloudflare/worker.js"

# R2 for images
[[r2_buckets]]
binding = "IMAGES_R2"
bucket_name = "dnd-card-images"

# KV for analytics
[[kv_namespaces]]
binding = "ANALYTICS_KV"
id = "your-kv-namespace-id"
```

### Pages Configuration

**Environment Variables** (set in Pages dashboard):
- `VITE_API_URL`: Your Worker URL
- `VITE_ANALYTICS_ENABLED`: `true`

**Build Settings**:
- Build command: `npm ci && npm run build`
- Output directory: `dist`
- Deploy command: `echo "Deployment complete"`

## How It Works in Code

### Frontend (`src/lib/api-config.ts`)

```typescript
export function getApiBaseUrl(): string {
  // In production: uses VITE_API_URL from environment
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In development: uses relative paths (proxy)
  return '';
}
```

### API Calls

All API calls use `apiUrl()` helper:
```typescript
// In src/lib/monster-images-api.ts
const response = await fetch(apiUrl('/api/generate-monster-image'), {
  method: 'POST',
  body: JSON.stringify({ monsterName: 'goblin' })
});
```

This automatically:
- Uses Worker URL in production
- Uses local proxy in development

## CORS Configuration

The Worker already handles CORS in `cloudflare/worker.js`:

```javascript
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
```

This allows your Pages frontend to make requests to the Worker.

## Testing the Connection

### 1. Test Worker Directly

```bash
curl https://your-worker.workers.dev/api/health
```

Should return:
```json
{"status":"ok","timestamp":"...","environment":"cloudflare-workers"}
```

### 2. Test from Frontend

1. Open your Pages URL in browser
2. Open browser DevTools → Network tab
3. Try generating an image
4. You should see requests to your Worker URL

### 3. Check CORS

If you see CORS errors:
- Verify Worker CORS headers are set
- Check that Worker URL is correct in `VITE_API_URL`

## Custom Domains

### Option 1: Use Workers.dev Domain (Easiest)

- Worker: `https://dnd-card-crafter-api.workers.dev`
- Pages: `https://dnd-card-crafter.pages.dev`
- Set `VITE_API_URL` to Worker URL

### Option 2: Custom Domain

1. **Worker Custom Domain**:
   - Worker → Settings → Triggers → Custom Domain
   - Add: `api.yourdomain.com`

2. **Pages Custom Domain**:
   - Pages → Your Project → Custom domains
   - Add: `yourdomain.com`

3. **Update Environment Variable**:
   - Change `VITE_API_URL` to `https://api.yourdomain.com`

## Troubleshooting

### Frontend Can't Reach API

1. **Check VITE_API_URL**:
   - Verify it's set in Pages environment variables
   - Must be full URL: `https://...workers.dev` (not relative)

2. **Check Worker is Deployed**:
   ```bash
   curl https://your-worker.workers.dev/api/health
   ```

3. **Check CORS**:
   - Worker should allow your Pages domain
   - Check browser console for CORS errors

4. **Check Network Tab**:
   - Open DevTools → Network
   - Look for failed requests to Worker URL
   - Check error messages

### API Returns 404

- Verify Worker routes are correct
- Check Worker logs: `wrangler tail`
- Ensure endpoints match frontend calls

### Images Not Loading

- Verify R2 bucket is accessible
- Check Worker R2 binding is correct
- Verify image URLs are correct format

## Summary

✅ **API (Worker)**: Deploy separately with `wrangler deploy`
✅ **Frontend (Pages)**: Deploy separately, set `VITE_API_URL` environment variable
✅ **Connection**: Frontend makes HTTP requests to Worker URL
✅ **No server needed**: Both are serverless!

The frontend and API are completely independent - they just communicate via HTTP!

