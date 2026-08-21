import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Swords, Radio, Users, User, Trophy, Star,
  Calendar, Settings, LogOut, CircleDot, Menu, X, ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTournament } from '@/hooks/useTournament'

const SIDEBAR_LINKS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/matches', label: 'Matches', icon: Swords },
  { to: '/admin/live', label: 'Live Scoring', icon: Radio, highlight: true },
  { to: '/admin/teams', label: 'Teams', icon: Users },
  { to: '/admin/players', label: 'Players', icon: User },
  { to: '/admin/points-table', label: 'Points Table', icon: Trophy },
  { to: '/admin/best-shooters', label: 'Best Shooters', icon: Star },
  { to: '/admin/schedule', label: 'Schedule', icon: Calendar },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { signOut, user } = useAuth()
  const { tournament } = useTournament()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-hairline flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-ink rounded-none flex items-center justify-center">
            <CircleDot size={16} className="text-canvas" />
          </div>
          <div>
            <p className="text-xs font-bold text-ink leading-none uppercase">Admin Panel</p>
            <p className="text-xs text-zinc-500 mt-0.5 leading-none truncate max-w-[120px] uppercase">
              {tournament?.name || '3x3 Championship'}
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-ink p-1">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {SIDEBAR_LINKS.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''} ${link.highlight ? 'text-red-400 hover:text-red-300' : ''}`
            }
          >
            <link.icon size={16} />
            <span>{link.label}</span>
            {link.highlight && (
              <span className="w-1.5 h-1.5 rounded-full bg-sale live-pulse ml-auto" />
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-hairline">
        <NavLink
          to="/"
          className="sidebar-link mb-1"
          onClick={onClose}
        >
          <ChevronRight size={16} />
          Public Site
        </NavLink>
        <div className="flex items-center gap-2 px-3 py-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-soft-cloud border border-hairline flex items-center justify-center text-xs font-bold text-ink">
            {user?.email?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <span className="text-xs text-zinc-500 truncate flex-1">{user?.email}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="sidebar-link w-full text-left text-sale hover:text-sale/80 hover:bg-soft-cloud"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  )
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-56 flex-col border-r border-hairline bg-canvas flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-56 bg-canvas border-r border-hairline flex flex-col">
            <SidebarContent onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-hairline bg-canvas">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-ink p-1"
          >
            <Menu size={20} />
          </button>
          <span className="text-ink font-semibold text-sm uppercase">Admin Panel</span>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

