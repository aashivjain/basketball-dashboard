import { useState } from 'react'
import type { Shot } from '../types'

interface Props {
  shots: Shot[]
  teamColor: { primary: string; secondary: string }
}

type ViewMode = 'dots' | 'zones'

// Zone definitions for bucketing shots
const ZONE_DEFS = [
  { name: 'Restricted Area', test: (s: Shot) => s.shot_zone === 'Restricted Area' },
  { name: 'Paint (Non-RA)', test: (s: Shot) => s.shot_zone === 'In The Paint (Non-RA)' },
  { name: 'Mid-Range', test: (s: Shot) => s.shot_zone === 'Mid-Range' },
  { name: 'Left Corner 3', test: (s: Shot) => s.shot_zone === 'Left Corner 3' },
  { name: 'Right Corner 3', test: (s: Shot) => s.shot_zone === 'Right Corner 3' },
  { name: 'Above Break 3', test: (s: Shot) => s.shot_zone === 'Above the Break 3' },
  { name: 'Backcourt', test: (s: Shot) => s.shot_zone === 'Backcourt' },
]

function getZoneColor(pct: number): string {
  if (pct >= 55) return '#15803d'  // dark green
  if (pct >= 45) return '#22c55e'  // green
  if (pct >= 35) return '#86efac'  // light green
  if (pct >= 25) return '#fbbf24'  // amber
  return '#ef4444'                  // red
}

export default function ShotChart({ shots, teamColor }: Props) {
  const [mode, setMode] = useState<ViewMode>('dots')

  if (shots.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: '#f5f0e8', border: '1px solid #e8dcc8' }}>
        <p className="text-slate-400 text-sm italic">No shot chart data available</p>
      </div>
    )
  }

  const made = shots.filter(s => s.made)
  const missed = shots.filter(s => !s.made)
  const fgPct = shots.length > 0 ? ((made.length / shots.length) * 100).toFixed(1) : '0'

  // Compute zone stats for heatmap mode
  const zoneStats = ZONE_DEFS.map(z => {
    const zoneShots = shots.filter(z.test)
    const zoneMade = zoneShots.filter(s => s.made)
    return {
      name: z.name,
      made: zoneMade.length,
      total: zoneShots.length,
      pct: zoneShots.length > 0 ? (zoneMade.length / zoneShots.length) * 100 : 0,
      shots: zoneShots,
    }
  }).filter(z => z.total > 0)

  return (
    <div className="rounded-2xl p-5 bg-white" style={{ border: `1px solid ${teamColor.primary}15` }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-600">Shot Chart</h3>
        <div className="flex items-center gap-3">
          {/* Toggle */}
          <div className="flex rounded-full overflow-hidden border border-slate-200 text-[11px]">
            <button
              onClick={() => setMode('dots')}
              className="px-3 py-1 transition-all"
              style={{ background: mode === 'dots' ? teamColor.primary : 'white', color: mode === 'dots' ? '#fff' : '#64748b' }}
            >Dots</button>
            <button
              onClick={() => setMode('zones')}
              className="px-3 py-1 transition-all"
              style={{ background: mode === 'zones' ? teamColor.primary : 'white', color: mode === 'zones' ? '#fff' : '#64748b' }}
            >Zones</button>
          </div>
          <span className="text-xs text-slate-400">{fgPct}% FG</span>
        </div>
      </div>

      {/* Legend */}
      {mode === 'dots' ? (
        <div className="flex items-center gap-4 text-xs mb-2">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>Made ({made.length})</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"></span>Missed ({missed.length})</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[10px] mb-2">
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm inline-block" style={{ background: '#15803d' }}></span>55%+</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm inline-block" style={{ background: '#22c55e' }}></span>45%+</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm inline-block" style={{ background: '#86efac' }}></span>35%+</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm inline-block" style={{ background: '#fbbf24' }}></span>25%+</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm inline-block" style={{ background: '#ef4444' }}></span>&lt;25%</span>
        </div>
      )}

      <svg viewBox="0 0 500 470" className="w-full overflow-hidden rounded-xl">
        {/* wooden court background */}
        <defs>
          <pattern id="wood-grain" patternUnits="userSpaceOnUse" width="200" height="200">
            <rect width="200" height="200" fill="#c9a66b" />
            <path d="M0 10 Q50 8 100 12 T200 10" stroke="#b8935a" strokeWidth="0.5" fill="none" opacity="0.4" />
            <path d="M0 30 Q60 28 120 32 T200 30" stroke="#b8935a" strokeWidth="0.3" fill="none" opacity="0.3" />
            <path d="M0 50 Q40 48 80 52 T200 50" stroke="#b8935a" strokeWidth="0.5" fill="none" opacity="0.35" />
            <path d="M0 70 Q70 68 140 72 T200 70" stroke="#b8935a" strokeWidth="0.3" fill="none" opacity="0.3" />
            <path d="M0 90 Q45 88 90 92 T200 90" stroke="#b8935a" strokeWidth="0.4" fill="none" opacity="0.3" />
            <path d="M0 110 Q55 108 110 112 T200 110" stroke="#b8935a" strokeWidth="0.3" fill="none" opacity="0.25" />
            <path d="M0 130 Q65 128 130 132 T200 130" stroke="#b8935a" strokeWidth="0.5" fill="none" opacity="0.3" />
            <path d="M0 150 Q35 148 70 152 T200 150" stroke="#b8935a" strokeWidth="0.3" fill="none" opacity="0.25" />
            <path d="M0 170 Q75 168 150 172 T200 170" stroke="#b8935a" strokeWidth="0.4" fill="none" opacity="0.3" />
            <path d="M0 190 Q50 188 100 192 T200 190" stroke="#b8935a" strokeWidth="0.3" fill="none" opacity="0.25" />
          </pattern>
          <pattern id="planks" patternUnits="userSpaceOnUse" width="60" height="470">
            <rect width="60" height="470" fill="transparent" />
            <line x1="59.5" y1="0" x2="59.5" y2="470" stroke="#a0794d" strokeWidth="0.8" opacity="0.25" />
          </pattern>
        </defs>

        {/* court floor */}
        <rect width="500" height="470" fill="url(#wood-grain)" rx="12" />
        <rect width="500" height="470" fill="url(#planks)" rx="12" />
        <rect width="500" height="470" fill="#d4a76a" opacity="0.08" rx="12" />

        {/* court lines */}
        <g stroke="#fff" strokeWidth="1.5" fill="none" opacity="0.75">
          <rect x="20" y="20" width="460" height="430" rx="2" />
          <rect x="170" y="20" width="160" height="190" />
          <circle cx="250" cy="210" r="60" />
          <circle cx="250" cy="60" r="7.5" strokeWidth="2" />
          <line x1="220" y1="43" x2="280" y2="43" strokeWidth="2.5" />
          <path d="M 210 43 A 40 40 0 0 0 290 43" />
          <path d="M 30 43 L 30 150 A 238 238 0 0 0 470 150 L 470 43" />
          <line x1="20" y1="450" x2="480" y2="450" strokeWidth="1" opacity="0.4" />
        </g>

        {mode === 'dots' ? (
          <>
            {missed.map((s, i) => (
              <circle key={`m${i}`} cx={250 + s.x} cy={43 + s.y} r="4" fill="#ef4444" opacity="0.55" />
            ))}
            {made.map((s, i) => (
              <circle key={`h${i}`} cx={250 + s.x} cy={43 + s.y} r="4.5" fill="#22c55e" opacity="0.7" />
            ))}
          </>
        ) : (
          <>
            {/* Zone heatmap - colored dots with zone-based color */}
            {zoneStats.map(z => {
              const color = getZoneColor(z.pct)
              return z.shots.map((s, i) => (
                <circle key={`z${z.name}${i}`} cx={250 + s.x} cy={43 + s.y} r="5" fill={color} opacity="0.6" />
              ))
            })}
            {/* Zone labels on court */}
            {zoneStats.map(z => {
              // Compute centroid of zone shots
              const cx = z.shots.reduce((s, sh) => s + (250 + sh.x), 0) / z.shots.length
              const cy = z.shots.reduce((s, sh) => s + (43 + sh.y), 0) / z.shots.length
              return (
                <g key={z.name}>
                  <rect x={cx - 28} y={cy - 12} width="56" height="24" rx="4" fill="rgba(0,0,0,0.7)" />
                  <text x={cx} y={cy + 4} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600">
                    {z.pct.toFixed(0)}% ({z.total})
                  </text>
                </g>
              )
            })}
          </>
        )}
      </svg>
    </div>
  )
}
