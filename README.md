# Indiana Fever Analytics Dashboard

An interactive analytics dashboard for the 2024 Indiana Fever (WNBA) season. Visualizes real player statistics, shot charts, and performance trends using data from the official WNBA stats API.

## Features

- **Player Profiles** — Select any player from the Indiana Fever roster to view their season stats, bio, and per-game averages
- **Shot Chart** — Interactive half-court visualization showing every field goal attempt with made/missed filtering and hover details
- **Stats Radar** — Radar chart comparing a player's per-game stats against WNBA league averages
- **Performance Trends** — Game-by-game line charts for points, rebounds, assists, steals, and FG%
- **Shooting Zones** — Horizontal bar chart breaking down FG% by court zone with color-coded efficiency
- **Game Log** — Sortable game-by-game stat table with win/loss indicators

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Recharts (charts/graphs)
- Custom SVG (shot chart court)

## Data

All data is **real** — sourced from the official WNBA stats API via the `nba_api` Python package. The data was fetched using the scripts in `/scripts` and stored as a JSON file.

**Data source:** stats.wnba.com (2024 Regular Season)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Refreshing Data

To re-fetch the latest data from the WNBA API:

```bash
pip install nba_api pandas
python scripts/fetch_data.py
```

This will update `src/data/fever_data.json` with the latest stats.

## Project Structure

```
src/
├── components/       # React UI components
│   ├── Dashboard.tsx
│   ├── PlayerSelector.tsx
│   ├── PlayerCard.tsx
│   ├── ShotChart.tsx
│   ├── StatsRadar.tsx
│   ├── PerformanceTrend.tsx
│   ├── GameLogTable.tsx
│   └── ShotZoneBreakdown.tsx
├── data/             # Real WNBA JSON data
├── types/            # TypeScript interfaces
├── utils/            # Helper functions
├── App.tsx
└── main.tsx
scripts/
└── fetch_data.py     # Python data fetcher
```
