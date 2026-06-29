-- Basketball Dashboard Database Schema
-- Supports both NBA and WNBA with unified schema
-- Created: 2026-06-29

-- Drop existing tables if they exist (for fresh initialization)
DROP TABLE IF EXISTS rosters;
DROP TABLE IF EXISTS league_averages;
DROP TABLE IF EXISTS team_forecasts;
DROP TABLE IF EXISTS news;
DROP TABLE IF EXISTS shot_charts;
DROP TABLE IF EXISTS game_logs;
DROP TABLE IF EXISTS season_stats;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS teams;

-- ============================================================================
-- TEAMS
-- ============================================================================
CREATE TABLE teams (
  id INTEGER NOT NULL,
  league TEXT NOT NULL CHECK(league IN ('WNBA', 'NBA')),
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  PRIMARY KEY (id, league)
);

CREATE INDEX idx_teams_league ON teams(league);
CREATE INDEX idx_teams_abbreviation ON teams(abbreviation);

-- ============================================================================
-- PLAYERS
-- ============================================================================
CREATE TABLE players (
  id INTEGER NOT NULL,
  league TEXT NOT NULL CHECK(league IN ('WNBA', 'NBA')),
  name TEXT NOT NULL,
  position TEXT,
  team_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, league),
  FOREIGN KEY (team_id, league) REFERENCES teams(id, league) ON DELETE SET NULL
);

CREATE INDEX idx_players_league ON players(league);
CREATE INDEX idx_players_team ON players(team_id, league);
CREATE INDEX idx_players_name ON players(name);

-- ============================================================================
-- ROSTERS (Season-specific player info)
-- ============================================================================
CREATE TABLE rosters (
  player_id INTEGER NOT NULL,
  league TEXT NOT NULL CHECK(league IN ('WNBA', 'NBA')),
  season TEXT NOT NULL,
  number TEXT,
  height TEXT,
  weight TEXT,
  age INTEGER,
  experience TEXT,
  school TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id, league) REFERENCES players(id, league) ON DELETE CASCADE,
  PRIMARY KEY (player_id, league, season)
);

CREATE INDEX idx_rosters_season ON rosters(season, league);
CREATE INDEX idx_rosters_player_season ON rosters(player_id, season);

-- ============================================================================
-- SEASON STATS (Per-game averages)
-- ============================================================================
CREATE TABLE season_stats (
  player_id INTEGER NOT NULL,
  league TEXT NOT NULL CHECK(league IN ('WNBA', 'NBA')),
  season TEXT NOT NULL,
  game_type TEXT NOT NULL CHECK(game_type IN ('Regular Season', 'Playoffs', 'All-Star')),
  gp INTEGER,
  min REAL,
  pts REAL,
  reb REAL,
  ast REAL,
  stl REAL,
  blk REAL,
  tov REAL,
  fgm REAL,
  fga REAL,
  fg_pct REAL,
  fg3m REAL,
  fg3a REAL,
  fg3_pct REAL,
  ftm REAL,
  fta REAL,
  ft_pct REAL,
  oreb REAL,
  dreb REAL,
  pf REAL,
  plus_minus REAL,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id, league) REFERENCES players(id, league) ON DELETE CASCADE,
  PRIMARY KEY (player_id, league, season, game_type)
);

CREATE INDEX idx_season_stats_player_season ON season_stats(player_id, season, league);
CREATE INDEX idx_season_stats_season_league ON season_stats(season, league);
CREATE INDEX idx_season_stats_pts ON season_stats(pts DESC);

-- ============================================================================
-- GAME LOGS (Individual game records)
-- ============================================================================
CREATE TABLE game_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  league TEXT NOT NULL CHECK(league IN ('WNBA', 'NBA')),
  season TEXT NOT NULL,
  game_date TEXT NOT NULL,
  opponent_team_id INTEGER,
  is_home BOOLEAN,
  pts INTEGER,
  reb INTEGER,
  ast INTEGER,
  stl INTEGER,
  blk INTEGER,
  tov INTEGER,
  fgm INTEGER,
  fga INTEGER,
  fg_pct REAL,
  fg3m INTEGER,
  fg3a INTEGER,
  fg3_pct REAL,
  ftm INTEGER,
  fta INTEGER,
  ft_pct REAL,
  plus_minus INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id, league) REFERENCES players(id, league) ON DELETE CASCADE
);

CREATE INDEX idx_game_logs_player_season ON game_logs(player_id, season, league);
CREATE INDEX idx_game_logs_date ON game_logs(game_date);
CREATE INDEX idx_game_logs_league ON game_logs(league);

-- ============================================================================
-- SHOT CHARTS (Individual shot locations and results)
-- ============================================================================
CREATE TABLE shot_charts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  league TEXT NOT NULL CHECK(league IN ('WNBA', 'NBA')),
  season TEXT NOT NULL,
  x_loc REAL,
  y_loc REAL,
  shot_distance REAL,
  shot_result TEXT CHECK(shot_result IN ('Made', 'Missed')),
  shot_type TEXT,
  game_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id, league) REFERENCES players(id, league) ON DELETE CASCADE
);

CREATE INDEX idx_shot_charts_player_season ON shot_charts(player_id, season, league);
CREATE INDEX idx_shot_charts_distance ON shot_charts(shot_distance);

-- ============================================================================
-- NEWS (Articles and headlines)
-- ============================================================================
CREATE TABLE news (
  id TEXT PRIMARY KEY,
  league TEXT NOT NULL CHECK(league IN ('WNBA', 'NBA', 'General')),
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  link TEXT NOT NULL UNIQUE,
  published_at TEXT NOT NULL,
  category TEXT CHECK(category IN ('General', 'Injuries', 'Discipline', 'Transactions', 'Trade', 'Draft')),
  summary TEXT,
  image_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_news_league ON news(league);
CREATE INDEX idx_news_published_at ON news(published_at DESC);
CREATE INDEX idx_news_category ON news(category);

-- ============================================================================
-- LEAGUE AVERAGES (Cached for performance)
-- ============================================================================
CREATE TABLE league_averages (
  league TEXT NOT NULL CHECK(league IN ('WNBA', 'NBA')),
  season TEXT NOT NULL,
  game_type TEXT NOT NULL CHECK(game_type IN ('Regular Season', 'Playoffs', 'All-Star')),
  pts REAL,
  reb REAL,
  ast REAL,
  stl REAL,
  blk REAL,
  fg_pct REAL,
  fg3_pct REAL,
  ft_pct REAL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (league, season, game_type)
);

CREATE INDEX idx_league_averages_season ON league_averages(season, league);

-- ============================================================================
-- TEAM FORECASTS (Predictions for matchups)
-- ============================================================================
CREATE TABLE team_forecasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league TEXT NOT NULL CHECK(league IN ('WNBA', 'NBA')),
  season TEXT NOT NULL,
  home_team_id INTEGER NOT NULL,
  away_team_id INTEGER NOT NULL,
  predicted_winner TEXT,
  home_win_pct REAL,
  away_win_pct REAL,
  confidence REAL,
  model_name TEXT,
  generated_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (home_team_id, league) REFERENCES teams(id, league) ON DELETE CASCADE,
  FOREIGN KEY (away_team_id, league) REFERENCES teams(id, league) ON DELETE CASCADE
);

CREATE INDEX idx_team_forecasts_season ON team_forecasts(season, league);
CREATE INDEX idx_team_forecasts_teams ON team_forecasts(home_team_id, away_team_id);

-- ============================================================================
-- DATA SYNC LOG (Track migration and updates)
-- ============================================================================
CREATE TABLE sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league TEXT NOT NULL CHECK(league IN ('WNBA', 'NBA')),
  data_type TEXT NOT NULL,
  status TEXT CHECK(status IN ('success', 'error', 'partial')),
  record_count INTEGER,
  error_message TEXT,
  started_at DATETIME,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_log_league_date ON sync_log(league, completed_at DESC);
