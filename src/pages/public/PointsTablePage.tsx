import React, { useEffect, useState } from 'react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { PageSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { supabase } from '@/lib/supabase'
import { useTournament } from '@/hooks/useTournament'
import type { Team, TeamMatchStats } from '@/lib/database.types'
import type { TeamStanding } from '@/lib/database.types'
import { Trophy } from 'lucide-react'

export default function PointsTablePage() {
  const { tournament } = useTournament()
  const [pools, setPools] = useState<Record<string, TeamStanding[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tournament) { setLoading(false); return }
    async function fetchStandings() {
      const { data: teamsData } = await supabase.from('teams').select('*').eq('tournament_id', tournament!.id)
      const teams = (teamsData as Team[]) ?? []
      if (teams.length === 0) { setLoading(false); return }

      const { data: statsData } = await supabase
        .from('team_match_stats')
        .select('*')
        .in('team_id', teams.map(t => t.id))

      const agg: Record<string, TeamStanding> = {}
      for (const t of teams) {
        agg[t.id] = {
          team: t,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          points_for: 0,
          points_against: 0,
          point_diff: 0,
          tournament_points: 0,
        }
      }

      for (const s of (statsData as TeamMatchStats[]) ?? []) {
        const a = agg[s.team_id]
        if (!a) continue
        a.played += 1
        a.wins += s.win
        a.draws += s.draw
        a.losses += s.loss
        a.points_for += s.points_for
        a.points_against += s.points_against
        a.tournament_points += s.win * tournament!.win_points + s.draw * tournament!.draw_points + s.loss * tournament!.loss_points
      }

      for (const id in agg) {
        agg[id].point_diff = agg[id].points_for - agg[id].points_against
      }

      const sorted = Object.values(agg).sort((a, b) => {
        if (b.tournament_points !== a.tournament_points) return b.tournament_points - a.tournament_points
        if (b.point_diff !== a.point_diff) return b.point_diff - a.point_diff
        return b.points_for - a.points_for
      })

      const poolsRecord: Record<string, TeamStanding[]> = {}
      for (const s of sorted) {
        const p = s.team.pool_name || 'ALL'
        if (!poolsRecord[p]) poolsRecord[p] = []
        poolsRecord[p].push(s)
      }
      
      setPools(poolsRecord)
      setLoading(false)
    }
    fetchStandings()

    const ch = supabase.channel(`standings_rt_${Math.random().toString(36).substring(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_match_stats' }, () => fetchStandings())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [tournament])

  if (loading) return <PublicLayout><PageSpinner /></PublicLayout>

  return (
    <PublicLayout>
      <div className="mb-8">
        <h1 className="page-title">Points Table</h1>
        <p className="text-zinc-500 font-medium">
          {tournament && `Win: ${tournament.win_points}pts · Draw: ${tournament.draw_points}pts · Loss: ${tournament.loss_points}pts`}
        </p>
      </div>

      {Object.keys(pools).length === 0 ? (
        <EmptyState title="No standings yet" description="Standings will update after matches are completed." icon={<Trophy size={28} />} />
      ) : (
        <div className="space-y-8">
          {Object.entries(pools).sort(([a], [b]) => a.localeCompare(b)).map(([poolName, standings]) => (
            <div key={poolName}>
              {poolName !== 'ALL' && (
                <h2 className="heading-lg text-ink mb-4 flex items-center gap-2">
                  Pool {poolName}
                </h2>
              )}
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Team</th>
                      <th className="text-center">P</th>
                      <th className="text-center">W</th>
                      <th className="text-center">D</th>
                      <th className="text-center">L</th>
                      <th className="text-center">PF</th>
                      <th className="text-center">PA</th>
                      <th className="text-center">+/-</th>
                      <th className="text-center">PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s, i) => (
                      <tr key={s.team.id}>
                        <td><span className="text-sm font-bold text-ink">{i + 1}</span></td>
                        <td>
                          <div className="flex items-center gap-2">
                            {i === 0 && <Trophy size={14} className="text-ink" />}
                            <span className="font-bold text-ink">{s.team.name}</span>
                          </div>
                        </td>
                        <td className="text-center text-zinc-600">{s.played}</td>
                        <td className="text-center font-bold text-ink">{s.wins}</td>
                        <td className="text-center text-zinc-600">{s.draws}</td>
                        <td className="text-center text-zinc-600">{s.losses}</td>
                        <td className="text-center text-zinc-600">{s.points_for}</td>
                        <td className="text-center text-zinc-600">{s.points_against}</td>
                        <td className="text-center font-mono font-bold text-ink">
                          {s.point_diff >= 0 ? '+' : ''}{s.point_diff}
                        </td>
                        <td className="text-center">
                          <span className="text-ink font-bold text-sm">{s.tournament_points}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </PublicLayout>
  )
}
