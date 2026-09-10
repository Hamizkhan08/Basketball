import React, { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { PageSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { supabase } from '@/lib/supabase'
import { useTournament } from '@/hooks/useTournament'
import type { Player, Team, PlayerMatchStats } from '@/lib/database.types'
import type { PlayerTournamentStats } from '@/lib/database.types'
import { getInitials } from '@/lib/utils'
import { USE_MOCK_DATA, MOCK_TOP_SCORERS } from '@/lib/mockData'

export default function BestShootersPage() {
  const { tournament } = useTournament()
  const [shooters, setShooters] = useState<PlayerTournamentStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tournament) { setLoading(false); return }
    if (USE_MOCK_DATA) {
      setShooters(MOCK_TOP_SCORERS)
      setLoading(false)
      return
    }

    async function fetchData() {
      const { data: teamsData } = await supabase.from('teams').select('*').eq('tournament_id', tournament!.id)
      const teams = (teamsData as Team[]) ?? []
      const tMap = new Map(teams.map(t => [t.id, t]))
      if (teams.length === 0) { setLoading(false); return }

      const { data: statsData } = await supabase
        .from('player_match_stats')
        .select('*')
        .in('team_id', teams.map(t => t.id))

      const playerIds = [...new Set((statsData as PlayerMatchStats[] ?? []).map(s => s.player_id))]
      const { data: playersData } = await supabase.from('players').select('*').in('id', playerIds)
      const pMap = new Map((playersData as Player[] ?? []).map(p => [p.id, p]))

      const agg: Record<string, PlayerTournamentStats> = {}
      for (const s of (statsData as PlayerMatchStats[]) ?? []) {
        if (!agg[s.player_id]) {
          agg[s.player_id] = {
            player: pMap.get(s.player_id)!,
            team: tMap.get(s.team_id)!,
            total_points: 0,
            one_point_scores: 0,
            two_point_scores: 0,
            free_throws: 0,
            matches_played: 0,
          }
        }
        agg[s.player_id].total_points += s.total_points
        agg[s.player_id].one_point_scores += s.one_point_scores
        agg[s.player_id].two_point_scores += s.two_point_scores
        agg[s.player_id].free_throws += s.free_throws
        agg[s.player_id].matches_played += 1
      }

      const sorted = Object.values(agg)
        .filter(x => x.player)
        .sort((a, b) => b.total_points - a.total_points)

      setShooters(sorted)
      setLoading(false)
    }
    fetchData()

    if (USE_MOCK_DATA) return;

    const ch = supabase.channel(`shooters_rt_${Math.random().toString(36).substring(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_match_stats' }, () => fetchData())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [tournament])

  if (loading) return <PublicLayout><PageSpinner /></PublicLayout>

  const medals = ['🥇', '🥈', '🥉']

  return (
    <PublicLayout>
      <div className="mb-8">
        <h1 className="page-title flex items-center gap-3">
           Best Shooters
        </h1>
        <p className="text-zinc-500">Ranked by total points scored</p>
      </div>

      {shooters.length === 0 ? (
        <EmptyState title="No shooters yet" description="Player stats will appear after matches are scored." icon={<Zap size={28} />} />
      ) : (
        <>
          {/* Podium top 3 */}
          {shooters.length >= 1 && (
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {shooters.slice(0, 3).map((s, i) => (
                <div key={s.player.id} className="admin-card p-6 text-center border-hairline bg-canvas">
                  <div className="text-4xl mb-3">{medals[i] ?? `#${i + 1}`}</div>
                  <div className="w-16 h-16 mx-auto rounded-full bg-soft-cloud flex items-center justify-center text-xl font-bold text-ink mb-3">
                    {s.player.photo_url
                      ? <img src={s.player.photo_url} alt={s.player.name} className="w-16 h-16 rounded-full object-cover" />
                      : getInitials(s.player.name)}
                  </div>
                  <p className="font-bold text-ink text-lg">{s.player.name}</p>
                  <p className="text-zinc-500 text-sm mb-4">{s.team?.name}</p>
                  <p className="score-display text-4xl font-black text-ink">{s.total_points}</p>
                  <p className="text-zinc-500 text-xs mb-4">POINTS</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-soft-cloud rounded-lg py-2">
                      <p className="font-bold text-ink">{s.one_point_scores}</p>
                      <p className="text-zinc-500">1P</p>
                    </div>
                    <div className="bg-soft-cloud rounded-lg py-2">
                      <p className="font-bold text-ink">{s.two_point_scores}</p>
                      <p className="text-zinc-500">2P</p>
                    </div>
                    <div className="bg-soft-cloud rounded-lg py-2">
                      <p className="font-bold text-ink">{s.free_throws}</p>
                      <p className="text-zinc-500">FT</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Full leaderboard */}
          {shooters.length > 3 && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Team</th>
                    <th className="text-center">MP</th>
                    <th className="text-center">PTS</th>
                    <th className="text-center">1P</th>
                    <th className="text-center">2P</th>
                    <th className="text-center">FT</th>
                  </tr>
                </thead>
                <tbody>
                  {shooters.slice(3).map((s, i) => (
                    <tr key={s.player.id}>
                      <td className="text-zinc-500 font-mono text-xs">{i + 4}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-soft-cloud flex items-center justify-center text-xs font-bold text-ink">
                            {getInitials(s.player.name)}
                          </div>
                          <span className="font-semibold text-ink">{s.player.name}</span>
                        </div>
                      </td>
                      <td className="text-zinc-500 text-sm">{s.team?.name}</td>
                      <td className="text-center text-zinc-600">{s.matches_played}</td>
                      <td className="text-center font-bold text-ink">{s.total_points}</td>
                      <td className="text-center text-zinc-600">{s.one_point_scores}</td>
                      <td className="text-center text-zinc-600">{s.two_point_scores}</td>
                      <td className="text-center text-zinc-600">{s.free_throws}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </PublicLayout>
  )
}

