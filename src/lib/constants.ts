// App-wide constants

export const APP_NAME = '3x3 Basketball Championship'

export const MATCH_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Upcoming',
  live: 'Live',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const MATCH_STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-court-800 text-court-300 border border-court-700',
  live: 'bg-red-900/80 text-red-300 border border-red-700',
  completed: 'bg-dark-800 text-dark-300 border border-dark-700',
  cancelled: 'bg-dark-900 text-dark-500 border border-dark-800',
}

export const EVENT_LABELS: Record<string, string> = {
  one_point: '+1',
  two_point: '+2',
  free_throw: 'FT',
  foul: 'Foul',
  timeout: 'Timeout',
  shot_clock_violation: 'Shot Clock',
  game_start: 'Game Start',
  game_end: 'Game End',
  overtime_start: 'Overtime',
}

export const ROUND_OPTIONS = [
  'League',
  'Group Stage',
  'Round of 16',
  'Quarter Final',
  'Semi Final',
  'Final',
  '3rd Place',
]

export const COURT_OPTIONS = [
  'Court 1',
  'Court 2',
  'Court 3',
  'Main Court',
]

export const FORMAT_OPTIONS = [
  { value: 'round_robin', label: 'Round Robin' },
  { value: 'league', label: 'League' },
  { value: 'knockout', label: 'Knockout' },
  { value: 'group_knockout', label: 'Group Stage + Knockout' },
]

export const POSITION_OPTIONS = [
  'Guard',
  'Forward',
  'Center',
  'Point Guard',
  'Small Forward',
  'Power Forward',
]
