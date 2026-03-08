-- Migration 0011 : Affectation d'un lot à une équipe (en plus ou à la place du sous-traitant)
ALTER TABLE lots ADD COLUMN team_id TEXT REFERENCES teams(id) ON DELETE SET NULL;
