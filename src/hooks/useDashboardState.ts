import { useEffect, useState } from 'react'
import type { LeaguePlayer } from '../types'

type SeasonType = 'regular_season' | 'playoffs'

export function useDashboardState(options: {
  initialSeason: string
  availableSeasons: string[]
}) {
  const { initialSeason, availableSeasons } = options
  const [season, setSeason] = useState(initialSeason)
  const [seasonType, setSeasonType] = useState<SeasonType>('regular_season')

  useEffect(() => {
    if (!availableSeasons.includes(season) && availableSeasons.length > 0) {
      setSeason(availableSeasons[availableSeasons.length - 1])
    }
  }, [availableSeasons, season])

  return {
    season,
    setSeason,
    seasonType,
    setSeasonType,
  }
}

export function usePlayerSelectionState(allPlayers: LeaguePlayer[]) {
  const [playerId, setPlayerId] = useState<number | null>(null)
  const [compareId, setCompareId] = useState<number | null>(null)
  const [showCompare, setShowCompare] = useState(false)

  useEffect(() => {
    if (!allPlayers.length) {
      setPlayerId(null)
      setCompareId(null)
      setShowCompare(false)
      return
    }

    if (playerId === null || !allPlayers.some(player => player.player_id === playerId)) {
      setPlayerId(allPlayers[0]?.player_id ?? null)
      setCompareId(null)
      setShowCompare(false)
    }
  }, [allPlayers, playerId])

  return {
    playerId,
    setPlayerId,
    compareId,
    setCompareId,
    showCompare,
    setShowCompare,
  }
}
