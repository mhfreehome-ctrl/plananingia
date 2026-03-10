-- Migration 0022 : Tâches par lot-template (catalogues corps de métier)
CREATE TABLE IF NOT EXISTS lot_template_tasks (
  id              TEXT PRIMARY KEY,
  lot_template_id TEXT NOT NULL REFERENCES lot_templates(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  duration_days   INTEGER NOT NULL DEFAULT 1,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ltt_lot ON lot_template_tasks(lot_template_id);
