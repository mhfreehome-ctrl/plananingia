import { create } from 'zustand'
import { api, saveTokens, clearTokens } from '../api/client'

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
    // Le token localStorage est envoyé automatiquement via buildHeaders() dans client.ts
    try {
      const raw = await api.auth.me()
      set({ user: parseUser(raw), loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },

  login: async (email, password) => {
    const data = await api.auth.login(email, password)
    // Persist tokens for cross-session + mobile compatibility
    saveTokens(data.access_token, data.refresh_token)
    // Recharge le profil complet via /me
    const raw = await api.auth.me()
    set({ user: parseUser(raw) })
  },

  logout: async () => {
    try { await api.auth.logout() } catch {}
    clearTokens()
    set({ user: null })
  },

  setUser: (user) => set({ user }),
}))
