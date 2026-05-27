"""
Fetch Indiana Fever roster and player stats from WNBA endpoints.
Uses nba_api which supports WNBA via league_id='10'.

Data source: Official WNBA stats (stats.wnba.com)
"""

import json
import os
import time
from pathlib import Path

from nba_api.stats.endpoints import (
    commonteamroster,
    playercareerstats,
    playergamelog,
    shotchartdetail,
    leaguedashplayerstats,
)
from nba_api.stats.static import teams

OUTPUT_DIR = Path(__file__).parent.parent / "src" / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Indiana Fever team ID in the WNBA
FEVER_TEAM_ID = 1611661325
WNBA_LEAGUE_ID = "10"
SEASON = "2024"


def fetch_roster():
    """Fetch Indiana Fever roster for the 2024 season."""
    print("Fetching Indiana Fever roster...")
    roster = commonteamroster.CommonTeamRoster(
        team_id=FEVER_TEAM_ID,
        season=SEASON,
        league_id_nullable=WNBA_LEAGUE_ID,
    )
    time.sleep(1)  # Rate limiting

    roster_data = roster.get_normalized_dict()
    players = roster_data["CommonTeamRoster"]

    # Clean up the data
    roster_list = []
    for p in players:
        roster_list.append({
            "player_id": p["PLAYER_ID"],
            "name": p["PLAYER"],
            "number": p["NUM"],
            "position": p["POSITION"],
            "height": p["HEIGHT"],
            "weight": p["WEIGHT"],
            "age": p["AGE"],
            "experience": p["EXP"],
            "school": p["SCHOOL"],
        })

    return roster_list


def fetch_player_season_stats():
    """Fetch season stats for all Indiana Fever players."""
    print("Fetching league-wide player stats for Fever players...")
    stats = leaguedashplayerstats.LeagueDashPlayerStats(
        team_id_nullable=FEVER_TEAM_ID,
        season=SEASON,
        season_type_all_star="Regular Season",
        league_id_nullable=WNBA_LEAGUE_ID,
    )
    time.sleep(1)

    stats_data = stats.get_normalized_dict()
    player_stats = stats_data["LeagueDashPlayerStats"]

    cleaned = []
    for s in player_stats:
        cleaned.append({
            "player_id": s["PLAYER_ID"],
            "name": s["PLAYER_NAME"],
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

    return cleaned


def fetch_player_game_logs(player_id, player_name):
    """Fetch game-by-game stats for a specific player."""
    print(f"  Fetching game log for {player_name}...")
    gamelog = playergamelog.PlayerGameLog(
        player_id=player_id,
        season=SEASON,
        season_type_all_star="Regular Season",
        league_id_nullable=WNBA_LEAGUE_ID,
    )
    time.sleep(1)

    log_data = gamelog.get_normalized_dict()
    games = log_data["PlayerGameLog"]

    cleaned = []
    for g in games:
        cleaned.append({
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

    return cleaned


def fetch_shot_chart(player_id, player_name):
    """Fetch shot chart data for a specific player."""
    print(f"  Fetching shot chart for {player_name}...")
    shots = shotchartdetail.ShotChartDetail(
        team_id=FEVER_TEAM_ID,
        player_id=player_id,
        season_nullable=SEASON,
        season_type_all_star="Regular Season",
        league_id=WNBA_LEAGUE_ID,
        context_measure_simple="FGA",
    )
    time.sleep(1)

    shot_data = shots.get_normalized_dict()
    shot_list = shot_data["Shot_Chart_Detail"]

    cleaned = []
    for s in shot_list:
        cleaned.append({
            "game_date": s["GAME_DATE"],
            "shot_type": s["ACTION_TYPE"],
            "shot_zone": s["SHOT_ZONE_BASIC"],
            "shot_zone_area": s["SHOT_ZONE_AREA"],
            "shot_zone_range": s["SHOT_ZONE_RANGE"],
            "shot_distance": s["SHOT_DISTANCE"],
            "x": s["LOC_X"],
            "y": s["LOC_Y"],
            "made": s["SHOT_MADE_FLAG"] == 1,
            "quarter": s["PERIOD"],
        })

    return cleaned


def fetch_league_averages():
    """Fetch league average stats for comparison."""
    print("Fetching WNBA league averages...")
    stats = leaguedashplayerstats.LeagueDashPlayerStats(
        season=SEASON,
        season_type_all_star="Regular Season",
        league_id_nullable=WNBA_LEAGUE_ID,
    )
    time.sleep(1)

    stats_data = stats.get_normalized_dict()
    all_players = stats_data["LeagueDashPlayerStats"]

    # Calculate league averages from all players who played 10+ games
    qualified = [p for p in all_players if p["GP"] >= 10]

    if not qualified:
        return {}

    n = len(qualified)
    averages = {
        "pts": round(sum(p["PTS"] for p in qualified) / n, 1),
        "reb": round(sum(p["REB"] for p in qualified) / n, 1),
        "ast": round(sum(p["AST"] for p in qualified) / n, 1),
        "stl": round(sum(p["STL"] for p in qualified) / n, 1),
        "blk": round(sum(p["BLK"] for p in qualified) / n, 1),
        "fg_pct": round(sum(p["FG_PCT"] for p in qualified) / n, 3),
        "fg3_pct": round(sum(p["FG3_PCT"] for p in qualified) / n, 3),
        "ft_pct": round(sum(p["FT_PCT"] for p in qualified) / n, 3),
    }

    return averages


def main():
    print("=" * 50)
    print("WNBA Data Fetcher - Indiana Fever 2024")
    print("=" * 50)
    print()

    # 1. Fetch roster
    roster = fetch_roster()
    print(f"  Found {len(roster)} players")
    print()

    # 2. Fetch season stats
    season_stats = fetch_player_season_stats()
    print(f"  Found stats for {len(season_stats)} players")
    print()

    # 3. Fetch league averages
    league_avg = fetch_league_averages()
    print(f"  League averages computed")
    print()

    # 4. Fetch game logs and shot charts for each player
    game_logs = {}
    shot_charts = {}

    for player in roster:
        pid = player["player_id"]
        pname = player["name"]

        try:
            game_logs[str(pid)] = fetch_player_game_logs(pid, pname)
        except Exception as e:
            print(f"  WARNING: Could not fetch game log for {pname}: {e}")
            game_logs[str(pid)] = []

        try:
            shot_charts[str(pid)] = fetch_shot_chart(pid, pname)
        except Exception as e:
            print(f"  WARNING: Could not fetch shot chart for {pname}: {e}")
            shot_charts[str(pid)] = []

    # 5. Save all data
    output = {
        "team": {
            "id": FEVER_TEAM_ID,
            "name": "Indiana Fever",
            "abbreviation": "IND",
            "season": SEASON,
        },
        "roster": roster,
        "season_stats": season_stats,
        "league_averages": league_avg,
        "game_logs": game_logs,
        "shot_charts": shot_charts,
    }

    output_file = OUTPUT_DIR / "fever_data.json"
    with open(output_file, "w") as f:
        json.dump(output, f, indent=2)

    print()
    print(f"Data saved to {output_file}")
    print(f"Total file size: {output_file.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
