import { useEffect, useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { SeasonData, LeaguePlayer } from '../types'
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
import { loadDashboardData } from '../utils/dataValidation'

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export default function Dashboard() {
  const { data, issues: dataIssues } = loadDashboardData()
  const [season, setSeason] = useState(data.team.current_season)
  const [seasonType, setSeasonType] = useState<'regular_season' | 'playoffs'>('regular_season')
  const [playerId, setPlayerId] = useState<number | null>(null)
  const [compareId, setCompareId] = useState<number | null>(null)
  const [showCompare, setShowCompare] = useState(false)
  const [section, setSection] = useState<'players' | 'teams'>('players')
  const [playerTab, setPlayerTab] = useState<'overview' | 'compare' | 'rankings' | 'builder'>('overview')

  const availableSeasons = useMemo(
    () => Object.keys(data.seasons).filter(s => data.seasons[s] !== null).sort(),
    []
  )
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
  const isPlayersOverview = section === 'players' && playerTab === 'overview'
  const isPlayersCompare = section === 'players' && playerTab === 'compare'
  const isPlayersRankings = section === 'players' && playerTab === 'rankings'
  const isPlayersBuilder = section === 'players' && playerTab === 'builder'
  const showSeasonTypeToggle = section === 'players' || section === 'teams'

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
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="min-w-0 pr-2">
              <h1 className="text-lg tracking-tight font-semibold" style={{ fontFamily: "'DM Serif Display', Georgia, serif", color: '#1e293b' }}>
                WNBA Analytics
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {section === 'teams'
                  ? `${season} ${seasonType === 'regular_season' ? 'regular season' : 'playoffs'} team dashboard`
                  : isPlayersOverview
                    ? `${season} player profile`
                    : isPlayersCompare
                      ? `${season} player comparison`
                      : isPlayersRankings
                        ? `${season} player rankings`
                        : `${season} custom player builder`}
              </p>
            </div>

            <select
              value={season}
              onChange={e => setSeason(e.target.value)}
              aria-label="Season"
              className="rounded-full px-4 py-1.5 text-sm cursor-pointer focus:outline-none transition-all appearance-none"
              style={{
                border: '1.5px solid #cbd5e1',
                background: 'white',
                color: '#334155',
                minWidth: '100px',
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

            {showSeasonTypeToggle && (
              <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 text-sm">
                {(['regular_season', 'playoffs'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setSeasonType(st)}
                    className="rounded-full px-3 py-1 transition-all"
                    style={{
                      background: seasonType === st ? '#e2e8f0' : 'transparent',
                      color: seasonType === st ? '#0f172a' : '#94a3b8',
                      fontWeight: seasonType === st ? 600 : 500,
                      fontSize: '13px',
                    }}
                  >{st === 'regular_season' ? 'Regular' : 'Playoffs'}</button>
                ))}
              </div>
            )}

            <div className="ml-auto flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 text-sm">
              <button
                onClick={() => setSection('players')}
                className="rounded-full px-3 py-1 transition-all"
                style={{ background: section === 'players' ? '#1e293b' : 'transparent', color: section === 'players' ? '#fff' : '#64748b', fontWeight: 600 }}
              >Players</button>
              <button
                onClick={() => setSection('teams')}
                className="rounded-full px-3 py-1 transition-all"
                style={{ background: section === 'teams' ? '#1e293b' : 'transparent', color: section === 'teams' ? '#fff' : '#64748b', fontWeight: 600 }}
              >Teams</button>
            </div>

            {section === 'players' && (
              <>
                <nav className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 text-sm">
                <button
                  onClick={() => setPlayerTab('overview')}
                  className="rounded-full px-3 py-1 transition-all"
                  style={{ background: playerTab === 'overview' ? '#1e293b' : 'transparent', color: playerTab === 'overview' ? '#fff' : '#64748b', fontWeight: playerTab === 'overview' ? 600 : 500 }}
                >Overview</button>
                <button
                  onClick={() => setPlayerTab('compare')}
                  className="rounded-full px-3 py-1 transition-all"
                  style={{ background: playerTab === 'compare' ? '#1e293b' : 'transparent', color: playerTab === 'compare' ? '#fff' : '#64748b', fontWeight: playerTab === 'compare' ? 600 : 500 }}
                >Compare</button>
                <button
                  onClick={() => setPlayerTab('rankings')}
                  className="rounded-full px-3 py-1 transition-all"
                  style={{ background: playerTab === 'rankings' ? '#1e293b' : 'transparent', color: playerTab === 'rankings' ? '#fff' : '#64748b', fontWeight: playerTab === 'rankings' ? 600 : 500 }}
                >Rankings</button>
                <button
                  onClick={() => setPlayerTab('builder')}
                  className="rounded-full px-3 py-1 transition-all"
                  style={{ background: playerTab === 'builder' ? '#1e293b' : 'transparent', color: playerTab === 'builder' ? '#fff' : '#64748b', fontWeight: playerTab === 'builder' ? 600 : 500 }}
                >Builder</button>
                </nav>

                {isPlayersOverview && (
                  <select
                    value={playerId ?? ''}
                    onChange={e => { setPlayerId(Number(e.target.value)); setCompareId(null); setShowCompare(false) }}
                    aria-label="Selected player"
                    className="rounded-full px-4 py-1.5 text-sm cursor-pointer focus:outline-none transition-all appearance-none"
                    style={{ border: '1.5px solid #cbd5e1', background: 'white', color: '#334155', minWidth: '220px', maxWidth: '320px', paddingRight: '2rem', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
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
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm text-slate-500">
                    Pick both players below to compare this season.
                  </div>
                )}

                {isPlayersRankings && (
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm text-slate-500">
                    League-wide leaderboard for the selected season.
                  </div>
                )}

                {isPlayersBuilder && (
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm text-slate-500">
                    Build a custom WNBA player profile and estimate their impact score.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {dataIssues.length > 0 && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Data validation warnings: {dataIssues.join(' ')}
          </div>
        )}
        {section === 'teams' ? (
          <NextGamePrediction block={block} />
        ) : playerTab === 'compare' ? (
          <CompareView allPlayers={allPlayers} playersByTeam={playersByTeam} season={season} />
        ) : playerTab === 'rankings' ? (
          <RankingsView allPlayers={allPlayers} season={season} impactIndex={impactIndex} />
        ) : playerTab === 'builder' ? (
          <BuildPlayerView key={`${season}-${seasonType}`} allPlayers={allPlayers} season={season} seasonType={seasonType} />
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

function RankingsView({
  allPlayers,
  season,
  impactIndex,
}: {
  allPlayers: LeaguePlayer[]
  season: string
  impactIndex: ReturnType<typeof buildPlayerImpactIndex>
}) {
  const [metric, setMetric] = useState<'impact' | 'pts' | 'ast' | 'reb' | 'ts' | 'fg3'>('impact')

  const metricConfig = useMemo(() => {
    const getTs = (player: LeaguePlayer) => (
      player.fga + 0.44 * player.fta > 0
        ? player.pts / (2 * (player.fga + 0.44 * player.fta))
        : 0
    )

    return {
      impact: {
        label: 'Player Impact Index',
        title: 'Most Impact',
        averageLabel: `League average ${impactIndex.averageScore.toFixed(0)}`,
        valueLabel: 'Impact',
        description: 'Overall two-way impact using the dashboard’s season-relative index.',
        qualify: (player: LeaguePlayer) => player.gp > 0 && Boolean(impactIndex.byPlayerId[player.player_id]),
        value: (player: LeaguePlayer) => impactIndex.byPlayerId[player.player_id]?.score ?? 0,
        format: (value: number) => value.toFixed(1),
        detail: (player: LeaguePlayer) => impactIndex.byPlayerId[player.player_id]?.summary ?? 'Season impact snapshot.',
      },
      pts: {
        label: 'Points',
        title: 'Top Scorers',
        averageLabel: 'Per game',
        valueLabel: 'PTS',
        description: 'Highest scoring averages for the selected season.',
        qualify: (player: LeaguePlayer) => player.gp >= 5,
        value: (player: LeaguePlayer) => player.pts,
        format: (value: number) => value.toFixed(1),
        detail: (player: LeaguePlayer) => `${player.fgm.toFixed(1)} FGM on ${player.fga.toFixed(1)} FGA per game.`,
      },
      ast: {
        label: 'Assists',
        title: 'Top Playmakers',
        averageLabel: 'Per game',
        valueLabel: 'AST',
        description: 'Best assist creators this season.',
        qualify: (player: LeaguePlayer) => player.gp >= 5,
        value: (player: LeaguePlayer) => player.ast,
        format: (value: number) => value.toFixed(1),
        detail: (player: LeaguePlayer) => `${player.tov.toFixed(1)} TOV per game with ${player.min.toFixed(1)} MPG.`,
      },
      reb: {
        label: 'Rebounds',
        title: 'Top Rebounders',
        averageLabel: 'Per game',
        valueLabel: 'REB',
        description: 'Best glass work across offensive and defensive boards.',
        qualify: (player: LeaguePlayer) => player.gp >= 5,
        value: (player: LeaguePlayer) => player.reb,
        format: (value: number) => value.toFixed(1),
        detail: (player: LeaguePlayer) => `${player.oreb.toFixed(1)} OREB • ${player.dreb.toFixed(1)} DREB per game.`,
      },
      ts: {
        label: 'True Shooting %',
        title: 'Most Efficient Scorers',
        averageLabel: 'Qualified scorers',
        valueLabel: 'TS%',
        description: 'Scoring efficiency using field goals and free throws.',
        qualify: (player: LeaguePlayer) => player.gp >= 5 && (player.fga + 0.44 * player.fta) >= 6,
        value: (player: LeaguePlayer) => getTs(player) * 100,
        format: (value: number) => `${value.toFixed(1)}%`,
        detail: (player: LeaguePlayer) => `${player.pts.toFixed(1)} PTS on ${player.fga.toFixed(1)} FGA and ${player.fta.toFixed(1)} FTA.`,
      },
      fg3: {
        label: '3PT %',
        title: 'Best 3-Point Shooting',
        averageLabel: 'Qualified shooters',
        valueLabel: '3PT%',
        description: 'Best three-point accuracy with a real sample.',
        qualify: (player: LeaguePlayer) => player.gp >= 5 && player.fg3a >= 2,
        value: (player: LeaguePlayer) => player.fg3_pct * 100,
        format: (value: number) => `${value.toFixed(1)}%`,
        detail: (player: LeaguePlayer) => `${player.fg3m.toFixed(1)} makes on ${player.fg3a.toFixed(1)} attempts per game.`,
      },
    } as const
  }, [impactIndex])

  const activeMetric = metricConfig[metric]

  const rankedPlayers = useMemo(() => {
    return allPlayers
      .filter(activeMetric.qualify)
      .map(player => ({
        player,
        value: activeMetric.value(player),
        impact: impactIndex.byPlayerId[player.player_id] ?? null,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 50)
  }, [activeMetric, allPlayers, impactIndex])

  const leader = rankedPlayers[0] ?? null

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
          {leader ? (
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-sm font-semibold" style={{ color: getTeamColors(leader.player.team).primary }}>{leader.player.team}</div>
                <h3 className="text-3xl tracking-tight text-slate-900" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>{leader.player.name}</h3>
              </div>

              <div className="rounded-2xl p-4" style={{ background: getTeamColors(leader.player.team).bg }}>
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">{activeMetric.label}</div>
                <div className="mt-2 flex items-end gap-3">
                  <div className="text-4xl font-semibold text-slate-900">{activeMetric.format(leader.value)}</div>
                  <div className="pb-1 text-sm text-slate-500">{activeMetric.averageLabel}</div>
                </div>
                <p className="mt-3 text-sm text-slate-600">{activeMetric.detail(leader.player)}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <MetricChip label="PTS" value={leader.player.pts.toFixed(1)} />
                <MetricChip label="REB" value={leader.player.reb.toFixed(1)} />
                <MetricChip label="AST" value={leader.player.ast.toFixed(1)} />
              </div>

              <p className="text-xs text-slate-400">{activeMetric.description}</p>

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
            <p className="mt-4 text-sm text-slate-400">No ranking data available for this season.</p>
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
                <div
                  key={entry.player.player_id}
                  className="grid grid-cols-[38px_minmax(0,1.35fr)_minmax(0,0.8fr)_78px] items-center gap-3 rounded-2xl border border-slate-100 px-3 py-3"
                  style={{ background: index < 3 ? tc.bg : 'white' }}
                >
                  <div className="text-lg font-semibold text-slate-400">{index + 1}</div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{entry.player.name}</div>
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
                </div>
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
