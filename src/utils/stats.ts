import type { PlayerStats, LeagueAverages } from '../types'

export function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals)
}

export function pct(n: number): string {
  if (!n && n !== 0) return '-'
  return (n * 100).toFixed(1)
}

// builds radar data — stats are already per-game from the API
export function buildRadarData(stats: PlayerStats, league: LeagueAverages) {
  return [
    { label: 'PTS', player: stats.pts, league: league.pts },
    { label: 'REB', player: stats.reb, league: league.reb },
    { label: 'AST', player: stats.ast, league: league.ast },
    { label: 'STL', player: stats.stl, league: league.stl },
    { label: 'BLK', player: stats.blk, league: league.blk },
  ]
}

export function shotZoneAgg(shots: { made: boolean; shot_zone: string }[]) {
  const zones: Record<string, { made: number; total: number }> = {}
  for (const s of shots) {
    if (!zones[s.shot_zone]) zones[s.shot_zone] = { made: 0, total: 0 }
    zones[s.shot_zone].total++
    if (s.made) zones[s.shot_zone].made++
  }
  return Object.entries(zones).map(([zone, d]) => ({
    zone,
    made: d.made,
    total: d.total,
    pct: d.total > 0 ? d.made / d.total : 0,
  }))
}
