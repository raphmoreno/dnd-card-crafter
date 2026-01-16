# Fix: Environment Variable Not Working in Cloudflare Pages Build

## Problem

Environment variable `VITE_API_URL` is set in Cloudflare Pages, but the frontend still uses relative paths (`/api/...`) instead of the Worker URL.

## Root Cause

Cloudflare Pages may not expose environment variables to the build process in a way that Vite can access them. Vite needs environment variables to be available as `process.env.VITE_*` during the build.

## Solution Options

### Option 1: Set in Build Command (Recommended)

Instead of using the Environment Variables section, set it directly in the build command:

1. Go to Pages → Your Project → Settings → Builds & deployments
2. Edit the **Build command** to:
   ```
   VITE_API_URL=https://dnd-card-crafter-api.raphael-6e5.workers.dev npm ci && npm run build
   ```
   (Replace with your actual Worker URL)

3. Save and trigger a new build

**Why this works**: The environment variable is explicitly set in the shell before the build runs, ensuring Vite can access it.

### Option 2: Use .env File (Not Recommended for Cloudflare)

This won't work in Cloudflare Pages since you can't commit .env files, but for reference:
- Create `.env.production` with: `VITE_API_URL=https://your-worker.workers.dev`
- But Cloudflare Pages won't use this

### Option 3: Update vite.config.ts (Already Done)

I've updated `vite.config.ts` to explicitly handle the environment variable. However, if Cloudflare Pages doesn't expose it to `process.env`, this won't help.

## Verification Steps

### 1. Check Build Logs

After setting the env var in the build command, check the build logs:

1. Go to Pages → Deployments → Click on build
2. Look for the build command output
3. You should see `VITE_API_URL=...` in the command

### 2. Check Browser Console

After deployment, open your site and check the browser console. You should see:
```
[API Config] VITE_API_URL: https://dnd-card-crafter-api.raphael-6e5.workers.dev
```

If it still shows `(not set)`, the variable isn't being embedded in the build.

### 3. Check Network Requests

1. Open DevTools → Network tab
2. Try an API call
3. The request should go to: `https://dnd-card-crafter-api.raphael-6e5.workers.dev/api/...`
4. NOT to: `/api/...` or `https://your-pages.pages.dev/api/...`

## Why This Happens

Cloudflare Pages environment variables are typically available at **runtime** (when the site is served), but Vite needs them at **build time** (when creating the static files).

By setting the variable in the build command, we ensure it's available during the build process.

## Alternative: Runtime Configuration

If build-time configuration doesn't work, we could use runtime configuration, but this requires a different approach:

1. Create a `config.js` file that's loaded at runtime
2. Set the API URL there
3. But this is more complex and less ideal

## Recommended Solution

**Use Option 1**: Set the environment variable in the build command.

Your build command should be:
```
VITE_API_URL=https://dnd-card-crafter-api.raphael-6e5.workers.dev npm ci && npm run build
```

This ensures:
- ✅ Variable is available at build time
- ✅ Vite can embed it in the built files
- ✅ Frontend uses the correct Worker URL

## After Fixing

1. Trigger a new build
2. Wait for it to complete
3. Check browser console for the debug logs
4. Verify Network tab shows requests to Worker URL
5. Test API calls - they should work now!

