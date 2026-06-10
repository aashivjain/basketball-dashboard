import type { LeaguePlayer } from '../types'

interface PlayerImpactEntry {
  score: number
  summary: string
}

interface PlayerImpactResult {
  averageScore: number
  byPlayerId: Record<number, PlayerImpactEntry>
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function weightedAverage(values: { value: number; weight: number }[]) {
  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0)
  return totalWeight > 0
    ? values.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight
    : 0
}

function zScore(value: number, mean: number, stdev: number) {
  if (!Number.isFinite(stdev) || stdev <= 1e-6) return 0
  return (value - mean) / stdev
}

function standardDeviation(values: number[], mean: number) {
  if (values.length < 2) return 0
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

export function buildPlayerImpactIndex(players: LeaguePlayer[]): PlayerImpactResult {
  if (!players.length) {
    return { averageScore: 50, byPlayerId: {} }
  }

  const leagueTotals = players.reduce(
    (totals, player) => {
      totals.pts += player.pts
      totals.fga += player.fga
      totals.fta += player.fta
      totals.fgm += player.fgm
      totals.fg3m += player.fg3m
      totals.ast += player.ast
      totals.tov += player.tov
      totals.reb += player.reb
      totals.stl += player.stl
      totals.blk += player.blk
      totals.oreb += player.oreb
      totals.dreb += player.dreb
      totals.plusMinus += player.plus_minus
      totals.minutes += player.gp * player.min
      return totals
    },
    { pts: 0, fga: 0, fta: 0, fgm: 0, fg3m: 0, ast: 0, tov: 0, reb: 0, stl: 0, blk: 0, oreb: 0, dreb: 0, plusMinus: 0, minutes: 0 }
  )

  const leagueTs = leagueTotals.fga + 0.44 * leagueTotals.fta > 0
    ? leagueTotals.pts / (2 * (leagueTotals.fga + 0.44 * leagueTotals.fta))
    : 0
  const leagueEfg = leagueTotals.fga > 0 ? (leagueTotals.fgm + 0.5 * leagueTotals.fg3m) / leagueTotals.fga : 0
  const leagueAstTov = leagueTotals.tov > 0 ? leagueTotals.ast / leagueTotals.tov : 1
  const leaguePlusMinus = average(players.map(player => player.plus_minus))

  const safePer36 = (value: number, minutes: number) => (minutes > 0 ? (value / minutes) * 36 : 0)
  const makeConfidence = (player: LeaguePlayer) => {
    const totalMinutes = player.gp * player.min
    return clamp(totalMinutes / 360, 0.18, 1)
  }

  const rawFeatures = players.map(player => {
    const minutes = Math.max(player.min, 0)
    const ts = player.fga + 0.44 * player.fta > 0 ? player.pts / (2 * (player.fga + 0.44 * player.fta)) : leagueTs
    const efg = player.fga > 0 ? (player.fgm + 0.5 * player.fg3m) / player.fga : leagueEfg
    const astTov = player.tov > 0 ? player.ast / player.tov : player.ast
    const possPer36 = safePer36(player.fga + 0.44 * player.fta + player.tov, minutes)
    const ptsPer36 = safePer36(player.pts, minutes)
    const astPer36 = safePer36(player.ast, minutes)
    const rebPer36 = safePer36(player.reb, minutes)
    const stlPer36 = safePer36(player.stl, minutes)
    const blkPer36 = safePer36(player.blk, minutes)
    const orebPer36 = safePer36(player.oreb, minutes)
    const drebPer36 = safePer36(player.dreb, minutes)
    const confidence = makeConfidence(player)

    return {
      player,
      confidence,
      ts,
      efg,
      astTov,
      possPer36,
      ptsPer36,
      astPer36,
      rebPer36,
      stlPer36,
      blkPer36,
      orebPer36,
      drebPer36,
    }
  })

  const leaguePer36 = {
    pts: weightedAverage(rawFeatures.map(item => ({ value: item.ptsPer36, weight: item.confidence }))),
    ast: weightedAverage(rawFeatures.map(item => ({ value: item.astPer36, weight: item.confidence }))),
    reb: weightedAverage(rawFeatures.map(item => ({ value: item.rebPer36, weight: item.confidence }))),
    stl: weightedAverage(rawFeatures.map(item => ({ value: item.stlPer36, weight: item.confidence }))),
    blk: weightedAverage(rawFeatures.map(item => ({ value: item.blkPer36, weight: item.confidence }))),
    oreb: weightedAverage(rawFeatures.map(item => ({ value: item.orebPer36, weight: item.confidence }))),
    dreb: weightedAverage(rawFeatures.map(item => ({ value: item.drebPer36, weight: item.confidence }))),
    poss: weightedAverage(rawFeatures.map(item => ({ value: item.possPer36, weight: item.confidence }))),
  }

  const componentRows = rawFeatures.map(item => {
    const shrink = (value: number, leagueValue: number) => leagueValue + (value - leagueValue) * item.confidence

    const ptsPer36 = shrink(item.ptsPer36, leaguePer36.pts)
    const astPer36 = shrink(item.astPer36, leaguePer36.ast)
    const rebPer36 = shrink(item.rebPer36, leaguePer36.reb)
    const stlPer36 = shrink(item.stlPer36, leaguePer36.stl)
    const blkPer36 = shrink(item.blkPer36, leaguePer36.blk)
    const orebPer36 = shrink(item.orebPer36, leaguePer36.oreb)
    const drebPer36 = shrink(item.drebPer36, leaguePer36.dreb)
    const possPer36 = shrink(item.possPer36, leaguePer36.poss)
    const ts = leagueTs + (item.ts - leagueTs) * item.confidence
    const efg = leagueEfg + (item.efg - leagueEfg) * item.confidence
    const astTov = leagueAstTov + (item.astTov - leagueAstTov) * item.confidence
    const plusMinus = leaguePlusMinus + (item.player.plus_minus - leaguePlusMinus) * item.confidence

    // Inspired by Win Shares / ORtg / BPM style thinking:
    // efficient scoring on meaningful load, creation without turnovers,
    // and two-way box-score impact all matter.
    const offenseValue =
      ptsPer36 * (0.62 + ts * 0.55) +
      astPer36 * 1.45 +
      possPer36 * 0.18 +
      (ts - leagueTs) * 34 +
      (efg - leagueEfg) * 22 +
      (astTov - leagueAstTov) * 2.6

    const defenseValue =
      stlPer36 * 2.6 +
      blkPer36 * 2.3 +
      drebPer36 * 0.55 +
      orebPer36 * 0.35 +
      rebPer36 * 0.15 +
      plusMinus * 0.95

    const totalValue = offenseValue * 0.64 + defenseValue * 0.36

    return {
      player: item.player,
      confidence: item.confidence,
      offenseValue,
      defenseValue,
      totalValue,
      ts,
      astTov,
      plusMinus,
    }
  })

  const means = {
    offense: average(componentRows.map(row => row.offenseValue)),
    defense: average(componentRows.map(row => row.defenseValue)),
    total: average(componentRows.map(row => row.totalValue)),
  }
  const stdevs = {
    offense: standardDeviation(componentRows.map(row => row.offenseValue), means.offense),
    defense: standardDeviation(componentRows.map(row => row.defenseValue), means.defense),
    total: standardDeviation(componentRows.map(row => row.totalValue), means.total),
  }

  const byPlayerId: Record<number, PlayerImpactEntry> = {}

  for (const row of componentRows) {
    const offensiveZ = clamp(zScore(row.offenseValue, means.offense, stdevs.offense), -2.75, 2.75)
    const defensiveZ = clamp(zScore(row.defenseValue, means.defense, stdevs.defense), -2.75, 2.75)
    const totalZ = clamp(zScore(row.totalValue, means.total, stdevs.total), -2.75, 2.75)
    const blendedZ = totalZ * 0.55 + offensiveZ * 0.3 + defensiveZ * 0.15
    const score = clamp(50 + blendedZ * 12, 20, 95)

    const strengths = [
      row.ts > leagueTs + 0.025 ? 'efficient scoring' : null,
      row.astTov > leagueAstTov + 0.35 ? 'clean playmaking' : null,
      row.plusMinus > leaguePlusMinus + 1.5 ? 'strong on-court results' : null,
      defensiveZ > 0.45 ? 'defensive activity' : null,
    ].filter(Boolean)

    byPlayerId[row.player.player_id] = {
      score,
      summary: strengths[0] ? `Built on ${strengths.slice(0, 2).join(' and ')}.` : 'Around league-average overall impact.',
    }
  }

  return {
    averageScore: 50,
    byPlayerId,
  }
}
