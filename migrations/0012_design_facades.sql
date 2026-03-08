-- Migration 0012 : Champ lot_types sur projets + seed DESIGN FACADES
-- Société : DESIGN FACADES — poses de façades (grésée, bardage, enduit projeté)
-- Surface moyenne chantier : ~3 000 m²
-- Mot de passe par défaut : "Admin1234!" (pbkdf2:100000)

-- ─────────────────────────────────────────────────────────────
-- 1. Champ lot_types sur les projets
--    Stocké en JSON : ex. ["FACADE_GRESEE","BARDAGE","ENDUIT_PROJETE"]
--    Règle métier : FACADE_GRESEE et ENDUIT_PROJETE mutuellement exclusifs
--    sur un même bâtiment (mais peuvent coexister dans un même projet
--    sur des bâtiments / zones différents)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE projects ADD COLUMN lot_types TEXT DEFAULT NULL;

-- ─────────────────────────────────────────────────────────────
-- 2. Utilisateurs DESIGN FACADES (47 personnes)
--    Hash partagé = pbkdf2:100000:c04e24fb664db020245fa4786a43a391:
--                   78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66
-- ─────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO users
  (id, email, password_hash, role, user_type, first_name, last_name, company_name, lang, is_active)
VALUES
  -- ── Direction / Administration (role admin) ──────────────────
  ('df_u001', 'serhat.guclu@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'admin', 'employee', 'Serhat', 'GUCLU', 'DESIGN FACADES', 'tr', 1),

  ('df_u002', 'zelal.guclu@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'admin', 'employee', 'Zelal', 'GUCLU', 'DESIGN FACADES', 'tr', 1),

  ('df_u003', 'sandrine.trapp@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'admin', 'employee', 'Sandrine', 'TRAPP', 'DESIGN FACADES', 'fr', 1),

  ('df_u004', 'celebi.ozkan@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'admin', 'employee', 'Celebi', 'OZKAN', 'DESIGN FACADES', 'tr', 1),

  -- ── Conducteurs de travaux (subcontractor / employee) ─────────
  ('df_u005', 'ferhat.guclu@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Ferhat', 'GUCLU', 'DESIGN FACADES', 'tr', 1),

  ('df_u006', 'servet.guclu@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Servet', 'GUCLU', 'DESIGN FACADES', 'tr', 1),

  ('df_u007', 'thibaut.guclu@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Thibaut', 'GUCLU', 'DESIGN FACADES', 'fr', 1),

  -- ── Chefs d''équipe (8) ────────────────────────────────────────
  ('df_u008', 'omer.demir@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Omer', 'DEMIR', 'DESIGN FACADES', 'tr', 1),

  ('df_u009', 'orhan.demir@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Orhan', 'DEMIR', 'DESIGN FACADES', 'tr', 1),

  ('df_u010', 'emir.hajdari@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Emir', 'HAJDARI', 'DESIGN FACADES', 'fr', 1),

  ('df_u011', 'mustafa.karakaya@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Mustafa', 'KARAKAYA', 'DESIGN FACADES', 'tr', 1),

  ('df_u012', 'sercan.kisabacak@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Sercan', 'KISABACAK', 'DESIGN FACADES', 'tr', 1),

  ('df_u013', 'soner.kivrak@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Soner', 'KIVRAK', 'DESIGN FACADES', 'tr', 1),

  ('df_u014', 'alija.omerovic@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Alija', 'OMEROVIC', 'DESIGN FACADES', 'fr', 1),

  ('df_u015', 'gursel.ozel@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Gursel', 'OZEL', 'DESIGN FACADES', 'tr', 1),

  -- ── Ouvriers — maçons briqueteurs ─────────────────────────────
  ('df_u016', 'emrah.acar@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Emrah', 'ACAR', 'DESIGN FACADES', 'tr', 1),

  ('df_u024', 'ergin.berkoy@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Ergin', 'BERKOY', 'DESIGN FACADES', 'tr', 1),

  -- ── Ouvriers — façadiers ──────────────────────────────────────
  ('df_u018', 'sercan.aktas@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Sercan', 'AKTAS', 'DESIGN FACADES', 'tr', 1),

  ('df_u019', 'ali.altun@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Ali', 'ALTUN', 'DESIGN FACADES', 'tr', 1),

  ('df_u021', 'muhammed.aslan@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Muhammed', 'ASLAN', 'DESIGN FACADES', 'tr', 1),

  ('df_u029', 'inan.dogu@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Inan', 'DOGU', 'DESIGN FACADES', 'tr', 1),

  ('df_u031', 'misbullah.khozakhail@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Misbullah', 'KHOZAKHAIL', 'DESIGN FACADES', 'fr', 1),

  ('df_u032', 'mhammed.kilic@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Mhammed', 'KILIC', 'DESIGN FACADES', 'tr', 1),

  ('df_u033', 'osman.koc@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Osman', 'KOC', 'DESIGN FACADES', 'tr', 1),

  ('df_u039', 'obaidullah.safi@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Obaidullah', 'SAFI', 'DESIGN FACADES', 'fr', 1),

  ('df_u041', 'emrah.yaman@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Emrah', 'YAMAN', 'DESIGN FACADES', 'tr', 1),

  ('df_u042', 'boran.yargi@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Boran', 'YARGI', 'DESIGN FACADES', 'tr', 1),

  ('df_u043', 'mehmtali.yilmaz@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Mehmet Ali', 'YILMAZ', 'DESIGN FACADES', 'tr', 1),

  -- ── Ouvriers — enduiseurs ─────────────────────────────────────
  ('df_u017', 'ferdi.aktas@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Ferdi', 'AKTAS', 'DESIGN FACADES', 'tr', 1),

  ('df_u023', 'ramazan.baru@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Ramazan', 'BARU', 'DESIGN FACADES', 'tr', 1),

  ('df_u034', 'fahim.mohammadi@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Fahim', 'MOHAMMADI', 'DESIGN FACADES', 'fr', 1),

  -- ── Ouvriers — bardeurs ───────────────────────────────────────
  ('df_u027', 'ali.cevik@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Ali', 'CEVIK', 'DESIGN FACADES', 'tr', 1),

  ('df_u035', 'christophe.rosche@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Christophe', 'ROSCHE', 'DESIGN FACADES', 'fr', 1),

  -- ── Ouvriers — échafaudeurs ───────────────────────────────────
  ('df_u020', 'jordan.andioli@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Jordan', 'ANDIOLI', 'DESIGN FACADES', 'fr', 1),

  ('df_u028', 'can.daglan@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Can', 'DAGLAN', 'DESIGN FACADES', 'tr', 1),

  ('df_u036', 'romeo.rostas@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Romeo', 'ROSTAS', 'DESIGN FACADES', 'fr', 1),

  ('df_u037', 'matiullah.safi@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Matiullah', 'SAFI', 'DESIGN FACADES', 'fr', 1),

  -- ── Ouvriers — aides façadiers ────────────────────────────────
  ('df_u022', 'metin.avci@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Metin', 'AVCI', 'DESIGN FACADES', 'tr', 1),

  ('df_u025', 'kristi.bregu@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Kristi', 'BREGU', 'DESIGN FACADES', 'fr', 1),

  ('df_u026', 'cuneyt.carboga@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Cuneyt', 'CARBOGA', 'DESIGN FACADES', 'tr', 1),

  ('df_u030', 'tekin.iscan@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Tekin', 'ISCAN', 'DESIGN FACADES', 'tr', 1),

  ('df_u038', 'mohammad.safi@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Mohammad', 'SAFI', 'DESIGN FACADES', 'fr', 1),

  ('df_u040', 'ahmed.tahiri@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Ahmed', 'TAHIRI', 'DESIGN FACADES', 'fr', 1),

  -- ── Bureau / Support ──────────────────────────────────────────
  ('df_u044', 'jennifer.bellot@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Jennifer', 'BELLOT', 'DESIGN FACADES', 'fr', 1),

  ('df_u045', 'patrick.laval@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Patrick', 'LAVAL', 'DESIGN FACADES', 'fr', 1),

  ('df_u046', 'jamel.kalai@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Jamel', 'KALAI', 'DESIGN FACADES', 'fr', 1),

  ('df_u047', 'jiyan.ozdilek@designfacades.fr',
   'pbkdf2:100000:c04e24fb664db020245fa4786a43a391:78658ece29f4c694c4b638ceb0d9a4824c47e7834b2f21379ca097d596addb66',
   'subcontractor', 'employee', 'Jiyan', 'OZDILEK', 'DESIGN FACADES', 'tr', 1);

-- ─────────────────────────────────────────────────────────────
-- 3. Équipes DESIGN FACADES (8 équipes)
-- ─────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO teams (id, name, color, leader_id, description)
VALUES
  ('df_team_001', 'Façade Grésée 1',  '#1d4ed8', 'df_u008',
   'Chef : DEMIR Omer — maçons briqueteurs + façadiers'),

  ('df_team_002', 'Façade Grésée 2',  '#2563eb', 'df_u009',
   'Chef : DEMIR Orhan — façadiers'),

  ('df_team_003', 'Enduit Projeté',   '#d97706', 'df_u010',
   'Chef : HAJDARI Emir — enduiseurs'),

  ('df_team_004', 'Bardage',          '#7c3aed', 'df_u011',
   'Chef : KARAKAYA Mustafa — bardeurs'),

  ('df_team_005', 'Polyvalente 1',    '#059669', 'df_u012',
   'Chef : KISABACAK Sercan — façadiers polyvalents'),

  ('df_team_006', 'Echafaudage',      '#dc2626', 'df_u013',
   'Chef : KIVRAK Soner — échafaudeurs'),

  ('df_team_007', 'Polyvalente 2',    '#0891b2', 'df_u014',
   'Chef : OMEROVIC Alija — aides polyvalents'),

  ('df_team_008', 'Polyvalente 3',    '#ea580c', 'df_u015',
   'Chef : OZEL Gursel — polyvalents');

-- ─────────────────────────────────────────────────────────────
-- 4. Membres des équipes
-- ─────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO team_members (id, team_id, user_id, role_in_team)
VALUES
  -- Façade Grésée 1 : maçons + façadiers
  ('df_tm_001', 'df_team_001', 'df_u008', 'leader'),   -- DEMIR Omer (chef)
  ('df_tm_002', 'df_team_001', 'df_u016', 'member'),   -- ACAR Emrah (maçon briqueteur)
  ('df_tm_003', 'df_team_001', 'df_u024', 'member'),   -- BERKOY Ergin (maçon briqueteur)
  ('df_tm_004', 'df_team_001', 'df_u018', 'member'),   -- AKTAS Sercan (façadier)
  ('df_tm_005', 'df_team_001', 'df_u019', 'member'),   -- ALTUN Ali (façadier)
  ('df_tm_006', 'df_team_001', 'df_u021', 'member'),   -- ASLAN Muhammed (façadier)

  -- Façade Grésée 2 : façadiers
  ('df_tm_007', 'df_team_002', 'df_u009', 'leader'),   -- DEMIR Orhan (chef)
  ('df_tm_008', 'df_team_002', 'df_u029', 'member'),   -- DOGU Inan (façadier)
  ('df_tm_009', 'df_team_002', 'df_u031', 'member'),   -- KHOZAKHAIL Misbullah (façadier)
  ('df_tm_010', 'df_team_002', 'df_u032', 'member'),   -- KILIC Mhammed (façadier)
  ('df_tm_011', 'df_team_002', 'df_u033', 'member'),   -- KOC Osman (façadier)
  ('df_tm_012', 'df_team_002', 'df_u039', 'member'),   -- SAFI Obaidullah (façadier)

  -- Enduit Projeté : enduiseurs + aides
  ('df_tm_013', 'df_team_003', 'df_u010', 'leader'),   -- HAJDARI Emir (chef)
  ('df_tm_014', 'df_team_003', 'df_u017', 'member'),   -- AKTAS Ferdi (enduiseur)
  ('df_tm_015', 'df_team_003', 'df_u023', 'member'),   -- BARU Ramazan (aide enduiseur)
  ('df_tm_016', 'df_team_003', 'df_u034', 'member'),   -- MOHAMMADI Fahim (enduiseur)
  ('df_tm_017', 'df_team_003', 'df_u022', 'member'),   -- AVCI Metin (aide façadier)
  ('df_tm_018', 'df_team_003', 'df_u030', 'member'),   -- ISCAN Tekin (aide façadier)

  -- Bardage : bardeurs + aides
  ('df_tm_019', 'df_team_004', 'df_u011', 'leader'),   -- KARAKAYA Mustafa (chef)
  ('df_tm_020', 'df_team_004', 'df_u027', 'member'),   -- CEVIK Ali (bardeur)
  ('df_tm_021', 'df_team_004', 'df_u035', 'member'),   -- ROSCHE Christophe (bardeur)
  ('df_tm_022', 'df_team_004', 'df_u025', 'member'),   -- BREGU Kristi (aide)
  ('df_tm_023', 'df_team_004', 'df_u026', 'member'),   -- CARBOGA Cuneyt (aide)

  -- Polyvalente 1 : façadiers + aide
  ('df_tm_024', 'df_team_005', 'df_u012', 'leader'),   -- KISABACAK Sercan (chef)
  ('df_tm_025', 'df_team_005', 'df_u041', 'member'),   -- YAMAN Emrah (façadier)
  ('df_tm_026', 'df_team_005', 'df_u042', 'member'),   -- YARGI Boran (façadier)
  ('df_tm_027', 'df_team_005', 'df_u043', 'member'),   -- YILMAZ Mehmet Ali (façadier)
  ('df_tm_028', 'df_team_005', 'df_u038', 'member'),   -- SAFI Mohammad (aide façadier)

  -- Echafaudage : échafaudeurs
  ('df_tm_029', 'df_team_006', 'df_u013', 'leader'),   -- KIVRAK Soner (chef)
  ('df_tm_030', 'df_team_006', 'df_u020', 'member'),   -- ANDIOLI Jordan (échafaudeur)
  ('df_tm_031', 'df_team_006', 'df_u028', 'member'),   -- DAGLAN Can (échafaudeur)
  ('df_tm_032', 'df_team_006', 'df_u036', 'member'),   -- ROSTAS Romeo (échafaudeur)
  ('df_tm_033', 'df_team_006', 'df_u037', 'member'),   -- SAFI Matiullah (échafaudeur)

  -- Polyvalente 2
  ('df_tm_034', 'df_team_007', 'df_u014', 'leader'),   -- OMEROVIC Alija (chef)
  ('df_tm_035', 'df_team_007', 'df_u040', 'member'),   -- TAHIRI Ahmed (aide façadier)

  -- Polyvalente 3
  ('df_tm_036', 'df_team_008', 'df_u015', 'leader');   -- OZEL Gursel (chef)
