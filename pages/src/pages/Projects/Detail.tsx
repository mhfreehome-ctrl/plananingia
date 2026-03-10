import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useT, useI18n } from '../../i18n'
import { api } from '../../api/client'
import { useAuth } from '../../store/auth'
import GanttChart from '../../components/GanttChart'
import ProgressModal from '../../components/ProgressModal'
import ClientSelect from '../../components/ClientSelect'

type Tab = 'gantt' | 'lots' | 'deps' | 'subprojects'

const statusColors: Record<string, string> = {
  pending: 'badge-gray', active: 'badge-green', paused: 'badge-yellow', done: 'badge-blue', with_reserves: 'badge-orange'
}

const FACADE_LOT_OPTIONS = [
  { key: 'ECHAF',      icon: '🏗', label: 'Échafaudage',    desc: 'Pose et dépose (souvent ECHAF X = externe)' },
  { key: 'ITE',        icon: '🧱', label: 'ITE',            desc: 'Isolation thermique extérieure + enduit finition' },
  { key: 'ENDUIT',     icon: '🪣', label: 'Enduit projeté', desc: 'Enduit projeté sans isolation' },
  { key: 'BARDAGE',    icon: '🔩', label: 'Bardage',        desc: 'Ossature métallique + parement' },
  { key: 'LASURE',     icon: '🎨', label: 'Lasure',         desc: 'Lasure / hydrofuge / finition' },
  { key: 'RAVALEMENT', icon: '🔨', label: 'Ravalement',     desc: 'Réhabilitation façade existante' },
]

function parseLotTypes(raw: any): string[] {
  if (!raw) return []
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw }
  catch { return [] }
}

// Labels des catégories du catalogue
const CATEGORY_LABELS: Record<string, string> = {
  ECHAF: '🏗 Échafaudage', ITE: '🧱 ITE', ENDUIT: '🪣 Enduit', BARDAGE: '🔩 Bardage',
  LASURE: '🎨 Lasure', RAVALEMENT: '🔨 Ravalement', GENERAL: '⚙️ Général',
  'Extérieur': '🌿 Extérieur', 'Tous niveaux': '🏢 Tous niveaux',
  'Toiture': '🏠 Toiture', 'Façades': '🪟 Façades', BTP: '🏗 BTP',
}

// ─── CatalogModal ───────────────────────────────────────────────────────────
function CatalogModal({ existingCodes, onClose, onSubmit, saving }: {
  existingCodes: Set<string>
  onClose: () => void
  onSubmit: (codes: string[]) => void
  saving: boolean
}) {
  const [catalog, setCatalog] = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loadingCatalog, setLoadingCatalog] = useState(true)

  useEffect(() => {
    api.lots.catalog().then(setCatalog).finally(() => setLoadingCatalog(false))
  }, [])

  const toggle = (code: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code); else next.add(code)
      return next
    })
  }

  // Grouper par catégorie
  const grouped: Record<string, any[]> = {}
  for (const l of catalog) {
    const cat = l.category || 'BTP'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(l)
  }

  const newCount = [...selected].filter(c => !existingCodes.has(c)).length

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 640, maxHeight: '80vh' }}>
        <div className="modal-header">
          <h3 className="font-semibold">📚 Sélectionner des lots dans le catalogue</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="modal-body overflow-y-auto" style={{ maxHeight: '55vh' }}>
          {loadingCatalog ? (
            <div className="text-center py-8 text-gray-400">Chargement du catalogue...</div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {CATEGORY_LABELS[cat] || cat}
                  </div>
                  <div className="space-y-1">
                    {items.map((l: any) => {
                      const inProject = existingCodes.has(l.code)
                      const isSelected = selected.has(l.code)
                      return (
                        <label
                          key={l.code}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            inProject ? 'opacity-40 cursor-not-allowed bg-gray-50' :
                            isSelected ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50'
                          } ${l.parent_code ? 'pl-8' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={inProject || isSelected}
                            disabled={inProject}
                            onChange={() => !inProject && toggle(l.code)}
                            className="w-4 h-4 text-primary-600"
                          />
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                          <span className="font-mono text-xs text-gray-400 w-12 flex-shrink-0">{l.code}</span>
                          <span className={`text-sm flex-1 ${inProject ? 'line-through' : ''}`}>{l.name}</span>
                          <span className="text-xs text-gray-400 flex-shrink-0">{l.duration_days}j</span>
                          {inProject && <span className="text-xs text-green-600 flex-shrink-0">✓ déjà ajouté</span>}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} type="button" className="btn btn-ghost">Annuler</button>
          <button
            onClick={() => onSubmit([...selected].filter(c => !existingCodes.has(c)))}
            disabled={saving || newCount === 0}
            className="btn btn-primary"
          >
            {saving ? 'Ajout en cours...' : `Ajouter ${newCount > 0 ? newCount + ' lot(s)' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Tri : sous-lots regroupés juste après leur lot parent */
function sortLotsWithSubLots(rawLots: any[]): any[] {
  const parents = rawLots.filter(l => !l.parent_lot_id)
  const result: any[] = []
  for (const parent of parents) {
    result.push(parent)
    const children = rawLots.filter(l => l.parent_lot_id === parent.id)
    result.push(...children)
  }
  // Sous-lots orphelins (ne devrait pas arriver)
  const includedIds = new Set(result.map(l => l.id))
  for (const l of rawLots) {
    if (!includedIds.has(l.id)) result.push(l)
  }
  return result
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const t = useT()
  const { lang } = useI18n()
  const navigate = useNavigate()
  const { user: authUser } = useAuth()
  const isFacadeCompany = authUser?.company_type === 'entreprise_metier'
  const [tab, setTab] = useState<Tab>('gantt')
  const [project, setProject] = useState<any>(null)
  const [gantt, setGantt] = useState<{ lots: any[]; dependencies: any[] } | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [cpmLoading, setCpmLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [progressLot, setProgressLot] = useState<any>(null)
  const [lotModal, setLotModal] = useState<any>(null)  // {lot, mode: 'edit'|'add'}
  const [splitModal, setSplitModal] = useState<any>(null) // {lot: parentLot}
  const [catalogModal, setCatalogModal] = useState(false)
  const [catalogSaving, setCatalogSaving] = useState(false)
  const [editProjectModal, setEditProjectModal] = useState(false)
  const [depModal, setDepModal] = useState(false)
  const [newDep, setNewDep] = useState({ predecessor_id: '', successor_id: '', type: 'FS', lag_days: 0 })
  const [chantierType, setChantierType] = useState<string>('')
  const [milestones, setMilestones] = useState<any[]>([])
  const [milestoneModal, setMilestoneModal] = useState<any>(null) // {milestone?, mode: 'add'|'edit'}
  const [lotTasksMap, setLotTasksMap] = useState<Record<string, any[]>>({}) // lot_id → tasks[]
  const [lotAssignmentsMap, setLotAssignmentsMap] = useState<Record<string, any[]>>({}) // lot_id → assignments[]
  const [taskModal, setTaskModal] = useState<any>(null) // {lotId, task?, mode: 'add'|'edit'}
  const [teams, setTeams] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [trainModal, setTrainModal] = useState(false)

  const loadData = useCallback(async () => {
    if (!id) return
    try {
      const [proj, g, usrs, ms, allTasks, allAssignments, ts] = await Promise.all([
        api.projects.get(id),                                                                          // CRITIQUE — si échoue → redirect
        api.planning.gantt(id).catch(() => ({ project: null, lots: [], dependencies: [] })),          // Non-critique
        api.users.list().catch(() => []),                                                              // Non-critique
        api.milestones.list(id).catch(() => []),                                                      // Non-critique
        api.lotTasks.listForProject(id).catch(() => []),                                              // Non-critique
        api.lotAssignments.listForProject(id).catch(() => []),                                        // Non-critique
        api.teams.list().catch(() => []),                                                              // Non-critique
      ])
      setProject(proj)
      setGantt(g)
      setUsers(usrs.filter((u: any) => u.user_type === 'subcontractor'))
      setEmployees(usrs.filter((u: any) => u.user_type === 'employee'))
      // Auto-detect facade mode
      const lt = parseLotTypes(proj.lot_types)
      if (lt.length > 0) setChantierType('facade')
      setTeams(ts)
      setMilestones(ms)
      // Group tasks by lot_id
      const tmap: Record<string, any[]> = {}
      for (const task of allTasks) {
        if (!tmap[task.lot_id]) tmap[task.lot_id] = []
        tmap[task.lot_id].push(task)
      }
      setLotTasksMap(tmap)
      // Group assignments by lot_id
      const amap: Record<string, any[]> = {}
      for (const asgn of allAssignments) {
        if (!amap[asgn.lot_id]) amap[asgn.lot_id] = []
        amap[asgn.lot_id].push(asgn)
      }
      setLotAssignmentsMap(amap)
    } catch { navigate('/projects') }
    finally { setLoading(false) }
  }, [id, navigate])

  useEffect(() => { loadData() }, [loadData])

  const handleAI = async () => {
    setAiLoading(true); setMsg('')
    try {
      const r = await api.planning.generateAI(id!, chantierType || undefined)
      setMsg(r.analysis || t('planning.ai_success'))
      await loadData()
    } catch (e: any) { setMsg(e.message) }
    finally { setAiLoading(false) }
  }

  const handleCPM = async () => {
    setCpmLoading(true); setMsg('')
    try {
      const r = await api.planning.computeCPM(id!)
      setMsg(`${t('planning.cpm_success')} — ${r.critical_lots} ${t('planning.critical_count')}, ${r.total_days} ${t('planning.total_days')}`)
      await loadData()
    } catch (e: any) { setMsg(e.message) }
    finally { setCpmLoading(false) }
  }

  const handleInitLots = async () => {
    if (!confirm(t('lots.init_confirm'))) return
    try { await api.lots.init(id!); await loadData() }
    catch (e: any) { setMsg(e.message) }
  }

  const handleFromCatalog = async (codes: string[]) => {
    if (!codes.length) { setCatalogModal(false); return }
    setCatalogSaving(true)
    try {
      await api.lots.fromCatalog(id!, codes)
      setCatalogModal(false)
      await loadData()
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setCatalogSaving(false)
    }
  }

  const handleDeleteLot = async (lotId: string) => {
    if (!confirm('Supprimer ce lot ?')) return
    await api.lots.delete(lotId); await loadData()
  }

  const handleSaveLot = async (e: React.FormEvent, form: any) => {
    e.preventDefault()
    try {
      if (lotModal.mode === 'add') await api.lots.create(id!, form)
      else await api.lots.update(lotModal.lot.id, form)
      setLotModal(null); await loadData()
    } catch (e: any) { setMsg(e.message) }
  }

  const handleCreateSublot = async (e: React.FormEvent, form: any, parentLotId: string) => {
    e.preventDefault()
    try {
      await api.lots.create(id!, { ...form, parent_lot_id: parentLotId })
      setSplitModal(null); await loadData()
    } catch (e: any) { setMsg(e.message) }
  }

  const handleTrain = async (e: React.FormEvent, payload: { lot_ids: string[]; zones: string[]; lag_days: number; dep_type: string }) => {
    e.preventDefault()
    try {
      const r = await api.lots.train(id!, payload)
      setTrainModal(false)
      setMsg(`🚂 ${r.created} sous-lot(s) créés — lancez le CPM pour recalculer le planning`)
      await loadData()
    } catch (e: any) { setMsg(e.message) }
  }

  const handleSaveProject = async (e: React.FormEvent, form: any) => {
    e.preventDefault()
    try {
      await api.projects.update(id!, form)
      setEditProjectModal(false); await loadData()
    } catch (e: any) { setMsg(e.message) }
  }

  const handleAddDep = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.deps.create(id!, newDep)
      setDepModal(false); setNewDep({ predecessor_id: '', successor_id: '', type: 'FS', lag_days: 0 })
      await loadData()
    } catch (e: any) { setMsg(e.message) }
  }

  const handleDeleteDep = async (depId: string) => {
    await api.deps.delete(depId); await loadData()
  }

  // Handlers pour la création/suppression/modification visuelle des liens sur le Gantt
  const handleGanttDepCreate = async (predId: string, succId: string, type: string, lag: number) => {
    await api.deps.create(id!, { predecessor_id: predId, successor_id: succId, type, lag_days: lag })
    await loadData()
  }
  const handleGanttDepDelete = async (depId: string) => {
    await api.deps.delete(depId); await loadData()
  }
  const handleGanttDepUpdate = async (depId: string, type: string, lag: number) => {
    const dep = (deps as any[]).find((d: any) => d.id === depId)
    if (!dep) return
    await api.deps.delete(depId)
    await api.deps.create(id!, { predecessor_id: dep.predecessor_id, successor_id: dep.successor_id, type, lag_days: lag })
    await loadData()
  }

  const handleSaveMilestone = async (e: React.FormEvent, form: any) => {
    e.preventDefault()
    try {
      if (milestoneModal.mode === 'add') {
        await api.milestones.create(id!, form)
      } else {
        await api.milestones.update(milestoneModal.milestone.id, form)
      }
      setMilestoneModal(null)
      const ms = await api.milestones.list(id!)
      setMilestones(ms)
    } catch (e: any) { setMsg(e.message) }
  }

  const handleDeleteMilestone = async (msId: string) => {
    try {
      await api.milestones.delete(msId)
      setMilestoneModal(null)
      const ms = await api.milestones.list(id!)
      setMilestones(ms)
    } catch (e: any) { setMsg(e.message) }
  }

  const handleSaveLotTask = async (lotId: string, form: any, taskId?: string) => {
    try {
      if (taskId) await api.lotTasks.update(taskId, form)
      else await api.lotTasks.create(lotId, form)
      const allTasks = await api.lotTasks.listForProject(id!)
      const tmap: Record<string, any[]> = {}
      for (const task of allTasks) {
        if (!tmap[task.lot_id]) tmap[task.lot_id] = []
        tmap[task.lot_id].push(task)
      }
      setLotTasksMap(tmap)
      return true
    } catch (e: any) { setMsg(e.message); return false }
  }

  const handleDeleteLotTask = async (taskId: string) => {
    if (!confirm('Supprimer cette sous-tâche ?')) return
    try {
      await api.lotTasks.delete(taskId)
      const allTasks = await api.lotTasks.listForProject(id!)
      const tmap: Record<string, any[]> = {}
      for (const task of allTasks) {
        if (!tmap[task.lot_id]) tmap[task.lot_id] = []
        tmap[task.lot_id].push(task)
      }
      setLotTasksMap(tmap)
    } catch (e: any) { setMsg(e.message) }
  }

  const handleDeleteProject = async () => {
    if (!confirm(t('projects.delete_confirm'))) return
    await api.projects.delete(id!); navigate('/projects')
  }

  if (loading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
  if (!project || !gantt) return null

  const lots = sortLotsWithSubLots(gantt.lots)
  const deps = gantt.dependencies
  const hasDates = lots.some(l => l.early_finish > 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => navigate(-1)} className="text-sm text-gray-400 hover:text-gray-600">← {t('common.back')}</button>
            {project.parent_project && (
              <>
                <span className="text-gray-300 text-sm">·</span>
                <Link to={`/projects/${project.parent_project.id}`} className="text-sm text-violet-500 hover:text-violet-700 font-medium">
                  🏗 {project.parent_project.name}
                </Link>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            {project.project_type === 'program' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 border border-violet-200 uppercase tracking-wide">🏗 Programme</span>
            )}
            {project.project_type === 'sub_project' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 border border-sky-200 uppercase tracking-wide">↳ Sous-projet</span>
            )}
          </div>
          {project.reference && <p className="text-sm text-gray-400">{project.reference}</p>}
          {project.city && <p className="text-sm text-gray-500">📍 {project.address ? `${project.address}, ` : ''}{project.city}</p>}
          {parseLotTypes(project.lot_types).length > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {parseLotTypes(project.lot_types).map((k: string) => {
                const opt = FACADE_LOT_OPTIONS.find(o => o.key === k)
                return opt ? (
                  <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{opt.icon} {opt.label}</span>
                ) : null
              })}
              <span className="text-xs text-blue-400 ml-0.5">DESIGN FACADES</span>
            </div>
          )}
          {project.meeting_time && (
            <p className="text-sm text-gray-500 mt-0.5">📅 Réunion : {project.meeting_time}</p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {/* Chantier type selector + AI button */}
          <div className="flex items-center gap-1">
            {isFacadeCompany ? (
              <select value={chantierType} onChange={e => setChantierType(e.target.value)}
                className="select text-xs h-8 py-0 border-gray-300 rounded-l-md rounded-r-none border-r-0" style={{ minWidth: 140 }}>
                <option value="facade">🏗 Façade (auto)</option>
                <option value="">Personnalisé</option>
              </select>
            ) : (
              <select value={chantierType} onChange={e => setChantierType(e.target.value)}
                className="select text-xs h-8 py-0 border-gray-300 rounded-l-md rounded-r-none border-r-0" style={{ minWidth: 140 }}>
                <option value="">Type auto</option>
                <option value="maison">🏠 Maison individuelle</option>
                <option value="collectif">🏢 Collectif résidentiel</option>
                <option value="tertiaire_depot">🏭 Tertiaire dépôt</option>
                <option value="tertiaire_bureaux">🏗 Tertiaire bureaux</option>
                <option value="entreprise">👥 Entreprise / Régie</option>
                <option value="facade">🏗 Façade</option>
              </select>
            )}
            <button onClick={handleAI} disabled={aiLoading}
              className="btn btn-accent btn-sm rounded-l-none" style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}>
              {aiLoading ? t('planning.ai_generating') : `🤖 ${t('planning.generate_ai')}`}
            </button>
          </div>
          <button onClick={handleCPM} disabled={cpmLoading || !lots.length} className="btn btn-primary btn-sm">
            {cpmLoading ? t('planning.cpm_computing') : `📐 ${t('planning.compute_cpm')}`}
          </button>
          <button onClick={() => navigate(`/projects/${id}/report`)} className="btn btn-ghost btn-sm" title="Rapport d'avancement PDF">
            📄 Rapport
          </button>
          <button onClick={() => setEditProjectModal(true)} className="btn btn-ghost btn-sm" title="Modifier la fiche projet">
            ✏️ Modifier
          </button>
          <button onClick={handleDeleteProject} className="btn btn-danger btn-sm">{t('projects.delete')}</button>
        </div>
      </div>

      {msg && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-3 rounded-lg flex justify-between">
          <span>{msg}</span><button onClick={() => setMsg('')} className="ml-4 text-blue-500">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {([['gantt', t('projects.gantt_tab')], ['lots', t('projects.lots_tab')], ['deps', t('projects.deps_tab')]] as [Tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
          {(project.project_type === 'program' || (project.sub_projects?.length || 0) > 0) && (
            <button onClick={() => setTab('subprojects')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${tab === 'subprojects' ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              🏗 Sous-projets
              {(project.sub_projects?.length || 0) > 0 && (
                <span className="text-xs bg-violet-100 text-violet-700 rounded-full px-1.5 py-0.5 font-bold">{project.sub_projects.length}</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* GANTT TAB */}
      {tab === 'gantt' && (
        <div className="card card-body">
          {/* Jalons toolbar */}
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Jalons</span>
            {milestones.length === 0 && <span className="text-xs text-gray-400 italic">Aucun jalon</span>}
            {milestones.map(m => (
              <button key={m.id} onClick={() => setMilestoneModal({ milestone: m, mode: 'edit' })}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border hover:opacity-80 transition-opacity"
                style={{ borderColor: m.color, color: m.color }}>
                <span style={{ fontSize: 10 }}>◆</span> {m.name}
              </button>
            ))}
            <button onClick={() => setMilestoneModal({ milestone: { name: '', date: project.start_date || new Date().toISOString().slice(0, 10), color: '#ef4444' }, mode: 'add' })}
              className="btn btn-ghost btn-sm text-xs ml-auto">
              + Ajouter jalon
            </button>
          </div>
          {hasDates ? (
            <GanttChart lots={lots} deps={deps} projectStartDate={project.start_date} lang={lang} projectId={id} onRefresh={loadData}
              milestones={milestones} onMilestoneClick={(m) => setMilestoneModal({ milestone: m, mode: 'edit' })}
              lotTasks={lotTasksMap} lotAssignments={lotAssignmentsMap}
              onDependencyCreate={handleGanttDepCreate}
              onDependencyDelete={handleGanttDepDelete}
              onDependencyUpdate={handleGanttDepUpdate}
              onLotClick={(lotId) => {
                const lot = lots.find((l: any) => l.id === lotId)
                if (lot) {
                  setTab('lots')
                  setLotModal({ lot, mode: 'edit' })
                }
              }}
              onTaskClick={(task, parentLot) => {
                const taskLot = lots.find((l: any) => l.id === parentLot.id)
                setTaskModal({ lotId: parentLot.id, lotName: parentLot.name, initialTaskId: task.id, lot: taskLot || parentLot })
              }} />
          ) : (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">{t('planning.no_dates')}</p>
              {lots.length === 0 ? (
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setCatalogModal(true)} className="btn btn-primary">📚 Sélectionner des lots</button>
                  <button onClick={handleInitLots} className="btn btn-ghost text-sm">{isFacadeCompany ? t('lots.init_default') : t('lots.init_default_btp')}</button>
                </div>
              ) : (
                <button onClick={handleCPM} disabled={cpmLoading} className="btn btn-primary">
                  {cpmLoading ? t('planning.cpm_computing') : t('planning.compute_cpm')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* LOTS TAB */}
      {tab === 'lots' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setCatalogModal(true)} className="btn btn-primary">📚 Depuis le catalogue</button>
            <button onClick={() => setLotModal({ lot: { code: '', name: '', name_tr: '', duration_days: 10, color: '#6B7280', zone: '', notes: '', subcontractor_id: '', sort_order: 99 }, mode: 'add' })} className="btn btn-accent">+ {t('lots.add')}</button>
            {lots.filter(l => !l.parent_lot_id).length >= 1 && (
              <button onClick={() => setTrainModal(true)} className="btn btn-ghost text-sm" title="Découpe des lots en séquences par zone/niveau">🚂 Train de travaux</button>
            )}
            {lots.length === 0 && (
              <button onClick={handleInitLots} className="btn btn-ghost text-sm">{isFacadeCompany ? t('lots.init_default') : t('lots.init_default_btp')}</button>
            )}
          </div>

          <div className="card overflow-hidden">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('lots.code')}</th>
                  <th>{t('lots.name')}</th>
                  <th>{t('lots.duration')}</th>
                  <th>{t('lots.subcontractor')}</th>
                  <th>{t('lots.status')}</th>
                  <th>{t('lots.progress')}</th>
                  <th className="text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {lots.map(l => (
                  <tr key={l.id} className={l.parent_lot_id ? 'bg-gray-50/60' : ''}>
                    <td>
                      <div className="flex items-center gap-2" style={{ paddingLeft: l.parent_lot_id ? 16 : 0 }}>
                        {l.parent_lot_id && <span className="text-gray-300" style={{ fontSize: 11 }}>↳</span>}
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                        <span className="font-mono text-xs font-bold text-gray-500">{l.code}</span>
                        {l.is_critical ? <span className="text-red-400 text-xs" title={t('planning.critical_path')}>●</span> : null}
                        {l.is_provisional ? <span className="text-gray-300 text-xs" title="Lot prévisionnel">◌</span> : null}
                      </div>
                    </td>
                    <td className={`font-medium${l.parent_lot_id ? ' text-gray-600' : ''}`}>{lang === 'tr' && l.name_tr ? l.name_tr : l.name}</td>
                    <td>{l.duration_days}j</td>
                    <td className="text-sm">
                      {l.team_name
                        ? <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: l.team_color || '#6B7280' }} />👥 {l.team_name}</span>
                        : l.subcontractor_name
                          ? <span>{l.subcontractor_name}</span>
                          : <span className="text-gray-300">—</span>
                      }
                    </td>
                    <td><span className={statusColors[l.status] || 'badge-gray'}>{t(`lots.status.${l.status}` as any)}</span></td>
                    <td>
                      <div className="flex items-center gap-2 min-w-[80px]">
                        <div className="progress-bar flex-1 w-16"><div className="progress-fill bg-primary-600" style={{ width: `${l.progress_percent}%` }} /></div>
                        <span className="text-xs w-8 text-gray-500">{l.progress_percent}%</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => setProgressLot(l)} className="btn btn-ghost btn-sm p-1" title="Avancement">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                            <rect width="24" height="24" rx="5" fill="#22c55e"/>
                            <circle cx="8.5" cy="8.5" r="2.5" fill="white"/>
                            <circle cx="15.5" cy="15.5" r="2.5" fill="white"/>
                            <path d="M18 6L6 18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                        <button onClick={() => setTaskModal({ lotId: l.id, lotName: l.name, lot: l })}
                          className="btn btn-ghost btn-sm p-1 flex items-center gap-0.5" title="Sous-tâches">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                            <rect x="8" y="2" width="8" height="7" rx="1.5" stroke="#7c3aed" strokeWidth="1.8"/>
                            <path d="M12 4.5v2l1.2 1" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="12" y1="9" x2="12" y2="13" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/>
                            <line x1="5" y1="13" x2="19" y2="13" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/>
                            <line x1="5" y1="13" x2="5" y2="16" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/>
                            <line x1="12" y1="13" x2="12" y2="16" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/>
                            <line x1="19" y1="13" x2="19" y2="16" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/>
                            <rect x="2" y="16" width="6" height="5" rx="1" stroke="#7c3aed" strokeWidth="1.8"/>
                            <rect x="9" y="16" width="6" height="5" rx="1" stroke="#7c3aed" strokeWidth="1.8"/>
                            <rect x="16" y="16" width="6" height="5" rx="1" stroke="#7c3aed" strokeWidth="1.8"/>
                          </svg>
                          {(lotTasksMap[l.id]?.length || 0) > 0 && <span className="text-xs text-purple-700">{lotTasksMap[l.id].length}</span>}
                        </button>
                        {!l.parent_lot_id && (
                          <button onClick={() => setSplitModal({ lot: l })}
                            className="btn btn-ghost btn-sm text-xs" title="Découper ce lot en sous-parties">
                            ✂️
                          </button>
                        )}
                        <button onClick={() => setLotModal({ lot: l, mode: 'edit' })} className="btn btn-ghost btn-sm text-xs">{t('common.edit')}</button>
                        <button onClick={() => handleDeleteLot(l.id)} className="btn btn-ghost btn-sm text-xs text-red-500">{t('common.delete')}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 italic">✂️ Découper un lot pour créer des sous-parties (ex : zone A / zone B) qui s'affichent séparément sur le Gantt.</p>
        </div>
      )}

      {/* SOUS-PROJETS TAB */}
      {tab === 'subprojects' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-500">Sous-projets rattachés à ce programme ({(project.sub_projects || []).length})</p>
            <button onClick={() => navigate(`/projects/new?parent=${id}`)} className="btn btn-accent btn-sm">+ Ajouter un sous-projet</button>
          </div>
          {(project.sub_projects || []).length === 0 ? (
            <div className="card card-body text-center text-gray-400 py-10">
              <p className="text-4xl mb-3">🏗</p>
              <p className="font-medium text-gray-500">Aucun sous-projet</p>
              <p className="text-sm mt-1">Créez un nouveau projet et rattachez-le à ce programme dans le formulaire de création.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(project.sub_projects || []).map((sp: any) => (
                <div key={sp.id}
                  className="card p-4 flex flex-col gap-2 hover:shadow-md transition-shadow cursor-pointer border border-gray-100 hover:border-violet-200"
                  onClick={() => navigate(`/projects/${sp.id}`)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{sp.name}</p>
                      {sp.reference && <p className="text-xs text-gray-400">{sp.reference}</p>}
                    </div>
                    <span className={`badge text-xs flex-shrink-0 ${
                      sp.status === 'en_cours' ? 'badge-green' :
                      sp.status === 'livre' ? 'badge-blue' :
                      sp.status === 'programme' ? 'badge-yellow' : 'badge-gray'
                    }`}>{sp.status?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="progress-bar flex-1"><div className="progress-fill bg-primary-600" style={{ width: `${sp.avg_progress || 0}%` }} /></div>
                    <span className="text-xs text-gray-500 w-8 text-right font-mono">{sp.avg_progress || 0}%</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                    {(sp.lot_count || 0) > 0 && <span>📦 {sp.lot_count} lot{sp.lot_count > 1 ? 's' : ''}</span>}
                    {sp.city && <span>📍 {sp.city}</span>}
                    {sp.start_date && <span>📅 {sp.start_date}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DEPS TAB */}
      {tab === 'deps' && (
        <div className="space-y-3">
          <button onClick={() => setDepModal(true)} className="btn btn-accent">+ {t('deps.add')}</button>
          <div className="card overflow-hidden">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('deps.predecessor')}</th>
                  <th>{t('deps.type')}</th>
                  <th>{t('deps.successor')}</th>
                  <th>{t('deps.lag')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {deps.map(d => {
                  const pred = lots.find(l => l.id === d.predecessor_id)
                  const succ = lots.find(l => l.id === d.successor_id)
                  return (
                    <tr key={d.id}>
                      <td>{pred ? `${pred.code} — ${pred.name}` : '?'}</td>
                      <td><span className={`badge ${d.type === 'SS' ? 'badge-green' : 'badge-blue'}`}>{d.type}</span></td>
                      <td>{succ ? `${succ.code} — ${succ.name}` : '?'}</td>
                      <td>{d.lag_days}j</td>
                      <td><button onClick={() => handleDeleteDep(d.id)} className="btn btn-ghost btn-sm text-xs text-red-500">✕</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Progress modal */}
      {progressLot && (
        <ProgressModal lot={progressLot} onClose={() => setProgressLot(null)} onSaved={async () => { setProgressLot(null); await loadData() }} />
      )}

      {/* Lot modal */}
      {lotModal && <LotModal lot={lotModal.lot} mode={lotModal.mode} users={users} employees={employees} teams={teams} onClose={() => setLotModal(null)} onSubmit={handleSaveLot} t={t} />}

      {/* Catalog modal */}
      {catalogModal && (
        <CatalogModal
          existingCodes={new Set(lots.map((l: any) => l.code))}
          onClose={() => setCatalogModal(false)}
          onSubmit={handleFromCatalog}
          saving={catalogSaving}
        />
      )}

      {/* Split lot modal */}
      {splitModal && (
        <SplitLotModal
          parentLot={splitModal.lot}
          users={users}
          onClose={() => setSplitModal(null)}
          onSubmit={handleCreateSublot}
        />
      )}

      {/* Train de travaux modal */}
      {trainModal && (
        <TrainModal
          lots={lots.filter((l: any) => !l.parent_lot_id)}
          onClose={() => setTrainModal(false)}
          onSubmit={handleTrain}
        />
      )}

      {/* Edit project modal */}
      {editProjectModal && (
        <ProjectEditModal
          project={project}
          onClose={() => setEditProjectModal(false)}
          onSubmit={handleSaveProject}
        />
      )}

      {/* Task modal */}
      {taskModal && (
        <LotTasksModal
          lotId={taskModal.lotId}
          lotName={taskModal.lotName}
          tasks={lotTasksMap[taskModal.lotId] || []}
          users={users}
          employees={employees}
          onClose={() => setTaskModal(null)}
          onSave={handleSaveLotTask}
          onDelete={handleDeleteLotTask}
          initialTaskId={taskModal.initialTaskId}
          lot={taskModal.lot || lots.find((l: any) => l.id === taskModal.lotId)}
        />
      )}

      {/* Milestone modal */}
      {milestoneModal && (
        <MilestoneModal
          milestone={milestoneModal.milestone}
          mode={milestoneModal.mode}
          onClose={() => setMilestoneModal(null)}
          onSubmit={handleSaveMilestone}
          onDelete={milestoneModal.mode === 'edit' ? handleDeleteMilestone : undefined}
        />
      )}

      {depModal && (
        <div className="modal-overlay">
          <div className="modal max-w-md">
            <div className="modal-header"><h3 className="font-semibold">{t('deps.title')} — {t('common.add')}</h3><button onClick={() => setDepModal(false)}>✕</button></div>
            <form onSubmit={handleAddDep}>
              <div className="modal-body space-y-4">
                <div className="field">
                  <label className="label">{t('deps.predecessor')}</label>
                  <select className="select" value={newDep.predecessor_id} onChange={e => setNewDep(d => ({ ...d, predecessor_id: e.target.value }))} required>
                    <option value="">{t('common.none')}</option>
                    {lots.map(l => <option key={l.id} value={l.id}>{l.code} — {l.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label">{t('deps.type')}</label>
                  <select className="select" value={newDep.type} onChange={e => setNewDep(d => ({ ...d, type: e.target.value }))}>
                    {['FS','SS','FF','SF'].map(ty => <option key={ty} value={ty}>{t(`deps.type.${ty}` as any)}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label">{t('deps.successor')}</label>
                  <select className="select" value={newDep.successor_id} onChange={e => setNewDep(d => ({ ...d, successor_id: e.target.value }))} required>
                    <option value="">{t('common.none')}</option>
                    {lots.map(l => <option key={l.id} value={l.id}>{l.code} — {l.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label">{t('deps.lag')} (optionnel)</label>
                  <input type="number" className="input" min={0} value={newDep.lag_days} onChange={e => setNewDep(d => ({ ...d, lag_days: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="modal-footer"><button type="button" onClick={() => setDepModal(false)} className="btn btn-ghost">{t('common.cancel')}</button><button type="submit" className="btn btn-primary">{t('common.save')}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SplitLotModal ────────────────────────────────────────────────────────────
function SplitLotModal({ parentLot, users, onClose, onSubmit }: any) {
  const [form, setForm] = useState({
    code: parentLot.code + '-A',
    name: parentLot.name + ' — Partie A',
    name_tr: parentLot.name_tr ? parentLot.name_tr + ' — A' : '',
    duration_days: parentLot.duration_days,
    color: parentLot.color || '#6B7280',
    zone: parentLot.zone || '',
    notes: '',
    subcontractor_id: parentLot.subcontractor_id || '',
    sort_order: (parentLot.sort_order || 0) + 1,
    start_date_planned: parentLot.start_date_planned || '',
    end_date_planned: parentLot.end_date_planned || '',
    market_deadline: '',
    is_provisional: 0,
  })
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3 className="font-semibold flex items-center gap-2">
            <span>✂️</span>
            Découper — <span className="text-primary-700">{parentLot.code} {parentLot.name}</span>
          </h3>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={(e) => onSubmit(e, form, parentLot.id)}>
          <div className="modal-body space-y-4">
            <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs px-3 py-2 rounded-lg">
              ℹ️ Le sous-lot créé apparaîtra juste en dessous du lot parent dans le Gantt. Vous pouvez créer autant de sous-lots que nécessaire (zone A, zone B, etc.).
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="field">
                <label className="label">Code *</label>
                <input className="input" value={form.code} onChange={e => set('code', e.target.value)} required />
              </div>
              <div className="field">
                <label className="label">Durée (jours) *</label>
                <input type="number" className="input" min={1} value={form.duration_days} onChange={e => set('duration_days', Number(e.target.value))} required />
              </div>
              <div className="field col-span-2">
                <label className="label">Nom *</label>
                <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div className="field">
                <label className="label">Couleur</label>
                <div className="flex items-center gap-2">
                  <input type="color" className="h-10 w-16 rounded border cursor-pointer" value={form.color} onChange={e => set('color', e.target.value)} />
                  <span className="text-xs text-gray-400">({parentLot.code} = <span style={{ color: parentLot.color }}>■</span>)</span>
                </div>
              </div>
              <div className="field">
                <label className="label">Sous-traitant</label>
                <select className="select" value={form.subcontractor_id} onChange={e => set('subcontractor_id', e.target.value)}>
                  <option value="">— Aucun —</option>
                  {users.map((u: any) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} — {u.company_name}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Début planifié</label>
                <input type="date" className="input" value={form.start_date_planned} onChange={e => set('start_date_planned', e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Fin planifiée</label>
                <input type="date" className="input" value={form.end_date_planned} onChange={e => set('end_date_planned', e.target.value)} />
              </div>
              <div className="field col-span-2">
                <label className="label">Zone / Notes</label>
                <input className="input" value={form.zone} onChange={e => set('zone', e.target.value)} placeholder="ex : Zone nord, Bâtiment A..." />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-ghost">Annuler</button>
            <button type="submit" className="btn btn-primary">✂️ Créer le sous-lot</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── ProjectEditModal ─────────────────────────────────────────────────────────
function ProjectEditModal({ project, onClose, onSubmit }: any) {
  const t = useT()
  const { user: modalUser } = useAuth()
  const isMetier = modalUser?.company_type === 'entreprise_metier'
  const [lotTypes, setLotTypes] = useState<string[]>(() => parseLotTypes(project.lot_types))
  const [clientId, setClientId] = useState<string | null>(project.client_id || null)
  const [form, setForm] = useState({
    name: project.name || '',
    reference: project.reference || '',
    address: project.address || '',
    city: project.city || '',
    postal_code: project.postal_code || '',
    client_name: project.client_name || '',
    client_email: project.client_email || '',
    client_phone: project.client_phone || '',
    description: project.description || '',
    start_date: project.start_date || '',
    duration_weeks: project.duration_weeks?.toString() || '',
    budget_ht: project.budget_ht?.toString() || '',
    status: project.status || 'en_cours',
    meeting_time: project.meeting_time || '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const toggleLotType = (key: string) => {
    setLotTypes(prev => prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key])
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <h3 className="font-semibold">✏️ Modifier la fiche projet</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={(e) => onSubmit(e, {
          ...form,
          client_id: clientId || null,
          duration_weeks: form.duration_weeks ? Number(form.duration_weeks) : null,
          budget_ht: form.budget_ht ? Number(form.budget_ht) : null,
          lot_types: lotTypes.length > 0 ? lotTypes : null,
          meeting_time: form.meeting_time || null,
        })}>
          <div className="modal-body grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="field sm:col-span-2">
              <label className="label">{t('projects.name')} *</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="field">
              <label className="label">{t('projects.reference')}</label>
              <input className="input" value={form.reference} onChange={e => set('reference', e.target.value)} />
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
            <div className="field sm:col-span-2">
              <label className="label">{t('projects.client_name')}</label>
              <ClientSelect
                clientId={clientId}
                clientName={form.client_name}
                onChange={(id, name) => { setClientId(id); set('client_name', name) }}
              />
            </div>
            {!clientId && (
              <div className="field sm:col-span-2">
                <label className="label">{t('projects.client_email')}</label>
                <input type="email" className="input" value={form.client_email} onChange={e => set('client_email', e.target.value)} placeholder="contact@client.fr" />
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
            <div className="field sm:col-span-2">
              <label className="label">{t('projects.description')}</label>
              <textarea className="input resize-none" rows={3} value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Décrivez le projet : type de construction, surface, spécificités..." />
            </div>
            {/* Types de lots façade — seulement pour entreprise_metier */}
            {isMetier && (
              <div className="sm:col-span-2">
                <label className="label mb-2 flex items-center gap-2">
                  Lots façade
                  <span className="text-xs text-gray-400 font-normal">(laisser vide pour un chantier BTP standard)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FACADE_LOT_OPTIONS.map(opt => {
                    const active = lotTypes.includes(opt.key)
                    return (
                      <button key={opt.key} type="button" onClick={() => toggleLotType(opt.key)}
                        title={opt.desc}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium text-left transition-all ${
                          active
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}>
                        <span className="text-base">{opt.icon}</span>
                        <span className="flex-1">{opt.label}</span>
                        {active && <span className="text-blue-500 text-xs">✓</span>}
                      </button>
                    )
                  })}
                </div>
                {lotTypes.length > 0 && (
                  <p className="mt-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded px-3 py-1.5">
                    ✓ Mode <strong>DESIGN FACADES</strong> — le planning IA utilisera les lots façade prédéfinis ({lotTypes.join(', ')})
                  </p>
                )}
              </div>
            )}
            {/* H de réunion */}
            <div className="field sm:col-span-2">
              <label className="label">H de réunion de chantier</label>
              <input className="input" value={form.meeting_time} onChange={e => set('meeting_time', e.target.value)}
                placeholder="ex : Lundi 14h, Mercredi 9h30…" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-ghost">{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary">💾 Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── LotTasksModal ─────────────────────────────────────────────────────────────
const TASK_TYPES = [
  { value: 'commande', label: 'Commande', color: '#6366f1' },
  { value: 'execution', label: 'Exécution', color: '#3b82f6' },
  { value: 'livraison', label: 'Livraison', color: '#22c55e' },
  { value: 'custom', label: 'Autre', color: '#94a3b8' },
]

function LotTasksModal({ lotId, lotName, tasks, users, employees, onClose, onSave, onDelete, initialTaskId, lot }: any) {
  const emptyForm = { name: '', type: 'custom', start_date: '', end_date: '', progress: 0, subcontractor_id: '', sort_order: tasks.length, notes: '' }
  const [form, setForm] = useState<any>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null) // null = add mode
  const [assignType, setAssignType] = useState<'subcontractor' | 'employee'>('subcontractor')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const startEdit = (task: any) => {
    setEditingId(task.id)
    setError(null)
    setForm({ name: task.name, type: task.type, start_date: task.start_date || '', end_date: task.end_date || '', progress: task.progress, subcontractor_id: task.subcontractor_id || '', sort_order: task.sort_order || 0, notes: task.notes || '' })
    if (task.subcontractor_id && (employees || []).some((e: any) => e.id === task.subcontractor_id)) {
      setAssignType('employee')
    } else {
      setAssignType('subcontractor')
    }
  }

  // Auto-ouvrir l'édition si on arrive depuis un clic direct sur la tâche
  useEffect(() => {
    if (initialTaskId) {
      const task = tasks.find((t: any) => t.id === initialTaskId)
      if (task) startEdit(task)
    }
  }, [initialTaskId])

  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); setError(null); setAssignType('subcontractor') }

  // Calcul durée utilisée (hors tâche en cours d'édition)
  const usedDays = tasks
    .filter((t: any) => t.id !== editingId && t.start_date && t.end_date)
    .reduce((sum: number, t: any) => sum + Math.max(0, Math.round((new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) / 86400000)), 0)
  const newTaskDays = (form.start_date && form.end_date)
    ? Math.max(0, Math.round((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / 86400000))
    : 0
  const totalUsed = usedDays + newTaskDays
  const lotDuration = lot?.duration_days || null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    // Validation : somme des durées ≤ durée du lot principal
    if (lotDuration && form.start_date && form.end_date && totalUsed > lotDuration) {
      setError(`Total sous-tâches : ${totalUsed}j > durée du lot (${lotDuration}j). Réduisez la durée.`)
      return
    }
    setSaving(true)
    const ok = await onSave(lotId, {
      name: form.name, type: form.type,
      start_date: form.start_date || null, end_date: form.end_date || null,
      progress: Number(form.progress), subcontractor_id: form.subcontractor_id || null,
      sort_order: Number(form.sort_order),
      notes: form.notes ? form.notes.slice(0, 1500) : null
    }, editingId || undefined)
    setSaving(false)
    if (ok) { setEditingId(null); setForm({ ...emptyForm, sort_order: tasks.length + 1 }) }
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h3 className="font-semibold">📋 Sous-tâches — <span className="text-primary-700">{lotName}</span></h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="modal-body space-y-4">
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-2">Aucune sous-tâche pour ce lot</p>
          ) : (
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
              {tasks.map((task: any) => {
                const tc = TASK_TYPES.find(t => t.value === task.type)
                return (
                  <div key={task.id} className="flex items-center gap-3 px-3 py-2 bg-white hover:bg-gray-50">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tc?.color || '#94a3b8' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{task.name}</p>
                      <p className="text-xs text-gray-400">
                        {tc?.label || 'Autre'}
                        {task.start_date ? ` · ${task.start_date}` : ''}
                        {task.end_date ? ` → ${task.end_date}` : ''}
                        {task.progress > 0 ? ` · ${task.progress}%` : ''}
                        {task.subcontractor_name ? ` · ${task.subcontractor_name}` : ''}
                      </p>
                      {task.notes && (
                        <p className="text-xs text-gray-500 italic truncate mt-0.5">💬 {task.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(task)} className="btn btn-ghost btn-sm text-xs py-0.5">✏️</button>
                      <button onClick={() => onDelete(task.id)} className="btn btn-ghost btn-sm text-xs py-0.5 text-red-400">✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {editingId ? 'Modifier la sous-tâche' : 'Ajouter une sous-tâche'}
              </p>
              {lotDuration && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  totalUsed > lotDuration ? 'bg-red-100 text-red-700' :
                  totalUsed === lotDuration ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {totalUsed}/{lotDuration}j
                </span>
              )}
            </div>
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                ⚠ {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="field col-span-2">
                <label className="label text-xs">Nom *</label>
                <input className="input input-sm" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="ex : Approvisionnement béton" />
              </div>
              <div className="field">
                <label className="label text-xs">Type</label>
                <select className="select select-sm" value={form.type} onChange={e => set('type', e.target.value)}>
                  {TASK_TYPES.map(tt => <option key={tt.value} value={tt.value}>{tt.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label text-xs">Affectation</label>
                <div className="flex gap-1 mb-1">
                  <button type="button" onClick={() => { setAssignType('subcontractor'); set('subcontractor_id', '') }}
                    className={`btn btn-xs flex-1 ${assignType === 'subcontractor' ? 'btn-primary' : 'btn-ghost border border-gray-200'}`}>
                    🏢 ST
                  </button>
                  <button type="button" onClick={() => { setAssignType('employee'); set('subcontractor_id', '') }}
                    className={`btn btn-xs flex-1 ${assignType === 'employee' ? 'btn-primary' : 'btn-ghost border border-gray-200'}`}>
                    👷 Salarié {(employees || []).length === 0 && <span className="text-xs opacity-60">(0)</span>}
                  </button>
                </div>
                <select className="select select-sm" value={form.subcontractor_id} onChange={e => set('subcontractor_id', e.target.value)}>
                  <option value="">— Aucun —</option>
                  {assignType === 'subcontractor'
                    ? users.map((u: any) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)
                    : (employees || []).map((u: any) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)
                  }
                </select>
              </div>
              <div className="field">
                <label className="label text-xs">Début</label>
                <input type="date" className="input input-sm" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
              </div>
              <div className="field">
                <label className="label text-xs">Fin</label>
                <input type="date" className="input input-sm" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
              </div>
              <div className="field col-span-2">
                <label className="label text-xs">Avancement : {form.progress}%</label>
                <input type="range" min={0} max={100} step={5} value={form.progress} onChange={e => set('progress', Number(e.target.value))} className="w-full" />
              </div>
              <div className="field col-span-2">
                <label className="label text-xs flex items-center justify-between">
                  <span>Commentaire / Observations</span>
                  <span className={`font-mono ${(form.notes || '').length > 1400 ? 'text-red-500' : 'text-gray-400'}`}>
                    {(form.notes || '').length}/1500
                  </span>
                </label>
                <textarea
                  className="input resize-none text-sm"
                  rows={3}
                  maxLength={1500}
                  value={form.notes || ''}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Observations de chantier, problèmes rencontrés, instructions…"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              {editingId && <button type="button" onClick={cancelEdit} className="btn btn-ghost btn-sm">Annuler</button>}
              <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
                {saving ? '…' : editingId ? 'Mettre à jour' : '+ Ajouter'}
              </button>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-ghost">Fermer</button>
        </div>
      </div>
    </div>
  )
}

// ─── MilestoneModal ────────────────────────────────────────────────────────────
function MilestoneModal({ milestone, mode, onClose, onSubmit, onDelete }: any) {
  const [form, setForm] = useState({ name: milestone.name, date: milestone.date, color: milestone.color || '#ef4444' })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="modal-overlay">
      <div className="modal max-w-sm">
        <div className="modal-header">
          <h3 className="font-semibold flex items-center gap-2">
            <span style={{ color: form.color }}>◆</span>
            {mode === 'add' ? 'Ajouter un jalon' : 'Modifier le jalon'}
          </h3>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={(e) => onSubmit(e, form)}>
          <div className="modal-body space-y-4">
            <div className="field">
              <label className="label">Nom du jalon</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="ex : Livraison fondations" />
            </div>
            <div className="field">
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} required />
            </div>
            <div className="field">
              <label className="label">Couleur</label>
              <div className="flex items-center gap-3">
                <input type="color" className="h-10 w-16 rounded border cursor-pointer" value={form.color} onChange={e => set('color', e.target.value)} />
                <div className="flex gap-2">
                  {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'].map(c => (
                    <button key={c} type="button" onClick={() => set('color', c)}
                      className="w-6 h-6 rounded-full border-2 transition-all"
                      style={{ backgroundColor: c, borderColor: form.color === c ? '#000' : 'transparent' }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            {onDelete && (
              <button type="button" onClick={() => { if (confirm('Supprimer ce jalon ?')) onDelete(milestone.id) }}
                className="btn btn-danger btn-sm mr-auto">Supprimer</button>
            )}
            <button type="button" onClick={onClose} className="btn btn-ghost">Annuler</button>
            <button type="submit" className="btn btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── LotModal ─────────────────────────────────────────────────────────────────
function LotModal({ lot, mode, users, employees, teams, onClose, onSubmit, t }: any) {
  // Détecter l'assignation initiale : équipe, salarié ou sous-traitant
  const initialAssignType = lot.team_id ? 'team'
    : lot.subcontractor_id && (employees || []).some((e: any) => e.id === lot.subcontractor_id) ? 'employee'
    : 'subcontractor'
  const [form, setForm] = useState({ ...lot })
  const [assignType, setAssignType] = useState<'subcontractor' | 'employee' | 'team'>(initialAssignType)
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const handleAssignTypeChange = (type: 'subcontractor' | 'employee' | 'team') => {
    setAssignType(type)
    // Réinitialiser les autres assignations
    if (type === 'team') setForm((f: any) => ({ ...f, subcontractor_id: '', team_id: f.team_id }))
    else setForm((f: any) => ({ ...f, team_id: '', subcontractor_id: '' }))
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header"><h3 className="font-semibold">{mode === 'add' ? t('lots.add') : t('lots.edit')}</h3><button onClick={onClose}>✕</button></div>
        <form onSubmit={(e) => onSubmit(e, form)}>
          <div className="modal-body grid grid-cols-2 gap-4">
            <div className="field"><label className="label">{t('lots.code')}</label><input className="input" value={form.code} onChange={e => set('code', e.target.value)} required /></div>
            <div className="field"><label className="label">{t('lots.duration')}</label><input type="number" className="input" min={1} value={form.duration_days} onChange={e => set('duration_days', Number(e.target.value))} required /></div>
            <div className="field col-span-2"><label className="label">{t('lots.name')}</label><input className="input" value={form.name} onChange={e => set('name', e.target.value)} required /></div>
            <div className="field col-span-2"><label className="label">{t('lots.name_tr')}</label><input className="input" value={form.name_tr || ''} onChange={e => set('name_tr', e.target.value)} /></div>
            <div className="field"><label className="label">{t('lots.color')}</label><input type="color" className="input h-10" value={form.color || '#6B7280'} onChange={e => set('color', e.target.value)} /></div>
            <div className="field"><label className="label">{t('lots.zone')}</label><input className="input" value={form.zone || ''} onChange={e => set('zone', e.target.value)} /></div>

            {/* Affectation : Sous-traitant | Salarié | Équipe */}
            <div className="field col-span-2">
              <label className="label">Affectation</label>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => handleAssignTypeChange('subcontractor')}
                  className={`btn btn-sm flex-1 ${assignType === 'subcontractor' ? 'btn-primary' : 'btn-ghost border border-gray-200'}`}>
                  🏢 Sous-traitant
                </button>
                <button type="button" onClick={() => handleAssignTypeChange('employee')}
                  className={`btn btn-sm flex-1 ${assignType === 'employee' ? 'btn-primary' : 'btn-ghost border border-gray-200'}`}
                  disabled={(employees || []).length === 0}>
                  👷 Salarié {(employees || []).length === 0 && <span className="text-xs opacity-60">(aucun)</span>}
                </button>
                <button type="button" onClick={() => handleAssignTypeChange('team')}
                  className={`btn btn-sm flex-1 ${assignType === 'team' ? 'btn-primary' : 'btn-ghost border border-gray-200'}`}
                  disabled={teams.length === 0}>
                  👥 Équipe {teams.length === 0 && <span className="text-xs opacity-60">(aucune)</span>}
                </button>
              </div>
              {assignType === 'subcontractor' ? (
                <select className="select" value={form.subcontractor_id || ''} onChange={e => set('subcontractor_id', e.target.value)}>
                  <option value="">{t('common.none')}</option>
                  {users.map((u: any) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}{u.company_name ? ` — ${u.company_name}` : ''}</option>)}
                </select>
              ) : assignType === 'employee' ? (
                <select className="select" value={form.subcontractor_id || ''} onChange={e => set('subcontractor_id', e.target.value)}>
                  <option value="">{t('common.none')}</option>
                  {(employees || []).map((u: any) => <option key={u.id} value={u.id}>👷 {u.first_name} {u.last_name}{u.company_name ? ` — ${u.company_name}` : ''}</option>)}
                </select>
              ) : (
                <select className="select" value={form.team_id || ''} onChange={e => set('team_id', e.target.value)}>
                  <option value="">{t('common.none')}</option>
                  {teams.map((tm: any) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.name}{tm.leader_name?.trim() ? ` (chef : ${tm.leader_name.trim()})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="field col-span-2">
              <label className="label flex items-center justify-between">
                <span>{t('lots.notes')}</span>
                <span className={`text-xs font-mono ${(form.notes || '').length > 1900 ? 'text-red-500' : 'text-gray-400'}`}>
                  {(form.notes || '').length}/2000
                </span>
              </label>
              <textarea className="input resize-none" rows={3} maxLength={2000} value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Observations, instructions techniques, remarques chantier…" />
            </div>
            {/* ── Plages de dates manuelles ── */}
            <div className="field col-span-2">
              <label className="label text-blue-700 font-semibold">📅 Plage de dates (forçage manuel)</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Date début</label>
                  <input type="date" className="input" value={form.start_date_planned || ''} onChange={e => set('start_date_planned', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Date fin</label>
                  <input type="date" className="input" value={form.end_date_planned || ''} onChange={e => set('end_date_planned', e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">⚠ Ces dates remplacent le calcul CPM. Vider les deux champs pour revenir au calcul automatique.</p>
            </div>
            <div className="field">
              <label className="label">Date limite marché</label>
              <input type="date" className="input" value={form.market_deadline || ''} onChange={e => set('market_deadline', e.target.value)} />
            </div>
            <div className="field flex items-center gap-3 pt-2">
              <label className="label mb-0">Lot prévisionnel</label>
              <input type="checkbox" className="w-4 h-4 rounded" checked={!!form.is_provisional} onChange={e => set('is_provisional', e.target.checked ? 1 : 0)} />
              <span className="text-xs text-gray-400">(hachuré sur le Gantt)</span>
            </div>
          </div>
          <div className="modal-footer"><button type="button" onClick={onClose} className="btn btn-ghost">{t('common.cancel')}</button><button type="submit" className="btn btn-primary">{t('common.save')}</button></div>
        </form>
      </div>
    </div>
  )
}

// ─── TrainModal ────────────────────────────────────────────────────────────────
// Train de travaux : découpe des lots en sous-lots séquentiels par zone/niveau
const ZONE_PRESETS = [
  { label: 'A, B, C', zones: ['A', 'B', 'C'] },
  { label: 'RDC → R+3', zones: ['RDC', 'R+1', 'R+2', 'R+3'] },
  { label: '1 → 4', zones: ['1', '2', '3', '4'] },
  { label: 'Bât. A → C', zones: ['Bât.A', 'Bât.B', 'Bât.C'] },
]

function TrainModal({ lots, onClose, onSubmit }: { lots: any[]; onClose: () => void; onSubmit: (e: React.FormEvent, payload: any) => void }) {
  const [selectedLots, setSelectedLots] = useState<Set<string>>(new Set())
  const [zones, setZones] = useState<string[]>(['Zone A', 'Zone B'])
  const [lagDays, setLagDays] = useState(0)
  const [depType, setDepType] = useState<'FS' | 'SS'>('FS')
  const [saving, setSaving] = useState(false)

  const toggleLot = (id: string) => setSelectedLots(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const applyPreset = (preset: string[]) => setZones([...preset])

  const addZone = () => setZones(z => [...z, `Zone ${z.length + 1}`])
  const removeZone = (i: number) => setZones(z => z.filter((_, idx) => idx !== i))
  const editZone = (i: number, v: string) => setZones(z => z.map((s, idx) => idx === i ? v : s))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLots.size) return
    if (zones.length < 2) return
    setSaving(true)
    await onSubmit(e, { lot_ids: [...selectedLots], zones: zones.filter(z => z.trim()), lag_days: lagDays, dep_type: depType })
    setSaving(false)
  }

  const parentCount = lots.filter(l => !l.parent_lot_id).length
  const totalSubLots = selectedLots.size * zones.filter(z => z.trim()).length

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <h3 className="font-semibold flex items-center gap-2">🚂 Train de travaux</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-5">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg">
              ℹ️ Le train de travaux découpe chaque lot sélectionné en sous-lots séquentiels (un par zone). Les sous-lots seront chaînés automatiquement et les dépendances du lot parent seront reroutées.
            </div>

            {/* ── Sélection des lots ── */}
            <div>
              <label className="label mb-2">Lots à découper <span className="text-gray-400 font-normal text-xs">({parentCount} lots parents disponibles)</span></label>
              <div className="space-y-1 max-h-44 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {lots.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">Aucun lot parent disponible</p>
                ) : lots.map(l => (
                  <label key={l.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded flex-shrink-0"
                      checked={selectedLots.has(l.id)}
                      onChange={() => toggleLot(l.id)} />
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                    <span className="font-mono text-xs font-bold text-gray-500 w-10 flex-shrink-0">{l.code}</span>
                    <span className="text-sm text-gray-700 truncate">{l.name}</span>
                    <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{l.duration_days}j</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end mt-1">
                <button type="button" className="text-xs text-primary-600 hover:underline"
                  onClick={() => setSelectedLots(new Set(lots.map((l: any) => l.id)))}>
                  Tout sélectionner
                </button>
              </div>
            </div>

            {/* ── Zones / niveaux ── */}
            <div>
              <label className="label mb-2">Zones / niveaux <span className="text-gray-400 font-normal text-xs">(min. 2)</span></label>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {ZONE_PRESETS.map(p => (
                  <button key={p.label} type="button" onClick={() => applyPreset(p.zones)}
                    className="text-xs px-2 py-1 rounded border border-gray-200 hover:border-primary-400 hover:bg-primary-50 text-gray-600 hover:text-primary-700 transition-colors">
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                {zones.map((z, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{i + 1}.</span>
                    <input className="input flex-1 py-1.5 text-sm" value={z}
                      onChange={e => editZone(i, e.target.value)}
                      placeholder={`Zone ${i + 1}`} />
                    {zones.length > 2 && (
                      <button type="button" onClick={() => removeZone(i)} className="text-gray-300 hover:text-red-400 flex-shrink-0 text-xs">✕</button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addZone} className="mt-2 text-xs text-primary-600 hover:underline">+ Ajouter une zone</button>
            </div>

            {/* ── Dépendances entre zones ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="field">
                <label className="label">Type de dépendance</label>
                <select className="select" value={depType} onChange={e => setDepType(e.target.value as 'FS' | 'SS')}>
                  <option value="FS">FS — Fin-à-Début (séquentiel)</option>
                  <option value="SS">SS — Début-à-Début (en parallèle décalé)</option>
                </select>
              </div>
              <div className="field">
                <label className="label">Décalage entre zones</label>
                <div className="flex items-center gap-2">
                  <input type="number" className="input" min={0} value={lagDays}
                    onChange={e => setLagDays(Number(e.target.value))} />
                  <span className="text-sm text-gray-500">jours</span>
                </div>
              </div>
            </div>

            {/* ── Aperçu ── */}
            {selectedLots.size > 0 && zones.filter(z => z.trim()).length >= 2 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                <p className="font-semibold text-gray-700 mb-1.5">Aperçu :</p>
                {[...selectedLots].slice(0, 3).map(lid => {
                  const lot = lots.find((l: any) => l.id === lid)
                  if (!lot) return null
                  return (
                    <div key={lid} className="flex items-center gap-1 flex-wrap">
                      <span className="font-mono font-bold text-gray-500">{lot.code}</span>
                      <span className="text-gray-400">→</span>
                      {zones.filter(z => z.trim()).map((z, i) => (
                        <span key={i} className="inline-flex items-center gap-0.5">
                          <span className="bg-white border border-gray-200 rounded px-1.5 py-0.5 font-mono font-bold">{lot.code}-{z}</span>
                          {i < zones.filter(z => z.trim()).length - 1 && (
                            <span className="text-gray-300">→</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )
                })}
                {selectedLots.size > 3 && <p className="text-gray-400 italic">… + {selectedLots.size - 3} lot(s) supplémentaire(s)</p>}
                <p className="text-blue-600 font-medium mt-1.5">→ {totalSubLots} sous-lots créés, {totalSubLots - selectedLots.size} dépendances entre zones</p>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-ghost">Annuler</button>
            <button type="submit" disabled={saving || !selectedLots.size || zones.filter(z => z.trim()).length < 2}
              className="btn btn-primary">
              {saving ? 'Création...' : `🚂 Créer ${totalSubLots > 0 ? totalSubLots + ' sous-lots' : 'le train'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
