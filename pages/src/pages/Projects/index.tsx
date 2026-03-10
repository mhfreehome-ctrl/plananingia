import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useT } from '../../i18n'
import { api } from '../../api/client'

// ── Import Document Modal ──────────────────────────────────────────────────────

type ImportStep = 'upload' | 'analyzing' | 'confirm' | 'creating'

function ImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (projectId: string) => void }) {
  const [step, setStep]       = useState<ImportStep>('upload')
  const [file, setFile]       = useState<File | null>(null)
  const [error, setError]     = useState('')
  const [extracted, setExtracted] = useState<any>(null)

  // Champs du formulaire de confirmation
  const [projectName, setProjectName]   = useState('')
  const [clientName, setClientName]     = useState('')
  const [reference, setReference]       = useState('')
  const [address, setAddress]           = useState('')
  const [city, setCity]                 = useState('')
  const [postalCode, setPostalCode]     = useState('')
  const [startDate, setStartDate]       = useState('')
  const [durationWeeks, setDurationWeeks] = useState<number>(8)

  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase() || ''
    if (!['pdf', 'xlsx', 'xls'].includes(ext)) {
      setError('Format non supporté. Utilisez PDF ou Excel (.xlsx)')
      return
    }
    setFile(f)
    setError('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  // Étape 1 → Étape 2 : analyser le document
  const handleAnalyze = async () => {
    if (!file) return
    setError('')
    setStep('analyzing')
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      let result: any

      if (ext === 'pdf') {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve((reader.result as string).split(',')[1])
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        result = await api.documentImport.analyzePDF(base64)
      } else {
        const { read, utils } = await import('xlsx')
        const buffer = await file.arrayBuffer()
        const wb = read(buffer, { type: 'buffer' })
        const content = wb.SheetNames.map(name =>
          `=== Feuille: ${name} ===\n${utils.sheet_to_csv(wb.Sheets[name])}`
        ).join('\n\n')
        result = await api.documentImport.analyzeExcel(content)
      }

      const data = result.extracted
      setExtracted(data)
      // Pré-remplir le formulaire
      setProjectName(data.project_name || file.name.replace(/\.[^/.]+$/, ''))
      setClientName(data.client_name || '')
      setReference(data.reference || '')
      setAddress(data.address || '')
      setCity(data.city || '')
      setPostalCode(data.postal_code || '')
      setStartDate(data.estimated_start || '')
      setDurationWeeks(data.estimated_duration_weeks || 8)
      setStep('confirm')
    } catch (e: any) {
      setError(e.message || 'Erreur lors de l\'analyse')
      setStep('upload')
    }
  }

  // Étape 2 → Étape 3 : créer le projet
  const handleCreate = async () => {
    if (!projectName.trim()) { setError('Le nom du projet est requis'); return }
    setError('')
    setStep('creating')
    try {
      const result = await api.documentImport.create({
        project_name: projectName.trim(),
        reference: reference.trim() || undefined,
        client_name: clientName.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        postal_code: postalCode.trim() || undefined,
        estimated_start: startDate || undefined,
        estimated_duration_weeks: durationWeeks,
        selected_lots: extracted?.selected_lots,
        extra_lots: extracted?.extra_lots,
        dependencies: extracted?.dependencies,
      })
      onSuccess(result.project.id)
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la création du projet')
      setStep('confirm')
    }
  }

  const lotsCount = (extracted?.selected_lots?.length || 0) + (extracted?.extra_lots?.length || 0)
  const depsCount = extracted?.dependencies?.length || 0

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">📄 Importer un devis / CCTP</h2>
            {step === 'confirm' && (
              <p className="text-xs text-gray-400 mt-0.5">
                Étape 2 / 2 — Vérifiez les informations extraites avant de créer le projet
              </p>
            )}
          </div>
          {step !== 'analyzing' && step !== 'creating' && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          )}
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* ── STEP : analyzing ── */}
          {(step === 'analyzing' || step === 'creating') && (
            <div className="text-center py-10 space-y-3">
              <div className="text-4xl animate-spin inline-block">⚙️</div>
              <p className="text-gray-700 font-medium">
                {step === 'analyzing' ? 'Analyse du document en cours…' : 'Création du projet…'}
              </p>
              <p className="text-sm text-gray-500">
                {step === 'analyzing'
                  ? 'Claude lit le document et identifie les corps de métier.\nCela peut prendre 15–30 secondes.'
                  : 'Création des lots et dépendances dans la base…'}
              </p>
            </div>
          )}

          {/* ── STEP : upload ── */}
          {step === 'upload' && (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
                }`}>
                <input
                  ref={inputRef} type="file" accept=".pdf,.xlsx,.xls" className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                {file ? (
                  <div className="space-y-1">
                    <div className="text-2xl">{file.name.endsWith('.pdf') ? '📕' : '📗'}</div>
                    <p className="font-medium text-green-700">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} Ko</p>
                    <button
                      onClick={e => { e.stopPropagation(); setFile(null) }}
                      className="text-xs text-red-500 hover:underline mt-1">
                      Changer de fichier
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-3xl text-gray-300">📁</div>
                    <p className="text-gray-600">Glissez un fichier ou cliquez pour sélectionner</p>
                    <p className="text-xs text-gray-400">PDF, Excel (.xlsx) — max 20 Mo</p>
                  </div>
                )}
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 space-y-1">
                <p className="font-semibold">Comment ça fonctionne :</p>
                <p>• Claude analyse le document (devis, DQE, CCTP…)</p>
                <p>• Les informations extraites vous sont présentées pour validation</p>
                <p>• Vous confirmez et ajustez avant la création du projet</p>
              </div>
            </>
          )}

          {/* ── STEP : confirm ── */}
          {step === 'confirm' && extracted && (
            <>
              {/* Résumé IA */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                <span className="text-green-600 text-lg">✓</span>
                <div className="text-sm text-green-800">
                  <p className="font-semibold">Document analysé avec succès</p>
                  <p className="text-green-700 mt-0.5">
                    {lotsCount} lot{lotsCount > 1 ? 's' : ''} détecté{lotsCount > 1 ? 's' : ''}
                    {depsCount > 0 ? ` · ${depsCount} dépendance${depsCount > 1 ? 's' : ''}` : ''}
                  </p>
                </div>
              </div>

              {/* Informations projet */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Informations projet</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nom du projet *</label>
                    <input type="text" className="input w-full" value={projectName}
                      onChange={e => setProjectName(e.target.value)} placeholder="Nom du projet" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Client / Maître d'ouvrage</label>
                    <input type="text" className="input w-full" value={clientName}
                      onChange={e => setClientName(e.target.value)} placeholder="Nom du client" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Référence / N° devis</label>
                    <input type="text" className="input w-full" value={reference}
                      onChange={e => setReference(e.target.value)} placeholder="Ex: DEV-2026-042" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Adresse du chantier</label>
                    <input type="text" className="input w-full" value={address}
                      onChange={e => setAddress(e.target.value)} placeholder="Adresse" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ville</label>
                    <input type="text" className="input w-full" value={city}
                      onChange={e => setCity(e.target.value)} placeholder="Ville" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Code postal</label>
                    <input type="text" className="input w-full" value={postalCode}
                      onChange={e => setPostalCode(e.target.value)} placeholder="57000" />
                  </div>
                </div>

                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">Planning</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date de début *</label>
                    <input type="date" className="input w-full" value={startDate}
                      onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Durée (semaines) *</label>
                    <input type="number" className="input w-full" min={1} max={260}
                      value={durationWeeks} onChange={e => setDurationWeeks(Number(e.target.value))} />
                  </div>
                </div>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
            </>
          )}
        </div>

        {/* Footer */}
        {step === 'upload' && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
            <button onClick={onClose} className="btn btn-secondary">Annuler</button>
            <button onClick={handleAnalyze} disabled={!file}
              className="btn btn-accent disabled:opacity-50 disabled:cursor-not-allowed">
              🔍 Analyser le document
            </button>
          </div>
        )}
        {step === 'confirm' && (
          <div className="flex justify-between gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
            <button onClick={() => { setStep('upload'); setExtracted(null) }} className="btn btn-secondary">
              ← Recommencer
            </button>
            <button onClick={handleCreate} disabled={!projectName.trim() || !startDate || !durationWeeks}
              className="btn btn-accent disabled:opacity-50 disabled:cursor-not-allowed">
              ✅ Créer le projet
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUS_LIST = ['devis', 'programme', 'en_cours', 'livre', 'sav'] as const

const STATUS_COLORS: Record<string, string> = {
  devis:     'badge-gray',
  programme: 'badge-blue',
  en_cours:  'badge-green',
  livre:     'badge-yellow',
  sav:       'badge-orange',
}

const STATUS_DOT: Record<string, string> = {
  devis:     'bg-gray-400',
  programme: 'bg-blue-500',
  en_cours:  'bg-green-500',
  livre:     'bg-yellow-500',
  sav:       'bg-orange-500',
}

type SortKey = 'name' | 'reference' | 'start_date' | 'status' | 'avg_progress' | 'lot_count' | 'created_at'

// Badge type de projet
function ProjectTypeBadge({ type }: { type: string }) {
  if (type === 'program') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 border border-violet-200 uppercase tracking-wide">
      🏗 Programme
    </span>
  )
  if (type === 'sub_project') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 border border-sky-200 uppercase tracking-wide">
      ↳ Sous-projet
    </span>
  )
  return null
}
type SortDir = 'asc' | 'desc'
type ViewMode = 'cards' | 'list'

// ── Helpers ───────────────────────────────────────────────────────────────────

function sortProjects(projects: any[], key: SortKey, dir: SortDir): any[] {
  return [...projects].sort((a, b) => {
    let va = a[key] ?? ''
    let vb = b[key] ?? ''
    // Numérique pour progress et lot_count
    if (key === 'avg_progress' || key === 'lot_count') {
      va = Number(va) || 0
      vb = Number(vb) || 0
      return dir === 'asc' ? va - vb : vb - va
    }
    // Comparaison string / date
    if (va < vb) return dir === 'asc' ? -1 : 1
    if (va > vb) return dir === 'asc' ? 1 : -1
    return 0
  })
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Composants tête de colonne triable ───────────────────────────────────────

function ThSort({
  children, sortKey, current, dir, onSort
}: {
  children: React.ReactNode
  sortKey: SortKey
  current: SortKey
  dir: SortDir
  onSort: (k: SortKey) => void
}) {
  const active = current === sortKey
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap group transition-colors ${
        active ? 'text-indigo-700 bg-indigo-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}>
      <span className="flex items-center gap-1">
        {children}
        <span className={`text-[10px] transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
          {active ? (dir === 'asc' ? '▲' : '▼') : '▼'}
        </span>
      </span>
    </th>
  )
}

// ── Barre de progression mini ─────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all ${
            pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-indigo-500' : 'bg-amber-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right font-medium">{pct}%</span>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ════════════════════════════════════════════════════════════

export default function Projects() {
  const t = useT()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [duplicating, setDuplicating] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)

  const handleDuplicate = async (p: any) => {
    if (!window.confirm(`Dupliquer "${p.name}" avec tous ses lots et sous-tâches ?`)) return
    setDuplicating(p.id)
    try {
      const newProj = await api.projects.duplicate(p.id)
      navigate(`/projects/${newProj.id}`)
    } catch {
      alert('Erreur lors de la duplication')
    } finally {
      setDuplicating(null)
    }
  }

  // ── Persistance vue + tri ─────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (localStorage.getItem('planningIA_projects_view') as ViewMode) || 'cards'
  )
  const [sortKey, setSortKey]   = useState<SortKey>(() =>
    (localStorage.getItem('planningIA_projects_sort') as SortKey) || 'start_date'
  )
  const [sortDir, setSortDir]   = useState<SortDir>(() =>
    (localStorage.getItem('planningIA_projects_dir') as SortDir) || 'desc'
  )

  const changeView = (v: ViewMode) => {
    setViewMode(v)
    localStorage.setItem('planningIA_projects_view', v)
  }
  const changeSort = (key: SortKey) => {
    const newDir: SortDir = sortKey === key ? (sortDir === 'asc' ? 'desc' : 'asc') : 'desc'
    setSortKey(key)
    setSortDir(newDir)
    localStorage.setItem('planningIA_projects_sort', key)
    localStorage.setItem('planningIA_projects_dir', newDir)
  }

  // ── Filtres (persistés en sessionStorage pour survivre à la navigation) ──
  const [search,           setSearch]           = useState(() => sessionStorage.getItem('pAI_proj_search')    || '')
  const [filterStatus,     setFilterStatus]     = useState(() => sessionStorage.getItem('pAI_proj_status')    || '')
  const [filterPlanning,   setFilterPlanning]   = useState<'with_lots' | 'no_lots' | ''>(() => (sessionStorage.getItem('pAI_proj_planning') || '') as any)
  const [filterDateFrom,   setFilterDateFrom]   = useState(() => sessionStorage.getItem('pAI_proj_dateFrom')  || '')
  const [filterDateTo,     setFilterDateTo]     = useState(() => sessionStorage.getItem('pAI_proj_dateTo')    || '')
  const [filterClient,     setFilterClient]     = useState(() => sessionStorage.getItem('pAI_proj_client')    || '')
  const [filterCity,       setFilterCity]       = useState(() => sessionStorage.getItem('pAI_proj_city')      || '')

  // Synchronise les filtres → sessionStorage à chaque changement
  useEffect(() => {
    sessionStorage.setItem('pAI_proj_search',    search)
    sessionStorage.setItem('pAI_proj_status',    filterStatus)
    sessionStorage.setItem('pAI_proj_planning',  filterPlanning)
    sessionStorage.setItem('pAI_proj_dateFrom',  filterDateFrom)
    sessionStorage.setItem('pAI_proj_dateTo',    filterDateTo)
    sessionStorage.setItem('pAI_proj_client',    filterClient)
    sessionStorage.setItem('pAI_proj_city',      filterCity)
  }, [search, filterStatus, filterPlanning, filterDateFrom, filterDateTo, filterClient, filterCity])

  useEffect(() => {
    api.projects.list().then(setProjects).finally(() => setLoading(false))
  }, [])

  const clientOptions = useMemo(() =>
    [...new Set(projects.map(p => p.client_name).filter(Boolean))].sort() as string[], [projects])
  const cityOptions = useMemo(() =>
    [...new Set(projects.map(p => p.city).filter(Boolean))].sort() as string[], [projects])

  // ── Filtrage + tri ────────────────────────────────────────
  const filtered = useMemo(() => {
    const f = projects
      .filter(p =>
        !search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        (p.city || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.reference || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.client_name || '').toLowerCase().includes(search.toLowerCase())
      )
      .filter(p => !filterStatus   || p.status === filterStatus)
      .filter(p => !filterPlanning || (filterPlanning === 'with_lots' ? (p.lot_count || 0) > 0 : (p.lot_count || 0) === 0))
      .filter(p => !filterDateFrom || (p.start_date && p.start_date >= filterDateFrom))
      .filter(p => !filterDateTo   || (p.start_date && p.start_date <= filterDateTo))
      .filter(p => !filterClient   || p.client_name === filterClient)
      .filter(p => !filterCity     || p.city === filterCity)
    return sortProjects(f, sortKey, sortDir)
  }, [projects, search, filterStatus, filterPlanning, filterDateFrom, filterDateTo, filterClient, filterCity, sortKey, sortDir])

  // ── Hiérarchie : intercaler les sous-projets sous leur parent ────────────────
  const hierarchical = useMemo(() => {
    const result: Array<{ project: any; isChild: boolean }> = []
    const childIds = new Set(projects.filter(p => p.parent_project_id).map(p => p.id))
    // Entrées racine dans filtered (pas de parent dans la liste filtrée)
    for (const p of filtered) {
      if (p.parent_project_id) continue // sous-projets traités via leur parent
      result.push({ project: p, isChild: false })
      // Si programme → insérer ses sous-projets (même non filtrés, pour ne pas casser la hiérachie)
      if (p.project_type === 'program' || (p.sub_projects_count || 0) > 0) {
        const children = projects
          .filter(sp => sp.parent_project_id === p.id)
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        for (const child of children) result.push({ project: child, isChild: true })
      }
    }
    // Sous-projets dont le parent n'est pas dans la liste filtrée (recherche directe)
    for (const p of filtered) {
      if (!p.parent_project_id) continue
      if (!result.find(r => r.project.id === p.id)) result.push({ project: p, isChild: true })
    }
    return result
  }, [filtered, projects])

  const hasFilters = filterStatus || filterPlanning || filterDateFrom || filterDateTo || filterClient || filterCity
  const clearFilters = () => {
    setFilterStatus(''); setFilterPlanning(''); setFilterDateFrom(''); setFilterDateTo('')
    setFilterClient(''); setFilterCity('')
  }

  // ── Labels tri pour les cartes ────────────────────────────
  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'start_date',    label: t('projects.start_date') },
    { key: 'name',          label: t('projects.sort.name') },
    { key: 'reference',     label: t('projects.sort.reference') },
    { key: 'status',        label: t('projects.status') },
    { key: 'avg_progress',  label: t('projects.progress') },
    { key: 'created_at',    label: t('projects.sort.created_at') },
  ]

  if (loading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>

  return (
    <div className="space-y-5">

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{t('projects.title')}</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImport(true)} className="btn btn-secondary">
            📄 Importer un devis
          </button>
          <Link to="/projects/new" className="btn btn-accent">{t('projects.new')}</Link>
        </div>
      </div>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onSuccess={(id) => { setShowImport(false); navigate(`/projects/${id}`) }}
        />
      )}

      {/* ── Barre recherche + mode + tri ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Recherche */}
        <input
          type="search"
          className="input flex-1 min-w-[200px] max-w-sm"
          placeholder={t('projects.search_placeholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Tri (mode cartes seulement) */}
        {viewMode === 'cards' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">{t('projects.sort_by')}</span>
            <select
              value={sortKey}
              onChange={e => { setSortKey(e.target.value as SortKey); localStorage.setItem('planningIA_projects_sort', e.target.value) }}
              className="input input-sm min-w-[140px]">
              {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            <button
              onClick={() => { const d: SortDir = sortDir === 'asc' ? 'desc' : 'asc'; setSortDir(d); localStorage.setItem('planningIA_projects_dir', d) }}
              className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-500 text-sm"
              title={sortDir === 'asc' ? t('projects.sort.asc') : t('projects.sort.desc')}>
              {sortDir === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        )}

        {/* Séparateur */}
        <div className="flex-1" />

        {/* Toggle vue */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
          <button
            onClick={() => changeView('cards')}
            title={t('projects.view_cards')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 4h7v7H4V4zm0 9h7v7H4v-7zm9-9h7v7h-7V4zm0 9h7v7h-7v-7z" />
            </svg>
          </button>
          <button
            onClick={() => changeView('list')}
            title={t('projects.view_list')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Filtres avancés ── */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
        {/* Statut */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('projects.status')}</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input input-sm min-w-[140px]">
            <option value="">{t('projects.filter_all')}</option>
            {STATUS_LIST.map(s => <option key={s} value={s}>{t(`projects.status.${s}` as any)}</option>)}
          </select>
        </div>

        {/* Planning CPM */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('projects.filter_planning')}</label>
          <select value={filterPlanning} onChange={e => setFilterPlanning(e.target.value as any)} className="input input-sm min-w-[140px]">
            <option value="">{t('projects.filter_all')}</option>
            <option value="with_lots">📋 {t('projects.filter_planning_with')}</option>
            <option value="no_lots">⬜ {t('projects.filter_planning_without')}</option>
          </select>
        </div>

        {/* Début chantier */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('projects.filter_date')}</label>
          <div className="flex items-center gap-1">
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="input input-sm" title="À partir du" />
            <span className="text-gray-400 text-sm">→</span>
            <input type="date" value={filterDateTo}   onChange={e => setFilterDateTo(e.target.value)}   className="input input-sm" title="Jusqu'au" />
          </div>
        </div>

        {/* Client */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('projects.client_name')}</label>
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="input input-sm min-w-[160px]">
            <option value="">{t('projects.filter_all')}</option>
            {clientOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Ville */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('projects.city')}</label>
          <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="input input-sm min-w-[140px]">
            <option value="">{t('projects.filter_all')}</option>
            {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Compteur + reset */}
        <div className="flex items-center gap-3 ml-auto self-end">
          {hasFilters && (
            <button onClick={clearFilters} className="btn btn-sm btn-ghost text-gray-500">
              ✕ {t('projects.clear_filters')}
            </button>
          )}
          <span className="text-sm text-gray-400 whitespace-nowrap font-medium">
            {filtered.length} {t('projects.count')}
          </span>
        </div>
      </div>

      {/* ── Contenu ── */}
      {filtered.length === 0 ? (
        <div className="card card-body text-center text-gray-500 py-16">
          <p className="mb-4">
            {projects.length === 0 ? t('dashboard.no_projects') : t('projects.no_filter_results')}
          </p>
          {projects.length === 0 && (
            <Link to="/projects/new" className="btn btn-primary">{t('projects.new')}</Link>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        // ── VUE CARTES ──────────────────────────────────────
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {hierarchical.map(({ project: p, isChild }) => (
            <div key={p.id} className={`card hover:shadow-md transition-all hover:-translate-y-0.5 relative group ${isChild ? 'ml-6 border-l-4 border-sky-300' : ''}`}>
              <button
                onClick={() => handleDuplicate(p)}
                disabled={duplicating === p.id}
                title="Dupliquer ce projet"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 text-sm disabled:opacity-30">
                {duplicating === p.id ? '…' : '⧉'}
              </button>
            <Link to={`/projects/${p.id}`} className="block">
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <ProjectTypeBadge type={p.project_type || 'standalone'} />
                    </div>
                    <h3 className="font-semibold text-gray-900 leading-tight truncate">{p.name}</h3>
                    {p.reference && <p className="text-xs text-gray-400 mt-0.5 font-mono">{p.reference}</p>}
                  </div>
                  <span className={`${STATUS_COLORS[p.status] || 'badge-gray'} flex-shrink-0`}>
                    {t(`projects.status.${p.status}` as any)}
                  </span>
                </div>

                {p.city && (
                  <p className="text-sm text-gray-500 mb-1 truncate">
                    📍 {p.address ? `${p.address}, ` : ''}{p.city}
                  </p>
                )}
                {p.client_name && (
                  <p className="text-sm text-gray-500 mb-3 truncate">👤 {p.client_name}</p>
                )}

                <ProgressBar pct={p.avg_progress || 0} />

                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                  <span>
                    {p.lot_count || 0} {t('projects.col_lots')}
                    {(p.sub_projects_count || 0) > 0 && (
                      <span className="ml-2 text-violet-500">· {p.sub_projects_count} sous-projet{p.sub_projects_count > 1 ? 's' : ''}</span>
                    )}
                  </span>
                  {p.start_date && <span>{t('projects.start_label')} : {fmtDate(p.start_date)}</span>}
                </div>
              </div>
            </Link>
            </div>
          ))}
        </div>
      ) : (
        // ── VUE LISTE ───────────────────────────────────────
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr>
                  <ThSort sortKey="reference"    current={sortKey} dir={sortDir} onSort={changeSort}>{t('projects.sort.reference')}</ThSort>
                  <ThSort sortKey="name"         current={sortKey} dir={sortDir} onSort={changeSort}>{t('projects.name')}</ThSort>
                  <ThSort sortKey="status"       current={sortKey} dir={sortDir} onSort={changeSort}>{t('projects.status')}</ThSort>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{t('projects.col_client_city')}</th>
                  <ThSort sortKey="start_date"   current={sortKey} dir={sortDir} onSort={changeSort}>{t('projects.start_label')}</ThSort>
                  <ThSort sortKey="avg_progress" current={sortKey} dir={sortDir} onSort={changeSort}>{t('projects.progress')}</ThSort>
                  <ThSort sortKey="lot_count"    current={sortKey} dir={sortDir} onSort={changeSort}>{t('projects.col_lots')}</ThSort>
                  <th className="px-3 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {hierarchical.map(({ project: p, isChild }, idx) => (
                  <tr key={p.id}
                    className={`hover:bg-indigo-50/40 transition-colors group ${isChild ? 'bg-sky-50/60' : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40')}`}>
                    {/* Référence */}
                    <td className="px-3 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {isChild && <span className="text-sky-400 mr-1">↳</span>}
                      {p.reference || <span className="text-gray-300">—</span>}
                    </td>

                    {/* Nom */}
                    <td className="px-3 py-3 max-w-[220px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <ProjectTypeBadge type={p.project_type || 'standalone'} />
                        <Link to={`/projects/${p.id}`} className={`font-semibold hover:text-indigo-700 transition-colors block truncate ${isChild ? 'text-sky-800' : 'text-gray-800'}`}>
                          {p.name}
                        </Link>
                      </div>
                    </td>

                    {/* Statut */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[p.status] || 'bg-gray-400'}`} />
                        <span className="text-xs text-gray-600">{t(`projects.status.${p.status}` as any)}</span>
                      </span>
                    </td>

                    {/* Client / Ville */}
                    <td className="px-3 py-3 max-w-[180px]">
                      {p.client_name && <div className="text-xs text-gray-700 truncate">👤 {p.client_name}</div>}
                      {p.city        && <div className="text-xs text-gray-400 truncate">📍 {p.city}</div>}
                    </td>

                    {/* Date début */}
                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {fmtDate(p.start_date)}
                    </td>

                    {/* Avancement */}
                    <td className="px-3 py-3 min-w-[120px]">
                      <ProgressBar pct={p.avg_progress || 0} />
                    </td>

                    {/* Lots */}
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                        {p.lot_count || 0}
                      </span>
                      {(p.sub_projects_count || 0) > 0 && (
                        <div className="text-[10px] text-violet-500 mt-0.5">{p.sub_projects_count} ss-proj</div>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 opacity-50 group-hover:opacity-100 transition-all">
                        <Link to={`/projects/${p.id}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-red-200 text-red-500 hover:border-red-400 hover:bg-red-50 text-xs font-medium whitespace-nowrap">
                          {t('projects.open')} ↗
                        </Link>
                        <button
                          onClick={() => handleDuplicate(p)}
                          disabled={duplicating === p.id}
                          title="Dupliquer ce projet"
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 text-xs font-medium whitespace-nowrap disabled:opacity-40">
                          {duplicating === p.id ? '…' : '⧉'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pied de tableau */}
          <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-between bg-gray-50">
            <span className="text-xs text-gray-400">
              {filtered.length} {t('projects.count')}
              {hasFilters && ` ${t('projects.filtered')}`}
            </span>
            <span className="text-xs text-gray-400">
              {t('projects.sorted_by')} <strong className="text-gray-600">{SORT_OPTIONS.find(o => o.key === sortKey)?.label}</strong>
              {' '}{sortDir === 'asc' ? '↑' : '↓'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
