import type { Shot } from '../types'

interface Props {
  shots: Shot[]
  teamColor: { primary: string }
}

export default function ShotZoneBreakdown({ shots, teamColor }: Props) {
  // Group by distance buckets
  const buckets = [
    { label: 'At Rim', range: '0–5 ft', test: (s: Shot) => s.shot_distance <= 5 },
    { label: 'Short Mid', range: '5–10 ft', test: (s: Shot) => s.shot_distance > 5 && s.shot_distance <= 10 },
    { label: 'Mid-Range', range: '10–16 ft', test: (s: Shot) => s.shot_distance > 10 && s.shot_distance <= 16 },
    { label: 'Long Mid', range: '16 ft–3pt', test: (s: Shot) => s.shot_distance > 16 && s.shot_distance <= 22 },
    { label: '3-Pointers', range: '23+ ft', test: (s: Shot) => s.shot_distance > 22 },
  ]

  const data = buckets.map(b => {
    const group = shots.filter(b.test)
    const made = group.filter(s => s.made).length
    return {
      label: b.label,
      range: b.range,
      total: group.length,
      made,
      pct: group.length > 0 ? (made / group.length) * 100 : 0,
      freq: group.length / shots.length * 100,
    }
  }).filter(d => d.total > 0)

  // Shot type breakdown (top 5)
  const types: Record<string, { made: number; total: number }> = {}
  const RENAME_MAP: Record<string, string> = {
    'Jump': 'Pull-Up Jumper',
    'Driving Floating': 'Driving Floater',
    'Turnaround Jump': 'Turnaround Jumper',
    'Step Back Jump': 'Step-Back Jumper',
    'Fadeaway Jump': 'Fadeaway Jumper',
    'Running Pull-Up Jump': 'Running Pull-Up',
  }
  for (const s of shots) {
    let t = s.shot_type.replace(/ Shot$/, '')
    t = RENAME_MAP[t] ?? t
    if (!types[t]) types[t] = { made: 0, total: 0 }
    types[t].total++
    if (s.made) types[t].made++
  }
  const topTypes = Object.entries(types)
    .map(([name, { made, total }]) => ({ name, made, total, pct: (made / total) * 100 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const maxTypeCount = Math.max(...topTypes.map(t => t.total), 1)

  const pctColor = (pct: number) => pct >= 50 ? '#16a34a' : pct >= 40 ? '#2563eb' : pct >= 30 ? '#d97706' : '#dc2626'

  return (
    <div className="rounded-2xl p-6 bg-white" style={{ border: `1px solid ${teamColor.primary}15` }}>
      <h3 className="text-lg font-semibold text-slate-800 mb-1" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>Shot Profile</h3>
      <p className="text-xs text-slate-400 mb-5">{shots.length} total shots this season</p>

      {/* Distance distribution */}
      <div className="mb-6">
        <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-3 font-semibold">Shooting by Distance</div>
        <div className="space-y-3">
          {data.map(d => (
            <div key={d.label}>
              <div className="flex items-baseline justify-between mb-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-medium text-slate-700">{d.label}</span>
                  <span className="text-[11px] text-slate-400">{d.range}</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-[12px] text-slate-500">{d.made}/{d.total}</span>
                  <span className="text-[13px] font-bold" style={{ color: pctColor(d.pct) }}>
                    {d.pct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative h-[18px] rounded-md bg-slate-100 overflow-hidden">
                  {/* frequency background */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-md"
                    style={{ width: `${d.freq}%`, background: teamColor.primary, opacity: 0.12 }}
                  />
                  {/* accuracy overlay */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-md transition-all"
                    style={{
                      width: `${d.freq * (d.pct / 100)}%`,
                      background: pctColor(d.pct),
                      opacity: 0.6,
                    }}
                  />
                </div>
                <span className="text-[11px] font-medium text-slate-500 w-[40px] text-right">{d.freq.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shot type breakdown */}
      <div>
        <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-3 font-semibold">Top Shot Types</div>
        <div className="space-y-2.5">
          {topTypes.map((t, i) => (
            <div key={t.name} className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-slate-400 w-[16px]">{i + 1}.</span>
              <span className="text-[12px] text-slate-700 w-[110px] shrink-0 truncate font-medium">{t.name}</span>
              <div className="flex-1 h-[14px] rounded-md bg-slate-100 overflow-hidden relative">
                <div
                  className="h-full rounded-md"
                  style={{ width: `${(t.total / maxTypeCount) * 100}%`, background: pctColor(t.pct), opacity: 0.4 }}
                />
              </div>
              <span className="text-[11px] text-slate-500 w-[28px] text-right font-medium">{t.total}</span>
              <span className="text-[12px] font-bold w-[40px] text-right" style={{ color: pctColor(t.pct) }}>
                {t.pct.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-4 flex-wrap">
        <span className="text-[10px] text-slate-400 font-medium">Accuracy:</span>
        <span className="flex items-center gap-1 text-[10px]"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#16a34a' }}></span><span className="text-slate-600">50%+</span></span>
        <span className="flex items-center gap-1 text-[10px]"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#2563eb' }}></span><span className="text-slate-600">40%+</span></span>
        <span className="flex items-center gap-1 text-[10px]"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#d97706' }}></span><span className="text-slate-600">30%+</span></span>
        <span className="flex items-center gap-1 text-[10px]"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#dc2626' }}></span><span className="text-slate-600">&lt;30%</span></span>
      </div>
    </div>
  )
}
