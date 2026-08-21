import { useState, useEffect, useRef } from 'react'
import type { Match } from '@/lib/database.types'
import { calculateCurrentClock, calculateCurrentShotClock } from '@/lib/utils'

/**
 * useGameClock - derives displayed timer values from server-authoritative state.
 * Uses requestAnimationFrame for smooth display, but never trusts the browser
 * as the source of truth — always recalculates from last_clock_update timestamp.
 */
export function useGameClock(match: Match | null) {
  const [gameClock, setGameClock] = useState(match?.game_clock_seconds ?? 0)
  const [shotClock, setShotClock] = useState(match?.shot_clock_seconds ?? 0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!match) return

    const tick = () => {
      const gc = calculateCurrentClock(match)
      const sc = calculateCurrentShotClock(match)
      setGameClock(gc)
      setShotClock(sc)

      if (match.game_clock_running && gc > 0) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    // Initial update
    setGameClock(calculateCurrentClock(match))
    setShotClock(calculateCurrentShotClock(match))

    if (match.game_clock_running) {
      rafRef.current = requestAnimationFrame(tick)
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [match])

  return { gameClock, shotClock }
}
