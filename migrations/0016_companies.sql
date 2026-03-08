-- Migration 0016 : table companies + company_id sur users et projects

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'entreprise_generale',
  -- types : entreprise_generale | maitre_oeuvre | promoteur | entreprise_metier
  activity TEXT,        -- pour entreprise_metier : facade | peinture | electricite | plomberie | etc.
  lot_types TEXT,       -- JSON array des types de lots par défaut ex: ["ECHAF","ITE","ENDUIT"]
  address TEXT,
  city TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  siret TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

ALTER TABLE users ADD COLUMN company_id TEXT REFERENCES companies(id);
ALTER TABLE projects ADD COLUMN company_id TEXT REFERENCES companies(id);
