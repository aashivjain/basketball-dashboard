import { useEffect, useState, useMemo } from 'react'
import type { WnbaDashboardData, SeasonData, LeaguePlayer } from '../types'
import { getTeamColors } from '../utils/teamColors'
import PlayerCard from './PlayerCard'
import ShotChart from './ShotChart'
import StatsRadar from './StatsRadar'
import PerformanceTrend from './PerformanceTrend'
import GameLogTable from './GameLogTable'
import ShotZoneBreakdown from './ShotZoneBreakdown'
import PlayerComparison from './PlayerComparison'
import GrowthChart from './GrowthChart'
import AdvancedStats from './AdvancedStats'
import NextGamePrediction from './NextGamePrediction'
import { buildPlayerImpactIndex } from '../utils/playerImpact'

import rawData from '../data/wnba_data.json'

const data = rawData as unknown as WnbaDashboardData
const availableSeasons = Object.keys(data.seasons).filter(s => data.seasons[s] !== null).sort()

export default function Dashboard() {
  const [season, setSeason] = useState(data.team.current_season)
  const [seasonType, setSeasonType] = useState<'regular_season' | 'playoffs'>('regular_season')
  const [playerId, setPlayerId] = useState<number | null>(null)
  const [compareId, setCompareId] = useState<number | null>(null)
  const [showCompare, setShowCompare] = useState(false)
  const [section, setSection] = useState<'players' | 'teams'>('players')
  const [playerTab, setPlayerTab] = useState<'overview' | 'compare'>('overview')

  const seasonData = data.seasons[season] as SeasonData | null
  const block = seasonData ? seasonData[seasonType] : null
  const allPlayers: LeaguePlayer[] = useMemo(() => block?.all_players ?? [], [block])
  const rosterById = useMemo(() => {
    const entries = seasonData?.roster ?? []
    return new Map(entries.map(player => [player.player_id, player]))
  }, [seasonData])

  const playersByTeam = useMemo(() => {
    const map: Record<string, LeaguePlayer[]> = {}
    for (const p of allPlayers) {
      if (!map[p.team]) map[p.team] = []
      map[p.team].push(p)
    }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]))
  }, [allPlayers])

  const impactIndex = useMemo(() => buildPlayerImpactIndex(allPlayers), [allPlayers])

  const player = useMemo(() => allPlayers.find(p => p.player_id === playerId) ?? null, [allPlayers, playerId])
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
      // Look in all_players first (works for every player), then fall back to stats (Fever detailed)
      const ap = sd.regular_season.all_players?.find(x => x.player_id === playerId)
      if (ap) return { season: yr, ...ap }
      const s = sd.regular_season.stats.find(x => x.player_id === playerId)
      if (!s) return null
      return { season: yr, ...s }
    }).filter(Boolean) as any[]
  }, [playerId])

  const teamColor = player ? getTeamColors(player.team) : null

  useEffect(() => {
    if (!availableSeasons.includes(season) && availableSeasons.length > 0) {
      setSeason(availableSeasons[availableSeasons.length - 1])
    }
  }, [season])

  useEffect(() => {
    if (!allPlayers.length) {
      setPlayerId(null)
      setCompareId(null)
      setShowCompare(false)
      return
    }

    if (playerId === null || !allPlayers.some(player => player.player_id === playerId)) {
      setPlayerId(allPlayers[0]?.player_id ?? null)
      setCompareId(null)
      setShowCompare(false)
    }
  }, [allPlayers, playerId])

  // Compute position averages by classifying players into Guard/Wing/Big
  const positionAvg = useMemo(() => {
    if (!player || allPlayers.length === 0) return null
    const normalizePosition = (position: string | undefined) => {
      if (!position) return null
      if (position.includes('G')) return 'Guard'
      if (position.includes('F')) return 'Wing'
      if (position.includes('C')) return 'Big'
      return null
    }
    const classify = (p: LeaguePlayer) => {
      const listed = normalizePosition(rosterById.get(p.player_id)?.position)
      if (listed) return listed
      if (p.ast >= p.reb * 0.7 && p.reb < 6) return 'Guard'
      if (p.reb >= p.ast * 2.5 || p.reb >= 7) return 'Big'
      return 'Wing'
    }
    const pos = classify(player)
    const group = allPlayers.filter(p => classify(p) === pos && p.gp >= 5)
    if (group.length === 0) return null
    const avg = (key: 'pts' | 'reb' | 'ast' | 'stl' | 'blk') =>
      group.reduce((s, p) => s + p[key], 0) / group.length
    return { pts: avg('pts'), reb: avg('reb'), ast: avg('ast'), stl: avg('stl'), blk: avg('blk'), label: pos }
  }, [player, allPlayers, rosterById])

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ background: section === 'players' && teamColor ? teamColor.bg : '#fafafa' }}>
      <header className="sticky top-0 z-40 backdrop-blur-md border-b border-slate-200/60" style={{ background: 'rgba(255,255,255,0.95)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-5 flex-wrap">
          <h1 className="text-xl tracking-tight mr-auto font-semibold" style={{ fontFamily: "'DM Serif Display', Georgia, serif", color: '#1e293b' }}>
            WNBA Analytics
          </h1>

          <nav className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 text-sm">
            <button
              onClick={() => setSection('players')}
              className="rounded-full px-3 py-1.5 transition-all"
              style={{ background: section === 'players' ? '#1e293b' : 'transparent', color: section === 'players' ? '#fff' : '#64748b', fontWeight: 600 }}
            >Players</button>
            <button
              onClick={() => setSection('teams')}
              className="rounded-full px-3 py-1.5 transition-all"
              style={{ background: section === 'teams' ? '#1e293b' : 'transparent', color: section === 'teams' ? '#fff' : '#64748b', fontWeight: 600 }}
            >Teams</button>
          </nav>

          <select
            value={season}
            onChange={e => setSeason(e.target.value)}
            className="rounded-full px-4 py-1.5 text-sm cursor-pointer focus:outline-none transition-all appearance-none"
            style={{
              border: '1.5px solid #cbd5e1',
              background: 'white',
              color: '#334155',
              minWidth: '92px',
              paddingRight: '2rem',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
            }}
          >
            {availableSeasons.map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>

          <div className="flex gap-2 text-sm">
            {(['regular_season', 'playoffs'] as const).map(st => (
              <button
                key={st}
                onClick={() => setSeasonType(st)}
                className="transition-all"
                style={{ color: seasonType === st ? '#1e293b' : '#94a3b8', fontWeight: seasonType === st ? 600 : 400, fontSize: '13px' }}
              >{st === 'regular_season' ? 'Regular' : 'Playoffs'}</button>
            ))}
          </div>

          {section === 'players' && (
            <>
              <nav className="flex gap-2 text-sm">
                <button
                  onClick={() => setPlayerTab('overview')}
                  className="transition-all"
                  style={{ color: playerTab === 'overview' ? '#1e293b' : '#94a3b8', fontWeight: playerTab === 'overview' ? 600 : 400 }}
                >Overview</button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={() => setPlayerTab('compare')}
                  className="transition-all"
                  style={{ color: playerTab === 'compare' ? '#1e293b' : '#94a3b8', fontWeight: playerTab === 'compare' ? 600 : 400 }}
                >Compare</button>
              </nav>

              <select
                value={playerId ?? ''}
                onChange={e => { setPlayerId(Number(e.target.value)); setCompareId(null); setShowCompare(false) }}
                className="rounded-full px-4 py-1.5 text-sm cursor-pointer focus:outline-none transition-all text-center appearance-none"
                style={{ border: '1.5px solid #cbd5e1', background: 'white', color: '#334155', minWidth: '160px', paddingRight: '2rem', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
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
            </>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {section === 'teams' ? (
          <NextGamePrediction block={block} />
        ) : playerTab === 'compare' ? (
          <CompareView allPlayers={allPlayers} playersByTeam={playersByTeam} season={season} />
        ) : !player || !leagueAvg ? (
          <LandingGrid playersByTeam={playersByTeam} onSelect={setPlayerId} />
        ) : (
          <div className="space-y-8">
            <div className="flex items-end gap-6 flex-wrap">
              <div>
                <p className="text-sm uppercase tracking-widest mb-1 font-medium" style={{ color: teamColor?.primary ?? '#64748b', fontFamily: "'Inter', sans-serif" }}>{player.team}</p>
                <h2 className="text-4xl font-normal tracking-tight" style={{ fontFamily: "'DM Serif Display', Georgia, serif", color: '#1e293b' }}>{player.name}</h2>
                <p className="text-sm text-slate-400 mt-1.5" style={{ fontFamily: "'Inter', sans-serif" }}>{player.gp} games &middot; {player.min.toFixed(1)} min/game &middot; {season}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              <PlayerCard
                player={player}
                teamColor={teamColor!}
                impactIndex={impactIndex.byPlayerId[player.player_id]
                  ? {
                      score: impactIndex.byPlayerId[player.player_id].score,
                      average: impactIndex.averageScore,
                      summary: impactIndex.byPlayerId[player.player_id].summary,
                    }
                  : null}
              />
              <div className="lg:col-span-2 h-full">
                <StatsRadar player={player} leagueAvg={leagueAvg} positionAvg={positionAvg} teamColor={teamColor!} compareStats={comparePlayer} compareName={comparePlayer?.name} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ShotChart shots={shots} teamColor={teamColor!} />
              {shots.length > 0 && <ShotZoneBreakdown shots={shots} teamColor={teamColor!} />}
            </div>

            <AdvancedStats player={player} games={games} teamColor={teamColor!} leagueAvg={leagueAvg} />

            {games.length > 0 && (
              <PerformanceTrend games={games} teamColor={teamColor!} />
            )}

            {growthData.length > 1 && (
              <GrowthChart data={growthData} playerName={player.name} teamColor={teamColor!} />
            )}

            {games.length > 0 && <GameLogTable games={games} teamColor={teamColor!} />}

            {/* Compare section at end of profile */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-4 flex-wrap">
                <button
                  onClick={() => setShowCompare(!showCompare)}
                  className="text-sm px-5 py-2.5 rounded-full transition-all font-medium"
                  style={{ border: `1.5px solid ${teamColor?.primary ?? '#cbd5e1'}`, color: teamColor?.primary ?? '#334155', background: showCompare ? `${teamColor?.primary}10` : 'white' }}
                >{showCompare ? 'Hide comparison' : `Compare ${player.name.split(' ').pop()} with another player`}</button>
                {showCompare && (
                  <select
                    value={compareId ?? ''}
                    onChange={e => setCompareId(Number(e.target.value))}
                    className="rounded-full px-4 py-2 text-sm cursor-pointer focus:outline-none border border-slate-200 bg-white text-slate-700"
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
                <div className="mt-6">
                  <PlayerComparison playerA={player} playerB={comparePlayer} nameA={player.name} nameB={comparePlayer.name} teamColorA={teamColor!} teamColorB={getTeamColors(comparePlayer.team)} />
                </div>
              )}
            </div>
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
