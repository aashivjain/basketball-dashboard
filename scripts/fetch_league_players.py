"""
Add league-wide player stats to existing fever_data.json.
This allows comparing Fever players against anyone in the WNBA.
"""

import json
import time
from pathlib import Path

from nba_api.stats.endpoints import leaguedashplayerstats

DATA_FILE = Path(__file__).parent.parent / "src" / "data" / "fever_data.json"
WNBA_LEAGUE_ID = "10"
SEASONS = ["2024", "2025", "2026"]


def fetch_all_players(season, season_type="Regular Season"):
    print(f"  Fetching all WNBA players ({season} - {season_type})...")
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
        if s["GP"] < 3:
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


def main():
    print("Fetching league-wide player stats...")
    with open(DATA_FILE) as f:
        data = json.load(f)

    for season in SEASONS:
        if data["seasons"].get(season) is None:
            continue

        reg = fetch_all_players(season, "Regular Season")
        data["seasons"][season]["regular_season"]["all_players"] = reg
        print(f"    {season} Regular: {len(reg)} players")

        playoff = fetch_all_players(season, "Playoffs")
        data["seasons"][season]["playoffs"]["all_players"] = playoff
        print(f"    {season} Playoffs: {len(playoff)} players")

    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

    print(f"\nDone. File size: {DATA_FILE.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
