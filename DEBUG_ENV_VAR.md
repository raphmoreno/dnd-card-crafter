# Debug: Environment Variable Not Working

## Quick Debug Steps

### 1. Check Browser Console

After deploying, open your site and check the browser console. You should see:
```
[API Config] VITE_API_URL: https://your-worker.workers.dev
```

If you see `(not set)`, the environment variable isn't being picked up.

### 2. Verify Environment Variable in Cloudflare Pages

1. Go to Pages → Your Project → Settings → Environment variables
2. Check:
   - Variable name is exactly: `VITE_API_URL` (case-sensitive)
   - Value is the full URL: `https://your-worker.workers.dev`
   - Environment is set to "Production" (or "All environments")

### 3. Check Build Logs

In Cloudflare Pages → Deployments → Click on the build → View logs

Look for:
- Environment variables being loaded
- The build command running
- Any errors about missing variables

### 4. Verify Build Command

Make sure your build command is:
```
npm ci && npm run build
```

Not just `npm run build` (needs `npm ci` first to ensure clean install).

### 5. Test Locally

To verify the code works, test locally:

```bash
# Set the env var
export VITE_API_URL=https://your-worker.workers.dev

# Build
npm run build

# Check the built files
grep -r "VITE_API_URL" dist/
```

You should see the URL embedded in the built files.

### 6. Common Issues

#### Issue: Variable Set But Not Used

**Symptom**: Console shows `(not set)` even though variable is set in Pages.

**Possible causes**:
1. Variable set AFTER build (needs new build)
2. Wrong environment (set for Preview but not Production)
3. Variable name typo (extra space, wrong case)

**Fix**:
- Double-check variable name: `VITE_API_URL` (exactly)
- Set for "Production" environment
- Trigger new build after setting

#### Issue: Variable Shows But Still Using Relative Paths

**Symptom**: Console shows the URL but requests still go to `/api/...`

**Possible causes**:
1. URL has trailing slash causing issues
2. Code logic issue

**Fix**: The code now handles trailing slashes automatically.

#### Issue: Build Doesn't See Variable

**Symptom**: Build completes but variable isn't in built files.

**Possible causes**:
1. Variable not available at build time
2. Build command doesn't have access to env vars

**Fix**:
- Make sure variable is set BEFORE build runs
- Check build logs to see if env vars are listed
- Try setting in build command: `VITE_API_URL=https://... npm run build`

## Manual Verification

### Check Built Files

After build, the environment variable should be embedded in the JavaScript:

```bash
# In Cloudflare Pages, download the build artifact or check locally
# Look for your Worker URL in the built JS files
```

### Network Tab Check

1. Open your site
2. Open DevTools → Network tab
3. Try an API call
4. Check the request URL:
   - ✅ Should be: `https://your-worker.workers.dev/api/...`
   - ❌ Wrong: `https://your-pages.pages.dev/api/...`
   - ❌ Wrong: `/api/...` (relative)

## Alternative: Hardcode for Testing

If environment variables aren't working, you can temporarily hardcode for testing:

```typescript
// In src/lib/api-config.ts (TEMPORARY - for testing only)
export function getApiBaseUrl(): string {
  // Temporary hardcode for testing
  return 'https://your-worker.workers.dev';
  
  // Original code below...
}
```

**⚠️ Remember to remove this and use env vars in production!**

## Still Not Working?

1. **Check Worker is accessible**:
   ```bash
   curl https://your-worker.workers.dev/api/health
   ```

2. **Check CORS** - Worker should allow your Pages domain

3. **Check build environment** - Verify env vars are listed in build logs

4. **Try setting in build command**:
   ```
   VITE_API_URL=https://your-worker.workers.dev npm ci && npm run build
   ```

5. **Contact Cloudflare support** if variable is set correctly but not being used

