import type { GameLog, LeaguePlayer, SeasonBlock } from '../types'

export interface TeamProfile {
  team: string
  players: LeaguePlayer[]
  corePlayers: LeaguePlayer[]
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

type TeamGameAggregate = {
  game_date: string
  matchup: string
  wl: string
  pts: number
  reb: number
  ast: number
  tov: number
  fgm: number
  fga: number
  fg3m: number
  fg3a: number
  ftm: number
  fta: number
  plus_minus: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value))
}

function average(values: number[], fallback = 0) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback
}

function parseGameDate(value: string) {
  const time = Date.parse(value)
  return Number.isNaN(time) ? 0 : time
}

function sortByRecent<T extends { game_date: string }>(games: T[]) {
  return [...games].sort((a, b) => parseGameDate(b.game_date) - parseGameDate(a.game_date))
}

function winPct(games: Array<{ wl: string }>) {
  if (!games.length) return 0.5
  return games.filter(game => game.wl === 'W').length / games.length
}

function aggregateTeamGames(team: string, block: SeasonBlock) {
  const teamPlayerIds = new Set(
    block.all_players
      .filter(player => player.team === team)
      .map(player => String(player.player_id))
  )

  const grouped = new Map<string, TeamGameAggregate>()

  for (const playerId of teamPlayerIds) {
    const logs = block.game_logs[playerId] ?? []
    for (const game of logs) {
      if (!game.matchup.startsWith(`${team} `)) {
        continue
      }
      const key = `${game.game_date}|${game.matchup}`
      if (!grouped.has(key)) {
        grouped.set(key, {
          game_date: game.game_date,
          matchup: game.matchup,
          wl: game.wl,
          pts: 0,
          reb: 0,
          ast: 0,
          tov: 0,
          fgm: 0,
          fga: 0,
          fg3m: 0,
          fg3a: 0,
          ftm: 0,
          fta: 0,
          plus_minus: 0,
        })
      }

      const row = grouped.get(key)!
      row.pts += game.pts
      row.reb += game.reb
      row.ast += game.ast
      row.tov += game.tov
      row.fgm += game.fgm
      row.fga += game.fga
      row.fg3m += game.fg3m
      row.fg3a += game.fg3a
      row.ftm += game.ftm
      row.fta += game.fta
      row.plus_minus += game.plus_minus
    }
  }

  return sortByRecent(Array.from(grouped.values())).map(game => ({
    game_date: game.game_date,
    matchup: game.matchup,
    wl: game.wl,
    min: 0,
    pts: game.pts,
    reb: game.reb,
    ast: game.ast,
    stl: 0,
    blk: 0,
    tov: game.tov,
    fgm: game.fgm,
    fga: game.fga,
    fg_pct: game.fga ? game.fgm / game.fga : 0,
    fg3m: game.fg3m,
    fg3a: game.fg3a,
    fg3_pct: game.fg3a ? game.fg3m / game.fg3a : 0,
    ftm: game.ftm,
    fta: game.fta,
    ft_pct: game.fta ? game.ftm / game.fta : 0,
    plus_minus: game.plus_minus,
  })) satisfies GameLog[]
}

export function buildTeamProfiles(block: SeasonBlock) {
  const teams = [...new Set(block.all_players.map(player => player.team))].sort()

  return teams.map(team => {
    const players = block.all_players
      .filter(player => player.team === team)
      .sort((a, b) => b.min - a.min)

    const corePlayers = players.slice(0, 8)
    const games = aggregateTeamGames(team, block)
    const recentGames = games.slice(0, 5)
    const homeGames = games.filter(game => game.matchup.includes('vs.'))
    const awayGames = games.filter(game => game.matchup.includes('@'))
    const wins = games.filter(game => game.wl === 'W').length
    const losses = games.length - wins

    return {
      team,
      players,
      corePlayers,
      weighted: {
        pts: average(games.map(game => game.pts), 80),
        reb: average(games.map(game => game.reb), 32),
        ast: average(games.map(game => game.ast), 18),
        tov: average(games.map(game => game.tov), 14),
        fg_pct: average(games.map(game => game.fg_pct), 0.43),
        fg3_pct: average(games.map(game => game.fg3_pct), 0.32),
        ft_pct: average(games.map(game => game.ft_pct), 0.78),
        plus_minus: average(games.map(game => game.plus_minus), 0),
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

export function buildTeamRankings(profiles: ReturnType<typeof buildTeamProfiles>) {
  // Rank all teams across both conferences by wins, then losses
  const sorted = [...profiles].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    if (a.losses !== b.losses) return a.losses - b.losses
    return a.team.localeCompare(b.team)
  })
  
  // Create map of team → overall rank (1-indexed)
  return new Map(sorted.map((profile, index) => [profile.team, index + 1]))
}

export function predictMatchup(teamA: TeamProfile, teamB: TeamProfile, gameContext: 'home' | 'away' = 'home') {
  const homeTeam = gameContext === 'home' ? teamA.team : teamB.team
  const awayTeam = gameContext === 'home' ? teamB.team : teamA.team

  const scoringEdge = (teamA.weighted.pts - teamB.weighted.pts) / 12
  const reboundingEdge = (teamA.weighted.reb - teamB.weighted.reb) / 8
  const playmakingEdge = (teamA.weighted.ast - teamB.weighted.ast) / 7
  const turnoverEdge = (teamB.weighted.tov - teamA.weighted.tov) / 6
  const fgEdge = (teamA.weighted.fg_pct - teamB.weighted.fg_pct) / 0.08
  const fg3Edge = (teamA.weighted.fg3_pct - teamB.weighted.fg3_pct) / 0.1
  const ftEdge = (teamA.weighted.ft_pct - teamB.weighted.ft_pct) / 0.12
  const marginEdge = (teamA.weighted.plus_minus - teamB.weighted.plus_minus) / 15
  const formEdge = (teamA.winPct - teamB.winPct) / 0.35
  const recentEdge = (teamA.recentWinPct - teamB.recentWinPct) / 0.45
  const venueEdge =
    (gameContext === 'home' ? 0.3 : -0.3) +
    (((gameContext === 'home' ? teamA.homeWinPct : teamA.awayWinPct) - (gameContext === 'home' ? teamB.awayWinPct : teamB.homeWinPct)) / 0.4)

  const teamAScore =
    scoringEdge * 1.1 +
    reboundingEdge * 0.65 +
    playmakingEdge * 0.75 +
    turnoverEdge * 0.85 +
    fgEdge * 1.1 +
    fg3Edge * 0.7 +
    ftEdge * 0.35 +
    marginEdge * 0.9 +
    formEdge * 1.2 +
    recentEdge * 0.7 +
    venueEdge * 0.55

  const teamBScore = -teamAScore

  const differential = teamAScore
  const teamAWinPct = clamp(sigmoid(differential * 0.15) * 100, 22, 78)
  const teamBWinPct = 100 - teamAWinPct

  const reasons: PredictionReason[] = [
    {
      label: 'Form',
      edge: `${(teamA.winPct * 100).toFixed(0)}% vs ${(teamB.winPct * 100).toFixed(0)}%`,
      impact: formEdge * 1.2 + recentEdge * 0.7,
    },
    {
      label: 'Scoring',
      edge: `${teamA.weighted.pts.toFixed(1)} vs ${teamB.weighted.pts.toFixed(1)} PPG`,
      impact: scoringEdge * 1.1,
    },
    {
      label: 'Shooting',
      edge: `${(teamA.weighted.fg_pct * 100).toFixed(1)}% vs ${(teamB.weighted.fg_pct * 100).toFixed(1)}% FG`,
      impact: fgEdge * 1.1 + fg3Edge * 0.7,
    },
    {
      label: 'Possession',
      edge: `${teamA.weighted.reb.toFixed(1)} REB / ${teamA.weighted.tov.toFixed(1)} TOV vs ${teamB.weighted.reb.toFixed(1)} / ${teamB.weighted.tov.toFixed(1)}`,
      impact: reboundingEdge * 0.65 + turnoverEdge * 0.85,
    },
    {
      label: 'Venue',
      edge: gameContext === 'home'
        ? `${teamA.team} home ${(teamA.homeWinPct * 100).toFixed(0)}% vs ${teamB.team} road ${(teamB.awayWinPct * 100).toFixed(0)}%`
        : `${teamA.team} road ${(teamA.awayWinPct * 100).toFixed(0)}% vs ${teamB.team} home ${(teamB.homeWinPct * 100).toFixed(0)}%`,
      impact: venueEdge * 0.55,
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
