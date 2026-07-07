---
name: Basketball Dashboard Agent
description: Context and instructions for developers, AI agents, and future maintainers
---

# Basketball Dashboard - Developer Context

For developers, AI agents, and maintainers. New users should start with [README.md](README.md).

## Project Overview

Full-stack WNBA analytics dashboard with React frontend, Express backend, and SQLite database. Production-ready with security hardening (82/100 score). Contains 12,691 WNBA records.

## Architecture

### Two-Port System

| Port | Service | Purpose | Technology |
|------|---------|---------|-------------|
| **5555** | Backend API | Data provider for frontend | Express.js + SQLite3 |
| **5173** | Frontend UI | User interface | React + Vite |

Why separate? Backend can run independently (mobile apps, other frontends), frontend hot-reload works without restarting backend, API scales separately, and frontend can't access the database directly.

### Folder Structure

```
basketball-dashboard/
├── backend/                  ← Express API server (port 5555)
│   ├── src/
│   │   ├── server.ts        ← Main app setup, middleware, security
│   │   ├── routes/          ← API endpoints (/api/v1/*)
│   │   ├── db/              ← Database connection & schema
│   │   └── middleware/      ← Error handling, rate limiting
│   ├── package.json         ← Dependencies (express, sqlite3, helmet, rate-limit)
│   ├── .env                 ← Config: PORT=5555, DB_PATH, FRONTEND_URL
│   ├── basketball.db        ← SQLite database (created at init)
│   └── tsconfig.json        ← TypeScript settings
│
├── src/                     ← React frontend (port 5173)
│   ├── components/          ← UI components
│   ├── hooks/               ← Custom React hooks
│   └── App.tsx              ← Main app component
│
├── scripts/                 ← Python data utilities
│   ├── test_api.py          ← API endpoint testing
│   ├── verify_migration.py  ← Data integrity verification
│   ├── security_test.py     ← Security audit tests
│   ├── migrate_wnba_to_db.py ← JSON→SQLite migration
│   └── validate_data.py     ← Data validation functions
│
├── README.md                ← Quick start (THIS FILE)
└── COMPLETE_SETUP.md        ← Detailed troubleshooting guide
```

## Quick Commands

Run Backend (Terminal 1):
```powershell
cd backend
npm install
npm run build
npm run init-db
npm start
```
Result: http://localhost:5555

Run Frontend (Terminal 2):
```powershell
npm install
npm run dev
```
Result: http://localhost:5173

Verify Everything Works:
```powershell
python .venv/Scripts/python scripts/test_api.py
```
Expected: 9/9 tests passing

## Database Schema

**11 tables with data:**
- `teams` - WNBA teams metadata
- `players` - Player profiles and info
- `rosters` - Season roster snapshots
- `season_stats` - Player season averages
- `game_logs` - Individual game statistics (12,562 records)
- `shot_charts` - Shot zone data
- `news` - News articles
- `league_averages` - League-wide stats
- `team_forecasts` - Game predictions
- `sync_log` - Data update history
- `sync_metadata` - Configuration

All queries are parameterized (SQL injection protected)

## Data Ingestion - How to Update When New Games Play

**Step 1: Update source data**
```powershell
python scripts/refresh_current_season.py
```
This is the recommended routine update command after new games are played. It refreshes current-season player stats, re-fetches game logs for players whose GP changed, optionally refreshes shot charts, retrains forecasts, refreshes news, and updates `src/data/wnba_data.json`.

For a quicker refresh that skips shot charts:
```powershell
python scripts/refresh_current_season.py --fast
```

**Step 2: Migrate to database**
```powershell
python scripts/migrate_wnba_to_db.py
```
Reads updated JSON, inserts new records, validates data

**Step 3: Verify data**
```powershell
python scripts/verify_migration.py
```
Confirms all records match between JSON and database

**Step 4: Restart backend**
```powershell
cd backend
npm start
```
Restarted backend sees new data

**Step 5: Verify frontend**
- Frontend automatically uses new data from API
- No frontend restart needed (API changed, frontend just refreshes)

### Full Data Pipeline (if needed)
```powershell
# Complete refresh from scratch
python scripts/fetch_all.py              # Fetch all teams/players/games
python scripts/migrate_wnba_to_db.py     # Migrate to DB
python scripts/verify_migration.py       # Verify
python scripts/test_api.py               # Test API
# Then restart backend and frontend
```

### When To Use `fetch_game_logs.py`
`fetch_game_logs.py` is a backfill/bootstrap helper for missing regular-season logs. It is not the preferred command for normal day-to-day updates after new games are played. For routine refreshes, use `refresh_current_season.py`.

### Automating Updates (Future)

**Option 1: Scheduled task (Windows)**
```powershell
# Windows Task Scheduler can run PowerShell script nightly
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
$action = New-ScheduledTaskAction -Script "c:\path\to\update_data.ps1"
Register-ScheduledTask -TaskName "Update Basketball Data" -Trigger $trigger -Action $action
```

**Option 2: GitHub Actions (Cloud)**
```yaml
# .github/workflows/daily-update.yml
schedule:
  - cron: '0 2 * * *'  # 2 AM daily
```

**Option 3: Backend scheduled job**
```typescript
// Add to backend/src/server.ts
const cron = require('node-cron');
cron.schedule('0 2 * * *', async () => {
  // Run migration script
  // Update database
});
```

## Security Features

- Rate Limiting: 100 req/min per IP on `/api/v1/*`
- Security Headers: Helmet.js (CSP, HSTS, X-Frame-Options)
- CORS: Only localhost:5173 allowed
- SQL Injection: Parameterized queries everywhere
- XSS: Content-Security-Policy enabled
- Input Validation: All API parameters validated
- Error Handling: No path leakage in errors

What's not included (add if going to production):
- Authentication (API is public - OK for internal use)
- HTTPS/TLS (add for production)
- Database encryption
- API request logging

## 📝 API Endpoints

### Base URL
`http://localhost:5555/api/v1`

### Available Endpoints

| Method | Endpoint | Returns | Example |
|--------|----------|---------|---------|
| GET | `/players` | List all players | `?league=WNBA&limit=50` |
| GET | `/players/:id` | Player details | `/players/1628909?league=WNBA` |
| GET | `/players/:id/stats` | Player season stats | `/players/1628909/stats?league=WNBA` |
| GET | `/players/:id/game-logs` | Player game history | `/players/1628909/game-logs?league=WNBA&limit=20` |
| GET | `/teams` | List all teams | `?league=WNBA` |
| GET | `/teams/:id` | Team details | `/teams/1611661325?league=WNBA` |
| GET | `/teams/:id/roster` | Team roster | `/teams/1611661325/roster?league=WNBA` |
| GET | `/news` | News articles | `?limit=20` |
| GET | `/games/forecasts` | Game predictions | `?league=WNBA` |
| GET | `/health` | Health check | Returns `{success: true, status: "ok"}` |

### Query Parameters

- `league` - "WNBA" or "NBA" (WNBA only has data currently)
- `limit` - Max records to return (default: 50)
- `offset` - Skip N records (default: 0)

## Testing

### Comprehensive Test Suite

Run all tests before committing or deploying:

```powershell
python scripts/run_all_tests.py
```

This runs 9 sequential tests covering:
1. Frontend TypeScript build
2. Frontend ESLint linting
3. Frontend smoke test (data validation)
4. Backend TypeScript build
5. Backend database initialization
6. Backend API tests (9 endpoints)
7. Backend security tests (7 checks)
8. Data migration verification
9. Git readiness check (no sensitive files)

Expected output: `All tests passed - Ready to commit!`

### Individual Test Commands

| Test | Command | Purpose | Expected |
|------|---------|---------|----------|
| API Tests | `python scripts/test_api.py` | Verify all endpoints return valid data | 9/9 passing |
| Security | `python scripts/security_test.py` | Audit for SQL injection, XSS, rate limiting | 7/7 checks passing |
| Data | `python scripts/verify_migration.py` | Confirm JSON and database match | 100% records match |
| Git Ready | `python scripts/git_readiness_check.py` | Scan for secrets, .env, database files | 0 critical issues |
| Frontend Build | `npm run build` | TypeScript compilation and bundling | Success |
| Frontend Lint | `npm run lint` | Code quality check | 0 errors |
| Frontend Smoke | `npm run smoke` | Validate data files exist | Pass |
| Backend Build | `npm run build` (in backend/) | TypeScript compilation | Success |

### Manual Testing

**Backend Health Check:**
```powershell
curl http://localhost:5555/api/health
# Expected: {"success": true, "status": "ok"}
```

**API Endpoint Examples:**
```powershell
# List all players
curl http://localhost:5555/api/v1/players?league=WNBA

# Get specific player
curl http://localhost:5555/api/v1/players/1628909?league=WNBA

# Player game logs
curl http://localhost:5555/api/v1/players/1628909/game-logs?league=WNBA

# List teams
curl http://localhost:5555/api/v1/teams?league=WNBA

# Get team roster
curl http://localhost:5555/api/v1/teams/1611661325/roster?league=WNBA

# Get news
curl http://localhost:5555/api/v1/news?limit=5
```

### Pre-Commit Checklist

Before running `git commit`:

```powershell
# 1. Run comprehensive test suite
python scripts/run_all_tests.py

# 2. Check git readiness (no secrets)
python scripts/git_readiness_check.py

# 3. Verify no uncommitted sensitive files
git status --porcelain | grep -E "\.env|\.db|basketball\.db"

# 4. Review changes
git diff --stat
git diff
```

### Continuous Integration (GitHub Actions)

When you push to GitHub, tests run automatically. See `.github/workflows/` for configuration.

### What Gets Tested

**Build & Compilation:**
- TypeScript syntax and type checking
- All imports resolve correctly
- JavaScript bundles created successfully
- Schema files copy to dist/

**Code Quality:**
- ESLint rules pass
- No unused imports
- Code style consistent

**Runtime & Data:**
- All API endpoints respond
- Database queries work
- Data migrations successful
- 100% data integrity

**Security:**
- SQL injection attempts blocked
- XSS payloads escaped
- Rate limiting working
- CORS validation active

**Git Safety:**
- No .env files committed
- No database files committed
- No API keys or secrets
- All required files in .gitignore

## Dependencies

Backend (Node.js):
- **express** 4.18.2 - Web framework
- **sqlite3** 5.1.6 - Database driver
- **typescript** 5.3.3 - Type safety
- **helmet** 7.1.0 - Security headers
- **express-rate-limit** 7.1.5 - Rate limiting
- **cors** 2.8.5 - Cross-origin requests
- **dotenv** 16.3.1 - Environment variables

Frontend (React):
- **react** 19.2.6 - UI library
- **vite** 8.0.16 - Build tool
- **typescript** 5.3.3 - Type safety

Data Scripts (Python):
- **nba_api** - WNBA stats fetcher
- **requests** - HTTP client
- **scikit-learn** - ML for forecasts
- **numpy** - Numerical computing

## Configuration

.env File (Backend)
```
PORT=5555
DB_PATH=./basketball.db
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
RATE_LIMIT_PER_MINUTE=100
```

Environment Variables Explained

| Variable | Purpose | Default | Example |
|----------|---------|---------|---------|
| PORT | Backend server port | 5555 | 3000, 8080 |
| DB_PATH | SQLite database location | ./basketball.db | /var/db/app.db |
| FRONTEND_URL | Allowed frontend origin (CORS) | http://localhost:5173 | https://app.example.com |
| NODE_ENV | Environment mode | development | production |
| RATE_LIMIT_PER_MINUTE | API rate limit | 100 | 50, 200, 1000 |

## Common Tasks

Add New API Endpoint

1. Create route file in `backend/src/routes/newfeature.ts`:
```typescript
export async function handleNewFeature(req, res) {
  const { param } = req.query;
  const result = await db.all('SELECT * FROM table WHERE condition = ?', [param]);
  res.json({ success: true, data: result });
}
```

2. Register in `backend/src/server.ts`:
```typescript
import { handleNewFeature } from './routes/newfeature';
app.get('/api/v1/newfeature', handleNewFeature);
```

3. Test: `curl http://localhost:5555/api/v1/newfeature?param=value`

Change Database Schema

1. Edit `backend/src/db/schema.sql`
2. Delete `backend/basketball.db` (will be recreated)
3. Run `npm run init-db`
4. Re-migrate data: `python scripts/migrate_wnba_to_db.py`

Update Rate Limit

Edit `.env`:
```
RATE_LIMIT_PER_MINUTE=200  # Changed from 100
```
Then restart backend: `npm start`

Debug API Responses

Enable verbose logging:
```powershell
# Windows
$env:DEBUG="*"; npm start

# Mac/Linux
DEBUG="*" npm start
```

## File Reference for Agents

When Users Report Issues

| Issue | Where to Look | File | Relevant Section |
|-------|---------------|------|------------------|
| "Backend won't start" | Backend config | `.env`, `backend/package.json` | PORT/DB_PATH validation |
| "No data in frontend" | API connection | `backend/src/server.ts` | CORS/routes |
| "Database locked" | Data layer | `backend/src/db/connection.ts` | Connection pool |
| "Rate limit hitting" | Security | `.env` | RATE_LIMIT_PER_MINUTE |
| "CORS error" | Backend config | `backend/src/server.ts` | CORS middleware |
| "Build fails on Mac" | Build system | `backend/package.json` | Build script |
| "Data migration errors" | Scripts | `scripts/migrate_wnba_to_db.py` | Validation/schema |
| "Tests failing" | Verification | `scripts/test_api.py` | Test logic |

When You Need to Modify

| Task | File | Key Points |
|------|------|-----------|
| Add new API endpoint | `backend/src/routes/*.ts` | Remember to add CORS headers, rate limiting, validation |
| Change database schema | `backend/src/db/schema.sql` | Foreign keys enforced, delete DB after change |
| Update environment vars | `.env` | Reload backend for changes to take effect |
| Fix cross-platform issue | `backend/package.json` or `scripts/*.py` | Use Node fs methods, pathlib.Path (not hardcoded paths) |
| Improve security | `backend/src/server.ts` | Add to helmet config or middleware chain |
| Update data | `scripts/migrate_wnba_to_db.py` | Ensure validation runs, check for data type mismatches |

## Troubleshooting Tree

**Backend won't start?**
- Port 5555 in use? Kill process or change PORT in `.env`
- .env file missing? Copy template or create manually
- Build failed? Run `npm run build` to see errors
- → See COMPLETE_SETUP.md "Troubleshooting" section

**API returning 429 (Too Many Requests)?**
- Rate limit hit (100 req/min default)
- Either wait 1 minute OR increase RATE_LIMIT_PER_MINUTE in `.env`
- → Restart backend for changes to take effect

**Frontend blank/no data?**
- Check browser console for errors
- Verify backend running: `curl http://localhost:5555/api/health`
- Check CORS: backend must allow frontend origin
- → Run `python scripts/test_api.py` to verify API works

**Database "locked" error?**
- Another process has database open
- Kill all Node processes: `taskkill /IM node.exe /F` (Windows)
- Or restart computer
- → Only one backend instance should run at a time

**Migration failed?**
- Check JSON file exists: `src/data/wnba_data.json`
- Validate Python venv: `python scripts/verify_migration.py`
- Check database corruption: Delete `backend/basketball.db`, reinit
- → See error messages for specific field/data issues

## Learning Resources

- **Backend:** Express.js + SQLite3 + TypeScript basics
- **Frontend:** React hooks + Vite hot reload
- **Data:** Python data validation + CSV/JSON transformation
- **Security:** OWASP Top 10, SQL injection, XSS, rate limiting
- **DevOps:** Cross-platform scripting, environment management

## Important Notes for Future Work

1. **Phase 3 (Future):** Migrate frontend from JSON imports to API calls - not critical, works as-is
2. **Production:** Add JWT authentication before public deployment
3. **Scaling:** Database can migrate from SQLite → PostgreSQL without API changes
4. **Data:** WNBA data is current. NBA support ready (schema supports both leagues)
5. **Performance:** Current setup handles 100+ concurrent users (rate-limited)

---

**Last Updated:** 2026-06-29  
**Created For:** AI Agents & Future Developers  
**Version:** 1.0.0
