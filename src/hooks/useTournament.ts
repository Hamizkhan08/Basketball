import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tournament } from '@/lib/database.types'
import { USE_MOCK_DATA } from '@/lib/mockData'

export function useTournament() {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTournament = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setTournament({
        id: 'mock-tourney',
        name: '3x3 Basketball Championship',
        venue: 'GCOERC',
        status: 'active',
        tournament_format: 'league',
        match_duration_seconds: 600,
        winning_score: 21,
        overtime_target: 2,
        win_points: 3,
        draw_points: 1,
        loss_points: 0,
        inside_arc_points: 1,
        outside_arc_points: 2,
        free_throw_points: 1,
        created_at: new Date().toISOString()
      } as Tournament)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      setError(error.message)
    } else {
      setTournament(data as Tournament | null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTournament()

    // Set up realtime subscription after initial fetch
    const channelName = `tournament_updates_${Math.random().toString(36).substring(2)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournaments' },
        () => { fetchTournament() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchTournament])

  return { tournament, loading, error, refetch: fetchTournament }
}
