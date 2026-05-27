import type { Player, PlayerStats } from '../types'
import { fmt, pct } from '../utils/stats'

interface Props {
  player: Player
  stats: PlayerStats
}

export default function PlayerCard({ player, stats }: Props) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-5 h-full">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{player.name}</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {player.position} &middot; #{player.number} &middot; {player.height}
          </p>
        </div>
        <span className="text-2xl font-bold text-zinc-600 font-mono">#{player.number}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-400 mb-4">
        <span>Age: <span className="text-zinc-200">{player.age}</span></span>
        <span>Exp: <span className="text-zinc-200">{player.experience === 'R' ? 'Rookie' : player.experience + ' yr'}</span></span>
        <span>School: <span className="text-zinc-200">{player.school}</span></span>
        <span>GP: <span className="text-zinc-200">{stats.gp}</span></span>
      </div>

      <div className="border-t border-white/5 pt-3">
        <div className="grid grid-cols-4 gap-2 text-center">
          <Stat label="PTS" value={fmt(stats.pts)} highlight />
          <Stat label="REB" value={fmt(stats.reb)} />
          <Stat label="AST" value={fmt(stats.ast)} />
          <Stat label="STL" value={fmt(stats.stl)} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center mt-2">
          <Stat label="FG%" value={pct(stats.fg_pct) + '%'} />
          <Stat label="3P%" value={pct(stats.fg3_pct) + '%'} />
          <Stat label="FT%" value={pct(stats.ft_pct) + '%'} />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="py-1">
      <div className={`text-base font-semibold ${highlight ? 'text-orange-300' : 'text-zinc-100'}`}>{value}</div>
      <div className="text-[10px] text-zinc-500 uppercase">{label}</div>
    </div>
  )
}
