import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Shield, Users, Trophy } from 'lucide-react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase'
import type { Team, Player, Match, PlayerMatchStats } from '@/lib/database.types'
import { getInitials, formatDate, formatMatchTime } from '@/lib/utils'
import { USE_MOCK_DATA, MOCK_TEAMS, MOCK_PLAYERS, MOCK_MATCHES, MOCK_TOP_SCORERS } from '@/lib/mockData'

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [team, setTeam] = useState<Team | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Array<{ match: Match; opponent: Team; isTeamA: boolean }>>([])
  const [stats, setStats] = useState<Record<string, PlayerMatchStats & { matches_played: number }>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    if (USE_MOCK_DATA) {
      const t = MOCK_TEAMS.find(x => x.id === id);
      if (!t) { setLoading(false); return; }
      setTeam(t);
      const playerList = MOCK_PLAYERS.filter(p => p.team_id === id);
      setPlayers(playerList);

      const allMatches = [
        ...MOCK_MATCHES.filter(m => m.team_a_id === id).map(m => ({ match: m, isTeamA: true })),
        ...MOCK_MATCHES.filter(m => m.team_b_id === id).map(m => ({ match: m, isTeamA: false }))
      ];
      const oppMap = new Map<string, Team>(MOCK_TEAMS.map(x => [x.id, x]));
      setMatches(allMatches.map(({ match, isTeamA }) => ({
        match,
        isTeamA,
        opponent: oppMap.get(isTeamA ? match.team_b_id : match.team_a_id)!,
      })));

      const agg: Record<string, PlayerMatchStats & { matches_played: number }> = {};
      for (const p of playerList) {
        const s = MOCK_TOP_SCORERS.find(x => x.player.id === p.id);
        if (s) {
          agg[p.id] = {
            id: 'mock', player_id: p.id, team_id: t.id, match_id: 'mock',
            total_points: s.total_points,
            one_point_scores: s.one_point_scores,
            two_point_scores: s.two_point_scores,
            free_throws: s.free_throws,
            matches_played: s.matches_played
          }
        }
      }
      setStats(agg);
      setLoading(false);
      return;
    }

    async function fetchData() {
      const [teamRes, playersRes] = await Promise.all([
        supabase.from('teams').select('*').eq('id', id).single(),
        supabase.from('players').select('*').eq('team_id', id).order('jersey_number'),
      ])

      const t = teamRes.data as Team
      setTeam(t)
      const playerList = (playersRes.data as Player[]) ?? []
      setPlayers(playerList)

      // Matches
      const { data: matchesA } = await supabase.from('matches').select('*').eq('team_a_id', id).neq('status', 'cancelled').order('scheduled_date')
      const { data: matchesB } = await supabase.from('matches').select('*').eq('team_b_id', id).neq('status', 'cancelled').order('scheduled_date')

      const allMatches = [
        ...((matchesA as Match[]) ?? []).map(m => ({ match: m, isTeamA: true })),
        ...((matchesB as Match[]) ?? []).map(m => ({ match: m, isTeamA: false })),
      ]

      const oppIds = allMatches.map(({ match, isTeamA }) => isTeamA ? match.team_b_id : match.team_a_id)
      const { data: oppData } = await supabase.from('teams').select('*').in('id', [...new Set(oppIds)])
      const oppMap = new Map<string, Team>((oppData as Team[] ?? []).map(t => [t.id, t]))

      setMatches(allMatches.map(({ match, isTeamA }) => ({
        match,
        isTeamA,
        opponent: oppMap.get(isTeamA ? match.team_b_id : match.team_a_id)!,
      })).filter(x => x.opponent))

      // Player stats aggregation
      if (playerList.length > 0) {
        const { data: statsData } = await supabase
          .from('player_match_stats')
          .select('*')
          .in('player_id', playerList.map(p => p.id))

        const agg: Record<string, PlayerMatchStats & { matches_played: number }> = {}
        for (const s of (statsData as PlayerMatchStats[]) ?? []) {
          if (!agg[s.player_id]) {
            agg[s.player_id] = { ...s, matches_played: 0, total_points: 0, one_point_scores: 0, two_point_scores: 0, free_throws: 0 }
          }
          agg[s.player_id].total_points += s.total_points
          agg[s.player_id].one_point_scores += s.one_point_scores
          agg[s.player_id].two_point_scores += s.two_point_scores
          agg[s.player_id].free_throws += s.free_throws
          agg[s.player_id].matches_played += 1
        }
        setStats(agg)
      }

      setLoading(false)
    }
    fetchData()
  }, [id])

  if (loading) return <PublicLayout><PageSpinner /></PublicLayout>
  if (!team) return <PublicLayout><p className="text-zinc-400">Team not found.</p></PublicLayout>

  const completedMatches = matches.filter(m => m.match.status === 'completed')
  const wins = completedMatches.filter(m => m.match.winner_team_id === id).length
  const losses = completedMatches.length - wins

  return (
    <PublicLayout>
      <Link to="/teams" className="inline-flex items-center gap-2 text-zinc-500 hover:text-ink text-sm mb-6 transition-colors">
        <ArrowLeft size={16} /> All Teams
      </Link>

      {/* Team Header */}
      <div className="admin-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-24 h-24 rounded-2xl bg-soft-cloud border border-hairline flex items-center justify-center flex-shrink-0">
            {team.logo_url ? (
              <img src={team.logo_url} alt={team.name} className="w-20 h-20 rounded-xl object-contain" />
            ) : (
              <span className="text-3xl font-black text-ink">{getInitials(team.name)}</span>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-3xl font-black text-ink mb-1">{team.name}</h1>
            {team.college && <p className="text-zinc-500 font-bold mb-3">{team.college}</p>}
            <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{wins}</p>
                <p className="text-xs text-zinc-500 font-bold">Wins</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-sale">{losses}</p>
                <p className="text-xs text-zinc-500 font-bold">Losses</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-brand-600">{completedMatches.length}</p>
                <p className="text-xs text-zinc-500 font-bold">Played</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Roster */}
        <section>
          <h2 className="text-xl font-bold text-ink mb-4 flex items-center gap-2">
            <Users size={18} className="text-brand-600" /> Roster ({players.length})
          </h2>
          <div className="admin-card overflow-hidden">
            {players.length === 0 ? <p className="text-zinc-500 p-5 text-center text-sm">No players added.</p> : (
              <table className="data-table">
                <thead><tr>
                  <th>#</th><th>Name</th><th>Position</th><th>PTS</th>
                </tr></thead>
                <tbody>
                  {players.map(p => (
                    <tr key={p.id} className={team.captain_player_id === p.id ? 'bg-yellow-500/10' : ''}>
                      <td className="font-mono text-brand-600 font-bold">{p.jersey_number}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{p.name}</span>
                          {team.captain_player_id === p.id && (
                            <Shield size={12} className="text-yellow-600" />
                          )}
                        </div>
                      </td>
                      <td className="text-zinc-500 font-bold text-xs">{p.position || '—'}</td>
                      <td className="font-bold text-brand-600">{stats[p.id]?.total_points ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Matches */}
        <section>
          <h2 className="text-xl font-bold text-ink mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-brand-600" /> Matches
          </h2>
          <div className="space-y-2">
            {matches.length === 0 ? (
              <div className="admin-card"><p className="text-zinc-500 p-5 text-center text-sm">No matches scheduled.</p></div>
            ) : (
              matches.map(({ match, opponent, isTeamA }) => {
                const myScore = isTeamA ? match.team_a_score : match.team_b_score
                const oppScore = isTeamA ? match.team_b_score : match.team_a_score
                const won = match.winner_team_id === id
                const isCompleted = match.status === 'completed'
                return (
                  <div key={match.id} className="admin-card flex items-center gap-3 py-3">
                    <span className="text-zinc-600 text-xs w-6">#{match.match_number}</span>
                    <div className="flex-1 text-sm">
                      <span className="font-semibold text-ink">{opponent?.name || 'TBD'}</span>
                      {isCompleted && (
                        <span className={`ml-2 text-xs font-bold ${won ? 'text-emerald-600' : 'text-sale'}`}>
                          {myScore}–{oppScore}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 text-right">
                      {formatDate(match.scheduled_date)}<br />
                      {formatMatchTime(match.scheduled_time)}
                    </div>
                    <Badge variant={match.status}>
                      {match.status === 'completed' ? (won ? 'W' : 'L') : match.status}
                    </Badge>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>
    </PublicLayout>
  )
}
