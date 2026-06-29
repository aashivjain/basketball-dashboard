import sqlite3 from 'sqlite3'

/**
 * Wrapper for sqlite3 Database to provide Promise-based API
 */
export class DatabaseConnection {
  constructor(private db: sqlite3.Database) {}

  /**
   * Run a SQL statement (INSERT, UPDATE, DELETE, etc.)
   */
  run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err)
        else resolve({ lastID: this.lastID, changes: this.changes })
      })
    })
  }

  /**
   * Execute a query and get a single row
   */
  get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err)
        else resolve(row as T | undefined)
      })
    })
  }

  /**
   * Execute a query and get all rows
   */
  all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err)
        else resolve((rows || []) as T[])
      })
    })
  }

  /**
   * Execute multiple statements in a transaction
   */
  transaction<T>(callback: () => Promise<T>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      try {
        await this.run('BEGIN TRANSACTION')
        const result = await callback()
        await this.run('COMMIT')
        resolve(result)
      } catch (err) {
        this.run('ROLLBACK').catch(console.error)
        reject(err)
      }
    })
  }

  /**
   * Close the database connection
   */
  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }
}
