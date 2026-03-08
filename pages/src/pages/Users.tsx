import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { useAuth } from '../store/auth'
import { api } from '../api/client'

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

const ACCESS_CLS: Record<string, string> = {
  admin:      'badge-blue',
  editeur:    'badge-purple',
  conducteur: 'badge-yellow',
  salarie:    'badge-gray',
}

// Badge distinguant type (qui est-il) + droits (que peut-il faire)
// user_type = 'employee' → salarié interne (quel que soit le role)
// user_type = 'subcontractor' → sous-traitant externe
// role = 'admin' → a des droits d'accès (admin / editeur / salarie)
function UserTypeBadge({ userType, role, accessLevel }: { userType: string; role: string; accessLevel?: string }) {
  const t = useT()

  const typeBadge = userType === 'employee'
    ? <span className="badge" style={{ background: '#dcfce7', color: '#16a34a', borderRadius: '9999px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>{t('users.type.employee')}</span>
    : <span className="badge badge-gray">{t('users.type.subcontractor')}</span>

  const droitKey = accessLevel as keyof typeof ACCESS_CLS
  const droitsCls = ACCESS_CLS[droitKey] || ACCESS_CLS.editeur
  const droitsLabel = accessLevel ? `🔑 ${t(`users.access.${accessLevel}` as any)}` : null
  const droitsBadge = role === 'admin' && droitsLabel
    ? <span className={`badge ${droitsCls}`} style={{ borderRadius: '9999px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>{droitsLabel}</span>
    : null

  return <div className="flex gap-1 flex-wrap">{typeBadge}{droitsBadge}</div>
}

function EditUserModal({ user, onClose, onSubmit, saving, t, isFullAdmin }: any) {
  const [form, setForm] = useState({
    email: user.email,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    company_name: user.company_name || '',
    phone: user.phone || '',
    lang: user.lang || 'fr',
    user_type: user.user_type || 'subcontractor',
    access_level: user.access_level || 'editeur',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header"><h3 className="font-semibold">{t('users.edit_title')}</h3><button onClick={onClose}>✕</button></div>
        <form onSubmit={(e) => onSubmit(e, form)}>
          <div className="modal-body grid grid-cols-2 gap-4">
            <div className="field col-span-2">
              <label className="label">{t('users.user_type')}</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="user_type_edit" value="subcontractor"
                    checked={form.user_type === 'subcontractor'} onChange={e => set('user_type', e.target.value)} />
                  <span className="text-sm">{t('users.type.subcontractor_ext')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="user_type_edit" value="employee"
                    checked={form.user_type === 'employee'} onChange={e => set('user_type', e.target.value)} />
                  <span className="text-sm">{t('users.type.employee_ext')}</span>
                </label>
              </div>
            </div>
            <div className="field col-span-2"><label className="label">{t('auth.email')}</label><input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} required /></div>
            <div className="field"><label className="label">{t('auth.first_name')}</label><input className="input" value={form.first_name} onChange={e => set('first_name', e.target.value)} /></div>
            <div className="field"><label className="label">{t('auth.last_name')}</label><input className="input" value={form.last_name} onChange={e => set('last_name', e.target.value)} /></div>
            <div className="field col-span-2"><label className="label">{t('auth.company')}</label><input className="input" value={form.company_name} onChange={e => set('company_name', e.target.value)} /></div>
            <div className="field"><label className="label">{t('auth.phone')}</label><input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
            <div className="field"><label className="label">{t('users.lang')}</label>
              <select className="select" value={form.lang} onChange={e => set('lang', e.target.value)}>
                <option value="fr">Français</option><option value="tr">Türkçe</option>
              </select>
            </div>
            {/* Droits — visible seulement si l'utilisateur édité est admin + on est full admin */}
            {isFullAdmin && user.role === 'admin' && (
              <div className="field col-span-2">
                <label className="label">{t('users.access.label')}</label>
                <select className="select" value={form.access_level} onChange={e => set('access_level', e.target.value)}>
                  <option value="admin">{t('users.access.admin_desc')}</option>
                  <option value="editeur">{t('users.access.editeur_desc')}</option>
                  <option value="conducteur">{t('users.access.conducteur_desc')}</option>
                  <option value="salarie">{t('users.access.salarie_desc')}</option>
                </select>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-ghost">{t('common.cancel')}</button>
            <button type="submit" disabled={saving} className="btn btn-primary">{saving ? t('common.loading') : t('common.save')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Users() {
  const t = useT()
  const { user: currentUser } = useAuth()
  const isFullAdmin = currentUser?.access_level === 'admin'

  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteModal, setInviteModal] = useState(false)
  const [form, setForm] = useState({ email: '', first_name: '', last_name: '', company_name: '', phone: '', lang: 'fr', user_type: 'subcontractor', access_level: 'editeur' })
  const [inviteResult, setInviteResult] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [editModal, setEditModal] = useState<any>(null)
  const [filter, setFilter] = useState<'all' | 'employee' | 'subcontractor'>('all')
  const [resetResult, setResetResult] = useState<{ user: any; password: string } | null>(null)
  const [search, setSearch] = useState('')
  const [filterAccess, setFilterAccess] = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [sortKey, setSortKey] = useState('last_name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAccess, setBulkAccess] = useState('editeur')

  const toggleSort = (col: string) => {
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
  }

  const toggleSelect = (id: string) => {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const toggleSelectAll = () => {
    setSelected(s => s.size === displayed.length ? new Set() : new Set(displayed.map((u: any) => u.id)))
  }

  const handleBulkUpdate = async () => {
    if (!selected.size) return
    setSaving(true)
    try {
      await Promise.all([...selected].map(id => {
        const u = users.find((x: any) => x.id === id)
        return api.users.update(id, { ...u, access_level: bulkAccess })
      }))
      setSelected(new Set())
      load()
    } catch (e: any) { setMsg(e.message) }
    finally { setSaving(false) }
  }

  const load = () => api.users.list().then(setUsers).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await api.auth.invite(form)
      setInviteResult(r)
      load()
    } catch (e: any) { setMsg(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('users.delete_confirm'))) return
    await api.users.delete(id); load()
  }

  const handleEdit = async (e: React.FormEvent, form: any) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.users.update(editModal.id, form)
      setEditModal(null); load()
    } catch (e: any) { setMsg(e.message) }
    finally { setSaving(false) }
  }

  const handleResetPassword = async (u: any) => {
    if (!confirm(`${t('users.reset_confirm')} ${u.first_name} ${u.last_name} ?`)) return
    try {
      const r = await api.users.resetPassword(u.id)
      setResetResult({ user: u, password: r.temp_password })
    } catch (e: any) { alert(t('common.error') + ' : ' + e.message) }
  }

  const inviteLink = inviteResult ? `${window.location.origin}/invite?token=${inviteResult.invite_token}` : ''

  const displayed = useMemo(() => {
    const q = search.toLowerCase()
    const list = users
      .filter(u => {
        if (filter === 'employee') return u.user_type === 'employee'
        if (filter === 'subcontractor') return u.user_type === 'subcontractor'
        return true
      })
      .filter(u => !filterAccess || u.access_level === filterAccess)
      .filter(u => filterActive === 'active' ? u.is_active : filterActive === 'inactive' ? !u.is_active : true)
      .filter(u =>
        !q ||
        (u.first_name || '').toLowerCase().includes(q) ||
        (u.last_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.company_name || '').toLowerCase().includes(q)
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
  }, [users, filter, filterAccess, filterActive, search, sortKey, sortDir])

  const employeeCount = users.filter(u => u.user_type === 'employee').length
  const stCount = users.filter(u => u.user_type === 'subcontractor').length

  if (loading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('users.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {employeeCount} {t('users.filter_employees')} · {stCount} {t('users.filter_subcontractors')}
          </p>
        </div>
        {isFullAdmin && (
          <button onClick={() => { setInviteModal(true); setInviteResult(null); setMsg('') }} className="btn btn-accent">
            + {t('users.invite')}
          </button>
        )}
      </div>

      {/* Filtres + recherche */}
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'employee', 'subcontractor'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}>
            {f === 'all' ? `👥 ${t('users.filter_all')}` : f === 'employee' ? `👷 ${t('users.filter_employees')}` : `🏢 ${t('users.filter_subcontractors')}`}
          </button>
        ))}
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <select className="input input-sm" value={filterAccess} onChange={e => setFilterAccess(e.target.value)}>
          <option value="">Tous les droits</option>
          <option value="admin">🔑 Admin</option>
          <option value="editeur">✏️ Éditeur</option>
          <option value="conducteur">🎯 Conducteur</option>
          <option value="salarie">👁 Salarié</option>
        </select>
        <select className="input input-sm" value={filterActive} onChange={e => setFilterActive(e.target.value)}>
          <option value="">Tous statuts</option>
          <option value="active">✅ Actif</option>
          <option value="inactive">⏸ Inactif</option>
        </select>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            className="input input-sm pl-8 w-48"
            placeholder={t('common.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Barre d'action groupée (visible quand sélection non vide) */}
      {isFullAdmin && selected.size > 0 && (
        <div className="flex items-center gap-3 bg-primary-50 border border-primary-200 rounded-lg px-4 py-2">
          <span className="text-sm font-semibold text-primary-800">
            {selected.size} utilisateur{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}
          </span>
          <div className="w-px h-4 bg-primary-300" />
          <span className="text-sm text-primary-700">Appliquer les droits&nbsp;:</span>
          <select className="input input-sm" value={bulkAccess} onChange={e => setBulkAccess(e.target.value)}>
            <option value="admin">🔑 Admin</option>
            <option value="editeur">✏️ Éditeur</option>
            <option value="conducteur">🎯 Conducteur</option>
            <option value="salarie">👁 Salarié</option>
          </select>
          <button onClick={handleBulkUpdate} disabled={saving} className="btn btn-primary btn-sm">
            {saving ? t('common.loading') : 'Appliquer'}
          </button>
          <button onClick={() => setSelected(new Set())} className="btn btn-ghost btn-sm text-xs text-gray-500">
            Désélectionner tout
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              {isFullAdmin && (
                <th className="w-8">
                  <input
                    type="checkbox"
                    className="accent-primary-600"
                    checked={displayed.length > 0 && selected.size === displayed.length}
                    onChange={toggleSelectAll}
                    title="Tout sélectionner"
                  />
                </th>
              )}
              <ThSort label={`${t('auth.first_name')} / ${t('auth.last_name')}`} col="last_name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <ThSort label={t('auth.email')} col="email" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <ThSort label={t('auth.company')} col="company_name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <ThSort label={t('users.type_rights')} col="user_type" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <ThSort label={t('users.active')} col="is_active" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <th></th>
            </tr>
          </thead>
          <tbody>
            {displayed.map(u => (
              <tr key={u.id} className={selected.has(u.id) ? 'bg-primary-50' : ''}>
                {isFullAdmin && (
                  <td onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="accent-primary-600"
                      checked={selected.has(u.id)}
                      onChange={() => toggleSelect(u.id)}
                    />
                  </td>
                )}
                <td className="font-medium">{u.first_name} {u.last_name}</td>
                <td className="text-gray-500">{u.email}</td>
                <td>{u.company_name || '—'}</td>
                <td><UserTypeBadge userType={u.user_type || 'subcontractor'} role={u.role} accessLevel={u.access_level} /></td>
                <td>{u.is_active ? <span className="badge badge-green">{t('users.active')}</span> : <span className="badge badge-yellow">{t('users.inactive')}</span>}</td>
                <td>
                  <div className="flex gap-1 justify-end">
                    <Link to={`/users/${u.id}/workload`} className="btn btn-ghost btn-sm text-xs" title={t('users.workload_tooltip')}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                        {/* Cercle extérieur (cadran) */}
                        <circle cx="12" cy="12" r="10.5" stroke="#d1d5db" strokeWidth={1} />
                        {/* Arc de fond gris clair — 240° de 8h à 4h dans le sens horaire */}
                        <path d="M4.2 16.5 A9 9 0 1 1 19.8 16.5" stroke="#e5e7eb" strokeWidth={2.5} fill="none" strokeLinecap="round" />
                        {/* Zone orange — de 12h à 2h (60°) */}
                        <path d="M12 3 A9 9 0 0 1 19.8 7.5" stroke="#f97316" strokeWidth={2.5} fill="none" strokeLinecap="butt" />
                        {/* Zone rouge — de 2h à 4h (60°) */}
                        <path d="M19.8 7.5 A9 9 0 0 1 19.8 16.5" stroke="#ef4444" strokeWidth={2.5} fill="none" strokeLinecap="round" />
                        {/* Repères (0% 25% 50% 75% 100%) */}
                        <line x1="5.5" y1="15.8" x2="4.2" y2="16.5" stroke="#9ca3af" strokeWidth={1} strokeLinecap="round" />
                        <line x1="5.5" y1="8.2"  x2="4.2" y2="7.5"  stroke="#9ca3af" strokeWidth={1} strokeLinecap="round" />
                        <line x1="12"  y1="4.5"  x2="12"  y2="3"    stroke="#9ca3af" strokeWidth={1} strokeLinecap="round" />
                        <line x1="18.5" y1="8.2" x2="19.8" y2="7.5" stroke="#f97316" strokeWidth={1} strokeLinecap="round" />
                        <line x1="18.5" y1="15.8" x2="19.8" y2="16.5" stroke="#ef4444" strokeWidth={1} strokeLinecap="round" />
                        {/* Aiguille — ~70% (pointant vers 1h environ) */}
                        <line x1="12" y1="12" x2="17.2" y2="7.3" stroke="#374151" strokeWidth={1.5} strokeLinecap="round" />
                        {/* Point central */}
                        <circle cx="12" cy="12" r="1.5" fill="#374151" />
                      </svg>
                    </Link>
                    <button onClick={() => setEditModal(u)} className="btn btn-ghost btn-sm text-xs">{t('common.edit')}</button>
                    {isFullAdmin && (
                      <button onClick={() => handleResetPassword(u)} className="btn btn-ghost btn-sm text-xs text-amber-600" title={t('users.reset_password_tooltip')}>🔑</button>
                    )}
                    {isFullAdmin && u.role !== 'admin' && (
                      <button onClick={() => handleDelete(u.id)} className="btn btn-ghost btn-sm text-red-500 text-xs">{t('common.delete')}</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editModal && (
        <EditUserModal
          user={editModal}
          onClose={() => setEditModal(null)}
          onSubmit={handleEdit}
          saving={saving}
          t={t}
          isFullAdmin={isFullAdmin}
        />
      )}

      {/* Popup mot de passe temporaire */}
      {resetResult && (
        <div className="modal-overlay" onClick={() => setResetResult(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-semibold">🔑 {t('users.temp_password')}</h3>
              <button onClick={() => setResetResult(null)}>✕</button>
            </div>
            <div className="modal-body space-y-4">
              <p className="text-sm text-gray-600">
                {t('users.temp_password')} — <strong>{resetResult.user.first_name} {resetResult.user.last_name}</strong> ({resetResult.user.email})&nbsp;:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 border border-gray-200 rounded px-4 py-2 text-lg font-mono font-bold text-gray-900 select-all">
                  {resetResult.password}
                </code>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { navigator.clipboard.writeText(resetResult!.password); }}
                  title={t('users.copy_link')}>
                  📋
                </button>
              </div>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                ⚠ {t('users.temp_password_warning')}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setResetResult(null)}>{t('common.close')}</button>
            </div>
          </div>
        </div>
      )}

      {inviteModal && isFullAdmin && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="font-semibold">{t('users.invite')}</h3>
              <button onClick={() => setInviteModal(false)}>✕</button>
            </div>
            {inviteResult ? (
              <div className="modal-body space-y-4">
                <div className="bg-green-50 border border-green-200 text-green-800 text-sm p-4 rounded-lg">
                  <p className="font-semibold mb-2">{t('users.invited')}</p>
                  <p className="text-xs mb-2">
                    {form.user_type === 'employee' ? t('users.invite_link_employee') : t('users.invite_link_other')}
                  </p>
                  <div className="bg-white border rounded p-2 text-xs font-mono break-all">{inviteLink}</div>
                  <button onClick={() => navigator.clipboard.writeText(inviteLink)} className="btn btn-ghost btn-sm mt-2 text-xs">📋 {t('users.copy_link')}</button>
                </div>
                <button onClick={() => setInviteModal(false)} className="btn btn-primary w-full">{t('common.close')}</button>
              </div>
            ) : (
              <form onSubmit={handleInvite}>
                <div className="modal-body grid grid-cols-2 gap-4">
                  {/* Sélection du type */}
                  <div className="field col-span-2">
                    <label className="label">{t('users.user_type')} *</label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${form.user_type === 'subcontractor' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" name="user_type" value="subcontractor"
                          checked={form.user_type === 'subcontractor'}
                          onChange={e => set('user_type', e.target.value)} className="accent-primary-600" />
                        <div>
                          <p className="text-sm font-semibold">{t('users.type.subcontractor')}</p>
                          <p className="text-xs text-gray-400">{t('users.type.subcontractor_desc')}</p>
                        </div>
                      </label>
                      <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${form.user_type === 'employee' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" name="user_type" value="employee"
                          checked={form.user_type === 'employee'}
                          onChange={e => set('user_type', e.target.value)} className="accent-green-600" />
                        <div>
                          <p className="text-sm font-semibold">{t('users.type.employee')}</p>
                          <p className="text-xs text-gray-400">{t('users.type.employee_desc')}</p>
                        </div>
                      </label>
                    </div>
                  </div>
                  <div className="field col-span-2"><label className="label">{t('auth.email')} *</label><input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} required /></div>
                  <div className="field"><label className="label">{t('auth.first_name')}</label><input className="input" value={form.first_name} onChange={e => set('first_name', e.target.value)} /></div>
                  <div className="field"><label className="label">{t('auth.last_name')}</label><input className="input" value={form.last_name} onChange={e => set('last_name', e.target.value)} /></div>
                  <div className="field col-span-2"><label className="label">{t('auth.company')}</label><input className="input" value={form.company_name} onChange={e => set('company_name', e.target.value)} /></div>
                  <div className="field"><label className="label">{t('auth.phone')}</label><input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
                  <div className="field"><label className="label">{t('users.lang')}</label>
                    <select className="select" value={form.lang} onChange={e => set('lang', e.target.value)}>
                      <option value="fr">Français</option><option value="tr">Türkçe</option>
                    </select>
                  </div>
                  {/* Droits — seulement pour les employés */}
                  {form.user_type === 'employee' && (
                    <div className="field col-span-2">
                      <label className="label">{t('users.access.label')}</label>
                      <select className="select" value={form.access_level} onChange={e => set('access_level', e.target.value)}>
                        <option value="editeur">{t('users.access.editeur_desc')}</option>
                        <option value="conducteur">{t('users.access.conducteur_desc')}</option>
                        <option value="salarie">{t('users.access.salarie_desc')}</option>
                      </select>
                    </div>
                  )}
                  {msg && <p className="col-span-2 text-sm text-red-600">{msg}</p>}
                </div>
                <div className="modal-footer">
                  <button type="button" onClick={() => setInviteModal(false)} className="btn btn-ghost">{t('common.cancel')}</button>
                  <button type="submit" disabled={saving} className="btn btn-primary">{saving ? t('common.loading') : t('users.send_invite')}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
