import { Context, Next } from 'hono'
import { verifyJWT } from '../utils/jwt'
import type { Env, JWTPayload } from '../types'

declare module 'hono' {
  interface ContextVariableMap {
    user: JWTPayload
  }
}

// Helper partagé : vérifie le JWT et retourne le payload, ou null si invalide
async function getVerifiedPayload(c: Context<{ Bindings: Env }>): Promise<JWTPayload | null> {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return verifyJWT(auth.slice(7), c.env.JWT_SECRET)
}

// Tout utilisateur authentifié (admin ou subcontractor)
export async function requireAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const payload = await getVerifiedPayload(c)
  if (!payload) return c.json({ error: 'Unauthorized' }, 401)
  c.set('user', payload)
  await next()
}

// role = 'admin' (tous access_levels)
export async function requireAdmin(c: Context<{ Bindings: Env }>, next: Next) {
  const payload = await getVerifiedPayload(c)
  if (!payload) return c.json({ error: 'Unauthorized' }, 401)
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  c.set('user', payload)
  await next()
}

// role = 'admin' + access_level IN ('admin', 'editeur', 'conducteur') — bloque 'salarie'
export async function requireWrite(c: Context<{ Bindings: Env }>, next: Next) {
  const payload = await getVerifiedPayload(c)
  if (!payload) return c.json({ error: 'Unauthorized' }, 401)
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  if (payload.access_level === 'salarie') return c.json({ error: 'Accès lecture seule' }, 403)
  c.set('user', payload)
  await next()
}

// role = 'admin' + access_level IN ('admin', 'editeur') — bloque 'conducteur' et 'salarie'
export async function requireEditeur(c: Context<{ Bindings: Env }>, next: Next) {
  const payload = await getVerifiedPayload(c)
  if (!payload) return c.json({ error: 'Unauthorized' }, 401)
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  if (!['admin', 'editeur'].includes(payload.access_level)) return c.json({ error: 'Droits insuffisants' }, 403)
  c.set('user', payload)
  await next()
}

// role = 'admin' + access_level = 'admin' uniquement
export async function requireFullAdmin(c: Context<{ Bindings: Env }>, next: Next) {
  const payload = await getVerifiedPayload(c)
  if (!payload) return c.json({ error: 'Unauthorized' }, 401)
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  if (payload.access_level !== 'admin') return c.json({ error: 'Réservé aux administrateurs' }, 403)
  c.set('user', payload)
  await next()
}

// role = 'admin' + access_level = 'admin' + company_id IS NULL (super-admin PlanningIA)
export async function requireSuperAdmin(c: Context<{ Bindings: Env }>, next: Next) {
  const payload = await getVerifiedPayload(c)
  if (!payload) return c.json({ error: 'Unauthorized' }, 401)
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  if (payload.access_level !== 'admin') return c.json({ error: 'Réservé aux super-administrateurs' }, 403)
  if (payload.company_id !== null) return c.json({ error: 'Réservé à la plateforme PlanningIA' }, 403)
  c.set('user', payload)
  await next()
}
