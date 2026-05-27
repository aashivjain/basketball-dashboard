import { useState } from 'react';
import type { Shot } from '../types';

interface Props {
  shots: Shot[];
  playerName: string;
}

export default function ShotChart({ shots }: Props) {
  const [filter, setFilter] = useState<'all' | 'made' | 'missed'>('all');
  const [hoveredShot, setHoveredShot] = useState<Shot | null>(null);

  const filteredShots = shots.filter((s) => {
    if (filter === 'made') return s.made;
    if (filter === 'missed') return !s.made;
    return true;
  });

  const madeCount = shots.filter((s) => s.made).length;
  const totalCount = shots.length;
  const fgPct = totalCount > 0 ? ((madeCount / totalCount) * 100).toFixed(1) : '0.0';

  return (
    <div className="bg-gradient-to-br from-[#1a1d2e] to-[#141625] border border-[#2d3148] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Shot Chart</h3>
          <p className="text-sm text-gray-400">
            {madeCount}/{totalCount} FG ({fgPct}%)
          </p>
        </div>
        <div className="flex gap-1">
          {(['all', 'made', 'missed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-[#ffcd00] text-[#041e42]'
                  : 'bg-[#0f1117] text-gray-400 hover:text-white'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox="-250 -50 500 470"
          className="w-full h-auto"
          style={{ maxHeight: '420px' }}
        >
          {/* Court background */}
          <rect x="-250" y="-50" width="500" height="470" fill="#1a1d2e" rx="8" />

          {/* Half court */}
          <rect x="-250" y="-47" width="500" height="470" fill="none" stroke="#2d3148" strokeWidth="2" />

          {/* Paint / Key */}
          <rect x="-80" y="-47" width="160" height="190" fill="none" stroke="#3b4263" strokeWidth="1.5" />

          {/* Free throw circle */}
          <circle cx="0" cy="143" r="60" fill="none" stroke="#3b4263" strokeWidth="1.5" />

          {/* Restricted area */}
          <path d="M -40 -47 A 40 40 0 0 0 40 -47" fill="none" stroke="#3b4263" strokeWidth="1.5" />

          {/* Basket */}
          <circle cx="0" cy="-17" r="7.5" fill="none" stroke="#ffcd00" strokeWidth="2" />
          <line x1="0" y1="-47" x2="0" y2="-25" stroke="#ffcd00" strokeWidth="2" />

          {/* Backboard */}
          <line x1="-30" y1="-47" x2="30" y2="-47" stroke="#ffcd00" strokeWidth="3" />

          {/* Three point line */}
          <path
            d="M -220 -47 L -220 89 A 237 237 0 0 0 220 89 L 220 -47"
            fill="none"
            stroke="#3b4263"
            strokeWidth="1.5"
            strokeDasharray="4,4"
          />

          {/* Center court line at top */}
          <line x1="-250" y1="420" x2="250" y2="420" stroke="#3b4263" strokeWidth="1.5" />

          {/* Shots */}
          {filteredShots.map((shot, i) => (
            <circle
              key={i}
              cx={shot.x}
              cy={shot.y}
              r={hoveredShot === shot ? 6 : 4}
              fill={shot.made ? '#22c55e' : '#ef4444'}
              opacity={hoveredShot === shot ? 1 : 0.7}
              stroke={hoveredShot === shot ? '#fff' : 'none'}
              strokeWidth={1.5}
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredShot(shot)}
              onMouseLeave={() => setHoveredShot(null)}
            />
          ))}
        </svg>

        {/* Tooltip */}
        {hoveredShot && (
          <div className="absolute top-2 right-2 bg-[#0f1117] border border-[#2d3148] rounded-lg p-3 text-xs shadow-xl">
            <div className="text-white font-medium">{hoveredShot.shot_type}</div>
            <div className="text-gray-400 mt-1">{hoveredShot.shot_zone}</div>
            <div className="text-gray-400">{hoveredShot.shot_distance} ft</div>
            <div className={`mt-1 font-semibold ${hoveredShot.made ? 'text-green-400' : 'text-red-400'}`}>
              {hoveredShot.made ? 'Made' : 'Missed'}
            </div>
            <div className="text-gray-500 mt-1">Q{hoveredShot.quarter} • {hoveredShot.game_date}</div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Made ({madeCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Missed ({totalCount - madeCount})</span>
        </div>
      </div>
    </div>
  );
}
