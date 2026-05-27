import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Legend, Tooltip,
} from 'recharts'
import type { PlayerStats, LeagueAverages } from '../types'
import { buildRadarData } from '../utils/stats'

interface Props {
  stats: PlayerStats
  leagueAvg: LeagueAverages
  compareStats?: PlayerStats | null
  compareName?: string
}

export default function StatsRadar({ stats, leagueAvg, compareStats, compareName }: Props) {
  const raw = buildRadarData(stats, leagueAvg)

  // normalize to 0-100 relative to reasonable max values for WNBA
  const caps: Record<string, number> = { PTS: 28, REB: 12, AST: 10, STL: 3, BLK: 4 }

  const chartData = raw.map(d => {
    const cap = caps[d.label] || 20
    const entry: Record<string, unknown> = {
      label: d.label,
      player: Math.min((d.player / cap) * 100, 100),
      league: Math.min((d.league / cap) * 100, 100),
      playerRaw: d.player.toFixed(1),
      leagueRaw: d.league.toFixed(1),
    }
    if (compareStats) {
      const compRaw = buildRadarData(compareStats, leagueAvg)
      const match = compRaw.find(c => c.label === d.label)
      if (match) {
        entry.compare = Math.min((match.player / cap) * 100, 100)
        entry.compareRaw = match.player.toFixed(1)
      }
    }
    return entry
  })

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-5 h-full">
      <h3 className="text-sm font-medium text-zinc-200 mb-1">Per-Game vs League Average</h3>
      <p className="text-[11px] text-zinc-500 mb-3">All values are per game. Dashed = league avg among qualified starters.</p>

      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid stroke="#2a2a2a" />
          <PolarAngleAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar name="Player" dataKey="player" stroke="#f97316" fill="#f97316" fillOpacity={0.15} strokeWidth={2} />
          <Radar name="League Avg" dataKey="league" stroke="#555" fill="transparent" strokeWidth={1.5} strokeDasharray="4 3" />
          {compareStats && (
            <Radar name={compareName || 'Compare'} dataKey="compare" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.08} strokeWidth={1.5} />
          )}
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Tooltip
            contentStyle={{ background: '#1c1c1c', border: '1px solid #333', borderRadius: '6px', fontSize: '11px' }}
            formatter={(_value, name, props) => {
              const p = props.payload as Record<string, string>
              if (name === 'Player') return [p.playerRaw, 'Player']
              if (name === 'League Avg') return [p.leagueRaw, 'League Avg']
              return [p.compareRaw, compareName || 'Compare']
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
