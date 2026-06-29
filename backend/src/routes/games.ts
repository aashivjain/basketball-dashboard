import { Router, Request, Response } from 'express'
import { DatabaseConnection } from '../db/connection.js'
import { asyncHandler, ApiError } from '../middleware/errorHandler.js'
import type { League } from '../types'

export default function gameRoutes(db: DatabaseConnection): Router {
  const router = Router()

  /**
   * GET /api/v1/games/forecasts
   * Query params:
   *   - league: 'WNBA' | 'NBA' (default: 'WNBA')
   *   - season: string (default: '2026')
   */
  router.get(
    '/forecasts',
    asyncHandler(async (req: Request, res: Response) => {
      const league = (req.query.league as string || 'WNBA') as League
      const season = (req.query.season as string || '2026')

      if (!['WNBA', 'NBA'].includes(league)) {
        throw new ApiError(400, 'Invalid league')
      }

      const forecasts = await db.all(`
        SELECT 
          tf.*,
          home_team.name as home_team_name,
          home_team.abbreviation as home_team_abbr,
          away_team.name as away_team_name,
          away_team.abbreviation as away_team_abbr
        FROM team_forecasts tf
        LEFT JOIN teams home_team ON tf.home_team_id = home_team.id AND tf.league = home_team.league
        LEFT JOIN teams away_team ON tf.away_team_id = away_team.id AND tf.league = away_team.league
        WHERE tf.league = ? AND tf.season = ?
        ORDER BY tf.generated_at DESC
      `, [league, season])

      res.json({
        success: true,
        data: forecasts,
      })
    })
  )

  /**
   * GET /api/v1/games/forecasts/:homeTeamId/:awayTeamId
   * Query params:
   *   - league: 'WNBA' | 'NBA' (default: 'WNBA')
   *   - season: string (default: '2026')
   */
  router.get(
    '/forecasts/:homeTeamId/:awayTeamId',
    asyncHandler(async (req: Request, res: Response) => {
      const homeTeamId = parseInt(req.params.homeTeamId)
      const awayTeamId = parseInt(req.params.awayTeamId)
      const league = (req.query.league as string || 'WNBA') as League
      const season = (req.query.season as string || '2026')

      const forecast = await db.get(`
        SELECT 
          tf.*,
          home_team.name as home_team_name,
          home_team.abbreviation as home_team_abbr,
          away_team.name as away_team_name,
          away_team.abbreviation as away_team_abbr
        FROM team_forecasts tf
        LEFT JOIN teams home_team ON tf.home_team_id = home_team.id AND tf.league = home_team.league
        LEFT JOIN teams away_team ON tf.away_team_id = away_team.id AND tf.league = away_team.league
        WHERE tf.league = ? AND tf.season = ? 
          AND tf.home_team_id = ? AND tf.away_team_id = ?
        ORDER BY tf.generated_at DESC
        LIMIT 1
      `, [league, season, homeTeamId, awayTeamId])

      if (!forecast) {
        throw new ApiError(404, 'Forecast not found')
      }

      res.json({
        success: true,
        data: forecast,
      })
    })
  )

  /**
   * GET /api/v1/games/player-logs/:playerId
   * Query params:
   *   - league: 'WNBA' | 'NBA' (default: 'WNBA')
   *   - season: string (default: '2026')
   *   - limit: number (default: 30, max: 100)
   */
  router.get(
    '/player-logs/:playerId',
    asyncHandler(async (req: Request, res: Response) => {
      const playerId = parseInt(req.params.playerId)
      const league = (req.query.league as string || 'WNBA') as League
      const season = (req.query.season as string || '2026')
      const limit = Math.min(parseInt(req.query.limit as string || '30'), 100)

      const logs = await db.all(`
        SELECT gl.*, t.abbreviation as opponent_abbr
        FROM game_logs gl
        LEFT JOIN teams t ON gl.opponent_team_id = t.id AND gl.league = t.league
        WHERE gl.player_id = ? AND gl.league = ? AND gl.season = ?
        ORDER BY gl.game_date DESC
        LIMIT ?
      `, [playerId, league, season, limit])

      res.json({
        success: true,
        data: logs,
      })
    })
  )

  return router
}
