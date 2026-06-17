import { useMemo } from 'react'
import type { NewsData, SeasonBlock } from '../types'
import { getTeamColors } from '../utils/teamColors'
import { buildTeamProfiles } from '../utils/teamPrediction'

interface Props {
  block: SeasonBlock | null
  news: NewsData | undefined
  season: string
  seasonType: 'regular_season' | 'playoffs'
}

type SignalItem = {
  id: string
  label: string
  team: string
  detail: string
  accent: string
}

export default function NewsHub({ block, news, season, seasonType }: Props) {
  const articles = useMemo(
    () => (news?.articles ?? []).filter(article => isFreshArticle(article.published_at)),
    [news]
  )
  const leadArticle = useMemo(() => pickLeadArticle(articles), [articles])
  const leadImage = useMemo(() => pickLeadImage(leadArticle, articles), [leadArticle, articles])
  const headlineList = useMemo(() => {
    const leadId = leadArticle?.id
    const transactionLimit = 2
    let transactionsSeen = 0
    return articles.filter(article => {
      if (article.id === leadId) return false
      if (article.category !== 'Transactions') return true
      transactionsSeen += 1
      return transactionsSeen <= transactionLimit
    }).slice(0, 8)
  }, [articles, leadArticle])
  const signals = useMemo(() => buildSignalItems(block), [block])

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-semibold">Signals</div>
            <h3 className="mt-2 text-2xl text-slate-900" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>Quick Watch</h3>
          </div>
          <div className="text-sm text-slate-500">{season} {seasonType === 'regular_season' ? 'Regular Season' : 'Playoffs'}</div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {signals.map(signal => (
            <div key={signal.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.16em] font-semibold" style={{ color: signal.accent }}>
                {signal.label}
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{signal.team}</div>
              <div className="mt-2 text-sm leading-6 text-slate-600">{signal.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400 font-semibold">News Desk</div>
            <h2 className="mt-2 text-[28px] text-slate-900">WNBA News</h2>
          </div>
          {news?.generated_at && (
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
              Updated {new Date(news.generated_at).toLocaleString()}
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1.08fr_0.92fr] gap-6">
          <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
            {leadArticle ? (
              <>
                {leadImage ? (
                  <div className="relative h-60 w-full overflow-hidden bg-slate-100">
                    <img src={leadImage} alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-900/15 to-transparent" />
                    <div className="absolute left-5 top-5 flex items-center gap-2 flex-wrap">
                      <MetaChip>{leadArticle.category}</MetaChip>
                      <MetaChip>{formatSource(leadArticle.source)}</MetaChip>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex h-60 w-full items-end overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.28),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.2),_transparent_30%),linear-gradient(135deg,#f8fafc_0%,#e2e8f0_45%,#cbd5e1_100%)] px-6 pb-6 pt-6">
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(226,232,240,0.68)_100%)]" />
                    <div className="relative flex items-center gap-2 flex-wrap">
                      <MetaChip>{leadArticle.category}</MetaChip>
                      <MetaChip>{formatSource(leadArticle.source)}</MetaChip>
                    </div>
                  </div>
                )}

                <div className="p-6">
                  <h3 className="text-3xl leading-tight text-slate-900" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                    <a href={leadArticle.link} target="_blank" rel="noreferrer" className="hover:text-slate-700 transition-colors">
                      {leadArticle.title}
                    </a>
                  </h3>
                  <p className="mt-4 max-w-3xl text-[15px] leading-7 text-slate-700">{leadArticle.summary}</p>
                  <div className="mt-5 text-[12px] font-medium text-slate-500">{formatPublished(leadArticle.published_at)}</div>
                </div>
              </>
            ) : (
              <div className="p-6">
                <h3 className="text-2xl text-slate-900" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>No live news loaded</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Run the news refresh script to pull the latest WNBA headlines into the dashboard.
                </p>
              </div>
            )}
          </article>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-semibold">Latest Headlines</div>
              <div className="text-[11px] text-slate-400">{headlineList.length} stories</div>
            </div>
            <div className="mt-3 divide-y divide-slate-100">
              {headlineList.length > 0 ? (
                headlineList.map(article => (
                  <a
                    key={article.id}
                    href={article.link}
                    target="_blank"
                    rel="noreferrer"
                    className="block py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-semibold flex-wrap">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                        {article.category}
                      </span>
                      <span>{formatSource(article.source)}</span>
                      <span className="text-slate-300">•</span>
                      <span>{formatPublished(article.published_at)}</span>
                    </div>
                    <div className="mt-1 text-[15px] leading-6 font-semibold text-slate-800 hover:text-slate-600 transition-colors">
                      {article.title}
                    </div>
                    {article.summary && (
                      <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-slate-500">
                        {article.summary}
                      </div>
                    )}
                  </a>
                ))
              ) : (
                <div className="py-6 text-sm text-slate-500">No headlines available yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function pickLeadArticle(articles: NewsData['articles']) {
  if (articles.length === 0) return null
  const candidates = [...articles]
    .sort((a, b) => getArticleTime(b.published_at) - getArticleTime(a.published_at))
    .slice(0, 10)
  const nonTransactionCandidates = candidates.filter(article => article.category !== 'Transactions')
  const pool = nonTransactionCandidates.length > 0 ? nonTransactionCandidates : candidates

  const tokenFrequencies = new Map<string, number>()
  for (const article of pool) {
    for (const token of tokenize(article.title)) {
      tokenFrequencies.set(token, (tokenFrequencies.get(token) ?? 0) + 1)
    }
  }

  return [...pool]
    .map(article => ({
      article,
      score: tokenize(article.title).reduce((sum, token) => sum + (tokenFrequencies.get(token) ?? 0), 0)
        + recencyBoost(article.published_at)
        + (article.image_url ? 4 : 0)
        + (article.category === 'Injuries' ? 2 : 0)
        + (article.category === 'Discipline' ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)[0]?.article ?? pool[0]
}

function tokenize(title: string) {
  const stopwords = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'over', 'under', 'after', 'before', 'that', 'this', 'will', 'have', 'has', 'are', 'was', 'her', 'his', 'their', 'about', 'wnba'])
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !stopwords.has(token))
}

function MetaChip({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600 backdrop-blur-sm">
      {children}
    </span>
  )
}

function formatSource(source: string) {
  if (!source) return 'WNBA News'
  const normalized = source.trim()
  if (!normalized || normalized.toLowerCase() === 'news.google.com') return 'WNBA News'
  return normalized
}

function pickLeadImage(leadArticle: NewsData['articles'][number] | null, articles: NewsData['articles']) {
  if (leadArticle?.image_url) return leadArticle.image_url
  return articles.find(article => article.id !== leadArticle?.id && article.image_url)?.image_url
}

function getArticleTime(value: string) {
  const time = Date.parse(value)
  return Number.isNaN(time) ? 0 : time
}

function recencyBoost(value: string) {
  const ageMs = Date.now() - getArticleTime(value)
  const ageHours = ageMs / (1000 * 60 * 60)
  if (ageHours <= 12) return 8
  if (ageHours <= 24) return 6
  if (ageHours <= 48) return 3
  return 1
}

function isFreshArticle(value: string) {
  const time = getArticleTime(value)
  if (!time) return false
  return Date.now() - time <= 1000 * 60 * 60 * 24 * 3
}

function buildSignalItems(block: SeasonBlock | null) {
  if (!block) return []

  const teamProfiles = buildTeamProfiles(block)
  const signals: SignalItem[] = []

  const hottestTeam = [...teamProfiles]
    .sort((a, b) => (b.recentWinPct - b.winPct) - (a.recentWinPct - a.winPct))[0]
  const coldestTeam = [...teamProfiles]
    .sort((a, b) => (a.recentWinPct - a.winPct) - (b.recentWinPct - b.winPct))[0]

  if (hottestTeam) {
    signals.push({
      id: `rise-${hottestTeam.team}`,
      label: 'Momentum',
      team: hottestTeam.team,
      detail: `Recent win rate is ${(hottestTeam.recentWinPct * 100).toFixed(0)}% versus ${(hottestTeam.winPct * 100).toFixed(0)}% on the season.`,
      accent: getTeamColors(hottestTeam.team).primary,
    })
  }

  if (coldestTeam) {
    signals.push({
      id: `slide-${coldestTeam.team}`,
      label: 'Slide',
      team: coldestTeam.team,
      detail: `Recent win rate is down to ${(coldestTeam.recentWinPct * 100).toFixed(0)}% after a ${(coldestTeam.winPct * 100).toFixed(0)}% season pace.`,
      accent: getTeamColors(coldestTeam.team).primary,
    })
  }

  const playerSignals = block.all_players
    .map(player => {
      const logs = block.game_logs[String(player.player_id)] ?? []
      if (logs.length < 4) return null
      const recent = logs.slice(0, 3)
      const baseline = logs.slice(3, 8)
      const recentPts = average(recent.map(game => game.pts))
      const baselinePts = average(baseline.map(game => game.pts), player.pts)
      const recentMin = average(recent.map(game => game.min))
      const baselineMin = average(baseline.map(game => game.min), player.min)
      return {
        player,
        heat: recentPts - baselinePts,
        minuteDrop: baselineMin - recentMin,
      }
    })
    .filter(Boolean) as Array<{ player: SeasonBlock['all_players'][number]; heat: number; minuteDrop: number }>

  const hottestPlayer = [...playerSignals].sort((a, b) => b.heat - a.heat)[0]
  const minuteWatcher = [...playerSignals].sort((a, b) => b.minuteDrop - a.minuteDrop)[0]

  if (hottestPlayer && hottestPlayer.heat >= 4) {
    signals.push({
      id: `hot-${hottestPlayer.player.player_id}`,
      label: 'Hot Player',
      team: hottestPlayer.player.name,
      detail: `Scoring is up by ${hottestPlayer.heat.toFixed(1)} points over the last three games.`,
      accent: getTeamColors(hottestPlayer.player.team).primary,
    })
  }

  if (minuteWatcher && minuteWatcher.minuteDrop >= 6) {
    signals.push({
      id: `minutes-${minuteWatcher.player.player_id}`,
      label: 'Minutes Watch',
      team: minuteWatcher.player.name,
      detail: `Playing time is down by ${minuteWatcher.minuteDrop.toFixed(1)} minutes in the recent stretch.`,
      accent: getTeamColors(minuteWatcher.player.team).primary,
    })
  }

  return signals.slice(0, 4)
}

function average(values: number[], fallback = 0) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback
}

function formatPublished(value: string) {
  const time = Date.parse(value)
  if (Number.isNaN(time)) return value
  const ageMs = Date.now() - time
  if (ageMs < 1000 * 60 * 60 * 24) {
    return new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  return new Date(time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
