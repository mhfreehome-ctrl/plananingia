import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useT } from '../../i18n'
import { api } from '../../api/client'
import { useAuth } from '../../store/auth'
import ClientSelect from '../../components/ClientSelect'

// ─── Types de lots DESIGN FACADES ────────────────────────────────────────────
// Calqués sur le planning Excel réel (ECHAF / ITE / ENDUIT / BARDAGE / LASURE / RAVALEMENT)
const FACADE_LOT_OPTIONS = [
  { key: 'ECHAF',      icon: '🏗', label: 'Échafaudage',   desc: 'Pose et dépose (souvent ECHAF X = externe)' },
  { key: 'ITE',        icon: '🧱', label: 'ITE',           desc: 'Isolation thermique extérieure + enduit finition' },
  { key: 'ENDUIT',     icon: '🪣', label: 'Enduit projeté',desc: 'Enduit projeté sans isolation' },
  { key: 'BARDAGE',    icon: '🔩', label: 'Bardage',       desc: 'Ossature métallique + parement' },
  { key: 'LASURE',     icon: '🎨', label: 'Lasure',        desc: 'Lasure / hydrofuge / finition' },
  { key: 'RAVALEMENT', icon: '🔨', label: 'Ravalement',    desc: 'Réhabilitation façade existante' },
]

export default function ProjectCreate() {
  const t = useT()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const isMetier = user?.company_type === 'entreprise_metier'
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lotTypes, setLotTypes] = useState<string[]>([])
  const [clientId, setClientId] = useState<string | null>(null)
  const [parentProjectId, setParentProjectId] = useState<string>(searchParams.get('parent') || '')
  const [programProjects, setProgramProjects] = useState<any[]>([])
  const [form, setForm] = useState({
    name: '', reference: '', address: '', city: '', postal_code: '',
    client_name: '', client_email: '', client_phone: '',
    description: '', start_date: '', duration_weeks: '', budget_ht: '',
    status: 'devis', meeting_time: '',
  })

  useEffect(() => {
    // Charger les projets pouvant être des parents (standalone + program)
    api.projects.list().then((list: any[]) => {
      setProgramProjects(list.filter(p => p.project_type !== 'sub_project'))
    }).catch(() => {})
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const toggleLotType = (key: string) => {
    setLotTypes(prev => prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError(t('projects.name_required')); return }
    setSaving(true); setError('')
    try {
      const proj = await api.projects.create({
        ...form,
        client_id: clientId || null,
        duration_weeks: form.duration_weeks ? Number(form.duration_weeks) : null,
        budget_ht: form.budget_ht ? Number(form.budget_ht) : null,
        lot_types: lotTypes.length > 0 ? lotTypes : null,
        meeting_time: form.meeting_time || null,
        parent_project_id: parentProjectId || null,
        project_type: parentProjectId ? 'sub_project' : 'standalone',
      })
      navigate(`/projects/${proj.id}`)
    } catch (e: any) {
      setError(e.message)
    } finally { setSaving(false) }
  }

  const isFacade = lotTypes.length > 0

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm">← {t('common.back')}</button>
        <h1 className="text-2xl font-bold text-gray-900">{t('projects.new')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="card card-body space-y-5">

        {/* ─── Lots DESIGN FACADES (cases à cocher) — seulement pour entreprise_metier ─── */}
        {isMetier && (
          <div>
            <label className="label mb-2 flex items-center gap-2">
              {t('projects.facade_lots')}
              <span className="text-xs text-gray-400 font-normal">{t('projects.facade_lots_hint')}</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FACADE_LOT_OPTIONS.map(opt => {
                const active = lotTypes.includes(opt.key)
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => toggleLotType(opt.key)}
                    title={opt.desc}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium text-left transition-all ${
                      active
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">{opt.icon}</span>
                    <span className="flex-1">{opt.label}</span>
                    {active && <span className="text-blue-500 text-xs">✓</span>}
                  </button>
                )
              })}
            </div>
            {isFacade && (
              <p className="mt-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded px-3 py-1.5">
                ✓ Mode <strong>DESIGN FACADES</strong> — le planning IA utilisera les lots façade prédéfinis ({lotTypes.join(', ')})
              </p>
            )}
          </div>
        )}

        {/* ─── Rattachement à un programme (sous-projet) ─── */}
        <div className="field">
          <label className="label flex items-center gap-2">
            🏗 Rattacher à un programme
            <span className="text-xs text-gray-400 font-normal">(optionnel — crée un sous-projet)</span>
          </label>
          <select className="select" value={parentProjectId} onChange={e => setParentProjectId(e.target.value)}>
            <option value="">— Projet indépendant —</option>
            {programProjects.map(p => (
              <option key={p.id} value={p.id}>
                {p.project_type === 'program' ? '🏗 ' : ''}{p.name}{p.reference ? ` (${p.reference})` : ''}
              </option>
            ))}
          </select>
          {parentProjectId && (
            <p className="mt-1 text-xs text-sky-600 bg-sky-50 border border-sky-100 rounded px-3 py-1.5">
              ↳ Ce projet sera un <strong>sous-projet</strong> rattaché au programme sélectionné
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="field sm:col-span-2">
            <label className="label">{t('projects.name')} *</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required
              placeholder="ex : NOVA HOMES — 49 LOGTS SANDER KISS" />
          </div>
          <div className="field">
            <label className="label">{t('projects.reference')}</label>
            <input className="input" value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="LYON-2026-001" />
          </div>
          <div className="field">
            <label className="label">{t('projects.status')}</label>
            <select className="select" value={form.status} onChange={e => set('status', e.target.value)}>
              {(['devis','programme','en_cours','livre','sav'] as const).map(s => (
                <option key={s} value={s}>{t(`projects.status.${s}`)}</option>
              ))}
            </select>
          </div>
          <div className="field sm:col-span-2">
            <label className="label">{t('projects.address')}</label>
            <input className="input" value={form.address} onChange={e => set('address', e.target.value)} />
          </div>
          <div className="field">
            <label className="label">{t('projects.city')}</label>
            <input className="input" value={form.city} onChange={e => set('city', e.target.value)} />
          </div>
          <div className="field">
            <label className="label">{t('projects.postal_code')}</label>
            <input className="input" value={form.postal_code} onChange={e => set('postal_code', e.target.value)} />
          </div>

          {/* ─── Client (dropdown avec création inline) ─────────────── */}
          <div className="field sm:col-span-2">
            <label className="label">{t('projects.client_owner')}</label>
            <ClientSelect
              clientId={clientId}
              clientName={form.client_name}
              onChange={(id, name) => {
                setClientId(id)
                set('client_name', name)
              }}
            />
          </div>
          {/* Email client : affiché uniquement si saisi manuellement (pas de clientId) */}
          {!clientId && (
            <div className="field sm:col-span-2">
              <label className="label">{t('projects.client_email')}</label>
              <input type="email" className="input" value={form.client_email}
                onChange={e => set('client_email', e.target.value)}
                placeholder="contact@client.fr" />
            </div>
          )}

          <div className="field">
            <label className="label">{t('projects.start_date')}</label>
            <input type="date" className="input" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          </div>
          <div className="field">
            <label className="label">{t('projects.duration_weeks')}</label>
            <input type="number" className="input" min={1} value={form.duration_weeks} onChange={e => set('duration_weeks', e.target.value)} />
          </div>
          <div className="field">
            <label className="label">{t('projects.meeting_time')}</label>
            <input className="input" value={form.meeting_time} onChange={e => set('meeting_time', e.target.value)}
              placeholder="ex : Lundi 14h, Mercredi 9h30…" />
          </div>
          <div className="field sm:col-span-2">
            <label className="label">{t('projects.description')}</label>
            <textarea className="input resize-none" rows={4}
              placeholder="Décrivez le projet : type de construction, surface, spécificités... (l'IA utilisera cette description pour générer le planning)"
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn btn-ghost">{t('common.cancel')}</button>
          <button type="submit" disabled={saving} className="btn btn-accent">
            {saving ? t('common.loading') : t('projects.create')}
          </button>
        </div>
      </form>
    </div>
  )
}
