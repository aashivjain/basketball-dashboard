import type { Shot } from '../types'

interface Props {
  shots: Shot[]
  teamColor: { primary: string }
}

export default function ShotZoneBreakdown({ shots, teamColor }: Props) {
  // Group by distance buckets
  const buckets = [
    { label: '0-5 ft', test: (s: Shot) => s.shot_distance <= 5 },
    { label: '5-10 ft', test: (s: Shot) => s.shot_distance > 5 && s.shot_distance <= 10 },
    { label: '10-16 ft', test: (s: Shot) => s.shot_distance > 10 && s.shot_distance <= 16 },
    { label: '16-3pt', test: (s: Shot) => s.shot_distance > 16 && s.shot_distance <= 22 },
    { label: '3-Pointers', test: (s: Shot) => s.shot_distance > 22 },
  ]

  const data = buckets.map(b => {
    const group = shots.filter(b.test)
    const made = group.filter(s => s.made).length
    return {
      label: b.label,
      total: group.length,
      made,
      pct: group.length > 0 ? (made / group.length) * 100 : 0,
      freq: group.length / shots.length * 100,
    }
  }).filter(d => d.total > 0)

  const maxFreq = Math.max(...data.map(d => d.freq), 1)

  // Shot type breakdown (top 5)
  const types: Record<string, { made: number; total: number }> = {}
  for (const s of shots) {
    const t = s.shot_type.replace(/ Shot$/, '')
    if (!types[t]) types[t] = { made: 0, total: 0 }
    types[t].total++
    if (s.made) types[t].made++
  }
  const topTypes = Object.entries(types)
    .map(([name, { made, total }]) => ({ name, made, total, pct: (made / total) * 100 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const maxTypeCount = Math.max(...topTypes.map(t => t.total), 1)

  return (
    <div className="rounded-2xl p-5 bg-white" style={{ border: `1px solid ${teamColor.primary}15` }}>
      <h3 className="text-sm font-medium text-slate-600 mb-4">Shot Profile</h3>

      {/* Distance distribution */}
      <div className="mb-5">
        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-medium">By Distance</div>
        <div className="space-y-2">
          {data.map(d => (
            <div key={d.label} className="flex items-center gap-3">
              <span className="text-[11px] text-slate-500 w-[60px] shrink-0">{d.label}</span>
              <div className="flex-1 relative h-5 rounded bg-slate-50 overflow-hidden">
                {/* frequency bar */}
                <div
                  className="absolute inset-y-0 left-0 rounded"
                  style={{ width: `${(d.freq / maxFreq) * 100}%`, background: teamColor.primary, opacity: 0.15 }}
                />
                {/* accuracy fill */}
                <div
                  className="absolute inset-y-0 left-0 rounded transition-all"
                  style={{
                    width: `${(d.freq / maxFreq) * (d.pct / 100) * 100}%`,
                    background: d.pct >= 50 ? '#16a34a' : d.pct >= 35 ? teamColor.primary : '#ef4444',
                    opacity: 0.7,
                  }}
                />
                <div className="absolute inset-0 flex items-center px-2 justify-between">
                  <span className="text-[10px] font-medium text-slate-600">{d.made}/{d.total}</span>
                  <span className="text-[10px] font-bold" style={{ color: d.pct >= 50 ? '#16a34a' : d.pct >= 35 ? '#334155' : '#ef4444' }}>
                    {d.pct.toFixed(0)}%
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 w-[32px] text-right">{d.freq.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Shot type breakdown */}
      <div>
        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-medium">Top Shot Types</div>
        <div className="space-y-1.5">
          {topTypes.map(t => (
            <div key={t.name} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-[100px] shrink-0 truncate">{t.name}</span>
              <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(t.total / maxTypeCount) * 100}%`, background: teamColor.primary, opacity: 0.5 }}
                />
              </div>
              <span className="text-[10px] text-slate-500 w-[30px] text-right">{t.total}</span>
              <span className="text-[10px] font-medium w-[34px] text-right" style={{ color: t.pct >= 50 ? '#16a34a' : t.pct >= 35 ? '#334155' : '#ef4444' }}>
                {t.pct.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
