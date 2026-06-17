import rawData from '../data/wnba_data.json'
import rawPredictions from '../data/team_predictions.json'
import type { LeaguePlayer, NewsArticle, NewsData, SeasonBlock, SeasonData, TeamPredictionsData, WnbaDashboardData } from '../types'

type ValidationResult<T> = {
  data: T
  issues: string[]
}

const EMPTY_BLOCK: SeasonBlock = {
  stats: [],
  league_averages: {
    pts: 0,
    reb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    fg_pct: 0,
    fg3_pct: 0,
    ft_pct: 0,
  },
  game_logs: {},
  shot_charts: {},
  all_players: [],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function hasLeaguePlayerShape(value: unknown): value is LeaguePlayer {
  if (!isRecord(value)) return false
  return typeof value.name === 'string'
    && typeof value.team === 'string'
    && isFiniteNumber(value.player_id)
    && isFiniteNumber(value.gp)
    && isFiniteNumber(value.min)
    && isFiniteNumber(value.pts)
    && isFiniteNumber(value.reb)
    && isFiniteNumber(value.ast)
    && isFiniteNumber(value.stl)
    && isFiniteNumber(value.blk)
    && isFiniteNumber(value.tov)
    && isFiniteNumber(value.fgm)
    && isFiniteNumber(value.fga)
    && isFiniteNumber(value.fg_pct)
    && isFiniteNumber(value.fg3m)
    && isFiniteNumber(value.fg3a)
    && isFiniteNumber(value.fg3_pct)
    && isFiniteNumber(value.ftm)
    && isFiniteNumber(value.fta)
    && isFiniteNumber(value.ft_pct)
    && isFiniteNumber(value.oreb)
    && isFiniteNumber(value.dreb)
    && isFiniteNumber(value.pf)
    && isFiniteNumber(value.plus_minus)
}

function sanitizeSeasonBlock(value: unknown): SeasonBlock {
  if (!isRecord(value)) return EMPTY_BLOCK

  const allPlayers = Array.isArray(value.all_players)
    ? value.all_players.filter(hasLeaguePlayerShape)
    : []

  return {
    stats: Array.isArray(value.stats) ? value.stats : [],
    league_averages: isRecord(value.league_averages)
      ? {
          pts: isFiniteNumber(value.league_averages.pts) ? value.league_averages.pts : 0,
          reb: isFiniteNumber(value.league_averages.reb) ? value.league_averages.reb : 0,
          ast: isFiniteNumber(value.league_averages.ast) ? value.league_averages.ast : 0,
          stl: isFiniteNumber(value.league_averages.stl) ? value.league_averages.stl : 0,
          blk: isFiniteNumber(value.league_averages.blk) ? value.league_averages.blk : 0,
          fg_pct: isFiniteNumber(value.league_averages.fg_pct) ? value.league_averages.fg_pct : 0,
          fg3_pct: isFiniteNumber(value.league_averages.fg3_pct) ? value.league_averages.fg3_pct : 0,
          ft_pct: isFiniteNumber(value.league_averages.ft_pct) ? value.league_averages.ft_pct : 0,
        }
      : EMPTY_BLOCK.league_averages,
    game_logs: isRecord(value.game_logs) ? (value.game_logs as Record<string, SeasonBlock['game_logs'][string]>) : {},
    shot_charts: isRecord(value.shot_charts) ? (value.shot_charts as Record<string, SeasonBlock['shot_charts'][string]>) : {},
    all_players: allPlayers,
  }
}

function sanitizeSeasonData(value: unknown): SeasonData | null {
  if (!isRecord(value)) return null
  return {
    roster: Array.isArray(value.roster) ? value.roster : [],
    regular_season: sanitizeSeasonBlock(value.regular_season),
    playoffs: sanitizeSeasonBlock(value.playoffs),
  }
}

function sanitizeNewsArticle(value: unknown): NewsArticle | null {
  if (!isRecord(value)) return null
  const imageUrl = value.image_url
  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.source !== 'string' ||
    typeof value.link !== 'string' ||
    typeof value.published_at !== 'string' ||
    typeof value.summary !== 'string' ||
    typeof value.category !== 'string' ||
    (imageUrl !== undefined && imageUrl !== null && typeof imageUrl !== 'string')
  ) {
    return null
  }

  if (!['General', 'Injuries', 'Discipline', 'Transactions'].includes(value.category)) {
    return null
  }

  return {
    id: value.id,
    title: value.title,
    source: value.source,
    link: value.link,
    published_at: value.published_at,
    category: value.category,
    summary: value.summary,
    ...(typeof imageUrl === 'string' && imageUrl ? { image_url: imageUrl } : {}),
  }
}

function sanitizeNewsData(value: unknown): NewsData | undefined {
  if (!isRecord(value) || typeof value.generated_at !== 'string' || !Array.isArray(value.articles)) {
    return undefined
  }

  return {
    generated_at: value.generated_at,
    articles: value.articles.map(sanitizeNewsArticle).filter(Boolean) as NewsArticle[],
  }
}

export function sanitizeDashboardData(source: unknown): ValidationResult<WnbaDashboardData> {
  const issues: string[] = []

  if (!isRecord(source)) {
    issues.push('Dashboard data was not a JSON object.')
    return {
      data: {
        team: { id: 0, name: 'WNBA', abbreviation: 'WNBA', current_season: '2026' },
        seasons: {},
      },
      issues,
    }
  }

  const team = isRecord(source.team) ? source.team : {}
  const seasonsSource = isRecord(source.seasons) ? source.seasons : {}
  const seasons = Object.fromEntries(
    Object.entries(seasonsSource).map(([season, seasonValue]) => [season, sanitizeSeasonData(seasonValue)])
  )

  for (const [season, seasonValue] of Object.entries(seasons)) {
    if (seasonValue === null) {
      issues.push(`Season ${season} is missing or invalid.`)
    }
  }

  const currentSeason = typeof team.current_season === 'string' && team.current_season in seasons
    ? team.current_season
    : Object.keys(seasons).sort().at(-1) ?? '2026'

  if (currentSeason !== team.current_season) {
    issues.push('Current season pointer was invalid and was replaced with the latest available season.')
  }

  return {
    data: {
      team: {
        id: isFiniteNumber(team.id) ? team.id : 0,
        name: typeof team.name === 'string' ? team.name : 'WNBA',
        abbreviation: typeof team.abbreviation === 'string' ? team.abbreviation : 'WNBA',
        current_season: currentSeason,
      },
      news: sanitizeNewsData(source.news),
      seasons,
    },
    issues,
  }
}

export function sanitizeTeamPredictions(
  source: unknown,
  validTeams: string[],
  expectedSeason: string
): ValidationResult<TeamPredictionsData | null> {
  const issues: string[] = []

  if (!isRecord(source) || !isRecord(source.forecasts) || typeof source.season !== 'string') {
    issues.push('Team prediction data is missing or malformed.')
    return { data: null, issues }
  }

  if (source.season !== expectedSeason) {
    issues.push(`Team predictions are for ${source.season}, not ${expectedSeason}.`)
    return { data: null, issues }
  }

  const forecasts = source.forecasts as Record<string, unknown>
  const availableTeams = validTeams.filter(team => team in forecasts)
  if (availableTeams.length < 2) {
    issues.push('Team predictions do not cover the current team pool.')
    return { data: null, issues }
  }

  return {
    data: source as unknown as TeamPredictionsData,
    issues,
  }
}

export function loadDashboardData(): ValidationResult<WnbaDashboardData> {
  return sanitizeDashboardData(rawData as unknown)
}

export function loadTeamPredictions(
  validTeams: string[],
  expectedSeason: string
): ValidationResult<TeamPredictionsData | null> {
  return sanitizeTeamPredictions(rawPredictions as unknown, validTeams, expectedSeason)
}
