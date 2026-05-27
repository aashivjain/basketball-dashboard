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
    .sort((a, b) => b.total - a.total)

  const maxTotal = Math.max(...data.map(d => d.total), 1)

  return (
    <div className="rounded-2xl p-5 bg-white" style={{ border: `1px solid ${teamColor.primary}15` }}>
      <h3 className="text-sm font-medium text-slate-600 mb-4">Shot Zone Efficiency</h3>
      <div className="space-y-3">
        {data.map((d, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-600 font-medium truncate max-w-[140px]">{d.zone}</span>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-400">{d.made}/{d.total}</span>
                <span className="font-semibold min-w-[42px] text-right" style={{ color: d.pct >= 50 ? '#16a34a' : d.pct >= 35 ? teamColor.primary : '#dc2626' }}>
                  {d.pct.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="relative h-4 rounded-full bg-slate-100 overflow-hidden">
              {/* volume bar (how many shots from this zone) */}
              <div
                className="absolute inset-y-0 left-0 rounded-full opacity-20"
                style={{ width: `${(d.total / maxTotal) * 100}%`, background: teamColor.primary }}
              ></div>
              {/* accuracy bar */}
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all"
                style={{
                  width: `${d.pct}%`,
                  background: d.pct >= 50 ? '#16a34a' : d.pct >= 35 ? teamColor.primary : '#dc2626',
                  opacity: 0.7,
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-4 text-[10px] text-slate-400">
        <span>Bar fill = FG% · Background width = shot volume</span>
      </div>
    </div>
  )
}
