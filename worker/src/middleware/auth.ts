import { Context, Next } from 'hono'
import { verifyJWT } from '../utils/jwt'
import type { Env, JWTPayload } from '../types'

declare module 'hono' {
  interface ContextVariableMap {
    user: JWTPayload
  }
}

export async function requireAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)
  const token = auth.slice(7)
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: 'Invalid or expired token' }, 401)
  c.set('user', payload)
  await next()
}

export async function requireAdmin(c: Context<{ Bindings: Env }>, next: Next) {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)
  const token = auth.slice(7)
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: 'Invalid or expired token' }, 401)
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  c.set('user', payload)
  await next()
}

// requireWrite : admin + editeur + conducteur (bloque salarie)
export async function requireWrite(c: Context<{ Bindings: Env }>, next: Next) {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)
  const token = auth.slice(7)
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: 'Invalid or expired token' }, 401)
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  if (payload.access_level === 'salarie') return c.json({ error: 'Accès lecture seule' }, 403)
  c.set('user', payload)
  await next()
}

// requireEditeur : admin + editeur seulement (bloque conducteur + salarie)
export async function requireEditeur(c: Context<{ Bindings: Env }>, next: Next) {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)
  const token = auth.slice(7)
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: 'Invalid or expired token' }, 401)
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  if (!['admin', 'editeur'].includes(payload.access_level)) return c.json({ error: 'Droits insuffisants' }, 403)
  c.set('user', payload)
  await next()
}

// requireFullAdmin : uniquement access_level = 'admin'
export async function requireFullAdmin(c: Context<{ Bindings: Env }>, next: Next) {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)
  const token = auth.slice(7)
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: 'Invalid or expired token' }, 401)
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  if (payload.access_level !== 'admin') return c.json({ error: 'Réservé aux administrateurs' }, 403)
  c.set('user', payload)
  await next()
}

// requireSuperAdmin : uniquement l'admin PlanningIA (company_id IS NULL + access_level='admin')
export async function requireSuperAdmin(c: Context<{ Bindings: Env }>, next: Next) {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)
  const token = auth.slice(7)
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: 'Invalid or expired token' }, 401)
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  if (payload.access_level !== 'admin') return c.json({ error: 'Réservé aux super-administrateurs' }, 403)
  if (payload.company_id !== null) return c.json({ error: 'Réservé à la plateforme PlanningIA' }, 403)
  c.set('user', payload)
  await next()
}
