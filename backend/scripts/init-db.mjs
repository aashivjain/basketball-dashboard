#!/usr/bin/env node
// Simple database initialization script

import sqlite3 from 'sqlite3'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const dbPath = process.argv[2] || './basketball.db'
const schemaPath = resolve('./src/db/schema.sql')

console.log('Initializing database:', dbPath)
console.log('Using schema:', schemaPath)

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('✗ Error opening database:', err.message)
    process.exit(1)
  }

  console.log('✓ Database file created')

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON', (err) => {
    if (err) {
      console.error('✗ Error enabling foreign keys:', err.message)
      process.exit(1)
    }

    console.log('✓ Foreign keys enabled')

    // Read schema
    let schema
    try {
      schema = readFileSync(schemaPath, 'utf-8')
    } catch (err) {
      console.error('✗ Error reading schema:', err.message)
      process.exit(1)
    }

    // Execute schema
    db.exec(schema, (err) => {
      if (err) {
        console.error('✗ Error executing schema:', err.message)
        process.exit(1)
      }

      console.log('✓ Database schema loaded')

      // Count tables
      db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
        if (err) {
          console.error('✗ Error counting tables:', err.message)
          process.exit(1)
        }

        console.log(`✓ Created ${rows && rows.length || 0} tables`)
        
        if (rows && rows.length > 0) {
          const tableNames = rows.map(r => r.name).join(', ')
          console.log('Tables:', tableNames)
        }

        db.close((err) => {
          if (err) {
            console.error('✗ Error closing database:', err.message)
            process.exit(1)
          }

          console.log('✓ Database initialization complete!')
          process.exit(0)
        })
      })
    })
  })
})
