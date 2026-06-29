# Production Readiness Checklist

Close all terminals and use this checklist when you're ready to launch with real users.

## Step 1: Validate Everything

- [ ] Data is current
  ```powershell
  python scripts/verify_migration.py
  # Expected: "PASSED - Data is current and complete"
  ```

- [ ] All API endpoints work
  ```powershell
  python scripts/test_api.py
  # Expected: "9/9 tests passing"
  ```

- [ ] Security checks pass
  ```powershell
  python scripts/security_test.py
  # Expected: "7/7 checks passing, 82/100 score"
  ```

## Step 2: Choose Deployment

Pick one approach from [PRODUCTION.md](PRODUCTION.md):

- **Option 1: Linux Server** - Full control, cheapest, best for dedicated app
- **Option 2: Docker** - Easy scaling, consistent across environments
- **Option 3: Cloud Platforms** - Fastest setup, built-in monitoring (Vercel/Netlify/Railway)

## Step 3: Update Configuration

**Create production `.env`:**
```
NODE_ENV=production
PORT=5555
DB_PATH=/var/data/basketball.db          # (or wherever you store it)
FRONTEND_URL=https://yourdomain.com       # (your actual domain)
RATE_LIMIT_PER_MINUTE=500                 # (for real users)
CORS_ORIGIN=https://yourdomain.com        # (matches FRONTEND_URL)
```

## Step 4: Set Up HTTPS

- [ ] Get SSL certificate (Let's Encrypt is free)
- [ ] Configure reverse proxy (Nginx) or use platform's built-in HTTPS

See "HTTPS/SSL" section in [PRODUCTION.md](PRODUCTION.md).

## Step 5: Database Backup

- [ ] Set up daily automated backups
- [ ] Test restore process (critical!)
- [ ] Store backups in 2 locations (local + cloud)

See "Database Backup Strategy" in [PRODUCTION.md](PRODUCTION.md).

## Step 6: Monitoring

- [ ] Set up error tracking (Sentry, etc.)
- [ ] Monitor API health check endpoint
- [ ] Set alerts for:
  - Backend downtime
  - API errors > 1%
  - Database size > 3GB

## Step 7: Refresh Strategy

Decide how to keep data current:

- [ ] Manual: Run scripts when you remember
- [ ] Automated: GitHub Actions (recommended) or cron job
- [ ] See [DATA_INGESTION.md](DATA_INGESTION.md)

## Step 8: Test End-to-End

- [ ] Visit frontend, data loads correctly
- [ ] Click through all pages
- [ ] API responds under load (>100 concurrent users)
- [ ] Try with slow internet connection
- [ ] Test on mobile

## Step 9: Security Final Check

- [ ] Disable debug mode (`NODE_ENV=production`)
- [ ] Rate limiting enabled and tested
- [ ] CORS only allows your domain
- [ ] Database path not exposed in errors
- [ ] No API keys/passwords in code

## Step 10: User Testing

- [ ] Have 5-10 real users test it
- [ ] Monitor for errors
- [ ] Collect feedback
- [ ] Fix critical issues before full launch

## Launch Checklist

When you're ready to go public:

- [ ] All above steps completed
- [ ] Team/stakeholders informed
- [ ] Have rollback plan (can revert quickly)
- [ ] Support/documentation ready
- [ ] Monitor heavily first week

## Day 1 After Launch

Monitor closely:
- Check error logs every hour
- Verify backups ran
- Confirm rate limiting is working
- Watch database size
- Monitor API response times

## Week 1 After Launch

- [ ] No critical errors
- [ ] Load < 50% capacity
- [ ] Data refreshing automatically
- [ ] Backups healthy
- [ ] User feedback positive

## Month 1 After Launch

- [ ] Scale if needed (add caching, upgrade database)
- [ ] Optimize slow queries
- [ ] Add more features based on user feedback
- [ ] Plan for expected growth

## Emergency Contacts

Before launch, have ready:
- [ ] Your database provider support
- [ ] Your hosting provider support
- [ ] Backup of your setup documentation
- [ ] Rollback process documented and tested

## Questions?

If deployment is complex:
1. See [PRODUCTION.md](PRODUCTION.md) for detailed options
2. Choose simpler option first
3. Test locally before deploying

Good luck!
