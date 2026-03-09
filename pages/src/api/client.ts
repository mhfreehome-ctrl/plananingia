const BASE = import.meta.env.PROD
  ? 'https://planningai-api.mhfreehome.workers.dev/api'
  : '/api'

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    // Tentative de refresh silencieux — cookie refresh_token envoyé automatiquement
    const r = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    if (r.ok) {
      // Retry la requête originale avec le nouveau cookie access_token
      const res2 = await fetch(`${BASE}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res2.ok) throw new Error(await res2.text())
      return res2.json() as Promise<T>
    }
    // Refresh échoué — redirection login (garde anti-boucle)
    if (window.location.pathname !== '/login') window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' })) as any
    throw new Error(err.error || 'Request failed')
  }

  return res.json() as Promise<T>
}

const get = <T>(path: string) => req<T>('GET', path)
const post = <T>(path: string, body?: unknown) => req<T>('POST', path, body)
const put = <T>(path: string, body?: unknown) => req<T>('PUT', path, body)
const patch = <T>(path: string, body?: unknown) => req<T>('PATCH', path, body)
const del = <T>(path: string) => req<T>('DELETE', path)

export const api = {
  auth: {
    login: (email: string, password: string) => post<any>('/auth/login', { email, password }),
    logout: () => post('/auth/logout'),
    me: () => get<any>('/auth/me'),
    profile: (data: any) => put('/auth/profile', data),
    changePassword: (current: string, next: string) => put('/auth/change-password', { current_password: current, new_password: next }),
    invite: (data: any) => post<any>('/auth/invite', data),
    acceptInvite: (token: string, password: string) => post('/auth/accept-invite', { token, password }),
    forgotPassword: (email: string) => post('/auth/forgot-password', { email }),
    resetPassword: (token: string, password: string) => post('/auth/reset-password', { token, password }),
  },
  projects: {
    list: () => get<any[]>('/projects'),
    get: (id: string) => get<any>(`/projects/${id}`),
    create: (data: any) => post<any>('/projects', data),
    update: (id: string, data: any) => put(`/projects/${id}`, data),
    delete: (id: string) => del(`/projects/${id}`),
    stats: (id: string) => get<any>(`/projects/${id}/stats`),
  },
  lots: {
    list: (projectId: string) => get<any[]>(`/projects/${projectId}/lots`),
    init: (projectId: string) => post<any[]>(`/projects/${projectId}/lots/init`),
    catalog: () => get<any[]>('/lots/catalog'),
    fromCatalog: (projectId: string, codes: string[]) => post<any>(`/projects/${projectId}/lots/from-catalog`, { codes }),
    train: (projectId: string, data: { lot_ids: string[]; zones: string[]; lag_days: number; dep_type: string }) => post<any>(`/projects/${projectId}/lots/train`, data),
    create: (projectId: string, data: any) => post<any>(`/projects/${projectId}/lots`, data),
    update: (id: string, data: any) => put(`/lots/${id}`, data),
    updateDates: (id: string, data: { early_start: number; early_finish: number; start_date_planned?: string; end_date_planned?: string; duration_days?: number }) => patch(`/lots/${id}/dates`, data),
    delete: (id: string) => del(`/lots/${id}`),
    progress: (id: string, data: any) => patch(`/lots/${id}/progress`, data),
    history: (id: string) => get<any[]>(`/lots/${id}/history`),
  },
  deps: {
    list: (projectId: string) => get<any[]>(`/projects/${projectId}/dependencies`),
    create: (projectId: string, data: any) => post<any>(`/projects/${projectId}/dependencies`, data),
    delete: (id: string) => del(`/dependencies/${id}`),
  },
  planning: {
    generateAI: (projectId: string, chantierType?: string) => post<any>(`/projects/${projectId}/generate-ai`, chantierType ? { chantier_type: chantierType } : {}),
    computeCPM: (projectId: string) => post<any>(`/projects/${projectId}/compute-cpm`),
    gantt: (projectId: string) => get<any>(`/projects/${projectId}/gantt`),
    unified: () => get<any[]>('/planning/unified'),
  },
  my: {
    lots: () => get<any[]>('/my/lots'),
    projects: () => get<any[]>('/my/projects'),
    notifications: () => get<any[]>('/my/notifications'),
  },
  notifications: {
    list: () => get<any[]>('/notifications'),
    unreadCount: () => get<any>('/notifications/unread-count'),
    markRead: (id: string) => patch(`/notifications/${id}/read`),
    markAllRead: () => patch('/notifications/read-all'),
  },
  users: {
    list: () => get<any[]>('/users'),
    update: (id: string, data: any) => put<any>(`/users/${id}`, data),
    delete: (id: string) => del(`/users/${id}`),
    lots: (id: string) => get<any[]>(`/users/${id}/lots`),
    resetPassword: (id: string) => post<any>(`/users/${id}/reset-password`, {}),
  },
  lotTasks: {
    listForProject: (projectId: string) => get<any[]>(`/projects/${projectId}/lot-tasks`),
    list: (lotId: string) => get<any[]>(`/lots/${lotId}/tasks`),
    create: (lotId: string, data: any) => post<any>(`/lots/${lotId}/tasks`, data),
    update: (id: string, data: any) => put<any>(`/lot-tasks/${id}`, data),
    delete: (id: string) => del(`/lot-tasks/${id}`),
  },
  lotAssignments: {
    listForProject: (projectId: string) => get<any[]>(`/projects/${projectId}/lot-assignments`),
    list: (lotId: string) => get<any[]>(`/lots/${lotId}/assignments`),
    create: (lotId: string, data: any) => post<any>(`/lots/${lotId}/assignments`, data),
    update: (id: string, data: any) => put<any>(`/lot-assignments/${id}`, data),
    delete: (id: string) => del(`/lot-assignments/${id}`),
  },
  milestones: {
    list: (projectId: string) => get<any[]>(`/projects/${projectId}/milestones`),
    create: (projectId: string, data: { name: string; date: string; color?: string }) =>
      post<any>(`/projects/${projectId}/milestones`, data),
    update: (id: string, data: { name: string; date: string; color?: string }) =>
      put<any>(`/milestones/${id}`, data),
    delete: (id: string) => del(`/milestones/${id}`),
  },
  teams: {
    list: () => get<any[]>('/teams'),
    get: (id: string) => get<any>(`/teams/${id}`),
    create: (data: { name: string; color?: string; leader_id?: string; description?: string }) =>
      post<any>('/teams', data),
    update: (id: string, data: { name: string; color?: string; leader_id?: string; description?: string }) =>
      put<any>(`/teams/${id}`, data),
    delete: (id: string) => del(`/teams/${id}`),
    lots: (id: string) => get<any[]>(`/teams/${id}/lots`),
    members: {
      list: (teamId: string) => get<any[]>(`/teams/${teamId}/members`),
      add: (teamId: string, userId: string, roleInTeam?: string) =>
        post<any>(`/teams/${teamId}/members`, { user_id: userId, role_in_team: roleInTeam || 'member' }),
      remove: (teamId: string, userId: string) => del(`/teams/${teamId}/members/${userId}`),
    },
  },
  clients: {
    list: () => get<any[]>('/clients'),
    get: (id: string) => get<any>(`/clients/${id}`),
    create: (data: { name: string; email?: string; phone?: string; address?: string; city?: string; postal_code?: string; notes?: string }) =>
      post<any>('/clients', data),
    update: (id: string, data: { name: string; email?: string; phone?: string; address?: string; city?: string; postal_code?: string; notes?: string }) =>
      put<any>(`/clients/${id}`, data),
    delete: (id: string) => del(`/clients/${id}`),
  },
  companies: {
    me: () => get<any>('/companies/me'),
    update: (data: any) => put<any>('/companies/me', data),
    create: (data: any) => post<any>('/companies', data),
  },
  platform: {
    lotTemplates: (catalog: 'btp' | 'facade') => get<any>(`/platform/lot-templates?catalog=${catalog}`),
    createLotTemplate: (data: any) => post<any>('/platform/lot-templates', data),
    updateLotTemplate: (id: string, data: any) => put<any>(`/platform/lot-templates/${id}`, data),
    deleteLotTemplate: (id: string) => del(`/platform/lot-templates/${id}`),
    createLotDep: (data: any) => post<any>('/platform/lot-template-deps', data),
    updateLotDep: (id: string, data: any) => put<any>(`/platform/lot-template-deps/${id}`, data),
    deleteLotDep: (id: string) => del(`/platform/lot-template-deps/${id}`),
    menuConfig: () => get<any[]>('/platform/menu-config'),
    saveMenuConfig: (items: any[]) => put<any[]>('/platform/menu-config', items),
    companies: () => get<any[]>('/platform/companies'),
    createCompany: (data: any) => post<any>('/platform/companies', data),
    updateCompany: (id: string, data: any) => put<any>(`/platform/companies/${id}`, data),
    inviteToCompany: (id: string, data: any) => post<any>(`/platform/companies/${id}/invite`, data),
    blockCompany: (id: string, blocked: boolean) => put<any>(`/platform/companies/${id}/block`, { blocked }),
    stats: () => get<any>('/platform/stats'),
  },
}
