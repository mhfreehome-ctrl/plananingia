-- Migration 0015 : Seed clients + projets depuis MODELE PLANING CHANTIER 2026+2027
-- Source : MODELE PLANING CHANTIER 2026+2027 - ZG CO CONDUC.xlsx (feuille VENTE PRO)
-- Conducteurs : FERHAT=df_u005 | SERVET=df_u006 | BARAN=df_u048 | SERHAT=df_u001
-- Tous les projets créés_par = df_u001 (Serhat, admin)

-- ─────────────────────────────────────────────────────────────
-- 1. Clients (maîtres d'ouvrage récurrents)
-- ─────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO clients (id, name) VALUES
  ('cli_001', 'BATIGERE'),
  ('cli_002', 'SEM EMH'),
  ('cli_003', 'SCCV LES HAUTS DE MANOM'),
  ('cli_004', 'VIVEST'),
  ('cli_005', 'BLUE EMAERAUDE - SCCV CASSIOPEE'),
  ('cli_006', 'NOVA HOMES'),
  ('cli_007', 'DELTA PROMOTION - SCCV MULLIGAN'),
  ('cli_008', 'MAGNUM IMMO - SP2E ROYAL PROMOTION SARL'),
  ('cli_009', 'ENTENTE SOCIO CULTURELLE ISLAMIQUE'),
  ('cli_010', 'MAIRIE D''ILLANGE'),
  ('cli_011', 'CMSEA'),
  ('cli_012', 'IDEA CONSTRUCTION'),
  ('cli_013', 'STRADIM'),
  ('cli_014', 'EIFFAGE'),
  ('cli_015', 'HOTEL BEST WESTERN / I2C'),
  ('cli_016', 'MARTEL IMMO'),
  ('cli_017', 'BOUYGUES BATIMENT'),
  ('cli_018', 'MAIRIE DE FIXEM'),
  ('cli_019', 'SCCV DE LA FONTAINE (EVEL)'),
  ('cli_020', 'TERRALIA HABITAT - SCCV METZ METMAN'),
  ('cli_021', 'SODEVAM'),
  ('cli_022', 'SCCV HERACLES - IC2'),
  ('cli_023', 'SCCV PAIXHANS'),
  ('cli_024', 'SCCV VILLA 8 ASFELD'),
  ('cli_025', 'CONCEPT IMMO'),
  ('cli_026', 'KAUFMAN ET BROAD'),
  ('cli_027', 'LE NID - SA COOPERATIVE HLM'),
  ('cli_028', 'MAGNUM IMMO - SERGE FINANCES'),
  ('cli_029', 'KATSIKAS'),
  ('cli_030', 'DELTA PROMOTION - SNC ECORED'),
  ('cli_031', 'FONTION BOMPARD - DM INGENIERIE'),
  ('cli_032', 'VILLE DE SARREGUEMINES'),
  ('cli_033', 'GROUPE HABITER'),
  ('cli_034', 'IMMOBILIERE GEORGES'),
  ('cli_035', 'GROUPE PICHET - I2C'),
  ('cli_036', 'ICADE PROMOTION - SNC IP1R'),
  ('cli_037', 'SCI BRUNO'),
  ('cli_038', 'CREDIT MUTUEL'),
  ('cli_039', 'MME HOFFMAN / LMO'),
  ('cli_040', 'BLUE HABITAT - SCCV FONTENOTTE'),
  ('cli_041', 'M2 PROMOTION - LMO'),
  ('cli_042', 'MAIRIE DE PELTRE'),
  ('cli_043', 'COMMUNE DE RODEMACK'),
  ('cli_044', 'FOUCHS CREATION');

-- ─────────────────────────────────────────────────────────────
-- 2. Projets (chantiers DESIGN FACADES 2023-2028)
--    Chaque ligne représente un chantier regroupant ses lots façade.
--    lot_types : JSON array des types de travaux décelés dans le planning.
--    status : 'done' si fin < 2026-03-06 | 'draft' si pas de dates | 'active' sinon
-- ─────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO projects
  (id, name, client_name, client_id, start_date, duration_weeks, status,
   lot_types, meeting_time, created_by)
VALUES

-- ── CHANTIERS PASSÉS (done) ───────────────────────────────────────────────────
('xls_p003','RESIDENCE DE 33 LOGTS A MANOM',
 'SCCV LES HAUTS DE MANOM','cli_003','2024-12-01',44,'done',
 NULL,'',                               'df_u001'),

('xls_p005','RIG - MAIZIERES LES METZ',
 'BLUE EMAERAUDE - SCCV CASSIOPEE','cli_005','2025-02-17',20,'done',
 NULL,'',                               'df_u001'),

('xls_p008','10 MAISONS PSLA A ALGRANGE',
 'MAGNUM IMMO - SP2E ROYAL PROMOTION SARL','cli_008','2025-06-04',8,'done',
 NULL,'',                               'df_u001'),

('xls_p010','32 MAISONS INDIVIDUELLES SOCIALES A ALGRANGE',
 'MAGNUM IMMO - SP2E ROYAL PROMOTION SARL','cli_008','2025-06-15',21,'done',
 NULL,'',                               'df_u001'),

('xls_p012','SANDER KISS - BAT A (49 LOGTS)',
 'NOVA HOMES','cli_006','2025-07-20',20,'done',
 NULL,'',                               'df_u001'),

('xls_p013','SANDER KISS - BAT B (49 LOGTS)',
 'NOVA HOMES','cli_006','2025-07-20',20,'done',
 NULL,'',                               'df_u001'),

('xls_p016','CONSTR DE 18 LOGTS A LONGWY',
 'BATIGERE','cli_001','2025-09-15',20,'done',
 NULL,'Mercredi 14h30',                 'df_u001'),

('xls_p020','LOT FACADE - BOULAY',
 'IDEA CONSTRUCTION','cli_012','2025-10-06',16,'done',
 NULL,'Mercredi 10h',                   'df_u001'),

('xls_p033','RENOVATION THERMIQUE LOGEMENTS COMMUNAUX - FIXEM',
 'MAIRIE DE FIXEM','cli_018','2026-01-15',6,'done',
 NULL,'Jeudi 16h',                      'df_u001'),

-- ── CHANTIERS ACTIFS (active) ─────────────────────────────────────────────────
('xls_p001','CONSTR DE 81 LOGTS A TOMBLAINE',
 'BATIGERE','cli_001','2023-02-20',171,'active',
 NULL,'Lundi 14h',                      'df_u001'),

('xls_p002','REHA 224 LOGTS COLLECTIFS - TOURS BELLECROIX A METZ',
 'SEM EMH','cli_002','2024-09-30',140,'active',
 NULL,'',                               'df_u001'),

('xls_p004','CANTEBONNE',
 'VIVEST','cli_004','2024-12-15',81,'active',
 '["ECHAF","BARDAGE"]','Mercredi 9h',   'df_u001'),

('xls_p006','CONSTRUCTION DE 2 IMM COLLECTIFS A ESSEY LES NANCY',
 'NOVA HOMES','cli_006','2025-05-05',48,'active',
 NULL,'Mardi 14h30',                    'df_u001'),

('xls_p007','VILLAS FLORA - 30 LOGTS A BASSE-HAM',
 'DELTA PROMOTION - SCCV MULLIGAN','cli_007','2025-06-01',42,'active',
 NULL,'Lundi 9h',                       'df_u001'),

('xls_p009','MOSQUEE FLORANGE',
 'ENTENTE SOCIO CULTURELLE ISLAMIQUE','cli_009','2025-06-15',37,'active',
 NULL,'Mercredi 9h',                    'df_u001'),

('xls_p011','ECOLES JEAN DE LA FONTAINE - ILLANGE',
 'MAIRIE D''ILLANGE','cli_010','2025-06-25',36,'active',
 NULL,'Mercredi 10h30',                 'df_u001'),

('xls_p014','SCCV PETIT DUC',
 'CONCEPT IMMO','cli_025','2025-07-28',27,'active',
 '["ECHAF","ENDUIT","LASURE"]','Jeudi 9h','df_u001'),

('xls_p015','BATIMENT PHV - FAM LE HAUT SORET',
 'CMSEA','cli_011','2025-08-15',31,'active',
 NULL,'Vendredi 9h',                    'df_u001'),

('xls_p017','LE TRIANON MAXEVILLE',
 'NOVA HOMES','cli_006','2025-09-15',26,'active',
 '["ECHAF","ITE"]','',                  'df_u001'),

('xls_p018','RESIDENCE LES COTEAUX - 43 LOGTS A MAXEVILLE',
 'NOVA HOMES','cli_006','2025-09-15',33,'active',
 '["ECHAF"]','',                        'df_u001'),

('xls_p019','15 LOGTS COLLECTIFS A ST JULIEN LES METZ',
 'VIVEST','cli_004','2025-09-15',31,'active',
 NULL,'Mardi 14h30',                    'df_u001'),

('xls_p021','LE DOMAINE DE LA ROSE D''OR A MONTIGNY LES METZ',
 'STRADIM','cli_013','2025-10-15',28,'active',
 '["RAVALEMENT","BARDAGE"]','Mardi 10h','df_u001'),

('xls_p022','108 LOGTS ETUDIANTS A VANDOEUVRE',
 'EIFFAGE','cli_014','2025-10-24',24,'active',
 '["ECHAF","ENDUIT","BARDAGE","LASURE"]','Libre','df_u001'),

('xls_p023','RESIDENCE ARTEMIS A FONTOY',
 'NOVA HOMES','cli_006','2025-11-15',22,'active',
 '["ECHAF","ITE","BARDAGE"]','Lundi 14h','df_u001'),

('xls_p024','LE BOTANIK - TRANCHE 2 - 42 LOGTS A METZ',
 'GROUPE HABITER','cli_033','2025-11-18',20,'active',
 NULL,'',                               'df_u001'),

('xls_p025','SCCV DOMAINE DE MALTE - 66 LOGEMENTS',
 'IDEA CONSTRUCTION','cli_012','2025-12-01',19,'active',
 NULL,'Mercredi 13h30',                 'df_u001'),

('xls_p026','CONSTR DE 12 LOGEMENTS A MARLY',
 'LE NID - SA COOPERATIVE HLM','cli_027','2025-12-04',43,'active',
 '["ECHAF","ENDUIT"]','Mardi 10h30',    'df_u001'),

('xls_p027','26RS - CONSTR DE 26 LOGEMENTS A ALGRANGE',
 'MAGNUM IMMO - SERGE FINANCES','cli_028','2025-12-15',13,'active',
 '["ECHAF","ITE"]','Mercredi 10h',      'df_u001'),

('xls_p028','SEVEN UCKANGE LOT 10 FACADES',
 'NOVA HOMES','cli_006','2025-12-15',18,'active',
 '["ECHAF","ITE","BARDAGE","ENDUIT"]','Vendredi 10h','df_u001'),

('xls_p029','4 BATIMENTS VILLIERS LES NANCY',
 'NOVA HOMES','cli_006','2025-12-19',54,'active',
 '["ECHAF","ENDUIT"]','',               'df_u001'),

('xls_p030','EXTENSION HOTEL BEST WESTERN METZ',
 'HOTEL BEST WESTERN / I2C','cli_015','2025-12-22',15,'active',
 NULL,'',                               'df_u001'),

('xls_p031','JARDIN DES ARTS - BATIMENT A',
 'MARTEL IMMO','cli_016','2026-01-01',20,'active',
 '["ECHAF","ITE"]','Mardi 9h',          'df_u001'),

('xls_p032','RDO QUARTIER WIESBERG ET BELLEVUE',
 'BOUYGUES BATIMENT','cli_017','2026-01-05',113,'active',
 '["ECHAF"]','Libre',                   'df_u001'),

('xls_p034','RESIDENCE SERVICES 46 LOGTS A METZ TECHNOPOLE',
 'SCCV DE LA FONTAINE (EVEL)','cli_019','2026-01-15',20,'active',
 NULL,'Mardi 9h',                       'df_u001'),

('xls_p035','CONSTR DE LOGEMENTS COLLECTIFS - METZ METMAN',
 'TERRALIA HABITAT - SCCV METZ METMAN','cli_020','2026-01-15',12,'active',
 NULL,'Mercredi 10h30',                 'df_u001'),

('xls_p036','ATELIERS MUNICIPAUX YUTZ',
 'SODEVAM','cli_021','2026-02-01',7,'active',
 NULL,'',                               'df_u001'),

('xls_p037','MAISON DES ASSOCIATIONS - ANCIENNE ECOLE DES VERGERS',
 'VILLE DE SARREGUEMINES','cli_032','2026-02-10',21,'active',
 NULL,'Mercredi 8h30',                  'df_u001'),

('xls_p038','RESIDENCE 31 LOGTS A MAIZIERES LES METZ',
 'SCCV HERACLES - IC2','cli_022','2026-02-16',5,'active',
 NULL,'Jeudi 14h30',                    'df_u001'),

('xls_p039','25 LOGTS - SCCV PAIXHANS LOT 19',
 'SCCV PAIXHANS','cli_023','2026-02-16',24,'active',
 '["ECHAF","ITE","BARDAGE","LASURE"]','Lundi 8h','df_u001'),

('xls_p040','CONSTR DE 13 LOGTS A METZ - SCCV VILLA 8',
 'SCCV VILLA 8 ASFELD','cli_024','2026-02-18',11,'active',
 '["ECHAF","ENDUIT"]','',               'df_u001'),

('xls_p041','REHON - CONSTR 16 LOGMT',
 'IDEA CONSTRUCTION','cli_012','2026-02-24',8,'active',
 '["ECHAF","ENDUIT"]','',               'df_u001'),

('xls_p042','PAVILLON NICOLAS ROMEO - MAISON INDIVIDUELLE',
 'CONCEPT IMMO','cli_025','2026-03-01',14,'active',
 NULL,'SUR CONVOC',                     'df_u001'),

('xls_p043','RE40 - CONSTR DE 40 LOGEMENTS A ALGRANGE',
 'MAGNUM IMMO - SERGE FINANCES','cli_028','2026-03-01',5,'active',
 '["ECHAF","ITE"]','Mercredi 10h30',    'df_u001'),

('xls_p044','REHA 6 LOGTS - SEM EMH',
 'SEM EMH','cli_002','2026-03-02',16,'active',
 '["ECHAF","ITE"]','Mardi 9h',          'df_u001'),

('xls_p045','REDANGE - PARTIE SOCIALE',
 'DELTA PROMOTION - SNC ECORED','cli_030','2026-03-03',23,'active',
 '["ECHAF","ITE"]','Mercredi 10h',      'df_u001'),

('xls_p046','REDANGE - 3 COLLECTIFS BAT A - B1 ET B2',
 'DELTA PROMOTION - SNC ECORED','cli_030','2026-03-15',21,'active',
 '["ECHAF","ITE"]','Mercredi 9h',       'df_u001'),

('xls_p047','LES RIVES D''AUSTRA - NANCY RIVES DE MEURTHE',
 'KAUFMAN ET BROAD','cli_026','2026-03-20',41,'active',
 '["ECHAF","ENDUIT"]','Jeudi 9h30',     'df_u001'),

('xls_p048','SCCV FAUCONNET',
 'CONCEPT IMMO','cli_025','2026-03-10',21,'active',
 '["ECHAF","ENDUIT","LASURE"]','Jeudi 11h','df_u001'),

('xls_p049','CENTRALANGE - 45 LOGMT - TALANGE',
 'NOVA HOMES','cli_006','2026-03-15',5,'active',
 NULL,'',                               'df_u001'),

('xls_p050','ITE COPRO CLOUANGE',
 'KATSIKAS','cli_029','2026-04-01',22,'active',
 '["ITE"]','',                          'df_u001'),

('xls_p051','RAVALEMENT COPRO NILVANGE',
 'KATSIKAS','cli_029','2026-04-01',31,'active',
 '["RAVALEMENT"]','',                   'df_u001'),

('xls_p052','LES BERGES DE NEPTUNE - 39 LOGTS',
 'CONCEPT IMMO','cli_025','2026-04-02',13,'active',
 '["ECHAF"]','Mardi 14h',               'df_u001'),

('xls_p053','DOMAINE DU VERGER - RAVALEMENT LOT 19',
 'STRADIM','cli_013','2026-04-07',6,'active',
 '["RAVALEMENT"]','Mercredi 11h',       'df_u001'),

('xls_p054','VILLERUPT - CONSTR 42 LOGMT',
 'IDEA CONSTRUCTION','cli_012','2026-05-02',18,'active',
 '["ECHAF","ENDUIT"]','',               'df_u001'),

('xls_p055','RENOVATION AGENCE BANCAIRE - CREDIT MUTUEL',
 'CREDIT MUTUEL','cli_038','2026-06-01',6,'active',
 '["ENDUIT","BARDAGE"]','',             'df_u001'),

('xls_p056','JARDIN DES LYS - 15 LOGTS',
 'CONCEPT IMMO','cli_025','2026-06-03',36,'active',
 NULL,'',                               'df_u001'),

('xls_p057','STUDIO 166 - 166 LOGTS ETUDIANTS',
 'KAUFMAN ET BROAD','cli_026','2026-07-01',22,'active',
 '["ECHAF","ITE"]','',                  'df_u001'),

('xls_p058','8 LOGTS COLLECTIFS - SCI BRUNO',
 'SCI BRUNO','cli_037','2026-07-01',16,'active',
 NULL,'',                               'df_u001'),

('xls_p059','CENTRALIA - 37 LOGTS COLL A UCKANGE',
 'IMMOBILIERE GEORGES','cli_034','2026-08-01',9,'active',
 NULL,'',                               'df_u001'),

('xls_p060','RESIDENCE UNIVERSITAIRE 121 STUDIOS - ALL SUITE STUDY',
 'GROUPE PICHET - I2C','cli_035','2026-08-20',29,'active',
 NULL,'',                               'df_u001'),

('xls_p061','LES MELIADES - 130 LOGTS A METZ',
 'ICADE PROMOTION - SNC IP1R','cli_036','2026-09-01',33,'active',
 '["ECHAF","RAVALEMENT","BARDAGE"]','Lundi 14h30','df_u001'),

('xls_p062','36 LOGTS COLLECTIFS A METZ GAB',
 'VIVEST','cli_004','2026-10-26',8,'active',
 '["ECHAF"]','Jeudi 11h',               'df_u001'),

('xls_p063','RESIDENCE DU CREVE COEUR - 25 LOGTS',
 'IMMOBILIERE GEORGES','cli_034','2027-03-01',11,'active',
 NULL,'',                               'df_u001'),

('xls_p064','EHPAD PIERRE HERMENT',
 'FONTION BOMPARD - DM INGENIERIE','cli_031','2026-03-15',36,'active',
 '["ECHAF"]','Lundi 14h',               'df_u001'),

('xls_p074','ANDRE MALRAUX A METZ - MURET / ZINGUERIE / MUR MITOYEN',
 'MARTEL IMMO','cli_016','2026-02-16',5,'active',
 NULL,'Mardi 9h',                       'df_u001'),

('xls_p075','AMELIORATION ENERGETIQUE MATERNELLE - RODEMACK',
 'COMMUNE DE RODEMACK','cli_043','2026-04-25',6,'active',
 NULL,'',                               'df_u001'),

('xls_p078','ITE COPRO 7 RUE DE BELGRADE - MONTIGNY',
 'KATSIKAS','cli_029','2026-04-15',11,'active',
 '["ITE"]','',                          'df_u001'),

-- ── CHANTIERS EN ATTENTE (draft, sans dates confirmées) ─────────────────────
('xls_p065','RESIDENCE JEUNES ACTIFS - 33 LOGTS A AMNEVILLE',
 'GROUPE HABITER','cli_033',NULL,NULL,'draft',
 NULL,'Mardi 8h30',                     'df_u001'),

('xls_p066','CENTRAL PARC - 27 LOGTS A MONTIGNY LES METZ',
 'GROUPE HABITER','cli_033',NULL,NULL,'draft',
 NULL,'',                               'df_u001'),

('xls_p067','267 - 37 LOGTS COLLECTIFS BAT AULNE',
 'GROUPE HABITER','cli_033',NULL,NULL,'draft',
 NULL,'',                               'df_u001'),

('xls_p068','266 - 4 BAT + 148 PLACES STATIONNEMENTS - FACADE PIERRE',
 'GROUPE HABITER','cli_033',NULL,NULL,'draft',
 NULL,'',                               'df_u001'),

('xls_p069','268 - 42 LOGTS BAT B GAIA',
 'GROUPE HABITER','cli_033',NULL,NULL,'draft',
 NULL,'',                               'df_u001'),

('xls_p070','270 - 43 LOGTS BAT D DOUGLAS',
 'GROUPE HABITER','cli_033',NULL,NULL,'draft',
 '["BARDAGE"]','',                      'df_u001'),

('xls_p071','M2 PROMO - 29 LOGTS A VITRY SUR ORNE',
 'M2 PROMOTION - LMO','cli_041',NULL,NULL,'draft',
 NULL,'Jeudi 10h',                      'df_u001'),

('xls_p072','RSS48 - 48 LOGEMENTS A ALGRANGE',
 'MAGNUM IMMO - SERGE FINANCES','cli_028',NULL,NULL,'draft',
 '["ECHAF","ENDUIT"]','Mercredi 10h30', 'df_u001'),

('xls_p073','ATELIERS MUNICIPAUX - MAIRIE DE PELTRE',
 'MAIRIE DE PELTRE','cli_042',NULL,NULL,'draft',
 NULL,'',                               'df_u001'),

('xls_p076','HUSSIGNY - CONSTR 18 LOGMT',
 'IDEA CONSTRUCTION','cli_012',NULL,NULL,'draft',
 '["ECHAF","ENDUIT"]','',               'df_u001'),

('xls_p077','10 LOGEMENTS SENIORS SEM EMH',
 'SEM EMH','cli_002',NULL,NULL,'draft',
 NULL,'',                               'df_u001');

-- Mise à jour du champ updated_at (car DEFAULT ne s'applique qu'à l'insert)
UPDATE projects SET updated_at = datetime('now') WHERE id LIKE 'xls_p%';
