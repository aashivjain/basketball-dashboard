"""
Master data fetch script. Runs all data ingestion in the correct order.
1. Fetch Indiana Fever roster + stats + game logs + shot charts (per season)
2. Fetch league-wide player stats for all seasons
3. Fetch shot charts for all players across all seasons
"""

import subprocess
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
PYTHON = sys.executable


def run(script, desc):
    print(f"\n{'='*50}")
    print(f"  {desc}")
    print(f"{'='*50}\n")
    result = subprocess.run([PYTHON, str(SCRIPTS_DIR / script)], cwd=SCRIPTS_DIR.parent)
    if result.returncode != 0:
        print(f"\n  ERROR: {script} failed with code {result.returncode}")
        sys.exit(1)


def main():
    print("WNBA Analytics - Full Data Fetch")
    print("This will take 15-30 minutes depending on API response times.\n")

    run("fetch_data.py", "Step 1: Fetching Indiana Fever data (roster, stats, game logs)")
    run("fetch_league_players.py", "Step 2: Fetching league-wide player stats")
    run("fetch_all_shots.py", "Step 3: Fetching shot charts for all players (all seasons)")

    print("\n" + "="*50)
    print("  All data fetched successfully!")
    print("  Run `npm run dev` to start the dashboard.")
    print("="*50)


if __name__ == "__main__":
    main()
