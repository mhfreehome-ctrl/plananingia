export interface SiretResult {
  nom: string
  activite: string   // ex: "43.99B"
  etat: 'A' | 'C' | string  // A = actif, C = cessé
  adresse: string
  siret: string
}

/**
 * Lookup d'un numéro SIRET (14 chiffres) ou SIREN (9 chiffres)
 * via l'API publique recherche-entreprises.api.gouv.fr — gratuite, no-auth, CORS OK.
 *
 * Fallback sur l'ancienne API annuaire-entreprises si la première échoue.
 */
export async function lookupSiret(siret: string): Promise<SiretResult | null> {
  const clean = siret.replace(/[\s.-]/g, '')
  if (clean.length < 9) return null

  // ── Tentative 1 : recherche-entreprises.api.gouv.fr (endpoint officiel actif)
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
        return {
          nom: e.nom_complet ?? e.nom_raison_sociale ?? '',
          activite: e.activite_principale ?? siege.activite_principale ?? '',
          etat: e.etat_administratif ?? siege.etat_administratif ?? 'A',
          adresse: siege.adresse ?? '',
          siret: siege.siret ?? clean,
        }
      }
    }
  } catch { /* fallback */ }

  // ── Fallback : ancienne API annuaire-entreprises (peut être indisponible)
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
    const libelleNaf = d.libelle_activite_principale ?? siege.libelle_activite_principale ?? ''
    const activite = libelleNaf ? `${codeNaf} — ${libelleNaf}` : codeNaf
    return {
      nom: nomComplet,
      activite,
      etat: d.etat_administratif ?? siege.etat_administratif ?? 'A',
      adresse: siege.adresse ?? '',
      siret: siege.siret ?? clean,
    }
  } catch {
    return null
  }
}
