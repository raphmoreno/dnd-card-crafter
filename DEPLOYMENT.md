# Deployment Guide for D&D Card Crafter

This guide will help you deploy the D&D Card Crafter application to a VPS.

## Prerequisites

- VPS with Ubuntu 20.04+ (or similar Linux distribution)
- Node.js 18+ installed
- Nginx installed
- Domain name (optional, but recommended)
- OpenAI API key

## Step 1: Server Setup

### Install Node.js

```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### Install Nginx

```bash
sudo apt-get update
sudo apt-get install -y nginx
```

## Step 2: Clone and Build Application

```bash
# Clone your repository
cd /var/www
sudo git clone <your-repo-url> dnd-card-crafter
cd dnd-card-crafter

# Install dependencies
npm install

# Build the frontend
npm run build

# The dist/ folder will contain the production build
```

## Step 3: Environment Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit environment variables
nano .env
```

Required environment variables:
- `NODE_ENV=production`
- `API_PORT=3001`
- `OPENAI_API_KEY=your_key_here`
- `FRONTEND_URL=https://your-domain.com` (or http://your-ip-address:8080)

## Step 4: Configure PM2

```bash
# Start the API server with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command
```

### PM2 Useful Commands

```bash
# View logs
pm2 logs dnd-card-api

# Restart application
pm2 restart dnd-card-api

# Stop application
pm2 stop dnd-card-api

# View status
pm2 status

# Monitor
pm2 monit
```

## Step 5: Configure Nginx

1. Copy the example nginx configuration:
```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/dnd-card-crafter
```

2. Edit the configuration:
```bash
sudo nano /etc/nginx/sites-available/dnd-card-crafter
```

Update the following:
- `server_name`: Your domain name or IP
- `root`: Path to your `dist/` folder (e.g., `/var/www/dnd-card-crafter/dist`)
- `location /images`: Path to your `public/images` folder

3. Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/dnd-card-crafter /etc/nginx/sites-enabled/
```

4. Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Step 6: Setup SSL (Optional but Recommended)

Using Let's Encrypt with Certbot:

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Certbot will automatically configure Nginx for HTTPS
```

## Step 7: Firewall Configuration

```bash
# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Or if using specific ports:
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

## Step 8: Create Required Directories

```bash
# Create logs directory
mkdir -p logs

# Create data directory for analytics
mkdir -p data

# Ensure proper permissions
chmod 755 logs data
```

## Step 9: Verify Deployment

1. Check API health:
```bash
curl http://localhost:3001/api/health
```

2. Check frontend:
Visit `http://your-domain.com` or `http://your-ip-address`

3. Check analytics:
```bash
curl http://localhost:3001/api/analytics/summary
```

## Step 10: Monitoring and Maintenance

### View Analytics

Access analytics data via API:
```bash
# Get summary (last 30 days)
curl http://localhost:3001/api/analytics/summary

# Get summary for last 7 days
curl http://localhost:3001/api/analytics/summary?days=7

# Get recent events
curl http://localhost:3001/api/analytics/events?limit=50
```

### Logs Location

- PM2 logs: `pm2 logs`
- Nginx access logs: `/var/log/nginx/access.log`
- Nginx error logs: `/var/log/nginx/error.log`
- Application logs: `./logs/api-error.log` and `./logs/api-out.log`

### Backup Important Data

```bash
# Backup analytics data
cp data/analytics.json data/analytics.json.backup

# Backup monster images mapping
cp src/lib/monster-images.json src/lib/monster-images.json.backup

# Backup generated images
tar -czf images-backup.tar.gz public/images/monsters/
```

## Troubleshooting

### API Server Not Starting

1. Check PM2 logs: `pm2 logs dnd-card-api`
2. Verify environment variables: `cat .env`
3. Check if port is in use: `sudo lsof -i :3001`

### Frontend Not Loading

1. Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
2. Verify dist folder exists: `ls -la dist/`
3. Check Nginx configuration: `sudo nginx -t`

### Images Not Generating

1. Verify OpenAI API key is set: `grep OPENAI_API_KEY .env`
2. Check API logs: `pm2 logs dnd-card-api`
3. Test API endpoint: `curl -X POST http://localhost:3001/api/generate-monster-image -H "Content-Type: application/json" -d '{"monsterName":"goblin"}'`

## Updating the Application

```bash
# Pull latest changes
git pull

# Install new dependencies
npm install

# Rebuild frontend
npm run build

# Restart PM2
pm2 restart dnd-card-api

# Reload Nginx (if config changed)
sudo nginx -t && sudo systemctl reload nginx
```

## Security Considerations

1. **Keep dependencies updated**: `npm audit` and `npm audit fix`
2. **Use HTTPS**: Always use SSL in production
3. **Protect API endpoints**: Consider adding rate limiting
4. **Secure environment variables**: Never commit `.env` file
5. **Regular backups**: Backup analytics and image data regularly
6. **Monitor logs**: Regularly check logs for errors or suspicious activity

## Performance Optimization

1. **Enable Nginx caching**: Already configured in nginx.conf.example
2. **Use CDN**: Consider using a CDN for static assets
3. **Image optimization**: Consider compressing generated images
4. **Database**: For high traffic, consider moving analytics to a proper database

## Support

For issues or questions, check:
- Application logs: `pm2 logs`
- Nginx logs: `/var/log/nginx/`
- Analytics data: `data/analytics.json`

