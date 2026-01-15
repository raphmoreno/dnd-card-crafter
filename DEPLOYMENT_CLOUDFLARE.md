# Cloudflare Workers/Pages Deployment Guide

This guide will help you deploy the D&D Card Crafter application to Cloudflare Workers (API) and Cloudflare Pages (Frontend).

## Architecture

- **Frontend**: Cloudflare Pages (static React app)
- **API**: Cloudflare Workers (serverless functions)
- **Images**: Cloudflare R2 (object storage)
- **Analytics**: Cloudflare KV (key-value store)

## Prerequisites

1. Cloudflare account (free tier works)
2. Node.js 18+ installed locally
3. Wrangler CLI installed: `npm install -g wrangler`
4. OpenAI API key

## Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

## Step 2: Login to Cloudflare

```bash
wrangler login
```

This will open a browser window to authenticate with Cloudflare.

## Step 3: Create R2 Bucket for Images

```bash
# Create production bucket
wrangler r2 bucket create dnd-card-images

# Create preview bucket (for testing)
wrangler r2 bucket create dnd-card-images-preview
```

## Step 4: Create KV Namespace for Analytics

```bash
# Create production KV namespace
wrangler kv:namespace create "ANALYTICS_KV"

# Create preview KV namespace
wrangler kv:namespace create "ANALYTICS_KV" --preview
```

**Important**: Copy the `id` and `preview_id` from the output and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "ANALYTICS_KV"
id = "your-actual-kv-namespace-id"
preview_id = "your-actual-preview-kv-namespace-id"
```

## Step 5: Configure Environment Variables

Set your OpenAI API key as a secret:

```bash
wrangler secret put OPENAI_API_KEY
# Enter your OpenAI API key when prompted
```

## Step 6: Update wrangler.toml

Edit `wrangler.toml` and replace the placeholder KV namespace IDs with the actual IDs from Step 4.

## Step 7: Deploy the Worker

```bash
# Deploy to production
wrangler deploy

# Or deploy to a specific environment
wrangler deploy --env production
```

After deployment, you'll get a URL like: `https://dnd-card-crafter-api.your-subdomain.workers.dev`

## Step 8: Deploy Frontend to Cloudflare Pages

### Option A: Connect GitHub Repository

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
2. Click "Create a project" → "Connect to Git"
3. Select your repository
4. Configure build settings:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (or leave empty)

5. Add environment variables:
   - `VITE_API_URL`: Your Worker URL (e.g., `https://dnd-card-crafter-api.your-subdomain.workers.dev`)
   - `VITE_ANALYTICS_ENABLED`: `true`

6. Deploy!

### Option B: Deploy via Wrangler

```bash
# Build the frontend
npm run build

# Deploy to Pages
wrangler pages deploy dist --project-name=dnd-card-crafter
```

## Step 9: Update Frontend API URL

Update your frontend code to use the Worker URL. You can do this via environment variables:

1. In Cloudflare Pages dashboard, go to your project → Settings → Environment variables
2. Add `VITE_API_URL` with your Worker URL
3. Rebuild the project

Or update `vite.config.ts` to use the environment variable:

```typescript
export default defineConfig({
  // ... existing config
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || ''),
  },
});
```

## Step 10: Configure Custom Domain (Optional)

### For Workers (API):

1. Go to Workers & Pages → Your Worker → Settings → Triggers
2. Add a custom domain or route

### For Pages (Frontend):

1. Go to Pages → Your Project → Custom domains
2. Add your domain
3. Follow DNS setup instructions

## Step 11: Set Up R2 Public Access (for Images)

By default, R2 buckets are private. To serve images publicly:

1. Go to R2 → Your bucket → Settings
2. Enable "Public Access"
3. Configure CORS if needed:
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

Alternatively, serve images through the Worker (already configured in `worker.js`).

## Step 12: Verify Deployment

1. **Test API health:**
   ```bash
   curl https://your-worker-url.workers.dev/api/health
   ```

2. **Test analytics:**
   ```bash
   curl https://your-worker-url.workers.dev/api/analytics/summary
   ```

3. **Test image generation:**
   ```bash
   curl -X POST https://your-worker-url.workers.dev/api/generate-monster-image \
     -H "Content-Type: application/json" \
     -d '{"monsterName":"goblin"}'
   ```

4. **Visit your Pages URL** and test the frontend

## Environment Variables Reference

### Worker Secrets (set via `wrangler secret put`):
- `OPENAI_API_KEY`: Your OpenAI API key

### Pages Environment Variables:
- `VITE_API_URL`: Your Worker API URL
- `VITE_ANALYTICS_ENABLED`: `true` or `false`

## Monitoring and Logs

### View Worker Logs:

```bash
# Real-time logs
wrangler tail

# Or view in dashboard
# Workers & Pages → Your Worker → Logs
```

### View Analytics:

Access via API:
```bash
curl https://your-worker-url.workers.dev/api/analytics/summary?days=30
```

Or view in KV (via dashboard):
- Workers & Pages → KV → Your namespace → Browse

## Updating the Deployment

### Update Worker:

```bash
# Make changes to cloudflare/worker.js
wrangler deploy
```

### Update Frontend:

If connected to Git, changes are automatically deployed. Or manually:

```bash
npm run build
wrangler pages deploy dist --project-name=dnd-card-crafter
```

## Cost Considerations

### Free Tier Limits:
- **Workers**: 100,000 requests/day
- **Pages**: Unlimited requests
- **R2**: 10 GB storage, 1M Class A operations/month
- **KV**: 100,000 reads/day, 1,000 writes/day

### Paid Plans:
- Workers: $5/month for 10M requests
- R2: $0.015/GB storage, $4.50/million Class A operations
- KV: $0.50/million reads, $5/million writes

For most use cases, the free tier should be sufficient.

## Troubleshooting

### Worker Not Deploying:

1. Check `wrangler.toml` syntax
2. Verify KV namespace IDs are correct
3. Check R2 bucket names match
4. View deployment logs: `wrangler deploy --verbose`

### Images Not Loading:

1. Verify R2 bucket is accessible
2. Check CORS settings on R2 bucket
3. Verify Worker has R2 binding configured
4. Check Worker logs: `wrangler tail`

### Analytics Not Working:

1. Verify KV namespace is created and bound
2. Check KV namespace IDs in `wrangler.toml`
3. View KV data in dashboard
4. Check Worker logs for errors

### CORS Errors:

1. Verify CORS headers in Worker code
2. Check R2 bucket CORS settings
3. Ensure frontend URL is allowed in CORS

## Security Best Practices

1. **Never commit secrets**: Use `wrangler secret put` for sensitive data
2. **Use environment variables**: Store non-sensitive config in `wrangler.toml`
3. **Enable rate limiting**: Consider adding rate limiting to prevent abuse
4. **Monitor usage**: Keep an eye on Cloudflare dashboard for unusual activity
5. **Use preview environments**: Test changes in preview before production

## Migration from VPS

If you're migrating from a VPS deployment:

1. **Export existing data:**
   - Export `data/analytics.json` from VPS
   - Export `src/lib/monster-images.json` from VPS
   - Download images from `public/images/monsters/`

2. **Import to Cloudflare:**
   - Upload images to R2 bucket
   - Import analytics to KV (you may need a script)
   - Update image mappings in KV

3. **Update DNS**: Point your domain to Cloudflare Pages

## Support

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)

