// WNBA team color palettes
// primary: main team color, secondary: accent, bg: subtle background tint

export const teamColors: Record<string, { primary: string; secondary: string; bg: string }> = {
  ATL: { primary: '#c8102e', secondary: '#418fde', bg: '#fef2f2' },
  CHI: { primary: '#418fde', secondary: '#c8102e', bg: '#eff6ff' },
  CON: { primary: '#002d62', secondary: '#c4d600', bg: '#f0f4ff' },
  DAL: { primary: '#002b5c', secondary: '#c4d600', bg: '#f0f4f9' },
  GS: { primary: '#1d428a', secondary: '#ffc72c', bg: '#fefce8' },
  IND: { primary: '#002d62', secondary: '#e03a3e', bg: '#fef2f2' },
  LAS: { primary: '#552583', secondary: '#fdb927', bg: '#faf5ff' },
  LVA: { primary: '#000000', secondary: '#c8102e', bg: '#f5f5f5' },
  MIN: { primary: '#236192', secondary: '#78be20', bg: '#f0f9f4' },
  NYL: { primary: '#086b37', secondary: '#fdb927', bg: '#f0fdf4' },
  PHX: { primary: '#201747', secondary: '#e56020', bg: '#fef3ed' },
  SEA: { primary: '#2c5234', secondary: '#fee11a', bg: '#f0fdf4' },
  UNI: { primary: '#f26522', secondary: '#0c2340', bg: '#fff7ed' },
  WAS: { primary: '#e31837', secondary: '#002b5c', bg: '#fef2f2' },
}

// fallback for unknown teams
const fallback = { primary: '#334155', secondary: '#64748b', bg: '#f8fafc' }

export function getTeamColors(abbr: string) {
  return teamColors[abbr] || fallback
}
