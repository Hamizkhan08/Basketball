// Database types matching the SQL schema

export interface Tournament {
  id: string
  name: string
  college: string
  venue: string
  tournament_date: string | null
  logo_url: string | null
  status: 'upcoming' | 'active' | 'completed'
  match_duration_seconds: number
  shot_clock_seconds: number
  winning_score: number
  inside_arc_points: number
  outside_arc_points: number
  free_throw_points: number
  win_points: number
  draw_points: number
  loss_points: number
  overtime_target: number
  tournament_format: 'round_robin' | 'league' | 'knockout' | 'group_knockout'
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  tournament_id: string
  name: string
  short_name: string
  college: string
  logo_url: string | null
  pool_name: string | null
  captain_player_id: string | null
  created_at: string
  updated_at: string
}

export interface Player {
  id: string
  team_id: string
  name: string
  jersey_number: number
  position: string
  photo_url: string | null
  created_at: string
  updated_at: string
}

export type MatchStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'
export type EventType =
  | 'one_point'
  | 'two_point'
  | 'free_throw'
  | 'foul'
  | 'timeout'
  | 'shot_clock_violation'
  | 'game_start'
  | 'game_end'
  | 'overtime_start'

export interface Match {
  id: string
  tournament_id: string
  match_number: number
  team_a_id: string
  team_b_id: string
  scheduled_date: string | null
  scheduled_time: string | null
  court: string
  round: string
  status: MatchStatus
  team_a_score: number
  team_b_score: number
  winner_team_id: string | null
  is_overtime: boolean
  game_clock_seconds: number
  shot_clock_seconds: number
  game_clock_running: boolean
  shot_clock_running: boolean
  last_clock_update: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
  updated_at: string
}

export interface MatchEvent {
  id: string
  match_id: string
  team_id: string | null
  player_id: string | null
  event_type: EventType
  points: number
  game_clock_seconds: number
  shot_clock_seconds: number
  created_at: string
}

export interface PlayerMatchStats {
  id: string
  match_id: string
  player_id: string
  team_id: string
  one_point_scores: number
  two_point_scores: number
  free_throws: number
  total_points: number
}

export interface TeamMatchStats {
  id: string
  match_id: string
  team_id: string
  points_for: number
  points_against: number
  result: 'win' | 'draw' | 'loss' | null
  win: number
  draw: number
  loss: number
}

// Joined/derived types
export interface MatchWithTeams extends Match {
  team_a: Team
  team_b: Team
  winner?: Team | null
}

export interface PlayerWithTeam extends Player {
  team: Team
}

export interface PlayerTournamentStats {
  player: Player
  team: Team
  total_points: number
  one_point_scores: number
  two_point_scores: number
  free_throws: number
  matches_played: number
}

export interface TeamStanding {
  team: Team
  played: number
  wins: number
  draws: number
  losses: number
  points_for: number
  points_against: number
  point_diff: number
  tournament_points: number
}

// Database type map for Supabase generic client
export type Database = {
  public: {
    Tables: {
      tournaments: { Row: Tournament; Insert: Partial<Tournament>; Update: Partial<Tournament> }
      teams: { Row: Team; Insert: Partial<Team>; Update: Partial<Team> }
      players: { Row: Player; Insert: Partial<Player>; Update: Partial<Player> }
      matches: { Row: Match; Insert: Partial<Match>; Update: Partial<Match> }
      match_events: { Row: MatchEvent; Insert: Partial<MatchEvent>; Update: Partial<MatchEvent> }
      player_match_stats: { Row: PlayerMatchStats; Insert: Partial<PlayerMatchStats>; Update: Partial<PlayerMatchStats> }
      team_match_stats: { Row: TeamMatchStats; Insert: Partial<TeamMatchStats>; Update: Partial<TeamMatchStats> }
    }
  }
}
