import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'

function parseDate(s?: string): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const m = new Date(d)
  m.setDate(d.getDate() + diff)
  m.setHours(0, 0, 0, 0)
  return m
}

function getISOWeek(d: Date): number {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7)
  const week1 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
}

function detectConflicts(lots: any[]): Set<string> {
  const conflicts = new Set<string>()
  const active = lots.filter(l => l.start_date_planned && l.end_date_planned)
  for (let i = 0; i < active.length; i++) {
    const a = active[i]
    const aS = new Date(a.start_date_planned).getTime()
    const aE = new Date(a.end_date_planned).getTime()
    for (let j = i + 1; j < active.length; j++) {
      const b = active[j]
      const bS = new Date(b.start_date_planned).getTime()
      const bE = new Date(b.end_date_planned).getTime()
      if (aS < bE && bS < aE) {
        conflicts.add(a.id)
        conflicts.add(b.id)
      }
    }
  }
  return conflicts
}

const ROW_H = 34
const BAR_H = 20
const LABEL_W = 270
const DAY_W = 5
const HEADER_H1 = 28   // mois
const HEADER_H2 = 22   // semaines
const HEADER_H = HEADER_H1 + HEADER_H2
const MAX_VIS_H = 660

export default function TeamWorkload() {
  const { id } = useParams<{ id: string }>()
  const [team, setTeam] = useState<any>(null)
  const [lots, setLots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const syncing = useRef(false)

  const loadData = useCallback(async () => {
    if (!id) return
    try {
      const [t, l] = await Promise.all([
        api.teams.get(id),
        api.teams.lots(id),
      ])
      setTeam(t)
      setLots(l)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>
  if (!team) return <div className="text-center py-12 text-gray-500">Équipe introuvable.</div>

  const datedLots = lots.filter(l => l.start_date_planned && l.end_date_planned)
  const conflicts = detectConflicts(lots)

  if (datedLots.length === 0) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Link to="/teams" className="text-sm text-gray-400 hover:text-gray-600">← Équipes</Link>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
            <h1 className="text-xl font-bold text-gray-900">Charge — {team.name}</h1>
          </div>
        </div>
        <div className="card card-body text-center text-gray-400 py-12">
          Aucun lot avec dates planifiées assigné à cette équipe.
        </div>
      </div>
    )
  }

  // ── Timeline bounds (calées sur les lundis) ──────────────────
  const allDates = datedLots.flatMap(l => [new Date(l.start_date_planned), new Date(l.end_date_planned)])
  const minRaw = new Date(Math.min(...allDates.map(d => d.getTime())))
  const maxRaw = new Date(Math.max(...allDates.map(d => d.getTime())))
  const minDate = getMonday(minRaw)
  const lastMonday = getMonday(maxRaw)
  const maxDate = new Date(lastMonday)
  maxDate.setDate(maxDate.getDate() + 6)

  const totalDays = Math.max(daysBetween(minDate, maxDate) + 1, 14)
  const CHART_W = Math.max(totalDays * DAY_W, 700)

  function xOf(date: Date): number {
    return Math.max(daysBetween(minDate, date) * DAY_W, 0)
  }
  function wOf(start: Date, end: Date): number {
    return Math.max(daysBetween(start, end) * DAY_W, DAY_W)
  }

  // ── Grouper par chantier ─────────────────────────────────────
  const projectMap: Record<string, { id: string; name: string; lots: any[] }> = {}
  for (const l of lots) {
    const key = l.project_id || l.project_name || 'unknown'
    if (!projectMap[key]) projectMap[key] = { id: key, name: l.project_name || key, lots: [] }
    projectMap[key].lots.push(l)
  }
  const projects = Object.values(projectMap).sort((a, b) => {
    const aMin = Math.min(...a.lots.filter(l => l.start_date_planned).map(l => new Date(l.start_date_planned).getTime()))
    const bMin = Math.min(...b.lots.filter(l => l.start_date_planned).map(l => new Date(l.start_date_planned).getTime()))
    return aMin - bMin
  })

  // ── Rows plats ───────────────────────────────────────────────
  type Row =
    | { type: 'project'; proj: typeof projects[0]; isCollapsed: boolean }
    | { type: 'lot'; lot: any }
  const rows: Row[] = []
  for (const proj of projects) {
    const isCollapsed = collapsed.has(proj.id)
    rows.push({ type: 'project', proj, isCollapsed })
    if (!isCollapsed) {
      for (const l of proj.lots) rows.push({ type: 'lot', lot: l })
    }
  }
  const totalH = rows.length * ROW_H

  // ── En-têtes mois ────────────────────────────────────────────
  const months: { label: string; x: number; w: number }[] = []
  const cur = new Date(minDate)
  while (cur <= maxDate) {
    const start = new Date(cur)
    const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0)
    const end = monthEnd > maxDate ? maxDate : monthEnd
    months.push({
      label: cur.toLocaleDateString('fr', { month: 'long', year: 'numeric' }),
      x: xOf(start),
      w: wOf(start, end) + DAY_W,
    })
    cur.setMonth(cur.getMonth() + 1)
    cur.setDate(1)
  }

  // ── En-têtes semaines ────────────────────────────────────────
  const weeks: { label: string; x: number }[] = []
  const wCur = new Date(minDate)
  while (wCur <= maxDate) {
    weeks.push({ label: `S${getISOWeek(wCur)}`, x: xOf(wCur) })
    wCur.setDate(wCur.getDate() + 7)
  }

  // ── Ligne Aujourd'hui ────────────────────────────────────────
  const today = new Date()
  const todayX = today >= minDate && today <= maxDate ? xOf(today) : null

  const toggleCollapse = (projId: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(projId) ? next.delete(projId) : next.add(projId)
      return next
    })
  }

  const conflictCount = Math.ceil(conflicts.size / 2)
  const visibleH = Math.min(HEADER_H + totalH + 2, MAX_VIS_H)

  return (
    <div className="space-y-5">
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/teams" className="text-sm text-gray-400 hover:text-gray-600">← Équipes</Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
              <h1 className="text-xl font-bold text-gray-900">Charge — {team.name}</h1>
            </div>
            {team.leader_name && (
              <p className="text-sm text-gray-400">Chef d'équipe : {team.leader_name.trim()}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500">
            {lots.length} lot{lots.length > 1 ? 's' : ''} · {projects.length} chantier{projects.length > 1 ? 's' : ''}
          </span>
          {conflictCount > 0 && (
            <span className="bg-orange-100 text-orange-700 border border-orange-200 px-3 py-1 rounded-full font-semibold">
              ⚠ {conflictCount} chevauchement{conflictCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {conflictCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 text-sm px-4 py-3 rounded-lg">
          ⚠ Des lots se chevauchent temporellement (surlignés en orange). Vérifiez la disponibilité de l'équipe.
        </div>
      )}

      {/* ── Gantt ── */}
      <div className="card overflow-hidden" style={{ height: visibleH }}>
        <div className="flex h-full">

          {/* Colonne gauche : labels */}
          <div style={{ width: LABEL_W, flexShrink: 0 }} className="border-r border-gray-200 flex flex-col">
            <div style={{ height: HEADER_H, flexShrink: 0 }}
              className="border-b border-gray-200 bg-gray-50 flex items-end px-3 pb-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chantier / Lot</span>
            </div>
            <div
              ref={leftRef}
              className="flex-1 overflow-y-scroll"
              style={{ scrollbarWidth: 'none' } as React.CSSProperties}
              onScroll={() => {
                if (syncing.current) return
                syncing.current = true
                if (rightRef.current && leftRef.current) rightRef.current.scrollTop = leftRef.current.scrollTop
                requestAnimationFrame(() => { syncing.current = false })
              }}
            >
              {rows.map((row, i) => {
                if (row.type === 'project') {
                  const { proj, isCollapsed } = row
                  const pLots = proj.lots.filter(l => l.start_date_planned && l.end_date_planned)
                  const pStart = pLots.length ? new Date(Math.min(...pLots.map(l => new Date(l.start_date_planned).getTime()))) : null
                  const pEnd = pLots.length ? new Date(Math.max(...pLots.map(l => new Date(l.end_date_planned).getTime()))) : null
                  return (
                    <div key={`proj-${proj.id}`} style={{ height: ROW_H }}
                      className="border-b border-gray-200 bg-gray-50 flex items-center px-2 gap-2 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => toggleCollapse(proj.id)}>
                      <span className="text-gray-400 text-xs w-3 flex-shrink-0">{isCollapsed ? '▶' : '▼'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 truncate">{proj.name}</p>
                        <p className="text-xs text-gray-400">
                          {proj.lots.length} lot{proj.lots.length > 1 ? 's' : ''}
                          {pStart && pEnd
                            ? ` · ${pStart.toLocaleDateString('fr', { day: 'numeric', month: 'short' })} → ${pEnd.toLocaleDateString('fr', { day: 'numeric', month: 'short', year: '2-digit' })}`
                            : ''}
                        </p>
                      </div>
                    </div>
                  )
                } else {
                  const { lot } = row
                  return (
                    <div key={`lot-${lot.id}`} style={{ height: ROW_H }}
                      className={`border-b border-gray-100 flex items-center gap-2 pl-6 pr-2 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: lot.color || team.color || '#6B7280' }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-700 truncate">{lot.code} — {lot.name}</p>
                      </div>
                      {conflicts.has(lot.id) && <span className="text-orange-500 text-xs flex-shrink-0">⚠</span>}
                    </div>
                  )
                }
              })}
            </div>
          </div>

          {/* Partie droite : timeline */}
          <div
            ref={rightRef}
            className="flex-1 overflow-auto"
            onScroll={() => {
              if (syncing.current) return
              syncing.current = true
              if (leftRef.current && rightRef.current) leftRef.current.scrollTop = rightRef.current.scrollTop
              requestAnimationFrame(() => { syncing.current = false })
            }}
          >
            <div style={{ width: CHART_W, minWidth: '100%' }}>

              {/* En-tête mois (sticky) */}
              <div style={{ height: HEADER_H1, display: 'flex', position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#f9fafb' }}>
                {months.map((m, i) => (
                  <div key={i} style={{ width: m.w, flexShrink: 0, borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}
                    className="flex items-center justify-center">
                    <span className="text-xs font-semibold text-gray-700 truncate px-1">{m.label}</span>
                  </div>
                ))}
              </div>

              {/* En-tête semaines (sticky) */}
              <div style={{ height: HEADER_H2, display: 'flex', position: 'sticky', top: HEADER_H1, zIndex: 20, backgroundColor: '#f9fafb' }}>
                {weeks.map((w, i) => (
                  <div key={i} style={{ width: 7 * DAY_W, flexShrink: 0, borderRight: '1px solid #f3f4f6', borderBottom: '2px solid #e5e7eb' }}
                    className="flex items-center justify-center">
                    <span className="text-xs text-gray-400">{w.label}</span>
                  </div>
                ))}
              </div>

              {/* Zone barres */}
              <div style={{ position: 'relative', height: totalH }}>

                {weeks.map((w, i) => (
                  <div key={i} style={{ position: 'absolute', left: w.x, top: 0, bottom: 0, width: 1, backgroundColor: '#f3f4f6' }} />
                ))}
                {months.map((m, i) => (
                  <div key={i} style={{ position: 'absolute', left: m.x, top: 0, bottom: 0, width: 1, backgroundColor: '#e5e7eb' }} />
                ))}

                {todayX !== null && (
                  <div style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: 2, backgroundColor: '#ef4444', opacity: 0.75, zIndex: 5 }}>
                    <div style={{ position: 'absolute', top: 2, left: -14, backgroundColor: '#ef4444', color: 'white', fontSize: 9, padding: '1px 3px', borderRadius: 3, whiteSpace: 'nowrap' }}>
                      Auj.
                    </div>
                  </div>
                )}

                {rows.map((row, i) => (
                  <div key={i} style={{ position: 'absolute', left: 0, top: i * ROW_H, width: '100%', height: ROW_H }}
                    className={row.type === 'project' ? 'bg-gray-50/70' : ''} />
                ))}

                {rows.map((row, i) => {
                  if (row.type === 'project') {
                    const pLots = row.proj.lots.filter(l => l.start_date_planned && l.end_date_planned)
                    if (!pLots.length) return null
                    const pStart = new Date(Math.min(...pLots.map(l => new Date(l.start_date_planned).getTime())))
                    const pEnd = new Date(Math.max(...pLots.map(l => new Date(l.end_date_planned).getTime())))
                    return (
                      <div key={`pbar-${row.proj.id}`} style={{
                        position: 'absolute',
                        left: xOf(pStart),
                        top: i * ROW_H + (ROW_H - BAR_H) / 2,
                        width: wOf(pStart, pEnd) + DAY_W,
                        height: BAR_H,
                        backgroundColor: team.color || '#6366f1',
                        opacity: 0.12,
                        borderRadius: 4,
                        border: `1.5px solid ${team.color || '#6366f1'}`,
                      }} />
                    )
                  } else {
                    const { lot } = row
                    const startD = parseDate(lot.start_date_planned)
                    const endD = parseDate(lot.end_date_planned)
                    if (!startD || !endD) {
                      return (
                        <div key={`nod-${lot.id}`} style={{ position: 'absolute', top: i * ROW_H + (ROW_H - BAR_H) / 2, left: 8 }}>
                          <span className="text-xs text-gray-300 italic">Non planifié</span>
                        </div>
                      )
                    }
                    const bx = xOf(startD)
                    const bw = Math.max(wOf(startD, endD) + DAY_W, DAY_W * 2)
                    const isConflict = conflicts.has(lot.id)
                    const barColor = isConflict ? '#f97316' : (lot.color || team.color || '#6B7280')
                    return (
                      <div key={`lbar-${lot.id}`}
                        title={`${lot.code} — ${lot.name}\n${lot.start_date_planned} → ${lot.end_date_planned}${lot.progress_percent > 0 ? `\nAvancement : ${lot.progress_percent}%` : ''}`}
                        style={{
                          position: 'absolute',
                          left: bx,
                          top: i * ROW_H + (ROW_H - BAR_H) / 2,
                          width: bw,
                          height: BAR_H,
                          backgroundColor: barColor,
                          opacity: lot.status === 'done' ? 0.5 : 0.85,
                          borderRadius: 4,
                          border: isConflict ? '2px solid #ea580c' : undefined,
                          zIndex: 2,
                          overflow: 'hidden',
                        }}>
                        {lot.progress_percent > 0 && (
                          <div style={{ width: `${lot.progress_percent}%`, height: '100%', backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: '4px 0 0 4px' }} />
                        )}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 5 }}>
                          <span style={{ color: 'white', fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {lot.code}{lot.status === 'done' ? ' ✓' : lot.progress_percent > 0 ? ` ${lot.progress_percent}%` : ''}
                          </span>
                        </div>
                      </div>
                    )
                  }
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-5 text-xs text-gray-500 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span style={{ display: 'inline-block', width: 16, height: 12, borderRadius: 3, backgroundColor: team.color || '#6366f1', opacity: 0.12, border: `1.5px solid ${team.color || '#6366f1'}` }} />
          Span chantier
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-3 rounded bg-gray-400" style={{ opacity: 0.85 }} />
          Lot actif
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-3 rounded bg-gray-400" style={{ opacity: 0.5 }} />
          Lot terminé
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-3 rounded bg-orange-400" style={{ border: '2px solid #ea580c' }} />
          Chevauchement
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ display: 'inline-block', width: 2, height: 16, backgroundColor: '#ef4444', opacity: 0.75, borderRadius: 1 }} />
          Aujourd'hui
        </span>
      </div>
    </div>
  )
}
