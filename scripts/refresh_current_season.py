"""
Refresh current WNBA season data (2026).
Designed to run daily or on-demand to keep mid-season stats up to date.

INCREMENTAL: Compares existing game counts against API data and only re-fetches
game logs/shots for players whose GP changed (i.e. played a new game).

Usage:
  python scripts/refresh_current_season.py        # full refresh
  python scripts/refresh_current_season.py --fast # stats + game logs only (skip shots)
"""

import json
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

from nba_api.stats.endpoints import (
    leaguedashplayerstats,
    playergamelog,
    shotchartdetail,
)

DATA_FILE = Path(__file__).parent.parent / "src" / "data" / "wnba_data.json"
WNBA_LEAGUE_ID = "10"
CURRENT_SEASON = "2026"
PYTHON = sys.executable

FAST_MODE = "--fast" in sys.argv
SHOT_RETRY_ATTEMPTS = 4
SHOT_RETRY_BASE_DELAY = 4
SHOT_REQUEST_TIMEOUT = 60
SHOT_CHART_WORKERS = 3


def write_json_atomic(path, payload, *, indent=None):
    temp_path = path.with_suffix(f"{path.suffix}.tmp")
    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=indent)
    temp_path.replace(path)


def fetch_all_players(season, season_type="Regular Season"):
    stats = leaguedashplayerstats.LeagueDashPlayerStats(
        season=season,
        season_type_all_star=season_type,
        league_id_nullable=WNBA_LEAGUE_ID,
        per_mode_detailed="PerGame",
    )
    time.sleep(1.0)

    rows = stats.get_normalized_dict()["LeagueDashPlayerStats"]
    out = []
    for s in rows:
        if s["GP"] < 1:
            continue
        out.append({
            "player_id": s["PLAYER_ID"],
            "name": s["PLAYER_NAME"],
            "team": s["TEAM_ABBREVIATION"],
            "gp": s["GP"],
            "min": s["MIN"],
            "pts": s["PTS"],
            "reb": s["REB"],
            "ast": s["AST"],
            "stl": s["STL"],
            "blk": s["BLK"],
            "tov": s["TOV"],
            "fgm": s["FGM"],
            "fga": s["FGA"],
            "fg_pct": s["FG_PCT"],
            "fg3m": s["FG3M"],
            "fg3a": s["FG3A"],
            "fg3_pct": s["FG3_PCT"],
            "ftm": s["FTM"],
            "fta": s["FTA"],
            "ft_pct": s["FT_PCT"],
            "oreb": s["OREB"],
            "dreb": s["DREB"],
            "pf": s["PF"],
            "plus_minus": s["PLUS_MINUS"],
        })
    return out


def fetch_game_log(player_id, season):
    gamelog = playergamelog.PlayerGameLog(
        player_id=player_id,
        season=season,
        season_type_all_star="Regular Season",
        league_id_nullable=WNBA_LEAGUE_ID,
    )
    time.sleep(0.6)

    games = gamelog.get_normalized_dict()["PlayerGameLog"]
    out = []
    for g in games:
        out.append({
            "game_date": g["GAME_DATE"],
            "matchup": g["MATCHUP"],
            "wl": g["WL"],
            "min": g["MIN"],
            "pts": g["PTS"],
            "reb": g["REB"],
            "ast": g["AST"],
            "stl": g["STL"],
            "blk": g["BLK"],
            "tov": g["TOV"],
            "fgm": g["FGM"],
            "fga": g["FGA"],
            "fg_pct": g["FG_PCT"],
            "fg3m": g["FG3M"],
            "fg3a": g["FG3A"],
            "fg3_pct": g["FG3_PCT"],
            "ftm": g["FTM"],
            "fta": g["FTA"],
            "ft_pct": g["FT_PCT"],
            "plus_minus": g["PLUS_MINUS"],
        })
    return out


def fetch_shot_chart(player_id, season):
    last_error = None

    for attempt in range(1, SHOT_RETRY_ATTEMPTS + 1):
        try:
            shots = shotchartdetail.ShotChartDetail(
                team_id=0,
                player_id=player_id,
                season_nullable=season,
                season_type_all_star="Regular Season",
                league_id=WNBA_LEAGUE_ID,
                context_measure_simple="FGA",
                timeout=SHOT_REQUEST_TIMEOUT,
            )
            time.sleep(0.25)

            shot_list = shots.get_normalized_dict()["Shot_Chart_Detail"]
            out = []
            for s in shot_list:
                out.append({
                    "game_date": s.get("GAME_DATE", ""),
                    "shot_type": s["ACTION_TYPE"],
                    "shot_zone": s["SHOT_ZONE_BASIC"],
                    "shot_zone_area": s.get("SHOT_ZONE_AREA", ""),
                    "shot_zone_range": s.get("SHOT_ZONE_RANGE", ""),
                    "shot_distance": s["SHOT_DISTANCE"],
                    "x": s["LOC_X"],
                    "y": s["LOC_Y"],
                    "made": s["SHOT_MADE_FLAG"] == 1,
                    "quarter": s.get("PERIOD", 0),
                })
            return out
        except Exception as error:
            last_error = error
            if attempt == SHOT_RETRY_ATTEMPTS:
                break

            delay = SHOT_RETRY_BASE_DELAY * attempt
            print(f"      Retry {attempt}/{SHOT_RETRY_ATTEMPTS - 1} for shot chart {player_id} after error: {error}")
            time.sleep(delay)

    raise last_error


def fetch_shot_chart_job(player, season):
    pid = str(player["player_id"])
    charts = fetch_shot_chart(player["player_id"], season)
    return pid, player["name"], charts


def main():
    start = datetime.now()
    mode = "FAST (stats + game logs)" if FAST_MODE else "FULL (stats + game logs + shots)"
    print(f"[{start.strftime('%Y-%m-%d %H:%M')}] Refreshing {CURRENT_SEASON} season data ({mode})")
    print("=" * 50)

    with open(DATA_FILE) as f:
        data = json.load(f)

    season_data = data["seasons"].get(CURRENT_SEASON)
    if not season_data:
        print(f"ERROR: No {CURRENT_SEASON} season entry in data file.")
        sys.exit(1)

    reg = season_data["regular_season"]

    # Build lookup of existing player GP to detect who needs updating
    old_players = {str(p["player_id"]): p for p in reg.get("all_players", [])}
    old_game_logs = reg.get("game_logs", {})
    old_shot_charts = reg.get("shot_charts", {})

    # Step 1: Refresh league player stats (always — this is one fast API call)
    print("\n[1/3] Refreshing player stats...")
    players = fetch_all_players(CURRENT_SEASON)
    reg["all_players"] = players
    print(f"      {len(players)} players found")

    # Determine which players have new games (GP increased or new player)
    stale_pids = []
    for p in players:
        pid = str(p["player_id"])
        old = old_players.get(pid)
        if old is None or p["gp"] != old["gp"]:
            stale_pids.append(p)

    print(f"      {len(stale_pids)} players have new game data (out of {len(players)})")

    # Step 2: Refresh game logs only for stale players
    print(f"\n[2/3] Refreshing game logs for {len(stale_pids)} updated players...")
    game_logs = dict(old_game_logs)  # keep existing, overwrite stale
    errors = 0
    for i, p in enumerate(stale_pids):
        pid = str(p["player_id"])
        try:
            logs = fetch_game_log(p["player_id"], CURRENT_SEASON)
            game_logs[pid] = logs
            if (i + 1) % 25 == 0:
                print(f"      {i + 1}/{len(stale_pids)} done...")
        except Exception as e:
            print(f"      ERROR: {p['name']} - {e}")
            # Keep old data if fetch fails
            if pid not in game_logs:
                game_logs[pid] = []
            errors += 1

    reg["game_logs"] = game_logs
    print(f"      Done. {len(stale_pids) - errors} updated, {errors} errors, {len(players) - len(stale_pids)} unchanged.")

    # Step 3: Refresh shot charts only for stale players (skip in fast mode)
    if not FAST_MODE:
        print(f"\n[3/3] Refreshing shot charts for {len(stale_pids)} updated players...")
        shot_charts = dict(old_shot_charts)  # keep existing, overwrite stale
        errors = 0
        completed = 0
        with ThreadPoolExecutor(max_workers=SHOT_CHART_WORKERS) as executor:
            future_map = {
                executor.submit(fetch_shot_chart_job, player, CURRENT_SEASON): player
                for player in stale_pids
            }

            for future in as_completed(future_map):
                player = future_map[future]
                pid = str(player["player_id"])
                completed += 1
                try:
                    fetched_pid, _player_name, charts = future.result()
                    shot_charts[fetched_pid] = charts
                except Exception as e:
                    print(f"      ERROR: {player['name']} - {e}")
                    print("      Keeping previous shot chart data for this player and continuing.")
                    if pid not in shot_charts:
                        shot_charts[pid] = []
                    errors += 1

                if completed % 10 == 0:
                    reg["shot_charts"] = shot_charts
                    write_json_atomic(DATA_FILE, data)
                    print(f"      Saved shot chart progress at {completed}/{len(stale_pids)} players...")

                if completed % 25 == 0:
                    print(f"      {completed}/{len(stale_pids)} done...")

        reg["shot_charts"] = shot_charts
        print(f"      Done. {len(stale_pids) - errors} updated, {errors} errors.")
    else:
        print("\n[3/3] Skipping shot charts (fast mode)")

    # Save + timestamp
    data["last_updated"] = datetime.now().isoformat()
    write_json_atomic(DATA_FILE, data)

    print("\n[4/4] Recomputing team forecast models...")
    result = subprocess.run([PYTHON, str(Path(__file__).parent / "train_team_forecasts.py")], cwd=Path(__file__).parent.parent)
    if result.returncode != 0:
        print(f"WARNING: forecast recompute failed with code {result.returncode}")

    elapsed = (datetime.now() - start).total_seconds()
    print(f"\n{'=' * 50}")
    print(f"Done in {elapsed:.0f}s. Data saved to {DATA_FILE.name}")
    print(f"Updated {len(stale_pids)}/{len(players)} players. Last updated: {data['last_updated']}")


if __name__ == "__main__":
    main()
