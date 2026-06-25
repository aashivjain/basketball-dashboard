import { useEffect, useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import type { LeaguePlayer } from '../types'

type PlayerTab = 'overview' | 'compare' | 'rankings' | 'builder'

export function usePlayerRouteState(options: {
  allPlayers: LeaguePlayer[]
  fallbackPlayerId: number | null
  onFallbackSelect: (id: number | null) => void
}) {
  const { allPlayers, fallbackPlayerId, onFallbackSelect } = options
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const pathname = location.pathname
  const section: 'players' | 'teams' | 'news' | 'games' = pathname.startsWith('/teams')
    ? 'teams'
    : pathname.startsWith('/games')
      ? 'games'
    : pathname.startsWith('/news')
      ? 'news'
      : 'players'
  const playerTab: PlayerTab = pathname === '/players/compare'
    ? 'compare'
    : pathname === '/players/rankings'
      ? 'rankings'
      : pathname === '/players/builder'
        ? 'builder'
        : 'overview'
  const persistentPlayerRoute = section === 'players' && (playerTab === 'overview' || playerTab === 'rankings')

  const validPlayerIds = useMemo(() => new Set(allPlayers.map(player => player.player_id)), [allPlayers])
  const rawPlayerParam = searchParams.get('player')
  const parsedPlayerParam = rawPlayerParam ? Number(rawPlayerParam) : null
  const playerParamId = parsedPlayerParam !== null && Number.isFinite(parsedPlayerParam) && validPlayerIds.has(parsedPlayerParam)
    ? parsedPlayerParam
    : null
  const selectedPlayerId = persistentPlayerRoute
    ? (playerParamId ?? fallbackPlayerId)
    : fallbackPlayerId

  useEffect(() => {
    if (!persistentPlayerRoute || !selectedPlayerId) return
    if (playerParamId === selectedPlayerId) return

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('player', String(selectedPlayerId))
    setSearchParams(nextParams, { replace: true })
  }, [persistentPlayerRoute, playerParamId, searchParams, selectedPlayerId, setSearchParams])

  const setSelectedPlayerId = (id: number | null) => {
    onFallbackSelect(id)
    if (!persistentPlayerRoute || id === null) return

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('player', String(id))
    setSearchParams(nextParams, { replace: true })
  }

  const buildPlayerRoute = (tab: 'overview' | 'rankings', playerIdOverride?: number | null) => {
    const pathnameTarget = tab === 'overview' ? '/players' : '/players/rankings'
    const routePlayerId = playerIdOverride ?? selectedPlayerId
    if (!routePlayerId) return pathnameTarget
    const params = new URLSearchParams()
    params.set('player', String(routePlayerId))
    return `${pathnameTarget}?${params.toString()}`
  }

  return {
    pathname,
    section,
    playerTab,
    persistentPlayerRoute,
    selectedPlayerId,
    setSelectedPlayerId,
    buildPlayerRoute,
  }
}
