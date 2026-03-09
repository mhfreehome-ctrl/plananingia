import { useState, useEffect } from 'react'
import { useAuth } from '../store/auth'
import { useT } from '../i18n'
import { api } from '../api/client'

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
    </div>
  )
}
