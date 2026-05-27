"""
Fetch Indiana Fever roster and player stats from WNBA endpoints.
Uses nba_api which supports WNBA via league_id='10'.

Data source: Official WNBA stats (stats.wnba.com)
"""

import json
import time
from pathlib import Path

from nba_api.stats.endpoints import (
    commonteamroster,
    playergamelog,
    shotchartdetail,
    leaguedashplayerstats,
)

OUTPUT_DIR = Path(__file__).parent.parent / "src" / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

FEVER_TEAM_ID = 1611661325
WNBA_LEAGUE_ID = "10"

# Seasons to fetch for year-over-year growth
SEASONS = ["2024", "2025", "2026"]
CURRENT_SEASON = "2026"


def fetch_roster(season):
    """Fetch Indiana Fever roster."""
    print(f"  Fetching roster for {season}...")
    roster = commonteamroster.CommonTeamRoster(
        team_id=FEVER_TEAM_ID,
        season=season,
        league_id_nullable=WNBA_LEAGUE_ID,
    )
    time.sleep(0.8)

    players = roster.get_normalized_dict()["CommonTeamRoster"]
    out = []
    for p in players:
        out.append({
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
    return out


def fetch_player_stats(season, season_type="Regular Season"):
    """Fetch per-game stats for Fever players."""
    print(f"  Fetching player stats ({season} - {season_type})...")
    stats = leaguedashplayerstats.LeagueDashPlayerStats(
        team_id_nullable=FEVER_TEAM_ID,
        season=season,
        season_type_all_star=season_type,
        league_id_nullable=WNBA_LEAGUE_ID,
        per_mode_detailed="PerGame",
    )
    time.sleep(0.8)

    rows = stats.get_normalized_dict()["LeagueDashPlayerStats"]
    out = []
    for s in rows:
        out.append({
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
    return out


def fetch_league_averages(season, season_type="Regular Season"):
    """Fetch league-wide per-game averages for comparison."""
    print(f"  Fetching league averages ({season} - {season_type})...")
    stats = leaguedashplayerstats.LeagueDashPlayerStats(
        season=season,
        season_type_all_star=season_type,
        league_id_nullable=WNBA_LEAGUE_ID,
        per_mode_detailed="PerGame",
    )
    time.sleep(0.8)

    all_players = stats.get_normalized_dict()["LeagueDashPlayerStats"]
    # only count players with meaningful minutes
    qualified = [p for p in all_players if p["GP"] >= 10 and p["MIN"] >= 15.0]

    if not qualified:
        qualified = [p for p in all_players if p["GP"] >= 5]

    if not qualified:
        return {}

    n = len(qualified)
    return {
        "pts": round(sum(p["PTS"] for p in qualified) / n, 1),
        "reb": round(sum(p["REB"] for p in qualified) / n, 1),
        "ast": round(sum(p["AST"] for p in qualified) / n, 1),
        "stl": round(sum(p["STL"] for p in qualified) / n, 1),
        "blk": round(sum(p["BLK"] for p in qualified) / n, 1),
        "fg_pct": round(sum(p["FG_PCT"] for p in qualified) / n, 3),
        "fg3_pct": round(sum(p["FG3_PCT"] for p in qualified) / n, 3),
        "ft_pct": round(sum(p["FT_PCT"] for p in qualified) / n, 3),
    }


def fetch_game_logs(player_id, player_name, season, season_type="Regular Season"):
    """Fetch game-by-game stats."""
    print(f"    {player_name} game log ({season} {season_type})...")
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


def fetch_shot_chart(player_id, player_name, season, season_type="Regular Season"):
    """Fetch shot chart data with x,y coordinates."""
    print(f"    {player_name} shot chart ({season} {season_type})...")
    shots = shotchartdetail.ShotChartDetail(
        team_id=FEVER_TEAM_ID,
        player_id=player_id,
        season_nullable=season,
        season_type_all_star=season_type,
        league_id=WNBA_LEAGUE_ID,
        context_measure_simple="FGA",
    )
    time.sleep(0.6)

    shot_list = shots.get_normalized_dict()["Shot_Chart_Detail"]
    out = []
    for s in shot_list:
        out.append({
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
    return out


def fetch_season_data(season):
    """Fetch all data for one season (regular + playoffs)."""
    print(f"\n{'='*40}")
    print(f"Season: {season}")
    print(f"{'='*40}")

    roster = fetch_roster(season)
    print(f"  Roster: {len(roster)} players")

    # Regular season
    reg_stats = fetch_player_stats(season, "Regular Season")
    reg_league_avg = fetch_league_averages(season, "Regular Season")

    # Playoffs
    playoff_stats = fetch_player_stats(season, "Playoffs")
    playoff_league_avg = fetch_league_averages(season, "Playoffs")

    # Per-player detailed data
    game_logs = {}
    shot_charts = {}
    playoff_game_logs = {}
    playoff_shot_charts = {}

    for player in roster:
        pid = player["player_id"]
        name = player["name"]

        # Regular season logs + shots
        try:
            game_logs[str(pid)] = fetch_game_logs(pid, name, season, "Regular Season")
        except Exception as e:
            print(f"    WARN: {name} game log failed: {e}")
            game_logs[str(pid)] = []

        try:
            shot_charts[str(pid)] = fetch_shot_chart(pid, name, season, "Regular Season")
        except Exception as e:
            print(f"    WARN: {name} shot chart failed: {e}")
            shot_charts[str(pid)] = []

        # Playoff logs + shots
        try:
            playoff_game_logs[str(pid)] = fetch_game_logs(pid, name, season, "Playoffs")
        except Exception as e:
            playoff_game_logs[str(pid)] = []

        try:
            playoff_shot_charts[str(pid)] = fetch_shot_chart(pid, name, season, "Playoffs")
        except Exception as e:
            playoff_shot_charts[str(pid)] = []

    return {
        "roster": roster,
        "regular_season": {
            "stats": reg_stats,
            "league_averages": reg_league_avg,
            "game_logs": game_logs,
            "shot_charts": shot_charts,
        },
        "playoffs": {
            "stats": playoff_stats,
            "league_averages": playoff_league_avg,
            "game_logs": playoff_game_logs,
            "shot_charts": playoff_shot_charts,
        },
    }


def main():
    print("WNBA Data Fetcher - Indiana Fever")
    print(f"Seasons: {', '.join(SEASONS)}")
    print()

    all_data = {
        "team": {
            "id": FEVER_TEAM_ID,
            "name": "Indiana Fever",
            "abbreviation": "IND",
            "current_season": CURRENT_SEASON,
        },
        "seasons": {},
    }

    for season in SEASONS:
        try:
            all_data["seasons"][season] = fetch_season_data(season)
        except Exception as e:
            print(f"\n  ERROR fetching {season}: {e}")
            all_data["seasons"][season] = None

    output_file = OUTPUT_DIR / "fever_data.json"
    with open(output_file, "w") as f:
        json.dump(all_data, f, indent=2)

    print(f"\nDone. Saved to {output_file}")
    print(f"File size: {output_file.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
