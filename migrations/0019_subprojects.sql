-- Migration 0019 : Sous-projets (programmes immobiliers)
-- Permet de rattacher un projet à un projet parent (programme)
-- project_type : 'standalone' (défaut) | 'program' (parent) | 'sub_project' (enfant)

ALTER TABLE projects ADD COLUMN parent_project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN project_type TEXT NOT NULL DEFAULT 'standalone';
