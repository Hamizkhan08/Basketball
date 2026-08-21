import React, { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { PageSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { supabase } from '@/lib/supabase'
import { useTournament } from '@/hooks/useTournament'
import type { Player, Team, PlayerMatchStats } from '@/lib/database.types'
import { getInitials } from '@/lib/utils'
import { POSITION_OPTIONS } from '@/lib/constants'

interface PlayerRow extends Player {
  team: Team
  total_points: number
  matches_played: number
}

interface PlayerForm {
  name: string
  jersey_number: string
  position: string
  team_id: string
}

export default function AdminPlayersPage() {
  const { tournament, loading: tournamentLoading } = useTournament()
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editPlayer, setEditPlayer] = useState<Player | null>(null)
  const [deletePlayer, setDeletePlayer] = useState<Player | null>(null)
  const [form, setForm] = useState<PlayerForm>({ name: '', jersey_number: '', position: '', team_id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchData = async () => {
    if (tournamentLoading) return
    if (!tournament) { setLoading(false); return }
    const { data: teamsData } = await supabase.from('teams').select('*').eq('tournament_id', tournament.id).order('name')
    const ts = (teamsData as Team[]) ?? []
    setTeams(ts)
    if (ts.length === 0) { setLoading(false); return }

    const { data: playersData } = await supabase.from('players').select('*').in('team_id', ts.map(t => t.id)).order('name')
    const ps = (playersData as Player[]) ?? []

    const { data: statsData } = await supabase.from('player_match_stats').select('player_id, total_points')
    const statsAgg: Record<string, { total: number; matches: number }> = {}
    for (const s of (statsData as any[]) ?? []) {
      if (!statsAgg[s.player_id]) statsAgg[s.player_id] = { total: 0, matches: 0 }
      statsAgg[s.player_id].total += s.total_points
      statsAgg[s.player_id].matches += 1
    }

    const tMap = new Map(ts.map(t => [t.id, t]))
    setPlayers(ps.map(p => ({
      ...p,
      team: tMap.get(p.team_id)!,
      total_points: statsAgg[p.id]?.total ?? 0,
      matches_played: statsAgg[p.id]?.matches ?? 0,
    })).filter(p => p.team))
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [tournament, tournamentLoading])

  const openCreate = () => { setEditPlayer(null); setForm({ name: '', jersey_number: '', position: '', team_id: teams[0]?.id ?? '' }); setError(''); setFormOpen(true) }
  const openEdit = (p: PlayerRow) => { setEditPlayer(p); setForm({ name: p.name, jersey_number: String(p.jersey_number), position: p.position, team_id: p.team_id }); setError(''); setFormOpen(true) }

  const handleSave = async () => {
    if (!form.name) { setError('Name is required.'); return }
    if (!form.jersey_number) { setError('Jersey number is required.'); return }
    if (!form.team_id) { setError('Please select a team.'); return }
    setSaving(true); setError('')
    const payload = { team_id: form.team_id, name: form.name, jersey_number: parseInt(form.jersey_number), position: form.position }
    const { error: err } = editPlayer ? await supabase.from('players').update(payload).eq('id', editPlayer.id) : await supabase.from('players').insert(payload)
    if (err) setError(err.message.includes('unique') ? `Jersey #${form.jersey_number} is already taken on that team.` : err.message)
    else { setFormOpen(false); fetchData() }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deletePlayer) return
    await supabase.from('players').delete().eq('id', deletePlayer.id)
    setDeletePlayer(null); fetchData()
  }

  if (loading || tournamentLoading) return <AdminLayout><PageSpinner /></AdminLayout>
  if (!tournament && !tournamentLoading) return <Navigate to="/admin/setup" replace />

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-black text-ink uppercase">Players</h1><p className="text-zinc-500 text-sm">{players.length} players</p></div>
        <Button variant="primary" onClick={openCreate} icon={<Plus size={16} />} disabled={teams.length === 0}>Add Player</Button>
      </div>

      {players.length === 0 ? (
        <EmptyState title="No players yet" description="Add teams first, then add players to them." action={<Button variant="primary" onClick={openCreate} icon={<Plus size={16} />} disabled={teams.length === 0}>Add Player</Button>} />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead><tr>
              <th>Player</th><th>Team</th><th className="text-center">#</th><th>Position</th>
              <th className="text-center">MP</th><th className="text-center">PTS</th><th className="text-right">Actions</th>
            </tr></thead>
            <tbody>
              {players.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-none bg-soft-cloud border border-hairline flex items-center justify-center text-xs font-bold text-ink flex-shrink-0">
                        {p.photo_url ? <img src={p.photo_url} alt={p.name} className="w-8 h-8 rounded-none object-cover" /> : getInitials(p.name)}
                      </div>
                      <span className="font-bold text-ink">{p.name}</span>
                    </div>
                  </td>
                  <td className="text-zinc-500 text-sm font-bold">{p.team?.name}</td>
                  <td className="text-center font-mono font-bold text-ink">{p.jersey_number}</td>
                  <td className="text-zinc-500 text-sm font-bold">{p.position || '—'}</td>
                  <td className="text-center text-zinc-500 font-bold">{p.matches_played}</td>
                  <td className="text-center font-bold text-ink">{p.total_points}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="p-2 hover:bg-soft-cloud border border-transparent hover:border-hairline rounded-none text-zinc-500 hover:text-ink transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => setDeletePlayer(p)} className="p-2 hover:bg-danger/10 border border-transparent hover:border-danger/20 rounded-none text-zinc-500 hover:text-danger transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editPlayer ? 'Edit Player' : 'Add Player'} size="sm"
        footer={<><Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button><Button variant="primary" onClick={handleSave} loading={saving}>Save</Button></>}>
        <div className="space-y-4">
          {error && <p className="text-danger text-sm bg-danger/10 border border-danger p-3">{error}</p>}
          <div><label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">Team *</label>
            <select value={form.team_id} onChange={e => setForm(f => ({ ...f, team_id: e.target.value }))} className="select-field">
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Player name" /></div>
          <div><label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">Jersey # *</label><input type="number" value={form.jersey_number} onChange={e => setForm(f => ({ ...f, jersey_number: e.target.value }))} className="input-field" min={0} max={99} /></div>
          <div><label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">Position</label>
            <select value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} className="select-field">
              <option value="">Select position</option>
              {POSITION_OPTIONS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={!!deletePlayer} onClose={() => setDeletePlayer(null)} onConfirm={handleDelete} title="Delete Player?" message={`Delete "${deletePlayer?.name}"?`} confirmLabel="Delete" />
    </AdminLayout>
  )
}

