import type { Player } from '../types'

interface Props {
  players: Player[]
  selectedId: number | null
  onSelect: (id: number) => void
}

export default function PlayerSelector({ players, selectedId, onSelect }: Props) {
  return (
    <select
      value={selectedId ?? ''}
      onChange={e => onSelect(Number(e.target.value))}
      className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-zinc-200 appearance-none cursor-pointer focus:outline-none focus:border-orange-400/50"
    >
      <option value="" disabled>Choose player</option>
      {players.map(p => (
        <option key={p.player_id} value={p.player_id}>
          {p.name} ({p.position})
        </option>
      ))}
    </select>
  )
}
