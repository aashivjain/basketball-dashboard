import type { LeaguePlayer } from '../types'

interface Props {
  playerA: LeaguePlayer
  playerB: LeaguePlayer
  nameA: string
  nameB: string
  teamColorA: { primary: string; bg: string }
  teamColorB: { primary: string; bg: string }
}

const metrics = [
  { key: 'pts', label: 'Points' },
  { key: 'reb', label: 'Rebounds' },
  { key: 'ast', label: 'Assists' },
  { key: 'stl', label: 'Steals' },
  { key: 'blk', label: 'Blocks' },
  { key: 'min', label: 'Minutes' },
] as const

export default function PlayerComparison({ playerA, playerB, nameA, nameB, teamColorA, teamColorB }: Props) {
  return (
    <div className="rounded-2xl p-5 bg-white border border-slate-100">
      <div className="grid grid-cols-3 text-xs font-medium text-center mb-4">
        <div style={{ color: teamColorA.primary }}>{nameA}</div>
        <div className="text-slate-400">vs</div>
        <div style={{ color: teamColorB.primary }}>{nameB}</div>
      </div>
      <div className="space-y-3">
        {metrics.map(m => {
          const a = playerA[m.key]
          const b = playerB[m.key]
          const max = Math.max(a, b, 0.1)
          return (
            <div key={m.key} className="grid grid-cols-[1fr_80px_1fr] items-center gap-2">
              <div className="flex items-center justify-end gap-2">
                <span className="text-sm font-medium" style={{ color: a >= b ? teamColorA.primary : '#94a3b8' }}>{a.toFixed(1)}</span>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full float-right transition-all" style={{ width: `${(a / max) * 100}%`, background: teamColorA.primary, opacity: a >= b ? 0.8 : 0.3 }}></div>
                </div>
              </div>
              <div className="text-center text-[10px] text-slate-400 uppercase tracking-wider">{m.label}</div>
              <div className="flex items-center gap-2">
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(b / max) * 100}%`, background: teamColorB.primary, opacity: b >= a ? 0.8 : 0.3 }}></div>
                </div>
                <span className="text-sm font-medium" style={{ color: b >= a ? teamColorB.primary : '#94a3b8' }}>{b.toFixed(1)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
