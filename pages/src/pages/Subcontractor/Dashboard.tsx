import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useT, useI18n } from '../../i18n'
import { useAuth } from '../../store/auth'
import { api } from '../../api/client'
import ProgressModal from '../../components/ProgressModal'

const statusColors: Record<string, string> = {
  pending: 'badge-gray', active: 'badge-green', paused: 'badge-yellow', done: 'badge-blue', with_reserves: 'badge-orange'
}

export default function SubDashboard() {
  const t = useT()
  const { lang } = useI18n()
  const { user } = useAuth()
  const [lots, setLots] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [progressLot, setProgressLot] = useState<any>(null)

  const load = async () => {
    const [l, p] = await Promise.all([api.my.lots(), api.my.projects()])
    setLots(l); setProjects(p)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const today = new Date().toISOString().split('T')[0]
  const week = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  const upcoming = lots.filter(l => l.start_date_planned && l.start_date_planned >= today && l.start_date_planned <= week && l.status !== 'done')
  const active = lots.filter(l => l.status === 'active')

  if (loading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('auth.welcome')} {user?.first_name || user?.email}</h1>
        <p className="text-gray-500 text-sm mt-1">{user?.company_name || ''}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Link to="/sub/lots" className="card p-4 bg-blue-50 hover:shadow-md transition-shadow"><div className="text-2xl font-bold text-blue-700">{lots.length}</div><div className="text-sm text-gray-600 mt-1">{t('sub.my_lots')}</div></Link>
        <Link to="/sub/lots" className="card p-4 bg-green-50 hover:shadow-md transition-shadow"><div className="text-2xl font-bold text-green-700">{active.length}</div><div className="text-sm text-gray-600 mt-1">{t('lots.status.active')}</div></Link>
        <Link to="/sub/planning" className="card p-4 bg-orange-50 hover:shadow-md transition-shadow"><div className="text-2xl font-bold text-accent-600">{upcoming.length}</div><div className="text-sm text-gray-600 mt-1">{t('sub.next')}</div></Link>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-gray-900">⏰ {t('sub.next')}</h2></div>
          <div className="divide-y divide-gray-100">
            {upcoming.map(l => (
              <div key={l.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                    <span className="font-medium text-sm">{l.code} — {lang === 'tr' && l.name_tr ? l.name_tr : l.name}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">📋 {l.project_name} · 📅 {l.start_date_planned}</div>
                </div>
                <button onClick={() => setProgressLot(l)} className="btn btn-primary btn-sm">{t('sub.update')}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active lots */}
      {active.length > 0 && (
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-gray-900">🔨 {t('lots.status.active')}</h2></div>
          <div className="divide-y divide-gray-100">
            {active.map(l => (
              <div key={l.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                    <span className="font-medium text-sm truncate">{l.code} — {lang === 'tr' && l.name_tr ? l.name_tr : l.name}</span>
                    <span className={statusColors[l.status] || 'badge-gray'}>{t(`lots.status.${l.status}` as any)}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill bg-primary-600" style={{ width: `${l.progress_percent}%` }} />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{l.progress_percent}% · {l.project_name}</div>
                </div>
                <button onClick={() => setProgressLot(l)} className="btn btn-ghost btn-sm flex-shrink-0">📊 {t('sub.update')}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {lots.length === 0 && (
        <div className="card card-body text-center text-gray-400 py-16">{t('sub.no_lots')}</div>
      )}

      {progressLot && (
        <ProgressModal lot={progressLot} onClose={() => setProgressLot(null)} onSaved={async () => { setProgressLot(null); await load() }} />
      )}
    </div>
  )
}
