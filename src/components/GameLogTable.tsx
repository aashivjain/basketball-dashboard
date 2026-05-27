import { useState } from 'react';
import type { GameLog } from '../types';

interface Props {
  games: GameLog[];
}

export default function GameLogTable({ games }: Props) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? games : games.slice(0, 8);

  return (
    <div className="bg-gradient-to-br from-[#1a1d2e] to-[#141625] border border-[#2d3148] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Game Log</h3>
        {games.length > 8 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-[#ffcd00] hover:text-[#ffcd00]/80 transition-colors"
          >
            {showAll ? 'Show Less' : `Show All (${games.length})`}
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 uppercase tracking-wider border-b border-[#2d3148]">
              <th className="text-left py-2 px-1 font-medium">Date</th>
              <th className="text-left py-2 px-1 font-medium">Opp</th>
              <th className="text-center py-2 px-1 font-medium">W/L</th>
              <th className="text-center py-2 px-1 font-medium">MIN</th>
              <th className="text-center py-2 px-1 font-medium">PTS</th>
              <th className="text-center py-2 px-1 font-medium">REB</th>
              <th className="text-center py-2 px-1 font-medium">AST</th>
              <th className="text-center py-2 px-1 font-medium">FG</th>
              <th className="text-center py-2 px-1 font-medium">3PT</th>
              <th className="text-center py-2 px-1 font-medium">+/-</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((g, idx) => (
              <tr
                key={idx}
                className="border-b border-[#2d3148]/50 hover:bg-[#2d3148]/20 transition-colors"
              >
                <td className="py-2 px-1 text-gray-300">
                  {formatDate(g.game_date)}
                </td>
                <td className="py-2 px-1 text-gray-300">
                  {g.matchup.split(' ').pop()}
                </td>
                <td className="py-2 px-1 text-center">
                  <span
                    className={`inline-block w-5 h-5 rounded text-[10px] font-bold leading-5 text-center ${
                      g.wl === 'W'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {g.wl}
                  </span>
                </td>
                <td className="py-2 px-1 text-center text-gray-400">{g.min}</td>
                <td className="py-2 px-1 text-center text-white font-semibold">{g.pts}</td>
                <td className="py-2 px-1 text-center text-gray-300">{g.reb}</td>
                <td className="py-2 px-1 text-center text-gray-300">{g.ast}</td>
                <td className="py-2 px-1 text-center text-gray-400">
                  {g.fgm}-{g.fga}
                </td>
                <td className="py-2 px-1 text-center text-gray-400">
                  {g.fg3m}-{g.fg3a}
                </td>
                <td className={`py-2 px-1 text-center font-medium ${
                  g.plus_minus > 0 ? 'text-green-400' : g.plus_minus < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {g.plus_minus > 0 ? '+' : ''}{g.plus_minus}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split(' ');
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`;
  }
  return dateStr;
}
