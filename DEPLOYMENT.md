# Cloudflare Deployment Guide

This guide will help you deploy the D&D Card Crafter application to Cloudflare Workers (API) and Cloudflare Pages (Frontend).

## Architecture

- **Frontend**: Cloudflare Pages (static React app)
- **API**: Cloudflare Workers (serverless functions)
- **Images**: Cloudflare R2 (object storage)
- **Analytics**: Cloudflare KV (key-value store)
- **Monster Data**: Cloudflare D1 (SQL database)

**Important**: The API (Worker) and Frontend (Pages) are deployed **separately** and communicate via HTTP. The frontend makes HTTP requests to the Worker URL.

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

## Step 5: Create D1 Database for Monsters

```bash
# Create production database
wrangler d1 create monsters-db

# Create preview database (for testing)
wrangler d1 create monsters-db --preview
```

**Important**: Copy the `database_id` and `preview_database_id` from the output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "MONSTERS_DB"
database_name = "monsters-db"
database_id = "your-actual-database-id-here"
preview_database_id = "your-actual-preview-database-id-here"
```

## Step 6: Create Database Schema

Run the schema migration to create the tables:

```bash
# For production (remote)
npm run db:setup

# For local development
npm run db:setup:local
```

Or manually:
```bash
wrangler d1 execute monsters-db --remote --file=./cloudflare/schema.sql
```

## Step 7: Populate D1 Database

**Note**: You'll need to create a script to populate the database from Open5e. The database stores all monster data to avoid fetching from Open5e for every user.

The script should:
1. Fetch all monsters from the Open5e API (with pagination)
2. Insert them into the D1 database
3. Update the full-text search index

See `cloudflare/schema.sql` for the database structure.

## Step 8: Configure Environment Variables

Set your OpenAI API key as a secret:

```bash
wrangler secret put OPENAI_API_KEY
# Enter your OpenAI API key when prompted
```

**Verify it's set**:
```bash
wrangler secret list
```

You should see `OPENAI_API_KEY` in the list. If not, the Worker will fail with 500 errors.

## Step 9: Deploy the Worker

```bash
# Deploy to production
wrangler deploy

# Or deploy to a specific environment
wrangler deploy --env production
```

After deployment, you'll get a URL like: `https://dnd-card-crafter-api.your-subdomain.workers.dev`

**⚠️ IMPORTANT**: Save this Worker URL - you'll need it for the frontend configuration!

## Step 10: Deploy Frontend to Cloudflare Pages

**Note**: The API (Worker) and Frontend (Pages) are separate deployments. The frontend will make HTTP requests to your Worker URL.

### Option A: Connect GitHub Repository

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
2. Click "Create a project" → "Connect to Git"
3. Select your repository
4. Configure build settings:
   - **Framework preset**: Vite
   - **Build command**: `VITE_API_URL=https://your-worker.workers.dev npm ci && npm run build` (replace with your Worker URL)
   - **Build output directory**: `dist`
   - **Root directory**: `/` (or leave empty)
   - **Node version**: `22` (or latest LTS)
   - **Deploy command**: Leave empty (or `echo "Deployment complete"` if required)

5. **Add environment variables** in Pages → Settings → Environment variables:
   - `VITE_API_URL`: Your Worker URL (full URL with `https://`)
   - `VITE_ANALYTICS_ENABLED`: `true`

6. Deploy!

### Option B: Deploy via Wrangler (Local Build)

**Important**: When building locally, you must set `VITE_API_URL` before building!

```bash
# Set the environment variable (replace with your Worker URL)
export VITE_API_URL=https://your-worker.workers.dev

# Build the frontend (Vite will embed VITE_API_URL)
npm run build

# Deploy to Pages
wrangler pages deploy dist --project-name=dnd-card-crafter
```

**Or create `.env.production`** with: `VITE_API_URL=https://your-worker.workers.dev`

## Step 11: Configure Custom Domain (Optional)

### For Workers (API):

1. Go to Workers & Pages → Your Worker → Settings → Triggers
2. Add a custom domain or route

### For Pages (Frontend):

1. Go to Pages → Your Project → Custom domains
2. Add your domain
3. Follow DNS setup instructions

## Step 12: Set Up R2 Public Access (for Images)

By default, R2 buckets are private. Images are served through the Worker (already configured in `worker.js`), so you don't need to enable public access. However, if you want direct R2 access:

1. Go to R2 → Your bucket → Settings
2. Enable "Public Access"
3. Configure CORS if needed

## Step 13: Verify Deployment

1. **Test API health:**
   ```bash
   curl https://your-worker-url.workers.dev/api/health
   ```

2. **Test analytics:**
   ```bash
   curl https://your-worker-url.workers.dev/api/analytics/summary
   ```

3. **Test monster search:**
   ```bash
   curl https://your-worker-url.workers.dev/api/monsters?search=goblin
   ```

4. **Test image generation:**
   ```bash
   curl -X POST https://your-worker-url.workers.dev/api/generate-monster-image \
     -H "Content-Type: application/json" \
     -d '{"monsterName":"goblin"}'
   ```

5. **Visit your Pages URL** and test the frontend

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
- **D1**: 5 GB storage, 5M reads/month, 100K writes/month

### Paid Plans:
- Workers: $5/month for 10M requests
- R2: $0.015/GB storage, $4.50/million Class A operations
- KV: $0.50/million reads, $5/million writes
- D1: $0.001/GB storage, $0.001/million reads, $1.00/million writes

For most use cases, the free tier should be sufficient.

## Troubleshooting

### Build Issues

**Bun lockfile error**: Remove `bun.lockb` from git: `git rm --cached bun.lockb`

**Build stuck on deploy**: Set "Deploy command" to `echo "Deployment complete"` (or leave empty)

### Environment Variable Not Working

**If building locally**:
```bash
export VITE_API_URL=https://your-worker.workers.dev
npm run build
wrangler pages deploy dist --project-name=dnd-card-crafter
```

**Or create `.env.production`**:
```
VITE_API_URL=https://your-worker.workers.dev
```

**If building in Cloudflare Pages**: Set `VITE_API_URL` in Pages → Settings → Environment variables, then trigger a new build.

### Worker 500 Errors

**Check API key is set**:
```bash
wrangler secret list
# If missing: wrangler secret put OPENAI_API_KEY
```

**Check logs**:
```bash
wrangler tail
```

**Common errors**:
- Error 1015: Cloudflare rate limit - wait and retry
- 401: API key invalid or missing
- 429: OpenAI rate limit - wait and retry

### Database Issues

**Database not found**: Verify the database IDs in `wrangler.toml` are correct

**Search not working**: The worker falls back to LIKE queries if FTS fails

**Performance issues**: D1 queries are fast, but large result sets (>1000) may be slow

### Other Issues

**Images not loading**: Check R2 bucket exists and Worker has binding configured

**Analytics not working**: Verify KV namespace IDs in `wrangler.toml` are correct

**CORS errors**: Worker CORS headers are configured - check Worker logs for specific errors

## Security Best Practices

1. **Never commit secrets**: Use `wrangler secret put` for sensitive data
2. **Use environment variables**: Store non-sensitive config in `wrangler.toml`
3. **Enable rate limiting**: Consider adding rate limiting to prevent abuse
4. **Monitor usage**: Keep an eye on Cloudflare dashboard for unusual activity
5. **Use preview environments**: Test changes in preview before production

## Support

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
