import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../store/auth'
import { useT } from '../i18n'
import { api } from '../api/client'
import { lookupSiret } from '../lib/siretLookup'

const COMPANY_TYPES = ['entreprise_generale', 'maitre_oeuvre', 'promoteur', 'entreprise_metier']

const FACADE_LOT_TYPES = ['ECHAF', 'ITE', 'ENDUIT', 'BARDAGE', 'LASURE', 'RAVALEMENT']
const FACADE_LOT_LABELS: Record<string, string> = {
  ECHAF: 'Échafaudage',
  ITE: 'ITE (Isolation Thermique Extérieure)',
  ENDUIT: 'Enduit projeté',
  BARDAGE: 'Bardage',
  LASURE: 'Lasure / Hydrofuge',
  RAVALEMENT: 'Ravalement',
}

// ── Modal super admin : créer / modifier une entreprise ─────────────────────
const EMPTY_FORM = () => ({
  name: '', type: 'entreprise_generale', activity: '',
  siret: '', address: '', city: '', postal_code: '',
  phone: '', email: '', lot_types: [] as string[],
})

function CoModal({ company, onClose, onSave, saving, error }: {
  company?: any; onClose: () => void
  onSave: (e: React.FormEvent, form: any) => void
  saving: boolean; error: string
}) {
  const t = useT()
  const isEdit = !!company?.id
  const [form, setForm] = useState(() => company?.id ? {
    name: company.name || '',
    type: company.type || 'entreprise_generale',
    activity: company.activity || '',
    siret: company.siret || '',
    address: company.address || '',
    city: company.city || '',
    postal_code: company.postal_code || '',
    phone: company.phone || '',
    email: company.email || '',
    lot_types: company.lot_types
      ? (typeof company.lot_types === 'string' ? JSON.parse(company.lot_types) : company.lot_types)
      : [],
  } : EMPTY_FORM())

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const toggleLotType = (lt: string) => setForm(f => ({
    ...f,
    lot_types: f.lot_types.includes(lt)
      ? f.lot_types.filter((x: string) => x !== lt)
      : [...f.lot_types, lt],
  }))

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h3 className="font-semibold">
            {isEdit ? `Modifier : ${company.name}` : 'Nouvelle entreprise'}
          </h3>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={e => onSave(e, form)}>
          <div className="modal-body space-y-4">
            <div>
              <label className="label">{t('company.name')} *</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Ex : DESIGN FACADES" />
            </div>
            <div>
              <label className="label">{t('company.type')}</label>
              <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
                {COMPANY_TYPES.map(v => (
                  <option key={v} value={v}>{t(`company.type.${v}` as any)}</option>
                ))}
              </select>
            </div>
            {form.type === 'entreprise_metier' && (
              <div>
                <label className="label">{t('company.activity')}</label>
                <input className="input" value={form.activity} onChange={e => set('activity', e.target.value)} placeholder="facade, peinture…" />
              </div>
            )}
            {form.type === 'entreprise_metier' && (
              <div>
                <label className="label">{t('company.lot_types')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {FACADE_LOT_TYPES.map(lt => (
                    <label key={lt} className="flex items-center gap-2 p-2 rounded border border-gray-200 cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={form.lot_types.includes(lt)} onChange={() => toggleLotType(lt)} className="w-4 h-4 text-primary-600" />
                      <span className="text-sm"><span className="font-mono text-xs bg-gray-100 px-1 rounded mr-1">{lt}</span>{FACADE_LOT_LABELS[lt]}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <hr className="border-gray-200" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t('company.siret')}</label>
                <input className="input" value={form.siret} onChange={e => set('siret', e.target.value)} placeholder="12345678900012" />
              </div>
              <div>
                <label className="label">{t('company.phone')}</label>
                <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">{t('company.address')}</label>
                <input className="input" value={form.address} onChange={e => set('address', e.target.value)} />
              </div>
              <div>
                <label className="label">{t('company.postal_code')}</label>
                <input className="input" value={form.postal_code} onChange={e => set('postal_code', e.target.value)} />
              </div>
              <div>
                <label className="label">{t('company.city')}</label>
                <input className="input" value={form.city} onChange={e => set('city', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">{t('company.email')}</label>
                <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-ghost">{t('common.cancel')}</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? t('common.loading') : isEdit ? t('common.save') : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal : ajouter un sous-traitant / salarié ──────────────────────────────
function AddSubModal({ onClose, onCreated }: { onClose: () => void; onCreated: (u: any) => void }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', user_type: 'subcontractor',
    company_name: '', trade: '', siret: '', phone: '', email: '',
  })
  const [siretStatus, setSiretStatus] = useState<'idle' | 'loading' | 'ok' | 'inactive' | 'error'>('idle')
  const [siretInfo, setSiretInfo] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const doLookup = async () => {
    if (!form.siret.trim()) return
    setSiretStatus('loading'); setSiretInfo('')
    const res = await lookupSiret(form.siret)
    if (!res) { setSiretStatus('error'); return }
    setForm(f => ({
      ...f,
      company_name: res.nom || f.company_name,
      first_name: res.gerantPrenom || f.first_name,
      last_name: res.gerantNom || f.last_name,
      trade: res.metier || f.trade,
    }))
    setSiretStatus(res.etat === 'A' ? 'ok' : 'inactive')
    const infoparts: string[] = []
    if (res.metier) infoparts.push(res.metier)
    else if (res.activite) infoparts.push(res.activite)
    if (res.gerantPrenom || res.gerantNom) infoparts.push(`Gérant : ${[res.gerantPrenom, res.gerantNom].filter(Boolean).join(' ')}`)
    setSiretInfo(infoparts.join(' · '))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      const created = await api.users.create(form)
      onCreated(created)
    } catch (ex: any) { setErr(ex.message || 'Erreur'); setSaving(false) }
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h3 className="font-semibold">Nouveau sous-traitant / collaborateur</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            {/* Prénom / Nom */}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Prénom *</label>
                <input className="input" value={form.first_name} onChange={e => set('first_name', e.target.value)} required /></div>
              <div><label className="label">Nom *</label>
                <input className="input" value={form.last_name} onChange={e => set('last_name', e.target.value)} required /></div>
            </div>
            {/* Type */}
            <div>
              <label className="label">Type</label>
              <div className="flex gap-2">
                {(['subcontractor', 'employee'] as const).map(t => (
                  <button key={t} type="button" onClick={() => set('user_type', t)}
                    className={`btn btn-sm flex-1 ${form.user_type === t ? 'btn-primary' : 'btn-ghost border border-gray-200'}`}>
                    {t === 'subcontractor' ? '🏢 Sous-traitant' : '👷 Salarié'}
                  </button>
                ))}
              </div>
            </div>
            {/* SIRET + lookup */}
            <div>
              <label className="label">N° SIRET <span className="text-gray-400 font-normal">(optionnel)</span></label>
              <div className="flex gap-2">
                <input className="input flex-1 font-mono" value={form.siret}
                  onChange={e => { set('siret', e.target.value); setSiretStatus('idle') }}
                  placeholder="88216048400015" maxLength={14} />
                <button type="button" onClick={doLookup}
                  disabled={siretStatus === 'loading' || !form.siret.trim()}
                  className="btn btn-ghost border border-gray-300 px-3 text-sm min-w-[44px]">
                  {siretStatus === 'loading' ? '⏳' : '🔍'}
                </button>
              </div>
              {siretStatus === 'ok' && <p className="mt-1 text-xs text-green-600">✅ Entreprise active{siretInfo ? ` — ${siretInfo}` : ''}</p>}
              {siretStatus === 'inactive' && <p className="mt-1 text-xs text-amber-600">⚠️ Entreprise cessée{siretInfo ? ` — ${siretInfo}` : ''}</p>}
              {siretStatus === 'error' && <p className="mt-1 text-xs text-red-500">❌ SIRET introuvable dans l'annuaire national</p>}
            </div>
            {/* Entreprise + Métier */}
            <div>
              <label className="label">Entreprise / Raison sociale</label>
              <input className="input" value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="MAÇOBAT SARL" />
            </div>
            <div>
              <label className="label">Métier / Corps de métier</label>
              <input className="input" value={form.trade} onChange={e => set('trade', e.target.value)} placeholder="Maçonnerie, Plomberie, Électricité…" />
            </div>
            {/* Téléphone + Email */}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Téléphone</label>
                <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
              <div><label className="label">Email <span className="text-gray-400 font-normal">(accès web)</span></label>
                <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jean@exemple.fr" /></div>
            </div>
            {!form.email.trim() && (
              <p className="text-xs text-gray-400 bg-gray-50 rounded p-2">
                💡 Sans email, le collaborateur apparaît dans vos listes mais ne peut pas se connecter. Vous pourrez lui envoyer une invitation plus tard.
              </p>
            )}
            {err && <p className="text-sm text-red-600">{err}</p>}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-ghost">Annuler</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? '⏳ Création…' : '＋ Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Company() {
  const { user } = useAuth()
  const t = useT()

  // ── Détection super admin platform (company_id === null)
  const isSuperAdmin = user !== undefined && user !== null && user.company_id === null

  // ── État formulaire entreprise (utilisateur régulier) ───────────────────
  const [form, setForm] = useState({
    name: '', type: 'entreprise_generale', activity: '',
    siret: '', address: '', city: '', postal_code: '',
    phone: '', email: '', lot_types: [] as string[],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // ── État liste entreprises (super admin) ────────────────────────────────
  const [allCompanies, setAllCompanies] = useState<any[]>([])
  const [modal, setModal] = useState<any>(null) // null = fermé, false = création, obj = édition
  const [coSaving, setCoSaving] = useState(false)
  const [coError, setCoError] = useState('')

  // ── État sous-traitants & import ────────────────────────────────────────
  const [subs, setSubs] = useState<any[]>([])
  const [showAddSub, setShowAddSub] = useState(false)
  const [importRows, setImportRows] = useState<any[]>([])
  const [importPreview, setImportPreview] = useState<any[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const toggleLotType = (lt: string) => {
    setForm(f => ({
      ...f,
      lot_types: f.lot_types.includes(lt)
        ? f.lot_types.filter((x: string) => x !== lt)
        : [...f.lot_types, lt],
    }))
  }

  useEffect(() => {
    if (isSuperAdmin) {
      api.platform.companies().then(setAllCompanies).finally(() => setLoading(false))
      return
    }
    if (!user?.company_id) {
      setIsCreating(true)
      setLoading(false)
      return
    }
    api.companies.me()
      .then(c => {
        setForm({
          name: c.name || '',
          type: c.type || 'entreprise_generale',
          activity: c.activity || '',
          siret: c.siret || '',
          address: c.address || '',
          city: c.city || '',
          postal_code: c.postal_code || '',
          phone: c.phone || '',
          email: c.email || '',
          lot_types: c.lot_types ? (typeof c.lot_types === 'string' ? JSON.parse(c.lot_types) : c.lot_types) : [],
        })
        setLoading(false)
      })
      .catch(() => {
        setIsCreating(true)
        setLoading(false)
      })
  }, [user?.company_id, isSuperAdmin])

  // ── Chargement liste sous-traitants ──────────────────────────────────────
  useEffect(() => {
    if (!isSuperAdmin && user?.company_id) {
      api.users.list().then(all => {
        setSubs(all.filter((u: any) => u.user_type === 'subcontractor' || u.user_type === 'employee'))
      }).catch(() => {/* silencieux */})
    }
  }, [user?.company_id, isSuperAdmin])

  // ── Submit régulier ──────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, lot_types: form.lot_types }
      if (isCreating) {
        await api.companies.create(payload)
        setIsCreating(false)
        setSaved(true)
        window.location.reload()
      } else {
        await api.companies.update(payload)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (e: any) {
      setError(e.message || t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  // ── Submit super admin ───────────────────────────────────────────────────
  const handleCoSave = async (e: React.FormEvent, data: any) => {
    e.preventDefault()
    setCoSaving(true)
    setCoError('')
    try {
      if (modal?.id) {
        await api.platform.updateCompany(modal.id, data)
      } else {
        await api.platform.createCompany(data)
      }
      setModal(null)
      const updated = await api.platform.companies()
      setAllCompanies(updated)
    } catch (e: any) {
      setCoError(e.message || t('common.error'))
    } finally {
      setCoSaving(false)
    }
  }

  // ── Téléchargement template Excel ────────────────────────────────────────
  const downloadTemplate = async () => {
    const { utils, write } = await import('xlsx')
    const ws = utils.aoa_to_sheet([
      ['Prénom', 'Nom', 'Email (optionnel)', 'Téléphone', 'Entreprise / Raison sociale', 'SIRET (optionnel)', 'Métier', 'Type (sous-traitant / salarié)'],
      ['Jean', 'Dupont', 'jean.dupont@exemple.fr', '06 12 34 56 78', 'MAÇOBAT SARL', '88216048400015', 'Maçonnerie', 'sous-traitant'],
      ['Marie', 'Martin', '', '07 98 76 54 32', '', '', 'Peinture', 'salarié'],
    ])
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Collaborateurs')
    const buf = write(wb, { type: 'array', bookType: 'xlsx' })
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'template_collaborateurs.xlsx'; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Import fichier Excel ──────────────────────────────────────────────────
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const { read, utils } = await import('xlsx')
    const data = await file.arrayBuffer()
    const wb = read(data)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = utils.sheet_to_json(ws, { defval: '' }) as any[]
    setImportRows(rows)
    setImportPreview(rows.slice(0, 10))
    setImportResult(null)
    e.target.value = ''
  }

  const confirmImport = async () => {
    if (!importRows.length) return
    setImporting(true)
    try {
      const result = await api.users.import(importRows)
      setImportResult(result)
      setImportPreview(null)
      setImportRows([])
      const all = await api.users.list()
      setSubs(all.filter((u: any) => u.user_type === 'subcontractor' || u.user_type === 'employee'))
    } catch {
      setImportResult({ created: 0, skipped: importRows.length })
    } finally {
      setImporting(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">{t('common.loading')}</div>

  // ── Vue super admin : liste toutes les entreprises ───────────────────────
  if (isSuperAdmin) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🏢 Entreprises — Plateforme</h1>
            <p className="text-sm text-gray-500 mt-0.5">{allCompanies.length} entreprise{allCompanies.length > 1 ? 's' : ''} sur la plateforme</p>
          </div>
          <button onClick={() => setModal(false)} className="btn btn-accent">+ Nouvelle entreprise</button>
        </div>

        {allCompanies.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">🏗️</div>
            <p className="text-lg font-medium">Aucune entreprise pour l'instant</p>
            <button onClick={() => setModal(false)} className="btn btn-primary mt-4">+ Créer la première entreprise</button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Type</th>
                  <th>Ville</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {allCompanies.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="font-medium text-primary-700">{c.name}</td>
                    <td className="text-gray-500 text-sm">{t(`company.type.${c.type}` as any)}</td>
                    <td className="text-gray-500 text-sm">{c.city || '—'}</td>
                    <td className="text-gray-500 text-sm">{c.email || '—'}</td>
                    <td className="text-gray-500 text-sm">{c.phone || '—'}</td>
                    <td>
                      <button onClick={() => setModal(c)} className="btn btn-ghost btn-sm text-xs">{t('common.edit')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {modal !== null && (
          <CoModal
            company={modal || undefined}
            onClose={() => { setModal(null); setCoError('') }}
            onSave={handleCoSave}
            saving={coSaving}
            error={coError}
          />
        )}
      </div>
    )
  }

  // ── Vue régulière : formulaire de son entreprise ─────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">🏢</span>
        <h1 className="text-2xl font-bold text-gray-900">
          {isCreating ? t('company.create_title') : t('company.title')}
        </h1>
      </div>

      {isCreating && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          {t('company.create_desc')}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-5">
        {/* Nom */}
        <div>
          <label className="label">{t('company.name')} *</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Ex : DESIGN FACADES" />
        </div>

        {/* Type */}
        <div>
          <label className="label">{t('company.type')}</label>
          <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
            {COMPANY_TYPES.map(v => (
              <option key={v} value={v}>{t(`company.type.${v}` as any)}</option>
            ))}
          </select>
        </div>

        {/* Activité (si entreprise_metier) */}
        {form.type === 'entreprise_metier' && (
          <div>
            <label className="label">{t('company.activity')}</label>
            <input className="input" value={form.activity} onChange={e => set('activity', e.target.value)} placeholder="Ex : facade, peinture, electricite…" />
          </div>
        )}

        {/* Types de lots (si entreprise_metier) */}
        {form.type === 'entreprise_metier' && (
          <div>
            <label className="label">{t('company.lot_types')}</label>
            <p className="text-xs text-gray-500 mb-2">{t('company.lot_types_hint')}</p>
            <div className="grid grid-cols-2 gap-2">
              {FACADE_LOT_TYPES.map(lt => (
                <label key={lt} className="flex items-center gap-2 p-2 rounded border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={form.lot_types.includes(lt)}
                    onChange={() => toggleLotType(lt)}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm"><span className="font-mono text-xs bg-gray-100 px-1 rounded mr-1">{lt}</span>{FACADE_LOT_LABELS[lt]}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <hr className="border-gray-200" />

        {/* SIRET */}
        <div>
          <label className="label">{t('company.siret')}</label>
          <input className="input" value={form.siret} onChange={e => set('siret', e.target.value)} placeholder="12345678900012" />
        </div>

        {/* Adresse */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-3">
            <label className="label">{t('company.address')}</label>
            <input className="input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="12 rue de la Façade" />
          </div>
          <div>
            <label className="label">{t('company.postal_code')}</label>
            <input className="input" value={form.postal_code} onChange={e => set('postal_code', e.target.value)} placeholder="54000" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">{t('company.city')}</label>
            <input className="input" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Nancy" />
          </div>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">{t('company.phone')}</label>
            <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+33 3 83 00 00 00" />
          </div>
          <div>
            <label className="label">{t('company.email')}</label>
            <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@entreprise.fr" />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-600">✓ {t('company.saved')}</p>}

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? t('common.loading') : isCreating ? t('company.create') : t('company.save')}
          </button>
        </div>
      </form>

      {/* ── Section sous-traitants & collaborateurs ── */}
      {!isCreating && (
        <div className="mt-8">
          {/* En-tête */}
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">👷 Sous-traitants &amp; Collaborateurs</h2>
              <p className="text-xs text-gray-500 mt-0.5">{subs.length} collaborateur{subs.length !== 1 ? 's' : ''} enregistré{subs.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={downloadTemplate} className="btn btn-ghost btn-sm text-xs border border-gray-200">
                📥 Template Excel
              </button>
              <button onClick={() => importInputRef.current?.click()} className="btn btn-ghost btn-sm text-xs border border-gray-200">
                📤 Importer
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleImportFile}
              />
              <button onClick={() => setShowAddSub(true)} className="btn btn-primary btn-sm text-xs">
                ＋ Ajouter
              </button>
            </div>
          </div>

          {/* Résultat import */}
          {importResult && (
            <div className={`mb-3 px-3 py-2 rounded text-sm ${importResult.created > 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              {importResult.created > 0
                ? `✅ Import réussi : ${importResult.created} créé${importResult.created > 1 ? 's' : ''}${importResult.skipped > 0 ? `, ${importResult.skipped} ignoré${importResult.skipped > 1 ? 's' : ''} (doublons)` : ''}`
                : `⚠️ Aucune ligne importée (${importResult.skipped} ignorée${importResult.skipped > 1 ? 's' : ''})`}
              <button onClick={() => setImportResult(null)} className="ml-2 text-gray-400 hover:text-gray-600">✕</button>
            </div>
          )}

          {/* Prévisualisation import */}
          {importPreview && (
            <div className="mb-4 border border-indigo-200 rounded-lg overflow-hidden bg-indigo-50">
              <div className="px-3 py-2 flex items-center justify-between bg-indigo-100 border-b border-indigo-200">
                <span className="text-sm font-medium text-indigo-800">
                  Aperçu : {importRows.length} ligne{importRows.length > 1 ? 's' : ''} détectée{importRows.length > 1 ? 's' : ''}
                  {importRows.length > 10 ? ` (10 premières affichées)` : ''}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => { setImportPreview(null); setImportRows([]) }} className="btn btn-ghost btn-sm text-xs">
                    Annuler
                  </button>
                  <button onClick={confirmImport} disabled={importing} className="btn btn-primary btn-sm text-xs">
                    {importing ? '⏳ Import…' : `✓ Confirmer l'import`}
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="table text-xs">
                  <thead>
                    <tr>
                      {Object.keys(importPreview[0] || {}).slice(0, 8).map(k => (
                        <th key={k} className="text-xs">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).slice(0, 8).map((v: any, j) => (
                          <td key={j} className="text-xs text-gray-600">{String(v) || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Liste sous-traitants */}
          {subs.length === 0 ? (
            <div className="text-center py-10 text-gray-400 border border-dashed border-gray-200 rounded-lg">
              <div className="text-3xl mb-2">👷</div>
              <p className="text-sm">Aucun collaborateur enregistré</p>
              <p className="text-xs mt-1">Ajoutez des sous-traitants ou importez un fichier Excel</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Entreprise</th>
                    <th>Métier</th>
                    <th>SIRET</th>
                    <th>Type</th>
                    <th>Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="font-medium text-gray-900">
                        {[s.first_name, s.last_name].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="text-gray-600 text-sm">{s.company_name || '—'}</td>
                      <td className="text-gray-500 text-sm">{s.trade || '—'}</td>
                      <td className="text-gray-400 text-xs font-mono">{s.siret || '—'}</td>
                      <td>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.user_type === 'employee'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {s.user_type === 'employee' ? '👷 Salarié' : '🏢 Sous-traitant'}
                        </span>
                      </td>
                      <td className="text-gray-400 text-xs">
                        {s.email && !s.email.startsWith('noemail_') ? s.email : s.phone || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal ajout sous-traitant ── */}
      {showAddSub && (
        <AddSubModal
          onClose={() => setShowAddSub(false)}
          onCreated={(newUser) => {
            setSubs(prev => [...prev, newUser])
            setShowAddSub(false)
          }}
        />
      )}
    </div>
  )
}
