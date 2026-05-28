"""
Fetch game log data for all WNBA players across all seasons.
Adds game_logs keyed by player_id to each season's regular_season block.
Usage: python fetch_game_logs.py [season]
  If season is omitted, fetches for all available seasons.
"""

import json
import sys
import time
from pathlib import Path

from nba_api.stats.endpoints import playergamelog

DATA_FILE = Path(__file__).parent.parent / "src" / "data" / "fever_data.json"
WNBA_LEAGUE_ID = "10"


def fetch_game_log(player_id, player_name, season, season_type="Regular Season"):
    for attempt in range(3):
        try:
            gamelog = playergamelog.PlayerGameLog(
                player_id=player_id,
                season=season,
                season_type_all_star=season_type,
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
        except Exception as e:
            if attempt < 2:
                print(f"    Retry {attempt+1} for {player_name}: {e}")
                time.sleep(3)
            else:
                raise


def fetch_season(data, season):
    season_data = data["seasons"].get(season)
    if not season_data:
        print(f"  No {season} season data found, skipping")
        return

    all_players = season_data["regular_season"].get("all_players", [])
    if not all_players:
        print(f"  No players in {season}, skipping")
        return

    print(f"\n  === {season} Regular Season: {len(all_players)} players ===")

    game_logs = season_data["regular_season"].get("game_logs", {})

    fetched = 0
    errors = 0
    for i, p in enumerate(all_players):
        pid = str(p["player_id"])
        if pid in game_logs and len(game_logs[pid]) > 0:
            continue

        try:
            logs = fetch_game_log(p["player_id"], p["name"], season)
            game_logs[pid] = logs
            fetched += 1
            print(f"  [{i+1}/{len(all_players)}] {p['name']}: {len(logs)} games")
        except Exception as e:
            print(f"  [{i+1}/{len(all_players)}] {p['name']}: ERROR - {e}")
            game_logs[pid] = []
            errors += 1

        if fetched > 0 and fetched % 20 == 0:
            season_data["regular_season"]["game_logs"] = game_logs
            with open(DATA_FILE, "w") as f:
                json.dump(data, f)
            print(f"    [saved progress: {fetched} fetched]")

    season_data["regular_season"]["game_logs"] = game_logs
    with open(DATA_FILE, "w") as f:
        json.dump(data, f)

    print(f"  Done {season}: {fetched} new, {errors} errors.")


def main():
    with open(DATA_FILE) as f:
        data = json.load(f)

    seasons = list(data["seasons"].keys())

    if len(sys.argv) > 1:
        seasons = [s for s in sys.argv[1:] if s in seasons]

    print(f"Fetching game logs for seasons: {seasons}")
    for season in sorted(seasons):
        fetch_season(data, season)

    print("\nAll done.")


if __name__ == "__main__":
    main()
