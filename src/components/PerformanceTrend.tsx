import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import type { GameLog } from '../types'

interface Props {
  games: GameLog[]
  teamColor: { primary: string; secondary: string }
}

export default function PerformanceTrend({ games, teamColor }: Props) {
  // Reverse so oldest game is index 1 (left) → most recent is on the right
  const chronological = [...games].reverse()
  const chartData = chronological.map((g, i) => ({
    idx: i + 1,
    date: g.game_date,
    pts: g.pts,
    reb: g.reb,
    ast: g.ast,
    result: g.wl,
  }))

  return (
    <div className="rounded-2xl p-5 bg-white" style={{ border: `1px solid ${teamColor.primary}15` }}>
      <h3 className="text-sm font-medium text-slate-600 mb-3">Performance Trend</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ left: 0, right: 10, top: 5, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="idx" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip
            content={({ payload }) => {
              if (!payload?.length) return null
              const d = payload[0]?.payload
              return (
                <div className="bg-white rounded-lg shadow-lg border border-slate-100 p-2 text-xs">
                  <div className="font-medium text-slate-700">{d.date} ({d.result})</div>
                  <div>PTS: {d.pts} &middot; REB: {d.reb} &middot; AST: {d.ast}</div>
                </div>
              )
            }}
          />
          <Line type="monotone" dataKey="pts" stroke={teamColor.primary} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="reb" stroke={teamColor.secondary} strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
          <Line type="monotone" dataKey="ast" stroke="#94a3b8" strokeWidth={1} dot={false} strokeDasharray="2 2" />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-4 text-xs text-slate-400 mt-2">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{ background: teamColor.primary }}></span>PTS</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{ background: teamColor.secondary }}></span>REB</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block bg-slate-400"></span>AST</span>
      </div>
    </div>
  )
}
