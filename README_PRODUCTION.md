# Production Setup Summary

## What's Been Added

### 1. Analytics & Tracking System ✅

Your application now tracks key user events:

- **Searches**: Every time a user searches for monsters
- **Monsters Added**: When monsters are added to the preview
- **PDF Downloads**: When users generate/download PDFs
- **Image Regenerations**: When users try to regenerate monster images

**Analytics Data Storage:**
- Stored in `data/analytics.json`
- Keeps last 10,000 events for detailed analysis
- Daily statistics for the last 365 days
- All-time summary statistics

**Access Analytics:**
```bash
# Get summary (last 30 days)
curl http://localhost:3001/api/analytics/summary

# Get summary for last 7 days
curl http://localhost:3001/api/analytics/summary?days=7

# Get recent events
curl http://localhost:3001/api/analytics/events?limit=50
```

### 2. Production Configuration Files ✅

**Environment Variables** (`.env.example`):
- Server configuration
- API keys
- Analytics settings

**PM2 Configuration** (`ecosystem.config.js`):
- Process management for the API server
- Auto-restart on crashes
- Log management

**Nginx Configuration** (`nginx.conf.example`):
- Reverse proxy setup
- Static file serving
- SSL/HTTPS ready
- Security headers
- Gzip compression

### 3. Production Improvements ✅

- **Error Handling**: Comprehensive error middleware
- **Health Check**: `/api/health` endpoint for monitoring
- **CORS Configuration**: Production-ready CORS settings
- **Request Logging**: Production logging middleware
- **Build Optimization**: Production build configuration

### 4. Documentation ✅

- **DEPLOYMENT.md**: Complete step-by-step deployment guide
- **PRODUCTION_CHECKLIST.md**: Pre-deployment checklist
- **README_PRODUCTION.md**: This summary

## Quick Start for Production

1. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

2. **Build the application:**
   ```bash
   npm install
   npm run build
   ```

3. **Start with PM2:**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

4. **Configure Nginx:**
   - Copy `nginx.conf.example` to `/etc/nginx/sites-available/`
   - Update paths and domain
   - Enable and reload

5. **Set up SSL (recommended):**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

## Analytics Tracking Details

### Events Tracked

1. **Search Events**
   - Triggered: When user searches (after 2+ characters)
   - Metadata: Query, result count, query length

2. **Monster Added Events**
   - Triggered: When monster is added to preview
   - Metadata: Monster name, quantity

3. **PDF Download Events**
   - Triggered: When PDF is successfully generated
   - Metadata: Monster count, page count

4. **Image Regeneration Events**
   - Triggered: When user clicks regenerate button
   - Metadata: Monster name

### Analytics Features

- **Non-blocking**: Tracking won't slow down your app
- **Error-tolerant**: Failures are logged but don't break functionality
- **Privacy-friendly**: Only tracks usage metrics, no personal data
- **Configurable**: Can be disabled via `VITE_ANALYTICS_ENABLED=false`

## File Structure

```
dnd-card-crafter/
├── server/
│   ├── api.js              # Main API server (updated with analytics)
│   └── analytics.js         # Analytics service (NEW)
├── src/
│   ├── lib/
│   │   └── analytics.ts     # Frontend analytics utility (NEW)
│   └── components/          # Updated with tracking calls
├── data/                    # Analytics data (created at runtime)
│   └── analytics.json
├── logs/                    # PM2 logs (created at runtime)
├── .env.example             # Environment template (NEW)
├── ecosystem.config.js       # PM2 config (NEW)
├── nginx.conf.example       # Nginx config (NEW)
├── DEPLOYMENT.md            # Deployment guide (NEW)
└── PRODUCTION_CHECKLIST.md  # Checklist (NEW)
```

## Next Steps

1. Review `DEPLOYMENT.md` for detailed deployment instructions
2. Check `PRODUCTION_CHECKLIST.md` before deploying
3. Set up your VPS following the deployment guide
4. Configure environment variables
5. Deploy and monitor analytics!

## Monitoring Your Analytics

After deployment, you can monitor usage by:

1. **Checking the summary API:**
   ```bash
   curl http://your-domain.com/api/analytics/summary
   ```

2. **Viewing the data file:**
   ```bash
   cat data/analytics.json
   ```

3. **Creating a dashboard** (optional):
   - You can build a simple admin dashboard that calls the analytics API
   - Or use tools like Grafana to visualize the data

## Support

For deployment issues, refer to:
- `DEPLOYMENT.md` - Step-by-step guide
- `PRODUCTION_CHECKLIST.md` - Pre-deployment checklist
- PM2 logs: `pm2 logs dnd-card-api`
- Nginx logs: `/var/log/nginx/error.log`

