import { useEffect, useMemo, useState } from 'react'
import type { SeasonBlock, TeamPredictionsData } from '../types'
import { getTeamColors } from '../utils/teamColors'
import { buildTeamProfiles, predictMatchup } from '../utils/teamPrediction'
import rawPredictions from '../data/team_predictions.json'

interface Props {
  block: SeasonBlock | null
}

const teamPredictions = rawPredictions as TeamPredictionsData

export default function NextGamePrediction({ block }: Props) {
  const teamProfiles = useMemo(() => (block ? buildTeamProfiles(block) : []), [block])
  const [selectedTeam, setSelectedTeam] = useState(teamProfiles[0]?.team ?? 'IND')
  const [venue, setVenue] = useState<'home' | 'away'>('home')

  useEffect(() => {
    if (!teamProfiles.find(team => team.team === selectedTeam)) {
      setSelectedTeam(teamProfiles[0]?.team ?? 'IND')
    }
  }, [selectedTeam, teamProfiles])

  const focusTeam = teamProfiles.find(team => team.team === selectedTeam) ?? null
  const focusColors = getTeamColors(selectedTeam)
  const rosterSignals = useMemo(() => {
    if (!focusTeam || !block) return null
    return analyzeTeamRoster(focusTeam, block)
  }, [block, focusTeam])

  const matchupRows = useMemo(() => {
    if (!focusTeam) return []

    return teamProfiles
      .filter(team => team.team !== focusTeam.team)
      .map(opponent => {
        const weightedPrediction = predictMatchup(focusTeam, opponent, venue)
        const rfPrediction = teamPredictions.forecasts[selectedTeam]?.[venue]?.[opponent.team] ?? null
        const weightedPct = weightedPrediction.teamAWinPct
        const rfPct = rfPrediction?.team_win_pct ?? weightedPct

        return {
          opponent,
          opponentColors: getTeamColors(opponent.team),
          weightedPct,
          weightedReason: weightedPrediction.reasons[0]?.edge ?? '',
          rfPct,
          rfReason: rfPrediction?.reasons[0]?.detail ?? '',
        }
      })
      .sort((a, b) => b.rfPct - a.rfPct)
  }, [focusTeam, selectedTeam, teamProfiles, venue])

  if (!block || !focusTeam || teamProfiles.length < 2) {
    return null
  }

  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400 font-semibold">Team Predictions</p>
          <h2 className="text-2xl text-slate-900 mt-1">Matchup board</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-3xl">
            One column, each opponent once, with both models shown side by side.
          </p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <select
            value={selectedTeam}
            onChange={event => setSelectedTeam(event.target.value)}
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 focus:outline-none"
          >
            {teamProfiles.map(team => (
              <option key={team.team} value={team.team}>
                {team.team}
              </option>
            ))}
          </select>

          <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1">
            {(['home', 'away'] as const).map(option => (
              <button
                key={option}
                onClick={() => setVenue(option)}
                className="rounded-full px-4 py-1.5 text-sm font-medium"
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
      </div>

      <div className="mt-5 rounded-[22px] border border-slate-200 overflow-hidden">
        {rosterSignals && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-b border-slate-200 bg-slate-50/70">
            <RosterCard
              title="Most Valuable"
              subtitle="Biggest win driver"
              player={rosterSignals.mostValuable.player.name}
              detail={rosterSignals.mostValuable.detail}
              accent={focusColors.primary}
              statline={rosterSignals.mostValuable.statline}
            />
            <RosterCard
              title="Chopping Block"
              subtitle="Tradeable rotation piece"
              player={rosterSignals.choppingBlock.player.name}
              detail={rosterSignals.choppingBlock.detail}
              accent={focusColors.secondary}
              statline={rosterSignals.choppingBlock.statline}
            />
          </div>
        )}

        <div className="grid grid-cols-[90px_1fr_1fr] gap-4 bg-slate-50 px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-slate-400 font-semibold">
          <div>Opponent</div>
          <div>Weighted</div>
          <div>Random Forest</div>
        </div>

        <div className="divide-y divide-slate-200">
          {matchupRows.map(row => (
            <div key={row.opponent.team} className="grid grid-cols-[90px_1fr_1fr] gap-4 px-4 py-4 items-center">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: row.opponentColors.primary }} />
                  <div className="text-sm font-semibold text-slate-900 truncate">{row.opponent.team}</div>
                </div>
              </div>

              <GaugeColumn
                label={row.weightedPct >= 50 ? `${selectedTeam} favored` : `${row.opponent.team} favored`}
                pct={row.weightedPct}
                leftTeam={selectedTeam}
                rightTeam={row.opponent.team}
                color={focusColors.primary}
                note={compactReason(row.weightedReason)}
              />

              <GaugeColumn
                label={row.rfPct >= 50 ? `${selectedTeam} favored` : `${row.opponent.team} favored`}
                pct={row.rfPct}
                leftTeam={selectedTeam}
                rightTeam={row.opponent.team}
                color={focusColors.secondary}
                note={compactReason(row.rfReason)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function RosterCard({
  title,
  subtitle,
  player,
  detail,
  accent,
  statline,
}: {
  title: string
  subtitle: string
  player: string
  detail: string
  accent: string
  statline: string
}) {
  return (
    <div className="p-4 md:p-5 first:border-b md:first:border-b-0 md:first:border-r border-slate-200">
      <div className="text-[11px] uppercase tracking-[0.16em] font-semibold" style={{ color: accent }}>{title}</div>
      <div className="text-[10px] text-slate-400 mt-1">{subtitle}</div>
      <div className="text-lg font-semibold text-slate-900 mt-2">{player}</div>
      <div className="text-sm text-slate-500 mt-1">{statline}</div>
      <div className="text-sm text-slate-600 mt-3 leading-5">{detail}</div>
    </div>
  )
}

function GaugeColumn({
  label,
  pct,
  leftTeam,
  rightTeam,
  color,
  note,
}: {
  label: string
  pct: number
  leftTeam: string
  rightTeam: string
  color: string
  note: string
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

      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
        <span>{leftTeam}</span>
        <span>{rightTeam}</span>
      </div>

      <div className="mt-2 text-[11px] text-slate-500 truncate">{note}</div>
    </div>
  )
}

function compactReason(text: string) {
  return text
    .replace(' currently leans toward ', ' ')
    .replace(' has home court in this scenario.', ' home edge')
    .replace(' win rate vs ', ' vs ')
    .replace('Last 5: ', '')
    .replace('Average margin', '+/-')
    .replace('Scoring volume', 'PTS')
    .replace('Rebounding', 'REB')
    .replace('Turnover control', 'TOV')
    .replace('Field-goal efficiency', 'FG')
    .replace('3-point shooting', '3PT')
    .replace('Free-throw shooting', 'FT')
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
    const usage = player.min > 0 ? (player.fga + 0.44 * player.fta + player.tov) / player.min : 0

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

    const tradeValueScore =
      player.min * 0.4 +
      player.pts * 0.85 +
      player.reb * 0.45 +
      player.ast * 0.75 +
      player.fg_pct * 10 +
      player.fg3_pct * 8 +
      ts * 12 +
      usage * 18

    const choppingRisk =
      player.plus_minus * -0.9 +
      Math.max(0, 0.54 - ts) * 22 +
      Math.max(0, 0.5 - efg) * 16 +
      Math.max(0, 1.4 - astTov) * 5 +
      Math.max(0, 1.0 - defense / 4) * 4 +
      Math.max(0, -winLift) * 1.4

    return {
      player,
      ts,
      efg,
      astTov,
      defense,
      winLift,
      impactScore,
      tradeValueScore,
      choppingScore: tradeValueScore + choppingRisk,
    }
  })

  const mostValuable = [...playerSignals]
    .sort((a, b) => b.impactScore - a.impactScore)[0]

  const choppingPool = playerSignals.filter(signal =>
    signal.player.min >= 12 &&
    signal.player.gp >= 5 &&
    signal.player.min < 30 &&
    signal.impactScore < mostValuable.impactScore * 0.82 &&
    signal.tradeValueScore > 20
  )

  const choppingBlock = [...(choppingPool.length ? choppingPool : playerSignals.filter(signal => signal.player.min >= 10))]
    .sort((a, b) => b.choppingScore - a.choppingScore)[0]

  return {
    mostValuable: {
      player: mostValuable.player,
      statline: `${mostValuable.player.pts.toFixed(1)} PTS • ${(mostValuable.ts * 100).toFixed(0)} TS% • ${mostValuable.player.plus_minus.toFixed(1)} +/-`,
      detail: `${mostValuable.player.name.split(' ')[0]} grades highest once scoring is adjusted for efficiency, defense, ball security, and how strongly their performances track with winning possessions and margin.`,
    },
    choppingBlock: {
      player: choppingBlock.player,
      statline: `${choppingBlock.player.pts.toFixed(1)} PTS • ${(choppingBlock.ts * 100).toFixed(0)} TS% • ${choppingBlock.player.plus_minus.toFixed(1)} +/-`,
      detail: `${choppingBlock.player.name.split(' ')[0]} still has rotation value and enough offensive profile to interest other teams, but weaker efficiency, defense, or win-impact signals make them more movable than the core.`,
    },
  }
}
