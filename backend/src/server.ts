import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import sqlite3 from 'sqlite3'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { DatabaseConnection } from './db/connection.js'
import { errorHandler, asyncHandler } from './middleware/errorHandler.js'
import playerRoutes from './routes/players.js'
import teamRoutes from './routes/teams.js'
import gameRoutes from './routes/games.js'
import newsRoutes from './routes/news.js'

// Load environment variables
dotenv.config()

const app = express()

// Security: Add security headers
app.use(helmet())

// Security: Rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '100'),
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173'
      
      // Allow requests from allowed origin or development environment
      if (!origin || origin === allowedOrigin || process.env.NODE_ENV === 'development') {
        callback(null, true)
      } else {
        callback(new Error('CORS not allowed'))
      }
    },
    credentials: true,
  })
)
app.use(express.json({ limit: '10mb' }))

// Apply rate limiting to API routes (but not health check)
app.use('/api/v1/', apiLimiter)

// Initialize database
const dbPath = process.env.DB_PATH || './basketball.db'

async function startServer() {
  try {
    const rawDb = await new Promise<sqlite3.Database>((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(err)
          return
        }

        // Enable foreign keys
        db.run('PRAGMA foreign_keys = ON', (err) => {
          if (err) {
            reject(err)
            return
          }
          resolve(db)
        })
      })
    })

    const db = new DatabaseConnection(rawDb)

    console.log(`✓ Database connected: ${dbPath}`)

    // Health check endpoint
    app.get(
      '/api/health',
      asyncHandler(async (req, res) => {
        // Test database connection
        await db.get('SELECT 1')

        res.json({
          success: true,
          status: 'ok',
          timestamp: new Date().toISOString(),
        })
      })
    )

    // API Routes
    app.use('/api/v1/players', playerRoutes(db))
    app.use('/api/v1/teams', teamRoutes(db))
    app.use('/api/v1/games', gameRoutes(db))
    app.use('/api/v1/news', newsRoutes(db))

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: `Endpoint not found: ${req.method} ${req.path}`,
      })
    })

    // Global error handler (must be last)
    app.use(errorHandler)

    // Start server
    const PORT = parseInt(process.env.PORT || '3001', 10)

    const server = app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   Basketball Dashboard Backend         ║
║   API Server Running                   ║
╠════════════════════════════════════════╣
║   Environment: ${process.env.NODE_ENV || 'development'.padEnd(21)} ║
║   Port: ${String(PORT).padEnd(30)} ║
║   Database: ${dbPath.substring(0, 29).padEnd(29)} ║
║   Frontend: ${process.env.FRONTEND_URL ? process.env.FRONTEND_URL.substring(0, 25) : 'http://localhost:5173'.substring(0, 25)} ║
╠════════════════════════════════════════╣
║   Health: http://localhost:${PORT}/api/health             ║
║   Players: http://localhost:${PORT}/api/v1/players      ║
║   Teams: http://localhost:${PORT}/api/v1/teams        ║
║   Games: http://localhost:${PORT}/api/v1/games        ║
║   News: http://localhost:${PORT}/api/v1/news         ║
╚════════════════════════════════════════╝
      `)
    })

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, closing server...')
      server.close(() => {
        db.close()
          .then(() => {
            console.log('✓ Database and server closed')
            process.exit(0)
          })
          .catch((err) => {
            console.error('Error closing database:', err)
            process.exit(1)
          })
      })
    })

    process.on('SIGINT', () => {
      console.log('SIGINT received, closing server...')
      server.close(() => {
        db.close()
          .then(() => {
            console.log('✓ Database and server closed')
            process.exit(0)
          })
          .catch((err) => {
            console.error('Error closing database:', err)
            process.exit(1)
          })
      })
    })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

startServer()
