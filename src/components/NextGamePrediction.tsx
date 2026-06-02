import { useEffect, useMemo, useState } from 'react'
import type { SeasonBlock, TeamPredictionsData } from '../types'
import { getTeamColors } from '../utils/teamColors'
import { buildTeamProfiles, predictMatchup } from '../utils/teamPrediction'
import rawPredictions from '../data/team_predictions.json'

interface Props {
  block: SeasonBlock | null
  season: string
  seasonType: 'regular_season' | 'playoffs'
}

const teamPredictions = rawPredictions as TeamPredictionsData

export default function NextGamePrediction({ block, season, seasonType }: Props) {
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
          <h2 className="text-2xl text-slate-900 mt-1">Weighted model and random-forest model</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-3xl">
            Pick any WNBA team to compare the current weighted-averages forecast against a backend-trained random forest that refreshes from the API-backed data artifact.
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

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ModelSummaryCard
          title="Weighted averages"
          subtitle="Frontend model"
          accent={focusColors.primary}
          average={`${weightedAverage.toFixed(0)}% average win odds`}
          strongest={strongestWeighted ? `${selectedTeam} ${strongestWeighted.weightedPrediction.teamAWinPct.toFixed(0)}% vs ${strongestWeighted.opponent.team}` : 'N/A'}
          note="Computed directly from current team production, efficiency, turnover pressure, plus/minus, and venue."
        />
        <ModelSummaryCard
          title="Random forest"
          subtitle={`${teamPredictions.model.name} backend model`}
          accent={focusColors.secondary}
          average={`${rfAverage.toFixed(0)}% average win odds`}
          strongest={strongestRF ? `${selectedTeam} ${(strongestRF.rfPrediction?.team_win_pct ?? 0).toFixed(0)}% vs ${strongestRF.opponent.team}` : 'N/A'}
          note={`Trained on ${teamPredictions.season} forecasts generated ${new Date(teamPredictions.generated_at).toLocaleString()}. ${teamPredictions.model.n_estimators} trees.`}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {matchupRows.map(row => {
          const weightedFavored = row.weightedPrediction.teamAWinPct >= row.weightedPrediction.teamBWinPct
          const rfFavored = (row.rfPrediction?.team_win_pct ?? row.weightedPrediction.teamAWinPct) >= (row.rfPrediction?.opponent_win_pct ?? row.weightedPrediction.teamBWinPct)

          return (
            <div key={row.opponent.team} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-semibold">Matchup</div>
                  <div className="text-lg font-semibold text-slate-900 mt-1">
                    {selectedTeam} vs {row.opponent.team}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    {venue === 'home' ? `${selectedTeam} at home` : `${selectedTeam} on the road`}
                  </div>
                </div>
                <div className="h-3 w-3 rounded-full mt-1" style={{ background: row.opponentColors.primary }} />
              </div>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                <ForecastMiniCard
                  label="Weighted"
                  accent={focusColors.primary}
                  team={selectedTeam}
                  teamPct={row.weightedPrediction.teamAWinPct}
                  opp={row.opponent.team}
                  oppPct={row.weightedPrediction.teamBWinPct}
                  favoredText={weightedFavored ? `${selectedTeam} favored` : `${row.opponent.team} favored`}
                  reasons={row.weightedPrediction.reasons.map(reason => ({
                    label: reason.label,
                    edgeTeam: reason.impact >= 0 ? selectedTeam : row.opponent.team,
                    detail: reason.edge,
                  }))}
                />

                <ForecastMiniCard
                  label="Random Forest"
                  accent={focusColors.secondary}
                  team={selectedTeam}
                  teamPct={row.rfPrediction?.team_win_pct ?? row.weightedPrediction.teamAWinPct}
                  opp={row.opponent.team}
                  oppPct={row.rfPrediction?.opponent_win_pct ?? row.weightedPrediction.teamBWinPct}
                  favoredText={rfFavored ? `${selectedTeam} favored` : `${row.opponent.team} favored`}
                  reasons={(row.rfPrediction?.reasons ?? []).map(reason => ({
                    label: reason.label,
                    edgeTeam: reason.edge_team,
                    detail: reason.detail,
                  }))}
                />
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-slate-400 mt-5 leading-5">
        Daily flow: refresh API-backed season data, regenerate `team_predictions.json`, then the dashboard shows both the heuristic weighted model and the backend random-forest model together.
      </p>
      <p className="text-xs text-slate-400 mt-2 leading-5">
        Current page context uses the loaded {season} {seasonType === 'regular_season' ? 'regular-season' : 'playoff'} dashboard data.
      </p>
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
    <div className="rounded-[24px] border border-slate-200 bg-white p-5">
      <div className="text-[11px] uppercase tracking-[0.18em] font-semibold" style={{ color: accent }}>{subtitle}</div>
      <div className="text-xl text-slate-900 mt-1">{title}</div>
      <div className="mt-4 space-y-3">
        <InsightRow label="Average win probability" value={average} accent={accent} />
        <InsightRow label="Best current matchup" value={strongest} accent={accent} />
      </div>
      <p className="text-xs text-slate-400 mt-4 leading-5">{note}</p>
    </div>
  )
}

function ForecastMiniCard({
  label,
  accent,
  team,
  teamPct,
  opp,
  oppPct,
  favoredText,
  reasons,
}: {
  label: string
  accent: string
  team: string
  teamPct: number
  opp: string
  oppPct: number
  favoredText: string
  reasons: { label: string; edgeTeam: string; detail: string }[]
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-semibold">{label}</div>
          <div className="text-sm font-semibold mt-1" style={{ color: accent }}>{favoredText}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold leading-none" style={{ color: accent }}>{teamPct.toFixed(0)}%</div>
          <div className="text-xs text-slate-400 mt-1">{team} win odds</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full" style={{ width: `${teamPct}%`, background: accent }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>{team} {teamPct.toFixed(0)}%</span>
          <span>{opp} {oppPct.toFixed(0)}%</span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {reasons.slice(0, 3).map(reason => (
          <div key={`${label}-${reason.label}`} className="rounded-xl bg-slate-50 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400 font-semibold">{reason.label}</div>
            <div className="text-xs font-semibold mt-1" style={{ color: accent }}>{reason.edgeTeam} edge</div>
            <div className="text-sm text-slate-600 mt-1 leading-5">{reason.detail}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InsightRow({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-semibold">{label}</div>
      <div className="text-sm font-semibold mt-1" style={{ color: accent }}>{value}</div>
    </div>
  )
}
