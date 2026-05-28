import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from 'recharts'
import type { LeaguePlayer } from '../types'

interface Props {
  data: (LeaguePlayer & { season: string })[]
  playerName: string
  teamColor: { primary: string; secondary: string }
}

export default function GrowthChart({ data, playerName, teamColor }: Props) {
  // Calculate deltas for context
  const first = data[0]
  const last = data[data.length - 1]
  const ptsDelta = last.pts - first.pts

  return (
    <div className="rounded-2xl p-5 bg-white" style={{ border: `1px solid ${teamColor.primary}15` }}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium text-slate-600">Season-over-Season</h3>
        {data.length >= 2 && (
          <span className={`text-xs font-medium ${ptsDelta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {ptsDelta >= 0 ? '↑' : '↓'} {Math.abs(ptsDelta).toFixed(1)} PPG
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400 mb-3">{playerName}'s trajectory across {data.length} season{data.length > 1 ? 's' : ''}</p>
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
                <div className="bg-white rounded-lg shadow-lg border border-slate-100 p-3 text-xs">
                  <div className="font-semibold text-slate-700 mb-1">{d.season} · {d.team}</div>
                  <div className="space-y-0.5 text-slate-600">
                    <div>PTS: <span className="font-medium">{d.pts.toFixed(1)}</span> · REB: <span className="font-medium">{d.reb.toFixed(1)}</span> · AST: <span className="font-medium">{d.ast.toFixed(1)}</span></div>
                    <div>FG: {(d.fg_pct * 100).toFixed(1)}% · 3P: {(d.fg3_pct * 100).toFixed(1)}% · {d.gp} GP</div>
                  </div>
                </div>
              )
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px' }}
            formatter={(value: string) => <span className="text-slate-500 text-[11px]">{value.toUpperCase()}</span>}
          />
          <Line type="monotone" dataKey="pts" name="pts" stroke={teamColor.primary} strokeWidth={2.5} dot={{ r: 4, fill: teamColor.primary }} />
          <Line type="monotone" dataKey="reb" name="reb" stroke={teamColor.secondary} strokeWidth={1.8} dot={{ r: 3, fill: teamColor.secondary }} />
          <Line type="monotone" dataKey="ast" name="ast" stroke="#6366f1" strokeWidth={1.5} dot={{ r: 3, fill: '#6366f1' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
