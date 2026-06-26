import type { SeasonBlock } from '../types'
import { buildTeamProfiles } from '../utils/teamPrediction'

interface Props {
  block: SeasonBlock | null
  season: string
}

type ConferenceName = 'Eastern Conference' | 'Western Conference'

type StandingsRow = {
  team: string
  displayTeam: string
  wins: number
  losses: number
  pct: string
  gb: string
  conference?: ConferenceName
  overallRank?: number
}

const CONFERENCE_BY_TEAM: Record<string, ConferenceName> = {
  ATL: 'Eastern Conference',
  CHI: 'Eastern Conference',
  CON: 'Eastern Conference',
  IND: 'Eastern Conference',
  NYL: 'Eastern Conference',
  TOR: 'Eastern Conference',
  WAS: 'Eastern Conference',
  DAL: 'Western Conference',
  GS: 'Western Conference',
  GSV: 'Western Conference',
  LAS: 'Western Conference',
  LVA: 'Western Conference',
  MIN: 'Western Conference',
  PDX: 'Western Conference',
  POR: 'Western Conference',
  PHX: 'Western Conference',
  SEA: 'Western Conference',
}

function normalizeTeamCode(team: string) {
  if (team === 'POR') return 'PDX'
  return team
}

function formatWinningPct(wins: number, losses: number) {
  const totalGames = wins + losses
  if (totalGames === 0) return '.000'
  const pct = (wins / totalGames).toFixed(3)
  return pct.startsWith('0') ? pct.slice(1) : pct
}

function formatGamesBack(teamWins: number, teamLosses: number, leaderWins: number, leaderLosses: number) {
  const gamesBack = ((leaderWins - teamWins) + (teamLosses - leaderLosses)) / 2
  if (gamesBack <= 0) return '-'
  return Number.isInteger(gamesBack) ? String(gamesBack) : gamesBack.toFixed(1)
}

function buildConferenceStandings(block: SeasonBlock | null) {
  if (!block) return []

  const profiles = buildTeamProfiles(block)
  const grouped = new Map<ConferenceName, StandingsRow[]>()

  profiles.forEach(profile => {
    const normalizedTeam = normalizeTeamCode(profile.team)
    const conference = CONFERENCE_BY_TEAM[normalizedTeam]
    if (!conference) return

    if (!grouped.has(conference)) {
      grouped.set(conference, [])
    }

    grouped.get(conference)!.push({
      team: profile.team,
      displayTeam: normalizedTeam,
      wins: profile.wins,
      losses: profile.losses,
      pct: formatWinningPct(profile.wins, profile.losses),
      gb: '-',
    })
  })

  const allRows = Array.from(grouped.values()).flat()
  const overallRanking = [...allRows].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    if (a.losses !== b.losses) return a.losses - b.losses
    return a.displayTeam.localeCompare(b.displayTeam)
  })
  const rankByTeam = new Map(overallRanking.map((row, index) => [row.team, index + 1]))

  return (['Eastern Conference', 'Western Conference'] as const)
    .map(conference => {
      const rows = [...(grouped.get(conference) ?? [])].sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins
        if (a.losses !== b.losses) return a.losses - b.losses
        return a.displayTeam.localeCompare(b.displayTeam)
      })

      const leader = rows[0]
      const entries = leader
        ? rows.map(row => ({
            ...row,
            overallRank: rankByTeam.get(row.team) ?? undefined,
            gb: formatGamesBack(row.wins, row.losses, leader.wins, leader.losses),
          }))
        : rows.map(row => ({
            ...row,
            overallRank: rankByTeam.get(row.team) ?? undefined,
          }))

      return {
        conference,
        entries,
      }
    })
    .filter(group => group.entries.length > 0)
}

export default function LeagueHub({ block, season }: Props) {
  const conferenceStandings = buildConferenceStandings(block)

  return (
    <section className="space-y-6">
      <div className="app-panel p-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400 font-semibold">League</p>
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {conferenceStandings.map(group => (
          <div key={group.conference} className="app-panel p-5">
            <div className="text-[12px] uppercase tracking-[0.16em] font-semibold text-slate-500">
              {group.conference}
            </div>

            <div className="mt-4 overflow-hidden rounded-[22px] border border-slate-200 bg-white">
              <div className="grid grid-cols-[48px_1fr_52px_52px_68px_52px] gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                <div>Rk</div>
                <div>Team</div>
                <div>W</div>
                <div>L</div>
                <div>PCT</div>
                <div>GB</div>
              </div>

              <div className="divide-y divide-slate-100">
                {group.entries.map(entry => (
                  <div
                    key={entry.team}
                    className="grid grid-cols-[48px_1fr_52px_52px_68px_52px] gap-2 px-4 py-3 text-sm text-slate-700"
                  >
                    <div className="font-semibold text-slate-400">{entry.overallRank ?? '-'}</div>
                    <div className="font-semibold text-slate-950">{entry.displayTeam}</div>
                    <div>{entry.wins}</div>
                    <div>{entry.losses}</div>
                    <div>{entry.pct}</div>
                    <div>{entry.gb}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
