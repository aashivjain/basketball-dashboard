import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

async function readJson(relativePath) {
  const fullPath = path.join(root, relativePath)
  const text = await readFile(fullPath, 'utf8')
  return JSON.parse(text)
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function validateDashboardData(data) {
  assert(data && typeof data === 'object', 'Dashboard data must be an object.')
  assert(data.team && typeof data.team.current_season === 'string', 'Dashboard team.current_season is required.')
  assert(data.seasons && typeof data.seasons === 'object', 'Dashboard seasons are required.')

  for (const [season, seasonData] of Object.entries(data.seasons)) {
    if (seasonData == null) continue
    assert(seasonData.regular_season, `Season ${season} missing regular_season.`)
    assert(Array.isArray(seasonData.regular_season.all_players), `Season ${season} all_players must be an array.`)
  }
}

function validatePredictions(data, dashboardData) {
  assert(data && typeof data === 'object', 'Predictions data must be an object.')
  assert(typeof data.season === 'string', 'Predictions season is required.')
  assert(data.forecasts && typeof data.forecasts === 'object', 'Predictions forecasts are required.')
  assert(data.season === dashboardData.team.current_season, 'Predictions season must match dashboard current season.')
}

async function main() {
  const dashboardData = await readJson('src/data/wnba_data.json')
  const predictions = await readJson('src/data/team_predictions.json')

  validateDashboardData(dashboardData)
  validatePredictions(predictions, dashboardData)

  console.log('Smoke data validation passed.')
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
