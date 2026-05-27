import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import type { SeasonStats, LeagueAverages } from '../types';
import { getRadarData } from '../utils/stats';

interface Props {
  stats: SeasonStats;
  leagueAvg: LeagueAverages;
}

export default function StatsRadar({ stats, leagueAvg }: Props) {
  const data = getRadarData(stats, leagueAvg);

  // Normalize data to 0-100 scale for better visualization
  const maxValues: Record<string, number> = {
    PTS: 25,
    REB: 12,
    AST: 10,
    STL: 3,
    BLK: 3,
  };

  const normalizedData = data.map((d) => ({
    stat: d.stat,
    player: Math.min((d.player / maxValues[d.stat]) * 100, 100),
    league: Math.min((d.league / maxValues[d.stat]) * 100, 100),
    playerRaw: d.player.toFixed(1),
    leagueRaw: d.league.toFixed(1),
  }));

  return (
    <div className="bg-gradient-to-br from-[#1a1d2e] to-[#141625] border border-[#2d3148] rounded-xl p-6">
      <h3 className="text-lg font-bold text-white mb-2">Player vs League Average</h3>
      <p className="text-xs text-gray-500 mb-4">Per game stats normalized for comparison</p>

      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={normalizedData} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="#2d3148" />
          <PolarAngleAxis
            dataKey="stat"
            tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Player"
            dataKey="player"
            stroke="#ffcd00"
            fill="#ffcd00"
            fillOpacity={0.2}
            strokeWidth={2}
          />
          <Radar
            name="League Avg"
            dataKey="league"
            stroke="#64748b"
            fill="#64748b"
            fillOpacity={0.1}
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
          />
          <Tooltip
            contentStyle={{
              background: '#0f1117',
              border: '1px solid #2d3148',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(_value, name, props) => {
              const p = (props as unknown as { payload: { playerRaw: string; leagueRaw: string } }).payload;
              if (name === 'Player') return [p.playerRaw, 'Player'];
              return [p.leagueRaw, 'League Avg'];
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
