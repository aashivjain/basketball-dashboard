import { normalizeTeamCode } from './teamCodes'

// WNBA team color palettes
// primary: main team color, secondary: accent, bg: vibrant background tint

export const teamColors: Record<string, { primary: string; secondary: string; bg: string }> = {
  ATL: { primary: '#c8102e', secondary: '#418fde', bg: '#fde8e8' },
  CHI: { primary: '#418fde', secondary: '#c8102e', bg: '#dbeafe' },
  CON: { primary: '#002d62', secondary: '#c4d600', bg: '#dce6f5' },
  DAL: { primary: '#002b5c', secondary: '#c4d600', bg: '#dce5f0' },
  GS: { primary: '#5b2a86', secondary: '#8b5fbf', bg: '#f3e8ff' },
  IND: { primary: '#002d62', secondary: '#e03a3e', bg: '#fde2e2' },
  LAS: { primary: '#552583', secondary: '#fdb927', bg: '#ede9fe' },
  LVA: { primary: '#1a1a1a', secondary: '#c8102e', bg: '#e8e8e8' },
  MIN: { primary: '#236192', secondary: '#78be20', bg: '#dcfce7' },
  NYL: { primary: '#086b37', secondary: '#fdb927', bg: '#d1fae5' },
  PHX: { primary: '#201747', secondary: '#e56020', bg: '#fed7c5' },
  SEA: { primary: '#2c5234', secondary: '#fee11a', bg: '#d1fae5' },
  PDX: { primary: '#1d1160', secondary: '#e03a3e', bg: '#fce7f3' },
  TOR: { primary: '#000000', secondary: '#d81f32', bg: '#f3f4f6' },
  UNI: { primary: '#f26522', secondary: '#0c2340', bg: '#ffedd5' },
  WAS: { primary: '#e31837', secondary: '#002b5c', bg: '#fde2e2' },
}

// fallback for unknown teams
const fallback = { primary: '#334155', secondary: '#64748b', bg: '#f8fafc' }

export function getTeamColors(abbr: string) {
  return teamColors[normalizeTeamCode(abbr)] || fallback
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  const value = normalized.length === 3
    ? normalized.split('').map(char => char + char).join('')
    : normalized
  const int = Number.parseInt(value, 16)
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  }
}

function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const transform = (channel: number) => {
    const normalized = channel / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  }

  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b)
}

export function getReadableTeamAccent(abbr: string) {
  const palette = getTeamColors(abbr)
  const primaryLuminance = relativeLuminance(palette.primary)
  if (primaryLuminance <= 0.3) return palette.primary

  const secondaryLuminance = relativeLuminance(palette.secondary)
  if (secondaryLuminance <= 0.3) return palette.secondary

  return '#1e293b'
}
