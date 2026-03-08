import { useState, useRef, useEffect } from 'react'
import { useT } from '../i18n'
import { api } from '../api/client'

interface Lot {
  id: string; code: string; name: string; name_tr?: string; color: string
  start_date_planned?: string; end_date_planned?: string
  early_start: number; early_finish: number; duration_days: number
  progress_percent: number; status: string; is_critical: number
  subcontractor_name?: string
  market_deadline?: string
  is_provisional?: number
  parent_lot_id?: string
}

interface Dep {
  id: string; predecessor_id: string; successor_id: string; type: string; lag_days: number
}

interface Milestone {
  id: string; name: string; date: string; color: string
}

interface LotTask {
  id: string; lot_id: string; name: string; type: string
  start_date?: string; end_date?: string; progress: number
  subcontractor_name?: string
}

interface LotAssignment {
  id: string; lot_id: string; subcontractor_id: string
  subcontractor_name: string; company_name?: string
  start_date?: string; end_date?: string; progress: number
}

const TASK_H = 14   // height of a sub-task bar
const TASK_GAP = 2  // gap between sub-task bars
const ASGN_H = 16   // height of an assignment sub-row
const ASGN_GAP = 2  // gap between assignment sub-rows
const ASGN_COLORS = ['#6366f1', '#f97316', '#22c55e', '#ec4899', '#14b8a6', '#8b5cf6', '#f59e0b', '#06b6d4']

interface Props {
  lots: Lot[]
  deps: Dep[]
  projectStartDate?: string
  lang?: string
  projectId?: string
  onRefresh?: () => void
  readOnly?: boolean
  milestones?: Milestone[]
  onMilestoneClick?: (m: Milestone) => void
  lotTasks?: Record<string, LotTask[]>       // keyed by lot_id, only used in day/week zoom
  lotAssignments?: Record<string, LotAssignment[]>  // keyed by lot_id, all zoom levels
  highlightedLotIds?: Set<string>            // lots à mettre en valeur (vue utilisateur)
  onLotClick?: (lotId: string) => void       // clic simple sur un lot → fiche
}

interface DragState {
  lotId: string
  mode: 'move' | 'resize'
  originalStart: number
  originalEnd: number
  originalDuration: number
  offsetDays: number
  deltaDays: number
  mouseX: number
  mouseY: number
}

type Zoom = 'day' | 'week' | 'month'

const COL_W: Record<Zoom, number> = { day: 28, week: 80, month: 120 }
const ROW_H = 44
const LABEL_W = 260

function addDays(date: Date, n: number): Date {
  const d = new Date(date); d.setDate(d.getDate() + n); return d
}

function formatDate(d: Date, zoom: Zoom): string {
  if (zoom === 'day') return d.getDate().toString()
  if (zoom === 'week') return `S${Math.ceil(d.getDate() / 7)}\n${d.toLocaleDateString('fr', { month: 'short' })}`
  return d.toLocaleDateString('fr', { month: 'short', year: '2-digit' })
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString('fr', { day: 'numeric', month: 'short' })
}

function daysBetween(start: Date, isoDate: string): number {
  const target = new Date(isoDate)
  return Math.round((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

// Compute which lots must cascade when `movedId`'s finish shifts right by `delta` days
function computeCascade(
  lots: Lot[], deps: Dep[], movedId: string, delta: number
): Array<{ lot: Lot; newStart: number; newEnd: number }> {
  if (delta <= 0) return []
  const changes = new Map<string, number>() // lotId → delta
  changes.set(movedId, delta)
  const queue = [movedId]
  while (queue.length > 0) {
    const curId = queue.shift()!
    const curDelta = changes.get(curId)!
    const curLot = lots.find(l => l.id === curId)!
    const newFinish = curLot.early_finish + curDelta
    for (const dep of deps) {
      if (dep.predecessor_id !== curId || dep.type !== 'FS') continue
      const succ = lots.find(l => l.id === dep.successor_id)
      if (!succ) continue
      const minStart = newFinish + (dep.lag_days || 0)
      if (succ.early_start < minStart) {
        const succDelta = minStart - succ.early_start
        if (succDelta > (changes.get(succ.id) ?? 0)) {
          changes.set(succ.id, succDelta)
          queue.push(succ.id)
        }
      }
    }
  }
  changes.delete(movedId) // saved separately
  return Array.from(changes.entries()).map(([lotId, d]) => {
    const lot = lots.find(l => l.id === lotId)!
    return { lot, newStart: lot.early_start + d, newEnd: lot.early_finish + d }
  })
}

export default function GanttChart({ lots, deps, projectStartDate, lang = 'fr', projectId, onRefresh, readOnly = false, milestones = [], onMilestoneClick, lotTasks = {}, lotAssignments = {}, highlightedLotIds = new Set<string>(), onLotClick }: Props) {
  const t = useT()
  const [zoom, setZoom] = useState<Zoom>('week')
  const [tooltip, setTooltip] = useState<{ lot: Lot; x: number; y: number } | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const chartAreaRef = useRef<HTMLDivElement>(null)
  const ganttRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  dragRef.current = drag
  const didDragRef = useRef(false) // true si la souris a bougé pendant le mousedown
  const lotsRef = useRef(lots)
  lotsRef.current = lots
  const depsRef = useRef(deps)
  depsRef.current = deps
  const zoomSettledRef = useRef<((z: Zoom) => void) | null>(null)

  const lotsWithDates = lots.filter(l => l.early_finish > 0 || l.start_date_planned)
  if (!lotsWithDates.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <svg className="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">{t('planning.no_dates')}</p>
      </div>
    )
  }

  const totalDays = Math.max(...lots.map(l => l.early_finish), 1)
  const startDate = projectStartDate ? new Date(projectStartDate) : new Date()
  const colW = COL_W[zoom]
  const cols = zoom === 'day' ? totalDays
    : zoom === 'week' ? Math.ceil(totalDays / 7) + 1
    : Math.ceil(totalDays / 30) + 1
  const totalW = cols * colW

  // When zoom is day/week, sub-tasks expand each lot row
  const showTasks = zoom === 'day' || zoom === 'week'
  function lotRowH(lotId: string): number {
    const asgns = lotAssignments[lotId] || []
    const tasks = showTasks ? (lotTasks[lotId] || []) : []
    const extra = asgns.length * (ASGN_H + ASGN_GAP) + tasks.length * (TASK_H + TASK_GAP)
    if (extra === 0) return ROW_H
    return ROW_H + extra + 4
  }
  function lotRowY(idx: number): number {
    return lots.slice(0, idx).reduce((acc, l) => acc + lotRowH(l.id), 0)
  }
  const totalH = lots.reduce((acc, l) => acc + lotRowH(l.id), 0)
  // Keep a ref of current render's calculated values so async export can read them after a zoom change
  const calcRef = useRef({ colW, cols, totalW, totalH })
  calcRef.current = { colW, cols, totalW, totalH }

  function dayToX(day: number): number {
    if (zoom === 'day') return day * colW
    if (zoom === 'week') return (day / 7) * colW
    return (day / 30) * colW
  }

  function durationToW(dur: number): number {
    if (zoom === 'day') return Math.max(dur * colW, 20)
    if (zoom === 'week') return Math.max((dur / 7) * colW, 20)
    return Math.max((dur / 30) * colW, 20)
  }

  const canDrag = !!(projectId && onRefresh) && !readOnly

  // Build position map for dep arrows (follows dragged bar live)
  const lotMap: Record<string, { x: number; y: number; w: number }> = {}
  lots.forEach((l, i) => {
    const isActive = drag?.lotId === l.id
    const effectiveStart = isActive && drag!.mode === 'move' ? l.early_start + drag!.deltaDays : l.early_start
    const effectiveDuration = isActive && drag!.mode === 'resize'
      ? Math.max(1, l.duration_days + drag!.deltaDays)
      : l.duration_days
    lotMap[l.id] = { x: dayToX(effectiveStart), y: lotRowY(i) + ROW_H / 2, w: durationToW(effectiveDuration) }
  })

  // Global mouse handlers — only active during drag
  useEffect(() => {
    if (!drag) return

    // Capture zoom/colW at drag-start time (won't change mid-drag)
    const capturedColW = colW
    const capturedZoom = zoom

    function pixToDayLocal(px: number): number {
      if (capturedZoom === 'day') return px / capturedColW
      if (capturedZoom === 'week') return (px / capturedColW) * 7
      return (px / capturedColW) * 30
    }

    const onMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d || !chartAreaRef.current) return
      const rect = chartAreaRef.current.getBoundingClientRect()
      const scrollLeft = chartAreaRef.current.scrollLeft
      const mouseChartX = e.clientX - rect.left + scrollLeft
      const mouseDay = pixToDayLocal(mouseChartX)

      if (d.mode === 'move') {
        const newStartDay = Math.max(0, Math.round(mouseDay - d.offsetDays))
        const newDelta = newStartDay - d.originalStart
        if (Math.abs(newDelta) > 0) didDragRef.current = true
        setDrag(prev => prev ? { ...prev, deltaDays: newDelta, mouseX: e.clientX, mouseY: e.clientY } : null)
      } else {
        // resize: new finish = mouse day, clamp to at least start+1
        const newFinish = Math.max(d.originalStart + 1, Math.round(mouseDay))
        const durationDelta = newFinish - d.originalStart - d.originalDuration
        if (Math.abs(durationDelta) > 0) didDragRef.current = true
        setDrag(prev => prev ? { ...prev, deltaDays: durationDelta, mouseX: e.clientX, mouseY: e.clientY } : null)
      }
    }

    const onUp = async () => {
      const d = dragRef.current
      setDrag(null)
      if (!d || d.deltaDays === 0) return

      function buildBody(start: number, end: number, durationDays?: number): Record<string, any> {
        const b: Record<string, any> = { early_start: start, early_finish: end }
        if (durationDays !== undefined) b.duration_days = durationDays
        if (projectStartDate) {
          b.start_date_planned = addDays(new Date(projectStartDate), start).toISOString().slice(0, 10)
          b.end_date_planned = addDays(new Date(projectStartDate), end).toISOString().slice(0, 10)
        }
        return b
      }

      setSaving(true)
      try {
        if (d.mode === 'move') {
          const newStart = d.originalStart + d.deltaDays
          const newEnd = d.originalEnd + d.deltaDays
          await api.lots.updateDates(d.lotId, buildBody(newStart, newEnd) as any)
          const cascaded = computeCascade(lotsRef.current, depsRef.current, d.lotId, d.deltaDays)
          for (const { lot, newStart: cs, newEnd: ce } of cascaded) {
            await api.lots.updateDates(lot.id, buildBody(cs, ce) as any)
          }
        } else {
          // resize
          const newDuration = Math.max(1, d.originalDuration + d.deltaDays)
          const newEnd = d.originalStart + newDuration
          await api.lots.updateDates(d.lotId, buildBody(d.originalStart, newEnd, newDuration) as any)
          // If lengthened, cascade FS successors whose start would conflict
          if (d.deltaDays > 0) {
            const cascaded = computeCascade(lotsRef.current, depsRef.current, d.lotId, d.deltaDays)
            for (const { lot, newStart: cs, newEnd: ce } of cascaded) {
              await api.lots.updateDates(lot.id, buildBody(cs, ce) as any)
            }
          }
        }
        onRefresh?.()
      } catch {}
      finally { setSaving(false) }
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [drag?.lotId, drag?.mode, projectStartDate, onRefresh]) // re-run only when drag session changes

  // Signal zoom-change listeners (used by exportPDF to know when re-render is done)
  useEffect(() => {
    zoomSettledRef.current?.(zoom)
    zoomSettledRef.current = null
  }, [zoom])

  const dragCursor = drag ? (drag.mode === 'resize' ? 'col-resize' : 'grabbing') : undefined

  const exportPDF = async (format: 'A4' | 'A3') => {
    if (exporting || !ganttRef.current || !chartAreaRef.current) return
    setExporting(true)
    const origZoom = zoom
    try {
      // Switch to month zoom for better PDF aspect ratio (fewer columns = taller bars)
      if (zoom !== 'month') {
        await new Promise<void>(resolve => {
          zoomSettledRef.current = () => resolve()
          setZoom('month')
        })
        await new Promise(r => setTimeout(r, 60)) // let DOM paint
      }

      const { colW: expColW, totalW: expTotalW, totalH: expTotalH } = calcRef.current

      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      const scrollEl = chartAreaRef.current
      const prevOverflow = scrollEl.style.overflowX
      const prevWidth = scrollEl.style.width
      scrollEl.style.overflowX = 'visible'
      scrollEl.style.width = expTotalW + 'px'

      const fullW = LABEL_W + expTotalW + expColW * 2
      const fullH = expTotalH + 44
      const canvas = await html2canvas(ganttRef.current, {
        scale: 2, useCORS: true, logging: false,
        width: fullW, height: fullH, windowWidth: fullW + 100,
      })

      scrollEl.style.overflowX = prevOverflow
      scrollEl.style.width = prevWidth

      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: format.toLowerCase() as 'a4' | 'a3' })
      const [pw, ph] = format === 'A4' ? [297, 210] : [420, 297]
      const margin = 8
      const maxW = pw - 2 * margin
      const maxH = ph - 2 * margin
      const imgW = canvas.width / 2
      const imgH = canvas.height / 2
      let finalW = maxW
      let finalH = (imgH / imgW) * maxW
      if (finalH > maxH) { finalH = maxH; finalW = (imgW / imgH) * maxH }
      pdf.addImage(imgData, 'JPEG', margin, margin, finalW, finalH)
      pdf.save(`planning_${format}_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error('PDF export error:', err)
    } finally {
      setZoom(origZoom)
      setExporting(false)
    }
  }

  return (
    <div className="space-y-3" style={{ cursor: dragCursor, userSelect: drag ? 'none' : undefined }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-gray-600">Zoom :</span>
        {(['day', 'week', 'month'] as Zoom[]).map(z => (
          <button key={z} onClick={() => setZoom(z)}
            className={`btn btn-sm ${zoom === z ? 'btn-primary' : 'btn-ghost'}`}>
            {t(`planning.zoom_${z}` as any)}
          </button>
        ))}
        {!readOnly && (
          <div className="flex items-center gap-1 border-l border-gray-200 pl-2 ml-1">
            <span className="text-xs text-gray-400 mr-1">PDF :</span>
            <button onClick={() => exportPDF('A4')} disabled={exporting}
              className="btn btn-sm btn-ghost text-xs" title="Export PDF A4 paysage">
              {exporting ? '⏳' : '🖨'} A4
            </button>
            <button onClick={() => exportPDF('A3')} disabled={exporting}
              className="btn btn-sm btn-ghost text-xs" title="Export PDF A3 paysage">
              {exporting ? '⏳' : '🖨'} A3
            </button>
          </div>
        )}
        <div className="ml-auto flex items-center gap-3 text-xs text-gray-500 flex-wrap justify-end">
          {saving && <span className="text-blue-500 animate-pulse">💾 Enregistrement...</span>}
          {exporting && <span className="text-purple-500 animate-pulse">🖨 Génération PDF...</span>}
          {canDrag && !saving && <span className="text-gray-400 italic hidden sm:inline">↔ Glisser · Bord droit = redimensionner</span>}
          {/* Légende */}
          <div className="flex items-center gap-3 border-l border-gray-200 pl-3">
            <span className="flex items-center gap-1">
              <span className="w-4 h-3 rounded ring-2 ring-red-400 inline-block bg-gray-200" />
              <span className="hidden sm:inline">{t('planning.critical_path')}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-3 rounded opacity-70 inline-block bg-green-400" />
              <span className="hidden sm:inline">{t('lots.status.done')}</span>
            </span>
            <span className="flex items-center gap-1">
              <svg width="20" height="12"><line x1="10" y1="0" x2="10" y2="12" stroke="#ef4444" strokeWidth="2" strokeDasharray="3 1" /></svg>
              <span className="hidden sm:inline">Jalon</span>
            </span>
            <span className="flex items-center gap-1">
              <svg width="22" height="12"><path d="M2,6 C8,6 14,6 20,6" fill="none" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#a2)" /><defs><marker id="a2" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto"><path d="M0,0 L0,4 L4,2 z" fill="#94a3b8" /></marker></defs></svg>
              <span className="hidden sm:inline">FS</span>
            </span>
            <span className="flex items-center gap-1">
              <svg width="22" height="12"><path d="M2,6 C8,6 14,6 20,6" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 2" markerEnd="url(#a3)" /><defs><marker id="a3" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto"><path d="M0,0 L0,4 L4,2 z" fill="#10b981" /></marker></defs></svg>
              <span className="hidden sm:inline">SS</span>
            </span>
            <span className="flex items-center gap-1">
              <svg width="20" height="12"><line x1="10" y1="0" x2="10" y2="12" stroke="#f97316" strokeWidth="1.5" strokeDasharray="3 2" /><polygon points="10,6 6,12 14,12" fill="#f97316" /></svg>
              <span className="hidden sm:inline">Échéance</span>
            </span>
          </div>
        </div>
      </div>

      {/* Gantt */}
      <div ref={ganttRef} className="gantt-container border border-gray-200 rounded-lg bg-white">
        <div style={{ display: 'flex', minWidth: LABEL_W + totalW }}>
          {/* Labels column */}
          <div style={{ width: LABEL_W, flexShrink: 0 }} className="border-r border-gray-200 bg-gray-50">
            <div style={{ height: 40 }} className="border-b border-gray-200 flex items-center px-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lot</span>
            </div>
            {lots.map((l) => {
              const asgns = lotAssignments[l.id] || []
              const tasks = showTasks ? (lotTasks[l.id] || []) : []
              const rh = lotRowH(l.id)
              return (
                <div key={l.id} style={{ height: rh }}
                  className={`border-b border-gray-100 hover:bg-gray-50 cursor-default${l.parent_lot_id ? ' bg-gray-50/70' : ''}${highlightedLotIds.has(l.id) ? ' border-l-4 border-l-accent-500 bg-accent-50/40' : ''}`}>
                  <div style={{ height: ROW_H, paddingLeft: highlightedLotIds.has(l.id) ? (l.parent_lot_id ? 16 : 8) : (l.parent_lot_id ? 20 : 12) }} className="flex items-center gap-2 pr-3">
                    {l.parent_lot_id && <span className="text-gray-300 flex-shrink-0" style={{ fontSize: 10 }}>↳</span>}
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                    <span className="text-xs font-semibold text-gray-500 w-8 flex-shrink-0">{l.code}</span>
                    <span className={`text-xs truncate flex-1 ${l.parent_lot_id ? 'text-gray-600' : 'text-gray-700'}`}>{lang === 'tr' && l.name_tr ? l.name_tr : l.name}</span>
                    {l.is_critical ? <span className="text-red-400 text-xs">●</span> : null}
                  </div>
                  {asgns.map((asgn, ai) => (
                    <div key={asgn.id} style={{ height: ASGN_H, marginBottom: ASGN_GAP }}
                      className="flex items-center px-3 gap-1">
                      <span style={{ fontSize: 9, color: ASGN_COLORS[ai % ASGN_COLORS.length] }}>◉</span>
                      <span className="text-gray-600 truncate" style={{ fontSize: 9 }}>{asgn.subcontractor_name}</span>
                    </div>
                  ))}
                  {tasks.map(task => (
                    <div key={task.id} style={{ height: TASK_H, marginBottom: TASK_GAP }}
                      className="flex items-center px-3 gap-1">
                      <span className="text-gray-400" style={{ fontSize: 9 }}>└</span>
                      <span className="text-gray-500 truncate" style={{ fontSize: 9 }}>{task.name}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Scrollable chart area */}
          <div ref={chartAreaRef} style={{ flex: 1, overflowX: 'auto', position: 'relative' }}>
            {/* Column headers */}
            <div style={{ height: 40, width: totalW }} className="border-b border-gray-200 flex bg-gray-50 sticky top-0 z-10">
              {Array.from({ length: cols }).map((_, i) => {
                const d = zoom === 'day' ? addDays(startDate, i)
                  : zoom === 'week' ? addDays(startDate, i * 7)
                  : addDays(startDate, i * 30)
                return (
                  <div key={i} style={{ width: colW, flexShrink: 0 }}
                    className="border-r border-gray-200 flex items-center justify-center">
                    <span className="text-xs text-gray-500 whitespace-pre-wrap text-center leading-tight">
                      {formatDate(d, zoom)}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Chart rows */}
            <div style={{ position: 'relative', width: totalW, height: totalH }}>
              {/* Vertical grid lines */}
              {Array.from({ length: cols }).map((_, i) => (
                <div key={i} style={{
                  position: 'absolute', left: i * colW, top: 0, bottom: 0, width: 1,
                  backgroundColor: i % (zoom === 'day' ? 7 : 1) === 0 ? '#d1d5db' : '#f3f4f6'
                }} />
              ))}
              {/* Row backgrounds */}
              {lots.map((l, i) => (
                <div key={i} style={{ position: 'absolute', left: 0, top: lotRowY(i), width: '100%', height: lotRowH(l.id) }}
                  className={i % 2 === 0 ? 'bg-transparent' : 'bg-gray-50/50'} />
              ))}

              {/* Dependency arrows */}
              <svg ref={svgRef} style={{ position: 'absolute', top: 0, left: 0, width: totalW, height: totalH, pointerEvents: 'none', overflow: 'visible' }}>
                {deps.map(d => {
                  const from = lotMap[d.predecessor_id]
                  const to = lotMap[d.successor_id]
                  if (!from || !to) return null
                  const x1 = from.x + from.w, y1 = from.y
                  const x2 = to.x, y2 = to.y
                  const mid = (x1 + x2) / 2
                  return (
                    <g key={d.id}>
                      <path d={`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`}
                        fill="none" stroke={d.type === 'SS' ? '#10b981' : '#94a3b8'} strokeWidth="1.5"
                        strokeDasharray={d.type === 'SS' ? '4 2' : undefined} markerEnd="url(#arrow)" opacity="0.7" />
                    </g>
                  )
                })}
                {/* Milestone vertical lines */}
                {milestones.map(m => {
                  const dayOffset = daysBetween(startDate, m.date)
                  const x = dayToX(dayOffset)
                  if (x < 0 || x > totalW + 60) return null
                  return (
                    <g key={m.id} style={{ pointerEvents: onMilestoneClick ? 'auto' : 'none', cursor: onMilestoneClick ? 'pointer' : 'default' }}
                      onClick={() => onMilestoneClick?.(m)}>
                      {/* Hover hit area */}
                      <rect x={x - 6} y={0} width={12} height={totalH} fill="transparent" />
                      {/* Dashed vertical line */}
                      <line x1={x} y1={0} x2={x} y2={totalH}
                        stroke={m.color} strokeWidth="2" strokeDasharray="5 3" opacity="0.85" />
                      {/* Diamond marker at top */}
                      <polygon points={`${x},0 ${x + 7},7 ${x},14 ${x - 7},7`}
                        fill={m.color} opacity="0.9" />
                      {/* Label rotated */}
                      <text x={x + 4} y={-4} fontSize="10" fill={m.color} fontWeight="600"
                        style={{ transform: `rotate(-55deg)`, transformOrigin: `${x + 4}px -4px`, userSelect: 'none' }}>
                        {m.name}
                      </text>
                    </g>
                  )
                })}
                {/* Market deadline markers (orange triangle at bottom) */}
                {lots.filter(l => l.market_deadline).map(l => {
                  const ddOffset = daysBetween(startDate, l.market_deadline!)
                  const ddX = dayToX(ddOffset)
                  if (ddX < 0 || ddX > totalW + 60) return null
                  return (
                    <g key={`dd-${l.id}`}>
                      <line x1={ddX} y1={0} x2={ddX} y2={totalH}
                        stroke="#f97316" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
                      <polygon points={`${ddX},${totalH - 14} ${ddX - 6},${totalH} ${ddX + 6},${totalH}`}
                        fill="#f97316" opacity="0.85" />
                      <text x={ddX + 3} y={totalH - 4} fontSize="9" fill="#f97316" fontWeight="600"
                        style={{ userSelect: 'none' }}>
                        {l.code}
                      </text>
                    </g>
                  )
                })}
                <defs>
                  <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="#94a3b8" />
                  </marker>
                </defs>
              </svg>

              {/* Bars */}
              {lots.map((l, i) => {
                const isDragged = drag?.lotId === l.id
                const effectiveStart = isDragged && drag!.mode === 'move' ? l.early_start + drag!.deltaDays : l.early_start
                const effectiveDuration = isDragged && drag!.mode === 'resize'
                  ? Math.max(1, l.duration_days + drag!.deltaDays)
                  : l.duration_days
                const x = dayToX(effectiveStart)
                const w = durationToW(effectiveDuration)
                const y = lotRowY(i)
                const rh = lotRowH(l.id)
                const progressW = w * (l.progress_percent / 100)
                const asgns = lotAssignments[l.id] || []
                const tasks = showTasks ? (lotTasks[l.id] || []) : []

                return (
                  <div key={l.id}
                    style={{ position: 'absolute', top: y, left: 0, width: '100%', height: rh }}
                    onMouseEnter={!drag ? (e) => setTooltip({ lot: l, x: e.clientX, y: e.clientY }) : undefined}
                    onMouseLeave={!drag ? () => setTooltip(null) : undefined}>
                    <div
                      draggable={false}
                      style={{
                        position: 'absolute', left: x, top: l.parent_lot_id ? 10 : 8, height: l.parent_lot_id ? 22 : 28, width: w,
                        backgroundColor: l.color,
                        opacity: isDragged ? 0.75 : (l.status === 'done' ? 0.6 : l.is_provisional ? 0.45 : 0.85),
                        borderRadius: 6,
                        cursor: canDrag ? (isDragged && drag!.mode === 'resize' ? 'col-resize' : isDragged ? 'grabbing' : 'grab') : 'default',
                        boxShadow: isDragged ? '0 4px 16px rgba(0,0,0,0.25)' : undefined,
                        backgroundImage: l.is_provisional && !isDragged
                          ? 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.35) 5px, rgba(255,255,255,0.35) 10px)'
                          : undefined,
                      }}
                      className={l.is_critical && !isDragged ? 'ring-2 ring-red-400 ring-offset-0' : ''}
                      onClick={(e) => {
                        // Ne déclencher onLotClick que si c'était un vrai clic (pas un drag)
                        if (!didDragRef.current) {
                          onLotClick?.(l.id)
                        }
                      }}
                      onMouseDown={canDrag ? (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        didDragRef.current = false  // réinitialise à chaque mousedown
                        setTooltip(null)
                        const area = chartAreaRef.current
                        if (!area) return
                        const rect = area.getBoundingClientRect()
                        const scrollLeft = area.scrollLeft
                        const mouseChartX = e.clientX - rect.left + scrollLeft
                        const clickDay = zoom === 'day' ? mouseChartX / colW
                          : zoom === 'week' ? (mouseChartX / colW) * 7
                          : (mouseChartX / colW) * 30
                        const offsetDays = Math.max(0, Math.min(clickDay - l.early_start, l.duration_days))
                        setDrag({
                          lotId: l.id,
                          mode: 'move',
                          originalStart: l.early_start,
                          originalEnd: l.early_finish,
                          originalDuration: l.duration_days,
                          offsetDays,
                          deltaDays: 0,
                          mouseX: e.clientX,
                          mouseY: e.clientY,
                        })
                      } : undefined}
                    >
                      {l.progress_percent > 0 && (
                        <div style={{ width: progressW, height: '100%', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: '6px 0 0 6px' }} />
                      )}
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                        <span style={{ color: 'white', fontSize: 11, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {l.code} {l.progress_percent > 0 ? `${l.progress_percent}%` : ''}
                        </span>
                      </div>

                      {/* Resize handle — right edge strip */}
                      {canDrag && (
                        <div
                          title="Redimensionner"
                          style={{
                            position: 'absolute', right: 0, top: 0, bottom: 0, width: 8,
                            cursor: 'col-resize',
                            borderRadius: '0 6px 6px 0',
                            backgroundColor: 'rgba(0,0,0,0.20)',
                            zIndex: 1,
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setTooltip(null)
                            setDrag({
                              lotId: l.id,
                              mode: 'resize',
                              originalStart: l.early_start,
                              originalEnd: l.early_finish,
                              originalDuration: l.duration_days,
                              offsetDays: 0,
                              deltaDays: 0,
                              mouseX: e.clientX,
                              mouseY: e.clientY,
                            })
                          }}
                        />
                      )}
                    </div>

                    {/* Assignment sub-rows (all zoom levels) */}
                    {asgns.map((asgn, ai) => {
                      const asgnStart = asgn.start_date ? daysBetween(startDate, asgn.start_date) : effectiveStart
                      const asgnEnd = asgn.end_date ? daysBetween(startDate, asgn.end_date) : effectiveStart + effectiveDuration
                      const ax = dayToX(asgnStart)
                      const aw = Math.max(durationToW(asgnEnd - asgnStart), 20)
                      const ay = ROW_H + ai * (ASGN_H + ASGN_GAP) + 2
                      const ac = ASGN_COLORS[ai % ASGN_COLORS.length]
                      return (
                        <div key={asgn.id} style={{ position: 'absolute', left: ax, top: ay, width: aw, height: ASGN_H,
                          backgroundColor: ac, opacity: 0.8, borderRadius: 4 }}
                          title={`${asgn.subcontractor_name}${asgn.company_name ? ' · ' + asgn.company_name : ''}${asgn.progress > 0 ? ' · ' + asgn.progress + '%' : ''}`}>
                          {asgn.progress > 0 && (
                            <div style={{ width: `${asgn.progress}%`, height: '100%', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px 0 0 4px' }} />
                          )}
                          <div style={{ position: 'absolute', inset: 0, paddingLeft: 5, display: 'flex', alignItems: 'center' }}>
                            <span style={{ color: 'white', fontSize: 9, fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                              {asgn.subcontractor_name}
                            </span>
                          </div>
                        </div>
                      )
                    })}

                    {/* Sub-task bars (day/week zoom only) */}
                    {tasks.map((task, ti) => {
                      const taskStart = task.start_date ? daysBetween(startDate, task.start_date) : effectiveStart
                      const taskEnd = task.end_date ? daysBetween(startDate, task.end_date) : effectiveStart + effectiveDuration
                      const tx = dayToX(taskStart)
                      const tw = Math.max(durationToW(taskEnd - taskStart), 16)
                      const ty = ROW_H + asgns.length * (ASGN_H + ASGN_GAP) + ti * (TASK_H + TASK_GAP) + 2
                      const taskColors: Record<string, string> = { commande: '#6366f1', execution: l.color, livraison: '#22c55e', custom: '#94a3b8' }
                      const tc = taskColors[task.type] || '#94a3b8'
                      return (
                        <div key={task.id} style={{ position: 'absolute', left: tx, top: ty, width: tw, height: TASK_H,
                          backgroundColor: tc, opacity: 0.75, borderRadius: 3 }}
                          title={`${task.name}${task.subcontractor_name ? ' · ' + task.subcontractor_name : ''}`}>
                          {task.progress > 0 && (
                            <div style={{ width: `${task.progress}%`, height: '100%', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: '3px 0 0 3px' }} />
                          )}
                          <div style={{ position: 'absolute', inset: 0, paddingLeft: 4, display: 'flex', alignItems: 'center' }}>
                            <span style={{ color: 'white', fontSize: 9, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{task.name}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip (hidden during drag) */}
      {tooltip && !drag && (
        <div className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}>
          <div className="font-bold">{tooltip.lot.code} — {lang === 'tr' && tooltip.lot.name_tr ? tooltip.lot.name_tr : tooltip.lot.name}</div>
          <div className="text-gray-300 mt-0.5">
            {tooltip.lot.start_date_planned && tooltip.lot.end_date_planned
              ? `${tooltip.lot.start_date_planned} → ${tooltip.lot.end_date_planned}`
              : `${tooltip.lot.early_start}j → ${tooltip.lot.early_finish}j`}
          </div>
          <div className="text-gray-300">{tooltip.lot.duration_days} jours • {tooltip.lot.progress_percent}%</div>
          {tooltip.lot.subcontractor_name && <div className="text-primary-300">{tooltip.lot.subcontractor_name}</div>}
          {tooltip.lot.is_critical ? <div className="text-red-400 font-medium">⚠ Chemin critique</div> : null}
        </div>
      )}

      {/* Drag badge — follows cursor */}
      {drag && drag.deltaDays !== 0 && (() => {
        const lot = lots.find(l => l.id === drag.lotId)
        if (!lot) return null
        if (drag.mode === 'resize') {
          const newDuration = Math.max(1, lot.duration_days + drag.deltaDays)
          const newEnd = lot.early_start + newDuration
          const newEndDate = addDays(startDate, newEnd)
          const cascadeCount = drag.deltaDays > 0 ? computeCascade(lots, deps, drag.lotId, drag.deltaDays).length : 0
          return (
            <div className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-1.5 shadow-xl pointer-events-none font-medium"
              style={{ left: drag.mouseX + 12, top: drag.mouseY - 36 }}>
              {drag.deltaDays > 0 ? '+' : ''}{drag.deltaDays}j → {newDuration}j — {fmtShort(newEndDate)}
              {cascadeCount > 0 && <span className="ml-1.5 text-yellow-300">↓ {cascadeCount} lot{cascadeCount > 1 ? 's' : ''}</span>}
            </div>
          )
        } else {
          const newDate = addDays(startDate, lot.early_start + drag.deltaDays)
          const cascadeCount = drag.deltaDays > 0 ? computeCascade(lots, deps, drag.lotId, drag.deltaDays).length : 0
          return (
            <div className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-1.5 shadow-xl pointer-events-none font-medium"
              style={{ left: drag.mouseX + 12, top: drag.mouseY - 36 }}>
              {drag.deltaDays > 0 ? '+' : ''}{drag.deltaDays}j — {fmtShort(newDate)}
              {cascadeCount > 0 && <span className="ml-1.5 text-yellow-300">↓ {cascadeCount} lot{cascadeCount > 1 ? 's' : ''}</span>}
            </div>
          )
        }
      })()}
    </div>
  )
}
