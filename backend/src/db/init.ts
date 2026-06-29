import sqlite3 from 'sqlite3'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function initDatabase(dbPath: string): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err)
        return
      }

      // Enable foreign keys
      db.serialize(() => {
        db.run('PRAGMA foreign_keys = ON', (err) => {
          if (err) {
            reject(err)
            return
          }

          // Read and execute schema
          try {
            const schemaPath = join(__dirname, 'schema.sql')
            const schema = readFileSync(schemaPath, 'utf-8')

            // Split schema into individual statements and execute
            db.exec(schema, (err) => {
              if (err) {
                reject(err)
                return
              }

              console.log('✓ Database initialized successfully')
              resolve(db)
            })
          } catch (fileErr) {
            reject(fileErr)
          }
        })
      })
    })
  })
}

export function getDatabase(dbPath: string): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err)
        return
      }

      db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) {
          reject(err)
          return
        }
        resolve(db)
      })
    })
  })
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const dbPath = process.env.DB_PATH || './basketball.db'
  initDatabase(dbPath)
    .then(() => {
      console.log('✓ Database ready at:', dbPath)
      process.exit(0)
    })
    .catch((err) => {
      console.error('✗ Error initializing database:', err)
      process.exit(1)
    })
}
