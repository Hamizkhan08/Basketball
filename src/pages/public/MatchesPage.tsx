import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Filter, Calendar } from 'lucide-react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSpinner } from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase'
import { useTournament } from '@/hooks/useTournament'
import type { Match, Team } from '@/lib/database.types'
import { formatDate, formatMatchTime, getInitials } from '@/lib/utils'
import { MATCH_STATUS_LABELS } from '@/lib/constants'
import { USE_MOCK_DATA, MOCK_MATCHES, MOCK_TEAMS } from '@/lib/mockData'

type Filter = 'all' | 'scheduled' | 'live' | 'completed' | 'cancelled'

export default function MatchesPage() {
  const { tournament } = useTournament()
  const [matchData, setMatchData] = useState<Array<{ match: Match; teamA: Team; teamB: Team }>>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [courtFilter, setCourtFilter] = useState('all')
  const [roundFilter, setRoundFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tournament) { setLoading(false); return }
    if (USE_MOCK_DATA) {
      const tMap = new Map(MOCK_TEAMS.map(t => [t.id, t]))
      setMatchData(MOCK_MATCHES.map(m => ({
        match: m,
        teamA: tMap.get(m.team_a_id)!,
        teamB: tMap.get(m.team_b_id)!
      })))
      setLoading(false)
      return
    }

    async function fetchMatches() {
      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournament!.id)
        .order('match_number')

      const matches = (matchesData as Match[]) ?? []
      const teamIds = new Set<string>()
      matches.forEach(m => { teamIds.add(m.team_a_id); teamIds.add(m.team_b_id) })

      const { data: teamsData } = await supabase.from('teams').select('*').in('id', [...teamIds])
      const tMap = new Map<string, Team>((teamsData as Team[] ?? []).map(t => [t.id, t]))

      setMatchData(matches.map(m => ({
        match: m,
        teamA: tMap.get(m.team_a_id)!,
        teamB: tMap.get(m.team_b_id)!,
      })).filter(x => x.teamA && x.teamB))
      setLoading(false)
    }
    fetchMatches()

    if (USE_MOCK_DATA) return;

    const ch = supabase.channel(`matches_rt_${Math.random().toString(36).substring(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => fetchMatches())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [tournament])

  const courts = ['all', ...new Set(matchData.map(x => x.match.court).filter(Boolean))]
  const rounds = ['all', ...new Set(matchData.map(x => x.match.round).filter(Boolean))]

  const filtered = matchData.filter(({ match }) => {
    if (filter !== 'all' && match.status !== filter) return false
    if (courtFilter !== 'all' && match.court !== courtFilter) return false
    if (roundFilter !== 'all' && match.round !== roundFilter) return false
    return true
  })

  if (loading) return <PublicLayout><PageSpinner /></PublicLayout>

  return (
    <PublicLayout>
      <div className="mb-8">
        <h1 className="page-title">Match Schedule</h1>
        <p className="text-zinc-500">{matchData.length} matches in total</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-zinc-500" />
          {(['all', 'scheduled', 'live', 'completed', 'cancelled'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors border border-transparent ${
                filter === f ? 'bg-ink text-canvas' : 'bg-soft-cloud text-ink hover:border-hairline'
              }`}
            >
              {f === 'all' ? 'All' : MATCH_STATUS_LABELS[f]}
            </button>
          ))}
        </div>
        {courts.length > 2 && (
          <select value={courtFilter} onChange={e => setCourtFilter(e.target.value)} className="select-field max-w-[140px] text-xs py-1.5">
            {courts.map(c => <option key={c} value={c}>{c === 'all' ? 'All Courts' : c}</option>)}
          </select>
        )}
        {rounds.length > 2 && (
          <select value={roundFilter} onChange={e => setRoundFilter(e.target.value)} className="select-field max-w-[160px] text-xs py-1.5">
            {rounds.map(r => <option key={r} value={r}>{r === 'all' ? 'All Rounds' : r}</option>)}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No matches found" description="Try adjusting your filters." icon={<Calendar size={28} />} />
      ) : (
        <div className="space-y-3">
          {filtered.map(({ match, teamA, teamB }) => (
            <div key={match.id} className={`admin-card transition-all p-3 ${match.status === 'live' ? 'border-sale' : 'hover:border-ink'}`}>
              <div className="flex items-center gap-4">
                {/* Match # */}
                <div className="text-center w-12 flex-shrink-0">
                  <p className="text-zinc-500 text-xs">MATCH</p>
                  <p className="font-bold text-ink font-mono">#{match.match_number}</p>
                </div>

                {/* Teams + Score */}
                <div className="flex-1 flex items-center gap-4 min-w-0">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-none bg-soft-cloud border border-hairline flex items-center justify-center text-xs font-bold text-ink flex-shrink-0">
                      {teamA.logo_url
                        ? <img src={teamA.logo_url} alt="" className="w-8 h-8 rounded-none object-contain" />
                        : getInitials(teamA.name)}
                    </div>
                    <Link to={`/teams/${teamA.id}`} className={`font-bold text-sm hover:text-zinc-500 transition-colors truncate ${match.winner_team_id === teamA.id ? 'text-ink' : match.status === 'completed' ? 'text-zinc-500' : 'text-ink'}`}>
                      {teamA.name}
                    </Link>
                  </div>

                  {match.status === 'completed' || match.status === 'live' ? (
                    <div className="text-center flex-shrink-0">
                      <p className="score-display text-2xl font-black text-ink">{match.team_a_score} — {match.team_b_score}</p>
                    </div>
                  ) : (
                    <span className="text-zinc-500 text-sm font-medium flex-shrink-0">vs</span>
                  )}

                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <Link to={`/teams/${teamB.id}`} className={`font-bold text-sm hover:text-zinc-500 transition-colors truncate text-right ${match.winner_team_id === teamB.id ? 'text-ink' : match.status === 'completed' ? 'text-zinc-500' : 'text-ink'}`}>
                      {teamB.name}
                    </Link>
                    <div className="w-8 h-8 rounded-none bg-soft-cloud border border-hairline flex items-center justify-center text-xs font-bold text-ink flex-shrink-0">
                      {teamB.logo_url
                        ? <img src={teamB.logo_url} alt="" className="w-8 h-8 rounded-none object-contain" />
                        : getInitials(teamB.name)}
                    </div>
                  </div>
                </div>

                {/* Right side info */}
                <div className="flex-shrink-0 text-right hidden sm:block">
                  <p className="text-ink font-bold text-sm">{formatMatchTime(match.scheduled_time)}</p>
                  <p className="text-zinc-500 text-xs">{formatDate(match.scheduled_date)}</p>
                  <p className="text-zinc-500 text-xs">{match.court} · {match.round}</p>
                </div>

                <Badge variant={match.status}>
                  {MATCH_STATUS_LABELS[match.status]}
                </Badge>

                {match.status === 'live' && (
                  <Link to="/live" className="flex-shrink-0 bg-sale text-canvas font-bold text-xs px-4 py-2 rounded-full hover:bg-sale/90 transition-colors">
                    Watch
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PublicLayout>
  )
}

