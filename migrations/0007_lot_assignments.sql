CREATE TABLE IF NOT EXISTS lot_assignments (
  id TEXT PRIMARY KEY,
  lot_id TEXT NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  subcontractor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date TEXT,
  end_date TEXT,
  progress INTEGER DEFAULT 0,
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(lot_id, subcontractor_id)
);
