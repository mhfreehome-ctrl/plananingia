-- Migration 0020 : Champ notes sur lot_tasks (sous-tâches)
-- Lots déjà équipés d'un champ notes TEXT (migration 0001)
ALTER TABLE lot_tasks ADD COLUMN notes TEXT;
