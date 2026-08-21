import React, { useEffect, useState } from 'react'
import { Save, Upload } from 'lucide-react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase'
import { useTournament } from '@/hooks/useTournament'
import type { Tournament } from '@/lib/database.types'
import { FORMAT_OPTIONS } from '@/lib/constants'

type TournamentForm = Omit<Tournament, 'id' | 'created_at' | 'updated_at'>

export default function TournamentSettingsPage() {
  const { tournament, loading: tournamentLoading, refetch } = useTournament()
  const [form, setForm] = useState<Partial<TournamentForm>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)

  useEffect(() => {
    if (tournament) {
      setForm({
        name: tournament.name,
        college: tournament.college,
        venue: tournament.venue,
        tournament_date: tournament.tournament_date ?? '',
        logo_url: tournament.logo_url ?? '',
        status: tournament.status,
        match_duration_seconds: tournament.match_duration_seconds,
        shot_clock_seconds: tournament.shot_clock_seconds,
        winning_score: tournament.winning_score,
        inside_arc_points: tournament.inside_arc_points,
        outside_arc_points: tournament.outside_arc_points,
        free_throw_points: tournament.free_throw_points,
        win_points: tournament.win_points,
        draw_points: tournament.draw_points,
        loss_points: tournament.loss_points,
        overtime_target: tournament.overtime_target,
        tournament_format: tournament.tournament_format,
      })
      setLoading(false)
    }
  }, [tournament])

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess(false)
    if (!form.name) { setError('Tournament name is required.'); setSaving(false); return }

    let logoUrl = form.logo_url

    // Upload logo if selected
    if (logoFile) {
      const ext = logoFile.name.split('.').pop()
      const path = `tournament/logo.${ext}`
      await supabase.storage.from('logos').upload(path, logoFile, { upsert: true })
      const { data } = supabase.storage.from('logos').getPublicUrl(path)
      logoUrl = data.publicUrl
    }

    const payload = { ...form, logo_url: logoUrl, tournament_date: form.tournament_date || null }

    if (tournament) {
      const { error: err } = await supabase.from('tournaments').update(payload).eq('id', tournament.id)
      if (err) setError(err.message)
      else { setSuccess(true); refetch() }
    } else {
      const { error: err } = await supabase.from('tournaments').insert(payload)
      if (err) setError(err.message)
      else { setSuccess(true); refetch() }
    }
    setSaving(false)
  }

  const set = (key: keyof TournamentForm, val: any) => setForm(f => ({ ...f, [key]: val }))

  if (loading || tournamentLoading) return <AdminLayout><PageSpinner /></AdminLayout>

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Tournament Settings</h1>
        <p className="text-zinc-400 text-sm">Configure your tournament details and game rules</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {error && <div className="bg-red-900/20 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>}
        {success && <div className="bg-emerald-900/20 border border-emerald-800 rounded-xl px-4 py-3 text-emerald-400 text-sm">Settings saved successfully!</div>}

        {/* Basic Info */}
        <section className="admin-card p-6 space-y-4">
          <h2 className="font-bold text-white text-base border-b border-zinc-800 pb-2">Tournament Info</h2>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Tournament Name *</label>
            <input value={form.name ?? ''} onChange={e => set('name', e.target.value)} className="input-field" placeholder="e.g. College 3x3 Basketball Championship 2025" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">College / Organization</label>
              <input value={form.college ?? ''} onChange={e => set('college', e.target.value)} className="input-field" placeholder="e.g. ABC College" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Venue</label>
              <input value={form.venue ?? ''} onChange={e => set('venue', e.target.value)} className="input-field" placeholder="e.g. Main Sports Complex" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Date</label>
              <input type="date" value={form.tournament_date ?? ''} onChange={e => set('tournament_date', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Format</label>
              <select value={form.tournament_format ?? 'round_robin'} onChange={e => set('tournament_format', e.target.value)} className="select-field">
                {FORMAT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Status</label>
            <select value={form.status ?? 'upcoming'} onChange={e => set('status', e.target.value as any)} className="select-field">
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Logo</label>
            <div className="flex items-center gap-3">
              {(form.logo_url || logoFile) && (
                <img
                  src={logoFile ? URL.createObjectURL(logoFile) : form.logo_url!}
                  alt="Logo preview"
                  className="w-16 h-16 rounded-xl object-contain bg-zinc-800 border border-zinc-700 p-1"
                />
              )}
              <label className="btn-secondary cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold">
                <Upload size={14} /> Upload Logo
                <input type="file" accept="image/*" className="hidden" onChange={e => setLogoFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          </div>
        </section>

        {/* Game Rules */}
        <section className="admin-card p-6 space-y-4">
          <h2 className="font-bold text-white text-base border-b border-zinc-800 pb-2">FIBA 3x3 Game Rules</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Match Duration (seconds)</label>
              <input type="number" value={form.match_duration_seconds ?? 600} onChange={e => set('match_duration_seconds', parseInt(e.target.value))} className="input-field" min={60} max={3600} />
              <p className="text-zinc-600 text-xs mt-1">{Math.floor((form.match_duration_seconds ?? 600) / 60)} minutes</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Shot Clock (seconds)</label>
              <input type="number" value={form.shot_clock_seconds ?? 12} onChange={e => set('shot_clock_seconds', parseInt(e.target.value))} className="input-field" min={5} max={30} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Winning Score</label>
              <input type="number" value={form.winning_score ?? 21} onChange={e => set('winning_score', parseInt(e.target.value))} className="input-field" min={1} max={100} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Overtime Target (points)</label>
              <input type="number" value={form.overtime_target ?? 2} onChange={e => set('overtime_target', parseInt(e.target.value))} className="input-field" min={1} max={10} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Inside Arc (pts)</label>
              <input type="number" value={form.inside_arc_points ?? 1} onChange={e => set('inside_arc_points', parseInt(e.target.value))} className="input-field" min={1} max={5} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Outside Arc (pts)</label>
              <input type="number" value={form.outside_arc_points ?? 2} onChange={e => set('outside_arc_points', parseInt(e.target.value))} className="input-field" min={1} max={5} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Free Throw (pts)</label>
              <input type="number" value={form.free_throw_points ?? 1} onChange={e => set('free_throw_points', parseInt(e.target.value))} className="input-field" min={1} max={5} />
            </div>
          </div>
        </section>

        {/* Points System */}
        <section className="admin-card p-6 space-y-4">
          <h2 className="font-bold text-white text-base border-b border-zinc-800 pb-2">Points Table Rules</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Win Points</label>
              <input type="number" value={form.win_points ?? 2} onChange={e => set('win_points', parseInt(e.target.value))} className="input-field" min={0} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Draw Points</label>
              <input type="number" value={form.draw_points ?? 1} onChange={e => set('draw_points', parseInt(e.target.value))} className="input-field" min={0} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Loss Points</label>
              <input type="number" value={form.loss_points ?? 0} onChange={e => set('loss_points', parseInt(e.target.value))} className="input-field" min={0} />
            </div>
          </div>
        </section>

        <Button variant="primary" onClick={handleSave} loading={saving} icon={<Save size={16} />} size="lg" className="w-full">
          Save Settings
        </Button>
      </div>
    </AdminLayout>
  )
}
