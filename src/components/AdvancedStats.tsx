import type { LeaguePlayer, GameLog, LeagueAverages } from '../types'

interface Props {
  player: LeaguePlayer
  games: GameLog[]
  teamColor: { primary: string }
  leagueAvg: LeagueAverages
}

interface Metric {
  label: string
  value: string
  description: string
  percentile?: number // 0-100, relative to league
}

export default function AdvancedStats({ player, games, teamColor, leagueAvg }: Props) {
  // True Shooting % = PTS / (2 * (FGA + 0.44 * FTA))
  const tsa = 2 * (player.fga + 0.44 * player.fta)
  const ts = tsa > 0 ? (player.pts / tsa) * 100 : 0

  // Effective FG% = (FGM + 0.5 * FG3M) / FGA
  const efg = player.fga > 0 ? ((player.fgm + 0.5 * player.fg3m) / player.fga) * 100 : 0

  // Points Per Shot
  const pps = player.fga > 0 ? player.pts / player.fga : 0

  // Free Throw Rate = FTA / FGA
  const ftr = player.fga > 0 ? (player.fta / player.fga) * 100 : 0

  // 3-Point Attempt Rate = FG3A / FGA
  const tpar = player.fga > 0 ? (player.fg3a / player.fga) * 100 : 0

  // Assist-to-Turnover Ratio
  const astTov = player.tov > 0 ? player.ast / player.tov : player.ast

  // Turnover Rate = TOV / (FGA + 0.44*FTA + TOV)
  const possessions = player.fga + 0.44 * player.fta + player.tov
  const tovRate = possessions > 0 ? (player.tov / possessions) * 100 : 0

  // Stocks (Steals + Blocks per game)
  const stocks = player.stl + player.blk

  // Game Score = PTS + 0.4*FGM - 0.7*FGA - 0.4*(FTA-FTM) + 0.7*OREB + 0.3*DREB + STL + 0.7*AST + 0.7*BLK - 0.4*PF - TOV
  const gameScore = player.pts + 0.4 * player.fgm - 0.7 * player.fga
    - 0.4 * (player.fta - player.ftm) + 0.7 * player.oreb + 0.3 * player.dreb
    + player.stl + 0.7 * player.ast + 0.7 * player.blk - 0.4 * player.pf - player.tov

  // Scoring consistency (std deviation from game logs)
  let consistency = 0
  if (games.length >= 3) {
    const mean = games.reduce((s, g) => s + g.pts, 0) / games.length
    const variance = games.reduce((s, g) => s + (g.pts - mean) ** 2, 0) / games.length
    consistency = Math.sqrt(variance)
  }

  // Usage estimate = (FGA + 0.44*FTA + TOV) * 40 / MIN (per 40 min rate relative to possessions used)
  const usage = player.min > 0 ? (possessions / player.min) * 40 : 0

  // Rebound split
  const orebPct = (player.oreb + player.dreb) > 0 ? (player.oreb / (player.oreb + player.dreb)) * 100 : 0

  // Approximate league TS% from league FG%
  const leagueTs = leagueAvg.fg_pct * 100 + 5 // rough estimate (TS% is typically ~5-8 points above FG%)

  const metrics: Metric[] = [
    { label: 'TS%', value: `${ts.toFixed(1)}%`, description: 'True Shooting — accounts for FTs and 3s', percentile: Math.min(100, Math.max(0, ((ts - leagueTs) / 8) * 50 + 50)) },
    { label: 'eFG%', value: `${efg.toFixed(1)}%`, description: 'Effective FG — weights 3-pointers at 1.5x' },
    { label: 'PPS', value: pps.toFixed(2), description: 'Points produced per field goal attempt' },
    { label: 'USG', value: usage.toFixed(1), description: 'Possessions used per 40 minutes played' },
    { label: 'Game Score', value: gameScore.toFixed(1), description: 'Holistic per-game impact rating' },
    { label: 'AST/TO', value: astTov.toFixed(2), description: 'Ball security — assists per turnover' },
    { label: 'TOV%', value: `${tovRate.toFixed(1)}%`, description: 'Turnover rate per possession used' },
    { label: 'FT Rate', value: `${ftr.toFixed(0)}%`, description: 'Free throw attempts per field goal attempt' },
    { label: '3PA Rate', value: `${tpar.toFixed(0)}%`, description: 'Share of shots taken from three' },
    { label: 'Stocks', value: stocks.toFixed(1), description: 'Combined steals + blocks per game' },
    { label: 'OREB%', value: `${orebPct.toFixed(0)}%`, description: 'Offensive share of total rebounds' },
    { label: 'Consistency', value: games.length >= 3 ? `±${consistency.toFixed(1)}` : '—', description: 'Scoring standard deviation (lower = more consistent)' },
  ]

  return (
    <div className="rounded-2xl p-6 bg-white" style={{ border: `1px solid ${teamColor.primary}15` }}>
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-lg font-semibold text-slate-800" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
          Advanced Analytics
        </h3>
        <span className="text-xs text-slate-400">Per-game averages</span>
      </div>
      <p className="text-[12px] text-slate-400 mb-5">Efficiency & impact metrics beyond the box score</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-4">
        {metrics.map(m => (
          <div key={m.label} className="group relative">
            <div className="text-[22px] font-semibold tracking-tight" style={{ color: teamColor.primary, fontFamily: "'Inter', sans-serif" }}>
              {m.value}
            </div>
            <div className="text-[12px] font-medium text-slate-600 mt-0.5">{m.label}</div>
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50 pointer-events-none">
              <div className="bg-slate-900 text-white text-[11px] rounded-lg px-3 py-2 shadow-xl max-w-[180px] leading-relaxed">
                {m.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
