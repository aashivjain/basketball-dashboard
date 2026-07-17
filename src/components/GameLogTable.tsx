import type { GameLog } from '../types'

interface Props {
  games: GameLog[]
  teamColor: { primary: string }
}

export default function GameLogTable({ games, teamColor }: Props) {
  return (
    <div className="rounded-2xl p-5 bg-white overflow-x-auto" style={{ border: `1px solid ${teamColor.primary}15` }}>
      <h3 className="text-sm font-medium text-slate-600 mb-3">Game Log</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-400 text-left border-b border-slate-100">
            <th className="py-2 pr-3 font-medium">Date</th>
            <th className="py-2 pr-3 font-medium">Opp</th>
            <th className="py-2 pr-3 font-medium">W/L</th>
            <th className="py-2 pr-3 font-medium text-right">MIN</th>
            <th className="py-2 pr-3 text-right"><span className="rounded-full bg-rose-50 px-2 py-1 font-semibold text-rose-700">PTS</span></th>
            <th className="py-2 pr-3 text-right"><span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">REB</span></th>
            <th className="py-2 pr-3 text-right"><span className="rounded-full bg-blue-50 px-2 py-1 font-semibold text-blue-700">AST</span></th>
            <th className="py-2 pr-3 font-medium text-right">FG</th>
          </tr>
        </thead>
        <tbody>
          {games.map((g, i) => (
            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
              <td className="py-1.5 pr-3 text-slate-500">{g.game_date}</td>
              <td className="py-1.5 pr-3 text-slate-600">{g.matchup}</td>
              <td className="py-1.5 pr-3">
                <span className="text-xs font-medium" style={{ color: g.wl === 'W' ? teamColor.primary : '#94a3b8' }}>{g.wl}</span>
              </td>
              <td className="py-1.5 pr-3 text-right text-slate-500">{g.min}</td>
              <td className="py-1.5 pr-3 text-right font-semibold text-rose-700">{g.pts}</td>
              <td className="py-1.5 pr-3 text-right font-medium text-emerald-700">{g.reb}</td>
              <td className="py-1.5 pr-3 text-right font-medium text-blue-700">{g.ast}</td>
              <td className="py-1.5 pr-3 text-right text-slate-500">{g.fgm}-{g.fga}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
