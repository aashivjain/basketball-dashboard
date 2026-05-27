import type { LeaguePlayer } from '../types'

interface Props {
  playerA: LeaguePlayer
  playerB: LeaguePlayer
  nameA: string
  nameB: string
  teamColorA: { primary: string; bg: string }
  teamColorB: { primary: string; bg: string }
}

const coreMetrics = [
  { key: 'pts', label: 'Points' },
  { key: 'reb', label: 'Rebounds' },
  { key: 'ast', label: 'Assists' },
  { key: 'stl', label: 'Steals' },
  { key: 'blk', label: 'Blocks' },
  { key: 'min', label: 'Minutes' },
] as const

const shootingMetrics = [
  { key: 'fg_pct', label: 'FG%', format: (v: number) => `${(v * 100).toFixed(1)}%` },
  { key: 'fg3_pct', label: '3PT%', format: (v: number) => `${(v * 100).toFixed(1)}%` },
  { key: 'ft_pct', label: 'FT%', format: (v: number) => `${(v * 100).toFixed(1)}%` },
] as const

const advancedMetrics = [
  { key: 'tov', label: 'Turnovers', invert: true },
  { key: 'pf', label: 'Fouls', invert: true },
  { key: 'plus_minus', label: '+/-' },
  { key: 'fgm', label: 'FGM/G' },
  { key: 'fga', label: 'FGA/G' },
  { key: 'fg3m', label: '3PM/G' },
  { key: 'fg3a', label: '3PA/G' },
] as const

function StatBar({ a, b, max, colorA, colorB, label, formatFn, invert }: {
  a: number; b: number; max: number; colorA: string; colorB: string; label: string; formatFn?: (v: number) => string; invert?: boolean
}) {
  const fmt = formatFn ?? ((v: number) => v.toFixed(1))
  const aWins = invert ? a <= b : a >= b
  const bWins = invert ? b <= a : b >= a
  return (
    <div className="grid grid-cols-[1fr_80px_1fr] items-center gap-2">
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm font-medium whitespace-nowrap" style={{ color: aWins ? colorA : '#94a3b8' }}>{fmt(a)}</span>
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full float-right transition-all" style={{ width: `${(a / max) * 100}%`, background: colorA, opacity: aWins ? 0.8 : 0.3 }}></div>
        </div>
      </div>
      <div className="text-center text-[10px] text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="flex items-center gap-2">
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${(b / max) * 100}%`, background: colorB, opacity: bWins ? 0.8 : 0.3 }}></div>
        </div>
        <span className="text-sm font-medium whitespace-nowrap" style={{ color: bWins ? colorB : '#94a3b8' }}>{fmt(b)}</span>
      </div>
    </div>
  )
}

export default function PlayerComparison({ playerA, playerB, nameA, nameB, teamColorA, teamColorB }: Props) {
  // Count "wins" for summary
  const allKeys = [...coreMetrics.map(m => m.key), ...shootingMetrics.map(m => m.key)]
  const aWins = allKeys.filter(k => playerA[k] > playerB[k]).length
  const bWins = allKeys.filter(k => playerB[k] > playerA[k]).length

  return (
    <div className="rounded-2xl p-6 bg-white border border-slate-100 space-y-6">
      {/* Header with summary */}
      <div className="grid grid-cols-3 text-center">
        <div>
          <div className="text-base font-semibold" style={{ color: teamColorA.primary }}>{nameA}</div>
          <div className="text-xs text-slate-400 mt-0.5">{playerA.team} &middot; {playerA.gp} GP</div>
        </div>
        <div className="flex flex-col items-center justify-center">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Head to Head</div>
          <div className="text-sm mt-0.5">
            <span style={{ color: teamColorA.primary, fontWeight: aWins >= bWins ? 700 : 400 }}>{aWins}</span>
            <span className="text-slate-300 mx-1">-</span>
            <span style={{ color: teamColorB.primary, fontWeight: bWins >= aWins ? 700 : 400 }}>{bWins}</span>
          </div>
        </div>
        <div>
          <div className="text-base font-semibold" style={{ color: teamColorB.primary }}>{nameB}</div>
          <div className="text-xs text-slate-400 mt-0.5">{playerB.team} &middot; {playerB.gp} GP</div>
        </div>
      </div>

      {/* Core stats */}
      <div>
        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-medium">Core Stats</div>
        <div className="space-y-2.5">
          {coreMetrics.map(m => {
            const a = playerA[m.key]
            const b = playerB[m.key]
            const max = Math.max(a, b, 0.1)
            return <StatBar key={m.key} a={a} b={b} max={max} colorA={teamColorA.primary} colorB={teamColorB.primary} label={m.label} />
          })}
        </div>
      </div>

      {/* Shooting splits */}
      <div>
        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-medium">Shooting Splits</div>
        <div className="space-y-2.5">
          {shootingMetrics.map(m => {
            const a = playerA[m.key]
            const b = playerB[m.key]
            const max = Math.max(a, b, 0.001)
            return <StatBar key={m.key} a={a} b={b} max={max} colorA={teamColorA.primary} colorB={teamColorB.primary} label={m.label} formatFn={m.format} />
          })}
        </div>
      </div>

      {/* Advanced */}
      <div>
        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-medium">Volume &amp; Efficiency</div>
        <div className="space-y-2.5">
          {advancedMetrics.map(m => {
            const a = playerA[m.key]
            const b = playerB[m.key]
            const max = Math.max(Math.abs(a), Math.abs(b), 0.1)
            return <StatBar key={m.key} a={a} b={b} max={max} colorA={teamColorA.primary} colorB={teamColorB.primary} label={m.label} invert={'invert' in m && m.invert} />
          })}
        </div>
      </div>
    </div>
  )
}
