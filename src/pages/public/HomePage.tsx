import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Radio, Clock, MapPin, Calendar, Trophy, Zap } from 'lucide-react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { useTournament } from '@/hooks/useTournament'
import { useGameClock } from '@/hooks/useGameClock'
import { supabase } from '@/lib/supabase'
import type { Match, Team, Player, PlayerTournamentStats } from '@/lib/database.types'
import { formatTime, formatDate, formatMatchTime, getInitials } from '@/lib/utils'

// Live match score card
function LiveMatchCard({ match, teamA, teamB }: { match: Match; teamA: Team; teamB: Team }) {
  const { gameClock } = useGameClock(match)
  return (
    <Link to="/live" className="block">
      <div className="rounded-none bg-ink text-canvas border border-ink p-5 sm:p-6 hover:shadow-xl transition-all">
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <span className="w-2 h-2 rounded-full bg-sale live-pulse" />
          <span className="text-sale font-bold text-xs sm:text-sm tracking-wider uppercase">Live Now</span>
        </div>
        <div className="grid grid-cols-3 items-center gap-4">
          {/* Team A */}
          <div className="text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-none bg-canvas border border-hairline flex items-center justify-center mb-2 sm:mb-3">
              {teamA.logo_url ? (
                <img src={teamA.logo_url} alt={teamA.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-none object-cover" />
              ) : (
                <span className="text-xl sm:text-2xl font-black text-ink">{getInitials(teamA.name)}</span>
              )}
            </div>
            <p className="font-bold text-canvas text-xs sm:text-sm truncate">{teamA.short_name || teamA.name}</p>
          </div>

          {/* Score */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <span className="score-display text-4xl sm:text-6xl font-black text-canvas">{match.team_a_score}</span>
              <span className="text-zinc-500 text-xl sm:text-2xl font-light">—</span>
              <span className="score-display text-4xl sm:text-6xl font-black text-canvas">{match.team_b_score}</span>
            </div>
            <p className="text-sale font-mono text-base sm:text-lg font-bold">{formatTime(gameClock)}</p>
            {match.is_overtime && <p className="text-sale text-[10px] sm:text-xs font-bold mt-1">OVERTIME</p>}
          </div>

          {/* Team B */}
          <div className="text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-none bg-canvas border border-hairline flex items-center justify-center mb-2 sm:mb-3">
              {teamB.logo_url ? (
                <img src={teamB.logo_url} alt={teamB.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-none object-cover" />
              ) : (
                <span className="text-xl sm:text-2xl font-black text-ink">{getInitials(teamB.name)}</span>
              )}
            </div>
            <p className="font-bold text-canvas text-xs sm:text-sm truncate">{teamB.short_name || teamB.name}</p>
          </div>
        </div>
        <div className="mt-4 sm:mt-6 text-center">
          <span className="text-xs sm:text-sm text-zinc-500 flex items-center justify-center gap-2">
            <span className="text-canvas font-bold hover:underline">Watch Live →</span>
          </span>
        </div>
      </div>
    </Link>
  )
}

// Upcoming match row
function MatchRow({ match, teamA, teamB }: { match: Match; teamA: Team; teamB: Team }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-hairline last:border-0 hover:bg-soft-cloud px-2 transition-colors">
      <div className="text-zinc-500 text-xs font-mono w-16 text-center">#{match.match_number}</div>
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className="font-bold text-ink text-sm truncate">{teamA.short_name || teamA.name}</span>
        <span className="text-zinc-500 text-xs font-bold">vs</span>
        <span className="font-bold text-ink text-sm truncate">{teamB.short_name || teamB.name}</span>
      </div>
      <div className="text-right text-xs text-zinc-500 flex-shrink-0">
        <p className="font-bold text-ink">{formatMatchTime(match.scheduled_time)}</p>
        <p>{match.court}</p>
      </div>
      <Badge variant="scheduled">Upcoming</Badge>
    </div>
  )
}

export default function HomePage() {
  const { tournament } = useTournament()
  const [liveMatch, setLiveMatch] = useState<{ match: Match; teamA: Team; teamB: Team } | null>(null)
  const [upcomingMatches, setUpcomingMatches] = useState<Array<{ match: Match; teamA: Team; teamB: Team }>>([])
  const [recentMatches, setRecentMatches] = useState<Array<{ match: Match; teamA: Team; teamB: Team }>>([])
  const [topScorers, setTopScorers] = useState<PlayerTournamentStats[]>([])
  const [topTeams, setTopTeams] = useState<Array<{ team: Team; wins: number; losses: number; points: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!tournament) { setLoading(false); return }

      const [liveRes, upcomingRes, recentRes] = await Promise.all([
        supabase.from('matches').select('*').eq('tournament_id', tournament.id).eq('status', 'live').limit(1).single(),
        supabase.from('matches').select('*').eq('tournament_id', tournament.id).eq('status', 'scheduled').order('scheduled_date').order('scheduled_time').limit(5),
        supabase.from('matches').select('*').eq('tournament_id', tournament.id).eq('status', 'completed').order('ended_at', { ascending: false }).limit(5),
      ])

      const allMatchData = [
        ...(liveRes.data ? [liveRes.data as Match] : []),
        ...((upcomingRes.data as Match[]) ?? []),
        ...((recentRes.data as Match[]) ?? []),
      ]

      // Collect all team IDs
      const teamIds = new Set<string>()
      allMatchData.forEach(m => { teamIds.add(m.team_a_id); teamIds.add(m.team_b_id) })

      const { data: teamsData } = await supabase.from('teams').select('*').in('id', [...teamIds])
      const teamsMap = new Map<string, Team>((teamsData as Team[] ?? []).map(t => [t.id, t]))

      const buildMatchTuple = (m: Match) => ({
        match: m,
        teamA: teamsMap.get(m.team_a_id)!,
        teamB: teamsMap.get(m.team_b_id)!,
      })

      if (liveRes.data) setLiveMatch(buildMatchTuple(liveRes.data as Match))
      setUpcomingMatches(((upcomingRes.data as Match[]) ?? []).map(buildMatchTuple).filter(x => x.teamA && x.teamB))
      setRecentMatches(((recentRes.data as Match[]) ?? []).map(buildMatchTuple).filter(x => x.teamA && x.teamB))

      // Top scorers
      const { data: statsData } = await supabase
        .from('player_match_stats')
        .select('player_id, team_id, one_point_scores, two_point_scores, free_throws, total_points')
        .order('total_points', { ascending: false })
        .limit(3)

      if (statsData && statsData.length > 0) {
        const playerIds = statsData.map((s: any) => s.player_id)
        const { data: playersData } = await supabase.from('players').select('*').in('id', playerIds)
        const pMap = new Map<string, Player>((playersData as Player[] ?? []).map(p => [p.id, p]))

        const aggregated: Record<string, PlayerTournamentStats> = {}
        for (const s of statsData as any[]) {
          if (!aggregated[s.player_id]) {
            aggregated[s.player_id] = {
              player: pMap.get(s.player_id)!,
              team: teamsMap.get(s.team_id)!,
              total_points: 0,
              one_point_scores: 0,
              two_point_scores: 0,
              free_throws: 0,
              matches_played: 0,
            }
          }
          const a = aggregated[s.player_id]
          a.total_points += s.total_points
          a.one_point_scores += s.one_point_scores
          a.two_point_scores += s.two_point_scores
          a.free_throws += s.free_throws
          a.matches_played += 1
        }
        setTopScorers(Object.values(aggregated).sort((a, b) => b.total_points - a.total_points).slice(0, 3))
      }

      // Top teams from team_match_stats
      const { data: teamStatsData } = await supabase
        .from('team_match_stats')
        .select('team_id, win, draw, loss, points_for')

      if (teamStatsData) {
        const teamAgg: Record<string, { wins: number; losses: number; points: number }> = {}
        for (const s of teamStatsData as any[]) {
          if (!teamAgg[s.team_id]) teamAgg[s.team_id] = { wins: 0, losses: 0, points: 0 }
          teamAgg[s.team_id].wins += s.win
          teamAgg[s.team_id].losses += s.loss
          teamAgg[s.team_id].points += s.points_for
        }

        const teamIds2 = Object.keys(teamAgg)
        const { data: tData } = await supabase.from('teams').select('*').in('id', teamIds2)
        const top = (tData as Team[] ?? []).map(t => ({
          team: t,
          ...teamAgg[t.id],
        })).sort((a, b) => b.wins - a.wins).slice(0, 5)
        setTopTeams(top)
      }

      setLoading(false)
    }

    fetchData()
  }, [tournament])

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden mb-10 bg-ink border border-ink text-canvas">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-black to-black" />
        <div className="relative px-4 sm:px-8 py-12 md:py-24 text-center">
          {tournament?.logo_url && (
            <img src={tournament.logo_url} alt="Tournament Logo" className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-none mb-6 object-contain" />
          )}
          <div className="inline-flex items-center gap-2 bg-canvas/10 backdrop-blur-sm border border-canvas/20 px-3 sm:px-4 py-1.5 rounded-full mb-6">
            <Zap size={14} className="text-sale" />
            <span className="text-canvas text-xs sm:text-sm font-bold uppercase tracking-widest">FIBA 3x3</span>
          </div>
          <h1 className="display-campaign text-canvas mb-6 leading-[0.85] tracking-tight">
            {tournament?.name || 'COLLEGE 3X3 BASKETBALL CHAMPIONSHIP'}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-zinc-400 text-xs sm:text-sm mb-10 max-w-2xl mx-auto">
            {tournament?.college && (
              <span className="flex items-center gap-1.5"><Trophy size={14} className="text-canvas" />{tournament.college}</span>
            )}
            {tournament?.venue && (
              <span className="flex items-center gap-1.5"><MapPin size={14} className="text-canvas" />{tournament.venue}</span>
            )}
            {tournament?.tournament_date && (
              <span className="flex items-center gap-1.5"><Calendar size={14} className="text-canvas" />{formatDate(tournament.tournament_date)}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/matches" className="bg-canvas text-ink hover:bg-soft-cloud font-bold uppercase tracking-widest text-sm inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 transition-all shadow-xl">
              View Matches <ArrowRight size={18} />
            </Link>
            <Link to="/live" className="bg-sale text-canvas hover:bg-sale/90 font-bold uppercase tracking-widest text-sm inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 transition-all shadow-xl">
              <span className="w-2 h-2 rounded-full bg-canvas live-pulse" />
              Live Match
            </Link>
          </div>
        </div>
      </section>

      {/* Live Match */}
      <section className="mb-10">
        <h2 className="section-title flex items-center gap-2">
          <Radio size={22} className="text-sale" /> Live Now
        </h2>
        {liveMatch ? (
          <LiveMatchCard {...liveMatch} />
        ) : (
          <div className="admin-card py-12 text-center bg-soft-cloud">
            <div className="w-12 h-12 mx-auto rounded-full bg-canvas border border-hairline flex items-center justify-center mb-3">
              <Radio size={20} className="text-zinc-500" />
            </div>
            <p className="text-ink font-bold">No Live Match</p>
            <p className="text-zinc-500 text-sm mt-1">Matches will appear here when they go live</p>
          </div>
        )}
      </section>

      <div className="grid md:grid-cols-2 gap-8 mb-10">
        {/* Upcoming Matches */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-ink flex items-center gap-2">
              <Clock size={18} className="text-ink" /> Upcoming Matches
            </h2>
            <Link to="/matches" className="text-ink text-sm font-bold hover:underline flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="admin-card p-2">
            {upcomingMatches.length === 0 ? (
              <EmptyState title="No upcoming matches" description="Fixtures will appear here once scheduled." />
            ) : (
              upcomingMatches.map(({ match, teamA, teamB }) => (
                <MatchRow key={match.id} match={match} teamA={teamA} teamB={teamB} />
              ))
            )}
          </div>
        </section>

        {/* Recent Results */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-ink flex items-center gap-2">
              <Trophy size={18} className="text-ink" /> Recent Results
            </h2>
            <Link to="/matches?filter=completed" className="text-ink text-sm font-bold hover:underline flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="admin-card p-2">
            {recentMatches.length === 0 ? (
              <EmptyState title="No results yet" description="Completed match results will appear here." />
            ) : (
              recentMatches.map(({ match, teamA, teamB }) => (
                <div key={match.id} className="flex items-center gap-3 py-3 border-b border-hairline last:border-0 px-2">
                  <span className="text-zinc-500 text-xs w-8">#{match.match_number}</span>
                  <div className="flex-1 flex items-center gap-2 text-sm min-w-0">
                    <span className={`font-bold truncate ${match.winner_team_id === teamA.id ? 'text-ink' : 'text-zinc-500'}`}>
                      {teamA.short_name || teamA.name}
                    </span>
                    <span className="font-mono text-ink font-bold flex-shrink-0">{match.team_a_score}–{match.team_b_score}</span>
                    <span className={`font-bold truncate ${match.winner_team_id === teamB.id ? 'text-ink' : 'text-zinc-500'}`}>
                      {teamB.short_name || teamB.name}
                    </span>
                  </div>
                  <Badge variant="completed">FT</Badge>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Leaderboard */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-ink flex items-center gap-2">
              <Trophy size={18} className="text-ink" /> Standings
            </h2>
            <Link to="/points-table" className="text-ink text-sm font-bold hover:underline flex items-center gap-1">
              Full table <ArrowRight size={14} />
            </Link>
          </div>
          <div className="admin-card overflow-hidden">
            {topTeams.length === 0 ? (
              <EmptyState title="No standings yet" description="Standings update after matches complete." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline">
                    <th className="px-4 py-3 text-left text-zinc-500 text-xs font-bold uppercase">#</th>
                    <th className="px-4 py-3 text-left text-zinc-500 text-xs font-bold uppercase">Team</th>
                    <th className="px-4 py-3 text-center text-zinc-500 text-xs font-bold uppercase">W</th>
                    <th className="px-4 py-3 text-center text-zinc-500 text-xs font-bold uppercase">L</th>
                    <th className="px-4 py-3 text-center text-zinc-500 text-xs font-bold uppercase">PF</th>
                  </tr>
                </thead>
                <tbody>
                  {topTeams.map((item, i) => (
                    <tr key={item.team.id} className="border-b border-hairline last:border-0 hover:bg-soft-cloud transition-colors">
                      <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{i + 1}</td>
                      <td className="px-4 py-3">
                        <Link to={`/teams/${item.team.id}`} className="font-bold text-ink hover:text-zinc-500 transition-colors">
                          {item.team.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center text-ink font-bold">{item.wins}</td>
                      <td className="px-4 py-3 text-center text-zinc-500">{item.losses}</td>
                      <td className="px-4 py-3 text-center text-ink font-mono font-bold">{item.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Best Shooters */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-ink flex items-center gap-2">
              <Zap size={18} className="text-ink" /> Best Shooters
            </h2>
            <Link to="/best-shooters" className="text-ink text-sm font-bold hover:underline flex items-center gap-1">
              Full list <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {topScorers.length === 0 ? (
              <div className="admin-card">
                <EmptyState title="No stats yet" description="Player stats will appear after matches are scored." />
              </div>
            ) : (
              topScorers.map((stat, i) => (
                <div key={stat.player.id} className="admin-card flex items-center gap-4 py-4 px-4">
                  <span className={`text-2xl font-black w-8 text-center score-display ${i === 0 ? 'text-ink' : 'text-zinc-500'}`}>
                    {i + 1}
                  </span>
                  <div className="w-10 h-10 rounded-none bg-soft-cloud border border-hairline flex items-center justify-center text-sm font-bold text-ink flex-shrink-0">
                    {stat.player.photo_url ? (
                      <img src={stat.player.photo_url} alt={stat.player.name} className="w-10 h-10 rounded-none object-cover" />
                    ) : getInitials(stat.player.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-ink">{stat.player.name}</p>
                    <p className="text-zinc-500 text-xs">{stat.team?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-ink score-display">{stat.total_points}</p>
                    <p className="text-zinc-500 font-bold text-[10px]">PTS</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </PublicLayout>
  )
}

