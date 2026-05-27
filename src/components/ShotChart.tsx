import type { Shot } from '../types'

interface Props {
  shots: Shot[]
  teamColor: { primary: string; secondary: string }
}

export default function ShotChart({ shots, teamColor }: Props) {
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

  // court dimensions: NBA half-court scaled to viewBox 500x470
  return (
    <div className="rounded-2xl p-5 bg-white" style={{ border: `1px solid ${teamColor.primary}15` }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-600">Shot Chart</h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>Made ({made.length})</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"></span>Missed ({missed.length})</span>
          <span className="text-slate-400">{fgPct}% FG</span>
        </div>
      </div>
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
          {/* plank lines */}
          <pattern id="planks" patternUnits="userSpaceOnUse" width="60" height="470">
            <rect width="60" height="470" fill="transparent" />
            <line x1="59.5" y1="0" x2="59.5" y2="470" stroke="#a0794d" strokeWidth="0.8" opacity="0.25" />
          </pattern>
        </defs>

        {/* court floor */}
        <rect width="500" height="470" fill="url(#wood-grain)" rx="12" />
        <rect width="500" height="470" fill="url(#planks)" rx="12" />
        {/* slight warm overlay */}
        <rect width="500" height="470" fill="#d4a76a" opacity="0.08" rx="12" />

        {/* court lines */}
        <g stroke="#fff" strokeWidth="1.5" fill="none" opacity="0.75">
          {/* outer boundary */}
          <rect x="20" y="20" width="460" height="430" rx="2" />
          {/* paint/key */}
          <rect x="170" y="20" width="160" height="190" />
          {/* free throw circle */}
          <circle cx="250" cy="210" r="60" />
          {/* basket */}
          <circle cx="250" cy="60" r="7.5" strokeWidth="2" />
          {/* backboard */}
          <line x1="220" y1="43" x2="280" y2="43" strokeWidth="2.5" />
          {/* restricted area */}
          <path d="M 210 43 A 40 40 0 0 0 290 43" />
          {/* 3-point line */}
          <path d="M 30 43 L 30 150 A 238 238 0 0 0 470 150 L 470 43" />
          {/* half-court line */}
          <line x1="20" y1="450" x2="480" y2="450" strokeWidth="1" opacity="0.4" />
        </g>

        {/* shot dots - missed first so made overlay */}
        {missed.map((s, i) => (
          <circle key={`m${i}`} cx={250 + s.x} cy={43 + s.y} r="4" fill="#ef4444" opacity="0.55" />
        ))}
        {made.map((s, i) => (
          <circle key={`h${i}`} cx={250 + s.x} cy={43 + s.y} r="4.5" fill="#22c55e" opacity="0.7" />
        ))}
      </svg>
    </div>
  )
}
