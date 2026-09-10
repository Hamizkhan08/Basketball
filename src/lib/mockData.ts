import type { Team, Player, Match, TeamStanding, PlayerTournamentStats } from './database.types'

export const USE_MOCK_DATA = true;

const t = (id: string, name: string, short: string, cid?: string): Team => ({
  id,
  tournament_id: 'mock-tourney',
  name,
  short_name: short,
  college: 'GCOERC',
  logo_url: null,
  captain_player_id: cid || null,
  pool_name: 'A',
  created_at: new Date().toISOString()
})

const p = (id: string, name: string, team_id: string, jn: number, pos: string): Player => ({
  id,
  team_id,
  name,
  jersey_number: jn,
  position: pos,
  created_at: new Date().toISOString()
})

export const MOCK_TEAMS: Team[] = [
  t('t-ashmit', 'Ashmit Team', 'ASH', 'p-ashmit-c'),
  t('t-irregulars', 'The Irregulars', 'IRR', 'p-hamiz'),
  t('t-dominators', 'Dominators', 'DOM', 'p-hrishikesh'),
  t('t-allstar', 'All Star', 'ALL', 'p-akhilesh'),
  t('t-diploma', 'Diploma', 'DIP', 'p-dip1'),
  t('t-underdogs', 'Underdogs', 'UND', 'p-sahil'),
  t('t-hoopers', 'Hoopers', 'HOO', 'p-gungun'),
]

export const MOCK_PLAYERS: Player[] = [
  // Dominators
  p('p-hrishikesh', 'Hrishikesh Uttam Shinde', 't-dominators', 1, 'Captain'),
  p('p-heramb', 'Heramb Raut', 't-dominators', 2, 'Player'),
  p('p-amol', 'Amol Gawali', 't-dominators', 3, 'Player'),
  p('p-trisha', 'Trisha Dive', 't-dominators', 4, 'Player'),

  // Underdogs
  p('p-nilesh', 'Nilesh Dawange', 't-underdogs', 1, 'Player'),
  p('p-chaitanya', 'Chaitanya Shinde', 't-underdogs', 2, 'Player'),
  p('p-sahil', 'Sahil Aher', 't-underdogs', 3, 'Captain'),
  p('p-renuka', 'Renuka Jangam', 't-underdogs', 4, 'Player'),

  // The Irregulars
  p('p-hamiz', 'Hamiz Khan', 't-irregulars', 1, 'Captain'),
  p('p-taufique', 'Taufique', 't-irregulars', 2, 'Player'),
  p('p-rugved', 'Rugved Misal', 't-irregulars', 3, 'Player'),
  p('p-nabhesh', 'Nabhesh Dayma', 't-irregulars', 4, 'Player'),

  // Ashmit Team
  p('p-darshan', 'Darshan Badgujar', 't-ashmit', 1, 'Player'),
  p('p-ashmit-c', 'Ashmit Vikas Pardeshi', 't-ashmit', 2, 'Captain'),
  p('p-vedant', 'Vedant Mumdaware', 't-ashmit', 3, 'Player'),
  p('p-aayush', 'Aayush Mahajan', 't-ashmit', 4, 'Player'),

  // All Star
  p('p-akhilesh', 'Akhilesh', 't-allstar', 1, 'Captain'),
  p('p-manish', 'Manish Das', 't-allstar', 2, 'Player'),
  p('p-atharva', 'Atharva Astekar', 't-allstar', 3, 'Player'),
  p('p-savidhan', 'Savidhan Javare', 't-allstar', 4, 'Player'),

  // Hoopers
  p('p-gungun', 'Gungun Rajput', 't-hoopers', 1, 'Captain'),
  p('p-ruchita', 'Ruchita Mishra', 't-hoopers', 2, 'Player'),
  p('p-maahi', 'Maahi Grover', 't-hoopers', 3, 'Player'),

  // Diploma
  p('p-dip1', 'Player 1', 't-diploma', 1, 'Captain'),
  p('p-dip2', 'Player 2', 't-diploma', 2, 'Player'),
  p('p-dip3', 'Player 3', 't-diploma', 3, 'Player'),
]

const m = (num: number, ta: string, tb: string, sa: number, sb: number): Match => ({
  id: `m-${num}`,
  tournament_id: 'mock-tourney',
  match_number: num,
  round_name: 'League',
  team_a_id: ta,
  team_b_id: tb,
  status: 'completed',
  team_a_score: sa,
  team_b_score: sb,
  winner_team_id: sa > sb ? ta : (sb > sa ? tb : null),
  court_name: 'Main Court',
  scheduled_date: '2026-09-10',
  scheduled_time: '10:00',
  created_at: new Date().toISOString()
})

export const MOCK_MATCHES: Match[] = [
  m(1, 't-underdogs', 't-ashmit', 1, 7),
  m(2, 't-dominators', 't-hoopers', 15, 6),
  m(3, 't-irregulars', 't-diploma', 5, 2),
  m(4, 't-allstar', 't-underdogs', 12, 9),
  m(5, 't-ashmit', 't-hoopers', 11, 4),
  m(6, 't-diploma', 't-dominators', 3, 10),
  m(7, 't-allstar', 't-irregulars', 3, 8),
  m(8, 't-hoopers', 't-underdogs', 1, 4),
  m(9, 't-ashmit', 't-diploma', 5, 2),
  m(10, 't-irregulars', 't-dominators', 5, 5),
  m(11, 't-hoopers', 't-allstar', 8, 4),
  m(12, 't-diploma', 't-underdogs', 9, 3),
  m(13, 't-ashmit', 't-irregulars', 5, 4),
  m(14, 't-allstar', 't-dominators', 3, 3),
  m(15, 't-hoopers', 't-diploma', 2, 3),
  m(16, 't-irregulars', 't-underdogs', 5, 4),
  m(17, 't-dominators', 't-ashmit', 4, 4),
  m(18, 't-allstar', 't-diploma', 6, 1),
  m(19, 't-hoopers', 't-irregulars', 2, 6),
  m(20, 't-dominators', 't-underdogs', 11, 5),
  m(21, 't-allstar', 't-ashmit', 1, 4),
]

const st = (tid: string, p: number, w: number, d: number, l: number, pf: number, pa: number, pts: number): TeamStanding => ({
  team: MOCK_TEAMS.find(x => x.id === tid)!,
  played: p, wins: w, draws: d, losses: l, points_for: pf, points_against: pa, point_diff: pf - pa, tournament_points: pts
})

export const MOCK_STANDINGS: Record<string, TeamStanding[]> = {
  'A': [
    st('t-ashmit', 6, 5, 1, 0, 36, 12, 16),
    st('t-irregulars', 6, 4, 1, 1, 33, 21, 13),
    st('t-dominators', 6, 3, 3, 0, 48, 26, 12),
    st('t-allstar', 6, 2, 1, 3, 29, 33, 7),
    st('t-diploma', 6, 2, 0, 4, 20, 31, 6),
    st('t-underdogs', 6, 1, 0, 5, 26, 40, 3),
    st('t-hoopers', 6, 1, 0, 5, 23, 43, 3),
  ]
}

const pts = (pid: string, total: number): PlayerTournamentStats => {
  const p = MOCK_PLAYERS.find(x => x.id === pid)!;
  const t = MOCK_TEAMS.find(x => x.id === p.team_id)!;
  return {
    player_id: pid,
    player_name: p.name,
    team_name: t.name,
    matches_played: 6,
    total_points: total,
    one_point_scores: 0,
    two_point_scores: 0,
    free_throws: 0
  }
}

export const MOCK_TOP_SCORERS: PlayerTournamentStats[] = [
  pts('p-hrishikesh', 33),
  pts('p-nilesh', 31),
  pts('p-hamiz', 30),
  pts('p-darshan', 30),
  pts('p-taufique', 27),
  pts('p-akhilesh', 26),
  pts('p-heramb', 24),
  pts('p-ashmit-c', 23),
  pts('p-amol', 21),
  pts('p-manish', 20),
  pts('p-vedant', 20),
  pts('p-chaitanya', 19),
  pts('p-rugved', 18),
  pts('p-gungun', 16),
  pts('p-trisha', 15),
  pts('p-nabhesh', 15),
  pts('p-atharva', 14),
  pts('p-aayush', 13),
  pts('p-sahil', 13),
  pts('p-ruchita', 12),
  pts('p-renuka', 10),
  pts('p-savidhan', 9),
  pts('p-maahi', 8),
  pts('p-dip1', 6),
  pts('p-dip2', 4),
  pts('p-dip3', 2),
]
