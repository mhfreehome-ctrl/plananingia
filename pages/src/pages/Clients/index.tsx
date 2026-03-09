import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../../i18n'
import { api } from '../../api/client'

function ClientModal({ client, onClose, onSubmit, saving }: any) {
  const t = useT()
  const isEdit = !!client
  const [form, setForm] = useState({
    name: client?.name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
    city: client?.city || '',
    postal_code: client?.postal_code || '',
    notes: client?.notes || '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3 className="font-semibold">{isEdit ? t('clients.edit') : t('clients.new')}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={(e) => onSubmit(e, form)}>
          <div className="modal-body grid grid-cols-2 gap-4">
            <div className="field col-span-2">
              <label className="label">{t('clients.name_label')} *</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Ex: Groupe Bouygues" />
            </div>
            <div className="field">
              <label className="label">{t('company.email')}</label>
              <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="field">
              <label className="label">{t('company.phone')}</label>
              <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="field col-span-2">
              <label className="label">{t('company.address')}</label>
              <input className="input" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div className="field">
              <label className="label">{t('company.city')}</label>
              <input className="input" value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div className="field">
              <label className="label">{t('company.postal_code')}</label>
              <input className="input" value={form.postal_code} onChange={e => set('postal_code', e.target.value)} />
            </div>
            <div className="field col-span-2">
              <label className="label">{t('clients.notes')}</label>
              <textarea className="input" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-ghost">{t('common.cancel')}</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? t('common.loading') : isEdit ? t('common.save') : t('clients.create_client')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  devis:       '#6366f1',
  programme:   '#f59e0b',
  en_cours:    '#10b981',
  livre:       '#3b82f6',
  sav:         '#ef4444',
  draft:       '#9ca3af',
  preparation: '#8b5cf6',
  active:      '#10b981',
  reception:   '#f59e0b',
  closed:      '#6b7280',
}

function ThSort({ label, col, sortKey, sortDir, onSort }: {
  label: string; col: string; sortKey: string; sortDir: 'asc' | 'desc'; onSort: (col: string) => void
}) {
  const active = sortKey === col
  return (
    <th className="cursor-pointer select-none whitespace-nowrap group" onClick={() => onSort(col)}>
      <span className="flex items-center gap-1">
        {label}
        <span className={`text-xs transition-opacity ${active ? 'opacity-100 text-primary-600' : 'opacity-0 group-hover:opacity-40'}`}>
          {active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  )
}

type ViewMode = 'list' | 'cards'

export default function Clients() {
  const t = useT()
  const navigate = useNavigate()
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<any>(null) // null | false | client object
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (localStorage.getItem('planningIA_clients_view') as ViewMode) || 'list'
  )
  const changeView = (v: ViewMode) => {
    setViewMode(v)
    localStorage.setItem('planningIA_clients_view', v)
  }

  const toggleSort = (col: string) => {
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
  }

  const load = () => {
    setLoading(true)
    api.clients.list().then(setClients).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const displayed = useMemo(() => {
    const q = search.toLowerCase()
    const list = clients.filter(c =>
      !q || c.name?.toLowerCase().includes(q) || c.city?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
    )
    return [...list].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      return sortDir === 'asc'
        ? String(av).toLowerCase().localeCompare(String(bv).toLowerCase())
        : String(bv).toLowerCase().localeCompare(String(av).toLowerCase())
    })
  }, [clients, search, sortKey, sortDir])

  const handleSubmit = async (e: React.FormEvent, form: any) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (modal && modal.id) {
        await api.clients.update(modal.id, form)
      } else {
        await api.clients.create(form)
      }
      setModal(null)
      load()
    } catch (e: any) {
      setError(e.message || t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${t('clients.delete_confirm')} "${name}" ?`)) return
    try {
      await api.clients.delete(id)
      load()
    } catch (e: any) {
      alert(e.message || t('common.error'))
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('clients.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clients.length} {t('clients.projects_count')}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle vue */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
            <button
              onClick={() => changeView('cards')}
              title="Vue vignettes"
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 4h7v7H4V4zm0 9h7v7H4v-7zm9-9h7v7h-7V4zm0 9h7v7h-7v-7z" />
              </svg>
            </button>
            <button
              onClick={() => changeView('list')}
              title="Vue liste"
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
            </button>
          </div>
          <button onClick={() => setModal(false)} className="btn btn-accent">+ {t('clients.new')}</button>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          className="input pl-9 w-full max-w-xs"
          placeholder={t('clients.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {displayed.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🏗️</div>
          <p className="text-lg font-medium">{search ? t('clients.not_found') : t('clients.no_clients')}</p>
          {!search && <button onClick={() => setModal(false)} className="btn btn-primary mt-4">+ {t('clients.create_first')}</button>}
        </div>
      ) : viewMode === 'cards' ? (
        /* ── VUE VIGNETTES ── */
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {displayed.map(c => (
            <div
              key={c.id}
              onClick={() => navigate(`/clients/${c.id}`)}
              className="card p-5 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 leading-tight truncate">{c.name}</h3>
                  {c.city && <p className="text-sm text-gray-500 mt-0.5 truncate">📍 {c.city}</p>}
                </div>
                {c.project_count > 0 && (
                  <span className="badge badge-blue flex-shrink-0">{c.project_count}</span>
                )}
              </div>
              {c.email && <p className="text-xs text-gray-500 truncate mb-1">✉️ {c.email}</p>}
              {c.phone && <p className="text-xs text-gray-500 truncate mb-3">📞 {c.phone}</p>}
              <div className="flex gap-1 justify-end pt-2 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                <button onClick={() => setModal(c)} className="btn btn-ghost btn-sm text-xs">{t('common.edit')}</button>
                <button onClick={() => handleDelete(c.id, c.name)} className="btn btn-ghost btn-sm text-red-500 text-xs">{t('common.delete')}</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── VUE LISTE ── */
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <ThSort label={t('clients.col_name')} col="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <ThSort label={t('clients.col_city')} col="city" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <ThSort label={t('company.email')} col="email" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <ThSort label={t('company.phone')} col="phone" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <ThSort label={t('clients.col_projects')} col="project_count" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(c => (
                <tr key={c.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/clients/${c.id}`)}>
                  <td className="font-medium text-primary-700">{c.name}</td>
                  <td className="text-gray-500">{c.city || '—'}</td>
                  <td className="text-gray-500 text-sm">{c.email || '—'}</td>
                  <td className="text-gray-500 text-sm">{c.phone || '—'}</td>
                  <td>
                    {c.project_count > 0 ? (
                      <span className="badge badge-blue">{c.project_count} {t('clients.projects_count')}</span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setModal(c)} className="btn btn-ghost btn-sm text-xs">{t('common.edit')}</button>
                      <button onClick={() => handleDelete(c.id, c.name)} className="btn btn-ghost btn-sm text-red-500 text-xs">{t('common.delete')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <ClientModal
          client={modal || undefined}
          onClose={() => { setModal(null); setError('') }}
          onSubmit={handleSubmit}
          saving={saving}
        />
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-800 text-sm p-3 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  )
}

// STATUS_COLORS kept for potential future use
export { STATUS_COLORS }
