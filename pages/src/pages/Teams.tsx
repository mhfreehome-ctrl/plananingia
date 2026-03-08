import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { api } from '../api/client'

const TEAM_COLORS = ['#6B7280', '#3b82f6', '#22c55e', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

// ─── TeamFormModal ─────────────────────────────────────────────────────────────
function TeamFormModal({ team, employees, onClose, onSubmit, saving }: any) {
  const t = useT()
  const [form, setForm] = useState({
    name: team?.name || '',
    color: team?.color || '#3b82f6',
    leader_id: team?.leader_id || '',
    description: team?.description || '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="modal-overlay">
      <div className="modal max-w-md">
        <div className="modal-header">
          <h3 className="font-semibold">{team ? `✏️ ${t('teams.edit_title')}` : `👥 ${t('teams.create_title')}`}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={(e) => onSubmit(e, form)}>
          <div className="modal-body space-y-4">
            <div className="field">
              <label className="label">{t('teams.name')} *</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)}
                required placeholder="ex : Équipe maçonnerie, Équipe finitions..." />
            </div>
            <div className="field">
              <label className="label">{t('teams.color')}</label>
              <div className="flex items-center gap-2 flex-wrap">
                {TEAM_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => set('color', c)}
                    className="w-8 h-8 rounded-full border-2 transition-all flex-shrink-0"
                    style={{ backgroundColor: c, borderColor: form.color === c ? '#000' : 'transparent' }} />
                ))}
                <input type="color" className="h-8 w-10 rounded border cursor-pointer ml-1"
                  value={form.color} onChange={e => set('color', e.target.value)} title={t('teams.color')} />
              </div>
            </div>
            <div className="field">
              <label className="label">{t('teams.leader')}</label>
              <select className="select" value={form.leader_id} onChange={e => set('leader_id', e.target.value)}>
                <option value="">{t('common.none')}</option>
                {employees.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name} {u.company_name ? `— ${u.company_name}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label">{t('teams.description_opt')}</label>
              <textarea className="input resize-none" rows={2} value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="ex : Équipe spécialisée en second œuvre..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-ghost">{t('common.cancel')}</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? t('common.loading') : `💾 ${t('common.save')}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── TeamMembersModal ──────────────────────────────────────────────────────────
function TeamMembersModal({ team, employees, onClose, onRefresh }: any) {
  const t = useT()
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')

  const loadMembers = () =>
    api.teams.members.list(team.id).then(setMembers).finally(() => setLoading(false))

  useEffect(() => { loadMembers() }, [])

  const memberIds = new Set(members.map((m: any) => m.user_id))
  const availableEmployees = employees.filter((u: any) => !memberIds.has(u.id))

  const handleAdd = async () => {
    if (!selectedUserId) return
    setAdding(true)
    try {
      await api.teams.members.add(team.id, selectedUserId)
      setSelectedUserId('')
      await loadMembers()
      onRefresh()
    } catch (e: any) { alert(e.message) }
    finally { setAdding(false) }
  }

  const handleRemove = async (userId: string) => {
    await api.teams.members.remove(team.id, userId)
    await loadMembers()
    onRefresh()
  }

  return (
    <div className="modal-overlay">
      <div className="modal max-w-md">
        <div className="modal-header">
          <h3 className="font-semibold flex items-center gap-2">
            <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
            {t('teams.members')} — {team.name}
          </h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="modal-body space-y-4">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-4">{t('common.loading')}</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-2">{t('teams.no_members')}</p>
          ) : (
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
              {members.map((m: any) => (
                <div key={m.id} className="flex items-center gap-3 px-3 py-2 bg-white">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
                    {(m.first_name?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.first_name} {m.last_name}</p>
                    <p className="text-xs text-gray-400">{m.email}{m.company_name ? ` · ${m.company_name}` : ''}</p>
                  </div>
                  <button onClick={() => handleRemove(m.user_id)}
                    className="btn btn-ghost btn-sm text-xs text-red-400 flex-shrink-0">
                    {t('teams.remove')}
                  </button>
                </div>
              ))}
            </div>
          )}

          {availableEmployees.length > 0 && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('teams.add_member')}</p>
              <div className="flex gap-2">
                <select className="select flex-1" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
                  <option value="">{t('teams.select_member')}</option>
                  {availableEmployees.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name} {u.company_name ? `— ${u.company_name}` : ''}</option>
                  ))}
                </select>
                <button onClick={handleAdd} disabled={!selectedUserId || adding}
                  className="btn btn-primary btn-sm flex-shrink-0">
                  {adding ? '…' : `+ ${t('common.add')}`}
                </button>
              </div>
            </div>
          )}
          {availableEmployees.length === 0 && members.length > 0 && (
            <p className="text-xs text-gray-400 italic text-center">{t('teams.all_added')}</p>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-ghost">{t('common.close')}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Teams page ──────────────────────────────────────────────────────────
export default function Teams() {
  const t = useT()
  const [teams, setTeams] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([]) // user_type='employee'
  const [loading, setLoading] = useState(true)
  const [formModal, setFormModal] = useState<any>(null)  // null | team object | {}
  const [membersModal, setMembersModal] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => {
    try {
      const [ts, usrs] = await Promise.all([api.teams.list(), api.users.list()])
      setTeams(ts)
      setEmployees(usrs.filter((u: any) => u.user_type === 'employee'))
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSave = async (e: React.FormEvent, form: any) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (formModal?.id) {
        await api.teams.update(formModal.id, form)
      } else {
        await api.teams.create(form)
      }
      setFormModal(null)
      await load()
    } catch (e: any) { setMsg(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('teams.delete_confirm'))) return
    await api.teams.delete(id)
    await load()
  }

  if (loading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👥 {t('teams.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('teams.subtitle')}</p>
        </div>
        <button onClick={() => setFormModal({})} className="btn btn-accent">
          + {t('teams.create')}
        </button>
      </div>

      {msg && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg flex justify-between">
          <span>{msg}</span><button onClick={() => setMsg('')} className="ml-4 text-red-500">✕</button>
        </div>
      )}

      {employees.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-lg">
          ⚠️ {t('teams.no_employees')} {t('teams.no_employees_hint')}
        </div>
      )}

      {teams.length === 0 ? (
        <div className="card card-body text-center py-12 space-y-3">
          <p className="text-4xl">👥</p>
          <p className="text-gray-500">{t('teams.no_teams')}</p>
          <p className="text-sm text-gray-400">{t('teams.no_teams_desc')}</p>
          <button onClick={() => setFormModal({})} className="btn btn-primary mx-auto">{t('teams.create_first')}</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {teams.map(team => (
            <div key={team.id} className="card card-body space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
                  <h3 className="font-semibold text-gray-900 truncate">{team.name}</h3>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => setFormModal(team)} className="btn btn-ghost btn-sm text-xs">✏️</button>
                  <button onClick={() => handleDelete(team.id)} className="btn btn-ghost btn-sm text-xs text-red-500">✕</button>
                </div>
              </div>

              {team.description && (
                <p className="text-xs text-gray-400 italic">{team.description}</p>
              )}

              {team.leader_name && (
                <p className="text-xs text-gray-500">
                  <span className="font-medium">{t('teams.leader_label')}</span> {team.leader_name.trim() || '—'}
                </p>
              )}

              <div className="flex gap-2">
                <button onClick={() => setMembersModal(team)}
                  className="btn btn-ghost btn-sm text-xs flex-1 border border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50">
                  👤 {t('teams.members')}
                </button>
                <Link to={`/teams/${team.id}/workload`}
                  className="btn btn-ghost btn-sm text-xs border border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 flex items-center gap-1"
                  title={t('teams.workload')}>
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10.5" stroke="#d1d5db" strokeWidth={1} />
                    <path d="M4.2 16.5 A9 9 0 1 1 19.8 16.5" stroke="#e5e7eb" strokeWidth={2.5} fill="none" strokeLinecap="round" />
                    <path d="M12 3 A9 9 0 0 1 19.8 7.5" stroke="#f97316" strokeWidth={2.5} fill="none" strokeLinecap="butt" />
                    <path d="M19.8 7.5 A9 9 0 0 1 19.8 16.5" stroke="#ef4444" strokeWidth={2.5} fill="none" strokeLinecap="round" />
                    <line x1="5.5" y1="15.8" x2="4.2" y2="16.5" stroke="#9ca3af" strokeWidth={1} strokeLinecap="round" />
                    <line x1="5.5" y1="8.2"  x2="4.2" y2="7.5"  stroke="#9ca3af" strokeWidth={1} strokeLinecap="round" />
                    <line x1="12"  y1="4.5"  x2="12"  y2="3"    stroke="#9ca3af" strokeWidth={1} strokeLinecap="round" />
                    <line x1="18.5" y1="8.2" x2="19.8" y2="7.5" stroke="#f97316" strokeWidth={1} strokeLinecap="round" />
                    <line x1="18.5" y1="15.8" x2="19.8" y2="16.5" stroke="#ef4444" strokeWidth={1} strokeLinecap="round" />
                    <line x1="12" y1="12" x2="17.2" y2="7.3" stroke="#374151" strokeWidth={1.5} strokeLinecap="round" />
                    <circle cx="12" cy="12" r="1.5" fill="#374151" />
                  </svg>
                  {t('teams.workload')}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {formModal !== null && (
        <TeamFormModal
          team={formModal?.id ? formModal : null}
          employees={employees}
          onClose={() => setFormModal(null)}
          onSubmit={handleSave}
          saving={saving}
        />
      )}

      {membersModal && (
        <TeamMembersModal
          team={membersModal}
          employees={employees}
          onClose={() => setMembersModal(null)}
          onRefresh={load}
        />
      )}
    </div>
  )
}
