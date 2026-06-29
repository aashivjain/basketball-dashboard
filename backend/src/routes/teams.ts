import { Router, Request, Response } from 'express'
import { DatabaseConnection } from '../db/connection.js'
import { asyncHandler, ApiError } from '../middleware/errorHandler.js'
import type { League } from '../types'

export default function teamRoutes(db: DatabaseConnection): Router {
  const router = Router()

  /**
   * GET /api/v1/teams
   * Query params:
   *   - league: 'WNBA' | 'NBA' (default: 'WNBA')
   */
  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      const league = (req.query.league as string || 'WNBA') as League

      if (!['WNBA', 'NBA'].includes(league)) {
        throw new ApiError(400, 'Invalid league')
      }

      const teams = await db.all(`
        SELECT * FROM teams WHERE league = ? ORDER BY abbreviation ASC
      `, [league])

      res.json({
        success: true,
        data: teams,
      })
    })
  )

  /**
   * GET /api/v1/teams/:id
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

      const team = await db.get(`
        SELECT * FROM teams WHERE id = ? AND league = ?
      `, [id, league])

      if (!team) {
        throw new ApiError(404, `Team ${id} not found in ${league}`)
      }

      res.json({
        success: true,
        data: team,
      })
    })
  )

  /**
   * GET /api/v1/teams/:id/roster
   * Query params:
   *   - league: 'WNBA' | 'NBA' (default: 'WNBA')
   *   - season: string (default: '2026')
   */
  router.get(
    '/:id/roster',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id)
      const league = (req.query.league as string || 'WNBA') as League
      const season = (req.query.season as string || '2026')

      const roster = await db.all(`
        SELECT p.*, r.number, r.height, r.weight, r.age, r.experience, r.school
        FROM players p
        LEFT JOIN rosters r ON p.id = r.player_id 
          AND p.league = r.league 
          AND r.season = ?
        WHERE p.league = ? AND p.team_id = ?
        ORDER BY CAST(COALESCE(r.number, '99') AS INTEGER) ASC
      `, [season, league, id])

      res.json({
        success: true,
        data: roster,
      })
    })
  )

  return router
}
