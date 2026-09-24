/**
 * PHASE-10: Client-side rate limiting + server-side KV pattern (Cloudflare)
 * MMPI in-memory değil, KV/DO persistent — client side debounce + token bucket
 * No 3rd party, KVKK minimal, no PII logging
 */

type Bucket = { tokens: number; lastRefill: number };

const buckets = new Map<string, Bucket>();

export type RateLimitOptions = {
  key: string;
  maxTokens: number; // burst
  refillRatePerSec: number; // tokens per second
  cost?: number;
};

/**
 * Token bucket — returns true if allowed, false if rate limited
 * Example: login 5 req / 60s => maxTokens 5, refill 5/60=0.083/s
 */
export function checkRateLimit(opts: RateLimitOptions): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const cost = opts.cost ?? 1;
  let bucket = buckets.get(opts.key);
  if (!bucket) {
    bucket = { tokens: opts.maxTokens, lastRefill: now };
    buckets.set(opts.key, bucket);
  }
  const elapsedSec = (now - bucket.lastRefill) / 1000;
  const refill = elapsedSec * opts.refillRatePerSec;
  bucket.tokens = Math.min(opts.maxTokens, bucket.tokens + refill);
  bucket.lastRefill = now;

  if (bucket.tokens >= cost) {
    bucket.tokens -= cost;
    return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterMs: 0 };
  }
  const needed = cost - bucket.tokens;
  const retryAfterSec = needed / opts.refillRatePerSec;
  return { allowed: false, remaining: 0, retryAfterMs: Math.ceil(retryAfterSec * 1000) };
}

export function resetRateLimit(key?: string) {
  if (key) buckets.delete(key);
  else buckets.clear();
}

/**
 * Debounce for form submissions — prevents double submit
 */
export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, waitMs: number): T {
  let timeout: number | null = null;
  return ((...args: unknown[]) => {
    if (timeout) window.clearTimeout(timeout);
    timeout = window.setTimeout(() => fn(...args), waitMs) as unknown as number;
  }) as T;
}

/**
 * Server-side KV pattern (Cloudflare Workers) — pseudo code for Edge Function
 * In production, use Cloudflare KV or Durable Object:
 *
 * export async function rateLimitKV(key: string, limit: number, windowSec: number, env: Env): Promise<boolean> {
 *   const kvKey = `rl:${key}`;
 *   const current = await env.RATE_LIMIT_KV.get(kvKey);
 *   const count = current ? parseInt(current) : 0;
 *   if (count >= limit) return false;
 *   await env.RATE_LIMIT_KV.put(kvKey, String(count+1), { expirationTtl: windowSec });
 *   return true;
 * }
 */
