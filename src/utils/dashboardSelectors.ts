import type { LeaguePlayer, SeasonBlock, SeasonData, WnbaDashboardData } from '../types'
import { classifyPlayerPosition } from './playerPosition'

export function getAvailableSeasons(data: WnbaDashboardData) {
  return Object.keys(data.seasons).filter(season => data.seasons[season] !== null).sort()
}

export function getPlayersByTeam(allPlayers: LeaguePlayer[]) {
  const grouped: Record<string, LeaguePlayer[]> = {}
  for (const player of allPlayers) {
    if (!grouped[player.team]) grouped[player.team] = []
    grouped[player.team].push(player)
  }
  return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]))
}

export function getRosterById(seasonData: SeasonData | null) {
  const entries = seasonData?.roster ?? []
  return new Map(entries.map(player => [player.player_id, player]))
}

export function getGrowthData(data: WnbaDashboardData, availableSeasons: string[], playerId: number | null) {
  if (!playerId) return []
  return availableSeasons.map(season => {
    const seasonData = data.seasons[season]
    if (!seasonData) return null
    const allPlayerEntry = seasonData.regular_season.all_players?.find(player => player.player_id === playerId)
    if (allPlayerEntry) return { season, ...allPlayerEntry }
    const statEntry = seasonData.regular_season.stats.find(player => player.player_id === playerId)
    if (!statEntry) return null
    return { season, ...statEntry }
  }).filter(Boolean) as Array<{ season: string } & LeaguePlayer>
}

export function getPositionAverage(
  player: LeaguePlayer | null,
  allPlayers: LeaguePlayer[],
  rosterById: Map<number, { position: string }>
) {
  if (!player || allPlayers.length === 0) return null

  const classify = (candidate: LeaguePlayer) => classifyPlayerPosition(candidate, rosterById.get(candidate.player_id)?.position)
  const position = classify(player)
  const group = allPlayers.filter(candidate => classify(candidate) === position && candidate.gp >= 5)
  if (group.length === 0) return null

  const average = (key: 'pts' | 'reb' | 'ast' | 'stl' | 'blk') =>
    group.reduce((sum, candidate) => sum + candidate[key], 0) / group.length

  return {
    pts: average('pts'),
    reb: average('reb'),
    ast: average('ast'),
    stl: average('stl'),
    blk: average('blk'),
    label: position,
  }
}

export function getPlayerGames(block: SeasonBlock | null, playerId: number | null) {
  if (!playerId || !block) return []
  return block.game_logs[String(playerId)] ?? []
}

export function getPlayerShots(block: SeasonBlock | null, playerId: number | null) {
  if (!playerId || !block) return []
  return block.shot_charts[String(playerId)] ?? []
}
