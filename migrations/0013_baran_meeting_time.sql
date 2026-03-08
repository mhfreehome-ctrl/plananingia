-- Migration 0013 : Ajout GUCLU Baran (conducteur) + champ meeting_time sur projets
-- Mot de passe par défaut : "Admin1234!" (pbkdf2:100000)

-- ─────────────────────────────────────────────────────────────
-- 1. Champ H de réunion sur les projets
--    Format libre : ex. "Lundi 14h", "Mercredi 9h30", "Vendredi 10h"
-- ─────────────────────────────────────────────────────────────
ALTER TABLE projects ADD COLUMN meeting_time TEXT DEFAULT NULL;

-- ─────────────────────────────────────────────────────────────
-- 2. GUCLU Baran — conducteur de travaux
-- ─────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO users
  (id, email, password_hash, role, user_type, first_name, last_name, company_name, lang, is_active)
VALUES
  ('df_u048', 'baran.guclu@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Baran', 'GUCLU', 'DESIGN FACADES', 'tr', 1);
