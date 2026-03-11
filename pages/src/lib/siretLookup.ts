export interface SiretResult {
  nom: string                // Raison sociale
  activite: string           // Code NAF
  metier: string             // Métier déduit du code NAF (BTP-friendly)
  etat: 'A' | 'C' | string  // A = actif, C = cessé
  adresse: string
  siret: string
  gerantPrenom?: string      // Prénom du dirigeant personne physique
  gerantNom?: string         // Nom du dirigeant personne physique
}

// ── Mapping code NAF/APE → Métier BTP (libellés courts et lisibles) ──────────
const NAF_METIERS: Record<string, string> = {
  // Gros œuvre / Structure
  '41.10': 'Promotion immobilière',
  '41.10A': 'Promotion immobilière',
  '41.20': 'Construction bâtiment',
  '41.20A': 'Construction maisons individuelles',
  '41.20B': 'Construction bâtiments',
  '42.11': 'Travaux routiers',
  '42.11Z': 'Travaux routiers',
  '42.21': 'Canalisations',
  '42.21Z': 'Travaux canalisations',
  '43.11': 'Démolition',
  '43.11Z': 'Démolition',
  '43.12': 'Terrassement',
  '43.12A': 'Travaux de terrassement',
  '43.12B': 'Préparation de terrain',
  '43.13': 'Forage et sondage',
  '43.13Z': 'Forage et sondage',
  '43.99': 'Travaux spéciaux',
  '43.99A': 'Étanchéité',
  '43.99B': 'Échafaudage / Structures métalliques',
  '43.99C': 'Maçonnerie générale',
  '43.99D': 'Travaux spéciaux',
  '43.99E': 'Travaux spéciaux',
  // Second œuvre — installations techniques
  '43.21': 'Électricité',
  '43.21A': 'Électricité',
  '43.22': 'Plomberie / Chauffage',
  '43.22A': 'Plomberie',
  '43.22B': 'Chauffage / Climatisation',
  '43.29': 'Isolation / Second œuvre',
  '43.29A': 'Isolation',
  '43.29B': 'Second œuvre',
  // Second œuvre — finitions
  '43.31': 'Plâtrerie',
  '43.31Z': 'Plâtrerie',
  '43.32': 'Menuiserie',
  '43.32A': 'Menuiserie bois',
  '43.32B': 'Menuiserie métallique / Serrurerie',
  '43.33': 'Carrelage / Revêtement',
  '43.33Z': 'Carrelage / Revêtement',
  '43.34': 'Peinture',
  '43.34Z': 'Peinture / Vitrerie',
  '43.39': 'Finitions',
  '43.39Z': 'Autres travaux de finition',
  // Toiture / Charpente
  '43.91': 'Couverture / Charpente',
  '43.91A': 'Travaux de charpente',
  '43.91B': 'Couverture',
  // Façade
  '43.34F': 'Façade',
  // Espaces verts
  '81.30': 'Espaces verts',
  '81.30Z': 'Espaces verts / Paysagisme',
  // Ascenseurs / Équipements
  '33.12': 'Maintenance équipements',
  '33.12Z': 'Réparation équipements',
  '43.29C': 'Menuiserie aluminium / Façade',
  // Études / Maîtrise d'œuvre
  '71.11': "Architecture / Maîtrise d'œuvre",
  '71.11Z': "Architecture / Maîtrise d'œuvre",
  '71.12': "Bureau d'études",
  '71.12B': "Ingénierie / Bureau d'études",
  // Nettoyage
  '81.21': 'Nettoyage',
  '81.21Z': 'Nettoyage de bâtiments',
  // Location matériel
  '77.32': 'Location matériel BTP',
  '77.32Z': 'Location matériel BTP',
}

/**
 * Déduit le métier BTP à partir d'un code NAF.
 * Essaie d'abord la correspondance exacte (ex: "43.99B"),
 * puis le préfixe à 5 chars (ex: "43.99"), puis 4 chars (ex: "43.9").
 */
function nafToMetier(code: string): string {
  if (!code) return ''
  const c = code.trim().toUpperCase()
  return (
    NAF_METIERS[c] ||
    NAF_METIERS[c.slice(0, 5)] ||
    NAF_METIERS[c.slice(0, 4)] ||
    ''
  )
}

/**
 * Lookup d'un numéro SIRET (14 chiffres) ou SIREN (9 chiffres)
 * via l'API publique recherche-entreprises.api.gouv.fr
 * Retourne la raison sociale, le métier déduit, l'adresse,
 * et le prénom/nom du dirigeant personne physique si disponible.
 */
export async function lookupSiret(siret: string): Promise<SiretResult | null> {
  const clean = siret.replace(/[\s.-]/g, '')
  if (clean.length < 9) return null

  // ── Endpoint principal : recherche-entreprises.api.gouv.fr ──────────────────
  try {
    const r = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${clean}&page=1&per_page=1`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (r.ok) {
      const d = await r.json() as any
      const results: any[] = d.results ?? []
      if (results.length > 0) {
        const e = results[0]
        const siege = e.siege ?? {}
        const codeNaf = e.activite_principale ?? siege.activite_principale ?? ''

        // Dirigeant personne physique : Gérant / Président en priorité
        const dirigeants: any[] = e.dirigeants ?? []
        const physique = dirigeants
          .filter((dg: any) => dg.type_dirigeant === 'personne physique')
          .sort((a: any, b: any) => {
            // Gérant > Président > autres
            const prio = (q: string) =>
              q?.toLowerCase().includes('gérant') ? 0
              : q?.toLowerCase().includes('président') ? 1
              : q?.toLowerCase().includes('directeur') ? 2
              : 3
            return prio(a.qualite) - prio(b.qualite)
          })[0]

        const gerantNom    = physique?.nom ?? undefined
        // prenoms peut être "Jean Paul" → on prend le premier prénom
        const gerantPrenom = physique?.prenoms
          ? physique.prenoms.trim().split(/\s+/)[0]
          : undefined

        return {
          nom: e.nom_complet ?? e.nom_raison_sociale ?? '',
          activite: codeNaf,
          metier: nafToMetier(codeNaf),
          etat: e.etat_administratif ?? siege.etat_administratif ?? 'A',
          adresse: siege.adresse ?? '',
          siret: siege.siret ?? clean,
          gerantPrenom,
          gerantNom,
        }
      }
    }
  } catch { /* fallback */ }

  // ── Fallback : annuaire-entreprises.data.gouv.fr (peut être indisponible) ───
  try {
    const r = await fetch(
      `https://api.annuaire-entreprises.data.gouv.fr/V3/entreprise/${clean}`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (!r.ok) return null
    const d = await r.json() as any
    const nomComplet = d.nom_complet
      ?? d.personne_morale_attributs?.raison_sociale
      ?? d.personne_physique_attributs?.nom_complet
      ?? ''
    const siege = d.siege ?? {}
    const codeNaf = d.activite_principale ?? siege.activite_principale ?? ''
    return {
      nom: nomComplet,
      activite: codeNaf,
      metier: nafToMetier(codeNaf),
      etat: d.etat_administratif ?? siege.etat_administratif ?? 'A',
      adresse: siege.adresse ?? '',
      siret: siege.siret ?? clean,
    }
  } catch {
    return null
  }
}
