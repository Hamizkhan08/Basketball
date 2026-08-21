import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { join } from 'path'

dotenv.config({ path: join(process.cwd(), '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase env variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function seed() {
  console.log('Seeding dummy data...')

  // 1. Create Tournament
  const { data: tournament, error: tError } = await supabase.from('tournaments').insert({
    name: 'GBL 3x3',
    college: 'State University',
    venue: 'GCOERC basketball court nashik',
    tournament_date: new Date().toISOString().split('T')[0],
    win_points: 2,
    draw_points: 1,
    loss_points: 0
  }).select().single()

  if (tError) throw tError
  console.log('Tournament created:', tournament.id)

  // 2. Create Teams
  const teamsData = [
    { name: 'Red Panthers', short_name: 'RED', college: 'State Univ' },
    { name: 'Blue Hawks', short_name: 'BLU', college: 'City College' },
    { name: 'Green Vipers', short_name: 'GRN', college: 'Tech Inst' },
    { name: 'Yellow Titans', short_name: 'YEL', college: 'West State' },
  ]

  const createdTeams = []
  for (const t of teamsData) {
    const { data } = await supabase.from('teams').insert({
      tournament_id: tournament.id,
      name: t.name,
      short_name: t.short_name,
      college: t.college
    }).select().single()
    createdTeams.push(data)
  }
  console.log('Teams created')

  // 3. Create Players
  const firstNames = ['John', 'Mike', 'Alex', 'Chris', 'David', 'Sam', 'Dan', 'Tom', 'James', 'Ryan', 'Josh', 'Ben', 'Will', 'Luke', 'Matt', 'Nick']
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas']
  
  let pIdx = 0
  for (const team of createdTeams) {
    for (let i = 0; i < 4; i++) {
      const name = `${firstNames[pIdx % firstNames.length]} ${lastNames[(pIdx + i) % lastNames.length]}`
      await supabase.from('players').insert({
        team_id: team.id,
        name: name,
        jersey_number: i + 1 + (pIdx * 2),
        position: i === 0 ? 'Guard' : i === 1 ? 'Forward' : 'Center'
      })
      pIdx++
    }
  }
  console.log('Players created')

  // 4. Create Matches
  // Round robin: RED vs BLU, GRN vs YEL, RED vs GRN, BLU vs YEL
  const matchesData = [
    { teamA: createdTeams[0].id, teamB: createdTeams[1].id, status: 'completed', court: 'Court 1' },
    { teamA: createdTeams[2].id, teamB: createdTeams[3].id, status: 'completed', court: 'Court 2' },
    { teamA: createdTeams[0].id, teamB: createdTeams[2].id, status: 'live', court: 'Court 1' },
    { teamA: createdTeams[1].id, teamB: createdTeams[3].id, status: 'scheduled', court: 'Court 2' },
  ]

  let matchNum = 1
  const createdMatches = []
  for (const m of matchesData) {
    const { data } = await supabase.from('matches').insert({
      tournament_id: tournament.id,
      match_number: matchNum++,
      team_a_id: m.teamA,
      team_b_id: m.teamB,
      status: m.status,
      court: m.court,
      round: 'Group Stage',
      game_clock_seconds: m.status === 'completed' ? 600 : m.status === 'live' ? 300 : 0,
      team_a_score: m.status === 'completed' ? 21 : m.status === 'live' ? 12 : 0,
      team_b_score: m.status === 'completed' ? 15 : m.status === 'live' ? 14 : 0,
    }).select().single()
    createdMatches.push(data)
  }
  console.log('Matches created')

  // 5. Team Match Stats for Completed Matches
  for (let i = 0; i < 2; i++) { // First two matches are completed
    const match = createdMatches[i]
    await supabase.from('team_match_stats').insert([
      {
        match_id: match.id,
        team_id: match.team_a_id,
        win: match.team_a_score > match.team_b_score ? 1 : 0,
        loss: match.team_a_score < match.team_b_score ? 1 : 0,
        draw: 0,
        points_for: match.team_a_score,
        points_against: match.team_b_score
      },
      {
        match_id: match.id,
        team_id: match.team_b_id,
        win: match.team_b_score > match.team_a_score ? 1 : 0,
        loss: match.team_b_score < match.team_a_score ? 1 : 0,
        draw: 0,
        points_for: match.team_b_score,
        points_against: match.team_a_score
      }
    ])
  }
  console.log('Team match stats created')

  console.log('✅ Dummy data seeded successfully!')
}

seed().catch(console.error)
