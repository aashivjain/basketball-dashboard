"""
Fetch shot chart data for all 2026 WNBA players.
Adds shot_charts to the all_players data for the 2026 regular season.
"""

import json
import time
from pathlib import Path

from nba_api.stats.endpoints import shotchartdetail

DATA_FILE = Path(__file__).parent.parent / "src" / "data" / "fever_data.json"
WNBA_LEAGUE_ID = "10"
SEASON = "2026"


def fetch_shot_chart(player_id, player_name, team_id=0):
    for attempt in range(3):
        try:
            shots = shotchartdetail.ShotChartDetail(
                team_id=team_id,
                player_id=player_id,
                season_nullable=SEASON,
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
                    "x": s["LOC_X"],
                    "y": s["LOC_Y"],
                    "made": s["SHOT_MADE_FLAG"] == 1,
                    "shot_zone": s["SHOT_ZONE_BASIC"],
                    "shot_distance": s["SHOT_DISTANCE"],
                    "shot_type": s["ACTION_TYPE"],
                })
            return out
        except Exception as e:
            if attempt < 2:
                print(f"    Retry {attempt+1} for {player_name}: {e}")
                time.sleep(3)
            else:
                raise


def main():
    print("Fetching shot charts for all 2026 WNBA players...")
    with open(DATA_FILE) as f:
        data = json.load(f)

    season_data = data["seasons"]["2026"]
    if not season_data:
        print("No 2026 season data found")
        return

    all_players = season_data["regular_season"]["all_players"]
    print(f"  {len(all_players)} players to fetch")

    # store shot charts keyed by player_id
    all_shot_charts = season_data["regular_season"].get("shot_charts", {})

    fetched = 0
    errors = 0
    for i, p in enumerate(all_players):
        pid = str(p["player_id"])
        if pid in all_shot_charts and len(all_shot_charts[pid]) > 0:
            continue  # already have data

        try:
            charts = fetch_shot_chart(p["player_id"], p["name"])
            all_shot_charts[pid] = charts
            fetched += 1
            if charts:
                print(f"  [{i+1}/{len(all_players)}] {p['name']}: {len(charts)} shots")
            else:
                print(f"  [{i+1}/{len(all_players)}] {p['name']}: 0 shots")
        except Exception as e:
            print(f"  [{i+1}/{len(all_players)}] {p['name']}: ERROR - {e}")
            all_shot_charts[pid] = []
            errors += 1

        # save every 20 players
        if fetched > 0 and fetched % 20 == 0:
            season_data["regular_season"]["shot_charts"] = all_shot_charts
            data["seasons"]["2026"] = season_data
            with open(DATA_FILE, "w") as f:
                json.dump(data, f, indent=2)
            print(f"    [saved progress: {fetched} fetched]")

    season_data["regular_season"]["shot_charts"] = all_shot_charts
    data["seasons"]["2026"] = season_data

    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

    print(f"\nDone. Fetched {fetched} new, {errors} errors.")
    print(f"File size: {DATA_FILE.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
