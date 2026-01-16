# Debug: Environment Variable Not Being Embedded

## Problem

Even after setting `VITE_API_URL` in the build command, the browser console shows `(not set)` and no VITE_* variables.

## Possible Causes

1. **Cloudflare Pages doesn't preserve env vars through npm ci**
2. **Build command format issue**
3. **Vite not reading the variable**

## Solution 1: Use Build Script (Recommended)

I've created a `build.sh` script. Update your Cloudflare Pages build settings:

1. **Build command**: 
   ```
   VITE_API_URL=https://dnd-card-crafter-api.raphael-6e5.workers.dev bash build.sh
   ```

2. The script ensures the variable is available throughout the build process.

## Solution 2: Set in package.json Script

Update `package.json` to include the variable:

```json
"scripts": {
  "build": "vite build",
  "build:cloudflare": "VITE_API_URL=${VITE_API_URL} vite build"
}
```

Then in Cloudflare Pages:
- **Build command**: `VITE_API_URL=https://your-worker.workers.dev npm ci && npm run build:cloudflare`

## Solution 3: Check Build Logs

In Cloudflare Pages → Deployments → Click build → View logs

Look for:
- The build command being executed
- Any errors about environment variables
- Whether `VITE_API_URL` is mentioned

## Solution 4: Verify Variable is Set

Add this to `vite.config.ts` temporarily:

```typescript
export default defineConfig(({ mode }) => {
  console.log('VITE_API_URL in config:', process.env.VITE_API_URL);
  // ... rest of config
});
```

Check build logs - you should see the URL printed.

## Solution 5: Use .env.production File (Alternative)

If build command doesn't work, you could commit a `.env.production` file:

```
VITE_API_URL=https://dnd-card-crafter-api.raphael-6e5.workers.dev
```

**But this is not ideal** because:
- You'd need to update it for different environments
- It's committed to git (less flexible)

## Debugging Steps

1. **Check build logs** - Does it show the variable being set?
2. **Check built files** - After build, check `dist/assets/*.js` files
   - Search for "VITE_API_URL" or your Worker URL
   - If it's there, Vite embedded it
   - If not, Vite didn't see it

3. **Test locally**:
   ```bash
   VITE_API_URL=https://dnd-card-crafter-api.raphael-6e5.workers.dev npm run build
   grep -r "workers.dev" dist/
   ```
   If you see the URL in dist/, the build works locally.

4. **Check Cloudflare Pages environment**:
   - Go to Settings → Environment variables
   - Make sure it's set for "Production" environment
   - Try setting it there AND in build command

## Most Likely Issue

Cloudflare Pages might be running commands in a way that doesn't preserve environment variables through `npm ci`. 

**Try this build command**:
```
VITE_API_URL=https://dnd-card-crafter-api.raphael-6e5.workers.dev npm ci && VITE_API_URL=https://dnd-card-crafter-api.raphael-6e5.workers.dev npm run build
```

This sets it twice - once before `npm ci` and once before `npm run build`.

## Alternative: Runtime Configuration

If build-time configuration doesn't work, we could use runtime configuration:

1. Create a `config.js` file that's loaded at runtime
2. Set the API URL there
3. But this requires code changes

Let's try the build script approach first!

