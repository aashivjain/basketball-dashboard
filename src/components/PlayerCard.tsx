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
          <div className="text-5xl font-light tracking-tight" style={{ color: teamColor.primary, fontFamily: "'DM Serif Display', Georgia, serif" }}>{s.pts.toFixed(1)}</div>
          <div className="text-xs uppercase tracking-widest text-slate-400 mt-1.5 font-medium">points per game</div>
        </div>

        <div className="h-px w-full" style={{ background: `${teamColor.primary}15` }}></div>

        <div className="grid grid-cols-2 gap-4">
          <StatItem label="REB" value={s.reb.toFixed(1)} color={teamColor.primary} />
          <StatItem label="AST" value={s.ast.toFixed(1)} color={teamColor.primary} />
          <StatItem label="STL" value={s.stl.toFixed(1)} color={teamColor.primary} />
          <StatItem label="BLK" value={s.blk.toFixed(1)} color={teamColor.primary} />
        </div>

        <div className="h-px w-full" style={{ background: `${teamColor.primary}15` }}></div>

        <div className="grid grid-cols-3 gap-3 text-center py-2">
          <MiniStat label="FG%" value={`${((stats?.fg_pct ?? player.fg_pct) * 100).toFixed(1)}%`} color={teamColor.primary} />
          <MiniStat label="3P%" value={`${((stats?.fg3_pct ?? player.fg3_pct) * 100).toFixed(1)}%`} color={teamColor.primary} />
          <MiniStat label="FT%" value={`${((stats?.ft_pct ?? player.ft_pct) * 100).toFixed(1)}%`} color={teamColor.primary} />
        </div>
      </div>
    </div>
  )
}

function StatItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold" style={{ background: `${color}12`, color }}>
        {label}
      </div>
      <span className="text-xl font-medium text-slate-700" style={{ fontFamily: "'Inter', sans-serif" }}>{value}</span>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="text-2xl font-semibold" style={{ color, fontFamily: "'Inter', sans-serif" }}>{value}</div>
      <div className="text-xs text-slate-400 mt-1 font-medium">{label}</div>
    </div>
  )
}
