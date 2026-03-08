-- Seed: Admin + demo project
-- password = "Admin1234!" (PBKDF2-SHA256)
INSERT OR IGNORE INTO users (id, email, password_hash, role, first_name, last_name, company_name, lang)
VALUES (
  'user_admin_001',
  'admin@planningia.fr',
  'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
  'admin',
  'Admin',
  'PlanningIA',
  'Entreprise Générale Demo',
  'fr'
);

-- Sous-traitants de démonstration
INSERT OR IGNORE INTO users (id, email, password_hash, role, first_name, last_name, company_name, lang)
VALUES
  ('user_st_001', 'vrd@demo.fr', 'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66', 'subcontractor', 'Mehmet', 'YILMAZ', 'YILMAZ VRD', 'tr'),
  ('user_st_002', 'go@demo.fr', 'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66', 'subcontractor', 'Jean', 'MARTIN', 'MARTIN Gros Œuvre', 'fr'),
  ('user_st_003', 'elec@demo.fr', 'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66', 'subcontractor', 'Pierre', 'DUBOIS', 'DUBOIS Électricité', 'fr'),
  ('user_st_004', 'plomb@demo.fr', 'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66', 'subcontractor', 'Hasan', 'KAYA', 'KAYA Plomberie', 'tr');

-- Projet de démonstration
INSERT OR IGNORE INTO projects (id, name, reference, address, city, postal_code, client_name, client_email, description, start_date, duration_weeks, status, created_by)
VALUES (
  'proj_demo_001',
  'Résidence Les Cèdres',
  'LYON-2026-001',
  '15 Avenue des Cèdres',
  'Lyon',
  '69008',
  'SCI Les Cèdres',
  'contact@sci-cedres.fr',
  'Construction d''une résidence de 12 logements R+3. Maçonnerie traditionnelle, isolation par l''extérieur, menuiseries aluminium.',
  '2026-04-07',
  28,
  'active',
  'user_admin_001'
);
