import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n'
import { api } from '../api/client'

// ── Constantes ────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  devis:     '#9ca3af', // gray-400
  programme: '#60a5fa', // blue-400
  en_cours:  '#22c55e', // green-500
  livre:     '#facc15', // yellow-400
  sav:       '#f97316', // orange-500
}

const STATUS_LIST = ['devis', 'programme', 'en_cours', 'livre', 'sav'] as const

// Largeur colonne gauche (noms projets)
const LEFT_COL = 260
// Hauteur par ligne projet
const ROW_H = 36
// Padding vertical dans la barre Gantt
const BAR_PAD = 6

// ── Helpers ───────────────────────────────────────────────────
function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function toMonth(d: Date): string {
  return d.toISOString().slice(0, 7) // "YYYY-MM"
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d)
  r.setUTCMonth(r.getUTCMonth() + n)
  return r
}

function monthsBetween(start: Date, end: Date): number {
  return (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) + 1
}

function monthLabel(m: string): string {
  const [y, mo] = m.split('-')
  const date = new Date(Date.UTC(+y, +mo - 1, 15))
  const name = date.toLocaleDateString(undefined, { month: 'short' })
  return `${name[0].toUpperCase()}${name.slice(1)} ${y}`
}

function weekLabel(d: Date): string {
  const name = d.toLocaleDateString(undefined, { month: 'short' })
  return `${d.getUTCDate()} ${name}`
}

// Numéro de semaine ISO 8601
function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// Prochains lundis sur la plage
function getWeeks(start: Date, end: Date): Date[] {
  const weeks: Date[] = []
  const cur = new Date(start)
  // Aller au lundi le plus proche
  const day = cur.getUTCDay()
  if (day !== 1) cur.setUTCDate(cur.getUTCDate() + ((8 - day) % 7))
  while (cur <= end) {
    weeks.push(new Date(cur))
    cur.setUTCDate(cur.getUTCDate() + 7)
  }
  return weeks
}

// ─────────────────────────────────────────────────────────────
export default function UnifiedPlanning() {
  const t = useT()
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)
  const leftColRef = useRef<HTMLDivElement>(null)
  const isSyncingScroll = useRef(false)

  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [view, setView]         = useState<'gantt' | 'list'>('gantt')
  const [zoom, setZoom]         = useState<'month' | 'week'>('month')
  const [search, setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    api.planning.unified().then(setProjects).finally(() => setLoading(false))
  }, [])

  // Filtres
  const filtered = useMemo(() =>
    projects
      .filter(p => !filterStatus || p.status === filterStatus)
      .filter(p => !search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        (p.city || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.reference || '').toLowerCase().includes(search.toLowerCase())
      ),
    [projects, filterStatus, search]
  )

  // Plage temporelle globale (avec marge +1 mois de chaque côté)
  const { rangeStart, rangeEnd } = useMemo(() => {
    const dates = filtered.flatMap(p => [
      parseDate(p.gantt_start), parseDate(p.gantt_end),
      parseDate(p.start_date),
    ]).filter(Boolean) as Date[]
    if (!dates.length) {
      const now = new Date()
      return { rangeStart: now, rangeEnd: addMonths(now, 12) }
    }
    const min = new Date(Math.min(...dates.map(d => d.getTime())))
    const max = new Date(Math.max(...dates.map(d => d.getTime())))
    min.setUTCDate(1)
    max.setUTCDate(28)
    return { rangeStart: addMonths(min, -1), rangeEnd: addMonths(max, 1) }
  }, [filtered])

  // Colonnes mois ou semaines
  const { cols, colWidth, totalWidth } = useMemo(() => {
    if (zoom === 'month') {
      const n = monthsBetween(rangeStart, rangeEnd)
      const cw = Math.max(80, Math.min(120, Math.floor(800 / Math.max(n, 1))))
      const months: string[] = []
      for (let i = 0; i < n; i++) {
        months.push(toMonth(addMonths(rangeStart, i)))
      }
      return { cols: months, colWidth: cw, totalWidth: cw * n }
    } else {
      const weeks = getWeeks(rangeStart, rangeEnd)
      const cw = 64
      return { cols: weeks.map(w => w.toISOString()), colWidth: cw, totalWidth: cw * weeks.length }
    }
  }, [rangeStart, rangeEnd, zoom])

  // Calcul position X d'une date en pixels
  function dateToX(dateStr: string | null | undefined): number {
    const d = parseDate(dateStr)
    if (!d) return 0
    if (zoom === 'month') {
      const diffMs = d.getTime() - rangeStart.getTime()
      const totalMs = rangeEnd.getTime() - rangeStart.getTime()
      return Math.round((diffMs / totalMs) * totalWidth)
    } else {
      const weeks = getWeeks(rangeStart, rangeEnd)
      if (!weeks.length) return 0
      const idx = weeks.findIndex(w => d < new Date(w.getTime() + 7 * 86400000))
      if (idx < 0) return totalWidth
      const wStart = weeks[Math.max(0, idx)]
      const wEnd = new Date(wStart.getTime() + 7 * 86400000)
      const ratio = (d.getTime() - wStart.getTime()) / (wEnd.getTime() - wStart.getTime())
      return Math.round((idx + ratio) * colWidth)
    }
  }

  // Aujourd'hui — mémoïsé pour que le useEffect ait une dépendance stable
  const todayX = useMemo(
    () => dateToX(new Date().toISOString().slice(0, 10)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rangeStart, rangeEnd, totalWidth, zoom]
  )

  // Scroll automatique : affiche la vue 3 mois avant le trait rouge (aujourd'hui)
  useEffect(() => {
    if (view !== 'gantt') return
    if (!scrollRef.current || todayX <= 0) return
    // Position X de "aujourd'hui − 3 mois" → bord gauche du viewport
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setUTCMonth(threeMonthsAgo.getUTCMonth() - 3)
    const offsetX = dateToX(threeMonthsAgo.toISOString().slice(0, 10))
    scrollRef.current.scrollTo({ left: Math.max(0, offsetX), behavior: 'smooth' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayX, view])

  if (loading) return (
    <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
  )

  const ganttH = filtered.length * ROW_H

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">

      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-gray-200 flex-shrink-0">
        <div className="mr-2">
          <h1 className="text-xl font-bold text-gray-900">
            🗓 {t('planning.unified.title')}
          </h1>
          <p className="text-base font-bold text-gray-700 mt-0.5">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Toggle vue Gantt / Liste */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setView('gantt')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1 ${
              view === 'gantt' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
            title="Vue planning Gantt"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>
            {t('planning.unified.title')}
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 text-sm font-medium border-l border-gray-200 transition-colors flex items-center gap-1 ${
              view === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
            title="Vue liste"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            {t('planning.view_list') as any || 'Liste'}
          </button>
        </div>

        {/* Zoom (seulement en vue Gantt) */}
        {view === 'gantt' && (
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setZoom('month')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              zoom === 'month' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >{t('planning.unified.zoom_month')}</button>
          <button
            onClick={() => setZoom('week')}
            className={`px-3 py-1.5 text-sm font-medium border-l border-gray-200 transition-colors ${
              zoom === 'week' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >{t('planning.unified.zoom_week')}</button>
        </div>
        )}

        {/* Filtres */}
        <input
          type="search"
          className="input input-sm max-w-[180px]"
          placeholder={t('common.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="input input-sm"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">{t('planning.all_statuses')}</option>
          {STATUS_LIST.map(s => (
            <option key={s} value={s}>{t(`projects.status.${s}` as any)}</option>
          ))}
        </select>

        {/* Légende */}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {STATUS_LIST.map(s => (
            <span key={s} className="flex items-center gap-1 text-xs text-gray-600">
              <span className="w-3 h-3 rounded-sm inline-block"
                style={{ background: STATUS_COLORS[s] }} />
              {t(`projects.status.${s}` as any)}
            </span>
          ))}
        </div>
      </div>

      {/* ── Vue Liste ────────────────────────────────────────── */}
      {view === 'list' && (
        filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">
            {t('planning.no_results')}
          </div>
        ) : (
          <div className="flex-1 overflow-auto mt-2">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>{t('projects.name' as any, 'Projet')}</th>
                  <th>{t('projects.status' as any, 'Statut')}</th>
                  <th>{t('projects.start_date' as any, 'Début')}</th>
                  <th>{t('projects.end_date' as any, 'Fin')}</th>
                  <th>{t('projects.progress' as any, 'Avancement')}</th>
                  <th>{t('company.city', 'Ville')}</th>
                  <th>{t('lots.title' as any, 'Lots')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const color = STATUS_COLORS[p.status] || '#9ca3af'
                  const start = p.gantt_start ? new Date(p.gantt_start).toLocaleDateString() : '—'
                  const end   = p.gantt_end   ? new Date(p.gantt_end).toLocaleDateString()   : '—'
                  return (
                    <tr key={p.id} className="cursor-pointer hover:bg-gray-50 group" onClick={() => navigate(`/projects/${p.id}`)}>
                      <td className="font-medium text-primary-700">
                        <div className="flex items-center gap-2">
                          {p.name}
                          <a
                            href={`/projects/${p.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-5 h-5 rounded border border-red-300 text-red-400 hover:bg-red-50 hover:border-red-500 hover:text-red-600 text-xs flex-shrink-0 transition-all opacity-50 group-hover:opacity-100"
                            onClick={e => e.stopPropagation()}
                          >↗</a>
                        </div>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: color + '22', color }}>
                          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: color }} />
                          {t(`projects.status.${p.status}` as any)}
                        </span>
                      </td>
                      <td className="text-sm text-gray-500">{start}</td>
                      <td className="text-sm text-gray-500">{end}</td>
                      <td>
                        {p.avg_progress > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${p.avg_progress}%`, background: color }} />
                            </div>
                            <span className="text-xs text-gray-500">{p.avg_progress}%</span>
                          </div>
                        ) : <span className="text-gray-400 text-sm">—</span>}
                      </td>
                      <td className="text-sm text-gray-500">{p.city || '—'}</td>
                      <td className="text-sm text-gray-500">{p.lot_count || 0}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Planning ─────────────────────────────────────────── */}
      {view === 'gantt' && (filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">
          {t('planning.no_results')}
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden mt-2">

          {/* Colonne fixe gauche (noms) */}
          <div className="flex-shrink-0 flex flex-col border-r border-gray-200" style={{ width: LEFT_COL }}>
            {/* Header vide aligné avec l'header Gantt */}
            <div className="h-10 flex-shrink-0 border-b border-gray-200 bg-gray-50" />
            {/* Lignes noms — scroll synchronisé avec la zone Gantt droite */}
            <div
              ref={leftColRef}
              className="flex-1 overflow-y-scroll"
              style={{ scrollbarWidth: 'none' } as React.CSSProperties}
              onScroll={() => {
                if (isSyncingScroll.current) return
                isSyncingScroll.current = true
                if (scrollRef.current && leftColRef.current) {
                  scrollRef.current.scrollTop = leftColRef.current.scrollTop
                }
                requestAnimationFrame(() => { isSyncingScroll.current = false })
              }}
            >
              {filtered.map((p, i) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="group flex items-center gap-2 px-3 cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-100"
                  style={{ height: ROW_H }}
                  title={`${p.name}${p.city ? ' — ' + p.city : ''}`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: STATUS_COLORS[p.status] || '#9ca3af' }}
                  />
                  <span className="text-xs font-medium text-gray-700 truncate leading-tight flex-1">
                    {p.name}
                  </span>
                  {p.city && (
                    <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">
                      {p.city}
                    </span>
                  )}
                  <a
                    href={`/projects/${p.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-4 h-4 rounded border border-red-300 text-red-400 hover:bg-red-50 hover:text-red-600 text-[10px] flex-shrink-0 transition-all opacity-40 group-hover:opacity-100"
                    onClick={e => e.stopPropagation()}
                  >↗</a>
                </div>
              ))}
            </div>
          </div>

          {/* Zone Gantt scrollable */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-auto"
            onScroll={() => {
              if (isSyncingScroll.current) return
              isSyncingScroll.current = true
              if (leftColRef.current && scrollRef.current) {
                leftColRef.current.scrollTop = scrollRef.current.scrollTop
              }
              requestAnimationFrame(() => { isSyncingScroll.current = false })
            }}
          >
            {/* En-tête colonnes */}
            <div
              className="sticky top-0 z-10 flex border-b border-gray-200 bg-gray-50 relative"
              style={{ width: totalWidth, height: 40, minWidth: totalWidth }}
            >
              {cols.map((col, i) => (
                <div
                  key={col}
                  className="flex-shrink-0 border-r border-gray-200 flex items-center justify-center text-xs text-gray-500 font-medium"
                  style={{ width: colWidth }}
                >
                  {zoom === 'month' ? monthLabel(col) : (
                    <div className="flex flex-col items-center leading-none gap-0.5">
                      <span className="font-bold text-primary-600">S{getISOWeek(new Date(col))}</span>
                      <span>{weekLabel(new Date(col))}</span>
                    </div>
                  )}
                </div>
              ))}
              {/* Label "Aujourd'hui" positionné sur la ligne rouge */}
              {todayX > 0 && todayX < totalWidth && (
                <div
                  className="absolute flex flex-col items-center pointer-events-none"
                  style={{ left: todayX, top: 0, transform: 'translateX(-50%)', zIndex: 20 }}
                >
                  <span className="text-[10px] text-red-500 font-semibold whitespace-nowrap bg-gray-50 px-1 leading-tight mt-0.5">
                    {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </span>
                  <div className="w-px flex-1 bg-red-400" style={{ height: 8 }} />
                </div>
              )}
            </div>

            {/* Corps SVG */}
            <svg
              width={totalWidth}
              height={ganttH}
              className="block"
              style={{ minWidth: totalWidth }}
            >
              {/* Fond alterné */}
              {filtered.map((_, i) => (
                <rect
                  key={i}
                  x={0} y={i * ROW_H}
                  width={totalWidth} height={ROW_H}
                  fill={i % 2 === 0 ? '#ffffff' : '#f9fafb'}
                />
              ))}

              {/* Séparateurs colonnes */}
              {cols.map((_, i) => (
                <line
                  key={i}
                  x1={i * colWidth} y1={0}
                  x2={i * colWidth} y2={ganttH}
                  stroke="#e5e7eb" strokeWidth={1}
                />
              ))}

              {/* Ligne aujourd'hui */}
              {todayX > 0 && todayX < totalWidth && (
                <line
                  x1={todayX} y1={0}
                  x2={todayX} y2={ganttH}
                  stroke="#ef4444" strokeWidth={3}
                />
              )}

              {/* Barres projets */}
              {filtered.map((p, i) => {
                const x1 = dateToX(p.gantt_start || p.start_date)
                const x2 = dateToX(p.gantt_end)
                const y  = i * ROW_H + BAR_PAD
                const h  = ROW_H - BAR_PAD * 2
                const hasBar = x2 > x1 && x2 > 0
                const color = STATUS_COLORS[p.status] || '#9ca3af'

                return (
                  <g
                    key={p.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/projects/${p.id}`)}
                  >
                    {hasBar ? (
                      <>
                        {/* Barre principale — pastel */}
                        <rect
                          x={x1} y={y}
                          width={Math.max(x2 - x1, 4)} height={h}
                          rx={3}
                          fill={color}
                          opacity={0.22}
                        />
                        {/* Barre progression — vivid */}
                        {p.avg_progress > 0 && (
                          <rect
                            x={x1} y={y}
                            width={Math.max(((x2 - x1) * (p.avg_progress / 100)), 0)} height={h}
                            rx={3}
                            fill={color}
                            opacity={0.88}
                          />
                        )}
                        {/* Label dans la barre si assez large */}
                        {x2 - x1 > 80 && (
                          <text
                            x={x1 + 6} y={y + h / 2 + 1}
                            fontSize={9} fill="white"
                            fontWeight="500"
                            dominantBaseline="middle"
                            clipPath={`inset(0 0 0 0 round 3px)`}
                          >
                            {p.avg_progress > 0 ? `${p.avg_progress}%` : ''}
                          </text>
                        )}
                      </>
                    ) : (
                      /* Pas de dates → barre grisée symbolique */
                      <rect
                        x={4} y={y}
                        width={Math.max(totalWidth - 8, 10)} height={h}
                        rx={3} fill="#e5e7eb"
                      />
                    )}
                  </g>
                )
              })}

              {/* Séparateurs lignes */}
              {filtered.map((_, i) => (
                <line
                  key={i}
                  x1={0} y1={(i + 1) * ROW_H}
                  x2={totalWidth} y2={(i + 1) * ROW_H}
                  stroke="#f3f4f6" strokeWidth={1}
                />
              ))}
            </svg>
          </div>
        </div>
      ))}

      {/* Footer stats */}
      <div className="flex items-center gap-4 pt-2 border-t border-gray-100 text-xs text-gray-400 flex-shrink-0">
        <span>{filtered.length} {t('projects.count')}</span>
        {filtered.filter(p => p.status === 'en_cours').length > 0 && (
          <span className="text-green-600 font-medium">
            {filtered.filter(p => p.status === 'en_cours').length} {t('projects.status.en_cours')}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1">
          <span className="w-6 h-0.5 bg-red-400 inline-block" />
          {t('planning.today')}
        </span>
      </div>
    </div>
  )
}
