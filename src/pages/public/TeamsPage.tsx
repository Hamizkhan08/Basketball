import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Shield } from 'lucide-react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSpinner } from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase'
import { useTournament } from '@/hooks/useTournament'
import type { Team, Player, TeamMatchStats } from '@/lib/database.types'
import { getInitials } from '@/lib/utils'

interface TeamCard {
  team: Team
  captain: Player | null
  playerCount: number
  wins: number
  losses: number
  points: number
}

export default function TeamsPage() {
  const { tournament } = useTournament()
  const [teams, setTeams] = useState<TeamCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tournament) { setLoading(false); return }
    async function fetchTeams() {
      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .eq('tournament_id', tournament!.id)
        .order('name')

      if (!teamsData) { setLoading(false); return }

      const results: TeamCard[] = []
      for (const team of teamsData as Team[]) {
        const [playerRes, captainRes, statsRes] = await Promise.all([
          supabase.from('players').select('id', { count: 'exact', head: true }).eq('team_id', team.id),
          team.captain_player_id
            ? supabase.from('players').select('*').eq('id', team.captain_player_id).single()
            : Promise.resolve({ data: null }),
          supabase.from('team_match_stats').select('win, loss, points_for').eq('team_id', team.id),
        ])

        const stats = (statsRes.data as TeamMatchStats[]) ?? []
        const wins = stats.reduce((s, r) => s + r.win, 0)
        const losses = stats.reduce((s, r) => s + r.loss, 0)
        const points = stats.reduce((s, r) => s + r.points_for, 0)

        results.push({
          team,
          captain: (captainRes as any).data,
          playerCount: playerRes.count ?? 0,
          wins,
          losses,
          points,
        })
      }
      setTeams(results)
      setLoading(false)
    }
    fetchTeams()
  }, [tournament])

  if (loading) return <PublicLayout><PageSpinner /></PublicLayout>

  return (
    <PublicLayout>
      <div className="mb-8">
        <h1 className="page-title">Teams</h1>
        <p className="text-zinc-500">{teams.length} team{teams.length !== 1 ? 's' : ''} competing</p>
      </div>

      {teams.length === 0 ? (
        <EmptyState title="No teams yet" description="Teams will appear here once added by the tournament admin." icon={<Users size={28} />} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map(({ team, captain, playerCount, wins, losses, points }) => (
            <Link key={team.id} to={`/teams/${team.id}`} className="block">
              <div className="admin-card hover:border-zinc-500 transition-all group p-6">
                {/* Logo + Name */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-16 h-16 rounded-none bg-soft-cloud border border-hairline flex items-center justify-center flex-shrink-0">
                    {team.logo_url ? (
                      <img src={team.logo_url} alt={team.name} className="w-14 h-14 rounded-none object-contain" />
                    ) : (
                      <span className="text-2xl font-bold text-ink">{getInitials(team.name)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-ink text-lg group-hover:text-zinc-500 transition-colors leading-tight">{team.name}</h2>
                    {team.college && <p className="text-zinc-500 text-sm truncate">{team.college}</p>}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center bg-soft-cloud rounded-lg py-2">
                    <p className="text-xl font-bold text-ink">{wins}</p>
                    <p className="text-zinc-500 text-xs">Wins</p>
                  </div>
                  <div className="text-center bg-soft-cloud rounded-lg py-2">
                    <p className="text-xl font-bold text-ink">{losses}</p>
                    <p className="text-zinc-500 text-xs">Losses</p>
                  </div>
                  <div className="text-center bg-soft-cloud rounded-lg py-2">
                    <p className="text-xl font-bold text-ink">{points}</p>
                    <p className="text-zinc-500 text-xs">Points</p>
                  </div>
                </div>

                {/* Captain + players */}
                <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-hairline pt-3">
                  <span className="flex items-center gap-1.5">
                    <Shield size={12} className="text-ink" />
                    {captain ? captain.name : 'No captain'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users size={12} className="text-ink" />
                    {playerCount} player{playerCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PublicLayout>
  )
}

