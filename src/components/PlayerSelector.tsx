import type { Player } from '../types';

interface Props {
  players: Player[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function PlayerSelector({ players, selectedId, onSelect }: Props) {
  return (
    <div className="relative">
      <select
        value={selectedId ?? ''}
        onChange={(e) => onSelect(Number(e.target.value))}
        className="w-full bg-[#1a1d2e] border border-[#2d3148] rounded-lg px-4 py-3 text-white text-sm font-medium appearance-none cursor-pointer hover:border-[#ffcd00] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ffcd00]/40"
      >
        <option value="" disabled>
          Select a player...
        </option>
        {players.map((p) => (
          <option key={p.player_id} value={p.player_id}>
            #{p.number} {p.name} — {p.position}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
