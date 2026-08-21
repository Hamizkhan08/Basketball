import React, { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Users, User, Swords, Trophy, Radio, Calendar, ArrowRight } from 'lucide-react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase'
import { useTournament } from '@/hooks/useTournament'
import type { Match, Team, Player } from '@/lib/database.types'
import { formatDate, formatMatchTime, getInitials } from '@/lib/utils'

interface DashboardStats {
  teams: number
  players: number
  matches: number
  completed: number
  upcoming: number
  live: number
}

export default function DashboardPage() {
  const { tournament, loading: tournamentLoading } = useTournament()
  const [stats, setStats] = useState<DashboardStats>({ teams: 0, players: 0, matches: 0, completed: 0, upcoming: 0, live: 0 })
  const [liveMatch, setLiveMatch] = useState<{ match: Match; teamA: Team; teamB: Team } | null>(null)
  const [nextMatch, setNextMatch] = useState<{ match: Match; teamA: Team; teamB: Team } | null>(null)
  const [recentResults, setRecentResults] = useState<Array<{ match: Match; teamA: Team; teamB: Team }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (tournamentLoading) return
    if (!tournament) { setLoading(false); return }
    async function fetchDash() {
      const [teamsRes, playersRes, matchesRes] = await Promise.all([
        supabase.from('teams').select('id', { count: 'exact', head: true }).eq('tournament_id', tournament!.id),
        supabase.from('players').select('id', { count: 'exact', head: true }),
        supabase.from('matches').select('*').eq('tournament_id', tournament!.id),
      ])

      const allMatches = (matchesRes.data as Match[]) ?? []
      setStats({
        teams: teamsRes.count ?? 0,
        players: playersRes.count ?? 0,
        matches: allMatches.length,
        completed: allMatches.filter(m => m.status === 'completed').length,
        upcoming: allMatches.filter(m => m.status === 'scheduled').length,
        live: allMatches.filter(m => m.status === 'live').length,
      })

      const teamIds = new Set<string>()
      allMatches.forEach(m => { teamIds.add(m.team_a_id); teamIds.add(m.team_b_id) })
      const { data: tData } = await supabase.from('teams').select('*').in('id', [...teamIds])
      const tMap = new Map<string, Team>((tData as Team[] ?? []).map(t => [t.id, t]))

      const build = (m: Match) => ({ match: m, teamA: tMap.get(m.team_a_id)!, teamB: tMap.get(m.team_b_id)! })

      const live = allMatches.find(m => m.status === 'live')
      if (live) setLiveMatch(build(live))

      const upcoming = allMatches.filter(m => m.status === 'scheduled')
        .sort((a, b) => (a.scheduled_date ?? '').localeCompare(b.scheduled_date ?? ''))
      if (upcoming[0]) setNextMatch(build(upcoming[0]))

      const recent = allMatches.filter(m => m.status === 'completed')
        .sort((a, b) => (b.ended_at ?? '').localeCompare(a.ended_at ?? '')).slice(0, 5)
      setRecentResults(recent.map(build).filter(x => x.teamA && x.teamB))

      setLoading(false)
    }
    fetchDash()
  }, [tournament, tournamentLoading])

  if (loading || tournamentLoading) return <AdminLayout><PageSpinner /></AdminLayout>
  if (!tournament && !tournamentLoading) return <Navigate to="/admin/setup" replace />

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="heading-xl text-ink uppercase font-display">Dashboard</h1>
        <p className="text-zinc-500 text-sm mt-1">{tournament?.name || 'No tournament configured'}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <StatCard label="Teams" value={stats.teams} icon={<Users size={18} />} color="text-ink" />
        <StatCard label="Players" value={stats.players} icon={<User size={18} />} color="text-ink" />
        <StatCard label="Matches" value={stats.matches} icon={<Swords size={18} />} color="text-ink" />
        <StatCard label="Completed" value={stats.completed} icon={<Trophy size={18} />} color="text-success" />
        <StatCard label="Upcoming" value={stats.upcoming} icon={<Calendar size={18} />} color="text-ink" />
        <StatCard label="Live" value={stats.live} icon={<Radio size={18} />} color="text-sale" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Live Match / Next Match */}
        <div className="space-y-4">
          {liveMatch ? (
            <div className="admin-card border-sale p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-sale live-pulse" />
                <span className="text-sale font-bold text-sm">Live Match</span>
                <Link to={`/admin/live/${liveMatch.match.id}`} className="ml-auto text-xs text-ink hover:text-zinc-500 flex items-center gap-1">
                  Control <ArrowRight size={12} />
                </Link>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">{liveMatch.teamA.name}</span>
                <span className="score-display text-3xl font-black text-ink">
                  {liveMatch.match.team_a_score} — {liveMatch.match.team_b_score}
                </span>
                <span className="font-bold text-ink">{liveMatch.teamB.name}</span>
              </div>
            </div>
          ) : (
            <div className="admin-card p-5 text-center">
              <p className="text-zinc-500 text-sm">No live match currently</p>
              <Link to="/admin/matches" className="text-ink text-xs font-bold hover:underline mt-2 inline-block">Start a match →</Link>
            </div>
          )}

          {nextMatch && (
            <div className="admin-card p-5">
              <p className="text-zinc-500 text-xs font-bold uppercase mb-3">Next Match</p>
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink text-sm">{nextMatch.teamA.name}</span>
                <div className="text-center">
                  <p className="text-zinc-500 text-xs">vs</p>
                  <p className="text-ink font-bold text-xs">{formatMatchTime(nextMatch.match.scheduled_time)}</p>
                  <p className="text-zinc-500 text-xs">{nextMatch.match.court}</p>
                </div>
                <span className="font-bold text-ink text-sm">{nextMatch.teamB.name}</span>
              </div>
            </div>
          )}
        </div>

        {/* Recent Results */}
        <div className="admin-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-ink">Recent Results</h2>
            <Link to="/admin/matches" className="text-ink font-bold text-xs hover:underline flex items-center gap-1">
              All matches <ArrowRight size={12} />
            </Link>
          </div>
          {recentResults.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-8">No results yet</p>
          ) : (
            <div className="space-y-2">
              {recentResults.map(({ match, teamA, teamB }) => (
                <div key={match.id} className="flex items-center gap-3 py-2 border-b border-hairline last:border-0">
                  <span className="text-zinc-500 text-xs w-6">#{match.match_number}</span>
                  <span className={`text-sm font-semibold flex-1 truncate ${match.winner_team_id === teamA.id ? 'text-ink' : 'text-zinc-500'}`}>{teamA.name}</span>
                  <span className="font-mono font-bold text-ink text-sm">{match.team_a_score}–{match.team_b_score}</span>
                  <span className={`text-sm font-semibold flex-1 truncate text-right ${match.winner_team_id === teamB.id ? 'text-ink' : 'text-zinc-500'}`}>{teamB.name}</span>
                  <Badge variant="completed">FT</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { to: '/admin/teams', label: 'Manage Teams', icon: Users },
          { to: '/admin/players', label: 'Manage Players', icon: User },
          { to: '/admin/matches', label: 'Manage Matches', icon: Swords },
          { to: '/admin/settings', label: 'Tournament Settings', icon: Trophy },
        ].map(action => (
          <Link key={action.to} to={action.to} className="admin-card hover:bg-soft-cloud transition-all p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-soft-cloud flex items-center justify-center border border-hairline">
              <action.icon size={16} className="text-ink" />
            </div>
            <span className="font-bold text-ink text-sm">{action.label}</span>
            <ArrowRight size={14} className="text-ink ml-auto" />
          </Link>
        ))}
      </div>
    </AdminLayout>
  )
}

