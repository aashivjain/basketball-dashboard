import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { Shot } from '../types'
import { shotZoneAgg } from '../utils/stats'

interface Props {
  shots: Shot[]
}

export default function ShotZoneBreakdown({ shots }: Props) {
  const zones = shotZoneAgg(shots).sort((a, b) => b.total - a.total)

  const color = (p: number) => {
    if (p >= 0.5) return '#4ade80'
    if (p >= 0.4) return '#a3e635'
    if (p >= 0.33) return '#facc15'
    if (p >= 0.25) return '#fb923c'
    return '#f87171'
  }

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-5 h-full">
      <h3 className="text-sm font-medium text-zinc-200 mb-1">Shooting by Zone</h3>
      <p className="text-[11px] text-zinc-500 mb-3">FG% by court area</p>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={zones} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <XAxis type="number" domain={[0, 1]} tick={{ fill: '#71717a', fontSize: 10 }} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} axisLine={false} />
          <YAxis type="category" dataKey="zone" tick={{ fill: '#a1a1aa', fontSize: 10 }} width={100} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#1c1c1c', border: '1px solid #333', borderRadius: '6px', fontSize: '11px' }}
            formatter={(value, _name, props) => {
              const p = (props as unknown as { payload: { made: number; total: number } }).payload
              return [`${(Number(value) * 100).toFixed(1)}% (${p.made}/${p.total})`, 'FG%']
            }}
          />
          <Bar dataKey="pct" radius={[0, 3, 3, 0]}>
            {zones.map((z, i) => <Cell key={i} fill={color(z.pct)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
