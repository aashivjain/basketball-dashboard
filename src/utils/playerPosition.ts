import type { LeaguePlayer } from '../types'

export type PositionGroup = 'Guard' | 'Wing' | 'Big'

export function getPrimaryPositionGroup(position: string | null | undefined): PositionGroup | null {
  if (!position) return null
  const normalized = position.toUpperCase()
  if (normalized.includes('G')) return 'Guard'
  if (normalized.includes('F')) return 'Wing'
  if (normalized.includes('C')) return 'Big'
  return null
}

export function classifyPlayerPosition(
  player: LeaguePlayer,
  rosterPosition: string | null | undefined
): PositionGroup {
  const listedGroup = getPrimaryPositionGroup(rosterPosition)
  if (listedGroup) return listedGroup
  if (player.ast >= player.reb * 0.7 && player.reb < 6) return 'Guard'
  if (player.reb >= player.ast * 2.5 || player.reb >= 7) return 'Big'
  return 'Wing'
}
