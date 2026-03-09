-- Migration 0021 : Horodatage automatique des notes
ALTER TABLE lots ADD COLUMN notes_updated_at TEXT;
ALTER TABLE lot_tasks ADD COLUMN notes_updated_at TEXT;
