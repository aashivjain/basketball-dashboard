# WNBA Analytics Dashboard

Full-league analytics dashboard covering all WNBA teams and players (2024–2026). Real data from the official WNBA stats API. Shot charts, radar comparisons, game logs, and season-over-season growth tracking.

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/aashivjain/basketball-dashboard.git
cd basketball-dashboard
npm install
```

### 2. Set Up Python (for data fetching)

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install nba_api requests
```

### 3. Fetch Data

Run the master fetch script (takes ~20 min — pulls from stats.wnba.com):

```bash
python scripts/fetch_all.py
```

Or run steps individually:

```bash
python scripts/fetch_data.py           # Fever roster, stats, game logs
python scripts/fetch_league_players.py # All WNBA players per-game stats
python scripts/fetch_all_shots.py      # Shot charts for every player
```

### 4. Run the App

```bash
npm run dev
```

Open http://localhost:5173

## Features

- **All WNBA players** — Browse by team, compare any two players league-wide
- **Team-colored UI** — Background and accents shift to match the selected player's team
- **Shot chart** — Wooden court with green (made) / red (missed) shot plotting
- **Radar chart** — Player vs league average with optional comparison overlay
- **Game log & trends** — Full season table + line charts
- **Season comparison** — Track player growth across 2024–2026
- **Shooting zones** — Efficiency breakdown by court area

## Tech

- React + TypeScript + Vite
- Tailwind CSS
- Recharts + custom SVG
- Python `nba_api` for data ingestion

## Project Structure

```
src/
├── components/   # Dashboard, PlayerCard, ShotChart, StatsRadar, etc.
├── data/         # fever_data.json (generated, gitignored)
├── types/        # TypeScript interfaces
└── utils/        # Team colors, stat helpers
scripts/
├── fetch_all.py            # Master script (runs everything)
├── fetch_data.py           # Fever-specific data
├── fetch_league_players.py # League-wide stats
└── fetch_all_shots.py      # Shot charts for all players
```
