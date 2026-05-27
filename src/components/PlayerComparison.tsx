import type { PlayerStats } from '../types'
import { fmt, pct } from '../utils/stats'

interface Props {
  playerA: PlayerStats
  playerB: PlayerStats
  nameA: string
  nameB: string
}

export default function PlayerComparison({ playerA, playerB, nameA, nameB }: Props) {
  const rows: { label: string; a: string; b: string; higher: 'a' | 'b' | 'tie' }[] = [
    compare('PTS', playerA.pts, playerB.pts),
    compare('REB', playerA.reb, playerB.reb),
    compare('AST', playerA.ast, playerB.ast),
    compare('STL', playerA.stl, playerB.stl),
    compare('BLK', playerA.blk, playerB.blk),
    compare('FG%', playerA.fg_pct, playerB.fg_pct, true),
    compare('3P%', playerA.fg3_pct, playerB.fg3_pct, true),
    compare('FT%', playerA.ft_pct, playerB.ft_pct, true),
    compare('TOV', playerA.tov, playerB.tov, false, true),
    compare('+/-', playerA.plus_minus, playerB.plus_minus),
  ]

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-5">
      <h3 className="text-sm font-medium text-zinc-200 mb-4">Head-to-Head Comparison</h3>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-x-4 gap-y-1 text-xs">
        {/* header */}
        <div className="text-right text-orange-400 font-medium pb-2 border-b border-white/5">{nameA.split(' ').pop()}</div>
        <div className="text-center text-zinc-500 pb-2 border-b border-white/5">Stat</div>
        <div className="text-left text-sky-400 font-medium pb-2 border-b border-white/5">{nameB.split(' ').pop()}</div>

        {rows.map(r => (
          <Row key={r.label} {...r} />
        ))}
      </div>
    </div>
  )
}

function Row({ label, a, b, higher }: { label: string; a: string; b: string; higher: 'a' | 'b' | 'tie' }) {
  return (
    <>
      <div className={`text-right py-1 ${higher === 'a' ? 'text-zinc-100 font-medium' : 'text-zinc-500'}`}>{a}</div>
      <div className="text-center py-1 text-zinc-600">{label}</div>
      <div className={`text-left py-1 ${higher === 'b' ? 'text-zinc-100 font-medium' : 'text-zinc-500'}`}>{b}</div>
    </>
  )
}

function compare(label: string, a: number, b: number, isPct = false, lowerBetter = false): { label: string; a: string; b: string; higher: 'a' | 'b' | 'tie' } {
  const format = isPct ? (v: number) => pct(v) + '%' : (v: number) => fmt(v)
  let higher: 'a' | 'b' | 'tie' = 'tie'
  if (a !== b) {
    if (lowerBetter) higher = a < b ? 'a' : 'b'
    else higher = a > b ? 'a' : 'b'
  }
  return { label, a: format(a), b: format(b), higher }
}
