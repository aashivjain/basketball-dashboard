import { useState, useMemo } from 'react'
import type { FeverData, SeasonData, PlayerStats, Player } from '../types'
import PlayerSelector from './PlayerSelector'
import PlayerCard from './PlayerCard'
import ShotChart from './ShotChart'
import StatsRadar from './StatsRadar'
import PerformanceTrend from './PerformanceTrend'
import GameLogTable from './GameLogTable'
import ShotZoneBreakdown from './ShotZoneBreakdown'
import PlayerComparison from './PlayerComparison'
import GrowthChart from './GrowthChart'

import rawData from '../data/fever_data.json'

const data = rawData as unknown as FeverData
const availableSeasons = Object.keys(data.seasons).filter(s => data.seasons[s] !== null).sort()

export default function Dashboard() {
  const [season, setSeason] = useState(data.team.current_season)
  const [seasonType, setSeasonType] = useState<'regular_season' | 'playoffs'>('regular_season')
  const [playerId, setPlayerId] = useState<number | null>(null)
  const [compareId, setCompareId] = useState<number | null>(null)
  const [showCompare, setShowCompare] = useState(false)

  const seasonData = data.seasons[season] as SeasonData | null
  const roster = seasonData?.roster ?? []
  const block = seasonData ? seasonData[seasonType] : null

  const player = useMemo(() => roster.find(p => p.player_id === playerId) ?? null, [roster, playerId])
  const stats: PlayerStats | null = useMemo(
    () => block?.stats.find(s => s.player_id === playerId) ?? null,
    [block, playerId]
  )
  const games = useMemo(() => (playerId && block ? block.game_logs[String(playerId)] ?? [] : []), [block, playerId])
  const shots = useMemo(() => (playerId && block ? block.shot_charts[String(playerId)] ?? [] : []), [block, playerId])
  const leagueAvg = block?.league_averages ?? null

  // for comparison
  const compareStats: PlayerStats | null = useMemo(
    () => (compareId && block ? block.stats.find(s => s.player_id === compareId) ?? null : null),
    [block, compareId]
  )
  const comparePlayer: Player | null = useMemo(
    () => roster.find(p => p.player_id === compareId) ?? null,
    [roster, compareId]
  )

  // gather multi-year stats for growth view
  const growthData = useMemo(() => {
    if (!playerId) return []
    return availableSeasons.map(yr => {
      const sd = data.seasons[yr]
      if (!sd) return null
      const s = sd.regular_season.stats.find(x => x.player_id === playerId)
      if (!s) return null
      return { season: yr, ...s }
    }).filter(Boolean) as (PlayerStats & { season: string })[]
  }, [playerId])

  return (
    <div className="min-h-screen">
      {/* top bar */}
      <header className="sticky top-0 z-40 bg-[#121418]/90 backdrop-blur border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-5 py-3 flex items-center gap-4 flex-wrap">
          <h1 className="text-base font-semibold text-white mr-auto tracking-tight">
            {data.team.name} <span className="text-zinc-500 font-normal">/ analytics</span>
          </h1>

          {/* season picker */}
          <div className="flex items-center gap-1 text-xs">
            {availableSeasons.map(yr => (
              <button
                key={yr}
                onClick={() => setSeason(yr)}
                className={`px-2.5 py-1 rounded ${season === yr ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {yr}
              </button>
            ))}
          </div>

          {/* regular / playoffs toggle */}
          <div className="flex items-center gap-1 text-xs border-l border-white/10 pl-3">
            <button
              onClick={() => setSeasonType('regular_season')}
              className={`px-2.5 py-1 rounded ${seasonType === 'regular_season' ? 'bg-orange-500/20 text-orange-300' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Regular
            </button>
            <button
              onClick={() => setSeasonType('playoffs')}
              className={`px-2.5 py-1 rounded ${seasonType === 'playoffs' ? 'bg-orange-500/20 text-orange-300' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Playoffs
            </button>
          </div>

          {/* player dropdown */}
          <div className="w-56">
            <PlayerSelector players={roster} selectedId={playerId} onSelect={(id) => { setPlayerId(id); setCompareId(null); setShowCompare(false) }} />
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-5 py-6">
        {!player || !stats || !leagueAvg ? (
          <LandingGrid roster={roster} onSelect={setPlayerId} />
        ) : (
          <div className="space-y-5">
            {/* row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-3">
                <PlayerCard player={player} stats={stats} />
              </div>
              <div className="lg:col-span-5">
                <StatsRadar stats={stats} leagueAvg={leagueAvg} compareStats={compareStats} compareName={comparePlayer?.name} />
              </div>
              <div className="lg:col-span-4">
                <ShotZoneBreakdown shots={shots} />
              </div>
            </div>

            {/* row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ShotChart shots={shots} />
              <PerformanceTrend games={games} />
            </div>

            {/* comparison toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCompare(!showCompare)}
                className="text-xs px-3 py-1.5 rounded bg-white/5 text-zinc-400 hover:text-white border border-white/10"
              >
                {showCompare ? 'Hide Comparison' : 'Compare with teammate'}
              </button>
              {showCompare && (
                <div className="w-48">
                  <PlayerSelector
                    players={roster.filter(p => p.player_id !== playerId)}
                    selectedId={compareId}
                    onSelect={setCompareId}
                  />
                </div>
              )}
            </div>

            {showCompare && compareStats && stats && leagueAvg && (
              <PlayerComparison playerA={stats} playerB={compareStats} nameA={player.name} nameB={comparePlayer?.name ?? ''} />
            )}

            {/* year over year growth */}
            {growthData.length > 1 && (
              <GrowthChart data={growthData} playerName={player.name} />
            )}

            {/* game log */}
            <GameLogTable games={games} />
          </div>
        )}
      </main>
    </div>
  )
}

function LandingGrid({ roster, onSelect }: { roster: Player[]; onSelect: (id: number) => void }) {
  return (
    <div className="py-12">
      <p className="text-zinc-500 text-sm mb-6">Pick a player to get started</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {roster.map(p => (
          <button
            key={p.player_id}
            onClick={() => onSelect(p.player_id)}
            className="text-left p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-orange-400/30 hover:bg-white/[0.05] transition-colors"
          >
            <span className="text-zinc-600 text-[11px] font-mono">#{p.number}</span>
            <div className="text-sm text-zinc-200 font-medium mt-0.5">{p.name}</div>
            <span className="text-[11px] text-zinc-500">{p.position}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
