# Data Ingestion Guide

How to refresh WNBA game data when new games have been played.

## Quick Refresh (Recommended)

Run this when new games finish:

```powershell
python scripts/fetch_game_logs.py      # Get latest games from API
python scripts/migrate_wnba_to_db.py   # Insert into database
python scripts/verify_migration.py     # Validate data integrity
```

Then restart backend:
```powershell
# In backend terminal: Ctrl+C to stop
npm start
```

Frontend will automatically show new data (no restart needed).

## What Each Script Does

| Script | Purpose | Time | Output |
|--------|---------|------|--------|
| `fetch_game_logs.py` | Downloads WNBA games from API, updates `src/data/wnba_data.json` | 5-10s | Updated JSON file |
| `migrate_wnba_to_db.py` | Validates JSON, inserts new records into SQLite database | 10-15s | Database updated, migration log |
| `verify_migration.py` | Confirms 100% match between JSON and database | 5s | Validation report |

## Complete Refresh (From Scratch)

If you need to reset everything:

```powershell
# Delete old database
rm backend/basketball.db

# Reinitialize
cd backend
npm run init-db
cd ..

# Fetch all data fresh
python scripts/fetch_all.py

# Migrate to database
python scripts/migrate_wnba_to_db.py
python scripts/verify_migration.py

# Restart backend
cd backend
npm start
```

## Automated Updates (Optional)

### Windows Task Scheduler

Create file `update_data.ps1`:
```powershell
cd C:\Users\YourName\basketball-dashboard
python scripts/fetch_game_logs.py
python scripts/migrate_wnba_to_db.py
python scripts/verify_migration.py

# Optional: Restart backend
taskkill /IM node.exe /F
cd backend
npm start
```

Then schedule it:
```powershell
$trigger = New-ScheduledTaskTrigger -Daily -At 3:00AM
$action = New-ScheduledTaskAction -Script "C:\path\to\update_data.ps1"
Register-ScheduledTask -TaskName "Update Basketball Data" -Trigger $trigger -Action $action -RunLevel Highest
```

### GitHub Actions (Cloud - Recommended for Production)

Create `.github/workflows/update-data.yml`:
```yaml
name: Update WNBA Data

on:
  schedule:
    - cron: '0 3 * * *'  # 3 AM daily
  workflow_dispatch:     # Also allow manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - run: |
          python -m pip install -r requirements.txt
          python scripts/fetch_game_logs.py
          python scripts/migrate_wnba_to_db.py
          python scripts/verify_migration.py
      - uses: stefanzweifel/git-auto-commit-action@v4
        with:
          commit_message: 'Auto: Update game data'
```

## Verify Data After Update

Check the migration log:
```powershell
# After running migrate_wnba_to_db.py, check:
cat backend/migration_log.txt
```

Run tests to confirm API returns correct data:
```powershell
python scripts/test_api.py
```

Expected output: `9/9 tests passing`

## Troubleshooting

**"No new games found"**
- WNBA season might be in off-season
- Check if games actually happened: NBA.com schedule
- Manually verify JSON was updated: `git diff src/data/wnba_data.json`

**"Migration failed - data mismatch"**
- Database might be corrupted: Delete `backend/basketball.db` and reinitialize
- Run verification: `python scripts/verify_migration.py --verbose`

**"Backend doesn't show new data"**
- Frontend is caching data: Hard refresh browser (Ctrl+Shift+R)
- API might be returning old data: Restart backend with `npm start`

## Data Schema

Current database has these tables:
- `game_logs` (12,562 records) - Individual player games
- `season_stats` (44 records) - Season averages
- `players` (29 records) - Player metadata
- `teams` (1 record) - Team info
- `rosters` (42 records) - Season rosters
- `news` (10 records) - Latest news articles
- `league_averages` (3 records) - League-wide stats
- `sync_log` (1 record) - Last update timestamp

## Next Steps

- See [PRODUCTION.md](PRODUCTION.md) for deploying with real users
- See [README.md](README.md) for feature overview
