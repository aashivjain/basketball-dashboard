import { useState, useMemo } from 'react'
import type { FeverData, SeasonData, PlayerStats, LeaguePlayer } from '../types'
import { getTeamColors } from '../utils/teamColors'
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
  const [tab, setTab] = useState<'overview' | 'compare'>('overview')

  const seasonData = data.seasons[season] as SeasonData | null
  const block = seasonData ? seasonData[seasonType] : null
  const allPlayers: LeaguePlayer[] = useMemo(() => block?.all_players ?? [], [block])

  const playersByTeam = useMemo(() => {
    const map: Record<string, LeaguePlayer[]> = {}
    for (const p of allPlayers) {
      if (!map[p.team]) map[p.team] = []
      map[p.team].push(p)
    }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]))
  }, [allPlayers])

  const player = useMemo(() => allPlayers.find(p => p.player_id === playerId) ?? null, [allPlayers, playerId])
  const stats: PlayerStats | null = useMemo(
    () => block?.stats.find(s => s.player_id === playerId) ?? null,
    [block, playerId]
  )
  const games = useMemo(() => (playerId && block ? block.game_logs[String(playerId)] ?? [] : []), [block, playerId])
  const shots = useMemo(() => (playerId && block ? block.shot_charts[String(playerId)] ?? [] : []), [block, playerId])
  const leagueAvg = block?.league_averages ?? null
  const comparePlayer: LeaguePlayer | null = useMemo(
    () => allPlayers.find(p => p.player_id === compareId) ?? null,
    [allPlayers, compareId]
  )

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

  const teamColor = player ? getTeamColors(player.team) : null

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ background: teamColor ? teamColor.bg : '#fafafa' }}>
      {/* fluid header - no hard border, just a gentle fade */}
      <header className="sticky top-0 z-40 backdrop-blur-md" style={{ background: teamColor ? `${teamColor.bg}ee` : 'rgba(250,250,250,0.92)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-5 flex-wrap">
          <h1 className="text-lg tracking-tight mr-auto" style={{ fontFamily: "'Georgia', serif", color: teamColor ? teamColor.primary : '#1e293b' }}>
            WNBA Analytics
          </h1>

          <nav className="flex gap-2 text-sm">
            <button
              onClick={() => setTab('overview')}
              className="transition-all"
              style={{ color: tab === 'overview' ? (teamColor?.primary ?? '#0d9488') : '#94a3b8', fontWeight: tab === 'overview' ? 600 : 400 }}
            >Overview</button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => setTab('compare')}
              className="transition-all"
              style={{ color: tab === 'compare' ? (teamColor?.primary ?? '#0d9488') : '#94a3b8', fontWeight: tab === 'compare' ? 600 : 400 }}
            >Compare</button>
          </nav>

          <div className="flex items-center gap-2 text-sm">
            {availableSeasons.map(yr => (
              <button
                key={yr}
                onClick={() => setSeason(yr)}
                className="transition-all px-2 py-0.5 rounded-full"
                style={{
                  background: season === yr ? (teamColor?.primary ?? '#334155') : 'transparent',
                  color: season === yr ? '#fff' : '#94a3b8',
                  fontSize: '13px',
                }}
              >{yr}</button>
            ))}
          </div>

          <div className="flex gap-2 text-sm">
            {(['regular_season', 'playoffs'] as const).map(st => (
              <button
                key={st}
                onClick={() => setSeasonType(st)}
                className="transition-all"
                style={{ color: seasonType === st ? (teamColor?.primary ?? '#334155') : '#94a3b8', fontWeight: seasonType === st ? 600 : 400, fontSize: '13px' }}
              >{st === 'regular_season' ? 'Regular' : 'Playoffs'}</button>
            ))}
          </div>

          <select
            value={playerId ?? ''}
            onChange={e => { setPlayerId(Number(e.target.value)); setCompareId(null); setShowCompare(false) }}
            className="rounded-full px-4 py-1.5 text-sm cursor-pointer focus:outline-none transition-all"
            style={{ border: `1.5px solid ${teamColor?.primary ?? '#cbd5e1'}`, background: 'white', color: '#334155' }}
          >
            <option value="" disabled>Choose player</option>
            {playersByTeam.map(([team, players]) => (
              <optgroup key={team} label={team}>
                {players.map(p => (
                  <option key={p.player_id} value={p.player_id}>{p.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {tab === 'compare' ? (
          <CompareView allPlayers={allPlayers} playersByTeam={playersByTeam} season={season} />
        ) : !player || !leagueAvg ? (
          <LandingGrid playersByTeam={playersByTeam} onSelect={setPlayerId} />
        ) : (
          <div className="space-y-8">
            {/* player intro */}
            <div className="flex items-end gap-6 flex-wrap">
              <div>
                <p className="text-sm uppercase tracking-widest mb-1" style={{ color: teamColor?.primary ?? '#64748b' }}>{player.team}</p>
                <h2 className="text-3xl font-light tracking-tight" style={{ fontFamily: "'Georgia', serif", color: '#1e293b' }}>{player.name}</h2>
                <p className="text-sm text-slate-400 mt-1">{player.gp} games &middot; {player.min.toFixed(1)} min/game &middot; {season}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <PlayerCard player={player} stats={stats} teamColor={teamColor!} />
              <div className="lg:col-span-2">
                <StatsRadar player={player} leagueAvg={leagueAvg} teamColor={teamColor!} compareStats={comparePlayer} compareName={comparePlayer?.name} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ShotChart shots={shots} teamColor={teamColor!} />
              {shots.length > 0 && <ShotZoneBreakdown shots={shots} teamColor={teamColor!} />}
            </div>

            {games.length > 0 && (
              <PerformanceTrend games={games} teamColor={teamColor!} />
            )}

            {/* compare */}
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={() => setShowCompare(!showCompare)}
                className="text-sm px-4 py-2 rounded-full transition-all"
                style={{ border: `1.5px solid ${teamColor?.primary ?? '#cbd5e1'}`, color: teamColor?.primary ?? '#334155', background: 'white' }}
              >{showCompare ? 'Hide comparison' : 'Compare with another player'}</button>
              {showCompare && (
                <select
                  value={compareId ?? ''}
                  onChange={e => setCompareId(Number(e.target.value))}
                  className="rounded-full px-4 py-1.5 text-sm cursor-pointer focus:outline-none border border-slate-300 bg-white"
                >
                  <option value="" disabled>Pick any WNBA player</option>
                  {playersByTeam.map(([team, players]) => (
                    <optgroup key={team} label={team}>
                      {players.filter(p => p.player_id !== playerId).map(p => (
                        <option key={p.player_id} value={p.player_id}>{p.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
            </div>

            {showCompare && comparePlayer && player && (
              <PlayerComparison playerA={player} playerB={comparePlayer} nameA={player.name} nameB={comparePlayer.name} teamColorA={teamColor!} teamColorB={getTeamColors(comparePlayer.team)} />
            )}

            {growthData.length > 1 && (
              <GrowthChart data={growthData} playerName={player.name} teamColor={teamColor!} />
            )}

            {games.length > 0 && <GameLogTable games={games} teamColor={teamColor!} />}
          </div>
        )}
      </main>
    </div>
  )
}

function LandingGrid({ playersByTeam, onSelect }: { playersByTeam: [string, LeaguePlayer[]][]; onSelect: (id: number) => void }) {
  return (
    <div className="py-4">
      <h2 className="text-2xl font-light tracking-tight mb-2" style={{ fontFamily: "'Georgia', serif" }}>2026 Season</h2>
      <p className="text-slate-400 text-sm mb-8">Select a player to explore their stats</p>
      <div className="space-y-8">
        {playersByTeam.map(([team, players]) => {
          const tc = getTeamColors(team)
          return (
            <div key={team}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ background: tc.primary }}></div>
                <h3 className="text-sm font-semibold tracking-wide" style={{ color: tc.primary }}>{team}</h3>
                <div className="flex-1 h-px" style={{ background: `${tc.primary}22` }}></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {players.map(p => (
                  <button
                    key={p.player_id}
                    onClick={() => onSelect(p.player_id)}
                    className="px-3 py-1.5 rounded-full text-sm bg-white border transition-all hover:shadow-md"
                    style={{ borderColor: `${tc.primary}30`, color: '#334155' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = tc.primary; e.currentTarget.style.color = tc.primary }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = `${tc.primary}30`; e.currentTarget.style.color = '#334155' }}
                  >
                    {p.name} <span className="text-slate-400 text-xs ml-1">{p.pts.toFixed(1)}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CompareView({ allPlayers, playersByTeam, season }: { allPlayers: LeaguePlayer[]; playersByTeam: [string, LeaguePlayer[]][]; season: string }) {
  const [idA, setIdA] = useState<number | null>(null)
  const [idB, setIdB] = useState<number | null>(null)

  const playerA = allPlayers.find(p => p.player_id === idA) ?? null
  const playerB = allPlayers.find(p => p.player_id === idB) ?? null
  const colorA = playerA ? getTeamColors(playerA.team) : null
  const colorB = playerB ? getTeamColors(playerB.team) : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>Compare Players</h2>
        <p className="text-sm text-slate-400 mt-1">{season} season &middot; All WNBA</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Player A</label>
          <select
            value={idA ?? ''}
            onChange={e => setIdA(Number(e.target.value))}
            className="w-full rounded-full px-4 py-2 text-sm bg-white border border-slate-200 cursor-pointer focus:outline-none"
          >
            <option value="" disabled>Choose a player</option>
            {playersByTeam.map(([team, players]) => (
              <optgroup key={team} label={team}>
                {players.map(p => (
                  <option key={p.player_id} value={p.player_id}>{p.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Player B</label>
          <select
            value={idB ?? ''}
            onChange={e => setIdB(Number(e.target.value))}
            className="w-full rounded-full px-4 py-2 text-sm bg-white border border-slate-200 cursor-pointer focus:outline-none"
          >
            <option value="" disabled>Choose a player</option>
            {playersByTeam.map(([team, players]) => (
              <optgroup key={team} label={team}>
                {players.map(p => (
                  <option key={p.player_id} value={p.player_id}>{p.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {playerA && playerB && colorA && colorB ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CompareCard player={playerA} tc={colorA} />
            <CompareCard player={playerB} tc={colorB} />
          </div>
          <PlayerComparison playerA={playerA} playerB={playerB} nameA={playerA.name} nameB={playerB.name} teamColorA={colorA} teamColorB={colorB} />
        </div>
      ) : (
        <p className="text-center py-16 text-slate-300 text-sm italic">Pick two players to compare</p>
      )}
    </div>
  )
}

function CompareCard({ player, tc }: { player: LeaguePlayer; tc: { primary: string; bg: string } }) {
  return (
    <div className="rounded-2xl p-5 transition-all" style={{ background: tc.bg, border: `1px solid ${tc.primary}20` }}>
      <h3 className="text-lg font-medium" style={{ color: tc.primary }}>{player.name}</h3>
      <p className="text-xs text-slate-400 mb-3">{player.team} &middot; {player.gp} GP &middot; {player.min.toFixed(1)} MPG</p>
      <div className="grid grid-cols-4 gap-3 text-center">
        <div><div className="text-base font-semibold text-slate-700">{player.pts.toFixed(1)}</div><div className="text-[10px] text-slate-400">PTS</div></div>
        <div><div className="text-base font-semibold text-slate-700">{player.reb.toFixed(1)}</div><div className="text-[10px] text-slate-400">REB</div></div>
        <div><div className="text-base font-semibold text-slate-700">{player.ast.toFixed(1)}</div><div className="text-[10px] text-slate-400">AST</div></div>
        <div><div className="text-base font-semibold text-slate-700">{player.stl.toFixed(1)}</div><div className="text-[10px] text-slate-400">STL</div></div>
      </div>
    </div>
  )
}
