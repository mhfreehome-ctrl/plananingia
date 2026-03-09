import { create } from 'zustand'
import { api } from '../api/client'

interface AuthUser {
  id: string; email: string; role: 'admin' | 'subcontractor'
  first_name: string | null; last_name: string | null
  company_name: string | null; lang: string
  access_level?: 'admin' | 'editeur' | 'conducteur' | 'salarie'
  // Champs entreprise (multi-tenant)
  company_id: string | null
  company_type: string | null  // entreprise_generale | maitre_oeuvre | promoteur | entreprise_metier
  company_activity: string | null
  company_lot_types: string[] | null
  company_display_name: string | null
}

interface AuthStore {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  init: () => Promise<void>
  setUser: (u: AuthUser) => void
}

function parseUser(raw: any): AuthUser {
  return {
    ...raw,
    company_lot_types: raw.company_lot_types
      ? (typeof raw.company_lot_types === 'string'
          ? JSON.parse(raw.company_lot_types)
          : raw.company_lot_types)
      : null,
  }
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  loading: true,

  init: async () => {
    // Pas de vérification localStorage — le cookie HttpOnly est envoyé automatiquement
    try {
      const raw = await api.auth.me()
      set({ user: parseUser(raw), loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },

  login: async (email, password) => {
    // Les cookies access_token et refresh_token sont posés par le serveur
    const data = await api.auth.login(email, password)
    // data.user contient le profil de base — on recharge le profil complet via /me
    set({ user: { ...data.user, company_activity: null, company_lot_types: null, company_display_name: null } })
    try {
      const raw = await api.auth.me()
      set({ user: parseUser(raw) })
    } catch {}
  },

  logout: async () => {
    try { await api.auth.logout() } catch {}
    // Les cookies sont effacés côté serveur
    set({ user: null })
  },

  setUser: (user) => set({ user }),
}))
