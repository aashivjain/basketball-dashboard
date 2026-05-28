"""
Fetch shot chart data for all WNBA players across all seasons.
Adds shot_charts keyed by player_id to each season's regular_season block.
Usage: python fetch_all_shots.py [season]
  If season is omitted, fetches for all available seasons.
"""

import json
import sys
import time
from pathlib import Path

from nba_api.stats.endpoints import shotchartdetail

DATA_FILE = Path(__file__).parent.parent / "src" / "data" / "fever_data.json"
WNBA_LEAGUE_ID = "10"


def fetch_shot_chart(player_id, player_name, season, team_id=0):
    for attempt in range(3):
        try:
            shots = shotchartdetail.ShotChartDetail(
                team_id=team_id,
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

    all_shot_charts = season_data["regular_season"].get("shot_charts", {})

    fetched = 0
    errors = 0
    for i, p in enumerate(all_players):
        pid = str(p["player_id"])
        if pid in all_shot_charts and len(all_shot_charts[pid]) > 0:
            continue

        try:
            charts = fetch_shot_chart(p["player_id"], p["name"], season)
            all_shot_charts[pid] = charts
            fetched += 1
            print(f"  [{i+1}/{len(all_players)}] {p['name']}: {len(charts)} shots")
        except Exception as e:
            print(f"  [{i+1}/{len(all_players)}] {p['name']}: ERROR - {e}")
            all_shot_charts[pid] = []
            errors += 1

        if fetched > 0 and fetched % 20 == 0:
            season_data["regular_season"]["shot_charts"] = all_shot_charts
            with open(DATA_FILE, "w") as f:
                json.dump(data, f)
            print(f"    [saved progress: {fetched} fetched]")

    season_data["regular_season"]["shot_charts"] = all_shot_charts
    with open(DATA_FILE, "w") as f:
        json.dump(data, f)

    print(f"  Done {season}: {fetched} new, {errors} errors.")


def main():
    with open(DATA_FILE) as f:
        data = json.load(f)

    seasons = sys.argv[1:] if len(sys.argv) > 1 else sorted(data["seasons"].keys())
    print(f"Fetching shot charts for seasons: {', '.join(seasons)}")

    for season in seasons:
        fetch_season(data, season)

    size_kb = DATA_FILE.stat().st_size / 1024
    print(f"\nAll done. File size: {size_kb:.1f} KB")


if __name__ == "__main__":
    main()
