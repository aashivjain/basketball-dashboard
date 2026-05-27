import { useState } from 'react'
import type { GameLog } from '../types'

interface Props {
  games: GameLog[]
}

export default function GameLogTable({ games }: Props) {
  const [expanded, setExpanded] = useState(false)
  const rows = expanded ? games : games.slice(0, 10)

  if (!games.length) return null

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-zinc-200">Game Log</h3>
        {games.length > 10 && (
          <button onClick={() => setExpanded(!expanded)} className="text-[11px] text-orange-400 hover:text-orange-300">
            {expanded ? 'Collapse' : `Show all ${games.length}`}
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-zinc-500 uppercase border-b border-white/5">
              <th className="text-left py-1.5 px-1 font-medium">Date</th>
              <th className="text-left py-1.5 px-1 font-medium">Opp</th>
              <th className="text-center py-1.5 px-1 font-medium">W/L</th>
              <th className="text-center py-1.5 px-1 font-medium">MIN</th>
              <th className="text-center py-1.5 px-1 font-medium">PTS</th>
              <th className="text-center py-1.5 px-1 font-medium">REB</th>
              <th className="text-center py-1.5 px-1 font-medium">AST</th>
              <th className="text-center py-1.5 px-1 font-medium">FG</th>
              <th className="text-center py-1.5 px-1 font-medium">3PT</th>
              <th className="text-center py-1.5 px-1 font-medium">+/-</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g, i) => (
              <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                <td className="py-1.5 px-1 text-zinc-400">{g.game_date.slice(0, 10)}</td>
                <td className="py-1.5 px-1 text-zinc-300">{g.matchup.split(' ').pop()}</td>
                <td className="py-1.5 px-1 text-center">
                  <span className={g.wl === 'W' ? 'text-green-400' : 'text-red-400'}>{g.wl}</span>
                </td>
                <td className="py-1.5 px-1 text-center text-zinc-500">{g.min}</td>
                <td className="py-1.5 px-1 text-center text-zinc-100 font-medium">{g.pts}</td>
                <td className="py-1.5 px-1 text-center text-zinc-300">{g.reb}</td>
                <td className="py-1.5 px-1 text-center text-zinc-300">{g.ast}</td>
                <td className="py-1.5 px-1 text-center text-zinc-500">{g.fgm}-{g.fga}</td>
                <td className="py-1.5 px-1 text-center text-zinc-500">{g.fg3m}-{g.fg3a}</td>
                <td className={`py-1.5 px-1 text-center ${g.plus_minus > 0 ? 'text-green-400' : g.plus_minus < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                  {g.plus_minus > 0 ? '+' : ''}{g.plus_minus}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
