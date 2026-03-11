-- Migration 0023 : champs SIRET et métier (corps de métier) sur les utilisateurs sous-traitants
ALTER TABLE users ADD COLUMN siret TEXT;
ALTER TABLE users ADD COLUMN trade TEXT;
CREATE INDEX IF NOT EXISTS idx_users_siret ON users(siret) WHERE siret IS NOT NULL;
