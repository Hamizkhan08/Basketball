import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { supabase } from '@/lib/supabase'
import { useTournament } from '@/hooks/useTournament'
import type { Player, Team, PlayerMatchStats } from '@/lib/database.types'
import type { PlayerTournamentStats } from '@/lib/database.types'
import { getInitials } from '@/lib/utils'
import { Zap } from 'lucide-react'

export default function AdminBestShootersPage() {
  const { tournament, loading: tournamentLoading } = useTournament()
  const [shooters, setShooters] = useState<PlayerTournamentStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (tournamentLoading) return
    if (!tournament) { setLoading(false); return }
    async function fetchData() {
      const { data: teamsData } = await supabase.from('teams').select('*').eq('tournament_id', tournament!.id)
      const teams = (teamsData as Team[]) ?? []
      const tMap = new Map(teams.map(t => [t.id, t]))
      if (teams.length === 0) { setLoading(false); return }

      const { data: statsData } = await supabase.from('player_match_stats').select('*').in('team_id', teams.map(t => t.id))
      const playerIds = [...new Set((statsData as PlayerMatchStats[] ?? []).map(s => s.player_id))]
      const { data: playersData } = await supabase.from('players').select('*').in('id', playerIds)
      const pMap = new Map((playersData as Player[] ?? []).map(p => [p.id, p]))

      const agg: Record<string, PlayerTournamentStats> = {}
      for (const s of (statsData as PlayerMatchStats[]) ?? []) {
        if (!agg[s.player_id]) agg[s.player_id] = { player: pMap.get(s.player_id)!, team: tMap.get(s.team_id)!, total_points: 0, one_point_scores: 0, two_point_scores: 0, free_throws: 0, matches_played: 0 }
        agg[s.player_id].total_points += s.total_points
        agg[s.player_id].one_point_scores += s.one_point_scores
        agg[s.player_id].two_point_scores += s.two_point_scores
        agg[s.player_id].free_throws += s.free_throws
        agg[s.player_id].matches_played += 1
      }
      setShooters(Object.values(agg).filter(x => x.player).sort((a, b) => b.total_points - a.total_points))
      setLoading(false)
    }
    fetchData()
    const ch = supabase.channel(`admin_shooters_${Math.random().toString(36).substring(2)}`).on('postgres_changes', { event: '*', schema: 'public', table: 'player_match_stats' }, () => fetchData()).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [tournament, tournamentLoading])

  if (loading || tournamentLoading) return <AdminLayout><PageSpinner /></AdminLayout>
  if (!tournament && !tournamentLoading) return <Navigate to="/admin/setup" replace />

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink">Best Shooters</h1>
        <p className="text-zinc-500 text-sm font-bold">Ranked by total points — updates in real time</p>
      </div>
      {shooters.length === 0 ? (
        <EmptyState title="No stats yet" description="Scorer stats appear after matches are played." icon={<Zap size={28} />} />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead><tr>
              <th>Rank</th><th>Player</th><th>Team</th>
              <th className="text-center">MP</th><th className="text-center">PTS</th>
              <th className="text-center">1P</th><th className="text-center">2P</th><th className="text-center">FT</th>
            </tr></thead>
            <tbody>
              {shooters.map((s, i) => (
                <tr key={s.player.id}>
                  <td className={`font-bold ${i === 0 ? 'text-yellow-600' : i === 1 ? 'text-zinc-400' : i === 2 ? 'text-amber-700' : 'text-zinc-500'}`}>{i + 1}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-soft-cloud flex items-center justify-center text-xs font-bold text-ink border border-hairline">
                        {s.player.photo_url ? <img src={s.player.photo_url} alt={s.player.name} className="w-7 h-7 rounded-full object-cover" /> : getInitials(s.player.name)}
                      </div>
                      <span className="font-semibold text-ink">{s.player.name}</span>
                    </div>
                  </td>
                  <td className="text-zinc-500 text-sm font-bold">{s.team?.name}</td>
                  <td className="text-center text-zinc-500 font-bold">{s.matches_played}</td>
                  <td className="text-center font-bold text-brand-600 text-base">{s.total_points}</td>
                  <td className="text-center text-zinc-500 font-bold">{s.one_point_scores}</td>
                  <td className="text-center text-zinc-500 font-bold">{s.two_point_scores}</td>
                  <td className="text-center text-zinc-500 font-bold">{s.free_throws}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  )
}

