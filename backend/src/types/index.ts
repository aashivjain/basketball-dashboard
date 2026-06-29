// Type definitions for the basketball dashboard API

export type League = 'NBA' | 'WNBA'
export type GameType = 'Regular Season' | 'Playoffs' | 'All-Star'
export type NewsCategory = 'General' | 'Injuries' | 'Discipline' | 'Transactions' | 'Trade' | 'Draft'
export type ShotResult = 'Made' | 'Missed'

// Database models
export interface Team {
  id: number
  league: League
  name: string
  abbreviation: string
}

export interface Player {
  id: number
  league: League
  name: string
  position: string | null
  team_id: number | null
  created_at: string
}

export interface RosterEntry {
  player_id: number
  league: League
  season: string
  number: string | null
  height: string | null
  weight: string | null
  age: number | null
  experience: string | null
  school: string | null
  created_at: string
}

export interface SeasonStats {
  player_id: number
  league: League
  season: string
  game_type: GameType
  gp: number | null
  min: number | null
  pts: number | null
  reb: number | null
  ast: number | null
  stl: number | null
  blk: number | null
  tov: number | null
  fgm: number | null
  fga: number | null
  fg_pct: number | null
  fg3m: number | null
  fg3a: number | null
  fg3_pct: number | null
  ftm: number | null
  fta: number | null
  ft_pct: number | null
  oreb: number | null
  dreb: number | null
  pf: number | null
  plus_minus: number | null
  last_updated: string
}

export interface GameLog {
  id: number
  player_id: number
  league: League
  season: string
  game_date: string
  opponent_team_id: number | null
  is_home: boolean | null
  pts: number | null
  reb: number | null
  ast: number | null
  stl: number | null
  blk: number | null
  tov: number | null
  fgm: number | null
  fga: number | null
  fg_pct: number | null
  fg3m: number | null
  fg3a: number | null
  fg3_pct: number | null
  ftm: number | null
  fta: number | null
  ft_pct: number | null
  plus_minus: number | null
  created_at: string
}

export interface ShotChart {
  id: number
  player_id: number
  league: League
  season: string
  x_loc: number | null
  y_loc: number | null
  shot_distance: number | null
  shot_result: ShotResult | null
  shot_type: string | null
  game_date: string | null
  created_at: string
}

export interface NewsArticle {
  id: string
  league: League | 'General'
  title: string
  source: string
  link: string
  published_at: string
  category: NewsCategory | null
  summary: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface LeagueAverage {
  league: League
  season: string
  game_type: GameType
  pts: number | null
  reb: number | null
  ast: number | null
  stl: number | null
  blk: number | null
  fg_pct: number | null
  fg3_pct: number | null
  ft_pct: number | null
  updated_at: string
}

export interface TeamForecast {
  id: number
  league: League
  season: string
  home_team_id: number
  away_team_id: number
  predicted_winner: string | null
  home_win_pct: number | null
  away_win_pct: number | null
  confidence: number | null
  model_name: string | null
  generated_at: string | null
  created_at: string
}

export interface SyncLogEntry {
  id: number
  league: League
  data_type: string
  status: 'success' | 'error' | 'partial'
  record_count: number | null
  error_message: string | null
  started_at: string | null
  completed_at: string
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  total: number
  page: number
  limit: number
}
