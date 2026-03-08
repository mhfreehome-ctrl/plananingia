import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { api } from '../api/client'

const statusColors: Record<string, string> = {
  // Statuts anglais (format actuel)
  draft: 'badge-gray', preparation: 'badge-blue', active: 'badge-green', reception: 'badge-yellow', closed: 'badge-gray',
  // Statuts français (seed legacy Design Facades)
  devis: 'badge-gray', programme: 'badge-blue', en_cours: 'badge-green', livre: 'badge-gray', sav: 'badge-gray',
}

export default function Dashboard() {
  const t = useT()
  const [projects, setProjects] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.projects.list(), api.users.list(), api.notifications.unreadCount()])
      .then(([p, u, n]) => { setProjects(p); setUsers(u); setUnread(n.count) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Compte les projets actifs — supporte les deux formats : anglais ('active') et français legacy ('en_cours')
  const active = projects.filter(p => p.status === 'active' || p.status === 'en_cours').length
  // Compte tous les utilisateurs de l'entreprise (salariés + sous-traitants)
  const totalUsers = users.length

  if (loading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('dashboard.active_projects'), value: active, color: 'text-green-600', bg: 'bg-green-50', icon: '🟢', to: '/projects' },
          { label: t('dashboard.total_projects'), value: projects.length, color: 'text-primary-600', bg: 'bg-primary-50', icon: '📋', to: '/projects' },
          { label: t('dashboard.total_users'), value: totalUsers, color: 'text-accent-600', bg: 'bg-orange-50', icon: '👷', to: '/users' },
          { label: t('dashboard.unread_notifs'), value: unread, color: 'text-purple-600', bg: 'bg-purple-50', icon: '🔔', to: '/notifications' },
        ].map(kpi => (
          <Link key={kpi.label} to={kpi.to} className={`card p-5 ${kpi.bg} hover:shadow-md transition-shadow`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{kpi.icon}</span>
              <span className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</span>
            </div>
            <p className="text-sm text-gray-600 font-medium">{kpi.label}</p>
          </Link>
        ))}
      </div>

      {/* Recent projects */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{t('dashboard.recent')}</h2>
          <Link to="/projects" className="text-sm text-primary-600 hover:text-primary-800 font-medium">{t('common.view')} →</Link>
        </div>
        {projects.length === 0 ? (
          <div className="card-body text-center text-gray-500">
            <p className="mb-4">{t('dashboard.no_projects')}</p>
            <Link to="/projects/new" className="btn btn-primary">{t('projects.new')}</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('projects.name')}</th>
                  <th>{t('projects.client_name')}</th>
                  <th>{t('projects.status')}</th>
                  <th>{t('projects.progress')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {projects.slice(0, 8).map(p => (
                  <tr key={p.id}>
                    <td className="font-medium text-gray-900">{p.name}</td>
                    <td className="text-gray-500">{p.client_name || '—'}</td>
                    <td><span className={statusColors[p.status] || 'badge-gray'}>{t(`projects.status.${p.status}` as any)}</span></td>
                    <td>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="progress-bar flex-1">
                          <div className="progress-fill bg-primary-600" style={{ width: `${p.avg_progress || 0}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-8">{p.avg_progress || 0}%</span>
                      </div>
                    </td>
                    <td><Link to={`/projects/${p.id}`} className="text-primary-600 hover:text-primary-800 text-sm font-medium">{t('common.view')}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
