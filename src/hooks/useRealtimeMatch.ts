import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Match, MatchEvent, Team, Player } from '@/lib/database.types'

interface RealtimeMatchState {
  match: Match | null
  teamA: Team | null
  teamB: Team | null
  playersA: Player[]
  playersB: Player[]
  events: MatchEvent[]
  loading: boolean
  error: string | null
}

export function useRealtimeMatch(matchId: string | null) {
  const [state, setState] = useState<RealtimeMatchState>({
    match: null,
    teamA: null,
    teamB: null,
    playersA: [],
    playersB: [],
    events: [],
    loading: true,
    error: null,
  })

  const fetchMatch = useCallback(async () => {
    if (!matchId) {
      setState(s => ({ ...s, loading: false }))
      return
    }

    const [matchRes, eventsRes] = await Promise.all([
      supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single(),
      supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    if (matchRes.error) {
      setState(s => ({ ...s, error: matchRes.error.message, loading: false }))
      return
    }

    const match = matchRes.data as Match

    const [teamARes, teamBRes] = await Promise.all([
      supabase.from('teams').select('*').eq('id', match.team_a_id).single(),
      supabase.from('teams').select('*').eq('id', match.team_b_id).single(),
    ])

    const [playersARes, playersBRes] = await Promise.all([
      supabase.from('players').select('*').eq('team_id', match.team_a_id).order('jersey_number'),
      supabase.from('players').select('*').eq('team_id', match.team_b_id).order('jersey_number'),
    ])

    setState({
      match,
      teamA: teamARes.data,
      teamB: teamBRes.data,
      playersA: (playersARes.data as Player[]) ?? [],
      playersB: (playersBRes.data as Player[]) ?? [],
      events: (eventsRes.data as MatchEvent[]) ?? [],
      loading: false,
      error: null,
    })
  }, [matchId])

  useEffect(() => {
    fetchMatch()

    if (!matchId) return

    const channel = supabase
      .channel(`match_${matchId}_${Math.random().toString(36).substring(2)}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${matchId}`,
      }, (payload) => {
        setState(s => ({ ...s, match: payload.new as Match }))
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'match_events',
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        setState(s => ({
          ...s,
          events: [payload.new as MatchEvent, ...s.events].slice(0, 20),
        }))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchId, fetchMatch])

  return { ...state, refetch: fetchMatch }
}
