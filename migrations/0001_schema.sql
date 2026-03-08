-- PlanningIA — Schema v1.0

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'subcontractor',
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  phone TEXT,
  lang TEXT DEFAULT 'fr',
  is_active INTEGER DEFAULT 1,
  invite_token TEXT,
  invite_expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  reference TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  description TEXT,
  start_date TEXT,
  duration_weeks INTEGER,
  budget_ht REAL,
  status TEXT DEFAULT 'draft',
  ai_prompt TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_tr TEXT,
  duration_days INTEGER NOT NULL DEFAULT 10,
  start_date_planned TEXT,
  end_date_planned TEXT,
  start_date_actual TEXT,
  end_date_actual TEXT,
  progress_percent INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  subcontractor_id TEXT REFERENCES users(id),
  color TEXT DEFAULT '#6B7280',
  zone TEXT,
  notes TEXT,
  is_critical INTEGER DEFAULT 0,
  early_start INTEGER DEFAULT 0,
  early_finish INTEGER DEFAULT 0,
  late_start INTEGER DEFAULT 0,
  late_finish INTEGER DEFAULT 0,
  total_float INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dependencies (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  predecessor_id TEXT NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  successor_id TEXT NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'FS',
  lag_days INTEGER DEFAULT 0,
  UNIQUE(predecessor_id, successor_id)
);

CREATE TABLE IF NOT EXISTS progress_updates (
  id TEXT PRIMARY KEY,
  lot_id TEXT NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  progress_percent INTEGER NOT NULL,
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id),
  lot_id TEXT REFERENCES lots(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  title_tr TEXT,
  message TEXT NOT NULL,
  message_tr TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  prompt TEXT,
  response TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lots_project ON lots(project_id);
CREATE INDEX IF NOT EXISTS idx_deps_project ON dependencies(project_id);
CREATE INDEX IF NOT EXISTS idx_notifs_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
