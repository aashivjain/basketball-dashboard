import type { Player, SeasonStats } from '../types';
import { perGame, pctDisplay } from '../utils/stats';

interface Props {
  player: Player;
  stats: SeasonStats;
}

export default function PlayerCard({ player, stats }: Props) {
  const gp = stats.gp || 1;

  return (
    <div className="bg-gradient-to-br from-[#1a1d2e] to-[#141625] border border-[#2d3148] rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[#ffcd00] text-sm font-semibold tracking-wider uppercase mb-1">
            Indiana Fever
          </div>
          <h2 className="text-2xl font-bold text-white">{player.name}</h2>
          <p className="text-gray-400 text-sm mt-1">
            {player.position} • #{player.number} • {player.height}
          </p>
        </div>
        <div className="bg-[#ffcd00]/10 border border-[#ffcd00]/30 rounded-lg px-3 py-2 text-center">
          <div className="text-[#ffcd00] text-2xl font-bold">#{player.number}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
        <InfoRow label="Age" value={String(player.age)} />
        <InfoRow label="Experience" value={player.experience === 'R' ? 'Rookie' : `${player.experience} yrs`} />
        <InfoRow label="School" value={player.school} />
        <InfoRow label="Games" value={String(stats.gp)} />
      </div>

      <div className="mt-5 pt-4 border-t border-[#2d3148]">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Per Game Averages
        </h3>
        <div className="grid grid-cols-4 gap-2">
          <StatBubble label="PTS" value={perGame(stats.pts, gp)} accent />
          <StatBubble label="REB" value={perGame(stats.reb, gp)} />
          <StatBubble label="AST" value={perGame(stats.ast, gp)} />
          <StatBubble label="STL" value={perGame(stats.stl, gp)} />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <StatBubble label="FG%" value={pctDisplay(stats.fg_pct)} />
          <StatBubble label="3P%" value={pctDisplay(stats.fg3_pct)} />
          <StatBubble label="FT%" value={pctDisplay(stats.ft_pct)} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-500">{label}: </span>
      <span className="text-gray-200">{value}</span>
    </div>
  );
}

function StatBubble({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-[#0f1117] rounded-lg p-2 text-center">
      <div className={`text-lg font-bold ${accent ? 'text-[#ffcd00]' : 'text-white'}`}>
        {value}
      </div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}
