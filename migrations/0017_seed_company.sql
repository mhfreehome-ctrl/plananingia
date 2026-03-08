-- Migration 0017 : entreprise DESIGN FACADES + liaison des données existantes

INSERT INTO companies (id, name, type, activity, lot_types, city, phone, email) VALUES (
  'comp_df',
  'DESIGN FACADES',
  'entreprise_metier',
  'facade',
  '["ECHAF","ITE","ENDUIT","BARDAGE","LASURE","RAVALEMENT"]',
  'Nancy',
  NULL,
  NULL
);

-- Lier tous les utilisateurs Design Facades (id préfixé df_) à l'entreprise
UPDATE users SET company_id = 'comp_df' WHERE id LIKE 'df_%';

-- Lier tous les projets existants (Excel + tests) à Design Facades
UPDATE projects SET company_id = 'comp_df';

-- Note : les anciens comptes démo (user_admin_001, user_st_001...)
-- gardent company_id = NULL et deviennent invisibles pour les admins de comp_df.
