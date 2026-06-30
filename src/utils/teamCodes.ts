export type TeamConference = 'Eastern Conference' | 'Western Conference'

const TEAM_METADATA = {
  ATL: {
    display: 'ATL',
    conference: 'Eastern Conference',
    aliases: ['atl', 'atlanta', 'dream'],
  },
  CHI: {
    display: 'CHI',
    conference: 'Eastern Conference',
    aliases: ['chi', 'chicago', 'sky'],
  },
  CON: {
    display: 'CON',
    conference: 'Eastern Conference',
    aliases: ['con', 'connecticut', 'sun'],
  },
  DAL: {
    display: 'DAL',
    conference: 'Western Conference',
    aliases: ['dal', 'dallas', 'wings'],
  },
  GS: {
    display: 'GSV',
    conference: 'Western Conference',
    aliases: ['gs', 'gsv', 'golden state', 'goldenstate', 'valkyries'],
  },
  IND: {
    display: 'IND',
    conference: 'Eastern Conference',
    aliases: ['ind', 'indiana', 'fever'],
  },
  LAS: {
    display: 'LAS',
    conference: 'Western Conference',
    aliases: ['las', 'los angeles', 'losangeles', 'sparks'],
  },
  LVA: {
    display: 'LVA',
    conference: 'Western Conference',
    aliases: ['lva', 'las vegas', 'lasvegas', 'vegas', 'aces'],
  },
  MIN: {
    display: 'MIN',
    conference: 'Western Conference',
    aliases: ['min', 'minnesota', 'lynx'],
  },
  NYL: {
    display: 'NYL',
    conference: 'Eastern Conference',
    aliases: ['nyl', 'new york', 'newyork', 'liberty', 'ny'],
  },
  PHX: {
    display: 'PHX',
    conference: 'Western Conference',
    aliases: ['phx', 'phoenix', 'mercury'],
  },
  PDX: {
    display: 'POR',
    conference: 'Western Conference',
    aliases: ['pdx', 'por', 'portland', 'fire'],
  },
  SEA: {
    display: 'SEA',
    conference: 'Western Conference',
    aliases: ['sea', 'seattle', 'storm'],
  },
  TOR: {
    display: 'TOR',
    conference: 'Eastern Conference',
    aliases: ['tor', 'toronto', 'tempo'],
  },
  UNI: {
    display: 'UNI',
    conference: undefined,
    aliases: ['uni', 'unrivaled'],
  },
  WAS: {
    display: 'WAS',
    conference: 'Eastern Conference',
    aliases: ['was', 'washington', 'mystics', 'dc'],
  },
} as const

type KnownTeamCode = keyof typeof TEAM_METADATA

const TEAM_ALIASES = new Map<string, KnownTeamCode>()

for (const [teamCode, metadata] of Object.entries(TEAM_METADATA) as Array<[KnownTeamCode, (typeof TEAM_METADATA)[KnownTeamCode]]>) {
  TEAM_ALIASES.set(teamCode, teamCode)
  TEAM_ALIASES.set(metadata.display, teamCode)
  metadata.aliases.forEach(alias => TEAM_ALIASES.set(alias.toUpperCase().replace(/\s+/g, ''), teamCode))
}

export function normalizeTeamCode(team: string | null | undefined) {
  if (!team) return ''
  const normalized = team.toUpperCase().replace(/\s+/g, '')
  return TEAM_ALIASES.get(normalized) ?? normalized
}

export function getDisplayTeamCode(team: string | null | undefined) {
  const normalized = normalizeTeamCode(team)
  return (TEAM_METADATA[normalized as KnownTeamCode]?.display ?? normalized) || ''
}

export function getTeamConference(team: string | null | undefined): TeamConference | null {
  const normalized = normalizeTeamCode(team)
  return TEAM_METADATA[normalized as KnownTeamCode]?.conference ?? null
}

export function getTeamSearchAliases(team: string | null | undefined) {
  const normalized = normalizeTeamCode(team)
  const metadata = TEAM_METADATA[normalized as KnownTeamCode]
  if (!metadata) return normalized ? [normalized.toLowerCase()] : []
  return [...metadata.aliases]
}
