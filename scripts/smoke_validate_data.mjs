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

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function normalizeTeamCode(team) {
  if (typeof team !== 'string') return ''
  const normalized = team.trim().toUpperCase()
  if (normalized === 'GS' || normalized === 'GSV') return 'GSV'
  if (normalized === 'PDX' || normalized === 'POR') return 'POR'
  return normalized
}

function parseOpponent(matchup) {
  if (typeof matchup !== 'string') return ''
  const parts = matchup.trim().split(/\s+/)
  return normalizeTeamCode(parts[parts.length - 1] ?? '')
}

function validateNews(data) {
  if (data.news == null) return

  assert(isObject(data.news), 'Dashboard news must be an object when present.')
  assert(typeof data.news.generated_at === 'string', 'Dashboard news.generated_at must be a string.')
  assert(Array.isArray(data.news.articles), 'Dashboard news.articles must be an array.')

  for (const [index, article] of data.news.articles.entries()) {
    assert(isObject(article), `News article ${index} must be an object.`)
    assert(typeof article.id === 'string', `News article ${index} id must be a string.`)
    assert(typeof article.title === 'string', `News article ${index} title must be a string.`)
    assert(typeof article.source === 'string', `News article ${index} source must be a string.`)
    assert(typeof article.link === 'string', `News article ${index} link must be a string.`)
    assert(typeof article.published_at === 'string', `News article ${index} published_at must be a string.`)
    assert(typeof article.summary === 'string', `News article ${index} summary must be a string.`)
    assert(
      article.image_url === undefined || article.image_url === null || typeof article.image_url === 'string',
      `News article ${index} image_url must be a string when present.`
    )
    assert(
      ['General', 'Injuries', 'Discipline', 'Transactions'].includes(article.category),
      `News article ${index} category is invalid.`
    )
  }
}

function validateSeasonBlock(block, season, blockLabel, knownSeasonTeams, rosterPlayerIds) {
  assert(isObject(block), `Season ${season} ${blockLabel} block must be an object.`)
  assert(Array.isArray(block.all_players), `Season ${season} ${blockLabel} all_players must be an array.`)
  assert(Array.isArray(block.stats), `Season ${season} ${blockLabel} stats must be an array.`)
  assert(isObject(block.game_logs), `Season ${season} ${blockLabel} game_logs must be an object.`)
  assert(isObject(block.shot_charts), `Season ${season} ${blockLabel} shot_charts must be an object.`)

  const playerIds = new Set(rosterPlayerIds)
  const allPlayerIds = new Set()
  const playerTeams = new Set()

  for (const player of block.all_players) {
    assert(isObject(player), `Season ${season} ${blockLabel} all_players entries must be objects.`)
    assert(Number.isInteger(player.player_id), `Season ${season} ${blockLabel} player_id must be an integer.`)
    assert(!allPlayerIds.has(player.player_id), `Season ${season} ${blockLabel} duplicate player_id ${player.player_id}.`)
    allPlayerIds.add(player.player_id)
    playerIds.add(player.player_id)
    assert(typeof player.name === 'string' && player.name.length > 0, `Season ${season} ${blockLabel} player ${player.player_id} missing name.`)
    assert(typeof player.team === 'string' && player.team.length > 0, `Season ${season} ${blockLabel} player ${player.player_id} missing team.`)
    playerTeams.add(normalizeTeamCode(player.team))
    assert(isFiniteNumber(player.gp) && player.gp >= 0, `Season ${season} ${blockLabel} player ${player.player_id} invalid GP.`)
    assert(isFiniteNumber(player.min) && player.min >= 0, `Season ${season} ${blockLabel} player ${player.player_id} invalid MIN.`)
  }

  for (const player of block.stats) {
    assert(isObject(player), `Season ${season} ${blockLabel} stats entries must be objects.`)
    assert(Number.isInteger(player.player_id), `Season ${season} ${blockLabel} stat player_id must be an integer.`)
    playerIds.add(player.player_id)
  }

  for (const team of playerTeams) {
    knownSeasonTeams.add(team)
  }

  for (const [playerId, logs] of Object.entries(block.game_logs)) {
    assert(playerIds.has(Number(playerId)), `Season ${season} ${blockLabel} game_logs contains unknown player_id ${playerId}.`)
    assert(Array.isArray(logs), `Season ${season} ${blockLabel} game_logs for player ${playerId} must be an array.`)

    const seenGames = new Set()
    for (const [index, game] of logs.entries()) {
      assert(isObject(game), `Season ${season} ${blockLabel} game log ${playerId}[${index}] must be an object.`)
      assert(typeof game.game_date === 'string', `Season ${season} ${blockLabel} game log ${playerId}[${index}] missing game_date.`)
      assert(typeof game.matchup === 'string', `Season ${season} ${blockLabel} game log ${playerId}[${index}] missing matchup.`)
      assert(game.wl === 'W' || game.wl === 'L', `Season ${season} ${blockLabel} game log ${playerId}[${index}] has invalid WL.`)
      const dedupeKey = `${game.game_date}|${game.matchup}`
      assert(!seenGames.has(dedupeKey), `Season ${season} ${blockLabel} duplicate game log entry for player ${playerId}: ${dedupeKey}.`)
      seenGames.add(dedupeKey)

      const opponent = parseOpponent(game.matchup)
      assert(opponent.length > 0, `Season ${season} ${blockLabel} game log ${playerId}[${index}] missing opponent in matchup.`)
      assert(isFiniteNumber(game.pts), `Season ${season} ${blockLabel} game log ${playerId}[${index}] invalid PTS.`)
      assert(isFiniteNumber(game.fga), `Season ${season} ${blockLabel} game log ${playerId}[${index}] invalid FGA.`)
    }
  }

  for (const [playerId, shots] of Object.entries(block.shot_charts)) {
    assert(playerIds.has(Number(playerId)), `Season ${season} ${blockLabel} shot_charts contains unknown player_id ${playerId}.`)
    assert(Array.isArray(shots), `Season ${season} ${blockLabel} shot_charts for player ${playerId} must be an array.`)

    for (const [index, shot] of shots.entries()) {
      assert(isObject(shot), `Season ${season} ${blockLabel} shot ${playerId}[${index}] must be an object.`)
      assert(typeof shot.shot_zone === 'string', `Season ${season} ${blockLabel} shot ${playerId}[${index}] missing shot_zone.`)
      assert(isFiniteNumber(shot.x), `Season ${season} ${blockLabel} shot ${playerId}[${index}] invalid x coordinate.`)
      assert(isFiniteNumber(shot.y), `Season ${season} ${blockLabel} shot ${playerId}[${index}] invalid y coordinate.`)
      assert(typeof shot.made === 'boolean', `Season ${season} ${blockLabel} shot ${playerId}[${index}] invalid made flag.`)
    }
  }
}

function validateDashboardData(data) {
  assert(isObject(data), 'Dashboard data must be an object.')
  assert(isObject(data.team), 'Dashboard team metadata is required.')
  assert(typeof data.team.current_season === 'string', 'Dashboard team.current_season is required.')
  assert(isObject(data.seasons), 'Dashboard seasons are required.')

  const knownSeasonTeams = new Set()

  for (const [season, seasonData] of Object.entries(data.seasons)) {
    if (seasonData == null) continue
    assert(isObject(seasonData), `Season ${season} must be an object when present.`)
    assert(Array.isArray(seasonData.roster), `Season ${season} roster must be an array.`)
    const rosterPlayerIds = new Set(
      seasonData.roster
        .map(player => (Number.isInteger(player?.player_id) ? player.player_id : null))
        .filter(playerId => playerId !== null)
    )

    validateSeasonBlock(seasonData.regular_season, season, 'regular_season', knownSeasonTeams, rosterPlayerIds)
    validateSeasonBlock(seasonData.playoffs, season, 'playoffs', knownSeasonTeams, rosterPlayerIds)
  }

  validateNews(data)
  return knownSeasonTeams
}

function validatePredictions(data, dashboardData, knownSeasonTeams) {
  assert(isObject(data), 'Predictions data must be an object.')
  assert(typeof data.season === 'string', 'Predictions season is required.')
  assert(isObject(data.forecasts), 'Predictions forecasts are required.')
  assert(data.season === dashboardData.team.current_season, 'Predictions season must match dashboard current season.')

  const currentSeason = dashboardData.seasons[data.season]
  assert(currentSeason != null, `Predictions season ${data.season} is missing from dashboard seasons.`)

  const currentSeasonTeams = new Set(
    currentSeason.regular_season.all_players.map(player => normalizeTeamCode(player.team))
  )

  assert(currentSeasonTeams.size >= 8, 'Current season should have at least 8 teams in all_players.')

  for (const [teamCode, venueForecasts] of Object.entries(data.forecasts)) {
    const normalizedTeam = normalizeTeamCode(teamCode)
    assert(currentSeasonTeams.has(normalizedTeam), `Predictions contain unknown current-season team ${teamCode}.`)
    assert(isObject(venueForecasts), `Predictions for ${teamCode} must be an object.`)

    for (const venue of ['home', 'away']) {
      assert(isObject(venueForecasts[venue]), `Predictions for ${teamCode}.${venue} must be an object.`)
      const opponentForecasts = venueForecasts[venue]

      for (const [opponentCode, forecast] of Object.entries(opponentForecasts)) {
        const normalizedOpponent = normalizeTeamCode(opponentCode)
        assert(currentSeasonTeams.has(normalizedOpponent), `Predictions contain unknown opponent ${opponentCode} for team ${teamCode}.`)
        assert(normalizedOpponent !== normalizedTeam, `Predictions should not contain self-matchup for ${teamCode}.`)
        assert(isObject(forecast), `Forecast ${teamCode}.${venue}.${opponentCode} must be an object.`)
        assert(isFiniteNumber(forecast.team_win_pct), `Forecast ${teamCode}.${venue}.${opponentCode} invalid team_win_pct.`)
        assert(isFiniteNumber(forecast.opponent_win_pct), `Forecast ${teamCode}.${venue}.${opponentCode} invalid opponent_win_pct.`)
        assert(
          Math.abs((forecast.team_win_pct + forecast.opponent_win_pct) - 100) < 0.25,
          `Forecast ${teamCode}.${venue}.${opponentCode} win percentages must sum to ~100.`
        )
        assert(Array.isArray(forecast.reasons), `Forecast ${teamCode}.${venue}.${opponentCode} reasons must be an array.`)
      }
    }
  }

  for (const team of currentSeasonTeams) {
    assert(team === normalizeTeamCode(team), `Team normalization produced unstable code for ${team}.`)
    assert(knownSeasonTeams.has(team), `Current-season team ${team} missing from known season team set.`)
  }
}

async function main() {
  const dashboardData = await readJson('src/data/wnba_data.json')
  const predictions = await readJson('src/data/team_predictions.json')

  const knownSeasonTeams = validateDashboardData(dashboardData)
  validatePredictions(predictions, dashboardData, knownSeasonTeams)

  console.log('Smoke data validation passed.')
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
