import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'
import type { LeaguePlayer, LeagueAverages } from '../types'

interface PositionAvg {
  pts: number; reb: number; ast: number; stl: number; blk: number; label: string
}

interface Props {
  player: LeaguePlayer
  leagueAvg: LeagueAverages
  positionAvg?: PositionAvg | null
  teamColor: { primary: string; secondary: string }
  compareStats?: LeaguePlayer | null
  compareName?: string
}

export default function StatsRadar({ player, leagueAvg, positionAvg, teamColor, compareStats, compareName }: Props) {
  const categories = [
    { key: 'pts', label: 'PTS', max: 30 },
    { key: 'reb', label: 'REB', max: 12 },
    { key: 'ast', label: 'AST', max: 10 },
    { key: 'stl', label: 'STL', max: 3 },
    { key: 'blk', label: 'BLK', max: 3 },
  ] as const

  const chartData = categories.map(cat => {
    const playerVal = player[cat.key]
    const leagueVal = leagueAvg[cat.key]
    const posVal = positionAvg ? positionAvg[cat.key] : null
    const normalized = (val: number) => Math.min(100, (val / cat.max) * 100)
    return {
      stat: cat.label,
      player: normalized(playerVal),
      league: normalized(leagueVal),
      ...(posVal !== null ? { position: normalized(posVal) } : {}),
      playerRaw: playerVal.toFixed(1),
      leagueRaw: leagueVal.toFixed(1),
      posRaw: posVal !== null ? posVal.toFixed(1) : null,
      ...(compareStats ? { compare: normalized(compareStats[cat.key]), compareRaw: compareStats[cat.key].toFixed(1) } : {}),
    }
  })

  return (
    <div className="h-full rounded-2xl p-5 bg-white flex flex-col" style={{ border: `1px solid ${teamColor.primary}15` }}>
      <div className="flex items-center gap-4 mb-2 text-xs flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: teamColor.primary }}></div>
          <span className="text-slate-500">{player.name}</span>
        </div>
        {positionAvg && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: '#8b5cf6' }}></div>
            <span className="text-slate-500">{positionAvg.label} Avg</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }}></div>
          <span className="text-slate-500">League Avg</span>
        </div>
        {compareStats && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: teamColor.secondary }}></div>
            <span className="text-slate-500">{compareName}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="stat" tick={{ fontSize: 11, fill: '#64748b' }} />
            <Radar name="League Avg" dataKey="league" stroke="#f59e0b" strokeDasharray="3 3" fill="#f59e0b" fillOpacity={0.04} />
            {positionAvg && (
              <Radar name={`${positionAvg.label} Avg`} dataKey="position" stroke="#8b5cf6" strokeDasharray="5 3" fill="#8b5cf6" fillOpacity={0.05} strokeWidth={1.5} />
            )}
            <Radar name={player.name} dataKey="player" stroke={teamColor.primary} fill={teamColor.primary} fillOpacity={0.12} strokeWidth={2} />
            {compareStats && (
              <Radar name={compareName} dataKey="compare" stroke={teamColor.secondary} fill={teamColor.secondary} fillOpacity={0.06} strokeWidth={1.5} />
            )}
            <Tooltip
              content={({ payload }) => {
                if (!payload?.length) return null
                const d = payload[0]?.payload
                return (
                  <div className="bg-white rounded-lg shadow-lg border border-slate-100 p-3 text-xs">
                    <div className="font-medium text-slate-700 mb-1">{d.stat}</div>
                    <div style={{ color: teamColor.primary }}>{player.name}: {d.playerRaw}</div>
                    {d.posRaw && <div style={{ color: '#8b5cf6' }}>{positionAvg?.label} Avg: {d.posRaw}</div>}
                    <div style={{ color: '#f59e0b' }}>League: {d.leagueRaw}</div>
                    {d.compareRaw && <div style={{ color: teamColor.secondary }}>{compareName}: {d.compareRaw}</div>}
                  </div>
                )
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
