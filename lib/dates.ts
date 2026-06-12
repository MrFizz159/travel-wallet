// UTC-safe date helpers.
//
// Convention: all trip dates are calendar dates (YYYY-MM-DD strings); never
// parse them in local time. Parsing 'T00:00:00' (local midnight) and then
// serialising with toISOString() (UTC) shifts results a day early on any
// server east of UTC, including UK BST. Everything here parses with a 'Z'
// suffix, mutates via setUTCDate, and serialises back to YYYY-MM-DD.

export function subtractDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().split('T')[0]
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

// Inclusive day count: a same-day trip is 1 day, never less.
export function durationDays(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00Z')
  const e = new Date(end + 'T00:00:00Z')
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1)
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}
