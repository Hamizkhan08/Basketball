import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Shuffle, Play, Radio, Trash2 } from 'lucide-react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { PageSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { supabase } from '@/lib/supabase'
import { useTournament } from '@/hooks/useTournament'
import type { Match, Team } from '@/lib/database.types'
import { formatDate, formatMatchTime, generateRoundRobinFixtures } from '@/lib/utils'
import { ROUND_OPTIONS, COURT_OPTIONS, MATCH_STATUS_LABELS } from '@/lib/constants'

export default function AdminSchedulePage() {
  const { tournament, loading: tournamentLoading } = useTournament()
  const [matches, setMatches] = useState<Array<{ match: Match; teamA: Team; teamB: Team }>>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showGenModal, setShowGenModal] = useState(false)
  const [genDate, setGenDate] = useState('')
  const [genTime, setGenTime] = useState('09:00')
  const [genCourt, setGenCourt] = useState('Court 1')
  const [genRound, setGenRound] = useState('League')
  const [genTargetPool, setGenTargetPool] = useState('ALL')
  const pools = Array.from(new Set(teams.map(t => t.pool_name).filter(Boolean))) as string[]

  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null)

  const [showAddMatch, setShowAddMatch] = useState(false)
  const [form, setForm] = useState({
    match_number: '',
    round: 'League',
    team_a_id: '',
    team_b_id: '',
    scheduled_date: '',
    scheduled_time: '09:00',
    court: 'Court 1',
  })

  const fetchData = async () => {
    if (tournamentLoading) return
    if (!tournament) { setLoading(false); return }
    const [matchesRes, teamsRes] = await Promise.all([
      supabase.from('matches').select('*').eq('tournament_id', tournament.id).order('match_number'),
      supabase.from('teams').select('*').eq('tournament_id', tournament.id).order('name'),
    ])
    const ms = (matchesRes.data as Match[]) ?? []
    const ts = (teamsRes.data as Team[]) ?? []
    setTeams(ts)
    const tMap = new Map(ts.map(t => [t.id, t]))
    setMatches(ms.map(m => ({ match: m, teamA: tMap.get(m.team_a_id)!, teamB: tMap.get(m.team_b_id)! })).filter(x => x.teamA && x.teamB))
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [tournament, tournamentLoading])

  const generateFixtures = async () => {
    if (!tournament || teams.length < 2) return
    let targetTeams = teams
    if (genTargetPool !== 'ALL') targetTeams = teams.filter(t => t.pool_name === genTargetPool)
    if (targetTeams.length < 2) {
      alert(`Not enough teams in ${genTargetPool === 'ALL' ? 'tournament' : `Pool ${genTargetPool}`} to generate fixtures`)
      return
    }

    setGenerating(true)
    const fixtures = generateRoundRobinFixtures(targetTeams.map(t => t.id))
    const maxNum = matches.reduce((m, x) => Math.max(m, x.match.match_number), 0)
    const inserts = fixtures.map(([ aId, bId ], i) => ({
      tournament_id: tournament.id,
      match_number: maxNum + i + 1,
      team_a_id: aId,
      team_b_id: bId,
      scheduled_date: genDate || null,
      scheduled_time: genTime || null,
      court: genCourt,
      round: genRound,
      game_clock_seconds: tournament.match_duration_seconds,
      shot_clock_seconds: tournament.shot_clock_seconds,
    }))
    await supabase.from('matches').insert(inserts)
    setShowGenModal(false)
    setGenerating(false)
    fetchData()
  }

  const handleAddMatch = async () => {
    if (!tournament) return
    if (!form.team_a_id || !form.team_b_id || form.team_a_id === form.team_b_id) {
      alert('Please select two different teams')
      return
    }
    
    setGenerating(true)
    const maxNum = matches.reduce((m, x) => Math.max(m, x.match.match_number), 0)
    const payload = {
      tournament_id: tournament.id,
      match_number: parseInt(form.match_number) || (maxNum + 1),
      round: form.round,
      team_a_id: form.team_a_id,
      team_b_id: form.team_b_id,
      scheduled_date: form.scheduled_date || null,
      scheduled_time: form.scheduled_time || null,
      court: form.court,
      game_clock_seconds: tournament.match_duration_seconds,
      shot_clock_seconds: tournament.shot_clock_seconds,
    }
    
    await supabase.from('matches').insert(payload)
    setShowAddMatch(false)
    setGenerating(false)
    fetchData()
    setForm({ ...form, match_number: '' }) // reset
  }

  const handleDeleteMatch = async () => {
    if (!matchToDelete) return
    setGenerating(true)
    await supabase.from('matches').delete().eq('id', matchToDelete.id)
    setMatchToDelete(null)
    setGenerating(false)
    fetchData()
  }

  if (loading || tournamentLoading) return <AdminLayout><PageSpinner /></AdminLayout>
  if (!tournament && !tournamentLoading) return <Navigate to="/admin/setup" replace />

  // Group by date
  const grouped: Record<string, typeof matches> = {}
  for (const m of matches) {
    const key = m.match.scheduled_date ?? 'TBD'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(m)
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-ink uppercase">Schedule</h1>
          <p className="text-zinc-500 text-sm font-bold">{matches.length} matches · {teams.length} teams</p>
        </div>
        <div className="flex gap-2">
          {teams.length >= 2 && (
            <Button variant="secondary" onClick={() => setShowGenModal(true)} icon={<Shuffle size={14} />} size="sm">
              Generate Fixtures
            </Button>
          )}
          <Button variant="primary" onClick={() => setShowAddMatch(true)} icon={<Plus size={14} />} size="sm" disabled={teams.length < 2}>
            Add Match
          </Button>
        </div>
      </div>

      {matches.length === 0 ? (
        <EmptyState
          title="No fixtures yet"
          description={teams.length < 2 ? "Add at least 2 teams before generating fixtures." : "Generate round-robin fixtures or add matches manually."}
          action={
            teams.length >= 2
              ? <Button variant="primary" onClick={() => setShowGenModal(true)} icon={<Shuffle size={14} />}>Generate Fixtures</Button>
              : <Link to="/admin/teams"><Button variant="primary">Add Teams First</Button></Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => (
            <div key={date}>
              <h2 className="text-sm font-bold text-ink uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-ink rounded-none" />
                {date === 'TBD' ? 'Date TBD' : formatDate(date)}
              </h2>
              <div className="space-y-2">
                {items.map(({ match, teamA, teamB }) => (
                  <div key={match.id} className={`admin-card flex items-center gap-4 py-3 border border-transparent ${match.status === 'live' ? 'border-sale bg-sale/5' : 'hover:border-hairline'}`}>
                    <span className="text-zinc-500 text-xs font-mono font-bold w-8 text-center">#{match.match_number}</span>
                    <div className="flex-1 flex items-center gap-3 min-w-0">
                      <span className="font-bold text-ink text-sm truncate">{teamA.name}</span>
                      {(match.status === 'completed' || match.status === 'live') ? (
                        <span className="font-mono font-black text-ink text-sm flex-shrink-0">{match.team_a_score}—{match.team_b_score}</span>
                      ) : <span className="text-zinc-500 text-xs font-bold flex-shrink-0">vs</span>}
                      <span className="font-bold text-ink text-sm truncate">{teamB.name}</span>
                    </div>
                    <div className="text-right text-xs text-zinc-500 hidden sm:block">
                      <p className="font-bold text-ink">{formatMatchTime(match.scheduled_time)}</p>
                      <p className="font-bold uppercase tracking-wider text-[10px] mt-0.5">{match.court} · {match.round}</p>
                    </div>
                    <Badge variant={match.status}>{MATCH_STATUS_LABELS[match.status]}</Badge>
                    {match.status === 'scheduled' && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Link to={`/admin/live/${match.id}`} className="p-2 rounded-none bg-success/10 hover:bg-success/20 text-success transition-colors" title="Start Match">
                          <Play size={14} />
                        </Link>
                        <button
                          onClick={() => setMatchToDelete(match)}
                          className="p-2 rounded-none bg-danger/10 hover:bg-danger/20 text-danger transition-colors"
                          title="Delete Match"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                    {match.status === 'live' && (
                      <Link to={`/admin/live/${match.id}`} className="flex-shrink-0 p-2 rounded-none bg-sale/10 text-sale" title="Control">
                        <Radio size={14} />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Fixtures Modal */}
      <Modal open={showGenModal} onClose={() => setShowGenModal(false)} title="Generate Round-Robin Fixtures" size="sm">
        <div className="space-y-4">
          <p className="text-zinc-500 text-sm">Create round-robin matches where every selected team plays every other team once.</p>
          {pools.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">Target Pool</label>
              <select value={genTargetPool} onChange={e => setGenTargetPool(e.target.value)} className="select-field">
                <option value="ALL">All Teams ({teams.length})</option>
                {pools.map(p => (
                  <option key={p} value={p}>Pool {p} ({teams.filter(t => t.pool_name === p).length} teams)</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">Date</label><input type="date" value={genDate} onChange={e => setGenDate(e.target.value)} className="input-field" /></div>
            <div><label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">Default Time</label><input type="time" value={genTime} onChange={e => setGenTime(e.target.value)} className="input-field" /></div>
          </div>
          <div><label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">Default Court</label>
            <select value={genCourt} onChange={e => setGenCourt(e.target.value)} className="select-field">
              {COURT_OPTIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">Round</label>
            <select value={genRound} onChange={e => setGenRound(e.target.value)} className="select-field">
              {ROUND_OPTIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-4 border-t border-hairline">
            <Button variant="secondary" onClick={() => setShowGenModal(false)} className="flex-1" disabled={generating}>Cancel</Button>
            <Button variant="primary" onClick={generateFixtures} loading={generating} className="flex-1">GENERATE</Button>
          </div>
        </div>
      </Modal>

      {/* Add Single Match Modal */}
      <Modal open={showAddMatch} onClose={() => setShowAddMatch(false)} title="Schedule Single Match" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">Team A</label>
              <select value={form.team_a_id} onChange={e => setForm({ ...form, team_a_id: e.target.value })} className="select-field">
                <option value="">Select Team A</option>
                {teams.filter(t => t.id !== form.team_b_id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">Team B</label>
              <select value={form.team_b_id} onChange={e => setForm({ ...form, team_b_id: e.target.value })} className="select-field">
                <option value="">Select Team B</option>
                {teams.filter(t => t.id !== form.team_a_id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">Round</label>
              <select value={form.round} onChange={e => setForm({ ...form, round: e.target.value })} className="select-field">
                {ROUND_OPTIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">Court</label>
              <select value={form.court} onChange={e => setForm({ ...form, court: e.target.value })} className="select-field">
                {COURT_OPTIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">Date (Optional)</label>
              <input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">Time (Optional)</label>
              <input type="time" value={form.scheduled_time} onChange={e => setForm({ ...form, scheduled_time: e.target.value })} className="input-field" />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-hairline">
            <Button variant="secondary" onClick={() => setShowAddMatch(false)} className="flex-1" disabled={generating}>Cancel</Button>
            <Button variant="primary" onClick={handleAddMatch} loading={generating} className="flex-1">CREATE MATCH</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      {matchToDelete && (
        <ConfirmModal
          open={!!matchToDelete}
          onClose={() => setMatchToDelete(null)}
          onConfirm={handleDeleteMatch}
          title="Delete Match?"
          message={`Are you sure you want to delete Match #${matchToDelete?.match_number}?`}
          confirmLabel="DELETE"
          variant="danger"
          loading={generating}
        />
      )}
    </AdminLayout>
  )
}
