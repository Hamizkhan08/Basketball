import React, { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Upload, ChevronDown, ChevronUp, Shield } from 'lucide-react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { PageSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { supabase } from '@/lib/supabase'
import { useTournament } from '@/hooks/useTournament'
import type { Team, Player } from '@/lib/database.types'
import { getInitials } from '@/lib/utils'

interface TeamForm { name: string; short_name: string; college: string; pool_name: string; captain_player_id: string }
const defTeam: TeamForm = { name: '', short_name: '', college: '', pool_name: '', captain_player_id: '' }

interface PlayerForm { name: string; jersey_number: string; position: string }
const defPlayer: PlayerForm = { name: '', jersey_number: '', position: '' }

function TeamCard({ team, players, onEdit, onDelete, onAddPlayer, onEditPlayer, onDeletePlayer, onSetCaptain, onUploadLogo }:
  { team: Team; players: Player[]; onEdit: () => void; onDelete: () => void; onAddPlayer: () => void; onEditPlayer: (p: Player) => void; onDeletePlayer: (p: Player) => void; onSetCaptain: (p: Player) => void; onUploadLogo: (teamId: string, file: File) => void }) {
  const [expanded, setExpanded] = useState(false)
  const captain = players.find(p => p.id === team.captain_player_id)

  return (
    <div className="admin-card">
      <div className="flex items-center gap-4 p-4">
        <div className="relative group">
          <div className="w-12 h-12 rounded-none bg-soft-cloud flex items-center justify-center border border-hairline">
            {team.logo_url
              ? <img src={team.logo_url} alt={team.name} className="w-10 h-10 rounded-none object-contain" />
              : <span className="text-xl font-bold text-ink">{getInitials(team.name)}</span>}
          </div>
          <label className="absolute inset-0 flex items-center justify-center bg-ink/60 rounded-none opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
            <Upload size={12} className="text-canvas" />
            <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && onUploadLogo(team.id, e.target.files[0])} />
          </label>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-ink">{team.name}</h3>
          <p className="text-zinc-500 text-xs flex items-center gap-2">
            <span>{team.college || 'No college'}</span>
            {team.pool_name && <span className="px-1.5 py-0.5 bg-soft-cloud text-ink border border-hairline rounded font-medium">Pool {team.pool_name}</span>}
          </p>
          {captain && <p className="text-ink text-xs flex items-center gap-1 mt-0.5"><Shield size={10} />{captain.name}</p>}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-zinc-500 text-xs">{players.length} players</span>
          <button onClick={onEdit} className="p-1.5 hover:bg-soft-cloud rounded-full text-ink transition-colors ml-2"><Edit2 size={14} /></button>
          <button onClick={onDelete} className="p-1.5 hover:bg-soft-cloud rounded-full text-sale transition-colors"><Trash2 size={14} /></button>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 hover:bg-soft-cloud rounded-full text-ink transition-colors">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-hairline px-4 pb-4 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Roster</p>
            <button onClick={onAddPlayer} className="text-ink hover:text-zinc-500 text-xs font-bold uppercase tracking-widest flex items-center gap-1 transition-colors">
              <Plus size={12} /> Add Player
            </button>
          </div>
          {players.length === 0 ? (
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest text-center py-4">No players yet</p>
          ) : (
            <div className="space-y-1">
              {players.map(p => (
                <div key={p.id} className="flex items-center gap-2 py-1.5 text-sm">
                  <span className="font-mono text-zinc-500 w-6 text-xs font-bold text-center">{p.jersey_number}</span>
                  <span className="text-ink font-bold flex-1">{p.name}</span>
                  {team.captain_player_id === p.id && <Shield size={12} className="text-ink" />}
                  <span className="text-zinc-500 font-bold text-xs">{p.position}</span>
                  <button onClick={() => onSetCaptain(p)} title="Set as captain" className="p-1.5 hover:bg-soft-cloud rounded-none text-zinc-500 hover:text-ink transition-colors"><Shield size={12} /></button>
                  <button onClick={() => onEditPlayer(p)} className="p-1.5 hover:bg-soft-cloud rounded-none text-zinc-500 hover:text-ink transition-colors"><Edit2 size={13} /></button>
                  <button onClick={() => onDeletePlayer(p)} className="p-1.5 hover:bg-danger/10 rounded-none text-zinc-500 hover:text-danger transition-colors"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminTeamsPage() {
  const { tournament, loading: tournamentLoading } = useTournament()
  const [teams, setTeams] = useState<Team[]>([])
  const [playersMap, setPlayersMap] = useState<Record<string, Player[]>>({})
  const [loading, setLoading] = useState(true)

  const [teamFormOpen, setTeamFormOpen] = useState(false)
  const [editTeam, setEditTeam] = useState<Team | null>(null)
  const [deleteTeam, setDeleteTeam] = useState<Team | null>(null)
  const [teamForm, setTeamForm] = useState<TeamForm>(defTeam)
  const [teamSaving, setTeamSaving] = useState(false)
  const [teamError, setTeamError] = useState('')

  const [playerFormOpen, setPlayerFormOpen] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [editPlayer, setEditPlayer] = useState<Player | null>(null)
  const [deletePlayer, setDeletePlayer] = useState<Player | null>(null)
  const [playerForm, setPlayerForm] = useState<PlayerForm>(defPlayer)
  const [playerSaving, setPlayerSaving] = useState(false)
  const [playerError, setPlayerError] = useState('')

  const fetchData = async () => {
    if (tournamentLoading) return
    if (!tournament) { setLoading(false); return }
    const { data: teamsData } = await supabase.from('teams').select('*').eq('tournament_id', tournament.id).order('name')
    const ts = (teamsData as Team[]) ?? []
    setTeams(ts)
    if (ts.length > 0) {
      const { data: playersData } = await supabase.from('players').select('*').in('team_id', ts.map(t => t.id)).order('jersey_number')
      const pm: Record<string, Player[]> = {}
      ts.forEach(t => { pm[t.id] = [] })
      for (const p of (playersData as Player[]) ?? []) {
        if (pm[p.team_id]) pm[p.team_id].push(p)
      }
      setPlayersMap(pm)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [tournament, tournamentLoading])

  // Team CRUD
  const openCreateTeam = () => { setEditTeam(null); setTeamForm(defTeam); setTeamError(''); setTeamFormOpen(true) }
  const openEditTeam = (t: Team) => { setEditTeam(t); setTeamForm({ name: t.name, short_name: t.short_name, college: t.college, pool_name: t.pool_name ?? '', captain_player_id: t.captain_player_id ?? '' }); setTeamError(''); setTeamFormOpen(true) }

  const handleSaveTeam = async () => {
    if (!tournament) { setLoading(false); return }
    if (!teamForm.name) { setTeamError('Team name is required.'); return }
    setTeamSaving(true); setTeamError('')
    const payload = { tournament_id: tournament.id, name: teamForm.name, short_name: teamForm.short_name || teamForm.name.slice(0, 3).toUpperCase(), college: teamForm.college, pool_name: teamForm.pool_name || null, captain_player_id: teamForm.captain_player_id || null }
    const { error } = editTeam ? await supabase.from('teams').update(payload).eq('id', editTeam.id) : await supabase.from('teams').insert(payload)
    if (error) setTeamError(error.message)
    else { setTeamFormOpen(false); fetchData() }
    setTeamSaving(false)
  }

  const handleDeleteTeam = async () => {
    if (!deleteTeam) return
    await supabase.from('teams').delete().eq('id', deleteTeam.id)
    setDeleteTeam(null); fetchData()
  }

  const handleUploadLogo = async (teamId: string, file: File) => {
    const ext = file.name.split('.').pop()
    const path = `teams/${teamId}.${ext}`
    await supabase.storage.from('logos').upload(path, file, { upsert: true })
    const { data } = supabase.storage.from('logos').getPublicUrl(path)
    await supabase.from('teams').update({ logo_url: data.publicUrl }).eq('id', teamId)
    fetchData()
  }

  // Player CRUD
  const openAddPlayer = (teamId: string) => { setSelectedTeamId(teamId); setEditPlayer(null); setPlayerForm(defPlayer); setPlayerError(''); setPlayerFormOpen(true) }
  const openEditPlayer = (teamId: string, p: Player) => { setSelectedTeamId(teamId); setEditPlayer(p); setPlayerForm({ name: p.name, jersey_number: String(p.jersey_number), position: p.position }); setPlayerError(''); setPlayerFormOpen(true) }

  const handleSavePlayer = async () => {
    if (!playerForm.name) { setPlayerError('Player name is required.'); return }
    if (!playerForm.jersey_number) { setPlayerError('Jersey number is required.'); return }
    setPlayerSaving(true); setPlayerError('')
    const payload = { team_id: selectedTeamId, name: playerForm.name, jersey_number: parseInt(playerForm.jersey_number), position: playerForm.position }
    const { error } = editPlayer ? await supabase.from('players').update(payload).eq('id', editPlayer.id) : await supabase.from('players').insert(payload)
    if (error) setPlayerError(error.message.includes('unique') ? `Jersey #${playerForm.jersey_number} is already taken on this team.` : error.message)
    else { setPlayerFormOpen(false); fetchData() }
    setPlayerSaving(false)
  }

  const handleDeletePlayer = async () => {
    if (!deletePlayer) return
    await supabase.from('players').delete().eq('id', deletePlayer.id)
    setDeletePlayer(null); fetchData()
  }

  const handleSetCaptain = async (teamId: string, p: Player) => {
    await supabase.from('teams').update({ captain_player_id: p.id }).eq('id', teamId)
    fetchData()
  }

  if (loading || tournamentLoading) return <AdminLayout><PageSpinner /></AdminLayout>
  if (!tournament && !tournamentLoading) return <Navigate to="/admin/setup" replace />

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-black text-ink uppercase">Teams</h1><p className="text-zinc-500 font-bold text-sm">{teams.length} teams</p></div>
        <Button variant="primary" onClick={openCreateTeam} icon={<Plus size={16} />}>Add Team</Button>
      </div>

      {teams.length === 0 ? (
        <EmptyState title="No teams yet" description="Add your first team to get started." action={<Button variant="primary" onClick={openCreateTeam} icon={<Plus size={16} />}>Add Team</Button>} />
      ) : (
        <div className="space-y-3">
          {teams.map(t => (
            <TeamCard
              key={t.id}
              team={t}
              players={playersMap[t.id] ?? []}
              onEdit={() => openEditTeam(t)}
              onDelete={() => setDeleteTeam(t)}
              onAddPlayer={() => openAddPlayer(t.id)}
              onEditPlayer={p => openEditPlayer(t.id, p)}
              onDeletePlayer={p => setDeletePlayer(p)}
              onSetCaptain={p => handleSetCaptain(t.id, p)}
              onUploadLogo={handleUploadLogo}
            />
          ))}
        </div>
      )}

      {/* Team Form */}
      <Modal open={teamFormOpen} onClose={() => setTeamFormOpen(false)} title={editTeam ? 'Edit Team' : 'Add Team'} size="md"
        footer={<><Button variant="ghost" onClick={() => setTeamFormOpen(false)}>Cancel</Button><Button variant="primary" onClick={handleSaveTeam} loading={teamSaving}>Save</Button></>}>
        <div className="space-y-4">
          {teamError && <p className="text-danger text-sm bg-danger/10 border border-danger px-3 py-2">{teamError}</p>}
          <div><label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">Team Name *</label><input value={teamForm.name} onChange={e => setTeamForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="e.g. Slam Dunkers" /></div>
          <div><label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">Short Name</label><input value={teamForm.short_name} onChange={e => setTeamForm(f => ({ ...f, short_name: e.target.value }))} className="input-field" maxLength={4} placeholder="e.g. SD" /></div>
          <div><label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">College</label><input value={teamForm.college} onChange={e => setTeamForm(f => ({ ...f, college: e.target.value }))} className="input-field" placeholder="e.g. ABC College" /></div>
          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">Pool</label>
            <select value={teamForm.pool_name} onChange={e => setTeamForm(f => ({ ...f, pool_name: e.target.value }))} className="select-field">
              <option value="">None (Normal League)</option>
              <option value="A">Pool A</option>
              <option value="B">Pool B</option>
              <option value="C">Pool C</option>
              <option value="D">Pool D</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Player Form */}
      <Modal open={playerFormOpen} onClose={() => setPlayerFormOpen(false)} title={editPlayer ? 'Edit Player' : 'Add Player'} size="sm"
        footer={<><Button variant="ghost" onClick={() => setPlayerFormOpen(false)}>Cancel</Button><Button variant="primary" onClick={handleSavePlayer} loading={playerSaving}>Save</Button></>}>
        <div className="space-y-4">
          {playerError && <p className="text-danger text-sm bg-danger/10 border border-danger px-3 py-2">{playerError}</p>}
          <div><label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">Player Name *</label><input value={playerForm.name} onChange={e => setPlayerForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="e.g. Rahul Kumar" /></div>
          <div><label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">Jersey Number *</label><input type="number" value={playerForm.jersey_number} onChange={e => setPlayerForm(f => ({ ...f, jersey_number: e.target.value }))} className="input-field" min={0} max={99} /></div>
          <div><label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">Position</label><input value={playerForm.position} onChange={e => setPlayerForm(f => ({ ...f, position: e.target.value }))} className="input-field" placeholder="e.g. Guard" /></div>
        </div>
      </Modal>

      {/* Delete Confirms */}
      <ConfirmModal open={!!deleteTeam} onClose={() => setDeleteTeam(null)} onConfirm={handleDeleteTeam} title="Delete Team?" message={`Delete "${deleteTeam?.name}"? This will also delete all their players and match data.`} confirmLabel="Delete" />
      <ConfirmModal open={!!deletePlayer} onClose={() => setDeletePlayer(null)} onConfirm={handleDeletePlayer} title="Delete Player?" message={`Delete "${deletePlayer?.name}"?`} confirmLabel="Delete" />
    </AdminLayout>
  )
}

