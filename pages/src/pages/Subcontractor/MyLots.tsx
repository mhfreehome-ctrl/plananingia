import { useEffect, useState } from 'react'
import { useT, useI18n } from '../../i18n'
import { api } from '../../api/client'
import ProgressModal from '../../components/ProgressModal'

const statusColors: Record<string, string> = {
  pending: 'badge-gray', active: 'badge-green', paused: 'badge-yellow', done: 'badge-blue', with_reserves: 'badge-orange'
}

export default function MyLots() {
  const t = useT()
  const { lang } = useI18n()
  const [lots, setLots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [progressLot, setProgressLot] = useState<any>(null)
  const [filter, setFilter] = useState<string>('all')

  const load = async () => { const l = await api.my.lots(); setLots(l); setLoading(false) }
  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? lots : lots.filter(l => l.status === filter)

  if (loading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">{t('sub.my_lots')}</h1>

      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'active', 'paused', 'done'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`}>
            {s === 'all' ? 'Tous' : t(`lots.status.${s}` as any)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card card-body text-center text-gray-400 py-12">{t('sub.no_lots')}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(l => (
            <div key={l.id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                    <span className="font-semibold text-sm">{l.code} — {lang === 'tr' && l.name_tr ? l.name_tr : l.name}</span>
                    <span className={statusColors[l.status] || 'badge-gray'}>{t(`lots.status.${l.status}` as any)}</span>
                    {l.is_critical ? <span className="badge badge-red">⚠ {t('planning.critical_path')}</span> : null}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">📋 {l.project_name} {l.project_city ? `· ${l.project_city}` : ''}</div>

                  <div className="flex items-center gap-2 mb-1">
                    <div className="progress-bar flex-1"><div className="progress-fill bg-primary-600" style={{ width: `${l.progress_percent}%` }} /></div>
                    <span className="text-xs font-medium text-primary-700 w-8">{l.progress_percent}%</span>
                  </div>

                  <div className="flex gap-4 text-xs text-gray-400 flex-wrap">
                    <span>⏱ {l.duration_days} {t('common.days')}</span>
                    {l.start_date_planned && <span>📅 {l.start_date_planned} → {l.end_date_planned || '?'}</span>}
                  </div>
                </div>
                <button onClick={() => setProgressLot(l)} className="btn btn-primary btn-sm flex-shrink-0">{t('sub.update')}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {progressLot && (
        <ProgressModal lot={progressLot} onClose={() => setProgressLot(null)} onSaved={async () => { setProgressLot(null); await load() }} />
      )}
    </div>
  )
}
