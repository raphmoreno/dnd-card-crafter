# Fix: API Calls Going to Pages Instead of Worker

## Problem

Frontend is calling `https://dnd-card-crafter.pages.dev/api/...` instead of your Worker URL, getting 405 errors.

## Root Cause

The `VITE_API_URL` environment variable is either:
1. Not set in Cloudflare Pages
2. Set but not available at build time (Vite needs env vars at build, not runtime)
3. Set incorrectly

## Solution

### Step 1: Verify Your Worker URL

First, make sure your Worker is deployed and accessible:

```bash
# Check Worker health
curl https://your-worker-name.your-subdomain.workers.dev/api/health
```

You should get: `{"status":"ok",...}`

**Save this Worker URL** - you'll need it!

### Step 2: Set Environment Variable in Cloudflare Pages

1. Go to Cloudflare Dashboard → Pages → Your Project
2. Click **Settings** → **Environment variables**
3. Click **Add variable**
4. Set:
   - **Variable name**: `VITE_API_URL`
   - **Value**: `https://your-worker-name.your-subdomain.workers.dev` (your actual Worker URL)
   - **Environment**: Production (and Preview if you want)

5. **IMPORTANT**: Make sure to include the full URL with `https://`
   - ✅ Correct: `https://dnd-card-crafter-api.your-subdomain.workers.dev`
   - ❌ Wrong: `dnd-card-crafter-api.your-subdomain.workers.dev` (missing https://)
   - ❌ Wrong: `/api` (relative path won't work)

### Step 3: Trigger a New Build

**Critical**: Environment variables must be available at BUILD time!

1. After setting the environment variable, you MUST trigger a new build:
   - Go to **Deployments** tab
   - Click **Retry deployment** on the latest build
   - Or push a new commit to trigger a fresh build

2. Wait for the build to complete

### Step 4: Verify It's Working

1. Open your Pages URL in browser
2. Open DevTools → Console
3. Try generating an image
4. Check Network tab - you should see requests to:
   - ✅ `https://your-worker.workers.dev/api/...`
   - ❌ NOT `https://your-pages.pages.dev/api/...`

## Quick Checklist

- [ ] Worker is deployed and accessible
- [ ] `VITE_API_URL` is set in Pages environment variables
- [ ] Value is full URL with `https://`
- [ ] New build triggered after setting variable
- [ ] Build completed successfully
- [ ] Frontend now calls Worker URL (check Network tab)

## Common Mistakes

### ❌ Setting Variable After Build
- Environment variables must be set BEFORE building
- If you set it after, trigger a new build

### ❌ Using Relative Path
- Must use full URL: `https://...workers.dev`
- Relative paths won't work in production

### ❌ Wrong Variable Name
- Must be exactly: `VITE_API_URL` (case-sensitive)
- Vite only reads variables starting with `VITE_`

### ❌ Forgetting https://
- Must include protocol: `https://`
- Without it, browser treats it as relative path

## Testing

### Test Worker Directly

```bash
curl https://your-worker.workers.dev/api/health
```

Should return:
```json
{"status":"ok","timestamp":"...","environment":"cloudflare-workers"}
```

### Test from Browser

1. Open your Pages site
2. Open DevTools → Network tab
3. Try an action that calls the API
4. Look for requests - they should go to your Worker URL

### Debug Environment Variable

Add this temporarily to see what's being used:

```typescript
// In src/lib/api-config.ts (temporary debug)
console.log('API URL:', import.meta.env.VITE_API_URL);
```

Check browser console - should show your Worker URL.

## Still Not Working?

1. **Check Worker logs**:
   ```bash
   wrangler tail
   ```
   See if requests are reaching the Worker

2. **Check CORS**:
   - Worker should allow your Pages domain
   - Check browser console for CORS errors

3. **Verify Build**:
   - Check build logs in Cloudflare Pages
   - Verify environment variable is listed in build environment

4. **Check Variable Value**:
   - In Pages → Settings → Environment variables
   - Verify the value is correct (no typos, includes https://)

## Example Configuration

**Worker URL**: `https://dnd-card-crafter-api.raphael.workers.dev`

**Pages Environment Variable**:
- Name: `VITE_API_URL`
- Value: `https://dnd-card-crafter-api.raphael.workers.dev`
- Environment: Production

After setting, trigger new build, then test!

