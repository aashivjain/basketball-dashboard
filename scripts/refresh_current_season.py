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
import sys
import time
from datetime import datetime
from pathlib import Path

from nba_api.stats.endpoints import (
    leaguedashplayerstats,
    playergamelog,
    shotchartdetail,
)

DATA_FILE = Path(__file__).parent.parent / "src" / "data" / "fever_data.json"
WNBA_LEAGUE_ID = "10"
CURRENT_SEASON = "2026"

FAST_MODE = "--fast" in sys.argv


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
    shots = shotchartdetail.ShotChartDetail(
        team_id=0,
        player_id=player_id,
        season_nullable=season,
        season_type_all_star="Regular Season",
        league_id=WNBA_LEAGUE_ID,
        context_measure_simple="FGA",
        timeout=30,
    )
    time.sleep(0.6)

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
        for i, p in enumerate(stale_pids):
            pid = str(p["player_id"])
            try:
                charts = fetch_shot_chart(p["player_id"], CURRENT_SEASON)
                shot_charts[pid] = charts
                if (i + 1) % 25 == 0:
                    print(f"      {i + 1}/{len(stale_pids)} done...")
                    # Save progress
                    reg["shot_charts"] = shot_charts
                    with open(DATA_FILE, "w") as f:
                        json.dump(data, f)
            except Exception as e:
                print(f"      ERROR: {p['name']} - {e}")
                if pid not in shot_charts:
                    shot_charts[pid] = []
                errors += 1

        reg["shot_charts"] = shot_charts
        print(f"      Done. {len(stale_pids) - errors} updated, {errors} errors.")
    else:
        print("\n[3/3] Skipping shot charts (fast mode)")

    # Save + timestamp
    data["last_updated"] = datetime.now().isoformat()
    with open(DATA_FILE, "w") as f:
        json.dump(data, f)

    elapsed = (datetime.now() - start).total_seconds()
    print(f"\n{'=' * 50}")
    print(f"Done in {elapsed:.0f}s. Data saved to {DATA_FILE.name}")
    print(f"Updated {len(stale_pids)}/{len(players)} players. Last updated: {data['last_updated']}")

    # Save + timestamp
    data["last_updated"] = datetime.now().isoformat()
    with open(DATA_FILE, "w") as f:
        json.dump(data, f)

    elapsed = (datetime.now() - start).total_seconds()
    print(f"\n{'=' * 50}")
    print(f"Done in {elapsed:.0f}s. Data saved to {DATA_FILE.name}")
    print(f"Last updated: {data['last_updated']}")


if __name__ == "__main__":
    main()
