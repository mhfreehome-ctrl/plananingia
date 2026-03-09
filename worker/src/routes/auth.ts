import { Hono } from 'hono'
import { hashPassword, verifyPassword, generateId, hashToken } from '../utils/crypto'
import { signJWT, verifyJWT } from '../utils/jwt'
import { requireAuth } from '../middleware/auth'
import { sendEmail, htmlPasswordReset } from '../utils/email'
import { checkRateLimit, getClientIp } from '../utils/ratelimit'
import type { Env } from '../types'

const APP_URL = 'https://www.planningia.com'

const auth = new Hono<{ Bindings: Env }>()

const ACCESS_TTL = 15 * 60          // 15 min
const REFRESH_TTL = 30 * 24 * 3600 // 30 days

auth.post('/login', async (c) => {
  const ip = getClientIp(c.req.raw)
  const retry = await checkRateLimit(c.env.KV, `rl:login:${ip}`, 5, 15 * 60 * 1000)
  if (retry !== null) return c.json({ error: 'Too many attempts, try again later', retry_after: retry }, 429)

  const { email, password } = await c.req.json()
  if (!email || !password) return c.json({ error: 'Missing fields' }, 400)

  // JOIN companies pour inclure company_id et company_type dans le JWT
  const user = await c.env.DB.prepare(`
    SELECT u.*, c.type as company_type
    FROM users u
    LEFT JOIN companies c ON c.id = u.company_id
    WHERE u.email = ? AND u.is_active = 1
  `).bind(email.toLowerCase().trim()).first<any>()
  if (!user) return c.json({ error: 'Invalid credentials' }, 401)

  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) return c.json({ error: 'Invalid credentials' }, 401)

  const access = await signJWT({
    sub: user.id, role: user.role, email: user.email,
    company_id: user.company_id || null,
    company_type: user.company_type || null,
    access_level: user.access_level || 'editeur',
  }, c.env.JWT_SECRET, ACCESS_TTL)
  const refreshRaw = generateId()
  const refreshHash = await hashToken(refreshRaw)
  const expiresAt = new Date(Date.now() + REFRESH_TTL * 1000).toISOString()
  await c.env.DB.prepare('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)')
    .bind(generateId(), user.id, refreshHash, expiresAt).run()

  return c.json({
    access_token: access,
    refresh_token: refreshRaw,
    user: {
      id: user.id, email: user.email, role: user.role,
      first_name: user.first_name, last_name: user.last_name,
      company_name: user.company_name, lang: user.lang,
      company_id: user.company_id || null,
      company_type: user.company_type || null,
      access_level: user.access_level || 'editeur',
    }
  })
})

auth.post('/refresh', async (c) => {
  const { refresh_token } = await c.req.json()
  if (!refresh_token) return c.json({ error: 'Missing token' }, 400)

  const tokenHash = await hashToken(refresh_token)
  // JOIN companies pour obtenir company_type lors du refresh
  const stored = await c.env.DB.prepare(`
    SELECT rt.*, u.role, u.email, u.company_id, u.access_level, c.type as company_type
    FROM refresh_tokens rt
    JOIN users u ON u.id = rt.user_id
    LEFT JOIN companies c ON c.id = u.company_id
    WHERE rt.token_hash = ?
  `).bind(tokenHash).first<any>()

  if (!stored || new Date(stored.expires_at) < new Date()) {
    return c.json({ error: 'Invalid or expired refresh token' }, 401)
  }

  await c.env.DB.prepare('DELETE FROM refresh_tokens WHERE id = ?').bind(stored.id).run()
  const newRaw = generateId()
  const newHash = await hashToken(newRaw)
  const expiresAt = new Date(Date.now() + REFRESH_TTL * 1000).toISOString()
  await c.env.DB.prepare('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)')
    .bind(generateId(), stored.user_id, newHash, expiresAt).run()

  const access = await signJWT({
    sub: stored.user_id, role: stored.role, email: stored.email,
    company_id: stored.company_id || null,
    company_type: stored.company_type || null,
    access_level: stored.access_level || 'editeur',
  }, c.env.JWT_SECRET, ACCESS_TTL)
  return c.json({ access_token: access, refresh_token: newRaw })
})

auth.post('/logout', requireAuth, async (c) => {
  const user = c.get('user')
  await c.env.DB.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').bind(user.sub).run()
  return c.json({ ok: true })
})

auth.get('/me', requireAuth, async (c) => {
  const user = c.get('user')
  // JOIN companies pour retourner les infos entreprise avec le profil utilisateur
  const u = await c.env.DB.prepare(`
    SELECT u.id, u.email, u.role, u.user_type, u.first_name, u.last_name,
      u.company_name, u.phone, u.lang, u.company_id, u.access_level,
      c.name as company_display_name, c.type as company_type,
      c.activity as company_activity, c.lot_types as company_lot_types
    FROM users u
    LEFT JOIN companies c ON c.id = u.company_id
    WHERE u.id = ?
  `).bind(user.sub).first<any>()
  if (!u) return c.json({ error: 'Not found' }, 404)
  return c.json(u)
})

auth.put('/profile', requireAuth, async (c) => {
  const user = c.get('user')
  const { first_name, last_name, company_name, phone, lang } = await c.req.json()
  await c.env.DB.prepare(
    'UPDATE users SET first_name=?, last_name=?, company_name=?, phone=?, lang=?, updated_at=datetime(\'now\') WHERE id=?'
  ).bind(first_name, last_name, company_name, phone, lang, user.sub).run()
  return c.json({ ok: true })
})

auth.put('/change-password', requireAuth, async (c) => {
  const user = c.get('user')
  const { current_password, new_password } = await c.req.json()
  const u = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.sub).first<any>()
  if (!u || !await verifyPassword(current_password, u.password_hash)) return c.json({ error: 'Wrong password' }, 400)
  const hash = await hashPassword(new_password)
  await c.env.DB.prepare('UPDATE users SET password_hash=?, updated_at=datetime(\'now\') WHERE id=?').bind(hash, user.sub).run()
  return c.json({ ok: true })
})

// Admin: invite subcontractor — hérite du company_id de l'admin invitant
auth.post('/invite', async (c) => {
  const authH = c.req.header('Authorization')
  if (!authH?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)
  const payload = await verifyJWT(authH.slice(7), c.env.JWT_SECRET)
  if (!payload || payload.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)

  const { email, first_name, last_name, company_name, phone, lang, user_type, access_level } = await c.req.json()
  if (!email) return c.json({ error: 'Email required' }, 400)

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first()
  if (existing) return c.json({ error: 'Email already registered' }, 409)

  const token = generateId()
  const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
  const id = generateId('usr')
  // Hériter du company_id de l'admin pour isoler les utilisateurs par entreprise
  // Les employees (salariés) sont admin, les subcontractors restent subcontractor
  const resolvedUserType = user_type || 'subcontractor'
  const resolvedRole = resolvedUserType === 'employee' ? 'admin' : 'subcontractor'
  await c.env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, role, user_type, first_name, last_name, company_name, phone, lang, access_level, is_active, invite_token, invite_expires_at, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)'
  ).bind(id, email.toLowerCase(), '', resolvedRole, resolvedUserType,
    first_name || null, last_name || null, company_name || null, phone || null,
    lang || 'fr', access_level || 'editeur', token, expires, payload.company_id || null).run()

  return c.json({ ok: true, invite_token: token, user_id: id })
})

// Accept invite: set password
auth.post('/accept-invite', async (c) => {
  const ip = getClientIp(c.req.raw)
  const retry = await checkRateLimit(c.env.KV, `rl:accept-invite:${ip}`, 10, 60 * 60 * 1000)
  if (retry !== null) return c.json({ error: 'Too many attempts, try again later', retry_after: retry }, 429)

  const { token, password } = await c.req.json()
  if (!token || !password) return c.json({ error: 'Missing fields' }, 400)
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE invite_token = ? AND is_active = 0').bind(token).first<any>()
  if (!user || new Date(user.invite_expires_at) < new Date()) return c.json({ error: 'Invalid or expired invite' }, 400)
  const hash = await hashPassword(password)
  await c.env.DB.prepare('UPDATE users SET password_hash=?, is_active=1, invite_token=NULL, invite_expires_at=NULL, updated_at=datetime(\'now\') WHERE id=?')
    .bind(hash, user.id).run()
  return c.json({ ok: true })
})

// POST /api/auth/forgot-password — request password reset email
auth.post('/forgot-password', async (c) => {
  const ip = getClientIp(c.req.raw)
  const retry = await checkRateLimit(c.env.KV, `rl:forgot-password:${ip}`, 3, 60 * 60 * 1000)
  if (retry !== null) return c.json({ error: 'Too many attempts, try again later', retry_after: retry }, 429)

  const { email } = await c.req.json()
  if (!email) return c.json({ error: 'Email required' }, 400)

  const user = await c.env.DB.prepare('SELECT id, first_name, email FROM users WHERE email = ? AND is_active = 1').bind(email.toLowerCase().trim()).first<any>()
  // Always return ok to avoid user enumeration
  if (!user) return c.json({ ok: true })

  // Invalidate old tokens for this user
  await c.env.DB.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').bind(user.id).run()

  const tokenRaw = generateId()
  const tokenHash = await hashToken(tokenRaw)
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString() // 1h

  await c.env.DB.prepare(
    'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(generateId(), user.id, tokenHash, expiresAt).run()

  const resetUrl = `${APP_URL}/reset-password?token=${tokenRaw}`
  await sendEmail(
    c.env.RESEND_API_KEY,
    c.env.RESEND_FROM,
    user.email,
    'Réinitialisation de votre mot de passe PlanningIA',
    htmlPasswordReset({ firstName: user.first_name || '', resetUrl })
  )

  return c.json({ ok: true })
})

// POST /api/auth/reset-password — apply new password with token
auth.post('/reset-password', async (c) => {
  const ip = getClientIp(c.req.raw)
  const retry = await checkRateLimit(c.env.KV, `rl:reset-password:${ip}`, 5, 15 * 60 * 1000)
  if (retry !== null) return c.json({ error: 'Too many attempts, try again later', retry_after: retry }, 429)

  const { token, password } = await c.req.json()
  if (!token || !password) return c.json({ error: 'Missing fields' }, 400)
  if (password.length < 8) return c.json({ error: 'Password too short (min 8 chars)' }, 400)

  const tokenHash = await hashToken(token)
  const stored = await c.env.DB.prepare(
    'SELECT * FROM password_reset_tokens WHERE token_hash = ? AND used = 0'
  ).bind(tokenHash).first<any>()

  if (!stored || new Date(stored.expires_at) < new Date()) {
    return c.json({ error: 'Token invalide ou expiré' }, 400)
  }

  const hash = await hashPassword(password)
  await c.env.DB.prepare(
    `UPDATE users SET password_hash=?, updated_at=datetime('now') WHERE id=?`
  ).bind(hash, stored.user_id).run()
  await c.env.DB.prepare('UPDATE password_reset_tokens SET used=1 WHERE id=?').bind(stored.id).run()

  return c.json({ ok: true })
})

export default auth
