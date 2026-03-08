-- Migration 0018 : Tables plateforme super-admin
-- lot_templates : modèles de lots pour la génération IA (BTP + Facade)
-- lot_template_deps : dépendances entre lots templates
-- platform_menu_config : ordre et libellés du menu de navigation

-- ─────────────────────────────────────────────────────────────
-- 1. Modèles de lots
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lot_templates (
  id            TEXT PRIMARY KEY,
  catalog_type  TEXT NOT NULL DEFAULT 'btp',  -- 'btp' | 'facade'
  code          TEXT NOT NULL,
  name          TEXT NOT NULL,
  name_tr       TEXT,
  duration_days INTEGER NOT NULL DEFAULT 10,
  color         TEXT NOT NULL DEFAULT '#6B7280',
  zone          TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  lot_types     TEXT,         -- JSON array ['ITE','ECHAF'...] filtrage facade
  parent_code   TEXT,         -- sous-lot facade
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),
  UNIQUE(catalog_type, code)
);

-- ─────────────────────────────────────────────────────────────
-- 2. Dépendances templates
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lot_template_deps (
  id            TEXT PRIMARY KEY,
  catalog_type  TEXT NOT NULL DEFAULT 'btp',
  pred_code     TEXT NOT NULL,
  succ_code     TEXT NOT NULL,
  dep_type      TEXT NOT NULL DEFAULT 'FS',
  lag_days      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now')),
  UNIQUE(catalog_type, pred_code, succ_code)
);

-- ─────────────────────────────────────────────────────────────
-- 3. Config menu navigation
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_menu_config (
  id         TEXT PRIMARY KEY,
  key        TEXT NOT NULL UNIQUE,
  label_fr   TEXT NOT NULL,
  label_tr   TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1,
  icon_name  TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────
-- 4. Seed : lots BTP
-- ─────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO lot_templates (id, catalog_type, code, name, name_tr, duration_days, color, zone, sort_order) VALUES
('lt_b01', 'btp', 'L01', 'VRD / Terrassement',         'Altyapı / Hafriyat',         15, '#8B4513', 'Extérieur',    1),
('lt_b02', 'btp', 'L02', 'Gros Œuvre / Fondations',    'Kaba Yapı / Temel',          45, '#696969', 'Tous niveaux', 2),
('lt_b03', 'btp', 'L03', 'Charpente / Ossature',       'Çatı Çerçevesi / Taşıyıcı',  20, '#8B6914', 'Toiture',      3),
('lt_b04', 'btp', 'L04', 'Couverture / Étanchéité',    'Çatı Örtüsü / Su Yalıtımı',  15, '#2F4F4F', 'Toiture',      4),
('lt_b05', 'btp', 'L05', 'Menuiseries Extérieures',    'Dış Doğramalar',             12, '#4169E1', 'Façades',      5),
('lt_b06', 'btp', 'L06', 'Ravalement / Façade',        'Cephe / Sıva',               20, '#FF8C00', 'Façades',      6),
('lt_b07', 'btp', 'L07', 'Électricité 1er œuvre',      'Elektrik 1. İmalat',         15, '#FFD700', 'Tous niveaux', 7),
('lt_b08', 'btp', 'L08', 'Plomberie 1er œuvre',        'Sıhhi Tesisat 1. İmalat',    12, '#00CED1', 'Tous niveaux', 8),
('lt_b09', 'btp', 'L09', 'CVC / Chauffage 1er œuvre',  'ISITMA / Klima 1. İmalat',   15, '#FF4500', 'Tous niveaux', 9),
('lt_b10', 'btp', 'L10', 'Cloisonnement / Plâtrerie',  'Bölme / Sıva',               25, '#DEB887', 'Tous niveaux', 10),
('lt_b11', 'btp', 'L11', 'Isolation Thermique',        'Isı Yalıtımı',               10, '#90EE90', 'Tous niveaux', 11),
('lt_b12', 'btp', 'L12', 'Électricité 2nd œuvre',      'Elektrik 2. İmalat',         10, '#DAA520', 'Tous niveaux', 12),
('lt_b13', 'btp', 'L13', 'Plomberie 2nd œuvre',        'Sıhhi Tesisat 2. İmalat',    8,  '#20B2AA', 'Tous niveaux', 13),
('lt_b14', 'btp', 'L14', 'Carrelage / Revêtements',    'Döşeme / Kaplama',           15, '#CD853F', 'Tous niveaux', 14),
('lt_b15', 'btp', 'L15', 'Peinture / Finitions',       'Boya / Finishing',           15, '#FFB6C1', 'Tous niveaux', 15);

-- ─────────────────────────────────────────────────────────────
-- 5. Seed : dépendances BTP
-- ─────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO lot_template_deps (id, catalog_type, pred_code, succ_code, dep_type, lag_days) VALUES
('ltd_b01', 'btp', 'L01', 'L02', 'FS', 0),
('ltd_b02', 'btp', 'L02', 'L03', 'FS', 0),
('ltd_b03', 'btp', 'L03', 'L04', 'FS', 0),
('ltd_b04', 'btp', 'L04', 'L05', 'SS', 5),
('ltd_b05', 'btp', 'L05', 'L06', 'FS', 0),
('ltd_b06', 'btp', 'L02', 'L07', 'FS', 2),
('ltd_b07', 'btp', 'L02', 'L08', 'FS', 2),
('ltd_b08', 'btp', 'L02', 'L09', 'FS', 2),
('ltd_b09', 'btp', 'L07', 'L10', 'FS', 0),
('ltd_b10', 'btp', 'L08', 'L10', 'FS', 0),
('ltd_b11', 'btp', 'L09', 'L10', 'FS', 0),
('ltd_b12', 'btp', 'L07', 'L08', 'SS', 0),
('ltd_b13', 'btp', 'L07', 'L09', 'SS', 0),
('ltd_b14', 'btp', 'L10', 'L11', 'SS', 10),
('ltd_b15', 'btp', 'L10', 'L12', 'FS', 0),
('ltd_b16', 'btp', 'L10', 'L13', 'FS', 0),
('ltd_b17', 'btp', 'L10', 'L14', 'FS', 0),
('ltd_b18', 'btp', 'L14', 'L15', 'SS', 8);

-- ─────────────────────────────────────────────────────────────
-- 6. Seed : lots Facade
-- ─────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO lot_templates (id, catalog_type, code, name, duration_days, color, sort_order, lot_types, parent_code) VALUES
('lt_f01', 'facade', 'EC00', 'Installation échafaudage',       5,  '#6B7280', 1,  '["ECHAF"]',      NULL),
('lt_f02', 'facade', 'IT10', 'ITE — Préparation supports',     5,  '#1D4ED8', 10, '["ITE"]',        NULL),
('lt_f03', 'facade', 'IT11', 'Pose isolant',                   21, '#3B82F6', 11, '["ITE"]',        'IT10'),
('lt_f04', 'facade', 'IT12', 'Enduit de finition ITE',         14, '#60A5FA', 12, '["ITE"]',        'IT10'),
('lt_f05', 'facade', 'EN20', 'Enduit — Préparation supports',  3,  '#92400E', 20, '["ENDUIT"]',     NULL),
('lt_f06', 'facade', 'EN21', 'Application enduit projeté',     14, '#D97706', 21, '["ENDUIT"]',     'EN20'),
('lt_f07', 'facade', 'EN22', 'Finitions / lissage',            7,  '#FCD34D', 22, '["ENDUIT"]',     'EN20'),
('lt_f08', 'facade', 'BA30', 'Bardage — Ossature',             14, '#065F46', 30, '["BARDAGE"]',    NULL),
('lt_f09', 'facade', 'BA31', 'Pose parement bardage',          21, '#10B981', 31, '["BARDAGE"]',    'BA30'),
('lt_f10', 'facade', 'LA40', 'Lasure / Hydrofuge',             5,  '#7C3AED', 40, '["LASURE"]',     NULL),
('lt_f11', 'facade', 'RA50', 'Ravalement — Nettoyage/décapage',5,  '#9F1239', 50, '["RAVALEMENT"]', NULL),
('lt_f12', 'facade', 'RA51', 'Réparations / rebouchage',       10, '#E11D48', 51, '["RAVALEMENT"]', 'RA50'),
('lt_f13', 'facade', 'RA52', 'Finition ravalement',            7,  '#F43F5E', 52, '["RAVALEMENT"]', 'RA50'),
('lt_f14', 'facade', 'EC99', 'Dépose échafaudage',             3,  '#4B5563', 99, '["ECHAF"]',      NULL);

-- ─────────────────────────────────────────────────────────────
-- 7. Seed : dépendances Facade
-- ─────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO lot_template_deps (id, catalog_type, pred_code, succ_code, dep_type, lag_days) VALUES
('ltd_f01', 'facade', 'EC00', 'IT10', 'FS', 0),
('ltd_f02', 'facade', 'EC00', 'EN20', 'FS', 0),
('ltd_f03', 'facade', 'EC00', 'BA30', 'FS', 0),
('ltd_f04', 'facade', 'EC00', 'RA50', 'FS', 0),
('ltd_f05', 'facade', 'IT10', 'IT11', 'FS', 0),
('ltd_f06', 'facade', 'IT11', 'IT12', 'FS', 2),
('ltd_f07', 'facade', 'EN20', 'EN21', 'FS', 0),
('ltd_f08', 'facade', 'EN21', 'EN22', 'FS', 2),
('ltd_f09', 'facade', 'BA30', 'BA31', 'FS', 0),
('ltd_f10', 'facade', 'RA50', 'RA51', 'FS', 0),
('ltd_f11', 'facade', 'RA51', 'RA52', 'FS', 0),
('ltd_f12', 'facade', 'IT12', 'LA40', 'FS', 3),
('ltd_f13', 'facade', 'EN22', 'LA40', 'FS', 3),
('ltd_f14', 'facade', 'RA52', 'LA40', 'FS', 3),
('ltd_f15', 'facade', 'IT12', 'EC99', 'FS', 0),
('ltd_f16', 'facade', 'EN22', 'EC99', 'FS', 0),
('ltd_f17', 'facade', 'BA31', 'EC99', 'FS', 0),
('ltd_f18', 'facade', 'LA40', 'EC99', 'FS', 0),
('ltd_f19', 'facade', 'RA52', 'EC99', 'FS', 0);

-- ─────────────────────────────────────────────────────────────
-- 8. Seed : config menu
-- ─────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO platform_menu_config (id, key, label_fr, label_tr, sort_order, is_visible, icon_name) VALUES
('menu_01', 'dashboard', 'Tableau de bord', 'Özet',          1, 1, 'house'),
('menu_02', 'projects',  'Chantiers',       'Şantiyeler',    2, 1, 'folder'),
('menu_03', 'clients',   'Clients',         'Müşteriler',    3, 1, 'people'),
('menu_04', 'planning',  'Planning global', 'Genel Planlama',4, 1, 'calendar'),
('menu_05', 'users',     'Utilisateurs',    'Kullanıcılar',  5, 1, 'users'),
('menu_06', 'teams',     'Équipes',         'Takımlar',      6, 1, 'team'),
('menu_07', 'company',   'Mon entreprise',  'Şirketim',      7, 1, 'building');
