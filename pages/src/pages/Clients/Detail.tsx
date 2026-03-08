import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../api/client'

const STATUS_COLORS: Record<string, string> = {
  devis: '#6366f1', programme: '#f59e0b', en_cours: '#10b981',
  livre: '#3b82f6', sav: '#ef4444', draft: '#9ca3af',
  preparation: '#8b5cf6', active: '#10b981', reception: '#f59e0b', closed: '#6b7280',
}

const STATUS_LABELS: Record<string, string> = {
  devis: 'Devis', programme: 'Programmé', en_cours: 'En cours',
  livre: 'Livré', sav: 'SAV', draft: 'Brouillon',
  preparation: 'Préparation', active: 'En cours', reception: 'Réception', closed: 'Clôturé',
}

function EditModal({ client, onClose, onSubmit, saving }: any) {
  const [form, setForm] = useState({
    name: client.name || '',
    email: client.email || '',
    phone: client.phone || '',
    address: client.address || '',
    city: client.city || '',
    postal_code: client.postal_code || '',
    notes: client.notes || '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3 className="font-semibold">Modifier le client</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={(e) => onSubmit(e, form)}>
          <div className="modal-body grid grid-cols-2 gap-4">
            <div className="field col-span-2">
              <label className="label">Nom / Raison sociale *</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="field">
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Téléphone</label>
              <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="field col-span-2">
              <label className="label">Adresse</label>
              <input className="input" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Ville</label>
              <input className="input" value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Code postal</label>
              <input className="input" value={form.postal_code} onChange={e => set('postal_code', e.target.value)} />
            </div>
            <div className="field col-span-2">
              <label className="label">Notes</label>
              <textarea className="input" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-ghost">Annuler</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = () => {
    if (!id) return
    setLoading(true)
    api.clients.get(id).then(setClient).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [id])

  const handleEdit = async (e: React.FormEvent, form: any) => {
    e.preventDefault()
    if (!id) return
    setSaving(true)
    try {
      await api.clients.update(id, form)
      setEditModal(false)
      load()
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>
  if (!client) return <div className="text-center py-12 text-red-500">Client introuvable</div>

  const projects: any[] = client.projects || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/clients')} className="btn btn-ghost btn-sm text-gray-500">← Retour</button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            {client.city && <p className="text-sm text-gray-500 mt-0.5">📍 {client.city}{client.postal_code ? ` (${client.postal_code})` : ''}</p>}
          </div>
        </div>
        <button onClick={() => setEditModal(true)} className="btn btn-primary btn-sm">✏️ Modifier</button>
      </div>

      {/* Infos client */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Informations</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {client.email && (
            <div>
              <span className="text-gray-500">Email</span>
              <p className="font-medium mt-0.5">
                <a href={`mailto:${client.email}`} className="text-primary-600 hover:underline">{client.email}</a>
              </p>
            </div>
          )}
          {client.phone && (
            <div>
              <span className="text-gray-500">Téléphone</span>
              <p className="font-medium mt-0.5">
                <a href={`tel:${client.phone}`} className="text-primary-600 hover:underline">{client.phone}</a>
              </p>
            </div>
          )}
          {client.address && (
            <div className="col-span-2">
              <span className="text-gray-500">Adresse</span>
              <p className="font-medium mt-0.5">{client.address}{client.city ? `, ${client.city}` : ''}{client.postal_code ? ` ${client.postal_code}` : ''}</p>
            </div>
          )}
          {client.notes && (
            <div className="col-span-2">
              <span className="text-gray-500">Notes</span>
              <p className="mt-0.5 whitespace-pre-line text-gray-700">{client.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Chantiers associés */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">
          Chantiers associés <span className="text-gray-400 font-normal">({projects.length})</span>
        </h2>

        {projects.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">
            <div className="text-4xl mb-2">🏗️</div>
            <p>Aucun chantier associé à ce client</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p: any) => (
              <div
                key={p.id}
                className="card p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/projects/${p.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug">{p.name}</h3>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium ml-2 shrink-0"
                    style={{
                      background: (STATUS_COLORS[p.status] || '#9ca3af') + '20',
                      color: STATUS_COLORS[p.status] || '#9ca3af',
                    }}
                  >
                    {STATUS_LABELS[p.status] || p.status}
                  </span>
                </div>
                {p.city && <p className="text-xs text-gray-500 mb-3">📍 {p.city}</p>}
                {p.start_date && <p className="text-xs text-gray-500 mb-3">📅 {new Date(p.start_date).toLocaleDateString('fr-FR')}</p>}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Avancement</span>
                    <span className="font-medium">{p.avg_progress ?? 0}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${p.avg_progress ?? 0}%`,
                        background: STATUS_COLORS[p.status] || '#10b981',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editModal && (
        <EditModal
          client={client}
          onClose={() => setEditModal(false)}
          onSubmit={handleEdit}
          saving={saving}
        />
      )}
    </div>
  )
}
