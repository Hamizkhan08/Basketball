import React, { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, X, CircleDot } from 'lucide-react'
import { useTournament } from '@/hooks/useTournament'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/teams', label: 'Teams' },
  { to: '/matches', label: 'Matches' },
  { to: '/live', label: 'Live', highlight: true },
  { to: '/points-table', label: 'Standings' },
  { to: '/players', label: 'Players' },
  { to: '/best-shooters', label: 'Top Scorers' },
  { to: '/tournament-info', label: 'Info' },
]

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { tournament } = useTournament()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-canvas">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b border-hairline bg-canvas">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 font-bold text-ink">
              <div className="w-8 h-8 bg-ink rounded-none flex items-center justify-center">
                <CircleDot size={18} className="text-canvas" />
              </div>
              <span className="hidden sm:block text-sm font-semibold leading-tight uppercase tracking-wider">
                {tournament?.name || '3x3 Championship'}
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) =>
                    `nav-link text-sm ${isActive ? 'active' : ''} ${link.highlight ? 'text-sale hover:text-sale/80' : ''}`
                  }
                >
                  {link.label === 'Live' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sale live-pulse inline-block mr-1" />
                  )}
                  {link.label}
                </NavLink>
              ))}
            </div>

            {/* Admin link */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin')}
                className="hidden md:block text-xs text-zinc-500 hover:text-ink transition-colors px-3 py-1.5 rounded border border-hairline hover:border-ink"
              >
                Admin
              </button>
              {/* Mobile menu toggle */}
              <button
                className="md:hidden text-ink p-2"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-hairline bg-canvas px-4 py-3 space-y-1">
            {NAV_LINKS.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block py-2.5 px-3 font-medium text-sm border-b border-hairline-soft ${
                    isActive ? 'text-ink font-bold' : 'text-zinc-500 hover:text-ink'
                  } ${link.highlight ? '!text-sale' : ''}`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <NavLink
              to="/admin"
              onClick={() => setMenuOpen(false)}
              className="block py-2.5 px-3 font-medium text-sm text-zinc-500 hover:text-ink"
            >
              Admin Panel
            </NavLink>
          </div>
        )}
      </nav>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-hairline mt-16 py-8 text-center text-zinc-500 text-sm bg-canvas">
        <div className="flex items-center justify-center gap-2 mb-2">
          <CircleDot size={14} className="text-ink" />
          <span className="font-semibold text-ink uppercase tracking-wider">{tournament?.name || '3x3 Basketball Championship'}</span>
        </div>
        {tournament?.college && <p>{tournament.college}</p>}
        <p className="mt-1">FIBA 3x3 Basketball Rules</p>
      </footer>
    </div>
  )
}

