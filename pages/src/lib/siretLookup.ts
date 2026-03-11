export interface SiretResult {
  nom: string
  activite: string   // ex: "43.99A – Travaux de maçonnerie générale…"
  etat: 'A' | 'C' | string  // A = actif, C = cessé
  adresse: string
  siret: string
}

/**
 * Lookup d'un numéro SIRET (14 chiffres) ou SIREN (9 chiffres)
 * via l'API publique annuaire-entreprises.data.gouv.fr — gratuite, no-auth, CORS OK.
 */
export async function lookupSiret(siret: string): Promise<SiretResult | null> {
  const clean = siret.replace(/[\s.-]/g, '')
  if (clean.length < 9) return null
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
    const adresseParts = [siege.adresse, siege.code_postal, siege.commune].filter(Boolean)
    return {
      nom: nomComplet,
      activite,
      etat: d.etat_administratif ?? siege.etat_administratif ?? 'A',
      adresse: adresseParts.join(', '),
      siret: siege.siret ?? clean,
    }
  } catch {
    return null
  }
}
