import { useEffect, useState } from 'react'
import { useT, useI18n } from '../../i18n'
import { api } from '../../api/client'
import GanttChart from '../../components/GanttChart'

export default function SubPlanning() {
  const t = useT()
  const { lang } = useI18n()

  // Les projets + leurs données Gantt complètes
  const [projects, setProjects] = useState<any[]>([])
  const [data, setData] = useState<Record<string, {
    lots: any[]
    deps: any[]
    milestones: any[]
    lotAssignments: Record<string, any[]>
  }>>({})
  const [loading, setLoading] = useState(true)
  const [openProject, setOpenProject] = useState<string | null>(null)

  // IDs des lots personnellement assignés à l'utilisateur connecté
  const [myLotIds, setMyLotIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch projets + mes lots en parallèle
        const [projs, myLots] = await Promise.all([
          api.my.projects(),
          api.my.lots(),
        ])
        setProjects(projs)
        setMyLotIds(new Set((myLots as any[]).map((l: any) => l.id)))

        if (projs.length > 0) setOpenProject(projs[0].id)

        // Pour chaque projet : lots + deps + milestones + lotAssignments
        const entries = await Promise.all(
          (projs as any[]).map(async (p: any) => {
            const [lots, deps, milestones, allAssignments] = await Promise.all([
              api.lots.list(p.id),
              api.deps.list(p.id),
              api.milestones.list(p.id),
              api.lotAssignments.listForProject(p.id),
            ])
            // Grouper les assignments par lot_id
            const lotAssignments: Record<string, any[]> = {}
            for (const a of allAssignments as any[]) {
              if (!lotAssignments[a.lot_id]) lotAssignments[a.lot_id] = []
              lotAssignments[a.lot_id].push(a)
            }
            return [p.id, { lots, deps, milestones, lotAssignments }] as const
          })
        )
        setData(Object.fromEntries(entries))
      } catch { /* silence */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>

  if (projects.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-gray-900">📅 {t('nav.planning')}</h1>
        <div className="card card-body text-center text-gray-400 py-16">
          <p className="text-4xl mb-3">📋</p>
          <p>{t('sub.no_lots')}</p>
          <p className="text-sm mt-2">Aucun lot ne vous a encore été assigné.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">📅 {t('nav.planning')}</h1>
        <div className="text-sm text-gray-400">
          {projects.length} projet{projects.length > 1 ? 's' : ''} · {myLotIds.size} lot{myLotIds.size > 1 ? 's' : ''} assigné{myLotIds.size > 1 ? 's' : ''}
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border-l-4 border-accent-500 bg-accent-50 inline-block" />
          Vos lots
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gray-200 inline-block" />
          Autres lots (contexte)
        </span>
      </div>

      {projects.map(p => {
        const pd = data[p.id]
        const isOpen = openProject === p.id

        // Lots de l'utilisateur sur ce projet
        const myLotsOnProject = pd?.lots?.filter((l: any) => myLotIds.has(l.id)) || []
        const myLotCodes = myLotsOnProject.map((l: any) => l.code).join(', ')

        return (
          <div key={p.id} className="card overflow-hidden">
            {/* Header cliquable */}
            <div
              className="card-header flex items-center justify-between cursor-pointer select-none hover:bg-gray-50 transition-colors"
              onClick={() => setOpenProject(isOpen ? null : p.id)}
            >
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-900 truncate">{p.name}</h2>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {p.client_name && <span className="text-xs text-gray-400">{p.client_name}</span>}
                  {myLotCodes && (
                    <span className="text-xs font-medium text-accent-600 bg-accent-50 border border-accent-200 px-2 py-0.5 rounded-full">
                      Vos lots : {myLotCodes}
                    </span>
                  )}
                  {p.my_lots_count > 0 && (
                    <span className="text-xs text-gray-400">{p.my_lots_count} lot{p.my_lots_count > 1 ? 's' : ''} assigné{p.my_lots_count > 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
              <span className="text-gray-400 text-sm flex-shrink-0 ml-4">{isOpen ? '▲' : '▼'}</span>
            </div>

            {/* Gantt complet (read-only) avec surbrillance des lots utilisateur */}
            {isOpen && pd && (
              <div className="p-2">
                {pd.lots.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">{t('planning.no_dates')}</p>
                ) : (
                  <GanttChart
                    lots={pd.lots}
                    deps={pd.deps}
                    milestones={pd.milestones}
                    lotAssignments={pd.lotAssignments}
                    projectStartDate={p.start_date}
                    lang={lang}
                    readOnly
                    highlightedLotIds={myLotIds}
                  />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
