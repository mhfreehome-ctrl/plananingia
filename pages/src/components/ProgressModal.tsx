import { useState } from 'react'
import { useT } from '../i18n'
import { api } from '../api/client'

interface Props {
  lot: any
  onClose: () => void
  onSaved: () => void
}

export default function ProgressModal({ lot, onClose, onSaved }: Props) {
  const t = useT()
  const [pct, setPct] = useState(lot.progress_percent || 0)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState(lot.status)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      await api.lots.progress(lot.id, { progress_percent: pct, comment, status })
      onSaved()
    } catch (e: any) {
      setError(e.message)
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="font-semibold text-gray-900">{t('lots.update_progress')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="modal-body space-y-4">
          <div>
            <div className="font-medium text-gray-700 mb-1">{lot.code} — {lot.name}</div>
            {lot.subcontractor_name && <div className="text-sm text-gray-500">{lot.subcontractor_name}</div>}
          </div>

          <div className="field">
            <label className="label">{t('sub.progress_pct')}</label>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={100} step={5} value={pct}
                onChange={e => setPct(Number(e.target.value))}
                className="flex-1 accent-primary-600" />
              <span className="w-12 text-right font-bold text-primary-700">{pct}%</span>
            </div>
            <div className="progress-bar mt-2">
              <div className="progress-fill bg-primary-600" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="field">
            <label className="label">{t('lots.status')}</label>
            <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="pending">{t('lots.status.pending')}</option>
              <option value="active">{t('lots.status.active')}</option>
              <option value="paused">{t('lots.status.paused')}</option>
              <option value="done">{t('lots.status.done')}</option>
              <option value="with_reserves">{t('lots.status.with_reserves')}</option>
            </select>
          </div>

          <div className="field">
            <label className="label">{t('sub.comment')}</label>
            <textarea className="input resize-none" rows={3} placeholder="Observations..." value={comment} onChange={e => setComment(e.target.value)} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-ghost">{t('common.cancel')}</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? t('common.loading') : t('sub.submit')}
          </button>
        </div>
      </div>
    </div>
  )
}
