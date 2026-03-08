-- Migration 0014 : Table clients + FK client_id sur projects
-- Les clients (maîtres d'ouvrage) sont récurrents → base de données dédiée
-- Permet le dropdown "choisir / créer un client" dans l'UI

-- ─────────────────────────────────────────────────────────────
-- 1. Table clients
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  address     TEXT,
  city        TEXT,
  postal_code TEXT,
  notes       TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────
-- 2. FK optionnelle sur projects
--    client_name / client_email / client_phone restent pour
--    la rétrocompatibilité ; client_id est la nouvelle référence
-- ─────────────────────────────────────────────────────────────
ALTER TABLE projects ADD COLUMN client_id TEXT REFERENCES clients(id);
