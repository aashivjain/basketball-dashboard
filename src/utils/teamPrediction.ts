import type { GameLog, LeaguePlayer, SeasonBlock } from '../types'

export interface TeamProfile {
  team: string
  players: LeaguePlayer[]
  corePlayers: LeaguePlayer[]
  averageMinutes: number
  weighted: {
    pts: number
    reb: number
    ast: number
    tov: number
    fg_pct: number
    fg3_pct: number
    ft_pct: number
    plus_minus: number
  }
  games: GameLog[]
  wins: number
  losses: number
  winPct: number
  recentWinPct: number
  homeWinPct: number
  awayWinPct: number
}

export interface PredictionReason {
  label: string
  edge: string
  impact: number
}

export interface MatchupPrediction {
  homeTeam: string
  awayTeam: string
  teamA: string
  teamB: string
  teamAWinPct: number
  teamBWinPct: number
  favorite: string
  favoriteWinPct: number
  underdogWinPct: number
  reasons: PredictionReason[]
  teamAScore: number
  teamBScore: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function parseGameDate(value: string) {
  const time = Date.parse(value)
  return Number.isNaN(time) ? 0 : time
}

function sortByRecent(games: GameLog[]) {
  return [...games].sort((a, b) => parseGameDate(b.game_date) - parseGameDate(a.game_date))
}

function winPct(games: GameLog[]) {
  if (!games.length) return 0.5
  return games.filter(game => game.wl === 'W').length / games.length
}

function teamGames(team: string, block: SeasonBlock) {
  const teamPlayers = block.all_players
    .filter(player => player.team === team)
    .sort((a, b) => b.gp - a.gp || b.min - a.min)

  const primaryPlayer = teamPlayers[0]
  if (!primaryPlayer) return []

  return sortByRecent(block.game_logs[String(primaryPlayer.player_id)] ?? [])
}

export function buildTeamProfiles(block: SeasonBlock) {
  const teams = [...new Set(block.all_players.map(player => player.team))].sort()

  return teams.map(team => {
    const players = block.all_players
      .filter(player => player.team === team)
      .sort((a, b) => b.min - a.min)

    const corePlayers = players.slice(0, 8)
    const averageMinutes = average(corePlayers.map(player => player.min)) || 1

    const weightedAverage = (key: keyof Pick<LeaguePlayer, 'pts' | 'reb' | 'ast' | 'tov' | 'fg_pct' | 'fg3_pct' | 'ft_pct' | 'plus_minus'>) =>
      corePlayers.reduce((sum, player) => sum + player[key] * player.min, 0) / corePlayers.reduce((sum, player) => sum + player.min, 0)

    const games = teamGames(team, block)
    const wins = games.filter(game => game.wl === 'W').length
    const losses = games.length - wins
    const recentGames = games.slice(0, 5)
    const homeGames = games.filter(game => game.matchup.includes('vs.'))
    const awayGames = games.filter(game => game.matchup.includes('@'))

    return {
      team,
      players,
      corePlayers,
      averageMinutes,
      weighted: {
        pts: weightedAverage('pts'),
        reb: weightedAverage('reb'),
        ast: weightedAverage('ast'),
        tov: weightedAverage('tov'),
        fg_pct: weightedAverage('fg_pct'),
        fg3_pct: weightedAverage('fg3_pct'),
        ft_pct: weightedAverage('ft_pct'),
        plus_minus: weightedAverage('plus_minus'),
      },
      games,
      wins,
      losses,
      winPct: winPct(games),
      recentWinPct: winPct(recentGames),
      homeWinPct: winPct(homeGames),
      awayWinPct: winPct(awayGames),
    } satisfies TeamProfile
  })
}

export function predictMatchup(
  teamA: TeamProfile,
  teamB: TeamProfile,
  gameContext: 'home' | 'away' = 'home'
) {
  const homeTeam = gameContext === 'home' ? teamA.team : teamB.team
  const awayTeam = gameContext === 'home' ? teamB.team : teamA.team

  const teamABase =
    teamA.weighted.plus_minus * 6 +
    teamA.weighted.pts * 1.2 +
    teamA.weighted.reb * 0.9 +
    teamA.weighted.ast * 1.4 -
    teamA.weighted.tov * 1.3 +
    teamA.weighted.fg_pct * 100 * 0.8 +
    teamA.weighted.fg3_pct * 100 * 0.45 +
    teamA.weighted.ft_pct * 100 * 0.15

  const teamBBase =
    teamB.weighted.plus_minus * 6 +
    teamB.weighted.pts * 1.2 +
    teamB.weighted.reb * 0.9 +
    teamB.weighted.ast * 1.4 -
    teamB.weighted.tov * 1.3 +
    teamB.weighted.fg_pct * 100 * 0.8 +
    teamB.weighted.fg3_pct * 100 * 0.45 +
    teamB.weighted.ft_pct * 100 * 0.15

  const teamAVenueBoost = gameContext === 'home'
    ? (teamA.homeWinPct - teamA.awayWinPct) * 20 + 4
    : (teamA.awayWinPct - teamA.homeWinPct) * 20 - 4

  const teamBVenueBoost = gameContext === 'away'
    ? (teamB.homeWinPct - teamB.awayWinPct) * 20 + 4
    : (teamB.awayWinPct - teamB.homeWinPct) * 20 - 4

  const teamARecentBoost = (teamA.recentWinPct - teamA.winPct) * 18
  const teamBRecentBoost = (teamB.recentWinPct - teamB.winPct) * 18

  const teamAScore = teamABase + teamAVenueBoost + teamARecentBoost
  const teamBScore = teamBBase + teamBVenueBoost + teamBRecentBoost

  const differential = teamAScore - teamBScore
  const teamAWinPct = clamp(50 + differential * 1.35, 8, 92)
  const teamBWinPct = 100 - teamAWinPct

  const reasons: PredictionReason[] = [
    {
      label: 'Season form',
      edge: `${(teamA.winPct * 100).toFixed(0)}% win rate vs ${(teamB.winPct * 100).toFixed(0)}%`,
      impact: (teamA.winPct - teamB.winPct) * 100,
    },
    {
      label: 'Recent momentum',
      edge: `Last 5: ${(teamA.recentWinPct * 100).toFixed(0)}% vs ${(teamB.recentWinPct * 100).toFixed(0)}%`,
      impact: (teamA.recentWinPct - teamB.recentWinPct) * 100,
    },
    {
      label: 'Shot quality',
      edge: `${(teamA.weighted.fg_pct * 100).toFixed(1)} FG% / ${(teamA.weighted.fg3_pct * 100).toFixed(1)} 3P% vs ${(teamB.weighted.fg_pct * 100).toFixed(1)} / ${(teamB.weighted.fg3_pct * 100).toFixed(1)}`,
      impact: (teamA.weighted.fg_pct - teamB.weighted.fg_pct) * 120 + (teamA.weighted.fg3_pct - teamB.weighted.fg3_pct) * 70,
    },
    {
      label: 'Creation vs turnovers',
      edge: `${teamA.weighted.ast.toFixed(1)} AST and ${teamA.weighted.tov.toFixed(1)} TOV vs ${teamB.weighted.ast.toFixed(1)} / ${teamB.weighted.tov.toFixed(1)}`,
      impact: (teamA.weighted.ast - teamB.weighted.ast) * 6 - (teamA.weighted.tov - teamB.weighted.tov) * 5,
    },
    {
      label: 'Glass and margin',
      edge: `${teamA.weighted.reb.toFixed(1)} REB and ${teamA.weighted.plus_minus.toFixed(1)} +/- vs ${teamB.weighted.reb.toFixed(1)} / ${teamB.weighted.plus_minus.toFixed(1)}`,
      impact: (teamA.weighted.reb - teamB.weighted.reb) * 4 + (teamA.weighted.plus_minus - teamB.weighted.plus_minus) * 8,
    },
  ]
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 3)

  const favorite = teamAWinPct >= teamBWinPct ? teamA.team : teamB.team

  return {
    homeTeam,
    awayTeam,
    teamA: teamA.team,
    teamB: teamB.team,
    teamAWinPct,
    teamBWinPct,
    favorite,
    favoriteWinPct: favorite === teamA.team ? teamAWinPct : teamBWinPct,
    underdogWinPct: favorite === teamA.team ? teamBWinPct : teamAWinPct,
    reasons,
    teamAScore,
    teamBScore,
  } satisfies MatchupPrediction
}
