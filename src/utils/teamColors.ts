// WNBA team color palettes
// primary: main team color, secondary: accent, bg: vibrant background tint

export const teamColors: Record<string, { primary: string; secondary: string; bg: string }> = {
  ATL: { primary: '#c8102e', secondary: '#418fde', bg: '#fde8e8' },
  CHI: { primary: '#418fde', secondary: '#c8102e', bg: '#dbeafe' },
  CON: { primary: '#002d62', secondary: '#c4d600', bg: '#dce6f5' },
  DAL: { primary: '#002b5c', secondary: '#c4d600', bg: '#dce5f0' },
  GS: { primary: '#1d428a', secondary: '#ffc72c', bg: '#fef3c7' },
  IND: { primary: '#002d62', secondary: '#e03a3e', bg: '#fde2e2' },
  LAS: { primary: '#552583', secondary: '#fdb927', bg: '#ede9fe' },
  LVA: { primary: '#1a1a1a', secondary: '#c8102e', bg: '#e8e8e8' },
  MIN: { primary: '#236192', secondary: '#78be20', bg: '#dcfce7' },
  NYL: { primary: '#086b37', secondary: '#fdb927', bg: '#d1fae5' },
  PHX: { primary: '#201747', secondary: '#e56020', bg: '#fed7c5' },
  SEA: { primary: '#2c5234', secondary: '#fee11a', bg: '#d1fae5' },
  UNI: { primary: '#f26522', secondary: '#0c2340', bg: '#ffedd5' },
  WAS: { primary: '#e31837', secondary: '#002b5c', bg: '#fde2e2' },
}

// fallback for unknown teams
const fallback = { primary: '#334155', secondary: '#64748b', bg: '#f8fafc' }

export function getTeamColors(abbr: string) {
  return teamColors[abbr] || fallback
}
