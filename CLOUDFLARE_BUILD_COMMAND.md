# Cloudflare Pages Build Command

## Correct Build Command

In Cloudflare Pages → Settings → Builds & deployments → Build command, use:

```
VITE_API_URL=https://dnd-card-crafter-api.raphael-6e5.workers.dev npm ci && npm run build
```

**Replace** `https://dnd-card-crafter-api.raphael-6e5.workers.dev` with your actual Worker URL.

## How It Works

1. `VITE_API_URL=...` sets the environment variable for the build process
2. `npm ci` installs dependencies
3. `npm run build` runs Vite build
4. Vite automatically reads `VITE_API_URL` from `process.env` and embeds it in the built files
5. The frontend code can then access it via `import.meta.env.VITE_API_URL`

## Important Notes

- ✅ Vite automatically handles `VITE_*` environment variables
- ✅ No need to manually define them in `vite.config.ts`
- ✅ The variable must be set BEFORE `npm run build` runs
- ✅ Setting it in the build command ensures it's available at build time

## Testing Locally

To test the build locally with the environment variable:

```bash
VITE_API_URL=https://dnd-card-crafter-api.raphael-6e5.workers.dev npm run build
```

Then check the built files in `dist/` - the Worker URL should be embedded in the JavaScript.

## Verification

After building and deploying:

1. Open your site in browser
2. Open DevTools → Console
3. You should see: `[API Config] VITE_API_URL: https://dnd-card-crafter-api.raphael-6e5.workers.dev`
4. Check Network tab - API calls should go to your Worker URL

