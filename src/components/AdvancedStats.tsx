import { useState, useMemo } from 'react'
import type { LeaguePlayer, GameLog, LeagueAverages } from '../types'

interface Props {
  player: LeaguePlayer
  games: GameLog[]
  teamColor: { primary: string }
  leagueAvg: LeagueAverages
}

type Tab = 'efficiency' | 'splits' | 'tendencies'

function avg(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

function parseOpponent(matchup: string): string {
  // "LVA vs. LAS" or "LVA @ ATL" → opponent abbreviation
  const parts = matchup.split(/\s+(?:vs\.|@)\s+/)
  return parts[1] ?? matchup
}

function isHome(matchup: string): boolean {
  return matchup.includes('vs.')
}

export default function AdvancedStats({ player, games, teamColor, leagueAvg }: Props) {
  const [tab, setTab] = useState<Tab>('efficiency')

  // === Efficiency metrics (compact row) ===
  const tsa = 2 * (player.fga + 0.44 * player.fta)
  const ts = tsa > 0 ? (player.pts / tsa) * 100 : 0
  const efg = player.fga > 0 ? ((player.fgm + 0.5 * player.fg3m) / player.fga) * 100 : 0
  const gameScore = player.pts + 0.4 * player.fgm - 0.7 * player.fga
    - 0.4 * (player.fta - player.ftm) + 0.7 * player.oreb + 0.3 * player.dreb
    + player.stl + 0.7 * player.ast + 0.7 * player.blk - 0.4 * player.pf - player.tov
  const astTov = player.tov > 0 ? player.ast / player.tov : player.ast
  const possessions = player.fga + 0.44 * player.fta + player.tov
  const usage = player.min > 0 ? (possessions / player.min) * 40 : 0
  const pps = player.fga > 0 ? player.pts / player.fga : 0
  const ftr = player.fga > 0 ? (player.fta / player.fga) * 100 : 0
  const tpar = player.fga > 0 ? (player.fg3a / player.fga) * 100 : 0
  const tovRate = possessions > 0 ? (player.tov / possessions) * 100 : 0

  // === Splits data ===
  const splits = useMemo(() => {
    if (games.length === 0) return null

    const homeGames = games.filter(g => isHome(g.matchup))
    const awayGames = games.filter(g => !isHome(g.matchup))
    const wins = games.filter(g => g.wl === 'W')
    const losses = games.filter(g => g.wl === 'L')

    // Per opponent
    const byOpp: Record<string, GameLog[]> = {}
    for (const g of games) {
      const opp = parseOpponent(g.matchup)
      if (!byOpp[opp]) byOpp[opp] = []
      byOpp[opp].push(g)
    }

    const oppSplits = Object.entries(byOpp)
      .map(([opp, gs]) => ({
        opp,
        games: gs.length,
        pts: avg(gs.map(g => g.pts)),
        reb: avg(gs.map(g => g.reb)),
        ast: avg(gs.map(g => g.ast)),
        fg_pct: avg(gs.map(g => g.fg_pct)),
        plus_minus: avg(gs.map(g => g.plus_minus)),
        record: `${gs.filter(g => g.wl === 'W').length}-${gs.filter(g => g.wl === 'L').length}`,
      }))
      .sort((a, b) => b.pts - a.pts)

    return { homeGames, awayGames, wins, losses, oppSplits }
  }, [games])

  // === Tendencies (correlations) ===
  const tendencies = useMemo(() => {
    if (games.length < 3) return null

    const avgPts = avg(games.map(g => g.pts))
    const highScoring = games.filter(g => g.pts >= avgPts)
    const lowScoring = games.filter(g => g.pts < avgPts)

    // Best and worst game — Impact Rating
    // Weights raw production heavily (points dominate), with assists/boards secondary,
    // and defense/efficiency as context. Efficiency bonus only kicks in at 5+ FGA
    // so low-volume games don't get inflated by shooting 2/3.
    const gameRating = (g: GameLog) =>
      g.pts
      + g.reb * 0.8
      + g.ast * 1.2
      + g.stl * 1.0
      + g.blk * 1.0
      - g.tov * 0.8
      + (g.fga >= 5 ? (g.fg_pct - 0.40) * 5 : 0)
      + g.plus_minus * 0.15

    const sorted = [...games].sort((a, b) => gameRating(b) - gameRating(a))

    return { avgPts, highScoring, lowScoring, best: sorted[0], worst: sorted[sorted.length - 1] }
  }, [games])

  const tabStyle = (t: Tab) => ({
    color: tab === t ? '#fff' : '#64748b',
    background: tab === t ? teamColor.primary : 'transparent',
    fontWeight: tab === t ? 600 : 400,
  })

  return (
    <div className="rounded-2xl p-6 bg-white" style={{ border: `1px solid ${teamColor.primary}15` }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="text-lg font-semibold text-slate-800" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
          Player Insights
        </h3>
        <div className="flex rounded-lg overflow-hidden border border-slate-200 text-[12px]">
          <button onClick={() => setTab('efficiency')} className="px-3 py-1.5 transition-all" style={tabStyle('efficiency')}>Efficiency</button>
          <button onClick={() => setTab('splits')} className="px-3 py-1.5 transition-all" style={tabStyle('splits')}>Game Splits</button>
          <button onClick={() => setTab('tendencies')} className="px-3 py-1.5 transition-all" style={tabStyle('tendencies')}>Tendencies</button>
        </div>
      </div>

      {/* === EFFICIENCY TAB === */}
      {tab === 'efficiency' && (
        <div>
          <p className="text-[12px] text-slate-400 mb-4">How efficiently does this player score and create?</p>
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="True Shooting" value={`${ts.toFixed(1)}%`} desc="Accounts for 2s, 3s, and FTs" color={teamColor.primary} benchmark={leagueAvg.fg_pct * 100 + 5} actual={ts} />
            <MetricCard label="Effective FG" value={`${efg.toFixed(1)}%`} desc="3-pointers weighted at 1.5x" color={teamColor.primary} benchmark={leagueAvg.fg_pct * 100 + 3} actual={efg} />
            <MetricCard label="Points/Shot" value={pps.toFixed(2)} desc="Scoring output per attempt" color={teamColor.primary} benchmark={1.0} actual={pps} />
            <MetricCard label="Game Score" value={gameScore.toFixed(1)} desc="Overall per-game impact" color={teamColor.primary} benchmark={10} actual={gameScore} />
            <MetricCard label="AST/TO" value={astTov.toFixed(2)} desc="Ball security ratio" color={teamColor.primary} benchmark={1.5} actual={astTov} />
            <MetricCard label="Usage" value={usage.toFixed(1)} desc="Possessions per 40 min" color={teamColor.primary} benchmark={18} actual={usage} />
            <MetricCard label="FT Rate" value={`${ftr.toFixed(0)}%`} desc="Gets to the line" color={teamColor.primary} benchmark={25} actual={ftr} />
            <MetricCard label="3PT Rate" value={`${tpar.toFixed(0)}%`} desc="Shot selection from deep" color={teamColor.primary} benchmark={leagueAvg.fg3_pct > 0 ? 35 : 30} actual={tpar} />
            <MetricCard label="TOV Rate" value={`${tovRate.toFixed(1)}%`} desc="Turnovers per possession" color={teamColor.primary} benchmark={14} actual={tovRate} invertColor />
          </div>
        </div>
      )}

      {/* === SPLITS TAB === */}
      {tab === 'splits' && splits && (
        <div className="space-y-5">
          {/* Home vs Away */}
          <div>
            <div className="text-[12px] text-slate-500 font-semibold uppercase tracking-wider mb-3">Home vs Away</div>
            <SplitComparison
              leftLabel={`Home (${splits.homeGames.length}G)`}
              rightLabel={`Away (${splits.awayGames.length}G)`}
              leftGames={splits.homeGames}
              rightGames={splits.awayGames}
              color={teamColor.primary}
            />
          </div>

          {/* Wins vs Losses */}
          <div>
            <div className="text-[12px] text-slate-500 font-semibold uppercase tracking-wider mb-3">Wins vs Losses</div>
            <SplitComparison
              leftLabel={`Wins (${splits.wins.length})`}
              rightLabel={`Losses (${splits.losses.length})`}
              leftGames={splits.wins}
              rightGames={splits.losses}
              color={teamColor.primary}
            />
          </div>

          {/* By Opponent */}
          {splits.oppSplits.length > 1 && (
            <div>
              <div className="text-[12px] text-slate-500 font-semibold uppercase tracking-wider mb-2">By Opponent</div>
              <div className="space-y-1.5">
                {splits.oppSplits.map(o => (
                  <div key={o.opp} className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-slate-50">
                    <span className="text-[13px] font-bold text-slate-700 w-[40px]">{o.opp}</span>
                    <span className="text-[11px] text-slate-400 w-[30px]">{o.record}</span>
                    <div className="flex-1 flex items-center gap-4">
                      <StatPill label="PTS" value={o.pts.toFixed(1)} color={teamColor.primary} />
                      <StatPill label="REB" value={o.reb.toFixed(1)} color={teamColor.primary} />
                      <StatPill label="AST" value={o.ast.toFixed(1)} color={teamColor.primary} />
                      <StatPill label="FG" value={`${(o.fg_pct * 100).toFixed(0)}%`} color={teamColor.primary} />
                    </div>
                    <span className={`text-[12px] font-bold ${o.plus_minus >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {o.plus_minus >= 0 ? '+' : ''}{o.plus_minus.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {games.length === 0 && (
            <p className="text-sm text-slate-400 italic">No game log data available for splits</p>
          )}
        </div>
      )}

      {tab === 'splits' && !splits && (
        <p className="text-sm text-slate-400 italic py-4">No game log data available for this player</p>
      )}

      {/* === TENDENCIES TAB === */}
      {tab === 'tendencies' && tendencies && (
        <div className="space-y-5">
          {/* When scoring is up/down */}
          <div>
            <div className="text-[12px] text-slate-500 font-semibold uppercase tracking-wider mb-2">
              When Scoring Above Average ({tendencies.avgPts.toFixed(0)}+ PTS)
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-green-50 border border-green-100 p-3">
                <div className="text-[11px] text-green-700 font-medium mb-1.5">High-scoring games ({tendencies.highScoring.length})</div>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div><span className="text-slate-500">PTS: </span><span className="font-semibold text-slate-800">{avg(tendencies.highScoring.map(g => g.pts)).toFixed(1)}</span></div>
                  <div><span className="text-slate-500">AST: </span><span className="font-semibold text-slate-800">{avg(tendencies.highScoring.map(g => g.ast)).toFixed(1)}</span></div>
                  <div><span className="text-slate-500">REB: </span><span className="font-semibold text-slate-800">{avg(tendencies.highScoring.map(g => g.reb)).toFixed(1)}</span></div>
                  <div><span className="text-slate-500">FG%: </span><span className="font-semibold text-slate-800">{(avg(tendencies.highScoring.map(g => g.fg_pct)) * 100).toFixed(0)}%</span></div>
                  <div><span className="text-slate-500">TOV: </span><span className="font-semibold text-slate-800">{avg(tendencies.highScoring.map(g => g.tov)).toFixed(1)}</span></div>
                  <div><span className="text-slate-500">+/-: </span><span className="font-semibold text-green-700">{avg(tendencies.highScoring.map(g => g.plus_minus)) >= 0 ? '+' : ''}{avg(tendencies.highScoring.map(g => g.plus_minus)).toFixed(0)}</span></div>
                </div>
              </div>
              <div className="rounded-xl bg-red-50 border border-red-100 p-3">
                <div className="text-[11px] text-red-700 font-medium mb-1.5">Low-scoring games ({tendencies.lowScoring.length})</div>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div><span className="text-slate-500">PTS: </span><span className="font-semibold text-slate-800">{avg(tendencies.lowScoring.map(g => g.pts)).toFixed(1)}</span></div>
                  <div><span className="text-slate-500">AST: </span><span className="font-semibold text-slate-800">{avg(tendencies.lowScoring.map(g => g.ast)).toFixed(1)}</span></div>
                  <div><span className="text-slate-500">REB: </span><span className="font-semibold text-slate-800">{avg(tendencies.lowScoring.map(g => g.reb)).toFixed(1)}</span></div>
                  <div><span className="text-slate-500">FG%: </span><span className="font-semibold text-slate-800">{(avg(tendencies.lowScoring.map(g => g.fg_pct)) * 100).toFixed(0)}%</span></div>
                  <div><span className="text-slate-500">TOV: </span><span className="font-semibold text-slate-800">{avg(tendencies.lowScoring.map(g => g.tov)).toFixed(1)}</span></div>
                  <div><span className="text-slate-500">+/-: </span><span className="font-semibold text-red-600">{avg(tendencies.lowScoring.map(g => g.plus_minus)) >= 0 ? '+' : ''}{avg(tendencies.lowScoring.map(g => g.plus_minus)).toFixed(0)}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Best & Worst game */}
          <div>
            <div className="text-[12px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Season Highlights</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tendencies.best && (
                <div className="rounded-xl border border-slate-100 p-3 bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-green-700 uppercase">Best Game</span>
                    <span className="text-[11px] text-slate-400">{tendencies.best.matchup} · {tendencies.best.wl}</span>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: teamColor.primary }}>{tendencies.best.pts} PTS</div>
                  <div className="text-[12px] text-slate-500 mt-1">
                    {tendencies.best.reb} REB · {tendencies.best.ast} AST · {tendencies.best.fgm}/{tendencies.best.fga} FG · {tendencies.best.stl} STL · {tendencies.best.blk} BLK
                  </div>
                </div>
              )}
              {tendencies.worst && (
                <div className="rounded-xl border border-slate-100 p-3 bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-red-600 uppercase">Toughest Game</span>
                    <span className="text-[11px] text-slate-400">{tendencies.worst.matchup} · {tendencies.worst.wl}</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-600">{tendencies.worst.pts} PTS</div>
                  <div className="text-[12px] text-slate-500 mt-1">
                    {tendencies.worst.reb} REB · {tendencies.worst.ast} AST · {tendencies.worst.fgm}/{tendencies.worst.fga} FG · {tendencies.worst.stl} STL · {tendencies.worst.blk} BLK
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Insight callout */}
          <div className="rounded-xl p-3 border border-amber-200 bg-amber-50">
            <div className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider mb-1">Coach's Insight</div>
            <div className="text-[12px] text-amber-800 font-medium leading-relaxed">
              {(() => {
                const insights: string[] = []

                // 1. Win correlation: scoring jump in wins vs losses
                const winGames = games.filter(g => g.wl === 'W')
                const lossGames = games.filter(g => g.wl === 'L')
                if (winGames.length > 0 && lossGames.length > 0) {
                  const winAst = avg(winGames.map(g => g.ast))
                  const lossAst = avg(lossGames.map(g => g.ast))
                  const winTov = avg(winGames.map(g => g.tov))
                  const lossTov = avg(lossGames.map(g => g.tov))
                  const winFg = avg(winGames.map(g => g.fg_pct))
                  const lossFg = avg(lossGames.map(g => g.fg_pct))

                  // Playmaking difference in wins
                  if (winAst - lossAst > 1.5) {
                    insights.push(`Averages ${(winAst - lossAst).toFixed(1)} more AST in wins — team wins when this player facilitates.`)
                  }
                  // Ball security in wins
                  if (lossTov - winTov > 1.0) {
                    insights.push(`Commits ${(lossTov - winTov).toFixed(1)} fewer TOV in wins — ball security is the strongest predictor of team outcome.`)
                  }
                  // Efficiency difference
                  if ((winFg - lossFg) * 100 > 8) {
                    insights.push(`Shoots ${((winFg - lossFg) * 100).toFixed(0)}% higher FG in wins — shot selection/quality directly drives wins.`)
                  }
                }

                // 2. Home/away differential
                const homeGames = games.filter(g => g.matchup.includes('vs.'))
                const awayGames = games.filter(g => !g.matchup.includes('vs.'))
                if (homeGames.length > 2 && awayGames.length > 2) {
                  const homePts = avg(homeGames.map(g => g.pts))
                  const awayPts = avg(awayGames.map(g => g.pts))
                  if (Math.abs(homePts - awayPts) > 4) {
                    insights.push(homePts > awayPts
                      ? `Scores ${(homePts - awayPts).toFixed(1)} more PPG at home — leverage home games for aggressive play calls.`
                      : `Actually scores ${(awayPts - homePts).toFixed(1)} more PPG on the road — performs better without home crowd pressure.`)
                  }
                }

                // 3. Hot/cold streak detection (last 5 vs prior games)
                if (games.length >= 8) {
                  const recent5 = games.slice(0, 5)
                  const prior = games.slice(5)
                  const recentPts = avg(recent5.map(g => g.pts))
                  const priorPts = avg(prior.map(g => g.pts))
                  const delta = recentPts - priorPts
                  if (delta > 4) {
                    insights.push(`Trending UP: last 5 games averaging ${recentPts.toFixed(1)} PPG vs ${priorPts.toFixed(1)} earlier — riding a hot streak.`)
                  } else if (delta < -4) {
                    insights.push(`Trending DOWN: last 5 games averaging ${recentPts.toFixed(1)} PPG vs ${priorPts.toFixed(1)} earlier — may need adjusted role or rest.`)
                  }
                }

                // 4. Usage efficiency: high assist games correlate with wins?
                if (games.length >= 5) {
                  const highAstGames = games.filter(g => g.ast >= player.ast)
                  const highAstWinPct = highAstGames.length > 0 ? highAstGames.filter(g => g.wl === 'W').length / highAstGames.length : 0
                  const overallWinPct = games.filter(g => g.wl === 'W').length / games.length
                  if (highAstWinPct - overallWinPct > 0.15 && highAstGames.length >= 3) {
                    insights.push(`Team wins ${((highAstWinPct) * 100).toFixed(0)}% of games when this player has ${player.ast.toFixed(0)}+ AST — prioritize playmaking in game plan.`)
                  }
                }

                // 5. Fourth quarter performer
                // (can't compute from game log but can detect FT rate correlation with wins)
                if (winGames.length > 0 && lossGames.length > 0) {
                  const winFta = avg(winGames.map(g => g.fta))
                  const lossFta = avg(lossGames.map(g => g.fta))
                  if (winFta - lossFta > 2) {
                    insights.push(`Draws ${(winFta - lossFta).toFixed(1)} more FTA in wins — attacking the rim aggressively correlates with team success.`)
                  }
                }

                // Pick the most interesting insight (first one is usually the most impactful)
                if (insights.length === 0) {
                  return `${player.name} averaging ${player.pts.toFixed(1)}/${player.reb.toFixed(1)}/${player.ast.toFixed(1)} across ${games.length} games — sample still building for deeper patterns.`
                }
                // Return top 1-2 insights
                return insights.slice(0, 2).join(' ')
              })()}
            </div>
          </div>
        </div>
      )}

      {tab === 'tendencies' && !tendencies && (
        <p className="text-sm text-slate-400 italic py-4">Need at least 3 games for tendency analysis</p>
      )}
    </div>
  )
}

// === Sub-components ===

function MetricCard({ label, value, desc, color, benchmark, actual, invertColor }: {
  label: string; value: string; desc: string; color: string; benchmark?: number; actual?: number; invertColor?: boolean
}) {
  // For inverted metrics (like TOV rate), below benchmark is good
  const isGood = benchmark !== undefined && actual !== undefined
    ? (invertColor ? actual < benchmark : actual > benchmark)
    : undefined
  return (
    <div className="group relative rounded-xl bg-slate-50 p-3 hover:bg-slate-100 transition-colors">
      <div className="text-xl font-bold tracking-tight" style={{ color: invertColor && isGood === false ? '#dc2626' : color }}>
        {value}
      </div>
      <div className="text-[11px] font-medium text-slate-600 mt-0.5">{label}</div>
      {isGood !== undefined && (
        <div className={`text-[10px] mt-1 font-medium ${isGood ? 'text-green-600' : 'text-orange-500'}`}>
          {isGood ? '▲ Above avg' : '▼ Below avg'}
        </div>
      )}
      <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50 pointer-events-none">
        <div className="bg-slate-900 text-white text-[11px] rounded-lg px-3 py-2 shadow-xl max-w-[160px] leading-relaxed whitespace-normal">
          {desc}
        </div>
      </div>
    </div>
  )
}

function SplitComparison({ leftLabel, rightLabel, leftGames, rightGames, color }: {
  leftLabel: string; rightLabel: string; leftGames: GameLog[]; rightGames: GameLog[]; color: string
}) {
  const stats = ['PTS', 'REB', 'AST', 'FG%', '+/-'] as const
  const getVal = (games: GameLog[], stat: typeof stats[number]) => {
    if (games.length === 0) return 0
    switch (stat) {
      case 'PTS': return avg(games.map(g => g.pts))
      case 'REB': return avg(games.map(g => g.reb))
      case 'AST': return avg(games.map(g => g.ast))
      case 'FG%': return avg(games.map(g => g.fg_pct)) * 100
      case '+/-': return avg(games.map(g => g.plus_minus))
    }
  }
  const fmt = (val: number, stat: typeof stats[number]) => {
    if (stat === 'FG%') return `${val.toFixed(0)}%`
    if (stat === '+/-') return `${val >= 0 ? '+' : ''}${val.toFixed(1)}`
    return val.toFixed(1)
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-bold text-slate-700">{leftLabel}</span>
        <span className="text-[11px] text-slate-400 font-medium">STAT</span>
        <span className="text-[13px] font-bold text-slate-700">{rightLabel}</span>
      </div>
      {/* Stat rows */}
      <div className="space-y-2.5">
        {stats.map(stat => {
          const lv = getVal(leftGames, stat)
          const rv = getVal(rightGames, stat)
          const leftWins = stat === '+/-' ? lv > rv : lv > rv
          const diff = Math.abs(lv - rv)
          const showDiff = leftGames.length > 0 && rightGames.length > 0 && diff > 0.1
          return (
            <div key={stat} className="flex items-center">
              <span className={`text-[15px] w-[52px] text-right font-bold ${leftWins ? 'text-slate-800' : 'text-slate-400'}`}>
                {leftGames.length > 0 ? fmt(lv, stat) : '—'}
              </span>
              <div className="flex-1 mx-3">
                <div className="flex items-center justify-center gap-1">
                  {showDiff && leftWins && <span className="text-[9px] text-green-600 font-bold">◀</span>}
                  <span className="text-[12px] font-semibold text-slate-500">{stat}</span>
                  {showDiff && !leftWins && <span className="text-[9px] text-green-600 font-bold">▶</span>}
                </div>
                {/* Bar visualization */}
                <div className="flex h-[4px] rounded-full overflow-hidden mt-1 bg-slate-200">
                  <div
                    className="h-full rounded-l-full transition-all"
                    style={{
                      width: lv + rv > 0 ? `${(lv / (lv + rv)) * 100}%` : '50%',
                      background: leftWins ? color : '#cbd5e1',
                    }}
                  />
                  <div
                    className="h-full rounded-r-full transition-all"
                    style={{
                      width: lv + rv > 0 ? `${(rv / (lv + rv)) * 100}%` : '50%',
                      background: !leftWins ? color : '#cbd5e1',
                    }}
                  />
                </div>
              </div>
              <span className={`text-[15px] w-[52px] font-bold ${!leftWins ? 'text-slate-800' : 'text-slate-400'}`}>
                {rightGames.length > 0 ? fmt(rv, stat) : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span className="text-[11px]">
      <span className="text-slate-400">{label} </span>
      <span className="font-semibold" style={{ color }}>{value}</span>
    </span>
  )
}
