import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, ChevronRight, Plus, Trash2, Users } from 'lucide-react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase'
import { useTournament } from '@/hooks/useTournament'

export default function AdminSetupWizard() {
  const navigate = useNavigate()
  const { tournament, loading: tournamentLoading, refetch } = useTournament()
  
  const [checkingSetup, setCheckingSetup] = useState(true)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (tournamentLoading) return

    const verifySetup = async () => {
      if (tournament) {
        const { count } = await supabase.from('teams').select('*', { count: 'exact', head: true }).eq('tournament_id', tournament.id)
        if (count && count > 0) {
          navigate('/admin/schedule', { replace: true })
        } else {
          setTournamentName(tournament.name || '')
          setVenue(tournament.venue || '')
          setTournamentId(tournament.id)
          setFormat(tournament.tournament_format === 'group_knockout' ? 'pool' : 'league')
          setStep(2)
          setCheckingSetup(false)
        }
      } else {
        setCheckingSetup(false)
      }
    }
    
    verifySetup()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentLoading])

  // Step 1 State
  const [tournamentName, setTournamentName] = useState('')
  const [venue, setVenue] = useState('')
  const [format, setFormat] = useState('league') // 'league' or 'pool'
  const [tournamentId, setTournamentId] = useState<string | null>(null)

  // Step 2 State
  const [teamName, setTeamName] = useState('')
  const [shortName, setShortName] = useState('')
  const [college, setCollege] = useState('')
  const [poolName, setPoolName] = useState('')
  const [players, setPlayers] = useState([{ name: '', jersey: '' }])
  
  const [createdTeams, setCreatedTeams] = useState<{ id: string, name: string, pool: string | null, playersCount: number }[]>([])

  const handleCreateTournament = async () => {
    if (!tournamentName) {
      setError('Tournament Name is required')
      return
    }
    setLoading(true)
    setError('')
    
    let resErr;
    let resData;

    if (tournamentId) {
      const { data, error: err } = await supabase.from('tournaments').update({
        name: tournamentName,
        venue: venue,
        tournament_format: format === 'pool' ? 'group_knockout' : 'league'
      }).eq('id', tournamentId).select().single()
      resErr = err; resData = data;
    } else {
      const { data, error: err } = await supabase.from('tournaments').insert({
        name: tournamentName,
        venue: venue,
        status: 'active',
        tournament_format: format === 'pool' ? 'group_knockout' : 'league'
      }).select().single()
      resErr = err; resData = data;
    }

    setLoading(false)
    if (resErr) {
      setError(resErr.message)
    } else {
      setTournamentId(resData.id)
      setStep(2)
    }
  }

  const addPlayerRow = () => {
    if (players.length >= 4) return // Max 4 players for 3x3
    setPlayers([...players, { name: '', jersey: '' }])
  }

  const removePlayerRow = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index))
  }

  const updatePlayer = (index: number, field: 'name' | 'jersey', value: string) => {
    const newPlayers = [...players]
    newPlayers[index][field] = value
    setPlayers(newPlayers)
  }

  const handleSaveTeam = async () => {
    if (!tournamentId) return
    if (!teamName) {
      setError('Team name is required')
      return
    }
    
    setLoading(true)
    setError('')

    // Insert Team
    const { data: teamData, error: teamErr } = await supabase.from('teams').insert({
      tournament_id: tournamentId,
      name: teamName,
      short_name: shortName || teamName.slice(0, 3).toUpperCase(),
      college: college,
      pool_name: format === 'pool' ? poolName || null : null
    }).select().single()

    if (teamErr) {
      setError(teamErr.message)
      setLoading(false)
      return
    }

    // Insert Players
    const validPlayers = players.filter(p => p.name.trim() !== '')
    if (validPlayers.length > 0) {
      const { error: playersErr } = await supabase.from('players').insert(
        validPlayers.map((p, i) => ({
          team_id: teamData.id,
          name: p.name,
          jersey_number: p.jersey.trim() ? parseInt(p.jersey) : (990 + i), // Default to 990+ to avoid UNIQUE constraint crash
          position: 'Player'
        }))
      )
      
      if (playersErr) {
        setError('Team saved, but players failed: ' + playersErr.message)
      }
    }

    setCreatedTeams([...createdTeams, { 
      id: teamData.id, 
      name: teamData.name, 
      pool: format === 'pool' ? poolName : null,
      playersCount: validPlayers.length
    }])

    // Reset team form
    setTeamName('')
    setShortName('')
    setCollege('')
    setPoolName('')
    setPlayers([{ name: '', jersey: '' }])
    setLoading(false)
  }

  const handleFinish = async () => {
    await refetch()
    navigate('/admin/schedule', { replace: true })
  }

  if (checkingSetup || tournamentLoading) return <AdminLayout><PageSpinner /></AdminLayout>

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-ink uppercase mb-2">Tournament Setup Wizard</h1>
          <p className="text-zinc-500 text-sm font-bold">Configure your tournament and add your teams</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step === 1 ? 'text-ink' : 'text-success'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === 1 ? 'bg-ink text-canvas' : 'bg-success/10 text-success'}`}>
              {step > 1 ? <CheckCircle size={16} /> : '1'}
            </div>
            <span className="font-bold text-sm uppercase tracking-wider">Tournament Info</span>
          </div>
          <div className="h-px bg-hairline flex-1 mx-2" />
          <div className={`flex items-center gap-2 ${step === 2 ? 'text-ink' : 'text-zinc-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === 2 ? 'bg-ink text-canvas' : 'bg-soft-cloud text-zinc-400 border border-hairline'}`}>
              2
            </div>
            <span className="font-bold text-sm uppercase tracking-wider">Teams & Players</span>
          </div>
        </div>

        {error && (
          <div className="bg-sale/10 border border-sale/30 p-4 mb-6">
            <p className="text-sale text-sm font-bold">{error}</p>
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div className="admin-card p-6 animate-fade-in">
            <h2 className="text-lg font-black text-ink uppercase mb-6 border-b border-hairline pb-4">Basic Settings</h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">Tournament Name *</label>
                <input 
                  value={tournamentName} 
                  onChange={e => setTournamentName(e.target.value)} 
                  className="input-field" 
                  placeholder="e.g. GBL 3x3 Championship" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">Venue Location</label>
                <input 
                  value={venue} 
                  onChange={e => setVenue(e.target.value)} 
                  className="input-field" 
                  placeholder="e.g. GCOERC Basketball Court, Nashik" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">Tournament Format *</label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setFormat('league')}
                    className={`p-4 border text-left transition-all ${format === 'league' ? 'border-ink bg-soft-cloud' : 'border-hairline bg-canvas hover:border-ink/50'}`}
                  >
                    <p className="font-black text-ink mb-1 uppercase">Normal League</p>
                    <p className="text-xs font-medium text-zinc-500">All teams are grouped together in a single standings table.</p>
                  </button>
                  <button 
                    onClick={() => setFormat('pool')}
                    className={`p-4 border text-left transition-all ${format === 'pool' ? 'border-ink bg-soft-cloud' : 'border-hairline bg-canvas hover:border-ink/50'}`}
                  >
                    <p className="font-black text-ink mb-1 uppercase">Pool Play</p>
                    <p className="text-xs font-medium text-zinc-500">Teams are divided into Pools (A, B, C) before knockouts.</p>
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t border-hairline flex justify-end">
                <Button variant="primary" onClick={handleCreateTournament} loading={loading} icon={<ChevronRight size={16} />}>
                  Next Step
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="grid lg:grid-cols-3 gap-6 animate-fade-in">
            
            {/* Form Column */}
            <div className="lg:col-span-2">
              <div className="admin-card p-6">
                <div className="flex items-center justify-between border-b border-hairline pb-4 mb-6">
                  <h2 className="text-lg font-black text-ink uppercase flex items-center gap-2">
                    <button onClick={() => setStep(1)} className="p-1 hover:bg-soft-cloud rounded-md transition-colors text-zinc-500 hover:text-ink">
                      <ChevronRight size={18} className="rotate-180" />
                    </button>
                    Add a Team
                  </h2>
                  <span className="text-xs text-zinc-500">{createdTeams.length} teams added</span>
                </div>
                
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">Team Name *</label>
                      <input value={teamName} onChange={e => setTeamName(e.target.value)} className="input-field" placeholder="e.g. Red Panthers" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">Short Name</label>
                      <input value={shortName} onChange={e => setShortName(e.target.value)} className="input-field" maxLength={4} placeholder="e.g. RED" />
                    </div>
                  </div>

                  {format === 'pool' && (
                    <div>
                      <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">Assign to Pool</label>
                      <select value={poolName} onChange={e => setPoolName(e.target.value)} className="select-field">
                        <option value="">Select Pool...</option>
                        <option value="A">Pool A</option>
                        <option value="B">Pool B</option>
                        <option value="C">Pool C</option>
                        <option value="D">Pool D</option>
                      </select>
                    </div>
                  )}

                  <div className="pt-6 mt-6 border-t border-hairline">
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-xs font-bold text-ink uppercase tracking-wider">Players Roster</label>
                      <span className="text-xs text-zinc-500 font-bold">{players.length}/4</span>
                    </div>

                    <div className="space-y-3">
                      {players.map((p, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input 
                            value={p.jersey} 
                            onChange={e => updatePlayer(index, 'jersey', e.target.value)} 
                            className="input-field w-16 text-center font-mono" 
                            placeholder="#" 
                          />
                          <input 
                            value={p.name} 
                            onChange={e => updatePlayer(index, 'name', e.target.value)} 
                            className="input-field flex-1" 
                            placeholder="Player Name" 
                          />
                          {players.length > 1 && (
                            <button onClick={() => removePlayerRow(index)} className="p-2 text-zinc-400 hover:text-sale transition-colors">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {players.length < 4 && (
                      <button onClick={addPlayerRow} className="mt-3 text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1 hover:text-zinc-600 transition-colors">
                        <Plus size={14} /> Add Another Player
                      </button>
                    )}
                  </div>

                  <div className="pt-6 border-t border-hairline">
                    <Button variant="secondary" onClick={handleSaveTeam} loading={loading} icon={<Plus size={16} />} className="w-full">
                      Save Team & Roster
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* List Column */}
            <div className="lg:col-span-1">
              <div className="bg-soft-cloud border border-hairline p-4 min-h-[400px]">
                <h3 className="font-bold text-ink uppercase text-xs tracking-wider mb-4 border-b border-hairline pb-2 flex items-center justify-between">
                  <span>Created Teams</span>
                  <Users size={14} />
                </h3>

                {createdTeams.length === 0 ? (
                  <div className="text-center py-10 opacity-50">
                    <p className="text-sm font-bold text-ink">No teams added yet</p>
                    <p className="text-xs font-medium text-zinc-500 mt-1">Use the form to add teams.</p>
                  </div>
                ) : (
                  <div className="space-y-2 mb-6">
                    {createdTeams.map(t => (
                      <div key={t.id} className="bg-canvas border border-hairline p-3 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink text-sm">{t.name}</span>
                          {t.pool && <span className="text-[10px] font-bold bg-ink text-canvas px-1.5 py-0.5 uppercase tracking-wider">Pool {t.pool}</span>}
                        </div>
                        <span className="text-xs text-zinc-500 font-bold">{t.playersCount} Players</span>
                      </div>
                    ))}
                  </div>
                )}

                {createdTeams.length > 0 && (
                  <Button variant="success" onClick={handleFinish} className="w-full" icon={<CheckCircle size={16} />}>
                    Finish Setup
                  </Button>
                )}
              </div>
            </div>
            
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
