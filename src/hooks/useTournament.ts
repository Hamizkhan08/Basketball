import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tournament } from '@/lib/database.types'

export function useTournament() {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTournament = useCallback(async () => {
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
