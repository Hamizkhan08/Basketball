import React, { useEffect, useState } from 'react'
import { Radio } from 'lucide-react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { PageSpinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { useGameClock } from '@/hooks/useGameClock'
import { useRealtimeMatch } from '@/hooks/useRealtimeMatch'
import { supabase } from '@/lib/supabase'
import { useTournament } from '@/hooks/useTournament'
import type { Match, Player } from '@/lib/database.types'
import { formatTime, formatShotClock, getInitials } from '@/lib/utils'
import { EVENT_LABELS } from '@/lib/constants'

function LiveScoreBoard({ matchId }: { matchId: string }) {
  const { match, teamA, teamB, events, loading } = useRealtimeMatch(matchId)
  const { gameClock, shotClock } = useGameClock(match)
  const [playerMap, setPlayerMap] = useState<Map<string, Player>>(new Map())

  useEffect(() => {
    if (!match) return
    const ids = events.map(e => e.player_id).filter(Boolean) as string[]
    if (ids.length === 0) return
    supabase.from('players').select('*').in('id', [...new Set(ids)]).then(({ data }) => {
      setPlayerMap(new Map((data as Player[] ?? []).map(p => [p.id, p])))
    })
  }, [events, match])

  if (loading) return <PageSpinner />
  if (!match || !teamA || !teamB) return null

  return (
    <div className="animate-fade-in">
      {/* Main Scoreboard */}
      <div className="rounded-none bg-ink text-canvas p-6 sm:p-8 mb-8 shadow-2xl">
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="w-2.5 h-2.5 rounded-full bg-sale live-pulse" />
          <Badge variant="live">LIVE</Badge>
          {match.is_overtime && <Badge variant="warning">OVERTIME</Badge>}
        </div>

        <div className="grid grid-cols-3 items-center gap-2 sm:gap-6 mb-6">
          {/* Team A */}
          <div className="text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-none bg-canvas flex items-center justify-center mb-2 sm:mb-4">
              {teamA.logo_url
                ? <img src={teamA.logo_url} alt={teamA.name} className="w-12 h-12 sm:w-16 sm:h-16 rounded-none object-contain" />
                : <span className="text-2xl sm:text-3xl font-black text-ink">{getInitials(teamA.name)}</span>}
            </div>
            <h2 className="font-bold text-canvas text-sm sm:text-lg leading-tight truncate">{teamA.short_name || teamA.name}</h2>
            {teamA.college && <p className="text-zinc-400 text-[10px] sm:text-xs mt-1 truncate">{teamA.college}</p>}
          </div>

          {/* Score */}
          <div className="text-center">
            <div className="score-display text-5xl sm:text-8xl font-black text-canvas leading-none mb-4 flex items-center justify-center gap-2 sm:gap-4">
              <span>{match.team_a_score}</span>
              <span className="text-zinc-500 text-3xl sm:text-5xl font-light">–</span>
              <span>{match.team_b_score}</span>
            </div>
          </div>

          {/* Team B */}
          <div className="text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-none bg-canvas flex items-center justify-center mb-2 sm:mb-4">
              {teamB.logo_url
                ? <img src={teamB.logo_url} alt={teamB.name} className="w-12 h-12 sm:w-16 sm:h-16 rounded-none object-contain" />
                : <span className="text-2xl sm:text-3xl font-black text-ink">{getInitials(teamB.name)}</span>}
            </div>
            <h2 className="font-bold text-canvas text-sm sm:text-lg leading-tight truncate">{teamB.short_name || teamB.name}</h2>
            {teamB.college && <p className="text-zinc-400 text-[10px] sm:text-xs mt-1 truncate">{teamB.college}</p>}
          </div>
        </div>

        {/* Clocks */}
        <div className="flex items-center justify-center gap-8">
          <div className="text-center">
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">GAME CLOCK</p>
            <p className={`font-mono text-3xl sm:text-4xl font-black ${gameClock <= 30 && gameClock > 0 ? 'text-sale animate-pulse' : gameClock === 0 ? 'text-sale' : 'text-canvas'}`}>
              {formatTime(gameClock)}
            </p>
          </div>

          <div className="w-px h-10 bg-zinc-700" />
          <div className="text-center">
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">COURT</p>
            <p className="text-canvas font-bold text-lg">{match.court}</p>
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="admin-card">
        <h3 className="font-bold text-ink mb-4 flex items-center gap-2 uppercase tracking-wider text-sm">
          <Radio size={16} className="text-sale" /> Live Feed
        </h3>
        {events.filter(e => e.points > 0 || e.event_type === 'foul').length === 0 ? (
          <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest py-4 text-center">Scoring events will appear here...</p>
        ) : (
          <div className="space-y-2">
            {events
              .filter(e => e.points > 0 || e.event_type === 'foul')
              .slice(0, 12)
              .map(event => {
                const player = event.player_id ? playerMap.get(event.player_id) : null
                const team = event.team_id === teamA.id ? teamA : event.team_id === teamB.id ? teamB : null
                return (
                  <div key={event.id} className="flex items-center gap-3 py-2 border-b border-hairline last:border-0 animate-slide-up">
                    <span className="font-mono font-bold text-zinc-500 text-xs w-12 flex-shrink-0 text-center">
                      {formatTime(event.game_clock_seconds)}
                    </span>
                    <span className="text-zinc-500 font-bold text-sm truncate flex-1">
                      {player?.name ?? team?.name ?? 'Team'}
                    </span>
                    {event.points > 0 && (
                      <span className="font-bold text-ink text-sm flex-shrink-0">
                        +{event.points}
                      </span>
                    )}
                    <span className="text-zinc-600 text-xs flex-shrink-0">
                      {EVENT_LABELS[event.event_type] || event.event_type}
                    </span>
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function LivePage() {
  const { tournament } = useTournament()
  const [liveMatchId, setLiveMatchId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tournament) { setLoading(false); return }
    async function fetchLive() {
      const { data } = await supabase
        .from('matches')
        .select('id')
        .eq('tournament_id', tournament!.id)
        .eq('status', 'live')
        .limit(1)
        .single()
      setLiveMatchId(data?.id ?? null)
      setLoading(false)
    }
    fetchLive()

    const ch = supabase.channel(`live_watch_${Math.random().toString(36).substring(2)}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, payload => {
        const m = payload.new as Match
        if (m.status === 'live') setLiveMatchId(m.id)
        else if (m.id === liveMatchId) setLiveMatchId(null)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [tournament])

  if (loading) return <PublicLayout><PageSpinner /></PublicLayout>

  return (
    <PublicLayout>
      <div className="mb-8">
        <h1 className="page-title flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-red-500 live-pulse" /> LIVE
        </h1>
      </div>
      {liveMatchId ? (
        <LiveScoreBoard matchId={liveMatchId} />
      ) : (
        <div className="admin-card py-24 text-center">
          <div className="w-20 h-20 mx-auto rounded-none bg-soft-cloud border border-hairline flex items-center justify-center mb-6">
            <Radio size={32} className="text-zinc-500" />
          </div>
          <h2 className="text-2xl font-bold text-ink uppercase tracking-wider mb-2">No Live Match</h2>
          <p className="text-zinc-500 font-bold">A match will appear here when it goes live. Stay tuned!</p>
        </div>
      )}
    </PublicLayout>
  )
}

