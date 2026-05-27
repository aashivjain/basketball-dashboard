import { useState } from 'react'
import type { Shot } from '../types'

interface Props {
  shots: Shot[]
  teamColor: { primary: string; secondary: string }
}

type ViewMode = 'dots' | 'zones'

// Zone definitions matching NBA/WNBA standard zones
const ZONE_DEFS = [
  { name: 'Restricted Area', test: (s: Shot) => s.shot_zone === 'Restricted Area' },
  { name: 'Paint (Non-RA)', test: (s: Shot) => s.shot_zone === 'In The Paint (Non-RA)' },
  { name: 'Mid-Range', test: (s: Shot) => s.shot_zone === 'Mid-Range' },
  { name: 'Left Corner 3', test: (s: Shot) => s.shot_zone === 'Left Corner 3' },
  { name: 'Right Corner 3', test: (s: Shot) => s.shot_zone === 'Right Corner 3' },
  { name: 'Above Break 3', test: (s: Shot) => s.shot_zone === 'Above the Break 3' },
  { name: 'Backcourt', test: (s: Shot) => s.shot_zone === 'Backcourt' },
]

// SVG paths for each zone polygon (viewBox 0 0 500 470)
// Court: outer rect (20,20)-(480,450), basket at (250,60)
// 3pt arc: center≈(250,59) r=238, straight portions x=30 and x=470 from y=43 to y=150
// Paint: (170,20)-(330,210), Restricted: semicircle r=40 at (250,43)
const ZONE_PATHS: Record<string, string> = {
  'Restricted Area': 'M 210 20 L 210 43 A 40 40 0 0 1 290 43 L 290 20 Z',
  'Paint (Non-RA)': 'M 170 20 L 170 210 L 330 210 L 330 20 Z',
  'Mid-Range': 'M 30 20 L 30 150 A 238 238 0 0 0 470 150 L 470 20 Z',
  'Left Corner 3': 'M 20 20 L 30 20 L 30 150 L 20 150 Z',
  'Right Corner 3': 'M 470 20 L 480 20 L 480 150 L 470 150 Z',
  'Above Break 3': 'M 30 150 A 238 238 0 0 0 470 150 L 480 150 L 480 450 L 20 450 L 20 150 Z',
}

// Zone label positions (hand-tuned for readability)
const ZONE_LABEL_POS: Record<string, { x: number; y: number }> = {
  'Restricted Area': { x: 250, y: 62 },
  'Paint (Non-RA)': { x: 250, y: 155 },
  'Mid-Range': { x: 250, y: 280 },
  'Left Corner 3': { x: 25, y: 90 },
  'Right Corner 3': { x: 475, y: 90 },
  'Above Break 3': { x: 250, y: 390 },
}

function getZoneColor(pct: number): string {
  if (pct >= 55) return '#15803d'
  if (pct >= 45) return '#22c55e'
  if (pct >= 35) return '#86efac'
  if (pct >= 25) return '#fbbf24'
  return '#ef4444'
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

  // Compute zone stats
  const zoneStats = ZONE_DEFS.map(z => {
    const zoneShots = shots.filter(z.test)
    const zoneMade = zoneShots.filter(s => s.made)
    return {
      name: z.name,
      made: zoneMade.length,
      total: zoneShots.length,
      pct: zoneShots.length > 0 ? (zoneMade.length / zoneShots.length) * 100 : 0,
    }
  }).filter(z => z.total > 0)

  // Draw order: back to front so smaller zones overlay larger ones
  const drawOrder = ['Above Break 3', 'Left Corner 3', 'Right Corner 3', 'Mid-Range', 'Paint (Non-RA)', 'Restricted Area']

  return (
    <div className="rounded-2xl p-5 bg-white" style={{ border: `1px solid ${teamColor.primary}15` }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-600">Shot Chart</h3>
        <div className="flex items-center gap-3">
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

        {mode === 'zones' && (
          <>
            {/* Shaded zone polygons */}
            {drawOrder.map(zoneName => {
              const stat = zoneStats.find(z => z.name === zoneName)
              const path = ZONE_PATHS[zoneName]
              if (!stat || !path) return null
              const color = getZoneColor(stat.pct)
              return (
                <path
                  key={zoneName}
                  d={path}
                  fill={color}
                  opacity="0.6"
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth="1.5"
                />
              )
            })}
          </>
        )}

        {/* court lines */}
        <g stroke="#fff" strokeWidth="1.5" fill="none" opacity={mode === 'zones' ? 0.9 : 0.75}>
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
            {/* Zone labels */}
            {zoneStats.map(z => {
              const pos = ZONE_LABEL_POS[z.name]
              if (!pos) return null
              const isSmall = z.name === 'Left Corner 3' || z.name === 'Right Corner 3'
              return (
                <g key={z.name}>
                  <rect
                    x={pos.x - (isSmall ? 20 : 30)}
                    y={pos.y - 14}
                    width={isSmall ? 40 : 60}
                    height="28"
                    rx="4"
                    fill="rgba(0,0,0,0.75)"
                  />
                  <text x={pos.x} y={pos.y} textAnchor="middle" fill="#fff" fontSize={isSmall ? '9' : '11'} fontWeight="700">
                    {z.pct.toFixed(0)}%
                  </text>
                  <text x={pos.x} y={pos.y + 11} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="8">
                    {z.made}/{z.total}
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
