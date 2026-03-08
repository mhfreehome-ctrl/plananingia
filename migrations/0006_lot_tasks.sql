-- Migration 0006 : Sous-tâches par lot
CREATE TABLE IF NOT EXISTS lot_tasks (
  id TEXT PRIMARY KEY,
  lot_id TEXT NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom',  -- 'commande'|'execution'|'livraison'|'custom'
  start_date TEXT,
  end_date TEXT,
  progress INTEGER DEFAULT 0,
  subcontractor_id TEXT REFERENCES users(id),
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
