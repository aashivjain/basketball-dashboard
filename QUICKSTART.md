# Quick Start

Get the dashboard running in 2 minutes.

## Prerequisites
- Node.js 20+
- Python 3.10+

## Run It

**Terminal 1 - Backend (keeps running)**
```powershell
cd backend
npm install && npm run build && npm run init-db && npm start
```
Wait for: `✓ Database connected`

**Terminal 2 - Frontend (keeps running)**
```powershell
npm install && npm run dev
```
Then open: http://localhost:5173

Both terminals stay open. Ctrl+C stops either one independently.

## Update Game Data

When new games have played:

```powershell
python scripts/refresh_current_season.py
python scripts/migrate_wnba_to_db.py
python scripts/verify_migration.py
```

Restart backend (Ctrl+C in Terminal 1, then `npm start`). Frontend auto-refreshes.

If you want a quicker update that skips shot chart refreshes:

```powershell
python scripts/refresh_current_season.py --fast
python scripts/migrate_wnba_to_db.py
python scripts/verify_migration.py
```

## Next Steps

- See [PRODUCTION.md](PRODUCTION.md) before deploying to real users
- See [DATA_INGESTION.md](DATA_INGESTION.md) for detailed data update workflow
- See [AGENTS.md](AGENTS.md) for technical architecture
- See [README.md](README.md) for full feature list
