export interface Env {
  DB: D1Database
  KV: KVNamespace
  JWT_SECRET: string
  CLAUDE_API_KEY: string
  RESEND_API_KEY?: string
  RESEND_FROM?: string
  ENVIRONMENT?: string
}

export interface JWTPayload {
  sub: string
  role: 'admin' | 'subcontractor'
  email: string
  company_id: string | null
  company_type: string | null  // entreprise_generale | maitre_oeuvre | promoteur | entreprise_metier
  access_level: 'admin' | 'editeur' | 'conducteur' | 'salarie'
  iat: number
  exp: number
}

export interface Company {
  id: string
  name: string
  type: 'entreprise_generale' | 'maitre_oeuvre' | 'promoteur' | 'entreprise_metier'
  activity: string | null
  lot_types: string | null  // JSON string
  address: string | null
  city: string | null
  postal_code: string | null
  phone: string | null
  email: string | null
  siret: string | null
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  password_hash: string
  role: 'admin' | 'subcontractor'
  user_type: 'subcontractor' | 'employee'  // 'subcontractor' = ST externe, 'employee' = salarié
  first_name: string | null
  last_name: string | null
  company_name: string | null
  phone: string | null
  lang: string
  access_level: 'admin' | 'editeur' | 'conducteur' | 'salarie'
  is_active: number
  invite_token: string | null
  invite_expires_at: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  reference: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  client_name: string | null
  client_email: string | null
  client_phone: string | null
  description: string | null
  start_date: string | null
  duration_weeks: number | null
  budget_ht: number | null
  status: 'draft' | 'preparation' | 'active' | 'reception' | 'closed'
  ai_prompt: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Lot {
  id: string
  project_id: string
  code: string
  name: string
  name_tr: string | null
  duration_days: number
  start_date_planned: string | null
  end_date_planned: string | null
  start_date_actual: string | null
  end_date_actual: string | null
  progress_percent: number
  status: 'pending' | 'active' | 'paused' | 'done' | 'with_reserves'
  subcontractor_id: string | null
  team_id: string | null
  color: string
  zone: string | null
  notes: string | null
  is_critical: number
  early_start: number
  early_finish: number
  late_start: number
  late_finish: number
  total_float: number
  sort_order: number
  parent_lot_id: string | null
  market_deadline: string | null
  is_provisional: number
  created_at: string
  updated_at: string
  // joined
  subcontractor_name?: string
  subcontractor_company?: string
  team_name?: string
  team_color?: string
}

export interface Dependency {
  id: string
  project_id: string
  predecessor_id: string
  successor_id: string
  type: 'FS' | 'SS' | 'FF' | 'SF'
  lag_days: number
}

export interface Milestone {
  id: string
  project_id: string
  name: string
  date: string
  color: string
  created_at: string
}

export interface Team {
  id: string
  name: string
  color: string
  leader_id: string | null
  description: string | null
  created_at: string
  updated_at: string
  // joined
  leader_name?: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role_in_team: string
  created_at: string
  // joined
  first_name?: string
  last_name?: string
  email?: string
  company_name?: string
  user_type?: string
}

export interface Notification {
  id: string
  user_id: string
  project_id: string | null
  lot_id: string | null
  type: string
  title: string
  title_tr: string | null
  message: string
  message_tr: string | null
  is_read: number
  created_at: string
}
