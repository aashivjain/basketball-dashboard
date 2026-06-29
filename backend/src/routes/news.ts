import { Router, Request, Response } from 'express'
import { DatabaseConnection } from '../db/connection.js'
import { asyncHandler, ApiError } from '../middleware/errorHandler.js'
import type { League, NewsCategory } from '../types'

export default function newsRoutes(db: DatabaseConnection): Router {
  const router = Router()

  /**
   * GET /api/v1/news
   * Query params:
   *   - league: 'WNBA' | 'NBA' | 'General' (default: 'WNBA')
   *   - category: NewsCategory (optional filter)
   *   - limit: number (default: 50, max: 200)
   *   - offset: number (default: 0)
   */
  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      const league = (req.query.league as string || 'WNBA') as League | 'General'
      const category = req.query.category as NewsCategory | undefined
      const limit = Math.min(parseInt(req.query.limit as string || '50'), 200)
      const offset = parseInt(req.query.offset as string || '0')

      const validLeagues = ['WNBA', 'NBA', 'General']
      if (!validLeagues.includes(league)) {
        throw new ApiError(400, 'Invalid league')
      }

      const validCategories: NewsCategory[] = [
        'General',
        'Injuries',
        'Discipline',
        'Transactions',
        'Trade',
        'Draft',
      ]
      if (category && !validCategories.includes(category)) {
        throw new ApiError(400, 'Invalid category')
      }

      let query = `
        SELECT * FROM news 
        WHERE league = ?
      `
      const params: any[] = [league]

      if (category) {
        query += ` AND category = ?`
        params.push(category)
      }

      query += ` ORDER BY published_at DESC LIMIT ? OFFSET ?`
      params.push(limit, offset)

      const news = await db.all(query, params)

      res.json({
        success: true,
        data: news,
        pagination: {
          limit,
          offset,
        },
      })
    })
  )

  /**
   * GET /api/v1/news/:id
   */
  router.get(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = req.params.id

      const article = await db.get(`
        SELECT * FROM news WHERE id = ?
      `, [id])

      if (!article) {
        throw new ApiError(404, 'Article not found')
      }

      res.json({
        success: true,
        data: article,
      })
    })
  )

  /**
   * GET /api/v1/news/categories/:category
   * Query params:
   *   - league: 'WNBA' | 'NBA' | 'General' (default: 'WNBA')
   *   - limit: number (default: 30, max: 100)
   */
  router.get(
    '/categories/:category',
    asyncHandler(async (req: Request, res: Response) => {
      const category = req.params.category as NewsCategory
      const league = (req.query.league as string || 'WNBA') as League | 'General'
      const limit = Math.min(parseInt(req.query.limit as string || '30'), 100)

      const validCategories: NewsCategory[] = [
        'General',
        'Injuries',
        'Discipline',
        'Transactions',
        'Trade',
        'Draft',
      ]
      if (!validCategories.includes(category)) {
        throw new ApiError(400, 'Invalid category')
      }

      const news = await db.all(`
        SELECT * FROM news 
        WHERE category = ? AND league = ?
        ORDER BY published_at DESC
        LIMIT ?
      `, [category, league, limit])

      res.json({
        success: true,
        data: news,
      })
    })
  )

  return router
}
