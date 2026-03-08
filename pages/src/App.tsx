import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './store/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AcceptInvite from './pages/AcceptInvite'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects/index'
import ProjectCreate from './pages/Projects/Create'
import ProjectDetail from './pages/Projects/Detail'
import Users from './pages/Users'
import Teams from './pages/Teams'
import STWorkload from './pages/STWorkload'
import TeamWorkload from './pages/TeamWorkload'
import Notifications from './pages/Notifications'
import Company from './pages/Company'
import UnifiedPlanning from './pages/UnifiedPlanning'
import Clients from './pages/Clients/index'
import ClientDetail from './pages/Clients/Detail'
import SubDashboard from './pages/Subcontractor/Dashboard'
import SubLots from './pages/Subcontractor/MyLots'
import SubPlanning from './pages/Subcontractor/Planning'
import Platform from './pages/Platform'
import Aide from './pages/Aide'
import Docs from './pages/Docs'

function RequireAuth({ children, role }: { children: React.ReactNode; role?: 'admin' | 'subcontractor' }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Chargement...</div>
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/dashboard' : '/sub'} replace />
  return <>{children}</>
}

export default function App() {
  const { init } = useAuth()
  useEffect(() => { init() }, [init])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/invite" element={<AcceptInvite />} />

        {/* Admin routes */}
        <Route path="/" element={<RequireAuth role="admin"><Layout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/new" element={<ProjectCreate />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="users" element={<Users />} />
          <Route path="users/:id/workload" element={<STWorkload />} />
          <Route path="teams" element={<Teams />} />
          <Route path="teams/:id/workload" element={<TeamWorkload />} />
          <Route path="planning" element={<UnifiedPlanning />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:id" element={<ClientDetail />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="company" element={<Company />} />
          <Route path="platform" element={<Platform />} />
          <Route path="aide" element={<Aide />} />
          <Route path="docs" element={<Docs />} />
        </Route>

        {/* Subcontractor routes */}
        <Route path="/sub" element={<RequireAuth role="subcontractor"><Layout /></RequireAuth>}>
          <Route index element={<SubDashboard />} />
          <Route path="lots" element={<SubLots />} />
          <Route path="planning" element={<SubPlanning />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="aide" element={<Aide />} />
          <Route path="docs" element={<Docs />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
