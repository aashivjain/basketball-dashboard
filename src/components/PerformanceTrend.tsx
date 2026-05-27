import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useState } from 'react'
import type { GameLog } from '../types'

interface Props {
  games: GameLog[]
}

const METRICS = [
  { key: 'pts', label: 'PTS', color: '#f97316' },
  { key: 'reb', label: 'REB', color: '#4ade80' },
  { key: 'ast', label: 'AST', color: '#38bdf8' },
  { key: 'fg_pct', label: 'FG%', color: '#c084fc' },
] as const

type MetricKey = (typeof METRICS)[number]['key']

export default function PerformanceTrend({ games }: Props) {
  const [metric, setMetric] = useState<MetricKey>('pts')
  const active = METRICS.find(m => m.key === metric)!

  const chartData = [...games].reverse().map((g, i) => ({
    idx: i + 1,
    opp: g.matchup.split(' ').pop() ?? '',
    date: g.game_date,
    wl: g.wl,
    pts: g.pts,
    reb: g.reb,
    ast: g.ast,
    fg_pct: g.fg_pct,
  }))

  const vals = chartData.map(d => d[metric] as number)
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-zinc-200">Game-by-Game</h3>
        <div className="flex gap-1">
          {METRICS.map(m => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`px-2 py-0.5 rounded text-[11px] ${metric === m.key ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              style={metric === m.key ? { background: m.color + '22', color: m.color } : {}}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 5, right: 8, left: -15, bottom: 5 }}>
          <XAxis dataKey="opp" tick={{ fill: '#52525b', fontSize: 9 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: '#52525b', fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            domain={metric === 'fg_pct' ? [0, 1] : undefined}
            tickFormatter={metric === 'fg_pct' ? (v: number) => `${(v * 100).toFixed(0)}%` : undefined}
          />
          <ReferenceLine y={avg} stroke={active.color} strokeDasharray="3 3" strokeOpacity={0.4} />
          <Tooltip
            contentStyle={{ background: '#1c1c1c', border: '1px solid #333', borderRadius: '6px', fontSize: '11px' }}
            labelFormatter={(_, payload) => {
              if (payload?.[0]) {
                const d = payload[0].payload as Record<string, string>
                return `${d.date} (${d.wl === 'W' ? 'Win' : 'Loss'})`
              }
              return ''
            }}
            formatter={(value) => {
              const v = Number(value)
              if (metric === 'fg_pct') return [`${(v * 100).toFixed(1)}%`, active.label]
              return [v, active.label]
            }}
          />
          <Line type="monotone" dataKey={metric} stroke={active.color} strokeWidth={1.5} dot={{ r: 2.5, fill: active.color }} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>

      <p className="text-center text-[11px] text-zinc-500 mt-1">
        Avg: {metric === 'fg_pct' ? `${(avg * 100).toFixed(1)}%` : avg.toFixed(1)} {active.label}
      </p>
    </div>
  )
}
