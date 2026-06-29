# Basketball Dashboard Backend

Express.js backend API for the Basketball Dashboard. Serves data from SQLite database supporting both NBA and WNBA.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and adjust values:

```bash
cp .env.example .env
```

Edit `.env`:
```
PORT=3001
DB_PATH=./basketball.db
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### 3. Initialize Database

```bash
npm run init-db
```

This creates the SQLite database with all tables and indexes.

## Development

### Start the server

```bash
npm run dev
```

Server will be available at `http://localhost:3001`

Health check: `http://localhost:3001/api/health`

## API Endpoints

### Players
- `GET /api/v1/players` - List players with stats
- `GET /api/v1/players/:id` - Get specific player
- `GET /api/v1/players/:id/stats` - Get season stats
- `GET /api/v1/players/:id/game-logs` - Get game logs
- `GET /api/v1/players/:id/shot-chart` - Get shot chart data

### Teams
- `GET /api/v1/teams` - List teams
- `GET /api/v1/teams/:id` - Get specific team
- `GET /api/v1/teams/:id/roster` - Get team roster

### Games
- `GET /api/v1/games/forecasts` - Get game forecasts
- `GET /api/v1/games/forecasts/:homeTeamId/:awayTeamId` - Get specific matchup forecast
- `GET /api/v1/games/player-logs/:playerId` - Get player game logs

### News
- `GET /api/v1/news` - List news articles
- `GET /api/v1/news/:id` - Get specific article
- `GET /api/v1/news/categories/:category` - Get articles by category

## Query Parameters

### Common Parameters
- `league` - 'WNBA' (default) or 'NBA'
- `season` - Season string, e.g., '2026'
- `limit` - Maximum records to return
- `offset` - Number of records to skip

### Example Requests

```bash
# Get all WNBA players for 2026 season
curl http://localhost:3001/api/v1/players?league=WNBA&season=2026

# Get specific player stats
curl http://localhost:3001/api/v1/players/1642286/stats?league=WNBA&season=2026

# Get news articles
curl http://localhost:3001/api/v1/news?league=WNBA&limit=20

# Get team roster
curl http://localhost:3001/api/v1/teams/1611661325/roster?league=WNBA&season=2026
```

## Database Schema

See `src/db/schema.sql` for complete database structure.

Key tables:
- `teams` - Team information
- `players` - Player profiles
- `rosters` - Season-specific roster entries
- `season_stats` - Per-game statistics
- `game_logs` - Individual game records
- `shot_charts` - Shot location data
- `news` - News articles
- `team_forecasts` - Game predictions
- `league_averages` - League-wide averages

## Building

### Production Build

```bash
npm run build
npm run start
```

## Notes

- All queries include league and season filtering for multi-league support
- Responses use consistent JSON structure with `success` boolean
- Database uses foreign keys with constraints
- Connection pooling managed by better-sqlite3
- All timestamps in ISO format
