import type { SeasonStats, LeagueAverages } from '../types';

export function perGame(total: number, gp: number): string {
  if (gp === 0) return '0.0';
  return (total / gp).toFixed(1);
}

export function pctDisplay(pct: number): string {
  return (pct * 100).toFixed(1) + '%';
}

export function getRadarData(stats: SeasonStats, leagueAvg: LeagueAverages) {
  const gp = stats.gp || 1;
  return [
    {
      stat: 'PTS',
      player: stats.pts / gp,
      league: leagueAvg.pts,
    },
    {
      stat: 'REB',
      player: stats.reb / gp,
      league: leagueAvg.reb,
    },
    {
      stat: 'AST',
      player: stats.ast / gp,
      league: leagueAvg.ast,
    },
    {
      stat: 'STL',
      player: stats.stl / gp,
      league: leagueAvg.stl,
    },
    {
      stat: 'BLK',
      player: stats.blk / gp,
      league: leagueAvg.blk,
    },
  ];
}

export function getShotEfficiency(shots: { made: boolean; shot_zone: string }[]) {
  const zones: Record<string, { made: number; total: number }> = {};

  for (const shot of shots) {
    if (!zones[shot.shot_zone]) {
      zones[shot.shot_zone] = { made: 0, total: 0 };
    }
    zones[shot.shot_zone].total++;
    if (shot.made) {
      zones[shot.shot_zone].made++;
    }
  }

  return Object.entries(zones).map(([zone, data]) => ({
    zone,
    made: data.made,
    total: data.total,
    pct: data.total > 0 ? data.made / data.total : 0,
  }));
}
