import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useI18n, useT } from '../i18n'
import { api } from '../api/client'

const IconHouse = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
const IconFolder = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
const IconUsers = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
const IconBell = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
const IconTeam = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
const IconList = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
const IconCalendar = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
const IconMenu = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
const IconX = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
const IconBuilding = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
const IconPeople = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>

// Détection super-admin PlanningIA (company_id IS NULL)
function isSuperAdmin(user: any): boolean {
  return user?.role === 'admin' && user?.access_level === 'admin' && !user?.company_id
}

const IconPlatform = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const t = useT()
  const { lang, setLang } = useI18n()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    api.notifications.unreadCount().then(d => setUnread(d.count)).catch(() => {})
    const iv = setInterval(() => {
      api.notifications.unreadCount().then(d => setUnread(d.count)).catch(() => {})
    }, 30000)
    return () => clearInterval(iv)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const isAdmin = user?.role === 'admin'
  const basePath = isAdmin ? '' : '/sub'

  const adminLinks = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: <IconHouse /> },
    { to: '/projects', label: t('nav.projects'), icon: <IconFolder /> },
    { to: '/clients', label: t('nav.clients'), icon: <IconPeople /> },
    { to: '/planning', label: t('nav.unified_planning'), icon: <IconCalendar /> },
    { to: '/users', label: t('nav.users'), icon: <IconUsers /> },
    { to: '/teams', label: t('nav.teams'), icon: <IconTeam /> },
    { to: '/company', label: t('nav.company'), icon: <IconBuilding /> },
  ]
  const subLinks = [
    { to: '/sub', label: t('nav.dashboard'), icon: <IconHouse />, end: true },
    { to: '/sub/lots', label: t('nav.my_lots'), icon: <IconList /> },
    { to: '/sub/planning', label: t('nav.planning'), icon: <IconCalendar /> },
  ]
  const links = isAdmin ? adminLinks : subLinks

  const notifPath = isAdmin ? '/notifications' : '/sub/notifications'

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-primary-900 text-white transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:flex lg:flex-col`}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-primary-800">
          <div>
            <div className="font-bold text-lg leading-tight">PlanningIA</div>
            <div className="text-xs text-primary-300">{t('app.tagline')}</div>
          </div>
          <button className="lg:hidden text-primary-300 hover:text-white" onClick={() => setSidebarOpen(false)}><IconX /></button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={'end' in l ? !!(l as any).end : false}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}>
              {l.icon}<span>{l.label}</span>
            </NavLink>
          ))}
          <NavLink to={notifPath}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}>
            <IconBell />
            <span>{t('nav.notifications')}</span>
            {unread > 0 && <span className="ml-auto bg-accent-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{unread}</span>}
          </NavLink>
        </nav>

        {/* Lien Aide (tous les utilisateurs) */}
        <div className="px-3 pt-2">
          <NavLink to={isAdmin ? '/aide' : '/sub/aide'}
            className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              isActive
                ? 'bg-primary-700 text-white'
                : 'text-primary-400 hover:bg-primary-700 hover:text-white'
            }`}
            onClick={() => setSidebarOpen(false)}>
            <span>❓</span>
            <span>{t('nav.help')}</span>
          </NavLink>
        </div>

        {/* Lien Platform (super-admin seulement) */}
        {isSuperAdmin(user) && (
          <div className="px-3 pt-1 pb-1">
            <NavLink to="/platform"
              className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                isActive
                  ? 'bg-indigo-700 text-white border-indigo-500'
                  : 'text-primary-300 border-primary-700 hover:bg-primary-700 hover:text-white'
              }`}
              onClick={() => setSidebarOpen(false)}>
              <IconPlatform />
              <span>⚙️ Admin PlanningIA</span>
            </NavLink>
          </div>
        )}

        {/* User + lang */}
        <div className="border-t border-primary-800 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold">
              {(user?.first_name?.[0] || user?.email?.[0] || '?').toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.email}</div>
              <div className="text-xs text-primary-300">{user?.company_name || (user?.role === 'admin' ? t('users.role.admin') : t('users.role.subcontractor'))}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang('fr')} className={`text-xs px-2 py-1 rounded ${lang === 'fr' ? 'bg-primary-600 text-white' : 'text-primary-300 hover:text-white'}`}>FR</button>
            <button onClick={() => setLang('tr')} className={`text-xs px-2 py-1 rounded ${lang === 'tr' ? 'bg-primary-600 text-white' : 'text-primary-300 hover:text-white'}`}>TR</button>
            <button onClick={handleLogout} className="ml-auto text-xs text-primary-300 hover:text-white">{t('auth.logout')}</button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6 gap-4">
          <button className="lg:hidden text-gray-500 hover:text-gray-700" onClick={() => setSidebarOpen(true)}><IconMenu /></button>
          <div className="flex-1" />
          <NavLink to={notifPath} className="relative p-2 text-gray-500 hover:text-gray-700">
            <IconBell />
            {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-accent-500 text-white text-xs rounded-full flex items-center justify-center">{unread}</span>}
          </NavLink>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
