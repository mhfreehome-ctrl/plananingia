import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../api/client'

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(d?: string | null) {
  if (!d) return '—'
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function progressColor(pct: number) {
  if (pct >= 100) return '#16a34a'
  if (pct >= 60)  return '#2563eb'
  if (pct >= 30)  return '#d97706'
  return '#9ca3af'
}

// ─── Composant ProgressBar HTML ──────────────────────────────────────────────

function ProgressBar({ pct, color }: { pct: number; color?: string }) {
  const c = color || progressColor(pct)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div style={{ width: `${Math.min(pct, 100)}%`, background: c }} className="h-full rounded-full transition-all" />
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color: c, minWidth: 32 }}>{pct}%</span>
    </div>
  )
}

// ─── Page Rapport ────────────────────────────────────────────────────────────

export default function ProjectReport() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject]   = useState<any>(null)
  const [lots, setLots]         = useState<any[]>([])
  const [tasks, setTasks]       = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.projects.get(id),
      api.lots.list(id),
      api.lotTasks.listForProject(id),
    ]).then(([proj, ls, ts]) => {
      setProject(proj)
      setLots((ls as any[]).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)))
      setTasks(ts as any[])
    }).finally(() => setLoading(false))
  }, [id])

  // ── Calculs globaux ──────────────────────────────────────────────────────
  const totalLots   = lots.length
  const lotsWithPct = lots.filter(l => l.progress_percent > 0)
  const avgProgress = totalLots
    ? Math.round(lots.reduce((s, l) => s + (l.progress_percent || 0), 0) / totalLots)
    : 0
  const doneLots    = lots.filter(l => l.progress_percent >= 100).length
  const totalTasks  = tasks.length

  // ── Génération PDF jsPDF ─────────────────────────────────────────────────
  const generatePDF = async () => {
    setGenerating(true)
    try {
      const { default: jsPDF } = await import('jspdf')

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W   = 210
      const marginL = 15
      const marginR = 15
      const contentW = W - marginL - marginR
      let y = 0

      // ── Palette ────────────────────────────────────────────────────────
      const COLOR_PRIMARY   = '#1e3a5f'
      const COLOR_GREEN     = '#16a34a'
      const COLOR_ACCENT    = '#2563eb'
      const COLOR_LIGHT     = '#f1f5f9'
      const COLOR_BORDER    = '#cbd5e1'
      const COLOR_TEXT      = '#1e293b'
      const COLOR_MUTED     = '#64748b'

      const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        return [r, g, b] as [number, number, number]
      }

      const setFill = (hex: string) => { const [r,g,b] = hexToRgb(hex); doc.setFillColor(r, g, b) }
      const setDraw = (hex: string) => { const [r,g,b] = hexToRgb(hex); doc.setDrawColor(r, g, b) }
      const setTextColor = (hex: string) => { const [r,g,b] = hexToRgb(hex); doc.setTextColor(r, g, b) }

      // Supprime les caractères Unicode hors WinAnsi (> U+00FF) pour Helvetica/Arial
      const pdf = (text: string) => text
        .replace(/→|➜|➡/g, '>')
        .replace(/←/g, '<')
        .replace(/—|–/g, '-')
        .replace(/…/g, '...')
        .replace(/[""«»]/g, '"')
        .replace(/[''‹›]/g, "'")
        .replace(/•|·/g, '-')
        .replace(/[^\x00-\xFF]/g, '?')

      // ── Fonctions utilitaires ──────────────────────────────────────────

      // Vérifier espace restant, saut de page si besoin
      const checkPage = (needed: number) => {
        if (y + needed > 277) {
          doc.addPage()
          y = 15
          // Pied de page automatique sur chaque page
          addFooter()
        }
      }

      const addFooter = () => {
        const pageNum = doc.getNumberOfPages()
        setTextColor(COLOR_MUTED)
        doc.setFontSize(7)
        doc.text(`PlanningIA — Rapport généré le ${new Date().toLocaleDateString('fr-FR')}`, marginL, 290)
        doc.text(`Page ${pageNum}`, W - marginR, 290, { align: 'right' })
      }

      // Texte multiligne avec retour à la ligne automatique
      const addWrappedText = (text: string, x: number, startY: number, maxW: number, lineH: number): number => {
        const lines = doc.splitTextToSize(text, maxW)
        lines.forEach((line: string) => {
          checkPage(lineH + 2)
          doc.text(line, x, startY)
          startY += lineH
        })
        return startY
      }

      // ── EN-TÊTE ────────────────────────────────────────────────────────
      // Bandeau bleu foncé
      setFill(COLOR_PRIMARY)
      doc.rect(0, 0, W, 38, 'F')

      // Titre
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      setTextColor('#ffffff')
      doc.text('RAPPORT D\'AVANCEMENT', marginL, 14)

      // Sous-titre projet
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(project.name, marginL, 22)
      if (project.reference) {
        doc.setFontSize(9)
        setTextColor('#93c5fd')
        doc.text(`Réf : ${project.reference}`, marginL, 28)
      }

      // Date génération (droite)
      doc.setFontSize(8)
      setTextColor('#bfdbfe')
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, W - marginR, 14, { align: 'right' })

      y = 46

      // ── BLOC INFO PROJET ───────────────────────────────────────────────
      setFill(COLOR_LIGHT)
      setDraw(COLOR_BORDER)
      doc.roundedRect(marginL, y, contentW, 24, 2, 2, 'FD')

      const col1 = marginL + 4
      const col2 = marginL + contentW / 2 + 4

      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      setTextColor(COLOR_MUTED)
      doc.text('CLIENT', col1, y + 6)
      doc.text('VILLE', col1, y + 14)
      doc.text('DÉBUT', col2, y + 6)
      doc.text('DURÉE', col2, y + 14)

      doc.setFont('helvetica', 'normal')
      setTextColor(COLOR_TEXT)
      doc.setFontSize(9)
      doc.text(project.client_name || '—', col1 + 14, y + 6)
      doc.text(project.city ? `${project.city}${project.postal_code ? ` (${project.postal_code})` : ''}` : '—', col1 + 14, y + 14)
      doc.text(fmtDate(project.start_date), col2 + 14, y + 6)
      doc.text(project.duration_weeks ? `${project.duration_weeks} semaines` : '—', col2 + 14, y + 14)

      y += 30

      // ── RÉSUMÉ GLOBAL ──────────────────────────────────────────────────
      setFill(COLOR_GREEN)
      doc.rect(marginL, y, contentW, 6, 'F')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      setTextColor('#ffffff')
      doc.text('RÉSUMÉ GLOBAL', marginL + 3, y + 4.2)
      y += 10

      // Métriques sur une ligne
      const metrics = [
        { label: 'Lots total', value: String(totalLots) },
        { label: 'Sous-tâches', value: String(totalTasks) },
        { label: 'Terminés', value: `${doneLots}/${totalLots}` },
        { label: 'Avancement moyen', value: `${avgProgress}%` },
      ]
      const mW = contentW / metrics.length
      metrics.forEach((m, i) => {
        const mx = marginL + i * mW
        setFill(i % 2 === 0 ? COLOR_LIGHT : '#e2e8f0')
        doc.rect(mx, y, mW, 14, 'F')
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        setTextColor(COLOR_PRIMARY)
        doc.text(m.value, mx + mW / 2, y + 8.5, { align: 'center' })
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        setTextColor(COLOR_MUTED)
        doc.text(m.label, mx + mW / 2, y + 12.5, { align: 'center' })
      })

      // Barre progression globale
      y += 18
      doc.setFontSize(8)
      setTextColor(COLOR_MUTED)
      doc.text('Progression globale', marginL, y)
      // Fond barre
      setFill('#e2e8f0')
      doc.roundedRect(marginL, y + 2, contentW, 4, 1, 1, 'F')
      // Remplissage
      const pColor = progressColor(avgProgress)
      setFill(pColor)
      doc.roundedRect(marginL, y + 2, Math.max(contentW * avgProgress / 100, 2), 4, 1, 1, 'F')
      setTextColor(pColor)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(`${avgProgress}%`, marginL + contentW + 3, y + 5.5)

      y += 14

      // ── LOTS & SOUS-TÂCHES ─────────────────────────────────────────────
      setFill(COLOR_ACCENT)
      doc.rect(marginL, y, contentW, 6, 'F')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      setTextColor('#ffffff')
      doc.text('DÉTAIL DES TÂCHES ET SOUS-TÂCHES', marginL + 3, y + 4.2)
      y += 10

      // Parcourir les lots
      for (const lot of lots) {
        const lotTasks = tasks.filter(t => t.lot_id === lot.id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        const pct = lot.progress_percent || 0
        const lotColor = lot.color || '#6B7280'

        checkPage(22)

        // ── Entête lot ──
        // Bande colorée gauche
        setFill(lotColor)
        doc.rect(marginL, y, 2.5, 16, 'F')

        // Fond lot
        setFill('#f8fafc')
        setDraw(COLOR_BORDER)
        doc.roundedRect(marginL + 2.5, y, contentW - 2.5, 16, 1, 1, 'FD')

        // Code lot
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        setTextColor(lotColor)
        doc.text(lot.code || '', marginL + 5, y + 5)

        // Nom lot
        doc.setFontSize(10)
        setTextColor(COLOR_TEXT)
        doc.text(pdf(lot.name), marginL + 5, y + 10)

        // Dates + zone (droite) — "du X au Y" sans caractère Unicode
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        setTextColor(COLOR_MUTED)
        const dStart = fmtDate(lot.start_date_planned || lot.start_date_actual)
        const dEnd   = fmtDate(lot.end_date_planned   || lot.end_date_actual)
        const dateStr = (dStart !== '—' || dEnd !== '—') ? `du ${dStart} au ${dEnd}` : ''
        if (dateStr) doc.text(dateStr, W - marginR, y + 5, { align: 'right' })
        if (lot.zone) doc.text(`Zone : ${lot.zone}`, W - marginR, y + 9, { align: 'right' })

        // Barre progression lot
        const barX = marginL + 5
        const barW = contentW - 55
        setFill('#e2e8f0')
        doc.roundedRect(barX, y + 11.5, barW, 2.5, 0.5, 0.5, 'F')
        if (pct > 0) {
          setFill(progressColor(pct))
          doc.roundedRect(barX, y + 11.5, Math.max(barW * pct / 100, 1.5), 2.5, 0.5, 0.5, 'F')
        }
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        setTextColor(progressColor(pct))
        doc.text(`${pct}%`, barX + barW + 2, y + 13.5)

        y += 18

        // Notes lot — cadre noir gras, pas de fond
        if (lot.notes) {
          const noteLines = doc.splitTextToSize(pdf(lot.notes), contentW - 10)
          const visibleLines = Math.min(noteLines.length, 8)
          const noteH = visibleLines * 3.8 + 7
          checkPage(noteH + 3)
          doc.setLineWidth(0.6)
          setDraw('#000000')
          doc.setFillColor(255, 255, 255)
          doc.roundedRect(marginL + 4, y, contentW - 4, noteH, 1, 1, 'FD')
          doc.setLineWidth(0.2)
          // Label + horodatage
          doc.setFontSize(6.5)
          doc.setFont('helvetica', 'bold')
          setTextColor(COLOR_TEXT)
          doc.text('Note du lot :', marginL + 6, y + 4.5)
          if (lot.notes_updated_at) {
            doc.setFont('helvetica', 'normal')
            setTextColor(COLOR_MUTED)
            const ts = new Date(lot.notes_updated_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            doc.text(`Modifié le ${ts}`, W - marginR, y + 4.5, { align: 'right' })
          }
          // Contenu
          doc.setFont('helvetica', 'normal')
          setTextColor(COLOR_TEXT)
          doc.setFontSize(7.5)
          for (let i = 0; i < visibleLines; i++) {
            doc.text(noteLines[i], marginL + 6, y + 8.5 + i * 3.8)
          }
          if (noteLines.length > 8) {
            setTextColor(COLOR_MUTED)
            doc.setFontSize(6.5)
            doc.text('...', marginL + 6, y + noteH - 1.5)
          }
          y += noteH + 3
        }

        // ── Sous-tâches ──
        for (const task of lotTasks) {
          const tPct = task.progress || 0
          checkPage(12)

          // Trait vertical gauche (connecteur)
          setDraw(lotColor)
          doc.setLineWidth(0.3)
          doc.line(marginL + 6, y, marginL + 6, y + 9)
          doc.line(marginL + 6, y + 4.5, marginL + 11, y + 4.5)
          doc.setLineWidth(0.2)

          // Fond sous-tâche
          setFill('#ffffff')
          setDraw('#e2e8f0')
          doc.roundedRect(marginL + 11, y, contentW - 11, 9, 0.8, 0.8, 'FD')

          // Puce type
          const TASK_COLORS: Record<string, string> = {
            commande: '#8b5cf6', execution: '#2563eb',
            livraison: '#16a34a', custom: '#94a3b8'
          }
          const tColor = TASK_COLORS[task.type] || '#94a3b8'
          setFill(tColor)
          doc.circle(marginL + 14, y + 4.5, 1, 'F')

          // Nom tâche
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          setTextColor(COLOR_TEXT)
          const nameLines = doc.splitTextToSize(pdf(task.name), contentW - 70)
          doc.text(nameLines[0], marginL + 16, y + 4)

          // Dates tâche — "du X au Y" sans caractère Unicode
          doc.setFontSize(6.5)
          setTextColor(COLOR_MUTED)
          const tDateStart = fmtDate(task.start_date)
          const tDateEnd   = fmtDate(task.end_date)
          const tDate = task.start_date || task.end_date
            ? `du ${tDateStart} au ${tDateEnd}`
            : ''
          if (tDate) doc.text(tDate, marginL + 16, y + 7.5)

          // Progression tâche (droite)
          const tBarX = W - marginR - 28
          setFill('#e2e8f0')
          doc.roundedRect(tBarX, y + 2.5, 22, 2, 0.5, 0.5, 'F')
          if (tPct > 0) {
            setFill(progressColor(tPct))
            doc.roundedRect(tBarX, y + 2.5, Math.max(22 * tPct / 100, 1), 2, 0.5, 0.5, 'F')
          }
          doc.setFontSize(6.5)
          doc.setFont('helvetica', 'bold')
          setTextColor(progressColor(tPct))
          doc.text(`${tPct}%`, W - marginR, y + 4.2, { align: 'right' })

          y += 11

          // Commentaire sous-tâche — cadre noir gras, fond blanc, horodatage
          if (task.notes) {
            const cLines = doc.splitTextToSize(pdf(task.notes), contentW - 22)
            const visibleC = Math.min(cLines.length, 4)
            const cH = visibleC * 3.5 + 7
            checkPage(cH + 2)
            doc.setLineWidth(0.6)
            setDraw('#000000')
            doc.setFillColor(255, 255, 255)
            doc.roundedRect(marginL + 13, y - 1, contentW - 13, cH, 0.8, 0.8, 'FD')
            doc.setLineWidth(0.2)
            doc.setFontSize(6.5)
            doc.setFont('helvetica', 'bold')
            setTextColor(COLOR_TEXT)
            doc.text('Note :', marginL + 15, y + 3)
            if (task.notes_updated_at) {
              doc.setFont('helvetica', 'normal')
              setTextColor(COLOR_MUTED)
              const ts = new Date(task.notes_updated_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              doc.text(`Modifié le ${ts}`, W - marginR, y + 3, { align: 'right' })
            }
            doc.setFont('helvetica', 'normal')
            setTextColor(COLOR_TEXT)
            doc.setFontSize(7)
            for (let i = 0; i < visibleC; i++) {
              doc.text(cLines[i], marginL + 15, y + 6.5 + i * 3.5)
            }
            y += cH + 2
          }
        }

        y += 4 // espace entre lots
      }

      // Pied de page sur la dernière page
      addFooter()

      // ── Sauvegarde ────────────────────────────────────────────────────
      const filename = `rapport_${(project.reference || project.name).replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`
      doc.save(filename)
    } catch (e) {
      console.error(e)
      alert('Erreur lors de la génération du PDF')
    } finally {
      setGenerating(false)
    }
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="text-center">
        <div className="text-4xl mb-3">📄</div>
        <p>Chargement du rapport…</p>
      </div>
    </div>
  )

  if (!project) return <div className="p-8 text-red-500">Projet introuvable.</div>

  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* ── Barre d'actions ── */}
      <div className="flex items-center justify-between gap-4 no-print">
        <button onClick={() => navigate(-1)} className="btn btn-ghost flex items-center gap-2">
          ← Retour
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={generatePDF}
            disabled={generating}
            className="btn btn-primary flex items-center gap-2 px-5">
            {generating ? (
              <><span className="animate-spin">⟳</span> Génération…</>
            ) : (
              <>📥 Télécharger PDF</>
            )}
          </button>
        </div>
      </div>

      {/* ── Aperçu HTML du rapport ── */}
      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">

        {/* En-tête */}
        <div className="bg-[#1e3a5f] text-white px-8 py-6">
          <p className="text-blue-300 text-xs uppercase tracking-widest mb-1">Rapport d'avancement</p>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.reference && <p className="text-blue-200 text-sm mt-1">Réf : {project.reference}</p>}
          <p className="text-blue-300 text-xs mt-2">Généré le {today}</p>
        </div>

        {/* Info projet */}
        <div className="grid grid-cols-4 gap-0 border-b border-gray-200">
          {[
            { label: 'Client', value: project.client_name || '—' },
            { label: 'Ville', value: project.city || '—' },
            { label: 'Début', value: fmtDate(project.start_date) },
            { label: 'Durée', value: project.duration_weeks ? `${project.duration_weeks} sem.` : '—' },
          ].map((item, i) => (
            <div key={i} className={`px-5 py-3 ${i < 3 ? 'border-r border-gray-200' : ''}`}>
              <p className="text-xs text-gray-400 uppercase tracking-wide">{item.label}</p>
              <p className="text-sm font-semibold text-gray-800 truncate">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Résumé global */}
        <div className="px-8 py-5 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Résumé global</h2>
          <div className="grid grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Lots total', value: totalLots },
              { label: 'Sous-tâches', value: totalTasks },
              { label: 'Terminés', value: `${doneLots}/${totalLots}` },
              { label: 'Avancement moy.', value: `${avgProgress}%` },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                <p className="text-2xl font-bold text-[#1e3a5f]">{m.value}</p>
                <p className="text-xs text-gray-400 mt-1">{m.label}</p>
              </div>
            ))}
          </div>
          <ProgressBar pct={avgProgress} />
        </div>

        {/* Lots */}
        <div className="divide-y divide-gray-100">
          {lots.map(lot => {
            const lotTasks = tasks.filter(t => t.lot_id === lot.id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            const pct = lot.progress_percent || 0
            return (
              <div key={lot.id}>
                {/* En-tête lot */}
                <div className="flex items-start gap-3 px-8 py-4" style={{ borderLeft: `4px solid ${lot.color || '#6B7280'}` }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono font-bold" style={{ color: lot.color }}>{lot.code}</span>
                      <h3 className="font-semibold text-gray-900">{lot.name}</h3>
                      {lot.zone && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{lot.zone}</span>}
                    </div>
                    <p className="text-xs text-gray-400 mb-2">
                      {lot.start_date_planned || lot.end_date_planned
                        ? `du ${fmtDate(lot.start_date_planned)} au ${fmtDate(lot.end_date_planned)}`
                        : ''}
                      {lot.duration_days ? ` · ${lot.duration_days}j` : ''}
                    </p>
                    <ProgressBar pct={pct} color={lot.color} />
                    {lot.notes && (
                      <div className="mt-2 text-xs text-gray-700 bg-white border-2 border-black rounded px-3 py-1.5">
                        <span className="font-bold">Note :</span> {lot.notes}
                        {lot.notes_updated_at && <span className="ml-2 text-gray-400 font-normal not-italic">· Modifié le {new Date(lot.notes_updated_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sous-tâches */}
                {lotTasks.length > 0 && (
                  <div className="pl-12 pr-8 pb-3 space-y-2">
                    {lotTasks.map((task: any, ti: number) => {
                      const isLast = ti === lotTasks.length - 1
                      return (
                        <div key={task.id} className="flex gap-3 items-start relative">
                          {/* Connecteur arbre */}
                          <div className="flex flex-col items-center" style={{ width: 16 }}>
                            <div className="w-px flex-1 bg-gray-300" style={{ minHeight: isLast ? '50%' : '100%', marginTop: 0 }} />
                          </div>
                          <div className="flex-1 min-w-0 bg-gray-50 rounded-lg border border-gray-100 px-3 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800">{task.name}</p>
                                <p className="text-xs text-gray-400">
                                  {task.start_date || task.end_date
                                    ? `du ${fmtDate(task.start_date)} au ${fmtDate(task.end_date)}`
                                    : ''}
                                </p>
                                {task.notes && (
                                  <p className="text-xs text-gray-700 bg-white border-2 border-black rounded px-2 py-1 mt-1">
                                    <span className="font-bold">Note :</span> {task.notes}
                                    {task.notes_updated_at && <span className="ml-1 text-gray-400 font-normal">· Modifié le {new Date(task.notes_updated_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                                  </p>
                                )}
                              </div>
                              <div className="flex-shrink-0 w-28">
                                <ProgressBar pct={task.progress || 0} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Pied de page */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">PlanningIA — Rapport généré le {today}</p>
        </div>
      </div>
    </div>
  )
}
