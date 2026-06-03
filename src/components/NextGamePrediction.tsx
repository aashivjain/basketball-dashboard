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
