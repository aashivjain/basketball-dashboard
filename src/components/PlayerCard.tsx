import type { LeaguePlayer, PlayerStats } from '../types'

interface Props {
  player: LeaguePlayer
  stats: PlayerStats | null
  teamColor: { primary: string; secondary: string; bg: string }
}

export default function PlayerCard({ player, stats, teamColor }: Props) {
  const s = stats || player

  return (
    <div className="rounded-2xl p-6 transition-all" style={{ background: 'white', border: `1px solid ${teamColor.primary}15` }}>
      <div className="space-y-4">
        {/* main stat - ppg */}
        <div className="text-center">
          <div className="text-4xl font-light tracking-tight" style={{ color: teamColor.primary }}>{s.pts.toFixed(1)}</div>
          <div className="text-[11px] uppercase tracking-widest text-slate-400 mt-1">points per game</div>
        </div>

        <div className="h-px w-full" style={{ background: `${teamColor.primary}15` }}></div>

        <div className="grid grid-cols-2 gap-4">
          <StatItem label="REB" value={s.reb.toFixed(1)} color={teamColor.primary} />
          <StatItem label="AST" value={s.ast.toFixed(1)} color={teamColor.primary} />
          <StatItem label="STL" value={s.stl.toFixed(1)} color={teamColor.primary} />
          <StatItem label="BLK" value={s.blk.toFixed(1)} color={teamColor.primary} />
        </div>

        <div className="h-px w-full" style={{ background: `${teamColor.primary}15` }}></div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <MiniStat label="FG%" value={`${((stats?.fg_pct ?? player.fg_pct) * 100).toFixed(1)}`} />
          <MiniStat label="3P%" value={`${((stats?.fg3_pct ?? player.fg3_pct) * 100).toFixed(1)}`} />
          <MiniStat label="FT%" value={`${((stats?.ft_pct ?? player.ft_pct) * 100).toFixed(1)}`} />
        </div>
      </div>
    </div>
  )
}

function StatItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: `${color}12`, color }}>
        {label}
      </div>
      <span className="text-lg font-medium text-slate-700">{value}</span>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-medium text-slate-700">{value}</div>
      <div className="text-[10px] text-slate-400">{label}</div>
    </div>
  )
}
