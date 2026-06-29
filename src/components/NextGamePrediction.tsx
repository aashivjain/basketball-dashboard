import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { SeasonBlock } from '../types'
import { getTeamColors } from '../utils/teamColors'
import { buildTeamProfiles, buildTeamRankings, predictMatchup } from '../utils/teamPrediction'
import { loadTeamPredictions } from '../utils/dataValidation'

interface Props {
  block: SeasonBlock | null
}

function average(values: number[], fallback = 0) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback
}

export default function NextGamePrediction({ block }: Props) {
  const teamProfiles = useMemo(() => (block ? buildTeamProfiles(block) : []), [block])
  const [searchParams, setSearchParams] = useSearchParams()
  const predictionState = useMemo(
    () => loadTeamPredictions(teamProfiles.map(team => team.team), block ? guessSeasonFromBlock(block) : '2026'),
    [block, teamProfiles]
  )
  const queryTeam = searchParams.get('team')
  const [venue, setVenue] = useState<'home' | 'away'>('home')
  const [showRotationWatch, setShowRotationWatch] = useState(false)
  const [showLineupLab, setShowLineupLab] = useState(false)
  const [showSynergyBoard, setShowSynergyBoard] = useState(false)
  const [showMatchups, setShowMatchups] = useState(false)

  const teamPredictions = predictionState.data
  const selectedTeam = useMemo(() => {
    if (!teamProfiles.length) return 'IND'
    if (queryTeam && teamProfiles.some(team => team.team === queryTeam)) {
      return queryTeam
    }
    return teamProfiles[0]?.team ?? 'IND'
  }, [queryTeam, teamProfiles])

  useEffect(() => {
    if (!selectedTeam) return
    if (searchParams.get('team') === selectedTeam) return

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('team', selectedTeam)
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, selectedTeam, setSearchParams])

  const focusTeam = teamProfiles.find(team => team.team === selectedTeam) ?? null
  const focusColors = getTeamColors(selectedTeam)
  const [lineupIds, setLineupIds] = useState<number[]>([])

  useEffect(() => {
    if (!focusTeam) {
      setLineupIds([])
      return
    }
    setLineupIds(focusTeam.players.slice(0, 5).map(player => player.player_id))
  }, [focusTeam])

  const rosterSignals = useMemo(() => {
    if (!focusTeam || !block) return null
    return analyzeTeamRoster(focusTeam, block)
  }, [block, focusTeam])
  const rotationWatch = useMemo(() => {
    if (!focusTeam || !block) return null
    return analyzeRotationWatch(focusTeam, block)
  }, [block, focusTeam])
  const lineupLab = useMemo(() => {
    if (!focusTeam) return null
    return analyzeLineupImpact(focusTeam, lineupIds)
  }, [focusTeam, lineupIds])
  const synergyBoard = useMemo(() => {
    if (!focusTeam) return []
    return analyzeLineupSynergy(focusTeam)
  }, [focusTeam])

  const matchupRows = useMemo(() => {
    if (!focusTeam) return []

    const rankings = buildTeamRankings(teamProfiles)

    return teamProfiles
      .filter(team => team.team !== focusTeam.team)
      .map(opponent => {
        const weightedPrediction = predictMatchup(focusTeam, opponent, venue)
        const rfPrediction = teamPredictions?.forecasts[selectedTeam]?.[venue]?.[opponent.team] ?? null
        const weightedPct = weightedPrediction.teamAWinPct
        const rfPct = rfPrediction?.team_win_pct ?? weightedPct

        return {
          opponent,
          opponentColors: getTeamColors(opponent.team),
          weightedPct,
          weightedReason: weightedPrediction.reasons[0]?.edge ?? '',
          rfPct,
          rfReason: rfPrediction?.reasons[0]?.detail ?? '',
          rank: rankings.get(opponent.team) ?? 999,
        }
      })
      .sort((a, b) => a.rank - b.rank)
  }, [focusTeam, selectedTeam, teamPredictions, teamProfiles, venue])
  const summaryCards = useMemo(() => {
    const bestMatchup = matchupRows[0]
    const lineupHeadline = lineupLab?.headline ?? 'Lineup tools ready once a valid rotation sample is available.'
    return [
      {
        label: 'Immediate Outlook',
        title: bestMatchup
          ? `${selectedTeam} vs ${bestMatchup.opponent.team}`
          : `${selectedTeam} snapshot`,
        detail: bestMatchup
          ? `${selectedTeam} projects at ${bestMatchup.rfPct.toFixed(0)}% in the strongest current matchup view.`
          : 'No matchup board available yet.',
        accent: focusColors.primary,
      },
      {
        label: 'Most Valuable',
        title: rosterSignals?.mostValuable.player.name ?? 'Core player',
        detail: rosterSignals?.mostValuable.detail ?? 'Most valuable player context will appear once the team profile is ready.',
        accent: focusColors.secondary,
      },
      {
        label: 'Lineup Read',
        title: lineupLab ? lineupHeadline.replace(/\.$/, '') : 'Lineup view unavailable',
        detail: lineupLab?.summary ?? 'Lineup impact analysis is waiting for enough available team data.',
        accent: '#0f172a',
      },
    ]
  }, [focusColors.primary, focusColors.secondary, lineupLab, matchupRows, rosterSignals, selectedTeam])

  if (!block || !focusTeam || teamProfiles.length < 2) {
    return null
  }

  return (
    <section className="app-panel p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400 font-semibold">Team Predictions</p>
          <h2 className="text-[28px] text-slate-900 mt-1">Team dashboard</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-3xl">Fast team context up top, deeper lineup and matchup tools below.</p>
          {predictionState.issues.length > 0 && (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Forecast safeguards active: {predictionState.issues.join(' ')} Falling back to live weighted matchup estimates where needed.
            </div>
          )}
          {teamPredictions && (
            <div className="mt-2 text-xs text-slate-400">
              Forecast file: {teamPredictions.season} season, generated {new Date(teamPredictions.generated_at).toLocaleString()}
            </div>
          )}
        </div>

        <div className="flex gap-3 flex-wrap items-center">
          <select
            value={selectedTeam}
            onChange={event => {
              const nextParams = new URLSearchParams(searchParams)
              nextParams.set('team', event.target.value)
              setSearchParams(nextParams, { replace: true })
            }}
            className="ui-control rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-base text-slate-700"
          >
            {teamProfiles.map(team => (
              <option key={team.team} value={team.team}>
                {team.team}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
        {summaryCards.map(card => (
          <div key={card.label} className="app-card p-5">
            <div className="text-[11px] uppercase tracking-[0.16em] font-semibold" style={{ color: card.accent }}>{card.label}</div>
            <div className="mt-2 text-xl text-slate-950" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>{card.title}</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">{card.detail}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.26)]">
        {rotationWatch && (
          <CollapsibleSection
            title="Rotation Watch"
            subtitle="Recent workload trends and the biggest minute swings"
            isOpen={showRotationWatch}
            onToggle={() => setShowRotationWatch(open => !open)}
          >
            <RotationWatchSection rotationWatch={rotationWatch} accent={focusColors.primary} />
          </CollapsibleSection>
        )}

        {focusTeam && lineupLab && (
          <CollapsibleSection
            title="Lineup Impact Lab"
            subtitle="Test 3-5 player combinations against the team baseline"
            isOpen={showLineupLab}
            onToggle={() => setShowLineupLab(open => !open)}
          >
            <LineupImpactLab
              team={focusTeam}
              accent={focusColors.primary}
              lineupIds={lineupIds}
              onTogglePlayer={playerId => {
                setLineupIds(current => {
                  if (current.includes(playerId)) {
                    if (current.length <= 3) return current
                    return current.filter(id => id !== playerId)
                  }
                  if (current.length >= 5) {
                    return [...current.slice(1), playerId]
                  }
                  return [...current, playerId]
                })
              }}
              lab={lineupLab}
            />
          </CollapsibleSection>
        )}

        {focusTeam && synergyBoard.length > 0 && (
          <CollapsibleSection
            title="Lineup Synergy Board"
            subtitle="Best 5-player groups with balanced guards, wings, bigs, and stable production"
            isOpen={showSynergyBoard}
            onToggle={() => setShowSynergyBoard(open => !open)}
          >
            <LineupSynergyBoard entries={synergyBoard} accent={focusColors.primary} />
          </CollapsibleSection>
        )}

        <CollapsibleSection
          title="Matchup Board"
          subtitle="Weighted and random forest team outlooks"
          isOpen={showMatchups}
          onToggle={() => setShowMatchups(open => !open)}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap border-b border-slate-200 bg-slate-50 px-4 py-4 md:px-5">
            <div>
              <div className="text-lg font-semibold text-slate-900">Matchup board</div>
              <div className="mt-1 text-[12px] text-slate-500">One row per opponent, with both models shown side by side.</div>
            </div>
            <div className="flex rounded-full border border-slate-200 bg-white p-1">
              {(['home', 'away'] as const).map(option => (
                <button
                  key={option}
                  onClick={() => setVenue(option)}
                  className="rounded-full px-4 py-2 text-sm font-semibold"
                  style={{
                    background: venue === option ? focusColors.primary : 'transparent',
                    color: venue === option ? '#fff' : '#475569',
                  }}
                >
                  {option === 'home' ? 'At home' : 'On road'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[100px_1fr_1fr] gap-4 bg-slate-50 px-4 py-3 text-[12px] uppercase tracking-[0.16em] text-slate-400 font-semibold">
            <div>Opponent</div>
            <div>Weighted</div>
            <div>Random Forest</div>
          </div>

          <div className="divide-y divide-slate-200">
            {matchupRows.map(row => (
              <div key={row.opponent.team} className="grid grid-cols-[100px_1fr_1fr] gap-4 px-4 py-4 items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: row.opponentColors.primary }} />
                    <div className="text-base font-semibold text-slate-900 truncate">{row.opponent.team}</div>
                  </div>
                </div>

                <GaugeColumn
                  label={row.weightedPct >= 50 ? `${selectedTeam} favored` : `${row.opponent.team} favored`}
                  pct={row.weightedPct}
                  color={focusColors.primary}
                />

                <GaugeColumn
                  label={row.rfPct >= 50 ? `${selectedTeam} favored` : `${row.opponent.team} favored`}
                  pct={row.rfPct}
                  color={focusColors.secondary}
                />
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </section>
  )
}

function LineupSynergyBoard({
  entries,
  accent,
}: {
  entries: ReturnType<typeof analyzeLineupSynergy>
  accent: string
}) {
  return (
    <div className="bg-white px-4 py-4 md:px-5">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {entries.map((entry, index) => (
          <div key={entry.names.join('|')} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] font-semibold" style={{ color: accent }}>
                  Top Lineup {index + 1}
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{entry.score.toFixed(0)}</div>
                <div className="text-[11px] text-slate-500">Synergy score</div>
              </div>
              <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                {entry.balanceLabel}
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              {entry.names.map(name => (
                <div key={name} className="text-[13px] font-medium text-slate-700">{name}</div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {entry.highlights.map(highlight => (
                <div key={highlight.label} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{highlight.label}</div>
                  <div className="mt-1 text-[13px] font-semibold text-slate-800">{highlight.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CollapsibleSection({
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
}: {
  title: string
  subtitle: string
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="ui-nav-button flex w-full items-center justify-between gap-4 bg-white px-4 py-4 text-left md:px-5"
      >
        <div>
          <div className="text-[12px] uppercase tracking-[0.16em] font-semibold text-slate-700">{title}</div>
          <div className="mt-1 text-[12px] text-slate-500">{subtitle}</div>
        </div>
        <div className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] font-semibold text-slate-600">
          {isOpen ? 'Hide' : 'Open'}
        </div>
      </button>
      {isOpen && children}
    </div>
  )
}

function LineupImpactLab({
  team,
  accent,
  lineupIds,
  onTogglePlayer,
  lab,
}: {
  team: NonNullable<ReturnType<typeof buildTeamProfiles>[number]>
  accent: string
  lineupIds: number[]
  onTogglePlayer: (playerId: number) => void
  lab: ReturnType<typeof analyzeLineupImpact>
}) {
  return (
    <div className="bg-white px-4 py-4 md:px-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] font-semibold" style={{ color: accent }}>Lineup Impact Lab</div>
          <div className="mt-1 text-[11px] text-slate-500">Pick 3-5 players and see how that group shifts the team profile.</div>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
          {lineupIds.length} players selected
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {team.players.slice(0, 10).map(player => {
          const active = lineupIds.includes(player.player_id)
          return (
            <button
              key={player.player_id}
              onClick={() => onTogglePlayer(player.player_id)}
              className="rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all"
              style={{
                borderColor: active ? accent : '#e2e8f0',
                background: active ? `${accent}14` : '#fff',
                color: active ? accent : '#64748b',
              }}
            >
              {player.name.split(' ').slice(-1)[0]}
            </button>
          )
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {lab.metrics.map(metric => (
            <div key={metric.label} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{metric.label}</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{metric.value}</div>
              <div className="mt-1 text-[11px] text-slate-500">
                Team baseline: <span className="font-semibold text-slate-700">{metric.baseline}</span>
              </div>
              <div className="mt-1 text-[11px] font-semibold" style={{ color: metric.delta >= 0 ? '#15803d' : '#dc2626' }}>
                {metric.comparison}
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${metric.fill}%`,
                    background: metric.delta >= 0 ? '#22c55e' : '#f97316',
                    opacity: 0.8,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
          <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Lineup Read</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">{lab.headline}</div>
          <div className="mt-2 text-[12px] leading-5 text-slate-600">{lab.summary}</div>
          <div className="mt-2 text-[11px] text-slate-500">
            All lineup numbers are per-player blends, then compared against the team’s normal top-5 baseline.
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Total Lineup Score</div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div className="text-2xl font-semibold text-slate-900">{lab.totalScore.score.toFixed(0)}</div>
              <div className="text-right">
                <div className="text-[11px] text-slate-500">Average lineup: <span className="font-semibold text-slate-700">{lab.totalScore.baseline.toFixed(0)}</span></div>
                <div className="mt-1 text-[11px] font-semibold" style={{ color: lab.totalScore.delta >= 0 ? '#15803d' : '#dc2626' }}>
                  {lab.totalScore.delta >= 0 ? '+' : ''}{lab.totalScore.delta.toFixed(0)} vs average lineup
                </div>
              </div>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${lab.totalScore.fill}%`,
                  background: lab.totalScore.delta >= 0 ? '#22c55e' : '#f97316',
                  opacity: 0.85,
                }}
              />
            </div>
            <div className="mt-2 text-[11px] leading-5 text-slate-500">{lab.totalScore.detail}</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {lab.tags.map(tag => (
              <span key={tag} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function RotationWatchSection({
  rotationWatch,
  accent,
}: {
  rotationWatch: ReturnType<typeof analyzeRotationWatch>
  accent: string
}) {
  return (
    <div className="bg-white px-4 py-4 md:px-5">
      {rotationWatch.hasAnySignals ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {rotationWatch.categories.map(category => (
            <div key={category.label} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.16em] font-semibold" style={{ color: accent }}>{category.label}</div>
              <div className="mt-4 space-y-3">
                <RotationWatchEntryCard title="Up" entry={category.up} direction="up" />
                <RotationWatchEntryCard title="Down" entry={category.down} direction="down" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
          Not enough recent game history to detect rotation changes yet.
        </div>
      )}
    </div>
  )
}

function RotationWatchEntryCard({
  title,
  entry,
  direction,
}: {
  title: string
  entry: {
    playerName: string
    delta: number
    summary: string
    lastGameDate: string
    sampleLabel: string
  } | null
  direction: 'up' | 'down'
}) {
  if (!entry) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
        No clear {direction} signal.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-semibold">{title}</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{entry.playerName}</div>
        </div>
        <div
          className="rounded-full px-3 py-1.5 text-base font-semibold"
          style={{
            background: entry.delta >= 0 ? '#dcfce7' : '#fee2e2',
            color: entry.delta >= 0 ? '#15803d' : '#dc2626',
          }}
        >
          {entry.delta >= 0 ? '+' : ''}{entry.delta.toFixed(1)}
        </div>
      </div>
      <div className="mt-2 text-[12px] text-slate-600">{entry.summary}</div>
      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-400">
        <span>{entry.sampleLabel}</span>
        <span>{entry.lastGameDate}</span>
      </div>
    </div>
  )
}

function GaugeColumn({
  label,
  pct,
  color,
}: {
  label: string
  pct: number
  color: string
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold truncate" style={{ color }}>{label}</div>
        <div className="text-sm font-semibold text-slate-900 shrink-0">{pct.toFixed(0)}%</div>
      </div>

      <div className="mt-2 h-3 w-full rounded-full bg-slate-200 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function guessSeasonFromBlock(block: SeasonBlock) {
  const sampleDate = Object.values(block.game_logs)[0]?.[0]?.game_date ?? ''
  const match = sampleDate.match(/\b(20\d{2})\b/)
  return match?.[1] ?? '2026'
}

function analyzeTeamRoster(team: NonNullable<ReturnType<typeof buildTeamProfiles>[number]>, block: SeasonBlock) {
  const eligiblePlayers = team.players.filter(player => player.gp >= 3)
  const playerSignals = eligiblePlayers.map(player => {
    const logs = block.game_logs[String(player.player_id)] ?? []
    const wins = logs.filter(game => game.wl === 'W')
    const losses = logs.filter(game => game.wl === 'L')
    const average = (values: number[], fallback = 0) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback
    const ts = player.fga + 0.44 * player.fta > 0 ? player.pts / (2 * (player.fga + 0.44 * player.fta)) : 0
    const efg = player.fga > 0 ? (player.fgm + 0.5 * player.fg3m) / player.fga : 0
    const astTov = player.tov > 0 ? player.ast / player.tov : player.ast
    const defense = player.stl * 1.6 + player.blk * 1.5 + player.dreb * 0.45 + player.oreb * 0.35
    const winLift = average(wins.map(game => game.plus_minus), player.plus_minus) - average(losses.map(game => game.plus_minus), player.plus_minus)
    const scoringDelta = average(wins.map(game => game.pts), player.pts) - average(losses.map(game => game.pts), player.pts)
    const efficiencyDelta = average(wins.map(game => game.fg_pct), player.fg_pct) - average(losses.map(game => game.fg_pct), player.fg_pct)
    const impactScore =
      player.pts * 0.9 +
      player.reb * 0.7 +
      player.ast * 1.05 +
      defense +
      player.plus_minus * 0.9 +
      ts * 14 +
      efg * 10 +
      astTov * 2.8 +
      winLift * 1.2 +
      efficiencyDelta * 18 +
      scoringDelta * 0.45

    return {
      player,
      ts,
      efg,
      astTov,
      defense,
      winLift,
      impactScore,
    }
  })

  const mostValuable = [...playerSignals]
    .sort((a, b) => b.impactScore - a.impactScore)[0]

  return {
    mostValuable: {
      player: mostValuable.player,
      statline: `${mostValuable.player.pts.toFixed(1)} PTS • ${(mostValuable.ts * 100).toFixed(0)} TS% • ${mostValuable.player.plus_minus.toFixed(1)} +/-`,
      detail: `${mostValuable.player.name.split(' ')[0]} grades highest once scoring is adjusted for efficiency, defense, ball security, and how strongly their performances track with winning possessions and margin.`,
    },
  }
}

function analyzeRotationWatch(team: NonNullable<ReturnType<typeof buildTeamProfiles>[number]>, block: SeasonBlock) {
  const recentWindow = 5
  const baselineWindow = 5
  const minimumBaselineGames = 5

  const entries = team.players
    .map(player => {
      const logs = (block.game_logs[String(player.player_id)] ?? []).filter(game => typeof game.min === 'number')
      const recent = logs.slice(0, recentWindow)
      const baseline = logs.slice(recentWindow, recentWindow + baselineWindow)

      if (recent.length < recentWindow || baseline.length < minimumBaselineGames) {
        return null
      }

      const recentAverage = average(recent.map(game => game.min))
      const baselineAverage = average(baseline.map(game => game.min))
      const lastGameDate = recent[0]?.game_date ?? 'No recent game'

      return {
        player,
        lastGameDate,
        recentGames: recent.length,
        baselineGames: baseline.length,
        minuteDelta: recentAverage - baselineAverage,
        pointsDelta: average(recent.map(game => game.pts)) - average(baseline.map(game => game.pts)),
        reboundDelta: average(recent.map(game => game.reb)) - average(baseline.map(game => game.reb)),
      }
    })
    .filter(Boolean) as Array<{
      player: NonNullable<ReturnType<typeof buildTeamProfiles>[number]>['players'][number]
      lastGameDate: string
      recentGames: number
      baselineGames: number
      minuteDelta: number
      pointsDelta: number
      reboundDelta: number
    }>

  const buildCategory = (
    label: string,
    getter: (entry: typeof entries[number]) => number,
    summaryLabel: string
  ) => {
    const upEntry = [...entries]
      .filter(entry => getter(entry) > 0)
      .sort((a, b) => getter(b) - getter(a))[0] ?? null
    const downEntry = [...entries]
      .filter(entry => getter(entry) < 0)
      .sort((a, b) => getter(a) - getter(b))[0] ?? null

    return {
      label,
      up: upEntry
        ? {
            playerName: upEntry.player.name,
            delta: getter(upEntry),
            summary: `${summaryLabel} up`,
            lastGameDate: upEntry.lastGameDate,
            sampleLabel: `Last ${upEntry.recentGames} vs previous ${upEntry.baselineGames} games`,
          }
        : null,
      down: downEntry
        ? {
            playerName: downEntry.player.name,
            delta: getter(downEntry),
            summary: `${summaryLabel} down`,
            lastGameDate: downEntry.lastGameDate,
            sampleLabel: `Last ${downEntry.recentGames} vs previous ${downEntry.baselineGames} games`,
          }
        : null,
    }
  }

  return {
    categories: [
      buildCategory('Minutes', entry => entry.minuteDelta, 'Minutes'),
      buildCategory('Points', entry => entry.pointsDelta, 'Points'),
      buildCategory('Rebounds', entry => entry.reboundDelta, 'Rebounds'),
    ],
    hasAnySignals: entries.length > 0,
  }
}

function analyzeLineupImpact(
  team: NonNullable<ReturnType<typeof buildTeamProfiles>[number]>,
  lineupIds: number[]
) {
  const lineupPlayers = team.players.filter(player => lineupIds.includes(player.player_id))
  const selected = lineupPlayers.length ? lineupPlayers : team.players.slice(0, 5)

  const teamPool = team.players.filter(player => player.gp >= 3 && player.min >= 6)
  const baselinePool = teamPool.length ? teamPool : team.players
  const composite = scoreLineupProfile(selected, baselinePool)
  const {
    baseline,
    values,
    deltas,
    roleCounts,
    totalScore,
  } = composite

  const rankedEdges = [
    { key: 'ts', label: 'Efficiency', delta: deltas.ts },
    { key: 'shootingGravity', label: '3-point shooting', delta: deltas.shootingGravity },
    { key: 'creation', label: 'Creation', delta: deltas.creation },
    { key: 'defense', label: 'Stocks + boards', delta: deltas.defense },
    { key: 'rebounding', label: 'Rebounding', delta: deltas.rebounding },
    { key: 'ballSecurity', label: 'Ball security', delta: deltas.ballSecurity },
  ].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  const positives = rankedEdges.filter(edge => edge.delta > 0).slice(0, 2).map(edge => edge.label)
  const negatives = rankedEdges.filter(edge => edge.delta < 0).slice(0, 2).map(edge => edge.label)

  const headline = positives.length
    ? `This lineup leans into ${positives.join(' and ').toLowerCase()}.`
    : 'This lineup looks balanced but not clearly additive.'
  const summary = `${selected.map(player => player.name.split(' ').slice(-1)[0]).join(', ')} are minute-weighted together, then compared with the broader team rotation baseline${positives.length ? ` to show stronger ${positives.join(' and ').toLowerCase()}` : ''}${negatives.length ? `, but a dip in ${negatives.join(' and ').toLowerCase()}` : ''}.`

  return {
    metrics: [
      buildMetricCard('Efficiency', `${(values.ts * 100).toFixed(0)} TS%`, `${(baseline.ts * 100).toFixed(0)} TS%`, deltas.ts, 3, 18, 'more efficient', 'less efficient', ' pts'),
      buildMetricCard('3PT Percentage', `${(values.fg3Pct * 100).toFixed(1)}%`, `${(baseline.fg3Pct * 100).toFixed(1)}%`, deltas.shootingGravity, 0.18, 35, 'better 3-point shooting', 'worse 3-point shooting', ''),
      buildMetricCard('Creation', `${values.creation.toFixed(1)} AST`, `${baseline.creation.toFixed(1)} AST`, deltas.creation, 0.5, 5, 'more creation', 'less creation', ''),
      buildMetricCard('Def Contribution', `${values.defense.toFixed(1)} score`, `${baseline.defense.toFixed(1)} score`, deltas.defense, 0.45, 8, 'more defensive contribution', 'less defensive contribution', ''),
      buildMetricCard('Rebounding', `${values.rebounding.toFixed(1)} REB`, `${baseline.rebounding.toFixed(1)} REB`, deltas.rebounding, 0.5, 8, 'better on the glass', 'weaker on the glass', ''),
      buildMetricCard('Ball Security', `${values.ballSecurity.toFixed(1)} AST/TO`, `${baseline.ballSecurity.toFixed(1)} AST/TO`, deltas.ballSecurity, 0.25, 4, 'cleaner with the ball', 'looser with the ball', ''),
    ],
    headline,
    summary,
    tags: [
      positives[0] ? `+ ${positives[0]}` : 'Stable profile',
      positives[1] ? `+ ${positives[1]}` : `${selected.length}-player group`,
      negatives[0] ? `- ${negatives[0]}` : 'No major weakness',
    ],
    totalScore: {
      score: totalScore.score,
      baseline: totalScore.baseline,
      delta: totalScore.delta,
      fill: totalScore.fill,
      detail: `This score blends shooting, creation, defense, rebounding, ball security, efficiency, and an implicit lineup-balance check for guards, wings, and bigs. Small stat changes are intentionally damped so one tiny swing does not overreact. Current mix: ${roleCounts.guards} guard${roleCounts.guards === 1 ? '' : 's'}, ${roleCounts.wings} wing${roleCounts.wings === 1 ? '' : 's'}, ${roleCounts.bigs} big${roleCounts.bigs === 1 ? '' : 's'}.`,
    },
  }
}

function analyzeLineupSynergy(team: NonNullable<ReturnType<typeof buildTeamProfiles>[number]>) {
  const eligible = team.players
    .filter(player => player.gp >= 4 && player.min >= 6)
    .slice(0, 10)
  const teamPool = team.players.filter(player => player.gp >= 3 && player.min >= 6)
  const baselinePool = teamPool.length ? teamPool : team.players

  if (eligible.length < 5) {
    return []
  }

  const combinations: Array<typeof eligible> = []
  for (let a = 0; a < eligible.length - 4; a++) {
    for (let b = a + 1; b < eligible.length - 3; b++) {
      for (let c = b + 1; c < eligible.length - 2; c++) {
        for (let d = c + 1; d < eligible.length - 1; d++) {
          for (let e = d + 1; e < eligible.length; e++) {
            combinations.push([eligible[a], eligible[b], eligible[c], eligible[d], eligible[e]])
          }
        }
      }
    }
  }

  return combinations
    .map(lineup => {
      const composite = scoreLineupProfile(lineup, baselinePool)

      return {
        lineup,
        score: composite.totalScore.score,
        guards: composite.roleCounts.guards,
        wings: composite.roleCounts.wings,
        bigs: composite.roleCounts.bigs,
        overlapKey: lineup.map(player => player.player_id).sort((x, y) => x - y).join('-'),
        highlights: [
          { label: 'TS%', value: `${(composite.values.ts * 100).toFixed(0)}%` },
          { label: '3PT', value: `${(composite.values.fg3Pct * 100).toFixed(1)}%` },
          { label: 'AST', value: composite.values.creation.toFixed(1) },
          { label: 'REB', value: composite.values.rebounding.toFixed(1) },
        ],
        balanceLabel: `${composite.roleCounts.guards}G • ${composite.roleCounts.wings}W • ${composite.roleCounts.bigs}B`,
        names: lineup.map(player => player.name),
      }
    })
    .sort((a, b) => b.score - a.score)
    .filter((entry, index, all) => all.findIndex(other => other.overlapKey === entry.overlapKey) === index && index < 3)
    .slice(0, 3)
    .map(({ overlapKey: _overlapKey, lineup: _lineup, ...entry }) => entry)
}

function scoreLineupProfile(
  players: NonNullable<ReturnType<typeof buildTeamProfiles>[number]>['players'],
  baselinePool: NonNullable<ReturnType<typeof buildTeamProfiles>[number]>['players']
) {
  const weightedAverage = (
    sourcePlayers: typeof players,
    getter: (player: typeof players[number]) => number
  ) => {
    const totalMinutes = sourcePlayers.reduce((sum, player) => sum + Math.max(player.min, 0), 0)
    if (totalMinutes <= 0) {
      return sourcePlayers.length ? sourcePlayers.reduce((sum, player) => sum + getter(player), 0) / sourcePlayers.length : 0
    }
    return sourcePlayers.reduce((sum, player) => sum + getter(player) * Math.max(player.min, 0), 0) / totalMinutes
  }

  const trueShooting = (player: typeof players[number]) =>
    player.fga + 0.44 * player.fta > 0 ? player.pts / (2 * (player.fga + 0.44 * player.fta)) : 0
  const gravityScore = (player: typeof players[number]) => player.fg3a * player.fg3_pct
  const creationLoad = (player: typeof players[number]) => player.ast
  const defenseActivity = (player: typeof players[number]) => player.stl * 1.7 + player.blk * 1.5 + player.dreb * 0.28 + player.oreb * 0.18
  const reboundRate = (player: typeof players[number]) => player.reb
  const ballSecurityValue = (player: typeof players[number]) => player.tov > 0 ? player.ast / player.tov : player.ast
  const classifyRole = (player: typeof players[number]) => {
    if (player.ast >= player.reb * 0.8 && player.reb < 6.5) return 'guard'
    if (player.reb >= 6.8 || player.blk >= 0.8 || player.oreb >= 1.4) return 'big'
    return 'wing'
  }

  const values = {
    ts: weightedAverage(players, trueShooting),
    shootingGravity: weightedAverage(players, gravityScore),
    fg3Pct: weightedAverage(players, player => player.fg3_pct),
    creation: weightedAverage(players, creationLoad),
    defense: weightedAverage(players, defenseActivity),
    rebounding: weightedAverage(players, reboundRate),
    ballSecurity: weightedAverage(players, ballSecurityValue),
  }

  const baseline = {
    ts: weightedAverage(baselinePool, trueShooting),
    shootingGravity: weightedAverage(baselinePool, gravityScore),
    fg3Pct: weightedAverage(baselinePool, player => player.fg3_pct),
    creation: weightedAverage(baselinePool, creationLoad),
    defense: weightedAverage(baselinePool, defenseActivity),
    rebounding: weightedAverage(baselinePool, reboundRate),
    ballSecurity: weightedAverage(baselinePool, ballSecurityValue),
  }

  const deltas = {
    shootingGravity: values.shootingGravity - baseline.shootingGravity,
    fg3Pct: (values.fg3Pct - baseline.fg3Pct) * 100,
    creation: values.creation - baseline.creation,
    defense: values.defense - baseline.defense,
    rebounding: values.rebounding - baseline.rebounding,
    ballSecurity: values.ballSecurity - baseline.ballSecurity,
    ts: (values.ts - baseline.ts) * 100,
  }

  const roleCounts = {
    guards: players.filter(player => classifyRole(player) === 'guard').length,
    wings: players.filter(player => classifyRole(player) === 'wing').length,
    bigs: players.filter(player => classifyRole(player) === 'big').length,
  }

  const guardTarget = players.length >= 5 ? 2 : Math.max(1, Math.round(players.length * 0.4))
  const bigTarget = players.length >= 5 ? 1 : Math.max(1, Math.round(players.length * 0.2))
  const wingTarget = Math.max(1, players.length - guardTarget - bigTarget)
  const balancePenalty =
    Math.abs(roleCounts.guards - guardTarget) * 3 +
    Math.abs(roleCounts.bigs - bigTarget) * 4 +
    Math.abs(roleCounts.wings - wingTarget) * 2

  const smoothContribution = (delta: number, scale: number, weight: number, deadZone = 0) => {
    const adjusted = Math.abs(delta) <= deadZone ? 0 : delta - Math.sign(delta) * deadZone
    return (adjusted / (Math.abs(adjusted) + scale)) * weight
  }

  const rawDelta =
    smoothContribution(deltas.shootingGravity, 0.14, 11, 0.01) +
    smoothContribution(deltas.creation, 0.4, 8, 0.03) +
    smoothContribution(deltas.defense, 0.38, 8, 0.03) +
    smoothContribution(deltas.rebounding, 0.45, 7, 0.04) +
    smoothContribution(deltas.ballSecurity, 0.3, 4.5, 0.06) +
    smoothContribution(deltas.ts, 2.8, 9, 0.2) -
    Math.min(12, balancePenalty)

  const boundedDelta = Math.max(-24, Math.min(24, rawDelta))
  const score = Math.max(1, Math.min(99, 50 + boundedDelta))
  const baselineScore = 50

  return {
    values,
    baseline,
    deltas,
    roleCounts,
    totalScore: {
      score,
      baseline: baselineScore,
      delta: score - baselineScore,
      fill: Math.max(8, Math.min(100, score)),
    },
  }
}

function buildMetricCard(
  label: string,
  value: string,
  baseline: string,
  delta: number,
  scale: number,
  maxFill: number,
  positiveLabel: string,
  negativeLabel: string,
  unitSuffix: string
) {
  const normalized = Math.max(8, Math.min(100, 50 + (delta / scale) * maxFill))
  const amount = Math.abs(delta).toFixed(1)
  return {
    label,
    value,
    baseline,
    delta,
    comparison: `${delta >= 0 ? '+' : '-'}${amount}${unitSuffix} vs baseline • ${delta >= 0 ? positiveLabel : negativeLabel}`,
    fill: normalized,
  }
}
