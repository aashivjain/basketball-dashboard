export interface Player {
  player_id: number
  name: string
  number: string
  position: string
  height: string
  weight: string
  age: number
  experience: string
  school: string
}

export interface PlayerStats {
  player_id: number
  name: string
  gp: number
  min: number
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  tov: number
  fgm: number
  fga: number
  fg_pct: number
  fg3m: number
  fg3a: number
  fg3_pct: number
  ftm: number
  fta: number
  ft_pct: number
  oreb: number
  dreb: number
  pf: number
  plus_minus: number
}

export interface GameLog {
  game_date: string
  matchup: string
  wl: string
  min: number
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  tov: number
  fgm: number
  fga: number
  fg_pct: number
  fg3m: number
  fg3a: number
  fg3_pct: number
  ftm: number
  fta: number
  ft_pct: number
  plus_minus: number
}

export interface Shot {
  game_date: string
  shot_type: string
  shot_zone: string
  shot_zone_area: string
  shot_zone_range: string
  shot_distance: number
  x: number
  y: number
  made: boolean
  quarter: number
}

export interface LeagueAverages {
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  fg_pct: number
  fg3_pct: number
  ft_pct: number
}

export interface LeaguePlayer {
  player_id: number
  name: string
  team: string
  gp: number
  min: number
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  tov: number
  fgm: number
  fga: number
  fg_pct: number
  fg3m: number
  fg3a: number
  fg3_pct: number
  ftm: number
  fta: number
  ft_pct: number
  oreb: number
  dreb: number
  pf: number
  plus_minus: number
}

export interface SeasonBlock {
  stats: PlayerStats[]
  league_averages: LeagueAverages
  game_logs: Record<string, GameLog[]>
  shot_charts: Record<string, Shot[]>
  all_players: LeaguePlayer[]
}

export interface SeasonData {
  roster: Player[]
  regular_season: SeasonBlock
  playoffs: SeasonBlock
}

export interface WnbaDashboardData {
  team: {
    id: number
    name: string
    abbreviation: string
    current_season: string
  }
  seasons: Record<string, SeasonData | null>
}

export interface ForecastReason {
  label: string
  edge_team: string
  detail: string
}

export interface TeamForecastEntry {
  team_win_pct: number
  opponent_win_pct: number
  weighted_win_pct: number
  reasons: ForecastReason[]
}

export interface TeamPredictionsData {
  generated_at: string
  season: string
  model: {
    name: string
    n_estimators: number
    max_depth: number | null
    feature_importances: Record<string, number>
  }
  forecasts: Record<string, Record<'home' | 'away', Record<string, TeamForecastEntry>>>
}
