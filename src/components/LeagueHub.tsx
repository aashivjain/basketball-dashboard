import { useNavigate } from 'react-router-dom'
import type { SeasonBlock } from '../types'
import { buildTeamProfiles, buildTeamRankings } from '../utils/teamPrediction'
import { getDisplayTeamCode, normalizeTeamCode } from '../utils/teamCodes'

interface Props {
  block: SeasonBlock | null
  season: string
}

function formatWinningPct(wins: number, losses: number) {
  const totalGames = wins + losses
  if (totalGames === 0) return '.000'
  const pct = (wins / totalGames).toFixed(3)
  return pct.startsWith('0') ? pct.slice(1) : pct
}

function buildOverallStandings(block: SeasonBlock | null) {
  if (!block) return []

  const profiles = buildTeamProfiles(block)
  const rankByTeam = buildTeamRankings(profiles)
  
  // Find the actual leader (most wins, then fewest losses)
  const leader = [...profiles].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    return a.losses - b.losses
  })[0]
  
  const leaderWins = leader?.wins ?? 0
  const leaderLosses = leader?.losses ?? 0

  return profiles
    .map(profile => {
      const normalizedTeam = normalizeTeamCode(profile.team)
      const homeGames = profile.games.filter(g => g.matchup.includes('vs.'))
      const awayGames = profile.games.filter(g => g.matchup.includes('@'))
      
      const homeWins = homeGames.filter(g => g.wl === 'W').length
      const homeLosses = homeGames.length - homeWins
      const awayWins = awayGames.filter(g => g.wl === 'W').length
      const awayLosses = awayGames.length - awayWins
      
      const gamesBack = ((leaderWins - profile.wins) + (profile.losses - leaderLosses)) / 2

      return {
        rank: rankByTeam.get(profile.team) ?? 999,
        team: profile.team,
        displayTeam: getDisplayTeamCode(normalizedTeam),
        wins: profile.wins,
        losses: profile.losses,
        pct: formatWinningPct(profile.wins, profile.losses),
        gb: gamesBack <= 0 ? '-' : (Number.isInteger(gamesBack) ? String(gamesBack) : gamesBack.toFixed(1)),
        homeRecord: `${homeWins}-${homeLosses}`,
        awayRecord: `${awayWins}-${awayLosses}`,
      }
    })
    .sort((a, b) => a.rank - b.rank)
}

export default function LeagueHub({ block, season }: Props) {
  const navigate = useNavigate()
  const standings = buildOverallStandings(block)

  return (
    <section className="space-y-6">
      <div className="app-panel p-6">
        <div className="ui-section-header">
          <div>
            <p className="ui-section-eyebrow">League</p>
            <h2
              className="mt-1 text-[32px] text-slate-950"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Current Standings
            </h2>
          </div>
          <div className="text-xs text-slate-400">{season} regular season</div>
        </div>
      </div>

      <div className="app-panel p-5">
        <div className="overflow-x-auto rounded-[22px] border border-slate-200 bg-white">
          <div className="grid grid-cols-[36px_1fr_48px_48px_56px_56px_64px_64px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 min-w-min">
            <div>Rk</div>
            <div>Team</div>
            <div>W</div>
            <div>L</div>
            <div>Pct</div>
            <div>GB</div>
            <div>Home</div>
            <div>Away</div>
          </div>

          <div className="divide-y divide-slate-100">
            {standings.map(entry => (
              <button
                key={entry.team}
                type="button"
                onClick={() => {
                  navigate(`/teams?team=${encodeURIComponent(entry.team)}`)
                  if (typeof window !== 'undefined') {
                    window.requestAnimationFrame(() => {
                      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
                    })
                  }
                }}
                className="ui-click-row group grid w-full grid-cols-[36px_1fr_48px_48px_56px_56px_64px_64px] gap-3 px-4 py-3 items-center text-left text-sm min-w-min"
                title={`Open ${entry.displayTeam} team outlook`}
              >
                <div className="font-semibold text-slate-400 text-center">{entry.rank}</div>
                <div className="font-semibold text-slate-950 min-w-0 underline-offset-4 group-hover:underline">{entry.displayTeam}</div>
                <div className="text-center text-slate-700">{entry.wins}</div>
                <div className="text-center text-slate-700">{entry.losses}</div>
                <div className="text-center text-slate-700 font-medium">{entry.pct}</div>
                <div className="text-center text-slate-700">{entry.gb}</div>
                <div className="text-center text-slate-600 text-xs">{entry.homeRecord}</div>
                <div className="text-center text-slate-600 text-xs">{entry.awayRecord}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
