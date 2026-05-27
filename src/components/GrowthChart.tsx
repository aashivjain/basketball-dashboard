import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import type { PlayerStats } from '../types'

interface Props {
  data: (PlayerStats & { season: string })[]
  playerName: string
  teamColor: { primary: string; secondary: string }
}

export default function GrowthChart({ data, playerName, teamColor }: Props) {
  return (
    <div className="rounded-2xl p-5 bg-white" style={{ border: `1px solid ${teamColor.primary}15` }}>
      <h3 className="text-sm font-medium text-slate-600 mb-1">Season-over-Season</h3>
      <p className="text-xs text-slate-400 mb-3">{playerName}'s growth trajectory</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ left: 0, right: 10, top: 5, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="season" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip
            content={({ payload }) => {
              if (!payload?.length) return null
              const d = payload[0]?.payload
              return (
                <div className="bg-white rounded-lg shadow-lg border border-slate-100 p-2 text-xs">
                  <div className="font-medium text-slate-700">{d.season}</div>
                  <div>PTS: {d.pts.toFixed(1)} &middot; REB: {d.reb.toFixed(1)} &middot; AST: {d.ast.toFixed(1)}</div>
                </div>
              )
            }}
          />
          <Line type="monotone" dataKey="pts" stroke={teamColor.primary} strokeWidth={2.5} dot={{ r: 4, fill: teamColor.primary }} />
          <Line type="monotone" dataKey="reb" stroke={teamColor.secondary} strokeWidth={1.5} dot={{ r: 3, fill: teamColor.secondary }} />
          <Line type="monotone" dataKey="ast" stroke="#94a3b8" strokeWidth={1} dot={{ r: 2, fill: '#94a3b8' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
