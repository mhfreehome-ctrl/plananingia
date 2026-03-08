import type { Lot, Dependency } from '../types'

interface LotCPM {
  id: string
  duration_days: number
  es: number; ef: number
  ls: number; lf: number
  tf: number
  is_critical: boolean
  predecessors: Dependency[]
  successors: Dependency[]
}

function topologicalSort(lots: LotCPM[], deps: Dependency[]): string[] {
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()
  for (const l of lots) { inDegree.set(l.id, 0); adj.set(l.id, []) }
  for (const d of deps) {
    if (d.type === 'FS' || d.type === 'SS') {
      adj.get(d.predecessor_id)?.push(d.successor_id)
      inDegree.set(d.successor_id, (inDegree.get(d.successor_id) || 0) + 1)
    }
  }
  const queue = [...inDegree.entries()].filter(([, v]) => v === 0).map(([k]) => k)
  const result: string[] = []
  while (queue.length) {
    const node = queue.shift()!
    result.push(node)
    for (const next of (adj.get(node) || [])) {
      const d = (inDegree.get(next) || 1) - 1
      inDegree.set(next, d)
      if (d === 0) queue.push(next)
    }
  }
  // Add any remaining (cycles/FF deps)
  for (const l of lots) if (!result.includes(l.id)) result.push(l.id)
  return result
}

export function computeCPM(lots: Lot[], deps: Dependency[]): Lot[] {
  if (!lots.length) return lots

  const cpmMap = new Map<string, LotCPM>()
  for (const l of lots) {
    cpmMap.set(l.id, {
      id: l.id,
      duration_days: l.duration_days,
      es: 0, ef: 0, ls: 0, lf: 0, tf: 0,
      is_critical: false,
      predecessors: deps.filter(d => d.successor_id === l.id),
      successors: deps.filter(d => d.predecessor_id === l.id),
    })
  }

  const order = topologicalSort([...cpmMap.values()], deps)

  // Forward pass
  for (const id of order) {
    const c = cpmMap.get(id)!
    if (!c.predecessors.length) {
      c.es = 0
    } else {
      c.es = Math.max(...c.predecessors.map(d => {
        const pred = cpmMap.get(d.predecessor_id)
        if (!pred) return 0
        if (d.type === 'FS') return pred.ef + d.lag_days
        if (d.type === 'SS') return pred.es + d.lag_days
        if (d.type === 'FF') return pred.ef + d.lag_days - c.duration_days
        return pred.ef
      }))
    }
    c.ef = c.es + c.duration_days
  }

  const projectEnd = Math.max(...[...cpmMap.values()].map(c => c.ef))

  // Backward pass
  for (const id of [...order].reverse()) {
    const c = cpmMap.get(id)!
    if (!c.successors.length) {
      c.lf = projectEnd
    } else {
      c.lf = Math.min(...c.successors.map(d => {
        const succ = cpmMap.get(d.successor_id)
        if (!succ) return projectEnd
        if (d.type === 'FS') return succ.ls - d.lag_days
        if (d.type === 'SS') return succ.ls - d.lag_days + c.duration_days
        if (d.type === 'FF') return succ.lf - d.lag_days
        return succ.ls
      }))
    }
    c.ls = c.lf - c.duration_days
    c.tf = c.ls - c.es
    c.is_critical = c.tf === 0
  }

  // Merge back
  return lots.map(l => {
    const c = cpmMap.get(l.id)!
    return {
      ...l,
      early_start: c.es,
      early_finish: c.ef,
      late_start: c.ls,
      late_finish: c.lf,
      total_float: c.tf,
      is_critical: c.is_critical ? 1 : 0,
    }
  })
}

// Add calendar days (skip weekends) to a base date
export function addWorkingDays(baseDate: Date, days: number): Date {
  const result = new Date(baseDate)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dow = result.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return result
}

export function applyDatesToLots(lots: Lot[], projectStartDate: string): Lot[] {
  const start = new Date(projectStartDate)
  return lots.map(l => {
    const startDate = addWorkingDays(start, l.early_start)
    const endDate = addWorkingDays(start, l.early_finish)
    return {
      ...l,
      start_date_planned: startDate.toISOString().split('T')[0],
      end_date_planned: endDate.toISOString().split('T')[0],
    }
  })
}
