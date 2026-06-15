import type { LeaguePlayer } from '../types'

interface Props {
  player: LeaguePlayer
  teamColor: { primary: string; secondary: string; bg: string }
  impactIndex?: { score: number; average: number; summary: string } | null
}

export default function PlayerCard({ player, teamColor, impactIndex }: Props) {
  const s = player

  return (
    <div className="h-full rounded-2xl p-6 transition-all flex" style={{ background: 'white', border: `1px solid ${teamColor.primary}15` }}>
      <div className="space-y-4 flex flex-col w-full h-full">
        {impactIndex && (
          <>
            <div className="rounded-2xl border px-4 py-4" style={{ borderColor: `${teamColor.primary}22`, background: `${teamColor.primary}08` }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold">Player Impact Index</div>
                  <div className="mt-2 text-4xl font-light tracking-tight" style={{ color: teamColor.primary, fontFamily: "'DM Serif Display', Georgia, serif" }}>
                    {impactIndex.score.toFixed(0)}
                  </div>
                  <div className="mt-1 text-[12px] text-slate-500">
                    Average player: <span className="font-semibold text-slate-700">{impactIndex.average.toFixed(0)}</span>
                  </div>
                </div>
                <div className="min-w-[92px] rounded-full border border-slate-200 bg-white px-3 py-1.5 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">League Avg</div>
                  <div className="mt-1 text-lg font-semibold text-slate-800">{impactIndex.average.toFixed(0)}</div>
                </div>
              </div>
              <div className="mt-3 text-[12px] leading-5 text-slate-600">{impactIndex.summary}</div>
              <details className="mt-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-[12px] text-slate-600">
                <summary className="cursor-pointer list-none font-semibold text-slate-700">
                  How this is calculated
                </summary>
                <div className="mt-2 space-y-2 leading-5">
                  <p>
                    This is a weighted season-impact formula, not a simple box-score sum. Points, assists, rebounds, steals, blocks,
                    efficiency, turnovers, and plus-minus all feed into the score with different weights.
                  </p>
                  <p>
                    Offensive value:
                    <br />
                    <span className="font-mono text-[11px] text-slate-700">
                      PTS/36 × (0.62 + TS% × 0.55) + AST/36 × 1.45 + Usage/36 × 0.18 + (TS% edge × 34) + (eFG% edge × 22) + (AST/TO edge × 2.6)
                    </span>
                  </p>
                  <p>
                    Defensive value:
                    <br />
                    <span className="font-mono text-[11px] text-slate-700">
                      STL/36 × 2.6 + BLK/36 × 2.3 + DREB/36 × 0.55 + OREB/36 × 0.35 + REB/36 × 0.15 + Plus/Minus × 0.95
                    </span>
                  </p>
                  <p>
                    Final blend:
                    <br />
                    <span className="font-mono text-[11px] text-slate-700">
                      Total = Offense × 0.64 + Defense × 0.36
                    </span>
                    <br />
                    Then the result is converted to a season-relative score centered around <span className="font-semibold text-slate-700">50</span>.
                  </p>
                  <p>
                    Small-minute players are pulled closer to average, so short samples do not spike too high.
                  </p>
                </div>
              </details>
            </div>

            <div className="h-px w-full" style={{ background: `${teamColor.primary}15` }}></div>
          </>
        )}

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

        <div className="grid grid-cols-3 gap-3 text-center py-2 mt-auto">
          <MiniStat label="FG%" value={`${(s.fg_pct * 100).toFixed(1)}%`} color={teamColor.primary} />
          <MiniStat label="3P%" value={`${(s.fg3_pct * 100).toFixed(1)}%`} color={teamColor.primary} />
          <MiniStat label="FT%" value={`${(s.ft_pct * 100).toFixed(1)}%`} color={teamColor.primary} />
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
