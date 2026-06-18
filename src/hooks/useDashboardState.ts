import { useMemo, useState } from 'react'
import type { LeaguePlayer } from '../types'

type SeasonType = 'regular_season' | 'playoffs'

export function useDashboardState(options: {
  initialSeason: string
  availableSeasons: string[]
}) {
  const { initialSeason, availableSeasons } = options
  const [requestedSeason, setRequestedSeason] = useState(initialSeason)
  const [seasonType, setSeasonType] = useState<SeasonType>('regular_season')
  const season = useMemo(() => {
    if (availableSeasons.includes(requestedSeason)) {
      return requestedSeason
    }
    return availableSeasons[availableSeasons.length - 1] ?? requestedSeason
  }, [availableSeasons, requestedSeason])

  return {
    season,
    setSeason: setRequestedSeason,
    seasonType,
    setSeasonType,
  }
}

export function usePlayerSelectionState(allPlayers: LeaguePlayer[]) {
  const [playerIdValue, setPlayerId] = useState<number | null>(null)
  const [compareIdValue, setCompareId] = useState<number | null>(null)
  const [showCompare, setShowCompare] = useState(false)
  const playerId = useMemo(() => {
    if (!allPlayers.length) return null
    if (playerIdValue !== null && allPlayers.some(player => player.player_id === playerIdValue)) {
      return playerIdValue
    }
    return allPlayers[0]?.player_id ?? null
  }, [allPlayers, playerIdValue])
  const compareId = useMemo(() => {
    if (!allPlayers.length || compareIdValue === null) return null
    return allPlayers.some(player => player.player_id === compareIdValue) ? compareIdValue : null
  }, [allPlayers, compareIdValue])

  return {
    playerId,
    setPlayerId,
    compareId,
    setCompareId,
    showCompare: showCompare && compareId !== null,
    setShowCompare,
  }
}
