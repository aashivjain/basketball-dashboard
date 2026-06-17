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

  if (data.news != null) {
    assert(typeof data.news === 'object', 'Dashboard news must be an object when present.')
    assert(typeof data.news.generated_at === 'string', 'Dashboard news.generated_at must be a string.')
    assert(Array.isArray(data.news.articles), 'Dashboard news.articles must be an array.')

    for (const [index, article] of data.news.articles.entries()) {
      assert(article && typeof article === 'object', `News article ${index} must be an object.`)
      assert(typeof article.id === 'string', `News article ${index} id must be a string.`)
      assert(typeof article.title === 'string', `News article ${index} title must be a string.`)
      assert(typeof article.source === 'string', `News article ${index} source must be a string.`)
      assert(typeof article.link === 'string', `News article ${index} link must be a string.`)
      assert(typeof article.published_at === 'string', `News article ${index} published_at must be a string.`)
      assert(typeof article.summary === 'string', `News article ${index} summary must be a string.`)
      assert(article.image_url === undefined || article.image_url === null || typeof article.image_url === 'string', `News article ${index} image_url must be a string when present.`)
      assert(['General', 'Injuries', 'Discipline', 'Transactions'].includes(article.category), `News article ${index} category is invalid.`)
    }
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
