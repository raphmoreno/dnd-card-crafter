# Deploying with Local Build (wrangler pages deploy)

## How It Works

When you use `wrangler pages deploy dist`, you're:
1. Building the app **locally** on your machine
2. Uploading the built `dist/` folder to Cloudflare Pages
3. Cloudflare Pages just serves the static files (no build process)

This means environment variables need to be set **locally** before building!

## Setup

### Step 1: Set Environment Variable Locally

Before building, set the `VITE_API_URL` environment variable:

**On macOS/Linux:**
```bash
export VITE_API_URL=https://dnd-card-crafter-api.raphael-6e5.workers.dev
```

**On Windows (PowerShell):**
```powershell
$env:VITE_API_URL="https://dnd-card-crafter-api.raphael-6e5.workers.dev"
```

**On Windows (CMD):**
```cmd
set VITE_API_URL=https://dnd-card-crafter-api.raphael-6e5.workers.dev
```

### Step 2: Build and Deploy

```bash
# Build (Vite will use the VITE_API_URL from your environment)
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=dnd-card-crafter
```

Or use the combined command:
```bash
npm run deploy
```
(But make sure VITE_API_URL is set first!)

## Better Solution: Create a Deploy Script

### Option 1: Shell Script (macOS/Linux)

Create `deploy.sh`:
```bash
#!/bin/bash
set -e

# Set your Worker URL
export VITE_API_URL=https://dnd-card-crafter-api.raphael-6e5.workers.dev

# Build
npm run build

# Deploy
wrangler pages deploy dist --project-name=dnd-card-crafter

echo "Deployment complete!"
```

Make it executable:
```bash
chmod +x deploy.sh
```

Then deploy with:
```bash
./deploy.sh
```

### Option 2: Update package.json Script

I've added a `deploy` script to `package.json`. But you still need to set the env var:

```bash
# Set the variable
export VITE_API_URL=https://dnd-card-crafter-api.raphael-6e5.workers.dev

# Deploy (builds and deploys)
npm run deploy
```

### Option 3: Use .env.production File

Create `.env.production` in your project root:
```
VITE_API_URL=https://dnd-card-crafter-api.raphael-6e5.workers.dev
```

**Note**: This file will be committed to git. If you want different URLs for different environments, use the export method instead.

Then build normally:
```bash
npm run build
wrangler pages deploy dist --project-name=dnd-card-crafter
```

## Verification

After building, verify the URL is embedded:

```bash
# Check if the Worker URL is in the built files
grep -r "workers.dev" dist/ || echo "URL not found in build"
```

If you see your Worker URL, it's embedded correctly!

## Quick Deploy Command

For a one-liner (macOS/Linux):

```bash
VITE_API_URL=https://dnd-card-crafter-api.raphael-6e5.workers.dev npm run build && wrangler pages deploy dist --project-name=dnd-card-crafter
```

## Troubleshooting

### Variable Not Set

If you see `(not set)` in the browser console:
1. Make sure you set `VITE_API_URL` before running `npm run build`
2. Check with: `echo $VITE_API_URL` (should show your URL)
3. Rebuild after setting the variable

### Different URLs for Different Environments

If you need different Worker URLs:
- **Development**: Use relative paths (no env var needed)
- **Production**: Set `VITE_API_URL` before building

### Forgetting to Set Variable

Create a `.env.production` file so you don't forget:
```
VITE_API_URL=https://dnd-card-crafter-api.raphael-6e5.workers.dev
```

Vite will automatically use this file when building for production.

## Summary

Since you're building locally:
1. ✅ Set `VITE_API_URL` in your local environment
2. ✅ Run `npm run build` (Vite embeds the variable)
3. ✅ Run `wrangler pages deploy dist` (uploads built files)

The key is setting the variable **before** the build, not during deployment!

