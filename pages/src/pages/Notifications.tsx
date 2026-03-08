import { useEffect, useState } from 'react'
import { useT, useI18n } from '../i18n'
import { api } from '../api/client'

export default function Notifications() {
  const t = useT()
  const { lang } = useI18n()
  const [notifs, setNotifs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => api.notifications.list().then(setNotifs).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const markRead = async (id: string) => {
    await api.notifications.markRead(id)
    setNotifs(n => n.map(x => x.id === id ? { ...x, is_read: 1 } : x))
  }

  const markAll = async () => {
    await api.notifications.markAllRead()
    setNotifs(n => n.map(x => ({ ...x, is_read: 1 })))
  }

  if (loading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('notifs.title')}</h1>
        {notifs.some(n => !n.is_read) && (
          <button onClick={markAll} className="btn btn-ghost btn-sm">{t('notifs.mark_all')}</button>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className="card card-body text-center text-gray-400 py-12">{t('notifs.empty')}</div>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => (
            <div key={n.id} onClick={() => !n.is_read && markRead(n.id)}
              className={`card p-4 cursor-pointer transition-colors ${!n.is_read ? 'border-primary-200 bg-primary-50 hover:bg-primary-100' : 'hover:bg-gray-50'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.is_read ? 'bg-primary-500' : 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${!n.is_read ? 'text-primary-900' : 'text-gray-700'}`}>
                    {lang === 'tr' && n.title_tr ? n.title_tr : n.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{lang === 'tr' && n.message_tr ? n.message_tr : n.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {n.project_name && <span className="text-xs text-gray-400">📋 {n.project_name}</span>}
                    <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString(lang === 'tr' ? 'tr' : 'fr')}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
