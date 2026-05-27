import { useState, useMemo } from 'react';
import type { TeamData } from '../types';
import PlayerSelector from './PlayerSelector';
import PlayerCard from './PlayerCard';
import ShotChart from './ShotChart';
import StatsRadar from './StatsRadar';
import PerformanceTrend from './PerformanceTrend';
import GameLogTable from './GameLogTable';
import ShotZoneBreakdown from './ShotZoneBreakdown';

import feverData from '../data/fever_data.json';

export default function Dashboard() {
  const data = feverData as unknown as TeamData;
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  const selectedPlayer = useMemo(
    () => data.roster.find((p) => p.player_id === selectedPlayerId) ?? null,
    [data.roster, selectedPlayerId]
  );

  const selectedStats = useMemo(
    () => data.season_stats.find((s) => s.player_id === selectedPlayerId) ?? null,
    [data.season_stats, selectedPlayerId]
  );

  const selectedGameLog = useMemo(
    () => (selectedPlayerId ? data.game_logs[String(selectedPlayerId)] ?? [] : []),
    [data.game_logs, selectedPlayerId]
  );

  const selectedShots = useMemo(
    () => (selectedPlayerId ? data.shot_charts[String(selectedPlayerId)] ?? [] : []),
    [data.shot_charts, selectedPlayerId]
  );

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="border-b border-[#2d3148] bg-[#0f1117]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#ffcd00] rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-[#041e42]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                {data.team.name}
              </h1>
              <p className="text-xs text-gray-500">{data.team.season} Season Analytics</p>
            </div>
          </div>
          <div className="w-64">
            <PlayerSelector
              players={data.roster}
              selectedId={selectedPlayerId}
              onSelect={setSelectedPlayerId}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {!selectedPlayer ? (
          <EmptyState roster={data.roster} onSelect={setSelectedPlayerId} />
        ) : selectedStats ? (
          <div className="space-y-6">
            {/* Top row: Player card + Radar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <PlayerCard player={selectedPlayer} stats={selectedStats} />
              </div>
              <div className="lg:col-span-1">
                <StatsRadar stats={selectedStats} leagueAvg={data.league_averages} />
              </div>
              <div className="lg:col-span-1">
                <ShotZoneBreakdown shots={selectedShots} />
              </div>
            </div>

            {/* Middle row: Shot chart + Performance trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ShotChart shots={selectedShots} playerName={selectedPlayer.name} />
              <PerformanceTrend games={selectedGameLog} playerName={selectedPlayer.name} />
            </div>

            {/* Bottom: Game log */}
            <GameLogTable games={selectedGameLog} />
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500">
            No stats available for this player.
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState({
  roster,
  onSelect,
}: {
  roster: TeamData['roster'];
  onSelect: (id: number) => void;
}) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-[#ffcd00]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-[#ffcd00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Select a Player</h2>
      <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto">
        Choose a player from the Indiana Fever roster to view their stats, shot chart, and performance trends.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
        {roster.map((p) => (
          <button
            key={p.player_id}
            onClick={() => onSelect(p.player_id)}
            className="bg-[#1a1d2e] border border-[#2d3148] rounded-lg p-3 text-left hover:border-[#ffcd00]/50 hover:bg-[#1a1d2e]/80 transition-all group"
          >
            <div className="text-[#ffcd00] text-xs font-bold mb-1">#{p.number}</div>
            <div className="text-white text-sm font-medium group-hover:text-[#ffcd00] transition-colors">
              {p.name.split(' ').pop()}
            </div>
            <div className="text-gray-500 text-xs mt-0.5">{p.position}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
