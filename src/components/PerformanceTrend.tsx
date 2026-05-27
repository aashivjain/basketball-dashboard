import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useState } from 'react';
import type { GameLog } from '../types';

interface Props {
  games: GameLog[];
  playerName: string;
}

type StatKey = 'pts' | 'reb' | 'ast' | 'stl' | 'fg_pct';

const STAT_OPTIONS: { key: StatKey; label: string; color: string }[] = [
  { key: 'pts', label: 'Points', color: '#ffcd00' },
  { key: 'reb', label: 'Rebounds', color: '#22c55e' },
  { key: 'ast', label: 'Assists', color: '#3b82f6' },
  { key: 'stl', label: 'Steals', color: '#a855f7' },
  { key: 'fg_pct', label: 'FG%', color: '#f97316' },
];

export default function PerformanceTrend({ games }: Props) {
  const [activeStat, setActiveStat] = useState<StatKey>('pts');

  // Reverse so chronological order (API returns most recent first)
  const chartData = [...games].reverse().map((g, idx) => ({
    game: idx + 1,
    label: g.matchup.split(' ').pop() || '',
    date: g.game_date,
    wl: g.wl,
    pts: g.pts,
    reb: g.reb,
    ast: g.ast,
    stl: g.stl,
    fg_pct: g.fg_pct,
  }));

  const activeOption = STAT_OPTIONS.find((s) => s.key === activeStat)!;
  const values = chartData.map((d) => d[activeStat] as number);
  const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

  return (
    <div className="bg-gradient-to-br from-[#1a1d2e] to-[#141625] border border-[#2d3148] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Performance Trend</h3>
          <p className="text-xs text-gray-500">Game-by-game breakdown</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {STAT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setActiveStat(opt.key)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                activeStat === opt.key
                  ? 'text-[#041e42]'
                  : 'bg-[#0f1117] text-gray-400 hover:text-white'
              }`}
              style={activeStat === opt.key ? { backgroundColor: opt.color } : {}}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2235" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={{ stroke: '#2d3148' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={{ stroke: '#2d3148' }}
            tickLine={false}
            domain={activeStat === 'fg_pct' ? [0, 1] : undefined}
            tickFormatter={activeStat === 'fg_pct' ? (v: number) => `${(v * 100).toFixed(0)}%` : undefined}
          />
          <ReferenceLine
            y={avg}
            stroke={activeOption.color}
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
          <Tooltip
            contentStyle={{
              background: '#0f1117',
              border: '1px solid #2d3148',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelFormatter={(_, payload) => {
              if (payload && payload[0]) {
                const d = payload[0].payload;
                return `${d.date} (${d.wl === 'W' ? 'Win' : 'Loss'})`;
              }
              return '';
            }}
            formatter={(value) => {
              const v = Number(value);
              if (activeStat === 'fg_pct') return [`${(v * 100).toFixed(1)}%`, activeOption.label];
              return [v, activeOption.label];
            }}
          />
          <Line
            type="monotone"
            dataKey={activeStat}
            stroke={activeOption.color}
            strokeWidth={2}
            dot={{ r: 3, fill: activeOption.color }}
            activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-2 text-center text-xs text-gray-500">
        Season Average: {activeStat === 'fg_pct' ? `${(avg * 100).toFixed(1)}%` : avg.toFixed(1)} {activeOption.label}
      </div>
    </div>
  );
}
