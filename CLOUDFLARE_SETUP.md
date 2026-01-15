# Cloudflare Workers/Pages Setup Summary

## ✅ What's Been Created

Your application is now ready to deploy to Cloudflare! Here's what was added:

### 1. Cloudflare Workers API (`cloudflare/worker.js`)
- Complete API server compatible with Cloudflare Workers runtime
- Uses **R2** for image storage (instead of file system)
- Uses **KV** for analytics storage (instead of JSON files)
- All endpoints from the original API are included:
  - Image generation
  - Image regeneration
  - Analytics tracking
  - Health checks

### 2. Configuration Files
- **`wrangler.toml`**: Cloudflare Workers configuration
- **`DEPLOYMENT_CLOUDFLARE.md`**: Complete deployment guide

### 3. Frontend Updates
- **`src/lib/api-config.ts`**: API URL configuration utility
- All API calls now use environment variables for flexibility
- Works with both local development and Cloudflare Workers

## 🚀 Quick Start

1. **Install Wrangler CLI:**
   ```bash
   npm install -g wrangler
   wrangler login
   ```

2. **Create R2 Bucket:**
   ```bash
   wrangler r2 bucket create dnd-card-images
   wrangler r2 bucket create dnd-card-images-preview
   ```

3. **Create KV Namespace:**
   ```bash
   wrangler kv:namespace create "ANALYTICS_KV"
   wrangler kv:namespace create "ANALYTICS_KV" --preview
   ```
   Update `wrangler.toml` with the returned IDs.

4. **Set Secrets:**
   ```bash
   wrangler secret put OPENAI_API_KEY
   ```

5. **Deploy Worker:**
   ```bash
   wrangler deploy
   ```

6. **Deploy Frontend to Pages:**
   - Connect GitHub repo in Cloudflare Dashboard → Pages
   - Set build command: `npm run build`
   - Set output directory: `dist`
   - Add environment variable: `VITE_API_URL` = your Worker URL

## 📋 Key Differences from VPS Deployment

| Feature | VPS | Cloudflare |
|---------|-----|------------|
| **API Server** | Node.js/Express | Cloudflare Workers |
| **Image Storage** | File system | R2 Bucket |
| **Analytics** | JSON file | KV Namespace |
| **Frontend** | Nginx | Cloudflare Pages |
| **Scaling** | Manual | Automatic |
| **Cost** | VPS hosting | Free tier available |

## 🔧 Configuration

### Environment Variables

**Worker (set via `wrangler secret put`):**
- `OPENAI_API_KEY`: Your OpenAI API key

**Pages (set in dashboard):**
- `VITE_API_URL`: Your Worker URL (e.g., `https://dnd-card-crafter-api.workers.dev`)
- `VITE_ANALYTICS_ENABLED`: `true` or `false`

### R2 Bucket Setup

1. Go to R2 → Your bucket → Settings
2. Enable "Public Access" (or serve through Worker)
3. Configure CORS if needed

### KV Namespace

Analytics data is automatically stored in KV. No manual setup needed after creating the namespace.

## 📊 Analytics Access

Analytics work the same way as before:

```bash
# Get summary
curl https://your-worker.workers.dev/api/analytics/summary

# Get events
curl https://your-worker.workers.dev/api/analytics/events?limit=50
```

## 🔄 Migration from VPS

If you have existing data:

1. **Images**: Upload to R2 bucket
2. **Analytics**: Import JSON to KV (may need a script)
3. **Image mappings**: Update KV with existing mappings

## 💰 Cost

**Free Tier Includes:**
- 100,000 Worker requests/day
- Unlimited Pages requests
- 10 GB R2 storage
- 1M R2 operations/month
- 100K KV reads/day

For most use cases, the free tier is sufficient!

## 📚 Documentation

- Full deployment guide: `DEPLOYMENT_CLOUDFLARE.md`
- Original VPS guide: `DEPLOYMENT.md` (still available if needed)

## 🐛 Troubleshooting

### Worker Not Deploying
- Check `wrangler.toml` syntax
- Verify KV namespace IDs
- Check R2 bucket names match

### Images Not Loading
- Verify R2 bucket is accessible
- Check CORS settings
- Verify Worker R2 binding

### CORS Errors
- Check CORS headers in Worker code
- Verify R2 bucket CORS settings
- Ensure frontend URL is allowed

## ✨ Benefits of Cloudflare

1. **Global CDN**: Fast worldwide
2. **Auto-scaling**: Handles traffic spikes
3. **Free tier**: Great for starting out
4. **No server management**: Fully serverless
5. **Built-in DDoS protection**: Security included

## Next Steps

1. Follow `DEPLOYMENT_CLOUDFLARE.md` for detailed instructions
2. Deploy Worker first
3. Deploy Frontend to Pages
4. Test all functionality
5. Set up custom domain (optional)

Your app is ready for Cloudflare! 🚀

