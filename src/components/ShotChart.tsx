import { useState } from 'react'
import type { Shot } from '../types'

interface Props {
  shots: Shot[]
}

export default function ShotChart({ shots }: Props) {
  const [filter, setFilter] = useState<'all' | 'made' | 'missed'>('all')
  const [hovered, setHovered] = useState<Shot | null>(null)

  const visible = shots.filter(s => {
    if (filter === 'made') return s.made
    if (filter === 'missed') return !s.made
    return true
  })

  const made = shots.filter(s => s.made).length
  const total = shots.length
  const fgPct = total > 0 ? ((made / total) * 100).toFixed(1) : '0.0'

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-zinc-200">Shot Chart</h3>
          <span className="text-xs text-zinc-500">{made}/{total} FG ({fgPct}%)</span>
        </div>
        <div className="flex gap-1">
          {(['all', 'made', 'missed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 rounded text-[11px] ${filter === f ? 'bg-white/10 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg viewBox="-250 -50 500 470" className="w-full" style={{ maxHeight: '400px' }}>
          <rect x="-250" y="-50" width="500" height="470" fill="#1a1a1a" rx="4" />

          {/* court lines */}
          <rect x="-250" y="-47" width="500" height="470" fill="none" stroke="#2a2a2a" strokeWidth="1.5" />
          <rect x="-80" y="-47" width="160" height="190" fill="none" stroke="#333" strokeWidth="1" />
          <circle cx="0" cy="143" r="60" fill="none" stroke="#333" strokeWidth="1" />
          <path d="M -40 -47 A 40 40 0 0 0 40 -47" fill="none" stroke="#333" strokeWidth="1" />
          <circle cx="0" cy="-17" r="7.5" fill="none" stroke="#666" strokeWidth="1.5" />
          <line x1="-30" y1="-47" x2="30" y2="-47" stroke="#666" strokeWidth="2" />
          <path d="M -220 -47 L -220 89 A 237 237 0 0 0 220 89 L 220 -47" fill="none" stroke="#333" strokeWidth="1" strokeDasharray="5,4" />

          {visible.map((shot, i) => (
            <circle
              key={i}
              cx={shot.x}
              cy={shot.y}
              r={hovered === shot ? 5.5 : 3.5}
              fill={shot.made ? '#4ade80' : '#f87171'}
              opacity={hovered === shot ? 1 : 0.65}
              stroke={hovered === shot ? '#fff' : 'none'}
              strokeWidth={1}
              className="cursor-pointer"
              onMouseEnter={() => setHovered(shot)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>

        {hovered && (
          <div className="absolute top-2 right-2 bg-[#1c1c1c] border border-white/10 rounded p-2.5 text-[11px] shadow-lg">
            <div className="text-zinc-200">{hovered.shot_type}</div>
            <div className="text-zinc-500">{hovered.shot_zone} &middot; {hovered.shot_distance}ft</div>
            <div className={`mt-1 font-medium ${hovered.made ? 'text-green-400' : 'text-red-400'}`}>
              {hovered.made ? 'Made' : 'Missed'}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-5 mt-3 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> Made ({made})</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Missed ({total - made})</span>
      </div>
    </div>
  )
}
