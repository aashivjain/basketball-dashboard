"""
Train a RandomForest matchup model from stored WNBA game logs and write
frontend-ready team-vs-team forecast probabilities.

Output:
  src/data/team_predictions.json
"""

from __future__ import annotations

import json
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from sklearn.ensemble import RandomForestClassifier

DATA_FILE = Path(__file__).parent.parent / "src" / "data" / "wnba_data.json"
OUTPUT_FILE = Path(__file__).parent.parent / "src" / "data" / "team_predictions.json"


def write_json_atomic(path, payload, *, indent=None):
    temp_path = path.with_suffix(f"{path.suffix}.tmp")
    with open(temp_path, "w", encoding="utf-8") as file:
        json.dump(payload, file, indent=indent)
    temp_path.replace(path)


@dataclass
class TeamGame:
    season: str
    game_date: str
    game_time: float
    team: str
    opponent: str
    is_home: bool
    wl: str
    pts: float
    reb: float
    ast: float
    tov: float
    fg_pct: float
    fg3_pct: float
    ft_pct: float
    plus_minus: float


def parse_game_time(value: str) -> float:
    try:
        return datetime.strptime(value, "%b %d, %Y").timestamp()
    except ValueError:
        return 0.0


def parse_opponent(matchup: str) -> str:
    parts = matchup.split()
    return parts[-1] if parts else matchup


def build_team_games(data: dict[str, Any]) -> dict[str, dict[str, list[TeamGame]]]:
    seasons: dict[str, dict[str, list[TeamGame]]] = {}

    for season, season_data in data["seasons"].items():
        if not season_data:
            continue

        block = season_data["regular_season"]
        players_by_id = {
            str(player["player_id"]): player["team"]
            for player in block.get("all_players", [])
        }

        grouped: dict[tuple[str, str, str], dict[str, Any]] = {}
        for player_id, logs in block.get("game_logs", {}).items():
            team = players_by_id.get(str(player_id))
            if not team:
                continue

            for game in logs:
                key = (team, game["game_date"], game["matchup"])
                if key not in grouped:
                    grouped[key] = {
                        "season": season,
                        "game_date": game["game_date"],
                        "game_time": parse_game_time(game["game_date"]),
                        "team": team,
                        "opponent": parse_opponent(game["matchup"]),
                        "is_home": "vs." in game["matchup"],
                        "wl": game["wl"],
                        "pts": 0.0,
                        "reb": 0.0,
                        "ast": 0.0,
                        "tov": 0.0,
                        "fgm": 0.0,
                        "fga": 0.0,
                        "fg3m": 0.0,
                        "fg3a": 0.0,
                        "ftm": 0.0,
                        "fta": 0.0,
                        "plus_minus": 0.0,
                    }

                row = grouped[key]
                row["pts"] += game["pts"]
                row["reb"] += game["reb"]
                row["ast"] += game["ast"]
                row["tov"] += game["tov"]
                row["fgm"] += game["fgm"]
                row["fga"] += game["fga"]
                row["fg3m"] += game["fg3m"]
                row["fg3a"] += game["fg3a"]
                row["ftm"] += game["ftm"]
                row["fta"] += game["fta"]
                row["plus_minus"] += game["plus_minus"]

        season_games: dict[str, list[TeamGame]] = defaultdict(list)
        for row in grouped.values():
            fga = row["fga"]
            fg3a = row["fg3a"]
            fta = row["fta"]
            season_games[row["team"]].append(
                TeamGame(
                    season=row["season"],
                    game_date=row["game_date"],
                    game_time=row["game_time"],
                    team=row["team"],
                    opponent=row["opponent"],
                    is_home=row["is_home"],
                    wl=row["wl"],
                    pts=row["pts"],
                    reb=row["reb"],
                    ast=row["ast"],
                    tov=row["tov"],
                    fg_pct=(row["fgm"] / fga) if fga else 0.0,
                    fg3_pct=(row["fg3m"] / fg3a) if fg3a else 0.0,
                    ft_pct=(row["ftm"] / fta) if fta else 0.0,
                    plus_minus=row["plus_minus"],
                )
            )

        for team in season_games:
            season_games[team].sort(key=lambda game: (game.game_time, game.team))

        seasons[season] = season_games

    return seasons


def average(values: list[float], default: float = 0.0) -> float:
    return sum(values) / len(values) if values else default


def summarize_history(games: list[TeamGame]) -> dict[str, float]:
    if not games:
        return {
            "win_pct": 0.5,
            "recent_win_pct": 0.5,
            "last5_games": 0.0,
            "pts": 80.0,
            "reb": 32.0,
            "ast": 18.0,
            "tov": 14.0,
            "fg_pct": 0.43,
            "fg3_pct": 0.32,
            "ft_pct": 0.78,
            "plus_minus": 0.0,
            "last5_pts": 80.0,
            "last5_reb": 32.0,
            "last5_ast": 18.0,
            "last5_tov": 14.0,
            "last5_fg_pct": 0.43,
            "last5_fg3_pct": 0.32,
            "last5_ft_pct": 0.78,
            "last5_plus_minus": 0.0,
            "home_win_pct": 0.5,
            "away_win_pct": 0.5,
        }

    recent = games[-5:] if len(games) >= 5 else games
    home_games = [game for game in games if game.is_home]
    away_games = [game for game in games if not game.is_home]
    return {
        "win_pct": average([1.0 if game.wl == "W" else 0.0 for game in games], 0.5),
        "recent_win_pct": average([1.0 if game.wl == "W" else 0.0 for game in recent], 0.5),
        "last5_games": float(len(recent)),
        "pts": average([game.pts for game in games], 80.0),
        "reb": average([game.reb for game in games], 32.0),
        "ast": average([game.ast for game in games], 18.0),
        "tov": average([game.tov for game in games], 14.0),
        "fg_pct": average([game.fg_pct for game in games], 0.43),
        "fg3_pct": average([game.fg3_pct for game in games], 0.32),
        "ft_pct": average([game.ft_pct for game in games], 0.78),
        "plus_minus": average([game.plus_minus for game in games], 0.0),
        "last5_pts": average([game.pts for game in recent], average([game.pts for game in games], 80.0)),
        "last5_reb": average([game.reb for game in recent], average([game.reb for game in games], 32.0)),
        "last5_ast": average([game.ast for game in recent], average([game.ast for game in games], 18.0)),
        "last5_tov": average([game.tov for game in recent], average([game.tov for game in games], 14.0)),
        "last5_fg_pct": average([game.fg_pct for game in recent], average([game.fg_pct for game in games], 0.43)),
        "last5_fg3_pct": average([game.fg3_pct for game in recent], average([game.fg3_pct for game in games], 0.32)),
        "last5_ft_pct": average([game.ft_pct for game in recent], average([game.ft_pct for game in games], 0.78)),
        "last5_plus_minus": average([game.plus_minus for game in recent], average([game.plus_minus for game in games], 0.0)),
        "home_win_pct": average([1.0 if game.wl == "W" else 0.0 for game in home_games], 0.5),
        "away_win_pct": average([1.0 if game.wl == "W" else 0.0 for game in away_games], 0.5),
    }


FEATURE_ORDER = [
    "win_pct_diff",
    "recent_win_pct_diff",
    "pts_diff",
    "reb_diff",
    "ast_diff",
    "tov_diff",
    "fg_pct_diff",
    "fg3_pct_diff",
    "ft_pct_diff",
    "plus_minus_diff",
    "last5_pts_diff",
    "last5_reb_diff",
    "last5_ast_diff",
    "last5_tov_diff",
    "last5_fg_pct_diff",
    "last5_fg3_pct_diff",
    "last5_ft_pct_diff",
    "last5_plus_minus_diff",
    "last5_sample_edge",
    "team_a_home",
    "home_win_pct_diff",
    "away_win_pct_diff",
]

FEATURE_LABELS = {
    "win_pct_diff": "Season form",
    "recent_win_pct_diff": "Recent momentum",
    "pts_diff": "Scoring volume",
    "reb_diff": "Rebounding",
    "ast_diff": "Playmaking",
    "tov_diff": "Turnover control",
    "fg_pct_diff": "Field-goal efficiency",
    "fg3_pct_diff": "3-point shooting",
    "ft_pct_diff": "Free-throw shooting",
    "plus_minus_diff": "Average margin",
    "last5_pts_diff": "Last 5 scoring",
    "last5_reb_diff": "Last 5 rebounding",
    "last5_ast_diff": "Last 5 playmaking",
    "last5_tov_diff": "Last 5 turnovers",
    "last5_fg_pct_diff": "Last 5 FG%",
    "last5_fg3_pct_diff": "Last 5 3PT%",
    "last5_ft_pct_diff": "Last 5 FT%",
    "last5_plus_minus_diff": "Last 5 margin",
    "last5_sample_edge": "Last 5 sample depth",
    "team_a_home": "Home court",
    "home_win_pct_diff": "Home profile",
    "away_win_pct_diff": "Road profile",
}


def build_feature_map(team_a_summary: dict[str, float], team_b_summary: dict[str, float], team_a_home: bool) -> dict[str, float]:
    return {
        "win_pct_diff": team_a_summary["win_pct"] - team_b_summary["win_pct"],
        "recent_win_pct_diff": team_a_summary["recent_win_pct"] - team_b_summary["recent_win_pct"],
        "pts_diff": team_a_summary["pts"] - team_b_summary["pts"],
        "reb_diff": team_a_summary["reb"] - team_b_summary["reb"],
        "ast_diff": team_a_summary["ast"] - team_b_summary["ast"],
        "tov_diff": team_a_summary["tov"] - team_b_summary["tov"],
        "fg_pct_diff": team_a_summary["fg_pct"] - team_b_summary["fg_pct"],
        "fg3_pct_diff": team_a_summary["fg3_pct"] - team_b_summary["fg3_pct"],
        "ft_pct_diff": team_a_summary["ft_pct"] - team_b_summary["ft_pct"],
        "plus_minus_diff": team_a_summary["plus_minus"] - team_b_summary["plus_minus"],
        "last5_pts_diff": team_a_summary["last5_pts"] - team_b_summary["last5_pts"],
        "last5_reb_diff": team_a_summary["last5_reb"] - team_b_summary["last5_reb"],
        "last5_ast_diff": team_a_summary["last5_ast"] - team_b_summary["last5_ast"],
        "last5_tov_diff": team_a_summary["last5_tov"] - team_b_summary["last5_tov"],
        "last5_fg_pct_diff": team_a_summary["last5_fg_pct"] - team_b_summary["last5_fg_pct"],
        "last5_fg3_pct_diff": team_a_summary["last5_fg3_pct"] - team_b_summary["last5_fg3_pct"],
        "last5_ft_pct_diff": team_a_summary["last5_ft_pct"] - team_b_summary["last5_ft_pct"],
        "last5_plus_minus_diff": team_a_summary["last5_plus_minus"] - team_b_summary["last5_plus_minus"],
        "last5_sample_edge": team_a_summary["last5_games"] - team_b_summary["last5_games"],
        "team_a_home": 1.0 if team_a_home else 0.0,
        "home_win_pct_diff": team_a_summary["home_win_pct"] - team_b_summary["home_win_pct"],
        "away_win_pct_diff": team_a_summary["away_win_pct"] - team_b_summary["away_win_pct"],
    }


def vectorize(feature_map: dict[str, float]) -> list[float]:
    return [feature_map[name] for name in FEATURE_ORDER]


def build_training_set(season_games: dict[str, dict[str, list[TeamGame]]]) -> tuple[list[list[float]], list[int]]:
    samples: list[list[float]] = []
    labels: list[int] = []

    for season, teams in season_games.items():
        unique_events: dict[tuple[str, str, str], dict[str, TeamGame]] = {}
        for team, games in teams.items():
            for game in games:
                key = (season, game.game_date, "|".join(sorted([team, game.opponent])))
                unique_events.setdefault(key, {})[team] = game

        for _, pair in sorted(unique_events.items(), key=lambda item: next(iter(item[1].values())).game_time):
            if len(pair) != 2:
                continue

            ordered = sorted(pair.values(), key=lambda game: game.team)
            team_a_game, team_b_game = ordered[0], ordered[1]
            team_a_history = [game for game in teams[team_a_game.team] if game.game_time < team_a_game.game_time]
            team_b_history = [game for game in teams[team_b_game.team] if game.game_time < team_b_game.game_time]
            if len(team_a_history) < 4 or len(team_b_history) < 4:
                continue

            features = build_feature_map(
                summarize_history(team_a_history),
                summarize_history(team_b_history),
                team_a_game.is_home,
            )
            samples.append(vectorize(features))
            labels.append(1 if team_a_game.wl == "W" else 0)

    return samples, labels


def top_reasons(feature_map: dict[str, float], importances: dict[str, float], team_a: str, team_b: str) -> list[dict[str, Any]]:
    scored = []
    for name, value in feature_map.items():
        if name == "team_a_home":
            contribution = importances.get(name, 0.0) * value
        else:
            contribution = importances.get(name, 0.0) * abs(value)
        scored.append((name, value, contribution))

    reasons = []
    for name, value, _ in sorted(scored, key=lambda item: item[2], reverse=True)[:3]:
        if name == "team_a_home":
            edge_team = team_a if value >= 0.5 else team_b
            detail = f"{edge_team} has home court in this scenario."
        else:
            edge_team = team_a if value >= 0 else team_b
            detail = f"{FEATURE_LABELS[name]} currently leans toward {edge_team}."
        reasons.append({
            "label": FEATURE_LABELS[name],
            "edge_team": edge_team,
            "detail": detail,
        })
    return reasons


def build_current_team_summaries(data: dict[str, Any], season_games: dict[str, dict[str, list[TeamGame]]]) -> tuple[str, dict[str, dict[str, float]]]:
    current_season = data["team"]["current_season"]
    current_games = season_games.get(current_season, {})
    summaries = {
        team: summarize_history(games)
        for team, games in current_games.items()
    }
    return current_season, summaries


def weighted_probability(team_a_summary: dict[str, float], team_b_summary: dict[str, float], team_a_home: bool) -> float:
    score_a = (
        team_a_summary["pts"] * 1.2
        + team_a_summary["reb"] * 0.9
        + team_a_summary["ast"] * 1.4
        - team_a_summary["tov"] * 1.3
        + team_a_summary["fg_pct"] * 80
        + team_a_summary["fg3_pct"] * 45
        + team_a_summary["plus_minus"] * 6
        + (4 if team_a_home else -4)
        + (team_a_summary["recent_win_pct"] - team_a_summary["win_pct"]) * 18
    )
    score_b = (
        team_b_summary["pts"] * 1.2
        + team_b_summary["reb"] * 0.9
        + team_b_summary["ast"] * 1.4
        - team_b_summary["tov"] * 1.3
        + team_b_summary["fg_pct"] * 80
        + team_b_summary["fg3_pct"] * 45
        + team_b_summary["plus_minus"] * 6
        + (-4 if team_a_home else 4)
        + (team_b_summary["recent_win_pct"] - team_b_summary["win_pct"]) * 18
    )
    diff = score_a - score_b
    probability = 50 + diff * 1.35
    return max(8.0, min(92.0, probability))


def build_predictions(data: dict[str, Any], model: RandomForestClassifier, season_games: dict[str, dict[str, list[TeamGame]]]) -> dict[str, Any]:
    current_season, summaries = build_current_team_summaries(data, season_games)
    teams = sorted(summaries.keys())
    importances = dict(zip(FEATURE_ORDER, model.feature_importances_))

    forecasts: dict[str, Any] = {}
    for team_a in teams:
        forecasts[team_a] = {"home": {}, "away": {}}
        for team_b in teams:
            if team_a == team_b:
                continue

            for venue in ("home", "away"):
                team_a_home = venue == "home"
                feature_map = build_feature_map(summaries[team_a], summaries[team_b], team_a_home)
                probability = model.predict_proba([vectorize(feature_map)])[0][1] * 100
                weighted = weighted_probability(summaries[team_a], summaries[team_b], team_a_home)
                forecasts[team_a][venue][team_b] = {
                    "team_win_pct": round(probability, 1),
                    "opponent_win_pct": round(100 - probability, 1),
                    "weighted_win_pct": round(weighted, 1),
                    "reasons": top_reasons(feature_map, importances, team_a, team_b),
                }

    return {
        "generated_at": datetime.now().isoformat(),
        "season": current_season,
        "model": {
            "name": "RandomForestClassifier",
            "n_estimators": model.n_estimators,
            "max_depth": model.max_depth,
            "feature_importances": {key: round(value, 4) for key, value in importances.items()},
        },
        "forecasts": forecasts,
    }


def main() -> None:
    with open(DATA_FILE, "r", encoding="utf-8") as file:
        data = json.load(file)

    season_games = build_team_games(data)
    samples, labels = build_training_set(season_games)
    if len(samples) < 20:
        raise RuntimeError("Not enough historical matchup samples to train the random forest model.")

    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=8,
        min_samples_leaf=2,
        random_state=42,
    )
    model.fit(samples, labels)

    predictions = build_predictions(data, model, season_games)
    write_json_atomic(OUTPUT_FILE, predictions, indent=2)

    print(f"Random-forest forecasts saved to {OUTPUT_FILE}")
    print(f"Trained on {len(samples)} historical team matchups.")


if __name__ == "__main__":
    main()
