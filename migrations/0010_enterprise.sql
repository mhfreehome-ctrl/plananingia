-- Migration 0010 : Modèle Entreprise
-- user_type distingue les salariés des sous-traitants dans le rôle 'subcontractor'
ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT 'subcontractor';

-- Équipes de salariés
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  leader_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Membres d'une équipe (salarié ↔ équipe)
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_in_team TEXT DEFAULT 'member',
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(team_id, user_id)
);
