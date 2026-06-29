"""
WNBA Data Migration Script
Migrates WNBA data from JSON to SQLite database with validation
Cross-platform compatible (Windows, Mac, Linux)
"""

import json
import sqlite3
import sys
import os
import subprocess
from datetime import datetime
from pathlib import Path
from validate_data import (
    validate_player_stats,
    validate_game_log,
    validate_roster_entry,
    validate_news_article
)

# Configuration - Cross-platform path handling
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
JSON_DATA_PATH = PROJECT_ROOT / 'src' / 'data' / 'wnba_data.json'
DB_PATH = PROJECT_ROOT / 'backend' / 'basketball.db'
LEAGUE = 'WNBA'

class MigrationLogger:
    """Simple logger for migration process"""
    def __init__(self):
        self.messages = []
        self.errors = []
        self.warnings = []
    
    def info(self, msg):
        print(f"ℹ {msg}")
        self.messages.append(msg)
    
    def success(self, msg):
        print(f"✓ {msg}")
        self.messages.append(msg)
    
    def warning(self, msg):
        print(f"⚠ {msg}")
        self.warnings.append(msg)
    
    def error(self, msg):
        print(f"✗ {msg}")
        self.errors.append(msg)
    
    def section(self, title):
        print(f"\n{'='*50}")
        print(f"  {title}")
        print(f"{'='*50}\n")

class WNBAMigration:
    def __init__(self):
        self.logger = MigrationLogger()
        self.data = None
        self.conn = None
        self.cursor = None
        self.stats = {
            'teams': 0,
            'players': 0,
            'rosters': 0,
            'season_stats': 0,
            'game_logs': 0,
            'news': 0,
            'league_averages': 0,
        }
    
    def connect_db(self):
        """Connect to SQLite database"""
        try:
            self.conn = sqlite3.connect(str(DB_PATH))
            self.cursor = self.conn.cursor()
            self.logger.success(f"Connected to database: {DB_PATH}")
        except Exception as e:
            self.logger.error(f"Failed to connect to database: {e}")
            raise
    
    def close_db(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
            self.logger.info("Database connection closed")
    
    def clean_and_init_db(self):
        """Delete old database and reinitialize schema (for --clean flag)"""
        self.logger.section("Cleaning Database")
        
        # Delete existing database if present
        if DB_PATH.exists():
            try:
                DB_PATH.unlink()
                self.logger.success(f"Deleted old database: {DB_PATH}")
            except Exception as e:
                self.logger.error(f"Failed to delete database: {e}")
                raise
        
        # Run init-db script to create fresh schema
        try:
            backend_dir = DB_PATH.parent
            init_script = backend_dir / 'scripts' / 'init-db.mjs'
            
            result = subprocess.run(
                ['node', str(init_script)],
                capture_output=True,
                text=True,
                timeout=15,
                cwd=str(backend_dir)
            )
            
            if result.returncode != 0:
                self.logger.error(f"Database initialization failed: {result.stderr}")
                raise Exception(f"init-db.mjs failed: {result.stderr}")
            
            self.logger.success("Database schema initialized")
            
        except subprocess.TimeoutExpired:
            self.logger.error("Database initialization timed out")
            raise
        except Exception as e:
            self.logger.error(f"Failed to initialize database: {e}")
            raise
    
    def load_json_data(self):
        """Load JSON data from file"""
        try:
            with open(JSON_DATA_PATH, 'r') as f:
                self.data = json.load(f)
            self.logger.success(f"Loaded JSON data from: {JSON_DATA_PATH}")
        except Exception as e:
            self.logger.error(f"Failed to load JSON: {e}")
            raise
    
    def migrate_teams(self):
        """Migrate team data"""
        self.logger.section("Migrating Teams")
        
        try:
            team = self.data['team']
            
            # Insert team
            self.cursor.execute("""
                INSERT OR REPLACE INTO teams (id, league, name, abbreviation)
                VALUES (?, ?, ?, ?)
            """, (team['id'], LEAGUE, team['name'], team['abbreviation']))
            
            self.stats['teams'] += 1
            self.logger.success(f"Migrated team: {team['name']} ({team['abbreviation']})")
            
        except Exception as e:
            self.logger.error(f"Team migration failed: {e}")
            raise
    
    def migrate_players(self):
        """Migrate player data (from rosters)"""
        self.logger.section("Migrating Players")
        
        player_ids = set()
        try:
            for season_year, season_data in self.data['seasons'].items():
                roster = season_data.get('roster', [])
                for player in roster:
                    player_id = player['player_id']
                    
                    # Avoid duplicate inserts
                    if player_id in player_ids:
                        continue
                    
                    # Check if player exists
                    self.cursor.execute(
                        "SELECT id FROM players WHERE id = ? AND league = ?",
                        (player_id, LEAGUE)
                    )
                    if self.cursor.fetchone():
                        player_ids.add(player_id)
                        continue
                    
                    # Insert player
                    self.cursor.execute("""
                        INSERT INTO players (id, league, name, position, team_id)
                        VALUES (?, ?, ?, ?, ?)
                    """, (
                        player_id,
                        LEAGUE,
                        player['name'],
                        player['position'],
                        self.data['team']['id']
                    ))
                    
                    player_ids.add(player_id)
                    self.stats['players'] += 1
            
            self.logger.success(f"Migrated {self.stats['players']} unique players")
            
        except Exception as e:
            self.logger.error(f"Player migration failed: {e}")
            raise
    
    def migrate_rosters(self):
        """Migrate roster entries for each season"""
        self.logger.section("Migrating Rosters")
        
        try:
            for season_year, season_data in self.data['seasons'].items():
                roster = season_data.get('roster', [])
                
                for player in roster:
                    # Validate roster entry
                    valid, errors = validate_roster_entry(player)
                    if not valid:
                        self.logger.warning(f"Invalid roster entry for {player.get('name', 'Unknown')}: {errors}")
                        continue
                    
                    # Insert roster entry
                    self.cursor.execute("""
                        INSERT INTO rosters (
                            player_id, league, season, number, height, weight, age, experience, school
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        player['player_id'],
                        LEAGUE,
                        season_year,
                        player.get('number'),
                        player.get('height'),
                        player.get('weight'),
                        player.get('age'),
                        player.get('experience'),
                        player.get('school')
                    ))
                    
                    self.stats['rosters'] += 1
            
            self.logger.success(f"Migrated {self.stats['rosters']} roster entries")
            
        except Exception as e:
            self.logger.error(f"Roster migration failed: {e}")
            raise
    
    def migrate_season_stats(self):
        """Migrate season statistics"""
        self.logger.section("Migrating Season Stats")
        
        try:
            for season_year, season_data in self.data['seasons'].items():
                regular_season = season_data.get('regular_season', {})
                stats_list = regular_season.get('stats', [])
                
                for stat_entry in stats_list:
                    # Validate stats
                    valid, errors = validate_player_stats(stat_entry)
                    if not valid:
                        self.logger.warning(f"Invalid stats for player {stat_entry.get('player_id')}: {errors}")
                        continue
                    
                    # Insert season stats - use 'Regular Season' for game_type
                    self.cursor.execute("""
                        INSERT INTO season_stats (
                            player_id, league, season, game_type,
                            gp, min, pts, reb, ast, stl, blk, tov,
                            fgm, fga, fg_pct, fg3m, fg3a, fg3_pct, ftm, fta, ft_pct,
                            oreb, dreb, pf, plus_minus
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        stat_entry['player_id'], LEAGUE, season_year, 'Regular Season',
                        stat_entry.get('gp'),
                        stat_entry.get('min'),
                        stat_entry.get('pts'),
                        stat_entry.get('reb'),
                        stat_entry.get('ast'),
                        stat_entry.get('stl'),
                        stat_entry.get('blk'),
                        stat_entry.get('tov'),
                        stat_entry.get('fgm'),
                        stat_entry.get('fga'),
                        stat_entry.get('fg_pct'),
                        stat_entry.get('fg3m'),
                        stat_entry.get('fg3a'),
                        stat_entry.get('fg3_pct'),
                        stat_entry.get('ftm'),
                        stat_entry.get('fta'),
                        stat_entry.get('ft_pct'),
                        stat_entry.get('oreb'),
                        stat_entry.get('dreb'),
                        stat_entry.get('pf'),
                        stat_entry.get('plus_minus')
                    ))
                    
                    self.stats['season_stats'] += 1
            
            self.logger.success(f"Migrated {self.stats['season_stats']} season stat entries")
            
        except Exception as e:
            self.logger.error(f"Season stats migration failed: {e}")
            raise
    
    def migrate_game_logs(self):
        """Migrate game log data"""
        self.logger.section("Migrating Game Logs")
        
        try:
            log_id = 1
            for season_year, season_data in self.data['seasons'].items():
                regular_season = season_data.get('regular_season', {})
                game_logs = regular_season.get('game_logs', {})
                
                for player_id, games in game_logs.items():
                    if not isinstance(games, list):
                        continue
                    
                    for game in games:
                        # Validate game log
                        valid, errors = validate_game_log(game)
                        if not valid:
                            self.logger.warning(f"Invalid game log: {errors}")
                            continue
                        
                        # Parse opponent from matchup
                        opponent_abbr = game['matchup'].split('@')[-1].strip() if '@' in game['matchup'] else 'UNK'
                        opponent_abbr = opponent_abbr.split('vs.')[-1].strip() if 'vs.' in game['matchup'] else opponent_abbr
                        
                        # Get opponent team ID (simplified - assumes same team structure)
                        opponent_team_id = None  # Would need team lookup
                        is_home = 'vs.' in game['matchup']
                        
                        # Insert game log
                        self.cursor.execute("""
                            INSERT INTO game_logs (
                                id, player_id, league, season, game_date, opponent_team_id, is_home,
                                pts, reb, ast, stl, blk, tov, fgm, fga, fg_pct, fg3m, fg3a, fg3_pct, ftm, fta, ft_pct, plus_minus
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            log_id, player_id, LEAGUE, season_year, game['game_date'], opponent_team_id, is_home,
                            game.get('pts'), game.get('reb'), game.get('ast'), game.get('stl'), game.get('blk'), game.get('tov'),
                            game.get('fgm'), game.get('fga'), game.get('fg_pct'), game.get('fg3m'), game.get('fg3a'), game.get('fg3_pct'),
                            game.get('ftm'), game.get('fta'), game.get('ft_pct'), game.get('plus_minus')
                        ))
                        
                        log_id += 1
                        self.stats['game_logs'] += 1
            
            self.logger.success(f"Migrated {self.stats['game_logs']} game log entries")
            
        except Exception as e:
            self.logger.error(f"Game logs migration failed: {e}")
            raise
    
    def migrate_league_averages(self):
        """Migrate league-wide averages"""
        self.logger.section("Migrating League Averages")
        
        try:
            for season_year, season_data in self.data['seasons'].items():
                regular_season = season_data.get('regular_season', {})
                averages = regular_season.get('league_averages', {})
                
                if not averages:
                    continue
                
                # Insert league averages - use 'Regular Season' for game_type
                self.cursor.execute("""
                    INSERT INTO league_averages (
                        league, season, game_type, pts, reb, ast, stl, blk, fg_pct, fg3_pct, ft_pct
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    LEAGUE, season_year, 'Regular Season',
                    averages.get('pts'),
                    averages.get('reb'),
                    averages.get('ast'),
                    averages.get('stl'),
                    averages.get('blk'),
                    averages.get('fg_pct'),
                    averages.get('fg3_pct'),
                    averages.get('ft_pct')
                ))
                
                self.stats['league_averages'] += 1
            
            self.logger.success(f"Migrated {self.stats['league_averages']} league average entries")
            
        except Exception as e:
            self.logger.error(f"League averages migration failed: {e}")
            raise
    
    def migrate_news(self):
        """Migrate news articles"""
        self.logger.section("Migrating News")
        
        try:
            news_data = self.data.get('news', {})
            articles = news_data.get('articles', [])
            
            for article in articles:
                # Validate article
                valid, errors = validate_news_article(article)
                if not valid:
                    self.logger.warning(f"Invalid news article: {errors}")
                    continue
                
                # Insert news
                self.cursor.execute("""
                    INSERT INTO news (
                        id, league, title, source, link, published_at, category, summary, image_url
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    article['id'],
                    LEAGUE,
                    article.get('title'),
                    article.get('source'),
                    article.get('link'),
                    article.get('published_at'),
                    article.get('category', 'General'),
                    article.get('summary'),
                    article.get('image_url')
                ))
                
                self.stats['news'] += 1
            
            self.logger.success(f"Migrated {self.stats['news']} news articles")
            
        except Exception as e:
            self.logger.error(f"News migration failed: {e}")
            raise
    
    def commit_and_log(self):
        """Commit transaction and log sync"""
        try:
            # Log to sync_log table
            self.cursor.execute("""
                INSERT INTO sync_log (league, data_type, status, record_count, started_at, completed_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (LEAGUE, 'full_migration', 'success', sum(self.stats.values()), datetime.now(), datetime.now()))
            
            self.conn.commit()
            self.logger.success("Database transaction committed")
            
        except Exception as e:
            self.conn.rollback()
            self.logger.error(f"Commit failed: {e}")
            raise
    
    def print_summary(self):
        """Print migration summary"""
        self.logger.section("Migration Summary")
        
        print("\nRecords Migrated:")
        for key, count in self.stats.items():
            print(f"  {key:20} : {count:6}")
        print(f"  {'TOTAL':20} : {sum(self.stats.values()):6}")
        
        if self.logger.errors:
            print(f"\n⚠ Errors encountered: {len(self.logger.errors)}")
            for err in self.logger.errors[:10]:
                print(f"  - {err}")
        
        if self.logger.warnings:
            print(f"\n⚠ Warnings: {len(self.logger.warnings)}")
        
        print("\n" + "="*50)
        if not self.logger.errors:
            print("✓ Migration completed successfully!")
        else:
            print("✗ Migration completed with errors")
        print("="*50 + "\n")
    
    def run(self, clean=False):
        """Run full migration"""
        try:
            self.logger.section("WNBA Data Migration Starting")
            
            # Clean and reinit database if --clean flag used
            if clean:
                self.clean_and_init_db()
            
            self.load_json_data()
            self.connect_db()
            
            self.migrate_teams()
            self.migrate_players()
            self.migrate_rosters()
            self.migrate_season_stats()
            self.migrate_game_logs()
            self.migrate_league_averages()
            self.migrate_news()
            
            self.commit_and_log()
            self.print_summary()
            
        except Exception as e:
            self.logger.error(f"Migration failed: {e}")
            return False
        finally:
            self.close_db()
        
        return len(self.logger.errors) == 0

if __name__ == '__main__':
    # Check for --clean flag
    clean_flag = '--clean' in sys.argv
    
    migration = WNBAMigration()
    success = migration.run(clean=clean_flag)
    exit(0 if success else 1)
