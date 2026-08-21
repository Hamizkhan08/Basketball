import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Play, Pause, RotateCcw, RefreshCw, CheckCircle, XCircle,
  ArrowLeft, AlertTriangle, Undo2, Timer, Trophy, Zap, Pencil,
} from 'lucide-react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { PageSpinner } from '@/components/ui/Spinner'
import { useRealtimeMatch } from '@/hooks/useRealtimeMatch'
import { useGameClock } from '@/hooks/useGameClock'
import { useTournament } from '@/hooks/useTournament'
import { supabase } from '@/lib/supabase'
import type { Player, MatchEvent, Team } from '@/lib/database.types'
import { formatTime, formatShotClock, getInitials, calculateCurrentClock, calculateCurrentShotClock } from '@/lib/utils'
import { EVENT_LABELS } from '@/lib/constants'

// Score button for a team
function ScoreButton({
  label, onClick, disabled, color,
}: { label: string; onClick: () => void; disabled?: boolean; color?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`score-btn flex-1 text-white text-lg font-black rounded-xl py-5
        transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed
        ${color || 'bg-brand-600 hover:bg-brand-500 border border-brand-500/40'}`}
    >
      {label}
    </button>
  )
}

function PlayerScoringRow({
  player, onScore, disabled, pendingScoreType
}: { player: Player; onScore: (playerId: string) => void; disabled?: boolean; pendingScoreType?: 'one_point'|'two_point'|'free_throw'|null }) {
  const isPending = !!pendingScoreType;

  return (
    <button
      onClick={() => isPending && !disabled ? onScore(player.id) : null}
      disabled={disabled || !isPending}
      className={`w-full flex items-center gap-3 py-3 border-b border-hairline last:border-0 transition-all text-left ${isPending ? 'hover:bg-soft-cloud cursor-pointer px-3 -mx-3 rounded-none bg-canvas' : 'cursor-default opacity-50'}`}
    >
      <div className={`w-10 h-10 rounded-none bg-soft-cloud border flex items-center justify-center text-sm font-bold text-ink flex-shrink-0 ${isPending ? 'border-ink' : 'border-hairline'}`}>
        {player.photo_url
          ? <img src={player.photo_url} alt={player.name} className="w-10 h-10 rounded-none object-cover" />
          : player.jersey_number}
      </div>
      <span className={`text-ink font-bold text-base flex-1 truncate ${isPending ? '' : 'text-zinc-500'}`}>{player.name}</span>
      {isPending && (
        <span className="text-xs font-bold text-sale uppercase tracking-widest animate-pulse">Select</span>
      )}
    </button>
  )
}

export default function LiveScoringPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tournament } = useTournament()
  const { match, teamA, teamB, playersA, playersB, events, loading, refetch } = useRealtimeMatch(id ?? null)
  const { gameClock, shotClock } = useGameClock(match)

  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [showOvertimeConfirm, setShowOvertimeConfirm] = useState(false)
  const [eventToUndo, setEventToUndo] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [playerMap, setPlayerMap] = useState<Map<string, Player>>(new Map())
  const [showEditTime, setShowEditTime] = useState(false)
  const [editMinutes, setEditMinutes] = useState('10')
  const [editSeconds, setEditSeconds] = useState('00')
  const [pendingScore, setPendingScore] = useState<{ teamId: string, type: 'one_point' | 'two_point' | 'free_throw', points: number } | null>(null)

  useEffect(() => {
    const allPlayers = [...playersA, ...playersB]
    setPlayerMap(new Map(allPlayers.map(p => [p.id, p])))
  }, [playersA, playersB])

  const canScore = match?.status === 'live'
  const canStart = match?.status === 'scheduled' || (match?.status === 'live' && !match.game_clock_running)
  const isRunning = match?.game_clock_running ?? false

  // === CLOCK CONTROLS ===

  const startClock = useCallback(async () => {
    if (!match) return
    setActionLoading(true)
    const now = new Date().toISOString()
    const currentGc = Math.max(0, Math.floor(calculateCurrentClock(match)))
    const currentSc = Math.max(0, Math.floor(calculateCurrentShotClock(match)))

    const updates: Partial<typeof match> = {
      game_clock_running: true,
      shot_clock_running: true,
      game_clock_seconds: currentGc,
      shot_clock_seconds: currentSc,
      last_clock_update: now,
    }

    if (match.status === 'scheduled') {
      updates.status = 'live'
      updates.started_at = now
      // Insert game_start event
      await supabase.from('match_events').insert({
        match_id: match.id,
        event_type: 'game_start',
        points: 0,
        game_clock_seconds: match.game_clock_seconds,
        shot_clock_seconds: match.shot_clock_seconds,
      })
    }

    await supabase.from('matches').update(updates).eq('id', match.id)
    setActionLoading(false)
  }, [match])

  const pauseClock = useCallback(async () => {
    if (!match) return
    setActionLoading(true)
    const currentGc = Math.max(0, Math.floor(calculateCurrentClock(match)))
    const currentSc = Math.max(0, Math.floor(calculateCurrentShotClock(match)))
    await supabase.from('matches').update({
      game_clock_running: false,
      shot_clock_running: false,
      game_clock_seconds: Math.max(0, currentGc),
      shot_clock_seconds: Math.max(0, currentSc),
    }).eq('id', match.id)
    setActionLoading(false)
  }, [match])

  const resetClock = useCallback(async () => {
    if (!match || !tournament) return
    setActionLoading(true)
    await supabase.from('matches').update({
      game_clock_running: false,
      shot_clock_running: false,
      game_clock_seconds: tournament.match_duration_seconds,
      shot_clock_seconds: tournament.shot_clock_seconds,
      last_clock_update: null,
    }).eq('id', match.id)
    setActionLoading(false)
  }, [match, tournament])

  const saveEditedTime = useCallback(async () => {
    if (!match) return
    setActionLoading(true)
    const totalSec = (parseInt(editMinutes) || 0) * 60 + (parseInt(editSeconds) || 0)
    await supabase.from('matches').update({
      game_clock_seconds: totalSec,
      last_clock_update: match.game_clock_running ? new Date().toISOString() : match.last_clock_update
    }).eq('id', match.id)
    setShowEditTime(false)
    setActionLoading(false)
  }, [match, editMinutes, editSeconds])

  const resetShotClock = useCallback(async () => {
    if (!match || !tournament) return
    setActionLoading(true)
    const now = new Date().toISOString()
    const currentGc = Math.max(0, Math.floor(calculateCurrentClock(match)))
    await supabase.from('matches').update({
      shot_clock_seconds: tournament.shot_clock_seconds,
      shot_clock_running: match.game_clock_running,
      game_clock_seconds: currentGc,
      last_clock_update: match.game_clock_running ? now : match.last_clock_update,
    }).eq('id', match.id)
    setActionLoading(false)
  }, [match, tournament])

  // === SCORING ===

  const scorePoint = useCallback(async (
    teamId: string, playerId: string, eventType: 'one_point' | 'two_point' | 'free_throw',
  ) => {
    if (!match || !tournament || !canScore) return
    setActionLoading(true)

    const pts = eventType === 'two_point' ? tournament.outside_arc_points
      : eventType === 'free_throw' ? tournament.free_throw_points
      : tournament.inside_arc_points

    const isTeamA = teamId === match.team_a_id
    const currentGc = Math.max(0, Math.floor(calculateCurrentClock(match)))
    const currentSc = Math.max(0, Math.floor(calculateCurrentShotClock(match)))

    // Update match score + reset shot clock
    const now = new Date().toISOString()
    const scoreUpdate = isTeamA
      ? { team_a_score: match.team_a_score + pts }
      : { team_b_score: match.team_b_score + pts }

    await Promise.all([
      supabase.from('matches').update({
        ...scoreUpdate,
        game_clock_seconds: currentGc,
        shot_clock_seconds: tournament.shot_clock_seconds,
        shot_clock_running: match.game_clock_running,
        last_clock_update: match.game_clock_running ? now : match.last_clock_update,
      }).eq('id', match.id),

      supabase.from('match_events').insert({
        match_id: match.id,
        team_id: teamId,
        player_id: playerId,
        event_type: eventType,
        points: pts,
        game_clock_seconds: Math.floor(currentGc),
        shot_clock_seconds: Math.floor(currentSc),
      }),

      supabase.from('player_match_stats').upsert({
        match_id: match.id,
        player_id: playerId,
        team_id: teamId,
        one_point_scores: eventType === 'one_point' ? 1 : 0,
        two_point_scores: eventType === 'two_point' ? 1 : 0,
        free_throws: eventType === 'free_throw' ? 1 : 0,
        total_points: pts,
      }, {
        onConflict: 'match_id,player_id',
        ignoreDuplicates: false,
      })
    ])

    // Manual increment since supabase-js doesn't support atomic increment without RPC
    const { data: existing } = await supabase
      .from('player_match_stats')
      .select('*')
      .eq('match_id', match.id)
      .eq('player_id', playerId)
      .single()

    if (existing) {
      await supabase.from('player_match_stats').update({
        one_point_scores: existing.one_point_scores + (eventType === 'one_point' ? 1 : 0),
        two_point_scores: existing.two_point_scores + (eventType === 'two_point' ? 1 : 0),
        free_throws: existing.free_throws + (eventType === 'free_throw' ? 1 : 0),
        total_points: existing.total_points + pts,
      }).eq('match_id', match.id).eq('player_id', playerId)
    } else {
      await supabase.from('player_match_stats').insert({
        match_id: match.id,
        player_id: playerId,
        team_id: teamId,
        one_point_scores: eventType === 'one_point' ? 1 : 0,
        two_point_scores: eventType === 'two_point' ? 1 : 0,
        free_throws: eventType === 'free_throw' ? 1 : 0,
        total_points: pts,
      })
    }

    setActionLoading(false)
  }, [match, tournament, canScore])

  // === UNDO ===

  const undoSpecificEvent = useCallback(async () => {
    if (!match || !eventToUndo) return
    setActionLoading(true)
    
    const event = events.find(e => e.id === eventToUndo)
    if (!event || event.points <= 0) {
      setEventToUndo(null)
      setActionLoading(false)
      return
    }

    const isTeamA = event.team_id === match.team_a_id

    // Reverse score
    const scoreUpdate = isTeamA
      ? { team_a_score: Math.max(0, match.team_a_score - event.points) }
      : { team_b_score: Math.max(0, match.team_b_score - event.points) }

    await supabase.from('matches').update(scoreUpdate).eq('id', match.id)
    await supabase.from('match_events').delete().eq('id', event.id)

    // Reverse player stats
    if (event.player_id) {
      const { data: stat } = await supabase
        .from('player_match_stats')
        .select('*')
        .eq('match_id', match.id)
        .eq('player_id', event.player_id)
        .single()

      if (stat) {
        const eventTypeKey = event.event_type === 'one_point' ? 'one_point_scores'
          : event.event_type === 'two_point' ? 'two_point_scores'
          : 'free_throws'
        await supabase.from('player_match_stats').update({
          [eventTypeKey]: Math.max(0, (stat as any)[eventTypeKey] - 1),
          total_points: Math.max(0, stat.total_points - event.points),
        }).eq('match_id', match.id).eq('player_id', event.player_id)
      }
    }

    setEventToUndo(null)
    setActionLoading(false)
  }, [match, events, eventToUndo])

  // === END MATCH ===

  const endMatch = useCallback(async () => {
    if (!match) return
    setActionLoading(true)

    const winner = match.team_a_score > match.team_b_score ? match.team_a_id
      : match.team_b_score > match.team_a_score ? match.team_b_id
      : null // draw

    const currentGc = Math.max(0, Math.floor(calculateCurrentClock(match)))

    await supabase.from('matches').update({
      status: 'completed',
      winner_team_id: winner,
      game_clock_running: false,
      shot_clock_running: false,
      game_clock_seconds: Math.max(0, currentGc),
      ended_at: new Date().toISOString(),
    }).eq('id', match.id)

    await supabase.from('match_events').insert({
      match_id: match.id,
      event_type: 'game_end',
      points: 0,
      game_clock_seconds: Math.floor(currentGc),
      shot_clock_seconds: 0,
    })

    // Save team_match_stats
    const result_a = match.team_a_score > match.team_b_score ? 'win' : match.team_a_score < match.team_b_score ? 'loss' : 'draw'
    const result_b = result_a === 'win' ? 'loss' : result_a === 'loss' ? 'win' : 'draw'

    await Promise.all([
      supabase.from('team_match_stats').upsert({
        match_id: match.id,
        team_id: match.team_a_id,
        points_for: match.team_a_score,
        points_against: match.team_b_score,
        result: result_a,
        win: result_a === 'win' ? 1 : 0,
        draw: result_a === 'draw' ? 1 : 0,
        loss: result_a === 'loss' ? 1 : 0,
      }, { onConflict: 'match_id,team_id' }),
      supabase.from('team_match_stats').upsert({
        match_id: match.id,
        team_id: match.team_b_id,
        points_for: match.team_b_score,
        points_against: match.team_a_score,
        result: result_b,
        win: result_b === 'win' ? 1 : 0,
        draw: result_b === 'draw' ? 1 : 0,
        loss: result_b === 'loss' ? 1 : 0,
      }, { onConflict: 'match_id,team_id' }),
    ])

    setShowEndConfirm(false)
    setActionLoading(false)
    navigate('/admin/matches')
  }, [match, navigate])

  // === START OVERTIME ===

  const startOvertime = useCallback(async () => {
    if (!match || !tournament) return
    setActionLoading(true)
    const now = new Date().toISOString()
    await supabase.from('matches').update({
      is_overtime: true,
      game_clock_running: true,
      shot_clock_running: true,
      game_clock_seconds: 300, // 5 min overtime
      shot_clock_seconds: tournament.shot_clock_seconds,
      last_clock_update: now,
    }).eq('id', match.id)
    await supabase.from('match_events').insert({
      match_id: match.id,
      event_type: 'overtime_start',
      points: 0,
      game_clock_seconds: 300,
      shot_clock_seconds: tournament.shot_clock_seconds,
    })
    setShowOvertimeConfirm(false)
    setActionLoading(false)
  }, [match, tournament])

  if (loading || !id) return <AdminLayout><PageSpinner /></AdminLayout>

  if (!match) {
    return (
      <AdminLayout>
        <div className="text-center py-16">
          <p className="text-zinc-400 mb-4">Match not found.</p>
          <Link to="/admin/matches" className="btn-secondary px-4 py-2 rounded-lg text-sm">Back to Matches</Link>
        </div>
      </AdminLayout>
    )
  }

  const lastScoringEvent = events.find(e => e.points > 0)
  const gameEnded = gameClock <= 0 && match.status === 'live'
  const teamAWinCondition = tournament && match.team_a_score >= tournament.winning_score
  const teamBWinCondition = tournament && match.team_b_score >= tournament.winning_score

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link to="/admin/matches" className="text-zinc-500 hover:text-ink p-2 border border-transparent hover:border-hairline rounded-none hover:bg-soft-cloud transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black text-ink uppercase">Match #{match.match_number} — Live Control</h1>
          <p className="text-zinc-500 text-xs font-bold tracking-wider uppercase mt-0.5">{match.court} · {match.round}</p>
        </div>
        <Badge variant={match.status}>
          {match.status === 'live' ? 'LIVE' : match.status === 'completed' ? 'FT' : 'Scheduled'}
        </Badge>
      </div>

      {/* Winning alert */}
      {(teamAWinCondition || teamBWinCondition) && match.status === 'live' && (
        <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-xl p-3 mb-4 flex items-center gap-3">
          <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0" />
          <p className="text-yellow-300 text-sm font-semibold">
            {teamAWinCondition ? teamA?.name : teamB?.name} reached {tournament?.winning_score} points! Confirm end of match.
          </p>
          <Button variant="primary" size="sm" onClick={() => setShowEndConfirm(true)} className="ml-auto flex-shrink-0">
            END MATCH
          </Button>
        </div>
      )}

      {/* Game over alert */}
      {gameEnded && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 mb-4 flex items-center gap-3">
          <Timer size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-sm font-semibold">Game clock reached 00:00!</p>
          <div className="ml-auto flex gap-2 flex-shrink-0">
            <Button variant="secondary" size="sm" onClick={() => setShowOvertimeConfirm(true)}>Overtime</Button>
            <Button variant="danger" size="sm" onClick={() => setShowEndConfirm(true)}>End Match</Button>
          </div>
        </div>
      )}

      {/* === CLOCK & CONTROLS === */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {/* GAME CLOCK */}
        <div className="admin-card p-4 text-center">
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">GAME CLOCK</p>
            {match.is_overtime && <p className="text-yellow-500 text-xs font-bold uppercase tracking-widest">OVERTIME</p>}
          </div>
          <div className="flex items-center justify-center gap-3 mb-3">
            <p className={`font-mono text-5xl sm:text-6xl font-black ${gameClock <= 30 && gameClock > 0 ? 'text-sale' : gameClock === 0 ? 'text-sale' : 'text-ink'}`}>
              {formatTime(gameClock)}
            </p>
            {!isRunning && (
              <button
                onClick={() => {
                  setEditMinutes(String(Math.floor(gameClock / 60)).padStart(2, '0'))
                  setEditSeconds(String(gameClock % 60).padStart(2, '0'))
                  setShowEditTime(true)
                }}
                className="text-zinc-500 hover:text-ink p-2 transition-colors border border-transparent hover:border-hairline rounded-none hover:bg-soft-cloud"
                title="Edit Time"
              >
                <Pencil size={18} />
              </button>
            )}
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            {!isRunning ? (
              <Button
                variant="success"
                onClick={startClock}
                loading={actionLoading}
                disabled={match.status === 'completed'}
                icon={<Play size={16} />}
                id="clock-start-btn"
              >
                {match.status === 'scheduled' ? 'START' : 'RESUME'}
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={pauseClock}
                loading={actionLoading}
                icon={<Pause size={16} />}
                id="clock-pause-btn"
              >
                PAUSE
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={resetClock}
              loading={actionLoading}
              disabled={match.status === 'completed'}
              icon={<RotateCcw size={14} />}
              size="sm"
              id="clock-reset-btn"
            >
              RESET
            </Button>
          </div>
        </div>

        {/* END MATCH BUTTON */}
        {match.status === 'live' && (
          <div className="admin-card p-4 text-center flex items-center justify-center">
            <Button
              variant="danger"
              onClick={() => setShowEndConfirm(true)}
              disabled={actionLoading}
              icon={<CheckCircle size={16} />}
              className="w-full h-full py-6 text-lg"
              id="end-match-btn"
            >
              END MATCH
            </Button>
          </div>
        )}
      </div>

      {/* === TEAMS GRID === */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4">

        {/* TEAM A */}
        <div className="admin-card p-2 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3 mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-none bg-soft-cloud border border-hairline flex items-center justify-center flex-shrink-0">
              {teamA?.logo_url
                ? <img src={teamA.logo_url} alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded-none object-contain" />
                : <span className="text-sm sm:text-lg font-black text-ink">{getInitials(teamA?.name || 'A')}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-ink text-sm sm:text-base truncate">{teamA?.short_name || teamA?.name}</p>
            </div>
          </div>
          <div className="text-center mb-4">
            <p className="score-display text-5xl sm:text-7xl font-black text-ink">{match.team_a_score}</p>
          </div>
          
          <div className="flex gap-1 sm:gap-2 mb-4">
             <button
                onClick={() => setPendingScore(pendingScore?.teamId === match.team_a_id && pendingScore?.type === 'one_point' ? null : { teamId: match.team_a_id, type: 'one_point', points: tournament?.inside_arc_points || 1 })}
                disabled={!canScore || actionLoading}
                className={`flex-1 py-2 sm:py-3 text-xs sm:text-sm font-black uppercase tracking-widest border transition-all ${pendingScore?.teamId === match.team_a_id && pendingScore?.type === 'one_point' ? 'bg-ink text-canvas border-ink' : 'bg-canvas text-ink border-hairline hover:border-ink hover:bg-soft-cloud'} disabled:opacity-30`}
             >
                +1
             </button>
             <button
                onClick={() => setPendingScore(pendingScore?.teamId === match.team_a_id && pendingScore?.type === 'two_point' ? null : { teamId: match.team_a_id, type: 'two_point', points: tournament?.outside_arc_points || 2 })}
                disabled={!canScore || actionLoading}
                className={`flex-1 py-2 sm:py-3 text-xs sm:text-sm font-black uppercase tracking-widest border transition-all ${pendingScore?.teamId === match.team_a_id && pendingScore?.type === 'two_point' ? 'bg-ink text-canvas border-ink' : 'bg-canvas text-ink border-hairline hover:border-ink hover:bg-soft-cloud'} disabled:opacity-30`}
             >
                +2
             </button>
             <button
                onClick={() => setPendingScore(pendingScore?.teamId === match.team_a_id && pendingScore?.type === 'free_throw' ? null : { teamId: match.team_a_id, type: 'free_throw', points: tournament?.free_throw_points || 1 })}
                disabled={!canScore || actionLoading}
                className={`flex-1 py-2 sm:py-3 text-xs sm:text-sm font-black uppercase tracking-widest border transition-all ${pendingScore?.teamId === match.team_a_id && pendingScore?.type === 'free_throw' ? 'bg-ink text-canvas border-ink' : 'bg-canvas text-ink border-hairline hover:border-ink hover:bg-soft-cloud'} disabled:opacity-30`}
             >
                FT
             </button>
          </div>

        </div>

        {/* TEAM B */}
        <div className="admin-card p-2 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3 mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-none bg-soft-cloud border border-hairline flex items-center justify-center flex-shrink-0">
              {teamB?.logo_url
                ? <img src={teamB.logo_url} alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded-none object-contain" />
                : <span className="text-sm sm:text-lg font-black text-ink">{getInitials(teamB?.name || 'B')}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-ink text-sm sm:text-base truncate">{teamB?.short_name || teamB?.name}</p>
            </div>
          </div>
          <div className="text-center mb-4">
            <p className="score-display text-5xl sm:text-7xl font-black text-ink">{match.team_b_score}</p>
          </div>
          
          <div className="flex gap-1 sm:gap-2 mb-4">
             <button
                onClick={() => setPendingScore(pendingScore?.teamId === match.team_b_id && pendingScore?.type === 'one_point' ? null : { teamId: match.team_b_id, type: 'one_point', points: tournament?.inside_arc_points || 1 })}
                disabled={!canScore || actionLoading}
                className={`flex-1 py-2 sm:py-3 text-xs sm:text-sm font-black uppercase tracking-widest border transition-all ${pendingScore?.teamId === match.team_b_id && pendingScore?.type === 'one_point' ? 'bg-ink text-canvas border-ink' : 'bg-canvas text-ink border-hairline hover:border-ink hover:bg-soft-cloud'} disabled:opacity-30`}
             >
                +1
             </button>
             <button
                onClick={() => setPendingScore(pendingScore?.teamId === match.team_b_id && pendingScore?.type === 'two_point' ? null : { teamId: match.team_b_id, type: 'two_point', points: tournament?.outside_arc_points || 2 })}
                disabled={!canScore || actionLoading}
                className={`flex-1 py-2 sm:py-3 text-xs sm:text-sm font-black uppercase tracking-widest border transition-all ${pendingScore?.teamId === match.team_b_id && pendingScore?.type === 'two_point' ? 'bg-ink text-canvas border-ink' : 'bg-canvas text-ink border-hairline hover:border-ink hover:bg-soft-cloud'} disabled:opacity-30`}
             >
                +2
             </button>
             <button
                onClick={() => setPendingScore(pendingScore?.teamId === match.team_b_id && pendingScore?.type === 'free_throw' ? null : { teamId: match.team_b_id, type: 'free_throw', points: tournament?.free_throw_points || 1 })}
                disabled={!canScore || actionLoading}
                className={`flex-1 py-2 sm:py-3 text-xs sm:text-sm font-black uppercase tracking-widest border transition-all ${pendingScore?.teamId === match.team_b_id && pendingScore?.type === 'free_throw' ? 'bg-ink text-canvas border-ink' : 'bg-canvas text-ink border-hairline hover:border-ink hover:bg-soft-cloud'} disabled:opacity-30`}
             >
                FT
             </button>
          </div>

        </div>
      </div>

      {/* RECENT EVENTS */}
      <div className="admin-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-ink font-bold text-xs uppercase tracking-wider">Recent Events</p>
          {events.filter(e => e.points > 0).length > 0 && (
            <button
              onClick={() => setEventToUndo(events.filter(e => e.points > 0)[0].id)}
              disabled={actionLoading}
              className="flex items-center gap-1 text-zinc-500 hover:text-danger text-xs font-bold transition-colors"
              title="Undo last scoring event"
            >
              <Undo2 size={12} /> Undo
            </button>
          )}
        </div>
        {events.filter(e => e.points > 0).length === 0 ? (
          <p className="text-zinc-600 text-xs text-center py-4 font-bold uppercase tracking-widest">No scoring events yet</p>
        ) : (
          <div className="space-y-1.5">
            {events.filter(e => e.points > 0).slice(0, 8).map(event => {
              const p = event.player_id ? playerMap.get(event.player_id) : null
              const t = event.team_id === match.team_a_id ? teamA : teamB
              return (
                <div key={event.id} className="group flex items-center gap-2 text-xs py-2 border-b border-hairline last:border-0 hover:bg-soft-cloud transition-colors pr-1 rounded-none">
                  <span className="font-mono text-zinc-500 font-bold w-12">{formatTime(event.game_clock_seconds)}</span>
                  <span className="text-zinc-500 font-bold flex-1 truncate">{p?.name ?? t?.short_name ?? 'Team'}</span>
                  <span className="font-bold text-ink">+{event.points}</span>
                  <button
                    onClick={() => setEventToUndo(event.id)}
                    disabled={actionLoading}
                    className="text-zinc-500 hover:text-danger p-1 transition-all"
                    title="Undo this event"
                  >
                    <Undo2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* End Match Confirmation */}
      <Modal
        open={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        title="Confirm End Match"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="flex items-center justify-center gap-6 mb-4">
            <div className="text-center">
              <p className="text-zinc-500 font-bold text-xs uppercase tracking-wider mb-1">{teamA?.name}</p>
              <p className="score-display text-5xl font-black text-ink">{match.team_a_score}</p>
            </div>
            <span className="text-zinc-500 text-2xl">—</span>
            <div className="text-center">
              <p className="text-zinc-500 font-bold text-xs uppercase tracking-wider mb-1">{teamB?.name}</p>
              <p className="score-display text-5xl font-black text-ink">{match.team_b_score}</p>
            </div>
          </div>
          {match.team_a_score !== match.team_b_score && (
            <div className="bg-success/10 border border-success/30 rounded-none p-3 mb-4">
              <p className="text-success font-bold flex items-center justify-center gap-2">
                <Trophy size={16} />
                Winner: {match.team_a_score > match.team_b_score ? teamA?.name : teamB?.name}
              </p>
            </div>
          )}
          {match.team_a_score === match.team_b_score && (
            <p className="text-yellow-400 text-sm font-semibold mb-4">This will result in a DRAW</p>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowEndConfirm(false)} className="flex-1" disabled={actionLoading}>Cancel</Button>
            <Button variant="danger" onClick={endMatch} loading={actionLoading} className="flex-1" icon={<CheckCircle size={16} />}>
              CONFIRM RESULT
            </Button>
          </div>
        </div>
      </Modal>

      {/* Overtime Confirmation */}
      <ConfirmModal
        open={showOvertimeConfirm}
        onClose={() => setShowOvertimeConfirm(false)}
        onConfirm={startOvertime}
        title="Start Overtime?"
        message={`Start a 5-minute overtime period. First team to score ${tournament?.overtime_target} point(s) wins.`}
        confirmLabel="START OVERTIME"
        variant="warning"
        loading={actionLoading}
      />

      {/* Undo Confirmation */}
      {eventToUndo && (
        <ConfirmModal
          open={!!eventToUndo}
          onClose={() => setEventToUndo(null)}
          onConfirm={undoSpecificEvent}
          title="Undo Scoring Event?"
          message="Are you sure you want to remove this scoring event? Points will be deducted."
          confirmLabel="YES, UNDO"
          variant="danger"
          loading={actionLoading}
        />
      )}

      <Modal open={showEditTime} onClose={() => setShowEditTime(false)} title="Edit Game Clock" size="sm">
        <div className="space-y-4 p-2">
          <div className="flex items-center justify-center gap-4">
            <div>
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1 text-center">Minutes</label>
              <input
                type="number"
                value={editMinutes}
                onChange={e => setEditMinutes(e.target.value)}
                className="input-field text-center text-2xl font-mono p-2 w-20"
                min="0"
                max="99"
              />
            </div>
            <div className="text-2xl font-bold text-zinc-500 mt-4">:</div>
            <div>
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1 text-center">Seconds</label>
              <input
                type="number"
                value={editSeconds}
                onChange={e => setEditSeconds(e.target.value)}
                className="input-field text-center text-2xl font-mono p-2 w-20"
                min="0"
                max="59"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowEditTime(false)} className="flex-1" disabled={actionLoading}>Cancel</Button>
            <Button variant="primary" onClick={saveEditedTime} loading={actionLoading} className="flex-1">
              SAVE
            </Button>
          </div>
        </div>
      </Modal>

      {/* Player Selection Modal */}
      <Modal 
        open={!!pendingScore} 
        onClose={() => setPendingScore(null)} 
        title={pendingScore ? `Select Player (+${pendingScore.points} PTS)` : ''}
        size="sm"
      >
        <div className="p-2 space-y-2">
          <div className="flex items-center gap-2 mb-4 text-sale text-xs font-bold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-sale animate-pulse" />
            Assign points to...
          </div>
          {pendingScore?.teamId === match.team_a_id ? (
            playersA.length === 0 ? <p className="text-zinc-500 text-sm font-bold text-center py-4">No players on roster</p> :
            playersA.map(p => (
              <button
                key={p.id}
                disabled={actionLoading}
                onClick={() => { scorePoint(match.team_a_id, p.id, pendingScore.type); setPendingScore(null); }}
                className="w-full flex items-center gap-3 p-3 sm:p-4 bg-canvas border border-hairline hover:border-ink hover:bg-soft-cloud active:scale-95 transition-all text-left disabled:opacity-50"
              >
                <div className="w-10 h-10 bg-soft-cloud flex items-center justify-center font-bold text-ink flex-shrink-0">
                  {p.photo_url ? <img src={p.photo_url} alt="" className="w-full h-full object-cover" /> : p.jersey_number}
                </div>
                <span className="font-bold text-ink text-lg flex-1">{p.name}</span>
                <span className="text-sale font-bold text-xs uppercase tracking-widest">Select</span>
              </button>
            ))
          ) : pendingScore?.teamId === match.team_b_id ? (
            playersB.length === 0 ? <p className="text-zinc-500 text-sm font-bold text-center py-4">No players on roster</p> :
            playersB.map(p => (
              <button
                key={p.id}
                disabled={actionLoading}
                onClick={() => { scorePoint(match.team_b_id, p.id, pendingScore.type); setPendingScore(null); }}
                className="w-full flex items-center gap-3 p-3 sm:p-4 bg-canvas border border-hairline hover:border-ink hover:bg-soft-cloud active:scale-95 transition-all text-left disabled:opacity-50"
              >
                <div className="w-10 h-10 bg-soft-cloud flex items-center justify-center font-bold text-ink flex-shrink-0">
                  {p.photo_url ? <img src={p.photo_url} alt="" className="w-full h-full object-cover" /> : p.jersey_number}
                </div>
                <span className="font-bold text-ink text-lg flex-1">{p.name}</span>
                <span className="text-sale font-bold text-xs uppercase tracking-widest">Select</span>
              </button>
            ))
          ) : null}
          <div className="pt-4">
            <Button variant="ghost" onClick={() => setPendingScore(null)} className="w-full" disabled={actionLoading}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}

