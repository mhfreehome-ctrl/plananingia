-- Migration 0003 : préparation multi-tenant
-- Ajout de la table companies + company_id nullable sur users et projects
-- Aucune donnée existante n'est altérée (colonnes nullable, rattachement optionnel)

-- Table entreprises générales (futurs tenants)
CREATE TABLE IF NOT EXISTS companies (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  siret        TEXT,
  address      TEXT,
  city         TEXT,
  postal_code  TEXT,
  email        TEXT,
  phone        TEXT,
  plan         TEXT NOT NULL DEFAULT 'free',  -- free | pro | enterprise
  plan_expires_at TEXT,                        -- date ISO, NULL = pas d'expiration
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Rattachement des utilisateurs à une entreprise (nullable = admin global ou migration)
ALTER TABLE users ADD COLUMN company_id TEXT REFERENCES companies(id) ON DELETE SET NULL;

-- Rattachement des projets à une entreprise (nullable = projets existants conservés)
ALTER TABLE projects ADD COLUMN company_id TEXT REFERENCES companies(id) ON DELETE SET NULL;

-- Index pour les requêtes par tenant
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);

-- Créer l'entreprise initiale "LORRAINE CONSTRUCTEURS" et y rattacher l'admin existant
INSERT INTO companies (id, name, plan) VALUES ('company_001', 'LORRAINE CONSTRUCTEURS', 'pro');
UPDATE users SET company_id = 'company_001' WHERE id = 'user_admin_001';
