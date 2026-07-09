import { useEffect, useState, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import type { SeasonData, LeaguePlayer } from '../types'
import { getReadableTeamAccent, getTeamColors } from '../utils/teamColors'
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
import NewsHub from './NewsHub'
import GamesHub from './GamesHub'
import LeagueHub from './LeagueHub'
import { buildPlayerImpactIndex } from '../utils/playerImpact'
import { loadDashboardData } from '../utils/dataValidation'
import { useDashboardState, usePlayerSelectionState } from '../hooks/useDashboardState'
import { usePlayerRouteState } from '../hooks/usePlayerRouteState'
import { getDisplayTeamCode, getTeamSearchAliases } from '../utils/teamCodes'
import {
  getAvailableSeasons,
  getGrowthData,
  getPlayerGames,
  getPlayerShots,
  getPlayersByTeam,
  getPositionAverage,
  getRosterById,
} from '../utils/dashboardSelectors'

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { data, issues: dataIssues } = loadDashboardData()
  const availableSeasons = useMemo(() => getAvailableSeasons(data), [data])
  const {
    season,
    setSeason,
    seasonType,
    setSeasonType,
  } = useDashboardState({
    initialSeason: data.team.current_season,
    availableSeasons,
  })
  const seasonData = data.seasons[season] as SeasonData | null
  const block = seasonData ? seasonData[seasonType] : null
  const allPlayers: LeaguePlayer[] = useMemo(() => block?.all_players ?? [], [block])
  const {
    playerId,
    setPlayerId,
    compareId,
    setCompareId,
    setShowCompare,
  } = usePlayerSelectionState(allPlayers)
  const rosterById = useMemo(() => getRosterById(seasonData), [seasonData])
  const playersByTeam = useMemo(() => getPlayersByTeam(allPlayers), [allPlayers])

  const impactIndex = useMemo(() => buildPlayerImpactIndex(allPlayers), [allPlayers])

  const {
    section,
    playerTab,
    selectedPlayerId,
    setSelectedPlayerId,
    buildPlayerRoute,
  } = usePlayerRouteState({
    allPlayers,
    fallbackPlayerId: playerId,
    onFallbackSelect: setPlayerId,
  })
  const player = useMemo(() => allPlayers.find(p => p.player_id === selectedPlayerId) ?? null, [allPlayers, selectedPlayerId])
  const games = useMemo(() => getPlayerGames(block, selectedPlayerId), [block, selectedPlayerId])
  const shots = useMemo(() => getPlayerShots(block, selectedPlayerId), [block, selectedPlayerId])
  const leagueAvg = block?.league_averages ?? null
  const comparePlayer: LeaguePlayer | null = useMemo(
    () => allPlayers.find(p => p.player_id === compareId) ?? null,
    [allPlayers, compareId]
  )

  const growthData = useMemo(() => getGrowthData(data, availableSeasons, selectedPlayerId), [data, availableSeasons, selectedPlayerId])

  const teamColor = player ? getTeamColors(player.team) : null
  const playerAccent = player ? getReadableTeamAccent(player.team) : '#334155'
  const isPlayersOverview = section === 'players' && playerTab === 'overview'
  const isPlayersCompare = section === 'players' && playerTab === 'compare'
  const isPlayersRankings = section === 'players' && playerTab === 'rankings'
  const isPlayersBuilder = section === 'players' && playerTab === 'builder'
  const showSeasonTypeToggle = section === 'players' || section === 'teams' || section === 'games'

  const positionAvg = useMemo(() => getPositionAverage(player, allPlayers, rosterById), [player, allPlayers, rosterById])
  const searchableTeams = useMemo(
    () => playersByTeam.map(([team]) => ({
      team,
      displayTeam: getDisplayTeamCode(team),
      aliases: getTeamSearchAliases(team),
    })),
    [playersByTeam]
  )
  return (
    <div className="ui-shell min-h-screen transition-colors duration-500" style={{ background: isPlayersOverview && player && teamColor ? `linear-gradient(180deg, ${teamColor.bg} 0%, #edf2f7 28%)` : undefined }}>
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-[rgba(248,250,252,0.90)] backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-3 md:px-6">
          <div className="grid gap-3 md:gap-4 lg:grid-cols-[220px_minmax(0,1fr)_280px] lg:items-center">
            <div className="flex min-h-[58px] items-center justify-center lg:justify-start">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">WNBA Analytics</div>
                <div className="mt-1 text-[23px] leading-none tracking-tight text-slate-950" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                  Dashboard
                </div>
              </div>
            </div>

            <div className="flex min-h-[58px] items-center justify-center">
              <div className="grid w-full max-w-[520px] grid-cols-5 items-center gap-1.5 rounded-[22px] border border-slate-200/90 bg-white/90 p-1 text-sm shadow-sm">
              <NavLink
                to="/players"
                className="ui-nav-button rounded-full px-3 py-2 text-center text-[13px] transition-all sm:px-3.5 sm:py-1.5 sm:text-sm"
                style={{ background: section === 'players' ? '#1e293b' : 'transparent', color: section === 'players' ? '#fff' : '#64748b', fontWeight: 600 }}
              >Players</NavLink>
              <NavLink
                to="/league"
                className="ui-nav-button rounded-full px-3 py-2 text-center text-[13px] transition-all sm:px-3.5 sm:py-1.5 sm:text-sm"
                style={{ background: section === 'league' ? '#1e293b' : 'transparent', color: section === 'league' ? '#fff' : '#64748b', fontWeight: 600 }}
              >League</NavLink>
              <NavLink
                to="/teams"
                className="ui-nav-button rounded-full px-3 py-2 text-center text-[13px] transition-all sm:px-3.5 sm:py-1.5 sm:text-sm"
                style={{ background: section === 'teams' ? '#1e293b' : 'transparent', color: section === 'teams' ? '#fff' : '#64748b', fontWeight: 600 }}
              >Teams</NavLink>
              <NavLink
                to="/games"
                className="ui-nav-button rounded-full px-3 py-2 text-center text-[13px] transition-all sm:px-3.5 sm:py-1.5 sm:text-sm"
                style={{ background: section === 'games' ? '#1e293b' : 'transparent', color: section === 'games' ? '#fff' : '#64748b', fontWeight: 600 }}
              >Games</NavLink>
              <NavLink
                to="/news"
                className="ui-nav-button rounded-full px-3 py-2 text-center text-[13px] transition-all sm:px-3.5 sm:py-1.5 sm:text-sm"
                style={{ background: section === 'news' ? '#1e293b' : 'transparent', color: section === 'news' ? '#fff' : '#64748b', fontWeight: 600 }}
              >News</NavLink>
              </div>
            </div>

            <div className="flex min-h-[58px] items-center justify-stretch lg:justify-end">
              <div className="w-full max-w-full lg:max-w-[280px]">
                <QuickSearch
                  allPlayers={allPlayers}
                  teams={searchableTeams}
                  onSelectPlayer={(playerId) => {
                    setSelectedPlayerId(playerId)
                    setCompareId(null)
                    setShowCompare(false)
                    navigate(buildPlayerRoute('overview', playerId))
                    if (typeof window !== 'undefined') {
                      window.requestAnimationFrame(() => {
                        window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
                      })
                    }
                  }}
                  onSelectTeam={(team) => {
                    navigate(`/teams?team=${encodeURIComponent(team)}`)
                    if (typeof window !== 'undefined') {
                      window.requestAnimationFrame(() => {
                        window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
                      })
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {(section === 'players' || section === 'teams' || section === 'games' || section === 'league') && (
            <div className="mt-3 flex items-center gap-2.5 flex-wrap rounded-[20px] border border-slate-200/80 bg-white/88 px-3 py-2 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.35)]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Context</div>
              <select
                value={season}
                onChange={e => setSeason(e.target.value)}
                aria-label="Season"
                className="ui-control rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm cursor-pointer appearance-none text-slate-700"
                style={{ minWidth: '110px', paddingRight: '2rem', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
              >
                {availableSeasons.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>

              {showSeasonTypeToggle && (
                <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 text-sm">
                  {(['regular_season', 'playoffs'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setSeasonType(st)}
                      className="ui-nav-button rounded-full px-3 py-1 transition-all"
                      style={{
                        background: seasonType === st ? '#1e293b' : 'transparent',
                        color: seasonType === st ? '#fff' : '#64748b',
                        fontWeight: seasonType === st ? 600 : 500,
                        fontSize: '13px',
                      }}
                    >{st === 'regular_season' ? 'Regular' : 'Playoffs'}</button>
                  ))}
                </div>
              )}

              {section === 'players' && (
              <>
                <nav className="grid grid-cols-2 gap-1 rounded-[18px] border border-slate-200 bg-slate-50 p-1 text-sm sm:flex sm:items-center">
                <NavLink
                  to={buildPlayerRoute('overview')}
                  className="ui-nav-button rounded-full px-3 py-1 transition-all"
                  style={{ background: playerTab === 'overview' ? '#1e293b' : 'transparent', color: playerTab === 'overview' ? '#fff' : '#64748b', fontWeight: playerTab === 'overview' ? 600 : 500 }}
                >Overview</NavLink>
                <NavLink
                  to="/players/compare"
                  className="ui-nav-button rounded-full px-3 py-1 transition-all"
                  style={{ background: playerTab === 'compare' ? '#1e293b' : 'transparent', color: playerTab === 'compare' ? '#fff' : '#64748b', fontWeight: playerTab === 'compare' ? 600 : 500 }}
                >Compare</NavLink>
                <NavLink
                  to={buildPlayerRoute('rankings')}
                  className="ui-nav-button rounded-full px-3 py-1 transition-all"
                  style={{ background: playerTab === 'rankings' ? '#1e293b' : 'transparent', color: playerTab === 'rankings' ? '#fff' : '#64748b', fontWeight: playerTab === 'rankings' ? 600 : 500 }}
                >Rankings</NavLink>
                <NavLink
                  to="/players/builder"
                  className="ui-nav-button rounded-full px-3 py-1 transition-all"
                  style={{ background: playerTab === 'builder' ? '#1e293b' : 'transparent', color: playerTab === 'builder' ? '#fff' : '#64748b', fontWeight: playerTab === 'builder' ? 600 : 500 }}
                >Builder</NavLink>
                </nav>

                {(isPlayersOverview || isPlayersRankings) && (
                  <select
                    value={selectedPlayerId ?? ''}
                    onChange={e => { setSelectedPlayerId(Number(e.target.value)); setCompareId(null); setShowCompare(false) }}
                    aria-label="Selected player"
                    className="ui-control rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm cursor-pointer appearance-none text-slate-700"
                    style={{ minWidth: '220px', maxWidth: '320px', paddingRight: '2rem', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
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
                )}

                {isPlayersCompare && (
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
                    Pick both players below to compare this season.
                  </div>
                )}

                {isPlayersRankings && (
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
                    League-wide leaderboard for the selected season.
                  </div>
                )}

                {isPlayersBuilder && (
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
                    Build a custom WNBA player profile and estimate their impact score.
                  </div>
                )}
              </>
              )}

              {section === 'games' && (
                <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
                  Keep your streak alive in a higher-or-lower WNBA stats challenge.
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 md:px-6">
        {dataIssues.length > 0 && (
          <div className="mb-6 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
            Data validation warnings: {dataIssues.join(' ')}
          </div>
        )}
        {section === 'league' ? (
          <LeagueHub block={block} season={season} />
        ) : section === 'teams' ? (
          <NextGamePrediction block={block} />
        ) : section === 'games' ? (
          <GamesHub key={`${season}-${seasonType}`} block={block} season={season} seasonType={seasonType} />
        ) : section === 'news' ? (
          <NewsHub block={block} news={data.news} />
        ) : playerTab === 'compare' ? (
          <CompareView allPlayers={allPlayers} playersByTeam={playersByTeam} season={season} />
        ) : playerTab === 'rankings' ? (
          <RankingsView allPlayers={allPlayers} season={season} impactIndex={impactIndex} selectedPlayerId={selectedPlayerId} buildOverviewHref={buildPlayerRoute} />
        ) : playerTab === 'builder' ? (
          <BuildPlayerView key={`${season}-${seasonType}`} allPlayers={allPlayers} season={season} seasonType={seasonType} />
        ) : !player || !leagueAvg ? (
          <LandingGrid playersByTeam={playersByTeam} onSelect={setSelectedPlayerId} />
        ) : (
          <div className="space-y-8">
            <div className="app-panel px-6 py-6 md:px-7">
              <div className="flex items-end justify-between gap-6 flex-wrap">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] mb-2 font-semibold" style={{ color: playerAccent }}>{player.team}</p>
                  <h2 className="text-4xl md:text-5xl font-normal tracking-tight text-slate-950" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>{player.name}</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{player.gp} games played, {player.min.toFixed(1)} minutes per game, with full shot profile, trend view, and season context for {season}.</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <MetricChip label="PTS" value={player.pts.toFixed(1)} />
                  <MetricChip label="AST" value={player.ast.toFixed(1)} />
                  <MetricChip label="REB" value={player.reb.toFixed(1)} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              <PlayerCard
                player={player}
                teamColor={teamColor!}
                accentColor={playerAccent}
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

            <div className="pt-4 border-t border-slate-100">
              <NavLink
                to={selectedPlayerId ? `/players/compare?playerA=${selectedPlayerId}` : '/players/compare'}
                className="inline-flex rounded-full px-5 py-2.5 text-sm font-medium transition-all"
                style={{ border: `1.5px solid ${playerAccent}35`, color: playerAccent, background: 'white' }}
              >
                {`Compare ${player.name.split(' ').pop()} with another player`}
              </NavLink>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

type QuickSearchTeamOption = {
  team: string
  displayTeam: string
  aliases: string[]
}

function QuickSearch({
  allPlayers,
  teams,
  onSelectPlayer,
  onSelectTeam,
}: {
  allPlayers: LeaguePlayer[]
  teams: QuickSearchTeamOption[]
  onSelectPlayer: (playerId: number) => void
  onSelectTeam: (team: string) => void
}) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const normalizedQuery = query.trim().toLowerCase()
  const hasTypedQuery = normalizedQuery.length > 0
  const playerMatches = useMemo(() => {
    if (!hasTypedQuery) return []

    return allPlayers
      .filter(player => {
        const name = player.name.toLowerCase()
        const team = getDisplayTeamCode(player.team).toLowerCase()
        return name.includes(normalizedQuery) || team.includes(normalizedQuery)
      })
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(normalizedQuery) ? 1 : 0
        const bStarts = b.name.toLowerCase().startsWith(normalizedQuery) ? 1 : 0
        if (aStarts !== bStarts) return bStarts - aStarts
        return a.name.localeCompare(b.name)
      })
      .slice(0, 8)
  }, [allPlayers, hasTypedQuery, normalizedQuery])

  const teamMatches = useMemo(() => {
    if (!hasTypedQuery) return []

    return teams
      .filter(teamOption => {
        const teamLabel = teamOption.displayTeam.toLowerCase()
        return teamLabel.includes(normalizedQuery)
          || teamOption.aliases.some(alias => alias.includes(normalizedQuery))
      })
      .sort((a, b) => {
        const aStarts = a.aliases.some(alias => alias.startsWith(normalizedQuery)) || a.displayTeam.toLowerCase().startsWith(normalizedQuery) ? 1 : 0
        const bStarts = b.aliases.some(alias => alias.startsWith(normalizedQuery)) || b.displayTeam.toLowerCase().startsWith(normalizedQuery) ? 1 : 0
        if (aStarts !== bStarts) return bStarts - aStarts
        return a.displayTeam.localeCompare(b.displayTeam)
      })
      .slice(0, 6)
  }, [hasTypedQuery, normalizedQuery, teams])

  const items = useMemo(() => ([
    ...teamMatches.map(option => ({ key: `team-${option.team}`, type: 'team' as const, option })),
    ...playerMatches.map(option => ({ key: `player-${option.player_id}`, type: 'player' as const, option })),
  ]), [playerMatches, teamMatches])
  const hasResults = items.length > 0
  const showDropdown = isOpen && (hasTypedQuery || hasResults)

  const safeActiveIndex = hasResults ? Math.min(activeIndex, items.length - 1) : 0

  const handlePlayerSelect = (playerId: number) => {
    setQuery('')
    setIsOpen(false)
    setActiveIndex(0)
    onSelectPlayer(playerId)
  }

  const handleTeamSelect = (team: string) => {
    setQuery('')
    setIsOpen(false)
    setActiveIndex(0)
    onSelectTeam(team)
  }

  return (
    <div ref={containerRef} className="relative min-w-[280px] flex-1 max-w-lg">
      <div className="flex items-center gap-3 rounded-full border border-slate-200/90 bg-white/95 px-4 py-2.5 shadow-sm transition focus-within:border-slate-300 focus-within:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <span className="text-slate-400" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActiveIndex(0)
            setIsOpen(e.target.value.trim().length > 0)
          }}
          onFocus={() => {
            if (query.trim().length > 0) {
              setActiveIndex(0)
              setIsOpen(true)
            }
          }}
          onKeyDown={(event) => {
            if (!isOpen && (event.key === 'ArrowDown' || event.key === 'Enter')) {
              if (query.trim().length > 0) setIsOpen(true)
              return
            }

            if (!items.length) {
              if (event.key === 'Escape') setIsOpen(false)
              return
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActiveIndex(current => (current + 1) % items.length)
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActiveIndex(current => (current - 1 + items.length) % items.length)
            } else if (event.key === 'Enter') {
              event.preventDefault()
              const activeItem = items[safeActiveIndex]
              if (!activeItem) return
              if (activeItem.type === 'team') handleTeamSelect(activeItem.option.team)
              if (activeItem.type === 'player') handlePlayerSelect(activeItem.option.player_id)
            } else if (event.key === 'Escape') {
              setIsOpen(false)
            }
          }}
          aria-label="Quick search"
          placeholder="Search players or teams"
          className="search-input w-full bg-transparent text-sm text-slate-700 outline-none"
        />
        {hasTypedQuery ? (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setIsOpen(false)
              setActiveIndex(0)
            }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
            aria-label="Clear search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        ) : (
          <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:inline-flex">
            Find
          </span>
        )}
      </div>

      {showDropdown && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_28px_60px_-30px_rgba(15,23,42,0.45)]">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Search</div>
                <div className="mt-1 text-xs text-slate-500">Players and teams, with team-name aliases too.</div>
              </div>
              {hasTypedQuery && (
                <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {items.length} result{items.length === 1 ? '' : 's'}
                </div>
              )}
            </div>
          </div>
          <div className="max-h-[min(65vh,30rem)] overflow-y-auto px-3 py-3">
          {teamMatches.length > 0 && (
            <div className="border-b border-slate-100 px-1 pb-3">
              <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Teams</div>
              <div className="space-y-1">
                {teamMatches.map((teamOption, index) => {
                  const tc = getTeamColors(teamOption.team)
                  const itemIndex = index

                  return (
                    <button
                      key={teamOption.team}
                      type="button"
                      onClick={() => handleTeamSelect(teamOption.team)}
                      onMouseEnter={() => setActiveIndex(itemIndex)}
                      className="flex w-full items-center justify-between rounded-2xl border border-transparent px-3 py-2.5 text-left transition hover:bg-slate-50"
                      style={{ background: safeActiveIndex === itemIndex ? '#f8fafc' : 'transparent' }}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-800">{teamOption.displayTeam}</span>
                        <span className="block text-[11px] text-slate-500">Team</span>
                      </span>
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: tc.primary }} />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="px-1 pt-3">
            <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Players</div>
            {playerMatches.length > 0 ? (
              <div className="space-y-1">
                {playerMatches.map((playerOption, index) => {
                  const tc = getTeamColors(playerOption.team)
                  const itemIndex = teamMatches.length + index

                  return (
                    <button
                      key={playerOption.player_id}
                      type="button"
                      onClick={() => handlePlayerSelect(playerOption.player_id)}
                      onMouseEnter={() => setActiveIndex(itemIndex)}
                      className="flex w-full items-center justify-between rounded-2xl border border-transparent px-3 py-2.5 text-left transition hover:bg-slate-50"
                      style={{ background: safeActiveIndex === itemIndex ? '#f8fafc' : 'transparent' }}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-800">{playerOption.name}</span>
                        <span className="block text-xs text-slate-500">{getDisplayTeamCode(playerOption.team)}</span>
                      </span>
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: tc.primary }} />
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                No players or teams found for "{query.trim()}".
              </div>
            )}
          </div>
          </div>

          {!hasTypedQuery && (
            <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
              Try names like `A'ja Wilson`, `Caitlin Clark`, `IND`, `Liberty`, or `Aces`.
            </div>
          )}

          {hasTypedQuery && !hasResults && (
            <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
              Try a player name, team abbreviation, or team nickname.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RankingsView({
  allPlayers,
  season,
  impactIndex,
  selectedPlayerId,
  buildOverviewHref,
}: {
  allPlayers: LeaguePlayer[]
  season: string
  impactIndex: ReturnType<typeof buildPlayerImpactIndex>
  selectedPlayerId: number | null
  buildOverviewHref: (tab: 'overview' | 'rankings', playerIdOverride?: number | null) => string
}) {
  const [metric, setMetric] = useState<'impact' | 'pts' | 'ast' | 'reb' | 'ts' | 'fg3'>('impact')
  const navigate = useNavigate()
  const rankingMinMinutesPerGame = 5
  const trueShootingMinAttempts = 3.5
  const threePointMinAttempts = 1.25
  const impactMinGames = useMemo(() => {
    const maxGamesPlayed = allPlayers.reduce((maxGames, player) => Math.max(maxGames, player.gp), 0)
    return Math.ceil(maxGamesPlayed / 4)
  }, [allPlayers])

  const metricConfig = useMemo(() => {
    const getTs = (player: LeaguePlayer) => (
      player.fga + 0.44 * player.fta > 0
        ? player.pts / (2 * (player.fga + 0.44 * player.fta))
        : 0
    )

    return {
      impact: {
        label: 'Player Impact Index',
        title: 'Selected Player',
        averageLabel: `Min ${impactMinGames} GP`,
        valueLabel: 'Impact',
        description: `Overall two-way impact using the dashboard’s season-relative index, limited to players with at least ${impactMinGames} games and ${rankingMinMinutesPerGame}+ MPG.`,
        qualify: (player: LeaguePlayer) => player.gp >= impactMinGames && player.min >= rankingMinMinutesPerGame && Boolean(impactIndex.byPlayerId[player.player_id]),
        getQualificationFailure: (player: LeaguePlayer) => {
          if (player.gp < impactMinGames) return `Needs ${impactMinGames} games played. Currently at ${player.gp}.`
          if (player.min < rankingMinMinutesPerGame) return `Needs at least ${rankingMinMinutesPerGame.toFixed(1)} MPG. Currently at ${player.min.toFixed(1)} MPG.`
          if (!impactIndex.byPlayerId[player.player_id]) return 'No impact score is available for this player in the current season block.'
          return null
        },
        value: (player: LeaguePlayer) => impactIndex.byPlayerId[player.player_id]?.score ?? 0,
        format: (value: number) => value.toFixed(1),
        detail: (player: LeaguePlayer) => `${impactIndex.byPlayerId[player.player_id]?.summary ?? 'Season impact snapshot.'} ${player.gp} GP • ${player.min.toFixed(1)} MPG.`,
      },
      pts: {
        label: 'Points',
        title: 'Top Scorers',
        averageLabel: 'Per game',
        valueLabel: 'PTS',
        description: `Highest scoring averages for the selected season among players with at least ${impactMinGames} games and ${rankingMinMinutesPerGame}+ MPG.`,
        qualify: (player: LeaguePlayer) => player.gp >= impactMinGames && player.min >= rankingMinMinutesPerGame,
        getQualificationFailure: (player: LeaguePlayer) => {
          if (player.gp < impactMinGames) return `Needs ${impactMinGames} games played. Currently at ${player.gp}.`
          if (player.min < rankingMinMinutesPerGame) return `Needs at least ${rankingMinMinutesPerGame.toFixed(1)} MPG. Currently at ${player.min.toFixed(1)} MPG.`
          return null
        },
        value: (player: LeaguePlayer) => player.pts,
        format: (value: number) => value.toFixed(1),
        detail: (player: LeaguePlayer) => `${player.fgm.toFixed(1)} FGM on ${player.fga.toFixed(1)} FGA per game.`,
      },
      ast: {
        label: 'Assists',
        title: 'Top Playmakers',
        averageLabel: 'Per game',
        valueLabel: 'AST',
        description: `Best assist creators this season among players with at least ${impactMinGames} games and ${rankingMinMinutesPerGame}+ MPG.`,
        qualify: (player: LeaguePlayer) => player.gp >= impactMinGames && player.min >= rankingMinMinutesPerGame,
        getQualificationFailure: (player: LeaguePlayer) => {
          if (player.gp < impactMinGames) return `Needs ${impactMinGames} games played. Currently at ${player.gp}.`
          if (player.min < rankingMinMinutesPerGame) return `Needs at least ${rankingMinMinutesPerGame.toFixed(1)} MPG. Currently at ${player.min.toFixed(1)} MPG.`
          return null
        },
        value: (player: LeaguePlayer) => player.ast,
        format: (value: number) => value.toFixed(1),
        detail: (player: LeaguePlayer) => `${player.tov.toFixed(1)} TOV per game with ${player.min.toFixed(1)} MPG.`,
      },
      reb: {
        label: 'Rebounds',
        title: 'Top Rebounders',
        averageLabel: 'Per game',
        valueLabel: 'REB',
        description: `Best glass work across offensive and defensive boards among players with at least ${impactMinGames} games and ${rankingMinMinutesPerGame}+ MPG.`,
        qualify: (player: LeaguePlayer) => player.gp >= impactMinGames && player.min >= rankingMinMinutesPerGame,
        getQualificationFailure: (player: LeaguePlayer) => {
          if (player.gp < impactMinGames) return `Needs ${impactMinGames} games played. Currently at ${player.gp}.`
          if (player.min < rankingMinMinutesPerGame) return `Needs at least ${rankingMinMinutesPerGame.toFixed(1)} MPG. Currently at ${player.min.toFixed(1)} MPG.`
          return null
        },
        value: (player: LeaguePlayer) => player.reb,
        format: (value: number) => value.toFixed(1),
        detail: (player: LeaguePlayer) => `${player.oreb.toFixed(1)} OREB • ${player.dreb.toFixed(1)} DREB per game.`,
      },
      ts: {
        label: 'True Shooting %',
        title: 'Most Efficient Scorers',
        averageLabel: 'Qualified scorers',
        valueLabel: 'TS%',
        description: `Scoring efficiency using field goals and free throws among players with at least ${impactMinGames} games, ${rankingMinMinutesPerGame}+ MPG, and a real scoring sample.`,
        qualify: (player: LeaguePlayer) => player.gp >= impactMinGames && player.min >= rankingMinMinutesPerGame && (player.fga + 0.44 * player.fta) >= trueShootingMinAttempts,
        getQualificationFailure: (player: LeaguePlayer) => {
          const trueShootingAttempts = player.fga + 0.44 * player.fta
          if (player.gp < impactMinGames) return `Needs ${impactMinGames} games played. Currently at ${player.gp}.`
          if (player.min < rankingMinMinutesPerGame) return `Needs at least ${rankingMinMinutesPerGame.toFixed(1)} MPG. Currently at ${player.min.toFixed(1)} MPG.`
          if (trueShootingAttempts < trueShootingMinAttempts) return `Needs at least ${trueShootingMinAttempts.toFixed(1)} true-shooting attempts per game (FGA + 0.44 × FTA). Currently at ${trueShootingAttempts.toFixed(1)}.`
          return null
        },
        value: (player: LeaguePlayer) => getTs(player) * 100,
        format: (value: number) => `${value.toFixed(1)}%`,
        detail: (player: LeaguePlayer) => `${player.pts.toFixed(1)} PTS on ${player.fga.toFixed(1)} FGA and ${player.fta.toFixed(1)} FTA.`,
      },
      fg3: {
        label: '3PT %',
        title: 'Best 3-Point Shooting',
        averageLabel: 'Qualified shooters',
        valueLabel: '3PT%',
        description: `Best three-point accuracy with a real sample among players with at least ${impactMinGames} games, ${rankingMinMinutesPerGame}+ MPG, and meaningful 3-point volume.`,
        qualify: (player: LeaguePlayer) => player.gp >= impactMinGames && player.min >= rankingMinMinutesPerGame && player.fg3a >= threePointMinAttempts,
        getQualificationFailure: (player: LeaguePlayer) => {
          if (player.gp < impactMinGames) return `Needs ${impactMinGames} games played. Currently at ${player.gp}.`
          if (player.min < rankingMinMinutesPerGame) return `Needs at least ${rankingMinMinutesPerGame.toFixed(1)} MPG. Currently at ${player.min.toFixed(1)} MPG.`
          if (player.fg3a < threePointMinAttempts) return `Needs at least ${threePointMinAttempts.toFixed(1)} 3-point attempts per game. Currently at ${player.fg3a.toFixed(1)}.`
          return null
        },
        value: (player: LeaguePlayer) => player.fg3_pct * 100,
        format: (value: number) => `${value.toFixed(1)}%`,
        detail: (player: LeaguePlayer) => `${player.fg3m.toFixed(1)} makes on ${player.fg3a.toFixed(1)} attempts per game.`,
      },
    } as const
  }, [impactIndex, impactMinGames, rankingMinMinutesPerGame, threePointMinAttempts, trueShootingMinAttempts])

  const activeMetric = metricConfig[metric]

  const fullRankedPlayers = useMemo(() => {
    return allPlayers
      .filter(activeMetric.qualify)
      .map(player => ({
        player,
        value: activeMetric.value(player),
        impact: impactIndex.byPlayerId[player.player_id] ?? null,
      }))
      .sort((a, b) => b.value - a.value)
  }, [activeMetric, allPlayers, impactIndex])
  const rankedPlayers = fullRankedPlayers.slice(0, 50)

  const leader = fullRankedPlayers[0] ?? null
  const selectedPlayer = selectedPlayerId !== null
    ? allPlayers.find(player => player.player_id === selectedPlayerId) ?? null
    : null
  const selectedRankingEntry = fullRankedPlayers.find(entry => entry.player.player_id === selectedPlayerId) ?? null
  const selectedRank = selectedRankingEntry
    ? fullRankedPlayers.findIndex(entry => entry.player.player_id === selectedRankingEntry.player.player_id) + 1
    : null
  const selectedQualificationFailure = selectedPlayer
    ? activeMetric.getQualificationFailure(selectedPlayer)
    : null
  const featuredPlayer = selectedPlayer
    ? {
        player: selectedPlayer,
        value: activeMetric.value(selectedPlayer),
        qualified: activeMetric.qualify(selectedPlayer),
      }
    : leader
      ? {
          player: leader.player,
          value: leader.value,
          qualified: true,
        }
      : null

  const openPlayerProfile = (playerId: number) => {
    navigate(buildOverviewHref('overview', playerId))
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-light tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>Player Rankings</h2>
          <p className="text-sm text-slate-400 mt-1">{season} season &middot; League-wide leaderboard</p>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 text-sm flex-wrap">
          {Object.entries(metricConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setMetric(key as typeof metric)}
              className="rounded-full px-3 py-1.5 text-sm font-medium transition-all"
              style={{ background: metric === key ? '#1e293b' : 'transparent', color: metric === key ? '#fff' : '#64748b' }}
            >
              {config.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.9fr] gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-semibold">{activeMetric.title}</div>
          {featuredPlayer ? (
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-sm font-semibold" style={{ color: getTeamColors(featuredPlayer.player.team).primary }}>{featuredPlayer.player.team}</div>
                <h3 className="text-3xl tracking-tight text-slate-900" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>{featuredPlayer.player.name}</h3>
              </div>

              <div className="rounded-2xl p-4" style={{ background: getTeamColors(featuredPlayer.player.team).bg }}>
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">{activeMetric.label}</div>
                <div className="mt-2 flex items-end gap-3">
                  <div className="text-4xl font-semibold text-slate-900">{activeMetric.format(featuredPlayer.value)}</div>
                  <div className="pb-1 text-sm text-slate-500">{activeMetric.averageLabel}</div>
                </div>
                <p className="mt-3 text-sm text-slate-600">{activeMetric.detail(featuredPlayer.player)}</p>
                {!featuredPlayer.qualified && (
                  <p className="mt-2 text-xs text-amber-700">
                    {selectedQualificationFailure ?? `This player is not currently qualified for the ${activeMetric.label} leaderboard.`}
                  </p>
                )}
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                  <span className="uppercase tracking-[0.14em] text-slate-400">Rank</span>
                  <span className="text-sm text-slate-900">{selectedRank ? `#${selectedRank}` : 'Unranked'}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <MetricChip label="PTS" value={featuredPlayer.player.pts.toFixed(1)} />
                <MetricChip label="REB" value={featuredPlayer.player.reb.toFixed(1)} />
                <MetricChip label="AST" value={featuredPlayer.player.ast.toFixed(1)} />
              </div>

              <p className="text-xs text-slate-400">{activeMetric.description}</p>
              <button
                type="button"
                onClick={() => openPlayerProfile(featuredPlayer.player.player_id)}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-slate-300 hover:text-slate-900"
              >
                View full player profile
              </button>

              {metric === 'impact' && (
                <details className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <summary className="cursor-pointer list-none font-semibold text-slate-700">
                    How the Player Impact Index works
                  </summary>
                  <div className="mt-3 space-y-2 text-[13px] leading-5">
                    <p>
                      The score is built from season box-score production relative to the rest of the league that year.
                      It is a weighted formula, so points, assists, rebounds, steals, blocks, efficiency, turnovers, and plus-minus do not count equally.
                    </p>
                    <p>
                      Offensive formula:
                      <br />
                      <span className="font-mono text-[12px] text-slate-700">
                        PTS/36 × (0.62 + TS% × 0.55) + AST/36 × 1.45 + Usage/36 × 0.18 + (TS% edge × 34) + (eFG% edge × 22) + (AST/TO edge × 2.6)
                      </span>
                    </p>
                    <p>
                      Defensive formula:
                      <br />
                      <span className="font-mono text-[12px] text-slate-700">
                        STL/36 × 2.6 + BLK/36 × 2.3 + DREB/36 × 0.55 + OREB/36 × 0.35 + REB/36 × 0.15 + Plus/Minus × 0.95
                      </span>
                    </p>
                    <p>
                      Final blend:
                      <br />
                      <span className="font-mono text-[12px] text-slate-700">
                        Total = Offense × 0.64 + Defense × 0.36
                      </span>
                      <br />
                      That total is converted into a season-relative score centered around <span className="font-semibold text-slate-700">50</span>.
                    </p>
                    <p>
                      Players with smaller minute samples are pulled closer to average so short stretches do not overstate their impact.
                    </p>
                  </div>
                </details>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
              No ranking pool is available for this season view yet. Try switching season type or choosing another season.
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 px-2 pb-3">
            <div>
              <h3 className="text-lg font-medium text-slate-900">Top 50</h3>
              <p className="text-xs text-slate-400">Sorted by {activeMetric.label}</p>
            </div>
            <div className="text-xs text-slate-400">{activeMetric.valueLabel} leaderboard</div>
          </div>

          <div className="space-y-2">
            {rankedPlayers.map((entry, index) => {
              const tc = getTeamColors(entry.player.team)
              return (
                <button
                  type="button"
                  key={entry.player.player_id}
                  onClick={() => openPlayerProfile(entry.player.player_id)}
                  className="group grid w-full grid-cols-[38px_minmax(0,1.35fr)_minmax(0,0.8fr)_78px] items-center gap-3 rounded-2xl border border-slate-100 px-3 py-3 text-left transition-all hover:-translate-y-[1px] hover:border-slate-300 hover:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)]"
                  style={{ background: entry.player.player_id === selectedPlayerId || index < 3 ? tc.bg : 'white' }}
                >
                  <div className="text-lg font-semibold text-slate-400">{index + 1}</div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900 transition-all group-hover:text-slate-700 group-hover:underline group-hover:decoration-slate-400 group-hover:underline-offset-4">{entry.player.name}</div>
                    <div className="truncate text-xs text-slate-400">{entry.player.team} &middot; {entry.player.gp} GP &middot; {entry.player.min.toFixed(1)} MPG</div>
                  </div>
                  <div className="min-w-0 text-xs text-slate-500">
                    <div>{entry.player.pts.toFixed(1)} PTS</div>
                    <div>{entry.player.reb.toFixed(1)} REB • {entry.player.ast.toFixed(1)} AST</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-semibold" style={{ color: tc.primary }}>{activeMetric.format(entry.value)}</div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{activeMetric.valueLabel}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

type BuilderFormState = {
  name: string
  position: 'Guard' | 'Wing' | 'Big'
  gp: number
  min: number
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  tov: number
  fga: number
  fg_pct: number
  fg3a: number
  fg3_pct: number
  fta: number
  ft_pct: number
  oreb: number
  dreb: number
  plus_minus: number
}

const defaultBuilderState: BuilderFormState = {
  name: 'Custom Prospect',
  position: 'Wing',
  gp: 30,
  min: 30,
  pts: 15,
  reb: 6,
  ast: 4,
  stl: 1.2,
  blk: 0.7,
  tov: 2.3,
  fga: 12.5,
  fg_pct: 0.46,
  fg3a: 4.5,
  fg3_pct: 0.35,
  fta: 3.8,
  ft_pct: 0.82,
  oreb: 1.2,
  dreb: 4.8,
  plus_minus: 1.8,
}

const builderLimits: Record<Exclude<keyof BuilderFormState, 'name' | 'position'>, { min: number; max: number }> = {
  gp: { min: 1, max: 44 },
  min: { min: 1, max: 40 },
  pts: { min: 0, max: 40 },
  reb: { min: 0, max: 20 },
  ast: { min: 0, max: 15 },
  stl: { min: 0, max: 5 },
  blk: { min: 0, max: 5 },
  tov: { min: 0, max: 8 },
  fga: { min: 0.1, max: 30 },
  fg_pct: { min: 0, max: 1 },
  fg3a: { min: 0, max: 15 },
  fg3_pct: { min: 0, max: 1 },
  fta: { min: 0, max: 15 },
  ft_pct: { min: 0, max: 1 },
  oreb: { min: 0, max: 8 },
  dreb: { min: 0, max: 15 },
  plus_minus: { min: -20, max: 20 },
}

function BuildPlayerView({
  allPlayers,
  season,
  seasonType,
}: {
  allPlayers: LeaguePlayer[]
  season: string
  seasonType: 'regular_season' | 'playoffs'
}) {
  const [form, setForm] = useState<BuilderFormState>(defaultBuilderState)

  const updateField = <K extends keyof BuilderFormState>(key: K, value: BuilderFormState[K]) => {
    setForm(current => {
      if (key === 'name' || key === 'position') {
        return { ...current, [key]: value }
      }

      const limits = builderLimits[key as Exclude<keyof BuilderFormState, 'name' | 'position'>]
      const nextNumber = clamp(Number(value), limits.min, limits.max)
      return { ...current, [key]: nextNumber as BuilderFormState[K] }
    })
  }

  const customPlayer = useMemo<LeaguePlayer>(() => {
    const fgm = form.fga * form.fg_pct
    const fg3m = form.fg3a * form.fg3_pct
    const ftm = form.fta * form.ft_pct

    return {
      player_id: -999999,
      name: form.name.trim() || 'Custom Prospect',
      team: 'CUSTOM',
      gp: Math.max(1, form.gp),
      min: Math.max(1, form.min),
      pts: Math.max(0, form.pts),
      reb: Math.max(0, form.reb),
      ast: Math.max(0, form.ast),
      stl: Math.max(0, form.stl),
      blk: Math.max(0, form.blk),
      tov: Math.max(0, form.tov),
      fgm,
      fga: Math.max(0.1, form.fga),
      fg_pct: clamp(form.fg_pct, 0, 1),
      fg3m,
      fg3a: Math.max(0, form.fg3a),
      fg3_pct: clamp(form.fg3_pct, 0, 1),
      ftm,
      fta: Math.max(0, form.fta),
      ft_pct: clamp(form.ft_pct, 0, 1),
      oreb: Math.max(0, form.oreb),
      dreb: Math.max(0, form.dreb),
      pf: 2.5,
      plus_minus: form.plus_minus,
    }
  }, [form])

  const customImpact = useMemo(() => {
    if (!allPlayers.length) {
      return { averageScore: 50, byPlayerId: {} }
    }
    const withCustom = [...allPlayers, customPlayer]
    return buildPlayerImpactIndex(withCustom)
  }, [allPlayers, customPlayer])

  const customImpactEntry = customImpact.byPlayerId[customPlayer.player_id]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>Build Your Own Player</h2>
        <p className="text-sm text-slate-400 mt-1">
          {season} {seasonType === 'regular_season' ? 'regular season' : 'playoffs'} context &middot; estimate a custom player&apos;s impact before comparing them to real WNBA players
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.95fr] gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-semibold">Custom Profile</div>
              <h3 className="mt-2 text-2xl tracking-tight text-slate-900" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                Shape the stat line
              </h3>
              <p className="mt-1 text-sm text-slate-500">Type naturally into each field. Values stay capped to realistic WNBA ranges.</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(defaultBuilderState)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:border-slate-300 hover:text-slate-900"
            >
              Reset build
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-4">
            <Field label="Player name">
              <input
                value={form.name}
                onChange={e => updateField('name', e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              />
            </Field>
            <Field label="Position">
              <select
                value={form.position}
                onChange={e => updateField('position', e.target.value as BuilderFormState['position'])}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              >
                <option value="Guard">Guard</option>
                <option value="Wing">Wing</option>
                <option value="Big">Big</option>
              </select>
            </Field>
          </div>

          <div className="mt-5 space-y-5">
            <BuilderSection title="Volume">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <NumberField label="Games" value={form.gp} step={1} min={builderLimits.gp.min} max={builderLimits.gp.max} onChange={value => updateField('gp', value)} />
                <NumberField label="Minutes" value={form.min} step={0.5} min={builderLimits.min.min} max={builderLimits.min.max} onChange={value => updateField('min', value)} />
                <NumberField label="Points" value={form.pts} step={0.5} min={builderLimits.pts.min} max={builderLimits.pts.max} onChange={value => updateField('pts', value)} />
                <NumberField label="Turnovers" value={form.tov} step={0.5} min={builderLimits.tov.min} max={builderLimits.tov.max} onChange={value => updateField('tov', value)} />
              </div>
            </BuilderSection>

            <BuilderSection title="Playmaking and defense">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <NumberField label="Assists" value={form.ast} step={0.5} min={builderLimits.ast.min} max={builderLimits.ast.max} onChange={value => updateField('ast', value)} />
                <NumberField label="Steals" value={form.stl} step={0.2} min={builderLimits.stl.min} max={builderLimits.stl.max} onChange={value => updateField('stl', value)} />
                <NumberField label="Blocks" value={form.blk} step={0.2} min={builderLimits.blk.min} max={builderLimits.blk.max} onChange={value => updateField('blk', value)} />
                <NumberField label="Plus/Minus" value={form.plus_minus} step={0.5} min={builderLimits.plus_minus.min} max={builderLimits.plus_minus.max} onChange={value => updateField('plus_minus', value)} />
              </div>
            </BuilderSection>

            <BuilderSection title="Rebounding">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <NumberField label="Rebounds" value={form.reb} step={0.5} min={builderLimits.reb.min} max={builderLimits.reb.max} onChange={value => updateField('reb', value)} />
                <NumberField label="OREB" value={form.oreb} step={0.2} min={builderLimits.oreb.min} max={builderLimits.oreb.max} onChange={value => updateField('oreb', value)} />
                <NumberField label="DREB" value={form.dreb} step={0.2} min={builderLimits.dreb.min} max={builderLimits.dreb.max} onChange={value => updateField('dreb', value)} />
              </div>
            </BuilderSection>

            <BuilderSection title="Shooting">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <NumberField label="FGA" value={form.fga} step={0.5} min={builderLimits.fga.min} max={builderLimits.fga.max} onChange={value => updateField('fga', value)} />
                <PercentField label="FG%" value={form.fg_pct} onChange={value => updateField('fg_pct', value)} />
                <NumberField label="3PA" value={form.fg3a} step={0.5} min={builderLimits.fg3a.min} max={builderLimits.fg3a.max} onChange={value => updateField('fg3a', value)} />
                <PercentField label="3P%" value={form.fg3_pct} onChange={value => updateField('fg3_pct', value)} />
                <NumberField label="FTA" value={form.fta} step={0.5} min={builderLimits.fta.min} max={builderLimits.fta.max} onChange={value => updateField('fta', value)} />
                <PercentField label="FT%" value={form.ft_pct} onChange={value => updateField('ft_pct', value)} />
              </div>
            </BuilderSection>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-semibold">Custom Impact Snapshot</div>
            <h3 className="mt-2 text-3xl tracking-tight text-slate-900" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>{customPlayer.name}</h3>
            <p className="text-sm text-slate-400 mt-1">{form.position} &middot; {customPlayer.min.toFixed(1)} MPG &middot; {customPlayer.gp} GP</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold">Player Impact Index</div>
            <div className="mt-2 flex items-end gap-3">
              <div className="text-5xl font-light tracking-tight text-slate-900" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                {allPlayers.length && customImpactEntry ? customImpactEntry.score.toFixed(1) : '--'}
              </div>
              <div className="pb-2 text-sm text-slate-500">Average {customImpact.averageScore.toFixed(0)}</div>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {allPlayers.length
                ? (customImpactEntry?.summary ?? 'Impact estimate updates instantly from your custom statline.')
                : `No ${seasonType === 'regular_season' ? 'regular-season' : 'playoff'} player pool is loaded for ${season}, so the builder cannot benchmark this custom player yet.`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricPreview label="PTS" value={customPlayer.pts.toFixed(1)} />
            <MetricPreview label="REB" value={customPlayer.reb.toFixed(1)} />
            <MetricPreview label="AST" value={customPlayer.ast.toFixed(1)} />
            <MetricPreview label="+/-" value={customPlayer.plus_minus.toFixed(1)} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-700">Next useful additions</div>
            <div className="mt-2 leading-6">
              Similarity search can compare this custom player to the closest real WNBA player profiles.
              Team fit can compare this custom player against each roster’s needs and current style.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
      {children}
    </label>
  )
}

function BuilderSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  step,
  min,
  max,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  step: number
  min: number
  max: number
}) {
  const [draft, setDraft] = useState(String(formatNumericValue(value, step)))

  useEffect(() => {
    setDraft(String(formatNumericValue(value, step)))
  }, [step, value])

  return (
    <Field label={label}>
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        onFocus={e => e.currentTarget.select()}
        onChange={e => {
          const next = e.target.value
          setDraft(next)
          if (next.trim() === '') {
            return
          }
          const parsed = Number(next)
          if (Number.isFinite(parsed)) onChange(clamp(parsed, min, max))
        }}
        onBlur={() => {
          const parsed = Number(draft)
          const safe = Number.isFinite(parsed) ? clamp(parsed, min, max) : value
          onChange(safe)
          setDraft(String(formatNumericValue(safe, step)))
        }}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
      />
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <button
          type="button"
          onClick={() => {
            const next = clamp(Number((value - step).toFixed(2)), min, max)
            onChange(next)
            setDraft(String(formatNumericValue(next, step)))
          }}
          className="rounded-full border border-slate-200 px-2.5 py-1 font-semibold text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900"
        >
          -
        </button>
        <span>{min} to {max}</span>
        <button
          type="button"
          onClick={() => {
            const next = clamp(Number((value + step).toFixed(2)), min, max)
            onChange(next)
            setDraft(String(formatNumericValue(next, step)))
          }}
          className="rounded-full border border-slate-200 px-2.5 py-1 font-semibold text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900"
        >
          +
        </button>
      </div>
    </Field>
  )
}

function PercentField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  const [draft, setDraft] = useState((value * 100).toFixed(1))

  useEffect(() => {
    setDraft((value * 100).toFixed(1))
  }, [value])

  return (
    <Field label={label}>
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={Number((value * 100).toFixed(1))}
            onChange={e => onChange(clamp(Number(e.target.value) / 100, 0, 1))}
            className="min-w-0 flex-1 max-w-full"
          />
          <input
            type="text"
            inputMode="decimal"
            value={draft}
            onFocus={e => e.currentTarget.select()}
            onChange={e => {
              const next = e.target.value
              setDraft(next)
              if (next.trim() === '') {
                return
              }
              const parsed = Number(next)
              if (Number.isFinite(parsed)) onChange(clamp(parsed / 100, 0, 1))
            }}
            onBlur={() => {
              const parsed = Number(draft)
              const safe = Number.isFinite(parsed) ? clamp(parsed / 100, 0, 1) : value
              onChange(safe)
              setDraft((safe * 100).toFixed(1))
            }}
            className="w-14 text-right text-sm font-semibold text-slate-700 outline-none"
          />
          <span className="text-sm font-semibold text-slate-500">%</span>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <button
          type="button"
          onClick={() => {
            const next = clamp(Number((value - 0.01).toFixed(3)), 0, 1)
            onChange(next)
            setDraft((next * 100).toFixed(1))
          }}
          className="rounded-full border border-slate-200 px-2.5 py-1 font-semibold text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900"
        >
          - 1%
        </button>
        <button
          type="button"
          onClick={() => {
            const next = clamp(Number((value + 0.01).toFixed(3)), 0, 1)
            onChange(next)
            setDraft((next * 100).toFixed(1))
          }}
          className="rounded-full border border-slate-200 px-2.5 py-1 font-semibold text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900"
        >
          + 1%
        </button>
      </div>
    </Field>
  )
}

function MetricPreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-lg font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</div>
    </div>
  )
}

function formatNumericValue(value: number, step: number) {
  if (step >= 1) return value.toFixed(0)
  return value.toFixed(1)
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
      <div className="text-lg font-semibold text-slate-900">{value}</div>
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</div>
    </div>
  )
}

function LandingGrid({ playersByTeam, onSelect }: { playersByTeam: [string, LeaguePlayer[]][]; onSelect: (id: number) => void }) {
  return (
    <div className="app-panel py-6 px-6 md:px-7">
      <div className="max-w-2xl">
        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-semibold">Player directory</div>
        <h2 className="mt-2 text-3xl tracking-tight text-slate-950" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>Start with a player</h2>
        <p className="text-slate-500 text-sm mt-2 mb-8">Browse the current league pool by team, then jump into a full player profile with trends, shot zones, and advanced context.</p>
      </div>
      <div className="space-y-8">
        {playersByTeam.map(([team, players]) => {
          const tc = getTeamColors(team)
          return (
            <div key={team} className="app-subcard p-4 md:p-5">
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
                    className="ui-card-hover px-3 py-2 rounded-full text-sm bg-white border shadow-sm"
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
  const [searchParams] = useSearchParams()
  const playerAParam = Number(searchParams.get('playerA'))
  const playerBParam = Number(searchParams.get('playerB'))
  const initialPlayerA = Number.isFinite(playerAParam) && playerAParam > 0 ? playerAParam : null
  const initialPlayerB = Number.isFinite(playerBParam) && playerBParam > 0 ? playerBParam : null
  const [idA, setIdA] = useState<number | null>(initialPlayerA)
  const [idB, setIdB] = useState<number | null>(initialPlayerB)

  const playerA = allPlayers.find(p => p.player_id === idA) ?? null
  const playerB = allPlayers.find(p => p.player_id === idB) ?? null
  const colorA = playerA ? getTeamColors(playerA.team) : null
  const colorB = playerB ? getTeamColors(playerB.team) : null

  return (
    <div className="space-y-6">
      <div className="app-panel px-6 py-6">
        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-semibold">Comparison studio</div>
        <h2 className="mt-2 text-3xl tracking-tight text-slate-950" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>Compare Players</h2>
        <p className="text-sm text-slate-500 mt-2">{season} season, side by side, with team color context and the same underlying player data.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="app-card p-5">
          <label className="text-xs text-slate-400 block mb-1">Player A</label>
          <select
            value={idA ?? ''}
            onChange={e => setIdA(Number(e.target.value))}
            className="ui-control w-full rounded-full px-4 py-2 text-sm bg-white border border-slate-200 cursor-pointer"
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
        <div className="app-card p-5">
          <label className="text-xs text-slate-400 block mb-1">Player B</label>
          <select
            value={idB ?? ''}
            onChange={e => setIdB(Number(e.target.value))}
            className="ui-control w-full rounded-full px-4 py-2 text-sm bg-white border border-slate-200 cursor-pointer"
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
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <div className="text-sm font-medium text-slate-600">Pick two players to compare.</div>
          <div className="mt-2 text-xs text-slate-500">Choose Player A and Player B above to load the side-by-side view.</div>
        </div>
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
