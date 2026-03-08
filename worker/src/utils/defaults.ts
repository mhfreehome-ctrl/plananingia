export const DEFAULT_LOTS = [
  { code: 'L01', name: 'VRD / Terrassement',            name_tr: 'Altyapı / Hafriyat',           duration_days: 15, color: '#8B4513', zone: 'Extérieur',      sort_order: 1  },
  { code: 'L02', name: 'Gros Œuvre / Fondations',       name_tr: 'Kaba Yapı / Temel',            duration_days: 45, color: '#696969', zone: 'Tous niveaux',   sort_order: 2  },
  { code: 'L03', name: 'Charpente / Ossature',          name_tr: 'Çatı Çerçevesi / Taşıyıcı',    duration_days: 20, color: '#8B6914', zone: 'Toiture',        sort_order: 3  },
  { code: 'L04', name: 'Couverture / Étanchéité',       name_tr: 'Çatı Örtüsü / Su Yalıtımı',   duration_days: 15, color: '#2F4F4F', zone: 'Toiture',        sort_order: 4  },
  { code: 'L05', name: 'Menuiseries Extérieures',       name_tr: 'Dış Doğramalar',               duration_days: 12, color: '#4169E1', zone: 'Façades',        sort_order: 5  },
  { code: 'L06', name: 'Ravalement / Façade',           name_tr: 'Cephe / Sıva',                 duration_days: 20, color: '#FF8C00', zone: 'Façades',        sort_order: 6  },
  { code: 'L07', name: 'Électricité 1er œuvre',         name_tr: 'Elektrik 1. İmalat',           duration_days: 15, color: '#FFD700', zone: 'Tous niveaux',   sort_order: 7  },
  { code: 'L08', name: 'Plomberie 1er œuvre',           name_tr: 'Sıhhi Tesisat 1. İmalat',      duration_days: 12, color: '#00CED1', zone: 'Tous niveaux',   sort_order: 8  },
  { code: 'L09', name: 'CVC / Chauffage 1er œuvre',    name_tr: 'ISITMA / Klima 1. İmalat',      duration_days: 15, color: '#FF4500', zone: 'Tous niveaux',   sort_order: 9  },
  { code: 'L10', name: 'Cloisonnement / Plâtrerie',     name_tr: 'Bölme / Sıva',                 duration_days: 25, color: '#DEB887', zone: 'Tous niveaux',   sort_order: 10 },
  { code: 'L11', name: 'Isolation Thermique',           name_tr: 'Isı Yalıtımı',                 duration_days: 10, color: '#90EE90', zone: 'Tous niveaux',   sort_order: 11 },
  { code: 'L12', name: 'Électricité 2nd œuvre',         name_tr: 'Elektrik 2. İmalat',           duration_days: 10, color: '#DAA520', zone: 'Tous niveaux',   sort_order: 12 },
  { code: 'L13', name: 'Plomberie 2nd œuvre',           name_tr: 'Sıhhi Tesisat 2. İmalat',      duration_days: 8,  color: '#20B2AA', zone: 'Tous niveaux',   sort_order: 13 },
  { code: 'L14', name: 'Carrelage / Revêtements',       name_tr: 'Döşeme / Kaplama',             duration_days: 15, color: '#CD853F', zone: 'Tous niveaux',   sort_order: 14 },
  { code: 'L15', name: 'Peinture / Finitions',          name_tr: 'Boya / Finishing',             duration_days: 15, color: '#FFB6C1', zone: 'Tous niveaux',   sort_order: 15 },
]

// type: FS=Finish-Start, SS=Start-Start (co-execution), FF=Finish-Finish
export const DEFAULT_DEPENDENCIES = [
  { pred: 'L01', succ: 'L02', type: 'FS', lag: 0  },
  { pred: 'L02', succ: 'L03', type: 'FS', lag: 0  },  // GO 80% → Charpente
  { pred: 'L03', succ: 'L04', type: 'FS', lag: 0  },
  { pred: 'L04', succ: 'L05', type: 'SS', lag: 5  },  // co-exec: Menuiseries dès couverture 50%
  { pred: 'L05', succ: 'L06', type: 'FS', lag: 0  },
  { pred: 'L02', succ: 'L07', type: 'FS', lag: 2  },  // Elec 1er oeuvre après GO
  { pred: 'L02', succ: 'L08', type: 'FS', lag: 2  },  // Plomberie 1er oeuvre après GO
  { pred: 'L02', succ: 'L09', type: 'FS', lag: 2  },  // CVC 1er oeuvre après GO
  { pred: 'L07', succ: 'L10', type: 'FS', lag: 0  },  // Cloisonnement après Elec+Plomb+CVC
  { pred: 'L08', succ: 'L10', type: 'FS', lag: 0  },
  { pred: 'L09', succ: 'L10', type: 'FS', lag: 0  },
  { pred: 'L07', succ: 'L08', type: 'SS', lag: 0  },  // co-exec L07 + L08
  { pred: 'L07', succ: 'L09', type: 'SS', lag: 0  },  // co-exec L07 + L09
  { pred: 'L10', succ: 'L11', type: 'SS', lag: 10 },  // Isolation après 40% cloisonnement
  { pred: 'L10', succ: 'L12', type: 'FS', lag: 0  },
  { pred: 'L10', succ: 'L13', type: 'FS', lag: 0  },
  { pred: 'L10', succ: 'L14', type: 'FS', lag: 0  },
  { pred: 'L14', succ: 'L15', type: 'SS', lag: 8  },  // Peinture commence avant fin carrelage
]

// ─────────────────────────────────────────────────────────────
// DESIGN FACADES — Lots et dépendances façade
// Calqué sur le planning Excel réel de la société
// ─────────────────────────────────────────────────────────────

// Labels des 6 types de lots façade
export const FACADE_LOT_TYPE_NAMES: Record<string, string> = {
  ECHAF:      'Échafaudage',
  ITE:        'ITE (Isolation Thermique Extérieure)',
  ENDUIT:     'Enduit projeté',
  BARDAGE:    'Bardage',
  LASURE:     'Lasure / Hydrofuge',
  RAVALEMENT: 'Ravalement',
}

// lot_types: filtre — le lot n'est créé que si le projet inclut ce type
export const FACADE_LOTS: Array<{
  code: string
  name: string
  parent_code: string | null
  duration_days: number
  color: string
  sort_order: number
  lot_types: string[]  // types requis (non-vide = filtre actif)
}> = [
  // ── Échafaudage (ECHAF) ───────────────────────────────────────
  { code: 'EC00', name: 'Installation échafaudage',     parent_code: null,   duration_days: 5,  color: '#6B7280', sort_order: 1,  lot_types: ['ECHAF'] },

  // ── ITE — Isolation Thermique Extérieure ─────────────────────
  { code: 'IT10', name: 'ITE — Préparation supports',   parent_code: null,   duration_days: 5,  color: '#1D4ED8', sort_order: 10, lot_types: ['ITE'] },
  { code: 'IT11', name: 'Pose isolant',                  parent_code: 'IT10', duration_days: 21, color: '#3B82F6', sort_order: 11, lot_types: ['ITE'] },
  { code: 'IT12', name: 'Enduit de finition ITE',        parent_code: 'IT10', duration_days: 14, color: '#60A5FA', sort_order: 12, lot_types: ['ITE'] },

  // ── Enduit projeté (ENDUIT) ───────────────────────────────────
  { code: 'EN20', name: 'Enduit — Préparation supports', parent_code: null,   duration_days: 3,  color: '#92400E', sort_order: 20, lot_types: ['ENDUIT'] },
  { code: 'EN21', name: 'Application enduit projeté',    parent_code: 'EN20', duration_days: 14, color: '#D97706', sort_order: 21, lot_types: ['ENDUIT'] },
  { code: 'EN22', name: 'Finitions / lissage',           parent_code: 'EN20', duration_days: 7,  color: '#FCD34D', sort_order: 22, lot_types: ['ENDUIT'] },

  // ── Bardage (BARDAGE) ─────────────────────────────────────────
  { code: 'BA30', name: 'Bardage — Ossature',            parent_code: null,   duration_days: 14, color: '#065F46', sort_order: 30, lot_types: ['BARDAGE'] },
  { code: 'BA31', name: 'Pose parement bardage',         parent_code: 'BA30', duration_days: 21, color: '#10B981', sort_order: 31, lot_types: ['BARDAGE'] },

  // ── Lasure / Hydrofuge (LASURE) ───────────────────────────────
  { code: 'LA40', name: 'Lasure / Hydrofuge',            parent_code: null,   duration_days: 5,  color: '#7C3AED', sort_order: 40, lot_types: ['LASURE'] },

  // ── Ravalement (RAVALEMENT) ───────────────────────────────────
  { code: 'RA50', name: 'Ravalement — Nettoyage/décapage', parent_code: null,   duration_days: 5,  color: '#9F1239', sort_order: 50, lot_types: ['RAVALEMENT'] },
  { code: 'RA51', name: 'Réparations / rebouchage',        parent_code: 'RA50', duration_days: 10, color: '#E11D48', sort_order: 51, lot_types: ['RAVALEMENT'] },
  { code: 'RA52', name: 'Finition ravalement',             parent_code: 'RA50', duration_days: 7,  color: '#F43F5E', sort_order: 52, lot_types: ['RAVALEMENT'] },

  // ── Dépose échafaudage ────────────────────────────────────────
  { code: 'EC99', name: 'Dépose échafaudage',            parent_code: null,   duration_days: 3,  color: '#4B5563', sort_order: 99, lot_types: ['ECHAF'] },
]

// Dépendances entre lots façade (filtrées par lots actifs dans le worker)
export const FACADE_DEPENDENCIES = [
  // Installation échafaudage → début de chaque prestation
  { pred: 'EC00', succ: 'IT10', type: 'FS', lag: 0 },
  { pred: 'EC00', succ: 'EN20', type: 'FS', lag: 0 },
  { pred: 'EC00', succ: 'BA30', type: 'FS', lag: 0 },
  { pred: 'EC00', succ: 'RA50', type: 'FS', lag: 0 },
  // Séquence ITE
  { pred: 'IT10', succ: 'IT11', type: 'FS', lag: 0 },
  { pred: 'IT11', succ: 'IT12', type: 'FS', lag: 2 },  // séchage colle
  // Séquence Enduit
  { pred: 'EN20', succ: 'EN21', type: 'FS', lag: 0 },
  { pred: 'EN21', succ: 'EN22', type: 'FS', lag: 2 },  // séchage enduit
  // Séquence Bardage
  { pred: 'BA30', succ: 'BA31', type: 'FS', lag: 0 },
  // Séquence Ravalement
  { pred: 'RA50', succ: 'RA51', type: 'FS', lag: 0 },
  { pred: 'RA51', succ: 'RA52', type: 'FS', lag: 0 },
  // Lasure après finitions (séchage 3j min)
  { pred: 'IT12', succ: 'LA40', type: 'FS', lag: 3 },
  { pred: 'EN22', succ: 'LA40', type: 'FS', lag: 3 },
  { pred: 'RA52', succ: 'LA40', type: 'FS', lag: 3 },
  // Dépose échafaudage après tous les travaux finis
  { pred: 'IT12', succ: 'EC99', type: 'FS', lag: 0 },
  { pred: 'EN22', succ: 'EC99', type: 'FS', lag: 0 },
  { pred: 'BA31', succ: 'EC99', type: 'FS', lag: 0 },
  { pred: 'LA40', succ: 'EC99', type: 'FS', lag: 0 },
  { pred: 'RA52', succ: 'EC99', type: 'FS', lag: 0 },
]

// Jalons automatiques pour projets façade
// offset_start: jours depuis start_date | offset_end: jours depuis fin (duration_weeks*7)
export const FACADE_MILESTONES: Array<{
  name: string
  offset_start?: number
  offset_end?: number
  color: string
}> = [
  { name: 'Signature du marché',     offset_start: -14, color: '#10b981' },
  { name: 'Livraison échafaudage',   offset_start: 0,   color: '#f59e0b' },
  { name: 'Enlèvement échafaudage',  offset_end:   -7,  color: '#f97316' },
  { name: 'Réception chantier',      offset_end:   0,   color: '#ef4444' },
]
