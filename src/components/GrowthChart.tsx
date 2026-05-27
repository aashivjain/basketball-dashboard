import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useState } from 'react'
import type { PlayerStats } from '../types'

interface Props {
  data: (PlayerStats & { season: string })[]
  playerName: string
}

const METRICS = [
  { key: 'pts', label: 'PTS', color: '#f97316' },
  { key: 'reb', label: 'REB', color: '#4ade80' },
  { key: 'ast', label: 'AST', color: '#38bdf8' },
  { key: 'fg_pct', label: 'FG%', color: '#c084fc' },
  { key: 'fg3_pct', label: '3P%', color: '#fbbf24' },
] as const

type Key = (typeof METRICS)[number]['key']

export default function GrowthChart({ data, playerName }: Props) {
  const [metric, setMetric] = useState<Key>('pts')
  const active = METRICS.find(m => m.key === metric)!
  const isPct = metric === 'fg_pct' || metric === 'fg3_pct'

  const chartData = data.map(d => ({
    season: d.season,
    value: d[metric],
  }))

  // calculate growth
  const first = chartData[0]?.value ?? 0
  const last = chartData[chartData.length - 1]?.value ?? 0
  const diff = last - first
  const diffStr = isPct
    ? `${diff > 0 ? '+' : ''}${(diff * 100).toFixed(1)}%`
    : `${diff > 0 ? '+' : ''}${diff.toFixed(1)}`

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-zinc-200">Year-over-Year Growth</h3>
          <p className="text-[11px] text-zinc-500">{playerName} &middot; Regular season per-game averages</p>
        </div>
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

      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
          <XAxis dataKey="season" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: '#52525b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={isPct ? [0, 'auto'] : undefined}
            tickFormatter={isPct ? (v: number) => `${(v * 100).toFixed(0)}%` : undefined}
          />
          <Tooltip
            contentStyle={{ background: '#1c1c1c', border: '1px solid #333', borderRadius: '6px', fontSize: '11px' }}
            formatter={(v) => [isPct ? `${(Number(v) * 100).toFixed(1)}%` : Number(v).toFixed(1), active.label]}
          />
          <Line type="monotone" dataKey="value" stroke={active.color} strokeWidth={2} dot={{ r: 4, fill: active.color }} />
        </LineChart>
      </ResponsiveContainer>

      <p className="text-center text-[11px] text-zinc-500 mt-1">
        Change since {chartData[0]?.season}: <span className={diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-zinc-400'}>{diffStr}</span>
      </p>
    </div>
  )
}
