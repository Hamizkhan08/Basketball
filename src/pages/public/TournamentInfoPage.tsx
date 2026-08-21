import React from 'react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { useTournament } from '@/hooks/useTournament'
import { Calendar, MapPin, Trophy, Clock, Target, Award } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { FORMAT_OPTIONS } from '@/lib/constants'

export default function TournamentInfoPage() {
  const { tournament } = useTournament()

  if (!tournament) {
    return (
      <PublicLayout>
        <div className="text-center py-20 text-zinc-400">
          No tournament configured yet. Check back later!
        </div>
      </PublicLayout>
    )
  }

  const format = FORMAT_OPTIONS.find(f => f.value === tournament.tournament_format)?.label || tournament.tournament_format

  const rules = [
    { icon: Clock, label: 'Match Duration', value: `${Math.floor(tournament.match_duration_seconds / 60)} minutes` },
    { icon: Award, label: 'Winning Score', value: `${tournament.winning_score} points` },
    { icon: Trophy, label: 'Inside Arc', value: `${tournament.inside_arc_points} point(s)` },
    { icon: Trophy, label: 'Outside Arc', value: `${tournament.outside_arc_points} point(s)` },
    { icon: Trophy, label: 'Free Throw', value: `${tournament.free_throw_points} point(s)` },
    { icon: Trophy, label: 'Overtime Target', value: `${tournament.overtime_target} point(s)` },
    { icon: Trophy, label: 'Win Points', value: `${tournament.win_points} pts` },
    { icon: Trophy, label: 'Draw Points', value: `${tournament.draw_points} pts` },
    { icon: Trophy, label: 'Loss Points', value: `${tournament.loss_points} pts` },
  ]

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="page-title mb-8">Tournament Info</h1>

        {/* Main Card */}
        <div className="admin-card p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {tournament.logo_url && (
              <img src={tournament.logo_url} alt="Logo" className="w-24 h-24 rounded-2xl object-contain bg-zinc-800 p-2" />
            )}
            <div>
              <h2 className="text-3xl font-black text-ink mb-2">{tournament.name}</h2>
              <div className="space-y-2 text-zinc-500 text-sm">
                {tournament.college && (
                  <p className="flex items-center gap-2"><Trophy size={14} className="text-ink" />{tournament.college}</p>
                )}
                {tournament.venue && (
                  <p className="flex items-center gap-2"><MapPin size={14} className="text-ink" />{tournament.venue}</p>
                )}
                {tournament.tournament_date && (
                  <p className="flex items-center gap-2"><Calendar size={14} className="text-ink" />{formatDate(tournament.tournament_date)}</p>
                )}
                <p className="flex items-center gap-2"><Award size={14} className="text-ink" />{format} format</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rules */}
        <h2 className="text-xl font-bold text-ink mb-4">FIBA 3x3 Rules (Configured)</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {rules.map(({ icon: Icon, label, value }) => (
            <div key={label} className="admin-card flex items-center gap-4 py-4 px-6">
              <div className="w-10 h-10 rounded-full bg-soft-cloud flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-ink" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs">{label}</p>
                <p className="font-bold text-ink">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  )
}
