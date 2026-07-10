import { useEffect, useMemo, useState } from 'react'
import type { Shot } from '../types'

interface Props {
  shots: Shot[]
  teamColor: { primary: string; secondary: string }
}

type ViewMode = 'dots' | 'zones'

// Shot coordinate system: origin at basket (0,0), x=left/right, y=distance from basket
// SVG mapping: SVG_x = 250 + shot_x, SVG_y = 43 + shot_y
// 3pt arc: center (250,43) radius 238, straights at x=30/470 from y=43 to y=134

// 10 zones split by shot_zone + x-coordinate for finer detail
const ZONE_DEFS = [
  { name: 'Restricted Area', shortName: 'Rim', test: (s: Shot) => s.shot_zone === 'Restricted Area' },
  { name: 'Paint (Non-RA)', shortName: 'Paint', test: (s: Shot) => s.shot_zone === 'In The Paint (Non-RA)' },
  { name: 'Mid-Range Left', shortName: 'Mid L', test: (s: Shot) => s.shot_zone === 'Mid-Range' && s.x < -80 },
  { name: 'Mid-Range Center', shortName: 'Mid C', test: (s: Shot) => s.shot_zone === 'Mid-Range' && s.x >= -80 && s.x <= 80 },
  { name: 'Mid-Range Right', shortName: 'Mid R', test: (s: Shot) => s.shot_zone === 'Mid-Range' && s.x > 80 },
  { name: 'Left Corner 3', shortName: 'Corner', test: (s: Shot) => s.shot_zone === 'Left Corner 3' },
  { name: 'Right Corner 3', shortName: 'Corner', test: (s: Shot) => s.shot_zone === 'Right Corner 3' },
  { name: 'Above Break 3 Left', shortName: 'Wing 3', test: (s: Shot) => s.shot_zone === 'Above the Break 3' && s.x < -80 },
  { name: 'Above Break 3 Center', shortName: 'Top 3', test: (s: Shot) => s.shot_zone === 'Above the Break 3' && s.x >= -80 && s.x <= 80 },
  { name: 'Above Break 3 Right', shortName: 'Wing 3', test: (s: Shot) => s.shot_zone === 'Above the Break 3' && s.x > 80 },
]

// SVG polygon paths for each zone (viewBox 0 0 500 470)
const ZONE_PATHS: Record<string, string> = {
  'Restricted Area': 'M 210 43 A 40 40 0 1 1 290 43 Z',
  'Paint (Non-RA)': 'M 170 43 L 170 193 L 330 193 L 330 43 L 290 43 A 40 40 0 1 0 210 43 Z',
  'Mid-Range Left': 'M 30 43 L 30 134 A 238 238 0 0 0 170 267 L 170 43 Z',
  'Mid-Range Center': 'M 170 193 L 170 267 A 238 238 0 0 0 330 267 L 330 193 Z',
  'Mid-Range Right': 'M 470 43 L 470 134 A 238 238 0 0 1 330 267 L 330 43 Z',
  'Left Corner 3': 'M 0 20 L 0 140 L 30 140 L 30 20 Z',
  'Right Corner 3': 'M 470 20 L 470 140 L 500 140 L 500 20 Z',
  'Above Break 3 Left': 'M 0 140 L 30 140 A 238 238 0 0 0 170 267 L 170 450 L 0 450 Z',
  'Above Break 3 Center': 'M 170 267 A 238 238 0 0 0 330 267 L 330 450 L 170 450 Z',
  'Above Break 3 Right': 'M 330 267 A 238 238 0 0 0 470 140 L 500 140 L 500 450 L 330 450 Z',
}

// Label positions for each zone
const ZONE_LABEL_POS: Record<string, { x: number; y: number }> = {
  'Restricted Area': { x: 250, y: 65 },
  'Paint (Non-RA)': { x: 250, y: 145 },
  'Mid-Range Left': { x: 100, y: 155 },
  'Mid-Range Center': { x: 250, y: 240 },
  'Mid-Range Right': { x: 400, y: 155 },
  'Left Corner 3': { x: 15, y: 80 },
  'Right Corner 3': { x: 485, y: 80 },
  'Above Break 3 Left': { x: 80, y: 350 },
  'Above Break 3 Center': { x: 250, y: 380 },
  'Above Break 3 Right': { x: 420, y: 350 },
}

function getZoneColor(pct: number): string {
  if (pct >= 55) return '#15803d'
  if (pct >= 45) return '#22c55e'
  if (pct >= 35) return '#a3e635'
  if (pct >= 25) return '#fbbf24'
  return '#ef4444'
}

export default function ShotChart({ shots, teamColor }: Props) {
  const [mode, setMode] = useState<ViewMode>('zones')
  const [hoveredZone, setHoveredZone] = useState<string | null>(null)
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [hoveredShot, setHoveredShot] = useState<{ shot: Shot; x: number; y: number } | null>(null)
  const [activeHandle, setActiveHandle] = useState<'start' | 'end'>('end')

  const orderedDates = useMemo(() => {
    return Array.from(new Set(
      [...shots]
        .sort((a, b) => parseShotDate(a.game_date).getTime() - parseShotDate(b.game_date).getTime())
        .map(shot => shot.game_date)
    ))
  }, [shots])
  const [rangeStart, setRangeStart] = useState(0)
  const [rangeEnd, setRangeEnd] = useState(Math.max(0, orderedDates.length - 1))

  useEffect(() => {
    setRangeStart(0)
    setRangeEnd(Math.max(0, orderedDates.length - 1))
    setActiveHandle('end')
  }, [orderedDates.length])

  if (shots.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: '#f5f0e8', border: '1px solid #e8dcc8' }}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Shot Chart</div>
        <p className="mt-3 text-sm font-medium text-slate-600">No shot locations are available for this player in the current season view.</p>
        <p className="mt-2 text-xs text-slate-500">Try a different player or switch season context if you expect charted attempts.</p>
      </div>
    )
  }

  const maxRangeIndex = Math.max(0, orderedDates.length - 1)
  const normalizedRangeStart = Math.min(rangeStart, maxRangeIndex)
  const normalizedRangeEnd = Math.min(rangeEnd, maxRangeIndex)
  const safeStart = Math.min(normalizedRangeStart, normalizedRangeEnd)
  const safeEnd = Math.max(normalizedRangeStart, normalizedRangeEnd)
  const startDate = orderedDates[safeStart] ?? null
  const endDate = orderedDates[safeEnd] ?? null
  const filteredShots = startDate && endDate
    ? shots.filter(shot => {
        const shotTime = parseShotDate(shot.game_date).getTime()
        const startTime = parseShotDate(startDate).getTime()
        const endTime = parseShotDate(endDate).getTime()
        return shotTime >= startTime && shotTime <= endTime
      })
    : shots

  const made = filteredShots.filter(s => s.made)
  const missed = filteredShots.filter(s => !s.made)
  const fgPct = filteredShots.length > 0 ? ((made.length / filteredShots.length) * 100).toFixed(1) : '0'

  // Compute zone stats
  const zoneStats = ZONE_DEFS.map(z => {
    const zoneShots = filteredShots.filter(z.test)
    const zoneMade = zoneShots.filter(s => s.made)
    return {
      name: z.name,
      shortName: z.shortName,
      made: zoneMade.length,
      total: zoneShots.length,
      pct: zoneShots.length > 0 ? (zoneMade.length / zoneShots.length) * 100 : 0,
    }
  }).filter(z => z.total > 0)

  // Draw order: largest areas first, smallest on top
  const drawOrder = [
    'Above Break 3 Left', 'Above Break 3 Center', 'Above Break 3 Right',
    'Left Corner 3', 'Right Corner 3',
    'Mid-Range Left', 'Mid-Range Center', 'Mid-Range Right',
    'Paint (Non-RA)', 'Restricted Area',
  ]

  // Filter shots for selected zone in dots mode
  const displayShots = selectedZone
    ? filteredShots.filter(s => ZONE_DEFS.find(z => z.name === selectedZone)?.test(s))
    : filteredShots

  const displayMade = displayShots.filter(s => s.made)
  const displayMissed = displayShots.filter(s => !s.made)

  const setResolvedRange = (nextStart: number, nextEnd: number, preferredHandle: 'start' | 'end') => {
    const clampedStart = Math.max(0, Math.min(nextStart, maxRangeIndex))
    const clampedEnd = Math.max(0, Math.min(nextEnd, maxRangeIndex))

    if (clampedStart <= clampedEnd) {
      setRangeStart(clampedStart)
      setRangeEnd(clampedEnd)
      setActiveHandle(preferredHandle)
      return
    }

    setRangeStart(clampedEnd)
    setRangeEnd(clampedStart)
    setActiveHandle(preferredHandle === 'start' ? 'end' : 'start')
  }

  const isSingleDayRange = safeStart === safeEnd

  return (
    <div className="rounded-2xl p-5 bg-white" style={{ border: `1px solid ${teamColor.primary}15` }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-600">Shot Chart</h3>
        <div className="flex items-center gap-3">
          <div className="flex rounded-full overflow-hidden border border-slate-200 text-[11px]">
            <button
              onClick={() => { setMode('dots'); setSelectedZone(null) }}
              className="px-3 py-1 transition-all"
              style={{ background: mode === 'dots' ? teamColor.primary : 'white', color: mode === 'dots' ? '#fff' : '#64748b' }}
            >Shots</button>
            <button
              onClick={() => { setMode('zones'); setSelectedZone(null) }}
              className="px-3 py-1 transition-all"
              style={{ background: mode === 'zones' ? teamColor.primary : 'white', color: mode === 'zones' ? '#fff' : '#64748b' }}
            >Zones</button>
          </div>
          <span className="text-xs text-slate-400">{fgPct}% FG</span>
        </div>
      </div>

      {orderedDates.length > 1 && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Date Range</div>
              <div className="mt-1 text-[12px] text-slate-500">
                {formatRangeLabel(startDate, endDate)}
              </div>
            </div>
            <div className="text-[11px] text-slate-500">
              {filteredShots.length} shots shown
            </div>
          </div>

          <div className="mt-4">
            <div className="relative px-1 py-1">
              <div className="absolute left-1 right-1 top-[13px] h-[3px] rounded-full bg-slate-200" />
              <div
                className="absolute top-[13px] h-[3px] rounded-full"
                style={{
                  left: `calc(${getSliderPct(safeStart, orderedDates.length)}% + 4px)`,
                  right: `calc(${100 - getSliderPct(safeEnd, orderedDates.length)}% + 4px)`,
                  background: teamColor.primary,
                }}
              />

              <input
                type="range"
                min={0}
                max={Math.max(0, orderedDates.length - 1)}
                value={safeStart}
                onChange={event => setResolvedRange(Number(event.target.value), safeEnd, 'start')}
                onPointerDown={() => setActiveHandle('start')}
                className="timeline-thumb relative z-10 w-full appearance-none bg-transparent cursor-ew-resize"
                style={{ accentColor: teamColor.primary, zIndex: activeHandle === 'start' ? 20 : 10 }}
              />
              <input
                type="range"
                min={0}
                max={Math.max(0, orderedDates.length - 1)}
                value={safeEnd}
                onChange={event => setResolvedRange(safeStart, Number(event.target.value), 'end')}
                onPointerDown={() => setActiveHandle('end')}
                className="timeline-thumb relative -mt-[23px] w-full appearance-none bg-transparent cursor-ew-resize"
                style={{ accentColor: teamColor.primary, zIndex: activeHandle === 'end' ? 20 : 15 }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>{formatShortDate(orderedDates[0] ?? null)}</span>
              <span>{formatShortDate(orderedDates[orderedDates.length - 1] ?? null)}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold">
                Start: {formatShortDate(startDate)}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold">
                End: {formatShortDate(endDate)}
              </span>
              {isSingleDayRange && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-700">
                  Single game date
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setSelectedZone(null)
                setResolvedRange(0, Math.max(0, orderedDates.length - 1), 'end')
              }}
              className="rounded-full border px-3 py-1 text-[11px] font-semibold transition-all"
              style={{
                borderColor: '#e2e8f0',
                background: '#fff',
                color: '#64748b',
              }}
            >
              Clear
            </button>
            {buildPresets(orderedDates.length).map(preset => (
              <button
                key={preset.label}
                onClick={() => {
                  setResolvedRange(preset.start, preset.end, 'end')
                }}
                className="rounded-full border px-3 py-1 text-[11px] font-semibold transition-all"
                style={{
                  borderColor: safeStart === preset.start && safeEnd === preset.end ? teamColor.primary : '#e2e8f0',
                  background: safeStart === preset.start && safeEnd === preset.end ? `${teamColor.primary}14` : '#fff',
                  color: safeStart === preset.start && safeEnd === preset.end ? teamColor.primary : '#64748b',
                }}
              >
                {preset.label}
              </button>
            ))}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      {mode === 'dots' ? (
        <div className="flex items-center gap-4 text-xs mb-2">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>Made ({selectedZone ? displayMade.length : made.length})</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"></span>Missed ({selectedZone ? displayMissed.length : missed.length})</span>
          {selectedZone && (
            <button onClick={() => setSelectedZone(null)} className="text-[11px] text-blue-500 hover:text-blue-700 underline ml-auto">
              Show all shots
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[10px] mb-2 flex-wrap">
          <span className="text-slate-500 font-medium mr-1">FG%:</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm inline-block" style={{ background: '#15803d' }}></span>55%+</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm inline-block" style={{ background: '#22c55e' }}></span>45%+</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm inline-block" style={{ background: '#a3e635' }}></span>35%+</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm inline-block" style={{ background: '#fbbf24' }}></span>25%+</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm inline-block" style={{ background: '#ef4444' }}></span>&lt;25%</span>
          <span className="text-slate-400 ml-2 italic">Click zone to filter shots</span>
        </div>
      )}

      <div className="relative">
        <svg viewBox="0 20 500 435" className="w-full overflow-hidden rounded-xl">
          <defs>
            <clipPath id="court-clip"><rect x="0" y="20" width="500" height="435" /></clipPath>
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

          {/* court floor - clipped to court boundary */}
          <g clipPath="url(#court-clip)">
          <rect width="500" height="470" fill="url(#wood-grain)" />
          <rect width="500" height="470" fill="url(#planks)" />
          <rect width="500" height="470" fill="#d4a76a" opacity="0.08" />

          {mode === 'zones' && (
            <>
              {drawOrder.map(zoneName => {
                const stat = zoneStats.find(z => z.name === zoneName)
                const path = ZONE_PATHS[zoneName]
                if (!stat || !path) return null
                const color = getZoneColor(stat.pct)
                const isHovered = hoveredZone === zoneName
                const isSelected = selectedZone === zoneName
                const isDimmed = selectedZone && selectedZone !== zoneName
                return (
                  <path
                    key={zoneName}
                    d={path}
                    fill={color}
                    opacity={isDimmed ? 0.2 : isHovered ? 0.85 : 0.6}
                    stroke={isSelected ? '#fff' : isHovered ? '#fff' : 'rgba(255,255,255,0.5)'}
                    strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 1.5}
                    className="cursor-pointer transition-opacity"
                    onMouseEnter={() => setHoveredZone(zoneName)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => {
                      if (selectedZone === zoneName) {
                        setSelectedZone(null)
                      } else {
                        setSelectedZone(zoneName)
                        setMode('dots')
                      }
                    }}
                  />
                )
              })}
            </>
          )}

          {/* court lines */}
          <g stroke="#fff" strokeWidth="1.5" fill="none" opacity={mode === 'zones' ? 0.9 : 0.75}>
            {/* outer boundary */}
            <rect x="0" y="20" width="500" height="435" rx="2" />
            {/* paint box */}
            <rect x="170" y="20" width="160" height="173" />
            {/* free throw circle */}
            <circle cx="250" cy="193" r="60" />
            {/* basket */}
            <circle cx="250" cy="60" r="7.5" strokeWidth="2" />
            {/* backboard */}
            <line x1="220" y1="43" x2="280" y2="43" strokeWidth="2.5" />
            {/* restricted area arc */}
            <path d="M 210 43 A 40 40 0 0 1 290 43" />
            {/* 3pt line */}
            <path d="M 30 43 L 30 134 A 238 238 0 0 0 470 134 L 470 43" />
            {/* half-court line */}
            <line x1="0" y1="450" x2="500" y2="450" strokeWidth="1" opacity="0.4" />
          </g>

          {/* Zone boundary dashed lines for clarity */}
          {mode === 'zones' && (
            <g stroke="rgba(255,255,255,0.6)" strokeWidth="1" strokeDasharray="4,3" fill="none">
              {/* Mid-range left/center split at x=170 (SVG) from paint to arc */}
              <line x1="170" y1="193" x2="170" y2="267" />
              {/* Mid-range center/right split at x=330 (SVG) from paint to arc */}
              <line x1="330" y1="193" x2="330" y2="267" />
              {/* Vertical splits for above-break-3 zones */}
              <line x1="170" y1="267" x2="170" y2="450" />
              <line x1="330" y1="267" x2="330" y2="450" />
            </g>
          )}

          {mode === 'dots' ? (
            <>
              {displayMissed.map((s, i) => (
                <circle
                  key={`m${i}`}
                  cx={250 + s.x}
                  cy={43 + s.y}
                  r="5"
                  fill="#ef4444"
                  opacity="0.6"
                  stroke="#fff"
                  strokeWidth="0.5"
                  className="cursor-pointer"
                  onMouseEnter={(e) => {
                    const rect = (e.target as SVGCircleElement).ownerSVGElement?.getBoundingClientRect()
                    if (rect) {
                      setHoveredShot({ shot: s, x: e.clientX - rect.left, y: e.clientY - rect.top })
                    }
                  }}
                  onMouseLeave={() => setHoveredShot(null)}
                />
              ))}
              {displayMade.map((s, i) => (
                <circle
                  key={`h${i}`}
                  cx={250 + s.x}
                  cy={43 + s.y}
                  r="5"
                  fill="#22c55e"
                  opacity="0.8"
                  stroke="#fff"
                  strokeWidth="0.5"
                  className="cursor-pointer"
                  onMouseEnter={(e) => {
                    const rect = (e.target as SVGCircleElement).ownerSVGElement?.getBoundingClientRect()
                    if (rect) {
                      setHoveredShot({ shot: s, x: e.clientX - rect.left, y: e.clientY - rect.top })
                    }
                  }}
                  onMouseLeave={() => setHoveredShot(null)}
                />
              ))}
            </>
          ) : (
            <>
              {/* Zone labels */}
              {zoneStats.map(z => {
                const pos = ZONE_LABEL_POS[z.name]
                if (!pos) return null
                const isCorner = z.name.includes('Corner')
                const isHovered = hoveredZone === z.name
                const isDimmed = selectedZone && selectedZone !== z.name
                return (
                  <g
                    key={z.name}
                    opacity={isDimmed ? 0.3 : 1}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredZone(z.name)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => {
                      setSelectedZone(z.name)
                      setMode('dots')
                    }}
                  >
                    <rect
                      x={pos.x - (isCorner ? 14 : 32)}
                      y={pos.y - (isCorner ? 20 : 23)}
                      width={isCorner ? 28 : 64}
                      height={isCorner ? 40 : 46}
                      rx="5"
                      fill={isHovered ? 'rgba(0,0,0,0.95)' : 'rgba(0,0,0,0.8)'}
                      stroke={isHovered ? '#fff' : 'rgba(255,255,255,0.3)'}
                      strokeWidth="1"
                    />
                    {/* Zone short name */}
                    <text
                      x={pos.x}
                      y={pos.y - (isCorner ? 8 : 9)}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.65)"
                      fontSize={isCorner ? '8' : '9'}
                      fontWeight="600"
                      fontFamily="Inter, sans-serif"
                    >
                      {z.shortName}
                    </text>
                    {/* Made/Total */}
                    <text
                      x={pos.x}
                      y={pos.y + (isCorner ? 4 : 5)}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize={isCorner ? '10' : '13'}
                      fontWeight="700"
                      fontFamily="Inter, sans-serif"
                    >
                      {z.made}/{z.total}
                    </text>
                    {/* FG% */}
                    <text
                      x={pos.x}
                      y={pos.y + (isCorner ? 15 : 18)}
                      textAnchor="middle"
                      fill={getZoneColor(z.pct)}
                      fontSize={isCorner ? '9' : '11'}
                      fontWeight="700"
                      fontFamily="Inter, sans-serif"
                    >
                      {z.pct.toFixed(1)}%
                    </text>
                  </g>
                )
              })}
            </>
          )}
        </g>
        </svg>

        {/* Hover tooltip for individual shots */}
        {hoveredShot && (
          <div
            className="absolute pointer-events-none bg-slate-900 text-white rounded-lg px-3 py-2 text-xs shadow-xl z-50"
            style={{
              left: `${hoveredShot.x}px`,
              top: `${hoveredShot.y - 60}px`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="font-semibold">{hoveredShot.shot.made ? '✓ Made' : '✗ Missed'}</div>
            <div className="text-slate-300">{hoveredShot.shot.shot_type}</div>
            <div className="text-slate-400">{hoveredShot.shot.shot_distance} ft · {hoveredShot.shot.shot_zone}</div>
          </div>
        )}

        {/* Hover tooltip for zones */}
        {mode === 'zones' && hoveredZone && !selectedZone && (() => {
          const stat = zoneStats.find(z => z.name === hoveredZone)
          if (!stat) return null
          const friendlyNames: Record<string, string> = {
            'Restricted Area': 'At the Rim',
            'Paint (Non-RA)': 'In the Paint',
            'Mid-Range Left': 'Mid-Range (Left)',
            'Mid-Range Center': 'Mid-Range (Center)',
            'Mid-Range Right': 'Mid-Range (Right)',
            'Left Corner 3': 'Left Corner Three',
            'Right Corner 3': 'Right Corner Three',
            'Above Break 3 Left': 'Left Wing Three',
            'Above Break 3 Center': 'Top of the Key Three',
            'Above Break 3 Right': 'Right Wing Three',
          }
          return (
            <div className="absolute top-2 left-2 bg-slate-900/95 text-white rounded-lg px-3 py-2 text-xs shadow-xl z-50 backdrop-blur-sm">
              <div className="font-semibold text-[13px]">{friendlyNames[stat.name] ?? stat.name}</div>
              <div className="text-slate-300 mt-0.5">{stat.made}/{stat.total} made · <span className="font-bold" style={{ color: getZoneColor(stat.pct) }}>{stat.pct.toFixed(1)}%</span></div>
              <div className="text-slate-400 mt-0.5 italic">Click to see individual shots</div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

function formatShortDate(value: string | null) {
  if (!value) return 'N/A'
  const parsed = parseShotDate(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatRangeLabel(start: string | null, end: string | null) {
  if (!start || !end) return 'Full season'
  const startParsed = parseShotDate(start)
  const endParsed = parseShotDate(end)
  if (Number.isNaN(startParsed.getTime()) || Number.isNaN(endParsed.getTime())) {
    return `${start} to ${end}`
  }

  const sameYear = startParsed.getFullYear() === endParsed.getFullYear()
  const startLabel = startParsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
  const endLabel = endParsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${startLabel} to ${endLabel}`
}

function parseShotDate(value: string) {
  if (/^\d{8}$/.test(value)) {
    const year = Number(value.slice(0, 4))
    const month = Number(value.slice(4, 6)) - 1
    const day = Number(value.slice(6, 8))
    return new Date(year, month, day)
  }

  return new Date(value)
}

function getSliderPct(index: number, total: number) {
  if (total <= 1) return 0
  return (index / (total - 1)) * 100
}

function buildPresets(total: number) {
  if (total <= 1) return []
  return [
    { label: 'Last 5', start: Math.max(0, total - 5), end: total - 1 },
    { label: 'Last 10', start: Math.max(0, total - 10), end: total - 1 },
    { label: 'Full season', start: 0, end: total - 1 },
  ]
}
