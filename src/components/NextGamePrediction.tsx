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

  const matchupRows = useMemo(() => {
    if (!focusTeam) return []

    return teamProfiles
      .filter(team => team.team !== focusTeam.team)
      .map(opponent => {
        const weightedPrediction = predictMatchup(focusTeam, opponent, venue)
        const rfPrediction = teamPredictions.forecasts[selectedTeam]?.[venue]?.[opponent.team] ?? null

        return {
          opponent,
          opponentColors: getTeamColors(opponent.team),
          weightedPrediction,
          rfPrediction,
        }
      })
      .sort((a, b) => {
        const left = a.rfPrediction?.team_win_pct ?? a.weightedPrediction.teamAWinPct
        const right = b.rfPrediction?.team_win_pct ?? b.weightedPrediction.teamAWinPct
        return right - left
      })
  }, [focusTeam, selectedTeam, teamProfiles, venue])

  if (!block || !focusTeam || teamProfiles.length < 2) {
    return null
  }

  const weightedAverage = matchupRows.length
    ? matchupRows.reduce((sum, row) => sum + row.weightedPrediction.teamAWinPct, 0) / matchupRows.length
    : 0
  const rfAverage = matchupRows.length
    ? matchupRows.reduce((sum, row) => sum + (row.rfPrediction?.team_win_pct ?? row.weightedPrediction.teamAWinPct), 0) / matchupRows.length
    : 0
  const strongestWeighted = [...matchupRows].sort((a, b) => b.weightedPrediction.teamAWinPct - a.weightedPrediction.teamAWinPct)[0] ?? null
  const strongestRF = [...matchupRows].sort((a, b) => (b.rfPrediction?.team_win_pct ?? 0) - (a.rfPrediction?.team_win_pct ?? 0))[0] ?? null

  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400 font-semibold">Dual Forecast Models</p>
          <h2 className="text-2xl text-slate-900 mt-1">Team predictions</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-3xl">
            Pick a team. See every matchup. Compare the quick weighted model with the daily-updated random forest.
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

      <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-3">
        <ModelSummaryCard
          title="Weighted"
          subtitle="Quick model"
          accent={focusColors.primary}
          average={`${weightedAverage.toFixed(0)}% avg`}
          strongest={strongestWeighted ? `${strongestWeighted.opponent.team} ${strongestWeighted.weightedPrediction.teamAWinPct.toFixed(0)}%` : 'N/A'}
          note="Stats-based"
        />
        <ModelSummaryCard
          title="Random Forest"
          subtitle="Daily model"
          accent={focusColors.secondary}
          average={`${rfAverage.toFixed(0)}% avg`}
          strongest={strongestRF ? `${strongestRF.opponent.team} ${(strongestRF.rfPrediction?.team_win_pct ?? 0).toFixed(0)}%` : 'N/A'}
          note={`${teamPredictions.model.n_estimators} trees`}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
        {matchupRows.map(row => {
          const rfTeamPct = row.rfPrediction?.team_win_pct ?? row.weightedPrediction.teamAWinPct
          const rfOppPct = row.rfPrediction?.opponent_win_pct ?? row.weightedPrediction.teamBWinPct

          return (
            <div key={row.opponent.team} className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-2.5 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{row.opponent.team}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{venue === 'home' ? 'Home' : 'Away'}</div>
                </div>
                <div className="h-3 w-3 rounded-full mt-1" style={{ background: row.opponentColors.primary }} />
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <ForecastMiniCard
                  label="WTD"
                  accent={focusColors.primary}
                  team={selectedTeam}
                  teamPct={row.weightedPrediction.teamAWinPct}
                  oppPct={row.weightedPrediction.teamBWinPct}
                  favoredText={row.weightedPrediction.teamAWinPct >= row.weightedPrediction.teamBWinPct ? 'Favored' : 'Underdog'}
                  reasons={row.weightedPrediction.reasons.map(reason => ({
                    label: reason.label,
                    edgeTeam: reason.impact >= 0 ? selectedTeam : row.opponent.team,
                    detail: ultraCompactReason(reason.edge),
                  }))}
                />

                <ForecastMiniCard
                  label="RF"
                  accent={focusColors.secondary}
                  team={selectedTeam}
                  teamPct={rfTeamPct}
                  oppPct={rfOppPct}
                  favoredText={rfTeamPct >= rfOppPct ? 'Favored' : 'Underdog'}
                  reasons={(row.rfPrediction?.reasons ?? []).map(reason => ({
                    label: reason.label,
                    edgeTeam: reason.edge_team,
                    detail: ultraCompactReason(reason.detail),
                  }))}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function ModelSummaryCard({
  title,
  subtitle,
  accent,
  average,
  strongest,
  note,
}: {
  title: string
  subtitle: string
  accent: string
  average: string
  strongest: string
  note: string
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-3 min-w-0">
      <div className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: accent }}>{subtitle}</div>
      <div className="text-sm font-semibold text-slate-900 mt-1">{title}</div>
      <div className="mt-2.5 space-y-2">
        <InsightRow label="Average" value={average} accent={accent} />
        <InsightRow label="Best matchup" value={strongest} accent={accent} />
      </div>
      <p className="text-[9px] text-slate-400 mt-2 leading-4">{note}</p>
    </div>
  )
}

function ForecastMiniCard({
  label,
  accent,
  team,
  teamPct,
  oppPct,
  favoredText,
  reasons,
}: {
  label: string
  accent: string
  team: string
  teamPct: number
  oppPct: number
  favoredText: string
  reasons: { label: string; edgeTeam: string; detail: string }[]
}) {
  return (
    <div className="rounded-[14px] border border-slate-200 bg-white p-2 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-[0.12em] text-slate-400 font-semibold">{label}</div>
          <div className="text-[10px] font-semibold mt-1 truncate" style={{ color: accent }}>{favoredText}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-semibold leading-none" style={{ color: accent }}>{teamPct.toFixed(0)}%</div>
          <div className="text-[9px] text-slate-400 mt-1">{team}</div>
        </div>
      </div>

      <div className="mt-2.5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full" style={{ width: `${teamPct}%`, background: accent }} />
        </div>
        <div className="mt-1 flex items-center justify-between text-[9px] text-slate-500">
          <span>{teamPct.toFixed(0)}%</span>
          <span>{oppPct.toFixed(0)}%</span>
        </div>
      </div>

      <div className="mt-2.5 space-y-1.5">
        {reasons.slice(0, 1).map(reason => (
          <div key={`${label}-${reason.label}`} className="rounded-lg bg-slate-50 px-2 py-1.5 min-w-0">
            <div className="text-[9px] uppercase tracking-[0.12em] text-slate-400 font-semibold">{reason.label}</div>
            <div className="text-[10px] font-semibold mt-1 leading-4 break-words" style={{ color: accent }}>{reason.detail}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InsightRow({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2.5 min-w-0">
      <div className="text-[9px] uppercase tracking-[0.12em] text-slate-400 font-semibold">{label}</div>
      <div className="text-[11px] font-semibold mt-1 leading-4 break-words" style={{ color: accent }}>{value}</div>
    </div>
  )
}

function ultraCompactReason(text: string) {
  return text
    .replace(' currently leans toward ', ' ')
    .replace('Average margin ', '+/- ')
    .replace('Scoring volume ', 'PTS ')
    .replace('Rebounding ', 'REB ')
    .replace('Turnover control ', 'TOV ')
    .replace('Field-goal efficiency ', 'FG ')
    .replace('3-point shooting ', '3PT ')
    .replace('Free-throw shooting ', 'FT ')
    .replace('Home court', 'Home')
    .replace(' -> ', ' ')
    .replace(' has home court in this scenario.', ' edge')
    .replace(' win rate vs ', ' vs ')
    .replace('Last 5: ', '')
}
