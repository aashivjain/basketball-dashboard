import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import type { Shot } from '../types'

interface Props {
  shots: Shot[]
  teamColor: { primary: string }
}

export default function ShotZoneBreakdown({ shots, teamColor }: Props) {
  const zones: Record<string, { made: number; total: number }> = {}
  for (const s of shots) {
    const zone = s.shot_zone || 'Unknown'
    if (!zones[zone]) zones[zone] = { made: 0, total: 0 }
    zones[zone].total++
    if (s.made) zones[zone].made++
  }

  const data = Object.entries(zones)
    .map(([zone, { made, total }]) => ({
      zone: zone.replace(/\s*\(.*\)/, ''),
      pct: total > 0 ? (made / total) * 100 : 0,
      made,
      total,
    }))
    .sort((a, b) => b.pct - a.pct)

  return (
    <div className="rounded-2xl p-5 bg-white" style={{ border: `1px solid ${teamColor.primary}15` }}>
      <h3 className="text-sm font-medium text-slate-600 mb-3">Shot Zone Efficiency</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="zone" tick={{ fontSize: 10, fill: '#64748b' }} width={100} axisLine={false} tickLine={false} />
          <Tooltip
            content={({ payload }) => {
              if (!payload?.length) return null
              const d = payload[0]?.payload
              return (
                <div className="bg-white rounded-lg shadow-lg border border-slate-100 p-2 text-xs">
                  <div className="font-medium text-slate-700">{d.zone}</div>
                  <div className="text-slate-500">{d.made}/{d.total} ({d.pct.toFixed(1)}%)</div>
                </div>
              )
            }}
          />
          <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={teamColor.primary} opacity={0.2 + (0.8 * (data.length - i) / data.length)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
