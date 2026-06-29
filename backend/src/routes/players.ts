import { Router, Request, Response } from 'express'
import { DatabaseConnection } from '../db/connection.js'
import { asyncHandler, ApiError } from '../middleware/errorHandler.js'
import type { League, GameType, SeasonStats, GameLog, ShotChart } from '../types'

export default function playerRoutes(db: DatabaseConnection): Router {
  const router = Router()

  /**
   * GET /api/v1/players
   * Query params:
   *   - league: 'WNBA' | 'NBA' (default: 'WNBA')
   *   - season: string (default: '2026')
   *   - team_id: number (optional filter)
   *   - limit: number (default: 100)
   *   - offset: number (default: 0)
   */
  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      const league = (req.query.league as string || 'WNBA') as League
      const season = req.query.season as string || '2026'
      const team_id = req.query.team_id ? parseInt(req.query.team_id as string) : null
      const limit = Math.min(parseInt(req.query.limit as string || '100'), 500)
      const offset = parseInt(req.query.offset as string || '0')

      // Validate league
      if (!['WNBA', 'NBA'].includes(league)) {
        throw new ApiError(400, 'Invalid league. Must be WNBA or NBA')
      }

      const query = `
        SELECT p.*, ss.pts, ss.reb, ss.ast, ss.stl, ss.blk, 
               ss.fg_pct, ss.fg3_pct, ss.ft_pct, ss.plus_minus, ss.gp
        FROM players p
        LEFT JOIN season_stats ss ON p.id = ss.player_id 
          AND p.league = ss.league 
          AND ss.season = ?
          AND ss.game_type = 'Regular Season'
        WHERE p.league = ?
        ${team_id ? 'AND p.team_id = ?' : ''}
        ORDER BY ss.pts DESC NULLS LAST, p.name ASC
        LIMIT ? OFFSET ?
      `

      const params = team_id
        ? [season, league, team_id, limit, offset]
        : [season, league, limit, offset]

      const players = await db.all(query, params)

      res.json({
        success: true,
        data: players,
        pagination: {
          limit,
          offset,
          total: players.length,
        },
      })
    })
  )

  /**
   * GET /api/v1/players/:id
   * Query params:
   *   - league: 'WNBA' | 'NBA' (default: 'WNBA')
   */
  router.get(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id)
      const league = (req.query.league as string || 'WNBA') as League

      if (!['WNBA', 'NBA'].includes(league)) {
        throw new ApiError(400, 'Invalid league')
      }

      const player = await db.get(`
        SELECT * FROM players WHERE id = ? AND league = ?
      `, [id, league])

      if (!player) {
        throw new ApiError(404, `Player ${id} not found in ${league}`)
      }

      res.json({
        success: true,
        data: player,
      })
    })
  )

  /**
   * GET /api/v1/players/:id/stats
   * Query params:
   *   - league: 'WNBA' | 'NBA' (default: 'WNBA')
   *   - season: string (default: '2026')
   *   - gameType: GameType (default: 'Regular Season')
   */
  router.get(
    '/:id/stats',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id)
      const league = (req.query.league as string || 'WNBA') as League
      const season = (req.query.season as string || '2026')
      const gameType = (req.query.gameType as string || 'Regular Season') as GameType

      const validGameTypes: GameType[] = ['Regular Season', 'Playoffs', 'All-Star']
      if (!validGameTypes.includes(gameType)) {
        throw new ApiError(400, 'Invalid gameType')
      }

      const stats = await db.get<SeasonStats>(`
        SELECT * FROM season_stats 
        WHERE player_id = ? AND league = ? AND season = ? AND game_type = ?
      `, [id, league, season, gameType])

      res.json({
        success: true,
        data: stats || null,
      })
    })
  )

  /**
   * GET /api/v1/players/:id/game-logs
   * Query params:
   *   - league: 'WNBA' | 'NBA' (default: 'WNBA')
   *   - season: string (default: '2026')
   *   - limit: number (default: 20, max: 100)
   *   - offset: number (default: 0)
   */
  router.get(
    '/:id/game-logs',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id)
      const league = (req.query.league as string || 'WNBA') as League
      const season = (req.query.season as string || '2026')
      const limit = Math.min(parseInt(req.query.limit as string || '20'), 100)
      const offset = parseInt(req.query.offset as string || '0')

      const logs = await db.all<GameLog>(`
        SELECT * FROM game_logs 
        WHERE player_id = ? AND league = ? AND season = ?
        ORDER BY game_date DESC
        LIMIT ? OFFSET ?
      `, [id, league, season, limit, offset])

      res.json({
        success: true,
        data: logs,
        pagination: {
          limit,
          offset,
        },
      })
    })
  )

  /**
   * GET /api/v1/players/:id/shot-chart
   * Query params:
   *   - league: 'WNBA' | 'NBA' (default: 'WNBA')
   *   - season: string (default: '2026')
   */
  router.get(
    '/:id/shot-chart',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id)
      const league = (req.query.league as string || 'WNBA') as League
      const season = (req.query.season as string || '2026')

      const shots = await db.all<ShotChart>(`
        SELECT x_loc, y_loc, shot_distance, shot_result, shot_type, game_date
        FROM shot_charts 
        WHERE player_id = ? AND league = ? AND season = ?
        ORDER BY game_date DESC
      `, [id, league, season])

      res.json({
        success: true,
        data: shots,
      })
    })
  )

  return router
}
