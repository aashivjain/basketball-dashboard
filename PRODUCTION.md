# Production Deployment Guide

How to deploy to real users safely and at scale.

## Pre-Launch Checklist

- [ ] Database populated with current WNBA data
- [ ] All API endpoints tested: `python scripts/test_api.py`
- [ ] Security audit passed: `python scripts/security_test.py`
- [ ] SSL/TLS certificate obtained (recommended)
- [ ] Environment variables configured (see below)
- [ ] Rate limiting configured for expected traffic
- [ ] Database backup strategy in place
- [ ] Error monitoring set up (Sentry, LogRocket, etc.)

## Configuration Changes

### Environment Variables (.env)

**Development** (what you have now):
```
NODE_ENV=development
PORT=5555
DB_PATH=./basketball.db
FRONTEND_URL=http://localhost:5173
RATE_LIMIT_PER_MINUTE=100
```

**Production** (what you need):
```
NODE_ENV=production
PORT=5555
DB_PATH=/var/data/basketball.db
FRONTEND_URL=https://yourdomain.com
RATE_LIMIT_PER_MINUTE=500
CORS_ORIGIN=https://yourdomain.com
DATABASE_BACKUP_PATH=/var/backups/basketball.db
```

### Key Production Changes

| Setting | Dev | Production | Why |
|---------|-----|-----------|-----|
| `NODE_ENV` | development | production | Disables debug info, enables caching |
| `RATE_LIMIT` | 100/min | 500-1000/min | Real users exceed dev limits |
| `DB_PATH` | ./basketball.db | /var/data/... | Central storage on server |
| `FRONTEND_URL` | localhost:5173 | https://yourdomain.com | CORS security |
| Database | SQLite | PostgreSQL* | SQLite limited to ~4GB, 1 writer at a time |

*Optional: To upgrade from SQLite to PostgreSQL, see "Database Migration" below.

## Deployment Options

### Option 1: Linux Server (Recommended for Small/Medium)

Host on DigitalOcean, Linode, AWS EC2, or similar.

**Setup:**
```bash
# SSH into server
ssh root@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt-get install -y git

# Clone project
git clone https://github.com/yourname/basketball-dashboard.git
cd basketball-dashboard

# Install dependencies
cd backend && npm install && npm run build
cd ..
npm install

# Create .env with production values
nano backend/.env
# (Edit values above)

# Start backend in background with pm2
sudo npm install -g pm2
pm2 start backend/dist/server.js --name "basketball-backend"
pm2 startup
pm2 save

# Start frontend (run in screen/tmux or use separate process)
npm run build
pm2 serve dist 5173
```

### Option 2: Docker (Recommended for Medium/Large)

Easier to scale and deploy consistently.

**Create `Dockerfile`:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# Install frontend dependencies
COPY package*.json ./
RUN npm install

# Copy code
COPY backend/dist ./backend/dist
COPY backend/src/db ./backend/src/db
COPY src ./src
COPY public ./public

# Copy .env
COPY backend/.env ./backend/.env

# Expose ports
EXPOSE 5555 5173

# Start both
CMD ["sh", "-c", "cd backend && node dist/server.js & npm run preview -- --host 0.0.0.0 --port 5173"]
```

**Run:**
```bash
docker build -t basketball-dashboard .
docker run -p 5555:5555 -p 5173:5173 -v /data/basketball.db:/app/backend/basketball.db basketball-dashboard
```

### Option 3: Vercel/Netlify (Frontend) + Heroku (Backend)

Fast but limited for database.

**Backend to Heroku:**
```bash
cd backend
heroku create your-app-name
heroku config:set NODE_ENV=production
heroku config:set FRONTEND_URL=https://your-frontend.vercel.app
git push heroku main
```

**Frontend to Vercel:**
```bash
npm install -g vercel
vercel --prod
```

⚠️ **Issue:** Heroku free tier is discontinued. Use PaaS like Railway, Render, or Fly.io instead.

## HTTPS/SSL (Required for Production)

### Option A: Let's Encrypt (Free)

```bash
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Certificate location: /etc/letsencrypt/live/yourdomain.com/
```

### Option B: Use Nginx Reverse Proxy

Install Nginx and let it handle HTTPS, forward to Node:

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # API backend
    location /api {
        proxy_pass http://localhost:5555;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
    }
}
```

## Database Scaling

### Current Limit (SQLite)
- File-based, single-writer
- Works well up to ~4GB (current: 2.1 MB)
- Max ~100 concurrent users

### When to Upgrade

**Upgrade to PostgreSQL when:**
- Multiple backend instances needed
- > 10GB data projected
- > 1000 concurrent users
- Real-time data updates needed

**Migration:** No API changes needed (same SQL syntax). See [Database Migration](#database-migration) below.

## Authentication

**Current State:** Public API (rate-limited for DDoS protection)

**Add API Key Authentication:**

1. Update `backend/.env`:
```
REQUIRE_API_KEY=true
VALID_API_KEYS=sk_prod_abc123,sk_prod_def456
```

2. Update `backend/src/server.ts`:
```typescript
app.use('/api/v1', (req, res, next) => {
  if (!req.headers['x-api-key']) {
    return res.status(401).json({ error: 'Missing API key' });
  }
  if (!process.env.VALID_API_KEYS?.includes(req.headers['x-api-key'])) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  next();
});
```

3. Clients provide header:
```bash
curl -H "x-api-key: sk_prod_abc123" http://yourdomain.com/api/v1/players
```

## Monitoring & Logging

Add error tracking before launch:

### Sentry (Error Tracking - Free Tier)
```bash
npm install @sentry/node
```

### LogRocket (Session Replay - Free Tier)
```bash
npm install logrocket
```

### Datadog (Premium)
```bash
npm install dd-trace
```

## Database Backup Strategy

### Automated Daily Backup

```bash
# Create backup script
cat > /usr/local/bin/backup-basketball-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp /var/data/basketball.db /var/backups/basketball_${DATE}.db
# Keep only last 30 days
find /var/backups -name "basketball_*.db" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-basketball-db.sh

# Add to crontab
0 2 * * * /usr/local/bin/backup-basketball-db.sh
```

### Upload to Cloud (S3, Google Cloud, etc.)
```bash
# After backup, upload to S3
aws s3 cp /var/backups/basketball_${DATE}.db s3://your-bucket/backups/
```

## Performance Tuning

### Backend Caching

Add Redis for caching common queries:
```bash
npm install redis
```

Then cache player/team lookups that don't change often.

### Frontend Asset Optimization

```bash
npm run build  # Already creates optimized bundle
# Gzip assets
gzip -k dist/**/*.js
```

### Database Indexes

Already created on frequent query columns. To add more:
```sql
CREATE INDEX idx_game_logs_player_season ON game_logs(player_id, season);
CREATE INDEX idx_season_stats_player ON season_stats(player_id);
```

## Database Migration (SQLite → PostgreSQL)

If you outgrow SQLite:

1. **Export from SQLite:**
```bash
python -c "
import sqlite3
import pg8000

sqlite_conn = sqlite3.connect('basketball.db')
cursor = sqlite_conn.cursor()

# Get all table data
cursor.execute('SELECT sql FROM sqlite_master WHERE type=\"table\"')
tables = cursor.fetchall()

for table_def in tables:
    print(table_def[0])  # Print CREATE TABLE statements
"
```

2. **Import to PostgreSQL:**
```bash
createdb basketball_prod
psql basketball_prod < schema.sql
```

3. **No code changes needed** - connection string updates in `.env`:
```
DATABASE_URL=postgresql://user:pass@localhost:5432/basketball_prod
```

## Rollback Plan

If deployment fails:

1. Keep previous version running
2. Test new version on staging first
3. Use blue-green deployment (run both, switch traffic)
4. Keep database backups from before deployment

## Monitoring Checklist

Once deployed, monitor:
- [ ] Backend uptime (http://yourdomain.com/api/health)
- [ ] API response times (goal: < 200ms)
- [ ] Error rate (goal: < 0.1%)
- [ ] Database size (alert if > 3GB)
- [ ] Backup success (verify daily backups exist)
- [ ] Rate limit hits (sign of abuse or underprovisioning)

## Cost Estimates

| Provider | Backend | Database | Total/Month |
|----------|---------|----------|------------|
| DigitalOcean | $5-20 | ~$10 | $15-30 |
| AWS | $5-50 | $15-50 | $20-100 |
| Heroku (deprecated) | N/A | N/A | N/A |
| Vercel (Frontend) | - | - | Free-$20 |

## Next Steps

1. ✅ Data is validated - ready to go
2. Choose deployment option above
3. Set up monitoring
4. Test with load (see `scripts/load_test.py` if available)
5. Launch

See [DATA_INGESTION.md](DATA_INGESTION.md) for keeping data current.
