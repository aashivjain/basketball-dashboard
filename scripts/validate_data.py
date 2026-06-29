"""
Data validation module for WNBA/NBA data migration
Performs type checks, range checks, and data quality validation
"""

def validate_numeric_range(value, field_name, min_val=None, max_val=None, allow_none=False):
    """Validate numeric fields are within acceptable ranges"""
    if value is None:
        if allow_none:
            return True, None
        return False, f"{field_name} is None (not allowed)"
    
    try:
        num_val = float(value)
    except (ValueError, TypeError):
        return False, f"{field_name} is not numeric: {value}"
    
    if min_val is not None and num_val < min_val:
        return False, f"{field_name} {num_val} is below minimum {min_val}"
    
    if max_val is not None and num_val > max_val:
        return False, f"{field_name} {num_val} exceeds maximum {max_val}"
    
    return True, None

def validate_percentage(value, field_name, allow_none=False):
    """Validate percentage fields (0-1 or 0-100)"""
    if value is None:
        if allow_none:
            return True, None
        return False, f"{field_name} is None"
    
    try:
        num_val = float(value)
    except (ValueError, TypeError):
        return False, f"{field_name} is not numeric: {value}"
    
    if num_val < 0 or num_val > 1:
        if num_val < 0 or num_val > 100:
            return False, f"{field_name} {num_val} is not valid percentage"
    
    return True, None

def validate_player_stats(stats):
    """Validate player season stats object"""
    errors = []
    
    # Required fields
    required = ['player_id', 'name', 'gp', 'min', 'pts', 'reb', 'ast']
    for field in required:
        if field not in stats or stats[field] is None:
            errors.append(f"Missing required field: {field}")
    
    # Numeric validations
    if 'gp' in stats:
        valid, err = validate_numeric_range(stats['gp'], 'games_played', 0, 82)
        if not valid: errors.append(err)
    
    if 'min' in stats:
        valid, err = validate_numeric_range(stats['min'], 'minutes', 0, 50)
        if not valid: errors.append(err)
    
    if 'pts' in stats:
        valid, err = validate_numeric_range(stats['pts'], 'points', 0, 100)
        if not valid: errors.append(err)
    
    if 'reb' in stats:
        valid, err = validate_numeric_range(stats['reb'], 'rebounds', 0, 30)
        if not valid: errors.append(err)
    
    if 'ast' in stats:
        valid, err = validate_numeric_range(stats['ast'], 'assists', 0, 20)
        if not valid: errors.append(err)
    
    # Percentage validations
    for pct_field in ['fg_pct', 'fg3_pct', 'ft_pct']:
        if pct_field in stats and stats[pct_field] is not None:
            valid, err = validate_percentage(stats[pct_field], pct_field, allow_none=True)
            if not valid: errors.append(err)
    
    return len(errors) == 0, errors

def validate_game_log(game_log):
    """Validate individual game log entry"""
    errors = []
    
    # Required fields
    required = ['game_date', 'matchup', 'pts']
    for field in required:
        if field not in game_log or game_log[field] is None:
            errors.append(f"Missing required field: {field}")
    
    # Numeric validations
    if 'pts' in game_log:
        valid, err = validate_numeric_range(game_log['pts'], 'points', 0, 60)
        if not valid: errors.append(err)
    
    return len(errors) == 0, errors

def validate_roster_entry(roster):
    """Validate roster entry"""
    errors = []
    
    # Required fields - weight is optional
    required = ['player_id', 'name', 'position', 'height', 'number']
    for field in required:
        if field not in roster or roster[field] is None:
            errors.append(f"Missing required field: {field}")
    
    # Height/weight sanity checks (optional)
    if 'height' in roster and roster['height']:
        if not isinstance(roster['height'], str) or '-' not in str(roster['height']):
            errors.append(f"Invalid height format: {roster['height']}")
    
    if 'weight' in roster and roster['weight']:
        try:
            w = float(roster['weight'])
            if w < 80 or w > 300:
                errors.append(f"Weight {w} seems invalid (should be 80-300 lbs)")
        except (ValueError, TypeError):
            errors.append(f"Invalid weight: {roster['weight']}")
    
    if 'age' in roster and roster['age']:
        try:
            age = float(roster['age'])
            if age < 18 or age > 50:
                errors.append(f"Age {age} seems invalid")
        except (ValueError, TypeError):
            errors.append(f"Invalid age: {roster['age']}")
    
    return len(errors) == 0, errors

def validate_news_article(article):
    """Validate news article"""
    errors = []
    
    # Required fields
    required = ['id', 'title', 'source', 'link', 'published_at']
    for field in required:
        if field not in article or article[field] is None:
            errors.append(f"Missing required field: {field}")
    
    return len(errors) == 0, errors
