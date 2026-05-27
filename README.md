# Indiana Fever Analytics Dashboard

Interactive analytics dashboard for the Indiana Fever (WNBA). Covers the 2024, 2025, and 2026 seasons with both regular season and playoff data. All statistics are real, sourced from the official WNBA stats API.

## Features

- **Multi-season support** — Toggle between 2024, 2025, and 2026 seasons
- **Regular season & playoffs** — Switch between regular season and postseason data
- **Player profiles** — Per-game averages, bio, shooting splits
- **Shot chart** — Interactive half-court SVG with every FGA plotted (filterable, hover details)
- **Radar chart** — Per-game stats vs WNBA league average (proper per-game comparison)
- **Player comparison** — Head-to-head stat comparison between any two teammates
- **Year-over-year growth** — Track a player's development across multiple seasons
- **Performance trends** — Game-by-game line charts (PTS, REB, AST, FG%)
- **Shooting zones** — FG% breakdown by court area with color-coded efficiency
- **Game log** — Full season table with W/L, +/-, shooting splits

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Recharts + custom SVG

## Data

All data is real — pulled from stats.wnba.com via the `nba_api` Python package. The fetch script pulls per-game stats (not totals), so all comparisons are apples-to-apples.

Covers: Indiana Fever, 2024-2026, regular season + playoffs.

## Getting Started

```bash
npm install
npm run dev
```

## Refreshing Data

```bash
pip install nba_api pandas
python scripts/fetch_data.py
```

## Structure

```
src/
├── components/
│   ├── Dashboard.tsx
│   ├── PlayerSelector.tsx
│   ├── PlayerCard.tsx
│   ├── ShotChart.tsx
│   ├── StatsRadar.tsx
│   ├── PerformanceTrend.tsx
│   ├── GameLogTable.tsx
│   ├── ShotZoneBreakdown.tsx
│   ├── PlayerComparison.tsx
│   └── GrowthChart.tsx
├── data/
├── types/
├── utils/
├── App.tsx
└── main.tsx
scripts/
└── fetch_data.py
```
