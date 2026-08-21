import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PageSpinner } from '@/components/ui/Spinner'
import { ProtectedRoute } from '@/router/ProtectedRoute'

// Public pages
const HomePage = lazy(() => import('@/pages/public/HomePage'))
const TeamsPage = lazy(() => import('@/pages/public/TeamsPage'))
const TeamDetailPage = lazy(() => import('@/pages/public/TeamDetailPage'))
const PlayersPage = lazy(() => import('@/pages/public/PlayersPage'))
const MatchesPage = lazy(() => import('@/pages/public/MatchesPage'))
const LivePage = lazy(() => import('@/pages/public/LivePage'))
const PointsTablePage = lazy(() => import('@/pages/public/PointsTablePage'))
const BestShootersPage = lazy(() => import('@/pages/public/BestShootersPage'))
const TournamentInfoPage = lazy(() => import('@/pages/public/TournamentInfoPage'))

// Admin pages
const LoginPage = lazy(() => import('@/pages/admin/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'))
const AdminMatchesPage = lazy(() => import('@/pages/admin/AdminMatchesPage'))
const LiveScoringPage = lazy(() => import('@/pages/admin/LiveScoringPage'))
const AdminTeamsPage = lazy(() => import('@/pages/admin/AdminTeamsPage'))
const AdminPlayersPage = lazy(() => import('@/pages/admin/AdminPlayersPage'))
const AdminPointsTablePage = lazy(() => import('@/pages/admin/AdminPointsTablePage'))
const AdminBestShootersPage = lazy(() => import('@/pages/admin/AdminBestShootersPage'))
const AdminSchedulePage = lazy(() => import('@/pages/admin/AdminSchedulePage'))
const TournamentSettingsPage = lazy(() => import('@/pages/admin/TournamentSettingsPage'))
const AdminSetupWizard = lazy(() => import('@/pages/admin/AdminSetupWizard'))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><PageSpinner /></div>}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/teams/:id" element={<TeamDetailPage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/live" element={<LivePage />} />
          <Route path="/points-table" element={<PointsTablePage />} />
          <Route path="/best-shooters" element={<BestShootersPage />} />
          <Route path="/tournament-info" element={<TournamentInfoPage />} />

          {/* Admin Auth */}
          <Route path="/admin/login" element={<LoginPage />} />

          {/* Protected Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/admin/matches" element={<ProtectedRoute><AdminMatchesPage /></ProtectedRoute>} />
          <Route path="/admin/live" element={<ProtectedRoute><AdminMatchesPage /></ProtectedRoute>} />
          <Route path="/admin/live/:id" element={<ProtectedRoute><LiveScoringPage /></ProtectedRoute>} />
          <Route path="/admin/teams" element={<ProtectedRoute><AdminTeamsPage /></ProtectedRoute>} />
          <Route path="/admin/players" element={<ProtectedRoute><AdminPlayersPage /></ProtectedRoute>} />
          <Route path="/admin/points-table" element={<ProtectedRoute><AdminPointsTablePage /></ProtectedRoute>} />
          <Route path="/admin/best-shooters" element={<ProtectedRoute><AdminBestShootersPage /></ProtectedRoute>} />
          <Route path="/admin/schedule" element={<ProtectedRoute><AdminSchedulePage /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute><TournamentSettingsPage /></ProtectedRoute>} />
          <Route path="/admin/setup" element={<ProtectedRoute><AdminSetupWizard /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
