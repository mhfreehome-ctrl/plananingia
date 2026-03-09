import type { KVNamespace } from '@cloudflare/workers-types'

interface RateLimitEntry {
  count: number
  resetAt: number // Unix ms
}

/**
 * Sliding window rate limiter backed by Cloudflare KV.
 * Returns null if allowed, or seconds-until-reset if blocked.
 */
export async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowMs: number,
): Promise<number | null> {
  const now = Date.now()
  const raw = await kv.get(key)
  let entry: RateLimitEntry

  if (!raw) {
    entry = { count: 1, resetAt: now + windowMs }
    await kv.put(key, JSON.stringify(entry), { expirationTtl: Math.ceil(windowMs / 1000) })
    return null
  }

  entry = JSON.parse(raw) as RateLimitEntry

  if (now > entry.resetAt) {
    // Window expired — reset
    entry = { count: 1, resetAt: now + windowMs }
    await kv.put(key, JSON.stringify(entry), { expirationTtl: Math.ceil(windowMs / 1000) })
    return null
  }

  if (entry.count >= limit) {
    return Math.ceil((entry.resetAt - now) / 1000)
  }

  entry.count += 1
  await kv.put(key, JSON.stringify(entry), { expirationTtl: Math.ceil((entry.resetAt - now) / 1000) })
  return null
}

export function getClientIp(req: Request): string {
  return req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || 'unknown'
}
