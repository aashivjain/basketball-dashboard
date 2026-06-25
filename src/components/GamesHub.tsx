import { useEffect, useMemo, useState } from 'react'
import type { LeaguePlayer, SeasonBlock } from '../types'
import { getTeamColors } from '../utils/teamColors'

interface Props {
  block: SeasonBlock | null
  season: string
  seasonType: 'regular_season' | 'playoffs'
}

type GameMetricKey = 'pts' | 'reb' | 'ast'

type GameMetric = {
  key: GameMetricKey
  label: string
  shortLabel: string
  format: (player: LeaguePlayer) => string
  value: (player: LeaguePlayer) => number
}

type GameRound = {
  anchor: LeaguePlayer
  challenger: LeaguePlayer
}

const HIGH_SCORE_STORAGE_KEY = 'wnba-games-higher-lower-high-score'

const gameMetrics: GameMetric[] = [
  {
    key: 'pts',
    label: 'Points',
    shortLabel: 'PPG',
    format: player => player.pts.toFixed(1),
    value: player => player.pts,
  },
  {
    key: 'reb',
    label: 'Rebounds',
    shortLabel: 'RPG',
    format: player => player.reb.toFixed(1),
    value: player => player.reb,
  },
  {
    key: 'ast',
    label: 'Assists',
    shortLabel: 'APG',
    format: player => player.ast.toFixed(1),
    value: player => player.ast,
  },
]

function qualifyPlayers(block: SeasonBlock | null) {
  if (!block) return []

  return block.all_players.filter(player =>
    player.gp > 0 &&
    player.min > 0 &&
    (player.pts > 0 || player.reb > 0 || player.ast > 0)
  )
}

function pickRandomPlayer(players: LeaguePlayer[], excludeId?: number) {
  const pool = excludeId
    ? players.filter(player => player.player_id !== excludeId)
    : players

  if (pool.length === 0) return null

  const index = Math.floor(Math.random() * pool.length)
  return pool[index] ?? null
}

function buildRound(players: LeaguePlayer[], anchor?: LeaguePlayer | null) {
  if (players.length < 2) return null

  const nextAnchor = anchor ?? pickRandomPlayer(players)
  if (!nextAnchor) return null

  const challenger = pickRandomPlayer(players, nextAnchor.player_id)
  if (!challenger) return null

  return {
    anchor: nextAnchor,
    challenger,
  } satisfies GameRound
}

export default function GamesHub({ block, season, seasonType }: Props) {
  const players = useMemo(() => qualifyPlayers(block), [block])
  const [metricKey, setMetricKey] = useState<GameMetricKey>('pts')
  const [round, setRound] = useState<GameRound | null>(null)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [selection, setSelection] = useState<'higher' | 'lower' | null>(null)

  const metric = gameMetrics.find(entry => entry.key === metricKey) ?? gameMetrics[0]

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(HIGH_SCORE_STORAGE_KEY)
    const parsed = stored ? Number(stored) : 0
    if (Number.isFinite(parsed) && parsed > 0) {
      setHighScore(parsed)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(highScore))
  }, [highScore])

  useEffect(() => {
    setSelection(null)
    setScore(0)
    setRound(buildRound(players))
  }, [players, metricKey])

  const accent = round ? getTeamColors(round.anchor.team) : getTeamColors('IND')

  if (!round) {
    return (
      <section className="app-panel px-6 py-6 md:px-7">
        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-semibold">Games</div>
        <h2 className="mt-2 text-3xl tracking-tight text-slate-950" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>Higher or Lower</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          There is not enough player data loaded for this season view yet. Switch season context or load more player stats to unlock the game.
        </p>
      </section>
    )
  }

  const anchorValue = metric.value(round.anchor)
  const challengerValue = metric.value(round.challenger)
  const correctAnswer = challengerValue >= anchorValue ? 'higher' : 'lower'
  const revealed = selection !== null
  const gotItRight = selection === correctAnswer

  const handleGuess = (guess: 'higher' | 'lower') => {
    if (revealed) return

    const nextCorrect = guess === correctAnswer
    const nextScore = nextCorrect ? score + 1 : 0

    setSelection(guess)
    setScore(nextScore)
    if (nextScore > highScore) {
      setHighScore(nextScore)
    }

    if (nextCorrect) {
      window.setTimeout(() => {
        setSelection(null)
        setRound(buildRound(players, round.challenger))
      }, 700)
    }
  }

  const handleNext = () => {
    const nextAnchor = round.challenger
    setSelection(null)
    setRound(buildRound(players, nextAnchor))
  }

  return (
    <section className="space-y-6">
      <div className="app-panel px-6 py-6 md:px-7">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="max-w-3xl">
            <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-slate-400">Games</div>
            <h2 className="mt-2 text-3xl tracking-tight text-slate-950" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>Higher or Lower</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Random {season} {seasonType === 'regular_season' ? 'regular-season' : 'playoff'} matchups. Pick a stat, start a streak, and keep going player to player.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <ScoreCard label="Score" value={`${score}`} accent={accent.primary} />
            <ScoreCard label="High Score" value={`${highScore}`} accent={accent.secondary} />
            <ScoreCard label="Stat" value={metric.shortLabel} accent="#0f172a" />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {gameMetrics.map(option => (
            <button
              key={option.key}
              type="button"
              onClick={() => setMetricKey(option.key)}
              className="rounded-full border px-4 py-2 text-sm font-semibold transition-all"
              style={{
                borderColor: metricKey === option.key ? '#1e293b' : '#cbd5e1',
                background: metricKey === option.key ? '#1e293b' : '#fff',
                color: metricKey === option.key ? '#fff' : '#475569',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_22px_60px_-42px_rgba(15,23,42,0.35)]">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-400">{metric.label}</div>
          <div className="mt-2 flex items-center gap-3 text-sm text-slate-500">
            <span>Will the next player be higher or lower?</span>
            {revealed && gotItRight && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Correct
              </span>
            )}
          </div>
        </div>

        <div
          className="grid grid-cols-1 gap-6 px-6 py-6 transition-colors xl:grid-cols-[1fr_auto_1fr] xl:items-center"
          style={{
            background: revealed && gotItRight ? '#f8fffb' : undefined,
          }}
        >
          <PlayerGameCard
            player={round.anchor}
            accent={getTeamColors(round.anchor.team)}
            metricLabel={metric.shortLabel}
            metricValue={metric.format(round.anchor)}
            revealValue
            isCorrect={revealed && gotItRight}
          />

          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Next Player
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleGuess('higher')}
                disabled={revealed}
                className="rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:cursor-default disabled:opacity-70"
                style={{ background: '#15803d' }}
              >
                Higher
              </button>
              <button
                type="button"
                onClick={() => handleGuess('lower')}
                disabled={revealed}
                className="rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:cursor-default disabled:opacity-70"
                style={{ background: '#dc2626' }}
              >
                Lower
              </button>
            </div>
          </div>

          <PlayerGameCard
            player={round.challenger}
            accent={getTeamColors(round.challenger.team)}
            metricLabel={metric.shortLabel}
            metricValue={metric.format(round.challenger)}
            revealValue={revealed}
            isCorrect={revealed && gotItRight}
          />
        </div>

        {revealed && !gotItRight && (
          <div
            className="border-t px-6 py-5"
            style={{
              borderColor: '#fdba74',
              background: '#fff7ed',
            }}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div
                  className="text-[11px] uppercase tracking-[0.18em] font-semibold"
                  style={{ color: '#c2410c' }}
                >
                  Wrong
                </div>
                <div className="mt-2 text-2xl tracking-tight text-slate-950" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                  {round.challenger.name} was {correctAnswer}.
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {round.anchor.name}: {metric.format(round.anchor)} {metric.shortLabel} • {round.challenger.name}: {metric.format(round.challenger)} {metric.shortLabel}
                </p>
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all"
                style={{ background: accent.primary }}
              >
                Next Game
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="app-card p-5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-semibold">How it works</div>
        <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
          <p>Choose points, rebounds, or assists.</p>
          <p>Guess whether the hidden player is higher or lower than the current mark.</p>
          <p>The revealed player becomes the next one up, and your high score stays saved even if you leave the page.</p>
        </div>
      </div>
    </section>
  )
}

function PlayerGameCard({
  player,
  accent,
  metricLabel,
  metricValue,
  revealValue,
  isCorrect,
}: {
  player: LeaguePlayer
  accent: ReturnType<typeof getTeamColors>
  metricLabel: string
  metricValue: string
  revealValue: boolean
  isCorrect?: boolean
}) {
  return (
    <div
      className="rounded-[28px] border bg-white p-5 shadow-sm transition-colors"
      style={{
        borderColor: isCorrect ? '#86efac' : '#e2e8f0',
        boxShadow: isCorrect ? '0 14px 34px -24px rgba(34,197,94,0.5)' : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] font-semibold" style={{ color: accent.primary }}>{player.team}</div>
          <div className="mt-2 text-2xl tracking-tight text-slate-950" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
            {player.name}
          </div>
        </div>
        <div className="h-3 w-3 rounded-full shrink-0 mt-1.5" style={{ background: accent.primary }} />
      </div>

        <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-center">
          <div className="text-3xl font-semibold text-slate-950">
            {revealValue ? metricValue : '?'}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-400">{metricLabel}</div>
      </div>
    </div>
  )
}

function ScoreCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-[0.16em] font-semibold" style={{ color: accent }}>{label}</div>
    </div>
  )
}
