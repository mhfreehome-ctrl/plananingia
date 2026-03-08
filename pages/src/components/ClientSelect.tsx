import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'

interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  city?: string
}

interface Props {
  clientId: string | null
  clientName?: string        // valeur texte libre (rétrocompat)
  onChange: (clientId: string | null, clientName: string) => void
}

export default function ClientSelect({ clientId, clientName, onChange }: Props) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', city: '' })
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Charger la liste des clients
  useEffect(() => {
    api.clients.list()
      .then(setClients)
      .catch(() => setClients([]))
      .finally(() => setLoading(false))
  }, [])

  // Fermer le dropdown en cliquant ailleurs
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = clients.find(c => c.id === clientId)
  const displayName = selected?.name || clientName || ''

  const filtered = search.length >= 1
    ? clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : clients

  const handleSelect = (c: Client) => {
    onChange(c.id, c.name)
    setSearch('')
    setOpen(false)
  }

  const handleClear = () => {
    onChange(null, '')
    setSearch('')
  }

  const handleCreate = async () => {
    if (!newClient.name.trim()) return
    setSaving(true)
    try {
      const created = await api.clients.create({
        name: newClient.name.trim(),
        email: newClient.email || undefined,
        phone: newClient.phone || undefined,
        city: newClient.city || undefined,
      })
      setClients(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      onChange(created.id, created.name)
      setCreating(false)
      setNewClient({ name: '', email: '', phone: '', city: '' })
      setOpen(false)
    } catch (e: any) {
      alert('Erreur création client : ' + (e.message || e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Champ affiché */}
      <div
        className="input flex items-center gap-2 cursor-pointer min-h-[38px]"
        onClick={() => { setOpen(o => !o); setCreating(false) }}
      >
        {displayName ? (
          <>
            <span className="flex-1 text-sm truncate">{displayName}</span>
            <button
              type="button"
              className="text-gray-400 hover:text-red-500 shrink-0"
              onClick={(e) => { e.stopPropagation(); handleClear() }}
              title="Retirer le client"
            >✕</button>
          </>
        ) : (
          <span className="text-gray-400 text-sm flex-1">Sélectionner ou créer un client…</span>
        )}
        <span className="text-gray-400 text-xs shrink-0">▾</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {/* Mode sélection */}
          {!creating && (
            <>
              {/* Recherche */}
              <div className="p-2 border-b border-gray-100">
                <input
                  autoFocus
                  className="w-full text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                  placeholder="Rechercher…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onClick={e => e.stopPropagation()}
                />
              </div>

              {/* Liste */}
              <ul className="max-h-52 overflow-y-auto">
                {loading && (
                  <li className="px-3 py-2 text-sm text-gray-400">Chargement…</li>
                )}
                {!loading && filtered.length === 0 && (
                  <li className="px-3 py-2 text-sm text-gray-400">Aucun résultat</li>
                )}
                {filtered.map(c => (
                  <li
                    key={c.id}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 flex items-center justify-between
                      ${c.id === clientId ? 'bg-blue-50 font-medium text-blue-700' : ''}`}
                    onClick={() => handleSelect(c)}
                  >
                    <span>{c.name}</span>
                    {c.city && <span className="text-xs text-gray-400 ml-2">{c.city}</span>}
                  </li>
                ))}
              </ul>

              {/* Bouton créer */}
              <div className="p-2 border-t border-gray-100">
                <button
                  type="button"
                  className="w-full text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded px-2 py-1 text-left transition"
                  onClick={(e) => { e.stopPropagation(); setCreating(true); setNewClient({ name: search, email: '', phone: '', city: '' }) }}
                >
                  ＋ Créer « {search || 'nouveau client'} »
                </button>
              </div>
            </>
          )}

          {/* Mode création */}
          {creating && (
            <div className="p-3 space-y-2" onClick={e => e.stopPropagation()}>
              <p className="text-xs font-semibold text-gray-600 mb-1">Nouveau client</p>
              <input
                autoFocus
                className="w-full text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="Nom *"
                value={newClient.name}
                onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
              <input
                className="w-full text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="Email"
                value={newClient.email}
                onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))}
              />
              <input
                className="w-full text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="Téléphone"
                value={newClient.phone}
                onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))}
              />
              <input
                className="w-full text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="Ville"
                value={newClient.city}
                onChange={e => setNewClient(p => ({ ...p, city: e.target.value }))}
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  className="flex-1 btn btn-primary text-xs py-1"
                  onClick={handleCreate}
                  disabled={saving || !newClient.name.trim()}
                >
                  {saving ? '…' : 'Créer'}
                </button>
                <button
                  type="button"
                  className="flex-1 btn text-xs py-1 border border-gray-200 hover:bg-gray-50"
                  onClick={() => setCreating(false)}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
