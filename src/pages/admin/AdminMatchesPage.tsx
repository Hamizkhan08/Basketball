import React, { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Radio, Play } from 'lucide-react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { PageSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { supabase } from '@/lib/supabase'
import { useTournament } from '@/hooks/useTournament'
import type { Match, Team } from '@/lib/database.types'
import { formatDate, formatMatchTime } from '@/lib/utils'
import { ROUND_OPTIONS, COURT_OPTIONS, MATCH_STATUS_LABELS } from '@/lib/constants'

interface MatchForm {
  match_number: string
  team_a_id: string
  team_b_id: string
  scheduled_date: string
  scheduled_time: string
  court: string
  round: string
}

const defaultForm: MatchForm = {
  match_number: '',
  team_a_id: '',
  team_b_id: '',
  scheduled_date: '',
  scheduled_time: '',
  court: 'Court 1',
  round: 'League',
}

export default function AdminMatchesPage() {
  const { tournament, loading: tournamentLoading } = useTournament()
  const [matches, setMatches] = useState<Array<{ match: Match; teamA: Team; teamB: Team }>>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editMatch, setEditMatch] = useState<Match | null>(null)
  const [deleteMatch, setDeleteMatch] = useState<Match | null>(null)
  const [form, setForm] = useState<MatchForm>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

  const openCreate = () => {
    setEditMatch(null)
    // Auto increment match number
    const maxNum = matches.reduce((m, x) => Math.max(m, x.match.match_number), 0)
    setForm({ ...defaultForm, match_number: String(maxNum + 1) })
    setError('')
    setFormOpen(true)
  }

  const openEdit = (match: Match) => {
    setEditMatch(match)
    setForm({
      match_number: String(match.match_number),
      team_a_id: match.team_a_id,
      team_b_id: match.team_b_id,
      scheduled_date: match.scheduled_date ?? '',
      scheduled_time: match.scheduled_time ?? '',
      court: match.court,
      round: match.round,
    })
    setError('')
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!tournament) { setLoading(false); return }
    if (form.team_a_id === form.team_b_id) { setError("Team A and Team B cannot be the same."); return }
    if (!form.team_a_id || !form.team_b_id) { setError("Please select both teams."); return }

    setSaving(true)
    setError('')

    const payload = {
      tournament_id: tournament.id,
      match_number: parseInt(form.match_number) || 1,
      team_a_id: form.team_a_id,
      team_b_id: form.team_b_id,
      scheduled_date: form.scheduled_date || null,
      scheduled_time: form.scheduled_time || null,
      court: form.court,
      round: form.round,
      game_clock_seconds: tournament.match_duration_seconds,
      shot_clock_seconds: tournament.shot_clock_seconds,
    }

    const { error: err } = editMatch
      ? await supabase.from('matches').update(payload).eq('id', editMatch.id)
      : await supabase.from('matches').insert(payload)

    if (err) setError(err.message)
    else { setFormOpen(false); fetchData() }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteMatch) return
    await supabase.from('matches').delete().eq('id', deleteMatch.id)
    setDeleteMatch(null)
    fetchData()
  }

  if (loading || tournamentLoading) return <AdminLayout><PageSpinner /></AdminLayout>
  if (!tournament && !tournamentLoading) return <Navigate to="/admin/setup" replace />

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="heading-xl text-ink uppercase font-display">Matches</h1>
          <p className="text-zinc-500 text-sm">{matches.length} matches</p>
        </div>
        <Button variant="primary" onClick={openCreate} icon={<Plus size={16} />} disabled={teams.length < 2}>
          New Match
        </Button>
      </div>

      {teams.length < 2 && (
        <div className="bg-soft-cloud border border-hairline rounded-none p-4 mb-6 text-ink text-sm flex items-center gap-2">
          <Plus size={14} /> Add at least 2 teams before creating matches.
        </div>
      )}

      {matches.length === 0 ? (
        <EmptyState
          title="No matches scheduled"
          description="Create your first match to get started."
          action={<Button variant="primary" onClick={openCreate} icon={<Plus size={16} />} disabled={teams.length < 2}>Create Match</Button>}
        />
      ) : (
        <div className="space-y-2">
          {matches.map(({ match, teamA, teamB }) => (
            <div key={match.id} className={`admin-card flex items-center gap-4 py-3 px-4 ${match.status === 'live' ? 'border-sale' : ''}`}>
              <span className="text-zinc-500 font-mono text-xs w-8">#{match.match_number}</span>
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <span className="font-semibold text-ink text-sm truncate">{teamA.name}</span>
                {match.status === 'completed' || match.status === 'live' ? (
                  <span className="font-mono font-black text-ink text-sm flex-shrink-0">{match.team_a_score}—{match.team_b_score}</span>
                ) : (
                  <span className="text-zinc-500 text-xs flex-shrink-0">vs</span>
                )}
                <span className="font-semibold text-ink text-sm truncate">{teamB.name}</span>
              </div>
              <div className="hidden sm:block text-right text-xs text-zinc-500 flex-shrink-0">
                <p className="font-semibold text-ink">{formatMatchTime(match.scheduled_time)}</p>
                <p>{formatDate(match.scheduled_date)} · {match.court} · <span className="font-medium text-ink">{match.round}</span></p>
              </div>
              <Badge variant={match.status}>{MATCH_STATUS_LABELS[match.status]}</Badge>
              <div className="flex items-center gap-1 flex-shrink-0">
                {match.status === 'scheduled' && (
                  <Link to={`/admin/live/${match.id}`} className="p-2 rounded-full bg-soft-cloud hover:bg-hairline text-success transition-colors" title="Start Match">
                    <Play size={14} />
                  </Link>
                )}
                {match.status === 'live' && (
                  <Link to={`/admin/live/${match.id}`} className="p-2 rounded-full bg-soft-cloud hover:bg-hairline text-sale transition-colors" title="Control Live Match">
                    <Radio size={14} />
                  </Link>
                )}
                {match.status !== 'completed' && (
                  <button onClick={() => openEdit(match)} className="p-2 rounded-full hover:bg-soft-cloud text-ink transition-colors">
                    <Edit2 size={14} />
                  </button>
                )}
                {match.status === 'scheduled' && (
                  <button onClick={() => setDeleteMatch(match)} className="p-2 rounded-full hover:bg-soft-cloud text-sale transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editMatch ? 'Edit Match' : 'New Match'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>Save Match</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <p className="text-sale text-sm bg-soft-cloud border border-hairline rounded-none px-4 py-3">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Match #</label>
              <input type="number" value={form.match_number} onChange={e => setForm(f => ({ ...f, match_number: e.target.value }))} className="input-field" min={1} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Round</label>
              <select value={form.round} onChange={e => setForm(f => ({ ...f, round: e.target.value }))} className="select-field">
                {ROUND_OPTIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Team A</label>
            <select value={form.team_a_id} onChange={e => setForm(f => ({ ...f, team_a_id: e.target.value }))} className="select-field">
              <option value="">Select Team A</option>
              {teams.filter(t => t.id !== form.team_b_id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Team B</label>
            <select value={form.team_b_id} onChange={e => setForm(f => ({ ...f, team_b_id: e.target.value }))} className="select-field">
              <option value="">Select Team B</option>
              {teams.filter(t => t.id !== form.team_a_id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Date</label>
              <input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Time</label>
              <input type="time" value={form.scheduled_time} onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Court</label>
            <select value={form.court} onChange={e => setForm(f => ({ ...f, court: e.target.value }))} className="select-field">
              {COURT_OPTIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteMatch}
        onClose={() => setDeleteMatch(null)}
        onConfirm={handleDelete}
        title="Delete Match?"
        message={`Delete Match #${deleteMatch?.match_number}? This action cannot be undone.`}
        confirmLabel="Delete"
      />
    </AdminLayout>
  )
}

