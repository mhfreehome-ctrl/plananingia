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
    // Guard : si l'utilisateur est déjà défini (ex: login() vient de s'exécuter), on ne réécrase pas
    if (useAuth.getState().user) { set({ loading: false }); return }
    // Cookies HttpOnly envoyés automatiquement — appel direct à /auth/me
    try {
      const raw = await api.auth.me()
      set({ user: parseUser(raw), loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },

  login: async (email, password) => {
    const data = await api.auth.login(email, password)
    // Cookies access_token + refresh_token posés par le worker (HttpOnly)
    set({ user: parseUser(data.user), loading: false })
  },

  logout: async () => {
    try { await api.auth.logout() } catch {}
    set({ user: null })
  },

  setUser: (user) => set({ user }),
}))
