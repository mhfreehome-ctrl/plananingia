import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import type { Env } from '../types'

const notifs = new Hono<{ Bindings: Env }>()

notifs.get('/', requireAuth, async (c) => {
  const user = c.get('user')
  const rows = await c.env.DB.prepare(`
    SELECT n.*, p.name as project_name FROM notifications n
    LEFT JOIN projects p ON p.id = n.project_id
    WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 50
  `).bind(user.sub).all()
  return c.json(rows.results)
})

notifs.get('/unread-count', requireAuth, async (c) => {
  const user = c.get('user')
  const row = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0').bind(user.sub).first<any>()
  return c.json({ count: row?.cnt || 0 })
})

notifs.patch('/:id/read', requireAuth, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  await c.env.DB.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?').bind(id, user.sub).run()
  return c.json({ ok: true })
})

notifs.patch('/read-all', requireAuth, async (c) => {
  const user = c.get('user')
  await c.env.DB.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').bind(user.sub).run()
  return c.json({ ok: true })
})

export default notifs
