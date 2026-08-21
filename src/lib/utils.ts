import type { Match } from './database.types'

/** Format seconds as MM:SS */
export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

/** Format shot clock seconds as 2-digit number */
export function formatShotClock(seconds: number): string {
  return String(Math.max(0, Math.floor(seconds))).padStart(2, '0')
}

/** Calculate the current game clock display time from DB state */
export function calculateCurrentClock(match: Match): number {
  if (!match.game_clock_running || !match.last_clock_update) {
    return match.game_clock_seconds
  }
  const elapsed = (Date.now() - new Date(match.last_clock_update).getTime()) / 1000
  return Math.max(0, match.game_clock_seconds - elapsed)
}

/** Calculate the current shot clock display time from DB state */
export function calculateCurrentShotClock(match: Match): number {
  if (!match.shot_clock_running || !match.last_clock_update) {
    return match.shot_clock_seconds
  }
  const elapsed = (Date.now() - new Date(match.last_clock_update).getTime()) / 1000
  return Math.max(0, match.shot_clock_seconds - elapsed)
}

/** Format a date string as a human-readable date */
export function formatDate(date: string | null): string {
  if (!date) return 'TBD'
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Format a time string as a human-readable time */
export function formatMatchTime(time: string | null): string {
  if (!time) return 'TBD'
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${m} ${ampm}`
}

/** Truncate a string to a max length */
export function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max) + '…'
}

/** Get initials from a name (up to 2 chars) */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/** Generate round-robin fixtures from team IDs */
export function generateRoundRobinFixtures(teamIds: string[]): Array<[string, string]> {
  const fixtures: Array<[string, string]> = []
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      fixtures.push([teamIds[i], teamIds[j]])
    }
  }
  return fixtures
}

/** Get Supabase storage public URL */
export function getStorageUrl(bucket: string, path: string | null): string | null {
  if (!path) return null
  const baseUrl = import.meta.env.VITE_SUPABASE_URL
  return `${baseUrl}/storage/v1/object/public/${bucket}/${path}`
}

/** Clamp a number between min and max */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

/** Check if a match is currently in overtime */
export function isMatchInOvertime(match: Match): boolean {
  return match.is_overtime
}
