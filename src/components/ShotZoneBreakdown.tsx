import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Shot } from '../types';
import { getShotEfficiency } from '../utils/stats';

interface Props {
  shots: Shot[];
}

export default function ShotZoneBreakdown({ shots }: Props) {
  const zoneData = getShotEfficiency(shots);

  // Sort by total attempts descending
  const sorted = [...zoneData].sort((a, b) => b.total - a.total);

  const getBarColor = (pct: number) => {
    if (pct >= 0.5) return '#22c55e';
    if (pct >= 0.4) return '#84cc16';
    if (pct >= 0.33) return '#eab308';
    if (pct >= 0.25) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="bg-gradient-to-br from-[#1a1d2e] to-[#141625] border border-[#2d3148] rounded-xl p-6">
      <h3 className="text-lg font-bold text-white mb-1">Shooting by Zone</h3>
      <p className="text-xs text-gray-500 mb-4">Field goal percentage by court area</p>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2235" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 1]}
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            axisLine={{ stroke: '#2d3148' }}
          />
          <YAxis
            type="category"
            dataKey="zone"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            width={110}
            axisLine={{ stroke: '#2d3148' }}
          />
          <Tooltip
            contentStyle={{
              background: '#0f1117',
              border: '1px solid #2d3148',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value, _name, props) => {
              const p = (props as unknown as { payload: { made: number; total: number } }).payload;
              return [`${(Number(value) * 100).toFixed(1)}% (${p.made}/${p.total})`, 'FG%'];
            }}
          />
          <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
            {sorted.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry.pct)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Color legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />50%+</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-lime-500" />40-50%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" />33-40%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" />25-33%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />&lt;25%</span>
      </div>
    </div>
  );
}
