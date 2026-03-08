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

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  loading: true,

  init: async () => {
    const token = localStorage.getItem('planningIA_token')
    if (!token) { set({ loading: false }); return }
    try {
      const raw = await api.auth.me()
      // Parser company_lot_types depuis JSON string si besoin
      const user: AuthUser = {
        ...raw,
        company_lot_types: raw.company_lot_types
          ? (typeof raw.company_lot_types === 'string'
              ? JSON.parse(raw.company_lot_types)
              : raw.company_lot_types)
          : null,
      }
      set({ user, loading: false })
    } catch {
      localStorage.removeItem('planningIA_token')
      localStorage.removeItem('planningIA_refresh')
      set({ user: null, loading: false })
    }
  },

  login: async (email, password) => {
    const data = await api.auth.login(email, password)
    localStorage.setItem('planningIA_token', data.access_token)
    localStorage.setItem('planningIA_refresh', data.refresh_token)
    // Pour le login, les champs company viennent du /me — on stocke user basique
    // puis on recharge le profil complet
    set({ user: { ...data.user, company_id: data.user.company_id || null, company_type: data.user.company_type || null, company_activity: null, company_lot_types: null, company_display_name: null } })
    // Recharge le profil complet avec les infos entreprise
    try {
      const raw = await api.auth.me()
      const user: AuthUser = {
        ...raw,
        company_lot_types: raw.company_lot_types
          ? (typeof raw.company_lot_types === 'string'
              ? JSON.parse(raw.company_lot_types)
              : raw.company_lot_types)
          : null,
      }
      set({ user })
    } catch {}
  },

  logout: async () => {
    try { await api.auth.logout() } catch {}
    localStorage.removeItem('planningIA_token')
    localStorage.removeItem('planningIA_refresh')
    set({ user: null })
  },

  setUser: (user) => set({ user }),
}))
