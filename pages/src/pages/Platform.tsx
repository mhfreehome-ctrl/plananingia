import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { api } from '../api/client'

// ── Helpers ──────────────────────────────────────────────────────────────────

function isSuperAdmin(user: any): boolean {
  return user?.role === 'admin' && user?.access_level === 'admin' && !user?.company_id
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface LotTemplate {
  id: string
  catalog_type: string
  code: string
  name: string
  name_tr?: string
  duration_days: number
  color: string
  zone?: string
  sort_order: number
  lot_types?: string
  parent_code?: string
}

interface LotDep {
  id: string
  catalog_type: string
  pred_code: string
  succ_code: string
  dep_type: string
  lag_days: number
}

interface MenuItem {
  id: string
  key: string
  label_fr: string
  label_tr?: string
  sort_order: number
  is_visible: number
  icon_name: string
}

interface Company {
  id: string
  name: string
  type: string
  city?: string
  email?: string
  phone?: string
  siret?: string
  user_count: number
  project_count: number
  is_active?: number
}

const EMPTY_CREATE_FORM = {
  name: '',
  type: 'entreprise_generale',
  email: '',
  phone: '',
  city: '',
  postal_code: '',
  siret: '',
  admin_email: '',
}

// ── Small UI components ───────────────────────────────────────────────────────

function Btn({ onClick, children, variant = 'primary', size = 'sm', disabled, title }: {
  onClick?: () => void; children: React.ReactNode
  variant?: 'primary' | 'danger' | 'ghost' | 'warning'
  size?: 'sm' | 'xs'; disabled?: boolean; title?: string
}) {
  const base = 'inline-flex items-center gap-1 rounded font-medium transition-colors'
  const sz = size === 'xs' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'
  const v = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    danger:  'bg-red-600 text-white hover:bg-red-700',
    warning: 'bg-amber-500 text-white hover:bg-amber-600',
    ghost:   'bg-gray-100 text-gray-700 hover:bg-gray-200',
  }[variant]
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={`${base} ${sz} ${v} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {children}
    </button>
  )
}

function Input({ label, value, onChange, type = 'text', placeholder }: {
  label?: string; value: string | number; onChange: (v: string) => void
  type?: string; placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-gray-600">{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
    </div>
  )
}

function ColorDot({ color }: { color: string }) {
  return <span className="inline-block w-3 h-3 rounded-full border border-gray-300 flex-shrink-0" style={{ background: color }} />
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// TAB 1 — Modèles IA
// ════════════════════════════════════════════════════════════

function TabTemplates() {
  const [catalog, setCatalog] = useState<'btp' | 'facade'>('btp')
  const [lots, setLots] = useState<LotTemplate[]>([])
  const [deps, setDeps] = useState<LotDep[]>([])
  const [loading, setLoading] = useState(true)
  const [editLot, setEditLot] = useState<Partial<LotTemplate> | null>(null)
  const [editDep, setEditDep] = useState<Partial<LotDep> | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.platform.lotTemplates(catalog)
      setLots(data.lots || [])
      setDeps(data.deps || [])
    } catch { setError('Erreur chargement') }
    setLoading(false)
  }, [catalog])

  useEffect(() => { load() }, [load])

  const saveLot = async () => {
    if (!editLot) return
    setSaving(true); setError('')
    try {
      if (editLot.id) {
        await api.platform.updateLotTemplate(editLot.id, { ...editLot, catalog_type: catalog })
      } else {
        await api.platform.createLotTemplate({ ...editLot, catalog_type: catalog })
      }
      setEditLot(null); await load()
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  const deleteLot = async (id: string) => {
    if (!confirm('Supprimer ce lot template ? Les dépendances liées seront aussi supprimées.')) return
    try { await api.platform.deleteLotTemplate(id); await load() }
    catch (e: any) { setError(e.message) }
  }

  const saveDep = async () => {
    if (!editDep) return
    setSaving(true); setError('')
    try {
      if (editDep.id) {
        await api.platform.updateLotDep(editDep.id, { ...editDep, catalog_type: catalog })
      } else {
        await api.platform.createLotDep({ ...editDep, catalog_type: catalog })
      }
      setEditDep(null); await load()
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  const deleteDep = async (id: string) => {
    try { await api.platform.deleteLotDep(id); await load() }
    catch (e: any) { setError(e.message) }
  }

  const DEP_TYPES = ['FS', 'SS', 'FF', 'SF']
  const COLORS_PRESETS = ['#6B7280','#8B4513','#696969','#8B6914','#2F4F4F','#4169E1','#FF8C00','#FFD700','#00CED1','#FF4500','#DEB887','#90EE90','#DAA520','#20B2AA','#CD853F','#FFB6C1','#1D4ED8','#3B82F6','#60A5FA','#92400E','#D97706','#FCD34D','#065F46','#10B981','#7C3AED','#9F1239','#E11D48','#F43F5E','#4B5563']

  return (
    <div className="space-y-6">
      {/* Sélecteur catalogue */}
      <div className="flex gap-2">
        {(['btp', 'facade'] as const).map(c => (
          <button key={c} onClick={() => setCatalog(c)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${catalog === c ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {c === 'btp' ? '🏗️ BTP Général' : '🏠 Façade'}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-8 text-gray-400">Chargement...</div>
      ) : (
        <>
          {/* Tableau des lots */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">Lots ({lots.length})</h3>
              <Btn onClick={() => setEditLot({ catalog_type: catalog, color: '#6B7280', duration_days: 10, sort_order: (lots.length + 1) * 10 })}>
                + Nouveau lot
              </Btn>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Code</th>
                    <th className="px-3 py-2 text-left">Nom</th>
                    <th className="px-3 py-2 text-left">Durée</th>
                    <th className="px-3 py-2 text-left">Zone</th>
                    <th className="px-3 py-2 text-left">Couleur</th>
                    <th className="px-3 py-2 text-left">Ordre</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lots.map(lot => (
                    <tr key={lot.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono font-bold text-indigo-700">{lot.code}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-800">{lot.name}</div>
                        {lot.name_tr && <div className="text-gray-400 text-xs">{lot.name_tr}</div>}
                        {lot.parent_code && <div className="text-gray-400 text-xs">↳ sous-lot de {lot.parent_code}</div>}
                        {lot.lot_types && <div className="text-xs text-purple-600 mt-0.5">{lot.lot_types}</div>}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{lot.duration_days}j</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{lot.zone || '—'}</td>
                      <td className="px-3 py-2"><ColorDot color={lot.color} /></td>
                      <td className="px-3 py-2 text-gray-500">{lot.sort_order}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Btn size="xs" variant="ghost" onClick={() => setEditLot({ ...lot })}>✏️</Btn>
                          <Btn size="xs" variant="danger" onClick={() => deleteLot(lot.id)}>🗑</Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tableau des dépendances */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">Dépendances ({deps.length})</h3>
              <Btn onClick={() => setEditDep({ catalog_type: catalog, dep_type: 'FS', lag_days: 0 })}>
                + Nouvelle dép.
              </Btn>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Prédécesseur</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Successeur</th>
                    <th className="px-3 py-2 text-left">Décalage</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {deps.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-indigo-700 font-bold">{d.pred_code}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          d.dep_type === 'FS' ? 'bg-blue-100 text-blue-700' :
                          d.dep_type === 'SS' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>{d.dep_type}</span>
                        {d.lag_days > 0 && <span className="ml-1 text-gray-400 text-xs">+{d.lag_days}j</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-indigo-700 font-bold">{d.succ_code}</td>
                      <td className="px-3 py-2 text-gray-500">{d.lag_days} j</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Btn size="xs" variant="ghost" onClick={() => setEditDep({ ...d })}>✏️</Btn>
                          <Btn size="xs" variant="danger" onClick={() => deleteDep(d.id)}>🗑</Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal lot */}
      {editLot && (
        <Modal title={editLot.id ? 'Modifier le lot' : 'Nouveau lot template'} onClose={() => setEditLot(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Code *" value={editLot.code || ''} onChange={v => setEditLot(p => ({ ...p!, code: v.toUpperCase() }))} placeholder="L01" />
              <Input label="Durée (jours) *" type="number" value={editLot.duration_days || 10} onChange={v => setEditLot(p => ({ ...p!, duration_days: parseInt(v) || 10 }))} />
            </div>
            <Input label="Nom (FR) *" value={editLot.name || ''} onChange={v => setEditLot(p => ({ ...p!, name: v }))} placeholder="Gros Œuvre" />
            <Input label="Nom (TR)" value={editLot.name_tr || ''} onChange={v => setEditLot(p => ({ ...p!, name_tr: v }))} placeholder="Kaba yapı" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Zone" value={editLot.zone || ''} onChange={v => setEditLot(p => ({ ...p!, zone: v }))} placeholder="Tous niveaux" />
              <Input label="Ordre d'affichage" type="number" value={editLot.sort_order || 0} onChange={v => setEditLot(p => ({ ...p!, sort_order: parseInt(v) || 0 }))} />
            </div>
            {catalog === 'facade' && (
              <>
                <Input label="Lot parent (code)" value={editLot.parent_code || ''} onChange={v => setEditLot(p => ({ ...p!, parent_code: v || undefined }))} placeholder="IT10" />
                <Input label={'Types requis (JSON ex: ["ITE","ECHAF"])'} value={editLot.lot_types || ''} onChange={v => setEditLot(p => ({ ...p!, lot_types: v || undefined }))} />
              </>
            )}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Couleur</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COLORS_PRESETS.map(c => (
                  <button key={c} onClick={() => setEditLot(p => ({ ...p!, color: c }))}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${editLot.color === c ? 'border-gray-800 scale-110' : 'border-transparent hover:border-gray-400'}`}
                    style={{ background: c }} />
                ))}
              </div>
              <input type="color" value={editLot.color || '#6B7280'} onChange={e => setEditLot(p => ({ ...p!, color: e.target.value }))}
                className="w-10 h-8 rounded border cursor-pointer" />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <div className="flex gap-2 pt-2">
              <Btn onClick={saveLot} disabled={saving}>{saving ? 'Sauvegarde...' : 'Enregistrer'}</Btn>
              <Btn variant="ghost" onClick={() => setEditLot(null)}>Annuler</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal dépendance */}
      {editDep && (
        <Modal title={editDep.id ? 'Modifier la dépendance' : 'Nouvelle dépendance'} onClose={() => setEditDep(null)}>
          <div className="space-y-3">
            <p className="text-xs text-gray-500 bg-gray-50 rounded p-2">
              <strong>Codes disponibles :</strong> {lots.map(l => l.code).join(', ')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Prédécesseur *" value={editDep.pred_code || ''} onChange={v => setEditDep(p => ({ ...p!, pred_code: v.toUpperCase() }))} placeholder="L01" />
              <Input label="Successeur *" value={editDep.succ_code || ''} onChange={v => setEditDep(p => ({ ...p!, succ_code: v.toUpperCase() }))} placeholder="L02" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Type</label>
                <select value={editDep.dep_type || 'FS'} onChange={e => setEditDep(p => ({ ...p!, dep_type: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {DEP_TYPES.map(t => <option key={t} value={t}>{t} — {
                    t === 'FS' ? 'Fin→Début' : t === 'SS' ? 'Début→Début' : t === 'FF' ? 'Fin→Fin' : 'Début→Fin'
                  }</option>)}
                </select>
              </div>
              <Input label="Décalage (jours)" type="number" value={editDep.lag_days ?? 0} onChange={v => setEditDep(p => ({ ...p!, lag_days: parseInt(v) || 0 }))} />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <div className="flex gap-2 pt-2">
              <Btn onClick={saveDep} disabled={saving}>{saving ? 'Sauvegarde...' : 'Enregistrer'}</Btn>
              <Btn variant="ghost" onClick={() => setEditDep(null)}>Annuler</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// TAB 2 — Menu
// ════════════════════════════════════════════════════════════

const ICON_LABELS: Record<string, string> = {
  house: '🏠', folder: '📁', people: '👥', calendar: '📅', users: '👤', team: '🤝', building: '🏢',
}

function TabMenu() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.platform.menuConfig().then(data => {
      setItems(data || [])
      setLoading(false)
    }).catch(() => { setError('Erreur chargement'); setLoading(false) })
  }, [])

  const moveItem = (idx: number, dir: -1 | 1) => {
    const newItems = [...items]
    const target = idx + dir
    if (target < 0 || target >= newItems.length) return
    ;[newItems[idx], newItems[target]] = [newItems[target], newItems[idx]]
    setItems(newItems.map((item, i) => ({ ...item, sort_order: i + 1 })))
  }

  const toggleVisible = (idx: number) => {
    setItems(items.map((item, i) => i === idx ? { ...item, is_visible: item.is_visible ? 0 : 1 } : item))
  }

  const updateLabel = (idx: number, field: 'label_fr' | 'label_tr', value: string) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const save = async () => {
    setSaving(true); setError(''); setSaved(false)
    try {
      await api.platform.saveMenuConfig(items)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  if (loading) return <div className="text-center py-8 text-gray-400">Chargement...</div>

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
        <strong>ℹ️ Note :</strong> Les modifications de libellés et d'ordre seront visibles par tous les utilisateurs connectés après rechargement de la page.
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">{error}</div>}

      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left w-8">Icône</th>
              <th className="px-3 py-2 text-left">Libellé FR</th>
              <th className="px-3 py-2 text-left">Libellé TR</th>
              <th className="px-3 py-2 text-center">Visible</th>
              <th className="px-3 py-2 text-center">Ordre</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, idx) => (
              <tr key={item.key} className={`${!item.is_visible ? 'bg-gray-50 opacity-60' : 'bg-white'} hover:bg-indigo-50/30 transition-colors`}>
                <td className="px-3 py-2 text-xl text-center">{ICON_LABELS[item.icon_name] || '📌'}</td>
                <td className="px-3 py-2">
                  <input value={item.label_fr} onChange={e => updateLabel(idx, 'label_fr', e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </td>
                <td className="px-3 py-2">
                  <input value={item.label_tr || ''} onChange={e => updateLabel(idx, 'label_tr', e.target.value)}
                    placeholder="Türkçe"
                    className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => toggleVisible(idx)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${item.is_visible ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${item.is_visible ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => moveItem(idx, -1)} disabled={idx === 0}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-500">▲</button>
                    <span className="text-gray-400 text-xs w-4 text-center">{idx + 1}</span>
                    <button onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-500">▼</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <Btn onClick={save} disabled={saving}>{saving ? '⏳ Sauvegarde...' : '💾 Sauvegarder le menu'}</Btn>
        {saved && <span className="text-green-600 text-sm font-medium">✓ Menu sauvegardé !</span>}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// TAB 3 — Entreprises
// ════════════════════════════════════════════════════════════

const COMPANY_TYPE_LABELS: Record<string, string> = {
  entreprise_generale:  '🏗️ Entreprise générale',
  maitre_oeuvre:        '📐 Maître d\'œuvre',
  promoteur:            '🏢 Promoteur',
  entreprise_metier:    '🔨 Entreprise métier',
}

const EMPTY_INVITE_FORM = {
  email: '', first_name: '', last_name: '',
  access_level: 'editeur', user_type: 'employee',
}

function CompanyFormFields({ form, set }: { form: any; set: (k: string, v: string) => void }) {
  return (
    <div className="space-y-3">
      <Input label="Nom de l'entreprise *" value={form.name}
        onChange={v => set('name', v)} placeholder="ACME Construction" />
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Type d'entreprise</label>
        <select value={form.type} onChange={e => set('type', e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="entreprise_generale">🏗️ Entreprise générale</option>
          <option value="maitre_oeuvre">📐 Maître d'œuvre</option>
          <option value="promoteur">🏢 Promoteur</option>
          <option value="entreprise_metier">🔨 Entreprise métier</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Ville" value={form.city || ''} onChange={v => set('city', v)} placeholder="Nancy" />
        <Input label="Code postal" value={form.postal_code || ''} onChange={v => set('postal_code', v)} placeholder="54000" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Email" type="email" value={form.email || ''} onChange={v => set('email', v)} placeholder="contact@acme.fr" />
        <Input label="Téléphone" value={form.phone || ''} onChange={v => set('phone', v)} placeholder="+33 3 83 xx xx xx" />
      </div>
      <Input label="SIRET" value={form.siret || ''} onChange={v => set('siret', v)} placeholder="123 456 789 00012" />
    </div>
  )
}

function TabCompanies() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  // Modal créer
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ ...EMPTY_CREATE_FORM })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  // Modal modifier
  const [editCompany, setEditCompany] = useState<Company | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [editing, setEditing] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')

  // Modal inviter
  const [inviteCompany, setInviteCompany] = useState<Company | null>(null)
  const [inviteForm, setInviteForm] = useState({ ...EMPTY_INVITE_FORM })
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')

  const load = useCallback(async () => {
    try {
      const data = await api.platform.companies()
      setCompanies(data || [])
    } catch { setError('Erreur chargement') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toggleBlock = async (company: Company) => {
    const blocked = !(company.is_active === 0)
    const label = blocked ? 'Bloquer' : 'Débloquer'
    if (!confirm(`${label} tous les utilisateurs de "${company.name}" ?`)) return
    try {
      await api.platform.blockCompany(company.id, blocked)
      setCompanies(cs => cs.map(c => c.id === company.id ? { ...c, is_active: blocked ? 0 : 1 } : c))
    } catch (e: any) { setError(e.message) }
  }

  const handleCreate = async () => {
    if (!createForm.name.trim()) { setCreateError('Le nom est obligatoire'); return }
    setCreating(true); setCreateError(''); setCreateSuccess('')
    try {
      const newCompany = await api.platform.createCompany(createForm)
      setCompanies(cs => [...cs, { ...newCompany, user_count: 0, project_count: 0 }])
      setCreateSuccess(
        createForm.admin_email
          ? `✅ Entreprise créée ! Un email d'invitation a été envoyé à ${createForm.admin_email}.`
          : '✅ Entreprise créée avec succès.'
      )
      setCreateForm({ ...EMPTY_CREATE_FORM })
      setTimeout(() => { setShowCreate(false); setCreateSuccess('') }, 2500)
    } catch (e: any) { setCreateError(e.message) }
    setCreating(false)
  }

  const openEdit = (company: Company) => {
    setEditCompany(company)
    setEditForm({ name: company.name, type: company.type, city: company.city || '',
      email: company.email || '', phone: company.phone || '', siret: company.siret || '',
      postal_code: (company as any).postal_code || '', address: (company as any).address || '' })
    setEditError(''); setEditSuccess('')
  }

  const handleEdit = async () => {
    if (!editCompany) return
    if (!editForm.name.trim()) { setEditError('Le nom est obligatoire'); return }
    setEditing(true); setEditError(''); setEditSuccess('')
    try {
      const updated = await api.platform.updateCompany(editCompany.id, editForm)
      setCompanies(cs => cs.map(c => c.id === editCompany.id ? { ...c, ...updated } : c))
      setEditSuccess('✅ Fiche mise à jour avec succès.')
      setTimeout(() => { setEditCompany(null); setEditSuccess('') }, 2000)
    } catch (e: any) { setEditError(e.message) }
    setEditing(false)
  }

  const openInvite = (company: Company) => {
    setInviteCompany(company)
    setInviteForm({ ...EMPTY_INVITE_FORM })
    setInviteError(''); setInviteSuccess('')
  }

  const handleInvite = async () => {
    if (!inviteCompany) return
    if (!inviteForm.email.trim()) { setInviteError('L\'email est obligatoire'); return }
    setInviting(true); setInviteError(''); setInviteSuccess('')
    try {
      await api.platform.inviteToCompany(inviteCompany.id, inviteForm)
      setCompanies(cs => cs.map(c => c.id === inviteCompany.id
        ? { ...c, user_count: (c.user_count || 0) + (inviteForm.user_type === 'employee' ? 1 : 0) } : c))
      setInviteSuccess(`✅ Invitation envoyée à ${inviteForm.email} !`)
      setInviteForm({ ...EMPTY_INVITE_FORM })
    } catch (e: any) { setInviteError(e.message) }
    setInviting(false)
  }

  const set = (key: string, val: string) => setCreateForm(f => ({ ...f, [key]: val }))

  const filtered = companies.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.city?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="text-center py-8 text-gray-400">Chargement...</div>

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">{error}</div>}

      {/* Barre de recherche + bouton créer */}
      <div className="flex gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Rechercher une entreprise..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        <Btn onClick={() => { setShowCreate(true); setCreateError(''); setCreateSuccess('') }}>
          + Nouvelle entreprise
        </Btn>
      </div>

      <div className="text-sm text-gray-500">{filtered.length} entreprise(s)</div>

      <div className="space-y-2">
        {filtered.map(company => {
          const isBlocked = company.is_active === 0
          return (
            <div key={company.id} className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${isBlocked ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200 hover:border-indigo-200'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800 truncate">{company.name}</span>
                  {isBlocked && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">🔒 Bloqué</span>}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {COMPANY_TYPE_LABELS[company.type] || company.type}
                  {company.city && <> · {company.city}</>}
                  {company.email && <> · {company.email}</>}
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span title="Utilisateurs">👤 {company.user_count}</span>
                <span title="Chantiers">📁 {company.project_count}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Btn size="xs" variant="ghost" onClick={() => openEdit(company)} title="Modifier la fiche">✏️ Modifier</Btn>
                <Btn size="xs" variant="primary" onClick={() => openInvite(company)} title="Inviter un utilisateur">👤+ Inviter</Btn>
                <Btn size="xs" variant={isBlocked ? 'warning' : 'danger'} onClick={() => toggleBlock(company)}>
                  {isBlocked ? '🔓' : '🔒'}
                </Btn>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-400">Aucune entreprise trouvée</div>
        )}
      </div>

      {/* Modal créer entreprise */}
      {showCreate && (
        <Modal title="Nouvelle entreprise" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Informations entreprise</p>
              <CompanyFormFields form={createForm} set={set} />
            </div>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Administrateur (optionnel)</p>
              <p className="text-xs text-gray-500 mb-3">Un email d'invitation sera envoyé pour créer le compte administrateur de cette entreprise.</p>
              <Input label="Email de l'administrateur" type="email" value={createForm.admin_email}
                onChange={v => set('admin_email', v)} placeholder="admin@acme.fr" />
            </div>
            {createError && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">{createError}</div>}
            {createSuccess && <div className="bg-green-50 border border-green-200 text-green-700 rounded px-3 py-2 text-sm">{createSuccess}</div>}
            <div className="flex gap-2 pt-1">
              <Btn onClick={handleCreate} disabled={creating}>{creating ? '⏳ Création...' : '✅ Créer l\'entreprise'}</Btn>
              <Btn variant="ghost" onClick={() => setShowCreate(false)}>Annuler</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal modifier entreprise */}
      {editCompany && (
        <Modal title={`Modifier — ${editCompany.name}`} onClose={() => setEditCompany(null)}>
          <div className="space-y-4">
            <CompanyFormFields form={editForm}
              set={(k, v) => setEditForm((f: any) => ({ ...f, [k]: v }))} />
            {editError && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">{editError}</div>}
            {editSuccess && <div className="bg-green-50 border border-green-200 text-green-700 rounded px-3 py-2 text-sm">{editSuccess}</div>}
            <div className="flex gap-2 pt-1">
              <Btn onClick={handleEdit} disabled={editing}>{editing ? '⏳ Sauvegarde...' : '💾 Enregistrer'}</Btn>
              <Btn variant="ghost" onClick={() => setEditCompany(null)}>Annuler</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal inviter un utilisateur */}
      {inviteCompany && (
        <Modal title={`Inviter un utilisateur — ${inviteCompany.name}`} onClose={() => setInviteCompany(null)}>
          <div className="space-y-4">
            <div className="space-y-3">
              <Input label="Email *" type="email" value={inviteForm.email}
                onChange={v => setInviteForm(f => ({ ...f, email: v }))} placeholder="prenom.nom@entreprise.fr" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Prénom" value={inviteForm.first_name}
                  onChange={v => setInviteForm(f => ({ ...f, first_name: v }))} placeholder="Jean" />
                <Input label="Nom" value={inviteForm.last_name}
                  onChange={v => setInviteForm(f => ({ ...f, last_name: v }))} placeholder="Dupont" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Type de compte</label>
                <select value={inviteForm.user_type} onChange={e => setInviteForm(f => ({ ...f, user_type: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="employee">👷 Salarié interne</option>
                  <option value="subcontractor">🏢 Sous-traitant</option>
                </select>
              </div>
              {inviteForm.user_type === 'employee' && (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Niveau d'accès</label>
                  <select value={inviteForm.access_level} onChange={e => setInviteForm(f => ({ ...f, access_level: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    <option value="admin">🔑 Admin — accès complet + gestion droits</option>
                    <option value="editeur">✏️ Éditeur — tout sauf modifier les droits</option>
                    <option value="conducteur">🎯 Conducteur — ses projets uniquement</option>
                    <option value="salarie">👁 Salarié — lecture seule</option>
                  </select>
                </div>
              )}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-700">
              Un email d'invitation sera envoyé à <strong>{inviteForm.email || '…'}</strong> avec un lien pour activer le compte (valable 7 jours).
            </div>
            {inviteError && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">{inviteError}</div>}
            {inviteSuccess && <div className="bg-green-50 border border-green-200 text-green-700 rounded px-3 py-2 text-sm">{inviteSuccess}</div>}
            <div className="flex gap-2 pt-1">
              <Btn onClick={handleInvite} disabled={inviting}>{inviting ? '⏳ Envoi...' : '📧 Envoyer l\'invitation'}</Btn>
              <Btn variant="ghost" onClick={() => setInviteCompany(null)}>Fermer</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// TAB 4 — Stats
// ════════════════════════════════════════════════════════════

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:        { label: 'Brouillon',    color: 'bg-gray-100 text-gray-600' },
  preparation:  { label: 'Préparation', color: 'bg-blue-100 text-blue-700' },
  active:       { label: 'Actif',        color: 'bg-green-100 text-green-700' },
  reception:    { label: 'Réception',   color: 'bg-amber-100 text-amber-700' },
  closed:       { label: 'Terminé',      color: 'bg-gray-100 text-gray-500' },
}

function TabStats() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.platform.stats().then(data => { setStats(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-8 text-gray-400">Chargement...</div>
  if (!stats) return <div className="text-center py-8 text-red-400">Erreur chargement des stats</div>

  const kpis = [
    { label: 'Entreprises', value: stats.companies, icon: '🏢', color: 'bg-indigo-50 border-indigo-200' },
    { label: 'Utilisateurs admin', value: stats.users, icon: '👤', color: 'bg-blue-50 border-blue-200' },
    { label: 'Chantiers', value: stats.projects, icon: '📁', color: 'bg-green-50 border-green-200' },
    { label: 'Lots totaux', value: stats.lots, icon: '🧱', color: 'bg-amber-50 border-amber-200' },
    { label: 'Lots actifs', value: stats.lots_active, icon: '⚡', color: 'bg-orange-50 border-orange-200' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className={`rounded-xl border p-4 ${kpi.color}`}>
            <div className="text-2xl mb-1">{kpi.icon}</div>
            <div className="text-2xl font-bold text-gray-800">{kpi.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      {stats.projects_by_status && stats.projects_by_status.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-700 mb-3">Répartition des chantiers par statut</h3>
          <div className="flex flex-wrap gap-2">
            {stats.projects_by_status.map((s: any) => {
              const info = STATUS_LABELS[s.status] || { label: s.status, color: 'bg-gray-100 text-gray-600' }
              return (
                <div key={s.status} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${info.color}`}>
                  <span className="font-bold text-lg">{s.count}</span>
                  <span className="text-sm">{info.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-sm text-gray-500 space-y-1">
        <div className="font-semibold text-gray-700 mb-2">ℹ️ Informations plateforme</div>
        <div>Version : PlanningIA v1.0</div>
        <div>Base de données : Cloudflare D1 (SQLite)</div>
        <div>Worker : planningai-api.mhfreehome.workers.dev</div>
        <div>Pages : planningia.pages.dev · planningia.com</div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ════════════════════════════════════════════════════════════

const TABS = [
  { key: 'templates', label: '🤖 Modèles IA',     component: <TabTemplates /> },
  { key: 'menu',      label: '📌 Menu navigation', component: <TabMenu /> },
  { key: 'companies', label: '🏢 Entreprises',     component: <TabCompanies /> },
  { key: 'stats',     label: '📊 Statistiques',    component: <TabStats /> },
]

export default function Platform() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('templates')

  // Guard super-admin
  useEffect(() => {
    if (user && !isSuperAdmin(user)) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  if (!user || !isSuperAdmin(user)) return null

  const activeComponent = TABS.find(t => t.key === activeTab)?.component

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-indigo-600 text-white text-2xl flex-shrink-0">⚙️</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administration PlanningIA</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Plateforme super-admin · Gestion globale des templates, menus et entreprises
          </p>
        </div>
        <div className="ml-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
            🔑 Super Admin
          </span>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white shadow-sm text-indigo-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu onglet */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-[400px]">
        {activeComponent}
      </div>
    </div>
  )
}
