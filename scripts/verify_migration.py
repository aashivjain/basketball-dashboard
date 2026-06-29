"""
Verification script to ensure data migration completed correctly
Compares database counts with original JSON data
"""

import json
import sqlite3
from pathlib import Path

JSON_DATA_PATH = Path(__file__).parent.parent / 'src' / 'data' / 'wnba_data.json'
DB_PATH = Path(__file__).parent.parent / 'backend' / 'basketball.db'

def load_json_stats():
    """Get record counts from JSON"""
    with open(JSON_DATA_PATH, 'r') as f:
        data = json.load(f)
    
    json_stats = {
        'teams': 1,  # Indiana Fever
        'news': len(data.get('news', {}).get('articles', [])),
    }
    
    # Count players, rosters, stats, game logs per season
    total_unique_players = set()
    total_rosters = 0
    total_season_stats = 0
    total_game_logs = 0
    total_league_avgs = 0
    
    for season_year, season_data in data.get('seasons', {}).items():
        # Count unique players
        for player in season_data.get('roster', []):
            total_unique_players.add(player['player_id'])
        
        total_rosters += len(season_data.get('roster', []))
        
        regular = season_data.get('regular_season', {})
        total_season_stats += len(regular.get('stats', []))
        total_league_avgs += 1 if regular.get('league_averages') else 0
        
        # Count game logs
        for player_id, games in regular.get('game_logs', {}).items():
            if isinstance(games, list):
                total_game_logs += len(games)
    
    json_stats['players'] = len(total_unique_players)
    json_stats['rosters'] = total_rosters
    json_stats['season_stats'] = total_season_stats
    json_stats['game_logs'] = total_game_logs
    json_stats['league_averages'] = total_league_avgs
    
    return json_stats

def get_db_stats():
    """Get record counts from database"""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    db_stats = {}
    
    # Count each table
    tables = ['teams', 'players', 'rosters', 'season_stats', 'game_logs', 'news', 'league_averages']
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table} WHERE league = 'WNBA'")
        count = cursor.fetchone()[0]
        db_stats[table] = count
    
    conn.close()
    return db_stats

def verify():
    """Verify migration"""
    print("\n" + "="*60)
    print("  DATABASE VERIFICATION REPORT")
    print("="*60 + "\n")
    
    json_stats = load_json_stats()
    db_stats = get_db_stats()
    
    print(f"{'Table':<20} {'JSON Source':<15} {'Database':<15} {'Match':<10}")
    print("-"*60)
    
    all_match = True
    for table in ['teams', 'players', 'rosters', 'season_stats', 'game_logs', 'news', 'league_averages']:
        json_count = json_stats.get(table, 0)
        db_count = db_stats.get(table, 0)
        match = '✓ YES' if json_count == db_count else '✗ NO'
        if json_count != db_count:
            all_match = False
        
        print(f"{table:<20} {json_count:<15} {db_count:<15} {match:<10}")
    
    print("\n" + "="*60)
    
    if all_match:
        print("✓ ALL VERIFICATION CHECKS PASSED")
        print("  Data migration successful and complete!")
    else:
        print("✗ VERIFICATION FAILED")
        print("  Some record counts do not match")
    
    print("="*60 + "\n")
    
    return all_match

if __name__ == '__main__':
    success = verify()
    exit(0 if success else 1)
