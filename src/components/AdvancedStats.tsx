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

    // Best and worst game
    const sorted = [...games].sort((a, b) => {
      const scoreA = a.pts + 0.4 * a.fgm - 0.7 * a.fga + 0.7 * a.reb + a.ast + a.stl + a.blk - a.tov
      const scoreB = b.pts + 0.4 * b.fgm - 0.7 * b.fga + 0.7 * b.reb + b.ast + b.stl + b.blk - b.tov
      return scoreB - scoreA
    })

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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <MetricCard label="True Shooting" value={`${ts.toFixed(1)}%`} desc="Accounts for 2s, 3s, and FTs" color={teamColor.primary} benchmark={leagueAvg.fg_pct * 100 + 5} actual={ts} />
            <MetricCard label="Effective FG" value={`${efg.toFixed(1)}%`} desc="3-pointers weighted at 1.5x" color={teamColor.primary} />
            <MetricCard label="Points/Shot" value={pps.toFixed(2)} desc="Scoring output per attempt" color={teamColor.primary} />
            <MetricCard label="Game Score" value={gameScore.toFixed(1)} desc="Overall per-game impact" color={teamColor.primary} />
            <MetricCard label="AST/TO" value={astTov.toFixed(2)} desc="Ball security ratio" color={teamColor.primary} />
            <MetricCard label="Usage" value={usage.toFixed(1)} desc="Possessions per 40 min" color={teamColor.primary} />
            <MetricCard label="FT Rate" value={`${ftr.toFixed(0)}%`} desc="Gets to the line" color={teamColor.primary} />
            <MetricCard label="3PT Rate" value={`${tpar.toFixed(0)}%`} desc="Shot selection from deep" color={teamColor.primary} />
            <MetricCard label="TOV Rate" value={`${tovRate.toFixed(1)}%`} desc="Turnovers per possession" color={teamColor.primary} invertColor />
          </div>
        </div>
      )}

      {/* === SPLITS TAB === */}
      {tab === 'splits' && splits && (
        <div className="space-y-5">
          {/* Home vs Away */}
          <div>
            <div className="text-[12px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Home vs Away</div>
            <div className="grid grid-cols-2 gap-3">
              <SplitCard
                label={`Home (${splits.homeGames.length} G)`}
                games={splits.homeGames}
                color={teamColor.primary}
                highlight={avg(splits.homeGames.map(g => g.pts)) >= avg(splits.awayGames.map(g => g.pts))}
              />
              <SplitCard
                label={`Away (${splits.awayGames.length} G)`}
                games={splits.awayGames}
                color={teamColor.primary}
                highlight={avg(splits.awayGames.map(g => g.pts)) > avg(splits.homeGames.map(g => g.pts))}
              />
            </div>
          </div>

          {/* Wins vs Losses */}
          <div>
            <div className="text-[12px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Wins vs Losses</div>
            <div className="grid grid-cols-2 gap-3">
              <SplitCard
                label={`Wins (${splits.wins.length})`}
                games={splits.wins}
                color="#16a34a"
                highlight={splits.wins.length > 0}
              />
              <SplitCard
                label={`Losses (${splits.losses.length})`}
                games={splits.losses}
                color="#dc2626"
                highlight={false}
              />
            </div>
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
            <div className="text-[12px] text-amber-800 font-medium">
              {(() => {
                const winPts = avg(games.filter(g => g.wl === 'W').map(g => g.pts))
                const lossPts = avg(games.filter(g => g.wl === 'L').map(g => g.pts))
                const diff = winPts - lossPts
                if (games.filter(g => g.wl === 'W').length === 0) return `Averaging ${player.pts.toFixed(1)} PPG across ${games.length} games this season.`
                if (diff > 5) return `Scores ${diff.toFixed(0)} more PPG in wins — production directly correlates with team success.`
                if (diff > 0) return `Slightly higher output in wins (+${diff.toFixed(1)} PPG) — consistent regardless of outcome.`
                return `Actually scores more in losses — team may depend too heavily on this player when behind.`
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
  const aboveBench = benchmark !== undefined && actual !== undefined && actual > benchmark
  return (
    <div className="group relative rounded-xl bg-slate-50 p-3 hover:bg-slate-100 transition-colors">
      <div className="text-xl font-bold tracking-tight" style={{ color: invertColor ? '#dc2626' : color }}>
        {value}
      </div>
      <div className="text-[11px] font-medium text-slate-600 mt-0.5">{label}</div>
      {benchmark !== undefined && (
        <div className={`text-[10px] mt-1 font-medium ${aboveBench ? 'text-green-600' : 'text-slate-400'}`}>
          {aboveBench ? '↑ Above' : '↓ Below'} league avg
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

function SplitCard({ label, games, color, highlight }: { label: string; games: GameLog[]; color: string; highlight: boolean }) {
  if (games.length === 0) return (
    <div className="rounded-xl border border-slate-100 p-3 opacity-50">
      <div className="text-[12px] text-slate-500 font-medium">{label}</div>
      <div className="text-[12px] text-slate-400 mt-1 italic">No games</div>
    </div>
  )
  return (
    <div className="rounded-xl p-3 transition-all" style={{ border: `1.5px solid ${highlight ? color : '#e2e8f0'}`, background: highlight ? `${color}08` : 'white' }}>
      <div className="text-[12px] font-medium mb-2" style={{ color: highlight ? color : '#64748b' }}>{label}</div>
      <div className="text-2xl font-bold" style={{ color }}>{avg(games.map(g => g.pts)).toFixed(1)}</div>
      <div className="text-[10px] text-slate-400 mb-1.5">PPG</div>
      <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
        <span>{avg(games.map(g => g.reb)).toFixed(1)} REB</span>
        <span>{avg(games.map(g => g.ast)).toFixed(1)} AST</span>
        <span>{(avg(games.map(g => g.fg_pct)) * 100).toFixed(0)}% FG</span>
        <span>{avg(games.map(g => g.plus_minus)) >= 0 ? '+' : ''}{avg(games.map(g => g.plus_minus)).toFixed(0)} +/-</span>
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
