import type { KVNamespace } from '@cloudflare/workers-types'

interface RateLimitEntry {
  count: number
  resetAt: number // Unix ms
}

// Cloudflare KV exige un TTL minimum de 60 secondes
const KV_MIN_TTL = 60

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
    await kv.put(key, JSON.stringify(entry), { expirationTtl: Math.max(KV_MIN_TTL, Math.ceil(windowMs / 1000)) })
    return null
  }

  entry = JSON.parse(raw) as RateLimitEntry

  if (now > entry.resetAt) {
    // Window expired — reset
    entry = { count: 1, resetAt: now + windowMs }
    await kv.put(key, JSON.stringify(entry), { expirationTtl: Math.max(KV_MIN_TTL, Math.ceil(windowMs / 1000)) })
    return null
  }

  if (entry.count >= limit) {
    return Math.ceil((entry.resetAt - now) / 1000)
  }

  entry.count += 1
  // Math.max(KV_MIN_TTL, ...) évite l'erreur "expiration_ttl must be at least 60"
  // qui survenait en fin de fenêtre et provoquait un 500 non géré
  const remainingSec = Math.ceil((entry.resetAt - now) / 1000)
  await kv.put(key, JSON.stringify(entry), { expirationTtl: Math.max(KV_MIN_TTL, remainingSec) })
  return null
}

export function getClientIp(req: Request): string {
  return req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || 'unknown'
}
