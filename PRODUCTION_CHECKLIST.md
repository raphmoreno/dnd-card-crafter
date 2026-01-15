# Production Readiness Checklist

## ✅ Completed Features

### Analytics & Tracking
- [x] Analytics service backend (`server/analytics.js`)
- [x] Analytics API endpoints (`/api/analytics/track`, `/api/analytics/summary`, `/api/analytics/events`)
- [x] Frontend analytics utility (`src/lib/analytics.ts`)
- [x] Search tracking (tracks when users search for monsters)
- [x] Monster added tracking (tracks when monsters are added to preview)
- [x] PDF download tracking (tracks PDF generation/downloads)
- [x] Image regeneration tracking (tracks when users regenerate images)

### Production Configuration
- [x] Environment variable configuration (`.env.example`)
- [x] PM2 ecosystem configuration (`ecosystem.config.js`)
- [x] Nginx configuration example (`nginx.conf.example`)
- [x] Production build configuration
- [x] Error handling middleware
- [x] Health check endpoint (`/api/health`)
- [x] CORS configuration for production
- [x] Request logging middleware

### Documentation
- [x] Deployment guide (`DEPLOYMENT.md`)
- [x] Production checklist (this file)

## 📋 Pre-Deployment Checklist

### Environment Setup
- [ ] Copy `.env.example` to `.env` and configure all variables
- [ ] Set `NODE_ENV=production`
- [ ] Set `OPENAI_API_KEY` with your actual API key
- [ ] Set `FRONTEND_URL` to your production domain
- [ ] Verify `API_PORT` matches your configuration

### Dependencies
- [ ] Run `npm install` to ensure all dependencies are installed
- [ ] Run `npm audit` to check for security vulnerabilities
- [ ] Fix any critical security issues with `npm audit fix`

### Build
- [ ] Run `npm run build` to create production build
- [ ] Verify `dist/` folder contains all necessary files
- [ ] Test the build locally with `npm run preview`

### Server Setup
- [ ] Install Node.js 18+ on VPS
- [ ] Install PM2 globally: `npm install -g pm2`
- [ ] Install Nginx
- [ ] Create required directories: `logs/` and `data/`
- [ ] Set proper file permissions

### Security
- [ ] Ensure `.env` is in `.gitignore` (already done)
- [ ] Ensure `data/analytics.json` is in `.gitignore` (already done)
- [ ] Set up firewall rules (allow ports 80, 443, and your API port)
- [ ] Configure SSL/HTTPS (recommended)
- [ ] Review and update CORS settings if needed

### Testing
- [ ] Test API health endpoint: `curl http://localhost:3001/api/health`
- [ ] Test analytics tracking: `curl -X POST http://localhost:3001/api/analytics/track -H "Content-Type: application/json" -d '{"eventType":"search","metadata":{"query":"test"}}'`
- [ ] Test analytics summary: `curl http://localhost:3001/api/analytics/summary`
- [ ] Test image generation endpoint (if OpenAI key is set)
- [ ] Test frontend loads correctly
- [ ] Test PDF generation
- [ ] Test image regeneration

### Monitoring
- [ ] Set up PM2 to start on boot: `pm2 startup`
- [ ] Save PM2 configuration: `pm2 save`
- [ ] Configure log rotation (optional but recommended)
- [ ] Set up monitoring/alerting (optional)

### Backup
- [ ] Set up backup strategy for:
  - `data/analytics.json` (analytics data)
  - `src/lib/monster-images.json` (image mappings)
  - `public/images/monsters/` (generated images)
- [ ] Test backup restoration process

## 🚀 Deployment Steps

1. **Clone repository on VPS**
   ```bash
   cd /var/www
   git clone <your-repo> dnd-card-crafter
   cd dnd-card-crafter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   nano .env  # Edit with your values
   ```

4. **Build frontend**
   ```bash
   npm run build
   ```

5. **Start API server with PM2**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup  # Follow instructions
   ```

6. **Configure Nginx**
   ```bash
   sudo cp nginx.conf.example /etc/nginx/sites-available/dnd-card-crafter
   sudo nano /etc/nginx/sites-available/dnd-card-crafter  # Edit paths
   sudo ln -s /etc/nginx/sites-available/dnd-card-crafter /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

7. **Set up SSL (recommended)**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

8. **Verify deployment**
   - Visit your domain
   - Check API health endpoint
   - Test analytics tracking

## 📊 Analytics Access

After deployment, you can access analytics via:

1. **API Endpoints:**
   - Summary: `GET /api/analytics/summary?days=30`
   - Events: `GET /api/analytics/events?limit=100&eventType=search`

2. **Data File:**
   - Location: `data/analytics.json`
   - Format: JSON with events, summary, and daily stats

3. **Example Query:**
   ```bash
   curl http://localhost:3001/api/analytics/summary?days=7
   ```

## 🔧 Maintenance

### Regular Tasks
- [ ] Monitor PM2 logs: `pm2 logs`
- [ ] Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- [ ] Review analytics data periodically
- [ ] Update dependencies: `npm update`
- [ ] Backup data regularly

### Updates
- [ ] Pull latest code: `git pull`
- [ ] Install new dependencies: `npm install`
- [ ] Rebuild: `npm run build`
- [ ] Restart: `pm2 restart dnd-card-api`

## 🐛 Troubleshooting

### Common Issues

1. **API not starting:**
   - Check PM2 logs: `pm2 logs dnd-card-api`
   - Verify `.env` file exists and has correct values
   - Check port availability: `sudo lsof -i :3001`

2. **Frontend not loading:**
   - Check Nginx error logs
   - Verify `dist/` folder exists and has files
   - Check Nginx configuration: `sudo nginx -t`

3. **Analytics not tracking:**
   - Check API logs for errors
   - Verify `data/` directory exists and is writable
   - Check CORS settings if accessing from different domain

4. **Images not generating:**
   - Verify OpenAI API key is set correctly
   - Check API logs for OpenAI errors
   - Verify API key has sufficient credits

## 📝 Notes

- Analytics data is stored in `data/analytics.json` (keeps last 10,000 events)
- Daily stats are kept for the last 365 days
- All tracking is done asynchronously and won't block user actions
- Analytics can be disabled by setting `VITE_ANALYTICS_ENABLED=false` in `.env`

