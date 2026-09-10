import React, { useEffect, useState } from 'react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { PageSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { supabase } from '@/lib/supabase'
import { useTournament } from '@/hooks/useTournament'
import type { Player, Team, PlayerMatchStats } from '@/lib/database.types'
import { getInitials } from '@/lib/utils'
import { User, ChevronUp, ChevronDown } from 'lucide-react'
import { USE_MOCK_DATA, MOCK_PLAYERS, MOCK_TEAMS, MOCK_TOP_SCORERS } from '@/lib/mockData'

type SortKey = 'total_points' | 'two_point_scores' | 'one_point_scores' | 'free_throws' | 'matches_played'

interface PlayerRow {
  player: Player
  team: Team
  total_points: number
  one_point_scores: number
  two_point_scores: number
  free_throws: number
  matches_played: number
}

export default function PlayersPage() {
  const { tournament } = useTournament()
  const [rows, setRows] = useState<PlayerRow[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('total_points')
  const [sortAsc, setSortAsc] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tournament) { setLoading(false); return }
    if (USE_MOCK_DATA) {
      const teamMap = new Map(MOCK_TEAMS.map(t => [t.id, t]));
      const statsMap = new Map(MOCK_TOP_SCORERS.map(s => [s.player.id, s]));
      const results: PlayerRow[] = MOCK_PLAYERS.map(p => {
        const stats = statsMap.get(p.id);
        return {
          player: p,
          team: teamMap.get(p.team_id)!,
          total_points: stats?.total_points || 0,
          one_point_scores: stats?.one_point_scores || 0,
          two_point_scores: stats?.two_point_scores || 0,
          free_throws: stats?.free_throws || 0,
          matches_played: stats?.matches_played || 0
        };
      });
      setRows(results);
      setLoading(false);
      return;
    }

    async function fetchData() {
      const { data: teamsData } = await supabase.from('teams').select('*').eq('tournament_id', tournament!.id)
      const teams = (teamsData as Team[]) ?? []
      const teamMap = new Map(teams.map(t => [t.id, t]))
      const teamIds = teams.map(t => t.id)
      if (teamIds.length === 0) { setLoading(false); return }

      const { data: playersData } = await supabase.from('players').select('*').in('team_id', teamIds)
      const players = (playersData as Player[]) ?? []

      const { data: statsData } = await supabase.from('player_match_stats').select('*').in('team_id', teamIds)
      const agg: Record<string, PlayerRow> = {}
      for (const p of players) {
        agg[p.id] = {
          player: p,
          team: teamMap.get(p.team_id)!,
          total_points: 0,
          one_point_scores: 0,
          two_point_scores: 0,
          free_throws: 0,
          matches_played: 0,
        }
      }
      for (const s of (statsData as PlayerMatchStats[]) ?? []) {
        if (agg[s.player_id]) {
          agg[s.player_id].total_points += s.total_points
          agg[s.player_id].one_point_scores += s.one_point_scores
          agg[s.player_id].two_point_scores += s.two_point_scores
          agg[s.player_id].free_throws += s.free_throws
          agg[s.player_id].matches_played += 1
        }
      }
      setRows(Object.values(agg))
      setLoading(false)
    }
    fetchData()
  }, [tournament])

  const sorted = [...rows].sort((a, b) => {
    const diff = (a[sortKey] as number) - (b[sortKey] as number)
    return sortAsc ? diff : -diff
  })

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const SortIcon = ({ col }: { col: SortKey }) => (
    sortKey === col
      ? (sortAsc ? <ChevronUp size={12} className="text-brand-400" /> : <ChevronDown size={12} className="text-brand-400" />)
      : <ChevronDown size={12} className="text-zinc-700" />
  )

  if (loading) return <PublicLayout><PageSpinner /></PublicLayout>

  return (
    <PublicLayout>
      <div className="mb-8">
        <h1 className="page-title">Players</h1>
        <p className="text-zinc-400">{rows.length} players in the tournament</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No players yet" description="Players will appear here once added." icon={<User size={28} />} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-soft-cloud p-3 border border-hairline">
            <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Sort by</span>
            <div className="flex flex-wrap gap-2">
              {(['total_points', 'one_point_scores', 'two_point_scores', 'free_throws', 'matches_played'] as SortKey[]).map(key => (
                <button
                  key={key}
                  onClick={() => toggleSort(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors border border-transparent flex items-center gap-1 ${
                    sortKey === key ? 'bg-ink text-canvas' : 'bg-canvas text-ink border-hairline hover:bg-hairline'
                  }`}
                >
                  {key === 'total_points' && 'PTS'}
                  {key === 'one_point_scores' && '1P'}
                  {key === 'two_point_scores' && '2P'}
                  {key === 'free_throws' && 'FT'}
                  {key === 'matches_played' && 'MP'}
                  {sortKey === key && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {sorted.map((row, i) => (
              <div key={row.player.id} className="admin-card p-5 hover:border-ink transition-colors flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-none bg-soft-cloud border border-hairline flex items-center justify-center text-sm font-bold text-ink flex-shrink-0">
                      {row.player.photo_url
                        ? <img src={row.player.photo_url} alt={row.player.name} className="w-12 h-12 rounded-none object-cover" />
                        : getInitials(row.player.name)}
                    </div>
                    <div>
                      <h3 className="font-bold text-ink text-base leading-tight">{row.player.name}</h3>
                      <p className="text-zinc-500 text-xs mt-0.5">{row.team?.name}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-center">
                    <span className="text-zinc-500 text-[10px] font-bold block leading-none">NO.</span>
                    <span className="font-mono text-ink font-bold text-lg leading-none">{row.player.jersey_number}</span>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 mt-auto border-t border-hairline pt-4">
                  <div className="text-center">
                    <p className="font-bold text-ink">{row.matches_played}</p>
                    <p className="text-zinc-500 text-[10px] font-bold">MP</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-ink">{row.total_points}</p>
                    <p className="text-zinc-500 text-[10px] font-bold">PTS</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-ink">{row.one_point_scores}</p>
                    <p className="text-zinc-500 text-[10px] font-bold">1P</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-ink">{row.two_point_scores}</p>
                    <p className="text-zinc-500 text-[10px] font-bold">2P</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-ink">{row.free_throws}</p>
                    <p className="text-zinc-500 text-[10px] font-bold">FT</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PublicLayout>
  )
}

