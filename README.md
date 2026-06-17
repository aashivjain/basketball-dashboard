# WNBA Analytics Dashboard

Full-league analytics dashboard covering all WNBA teams and players (2024-2026). It uses real data from the official WNBA stats API and includes player profiles, shot charts, game logs, growth trends, team matchup forecasts, and a WNBA news tab.

## Data Privacy Notes

- Generated data files are gitignored, so they are not pushed to Git by default.
- That keeps the raw generated files private in the repository unless you force-add them.
- If you publish this as a static frontend, any data required by the browser is still visible to site visitors.
- If you need the data to be private from end users, you need a backend API. A static Vite app cannot make client-delivered data secret.

## Requirements

- Node.js 20+
- Python 3.10+

Python packages used by the data pipeline:

- `nba_api`
- `requests`
- `scikit-learn`
- `numpy`

## API Keys

- No API keys are currently required.
- WNBA stats come from the `nba_api` package calling the official WNBA stats endpoints.
- The News tab uses public Google News RSS queries and does not require a key.
- This is the preferred setup for simplicity, but public RSS/news endpoints can still change behavior, rate-limit, or go down.

## Install

### Windows

```powershell
git clone https://github.com/aashivjain/basketball-dashboard.git
cd basketball-dashboard
npm install
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install nba_api requests scikit-learn numpy
```

### macOS

```bash
git clone https://github.com/aashivjain/basketball-dashboard.git
cd basketball-dashboard
npm install
python3 -m venv .venv
source .venv/bin/activate
pip install nba_api requests scikit-learn numpy
```

## Generated Data Locations

The scripts write generated files here:

- `src/data/wnba_data.json`
- `src/data/team_predictions.json`

The React app reads from those same files.

The WNBA news feed is stored inside `src/data/wnba_data.json` under the top-level `news` field.

## Generate All Data

This pulls roster data, league player data, game logs, shot charts, forecast data, and WNBA news headlines.

### Windows

```powershell
.venv\Scripts\python scripts\fetch_all.py
```

### macOS

```bash
.venv/bin/python scripts/fetch_all.py
```

## Run The App

### Windows

```powershell
npm run dev
```

### macOS

```bash
npm run dev
```

Open `http://localhost:5173`

The app now uses real client-side routes:

- `/players`
- `/players/compare`
- `/players/rankings`
- `/players/builder`
- `/teams`
- `/news`

You can open those paths directly in local development once the dev server is running.

## Refresh Current Season Data

### Full refresh

Updates current-season player stats, game logs, shot charts, team forecasts, and WNBA news headlines.

### Windows

```powershell
npm run refresh
```

### macOS

```bash
.venv/bin/python scripts/refresh_current_season.py
```

### Fast refresh

Skips shot chart refetching but still updates stats, game logs, forecasts, and news headlines.

### Windows

```powershell
npm run refresh:fast
```

### macOS

```bash
.venv/bin/python scripts/refresh_current_season.py --fast
```

## Retrain Forecasts Only

### Windows

```powershell
npm run train:forecasts
```

### macOS

```bash
.venv/bin/python scripts/train_team_forecasts.py
```

## Refresh News Only

This pulls current WNBA headlines for the News tab and writes them into `src/data/wnba_data.json`.

### Windows

```powershell
npm run refresh:news
```

### macOS

```bash
.venv/bin/python scripts/fetch_wnba_news.py
```

## Smoke Check

Validate that the generated JSON files exist, parse correctly, stay season-aligned, and that the optional `news` block is well-formed when present:

```bash
npm run smoke:data
```

Recommended quick check before shipping:

```bash
npm run smoke
npm run build
```

## Routing And Deployment Notes

- The app uses client-side routing via `react-router-dom`.
- Local run commands are unchanged. You still start it with `npm run dev`.
- Browser refreshes and direct visits to valid routes work in development because Vite serves the SPA.
- For production hosting, configure your host to rewrite unknown app routes back to `index.html`.
- Without an SPA fallback rewrite, direct visits like `/news` or `/teams` may 404 on some hosts.

## Script I/O Map

- `scripts/fetch_data.py` writes `src/data/wnba_data.json`
- `scripts/fetch_game_logs.py` updates `src/data/wnba_data.json`
- `scripts/fetch_all_shots.py` updates `src/data/wnba_data.json`
- `scripts/fetch_league_players.py` updates `src/data/wnba_data.json`
- `scripts/refresh_current_season.py` updates `src/data/wnba_data.json`
- `scripts/train_team_forecasts.py` writes `src/data/team_predictions.json`
- `scripts/fetch_wnba_news.py` updates `src/data/wnba_data.json` under `news`

## Features

- All WNBA players league-wide
- Team-colored player profiles
- Shot chart and zone breakdowns
- Game log tables and performance trends
- Season-over-season growth tracking
- Player comparison
- Team matchup forecasts
- WNBA news headlines

## Tech

- React + TypeScript + Vite
- Tailwind CSS
- Recharts + custom SVG
- Python `nba_api` for data ingestion

## Project Structure

```text
src/
├── components/   # Dashboard, PlayerCard, ShotChart, StatsRadar, etc.
├── data/         # generated locally, gitignored
├── types/        # TypeScript interfaces
└── utils/        # Team colors, validation, stat helpers
scripts/
├── fetch_all.py
├── fetch_data.py
├── fetch_game_logs.py
├── fetch_all_shots.py
├── fetch_league_players.py
├── fetch_wnba_news.py
├── refresh_current_season.py
├── train_team_forecasts.py
└── smoke_validate_data.mjs
```
