-- Migration 0004 : Jalons (milestones) per project
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#ef4444',
  created_at TEXT DEFAULT (datetime('now'))
);
