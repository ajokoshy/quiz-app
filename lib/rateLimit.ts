/**
 * Redis-backed rate limiter using Upstash Redis.
 *
 * Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your environment.
 * Falls back gracefully if env vars are absent (development only).
 *
 * Strategy: sliding-window with a block key.
 *   Key schema:
 *     rl:{ip}:count  → number of failed attempts in the current window (TTL = WINDOW_MS)
 *     rl:{ip}:block  → exists while the IP is blocked (TTL = BLOCK_DURATION_MS)
 */

const WINDOW_MS = 60 * 1000;           // 1-minute sliding window
const MAX_ATTEMPTS = 5;                 // max failed attempts before block
const BLOCK_DURATION_MS = 5 * 60 * 1000; // 5-minute block

// ── Upstash REST helper ───────────────────────────────────────────────────────
async function redis(command: string[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // Dev fallback: no-op that always allows (in-memory fallback below handles it)
    throw new Error('UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set');
  }

  const res = await fetch(`${url}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });

  if (!res.ok) {
    throw new Error(`Upstash error: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { result: unknown };
  return json.result;
}

// ── In-memory fallback (dev / missing env vars) ───────────────────────────────
interface Attempt {
  count: number;
  windowStart: number;
  blockedUntil?: number;
}
const devStore = new Map<string, Attempt>();

function devCheckRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = devStore.get(ip);
  if (entry?.blockedUntil && now < entry.blockedUntil) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000) };
  }
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    devStore.set(ip, { count: 0, windowStart: now });
  }
  return { allowed: true };
}

function devRecordFailed(ip: string): { blocked: boolean; attemptsLeft: number } {
  const now = Date.now();
  const entry = devStore.get(ip) || { count: 0, windowStart: now };
  if (now - entry.windowStart > WINDOW_MS) {
    devStore.set(ip, { count: 1, windowStart: now });
    return { blocked: false, attemptsLeft: MAX_ATTEMPTS - 1 };
  }
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION_MS;
    devStore.set(ip, entry);
    return { blocked: true, attemptsLeft: 0 };
  }
  devStore.set(ip, entry);
  return { blocked: false, attemptsLeft: MAX_ATTEMPTS - entry.count };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function checkRateLimit(
  ip: string
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  try {
    const blockKey = `rl:${ip}:block`;
    const ttl = (await redis(['TTL', blockKey])) as number;

    if (ttl > 0) {
      return { allowed: false, retryAfterSeconds: ttl };
    }
    return { allowed: true };
  } catch {
    // Upstash unavailable — fall back to in-memory
    return devCheckRateLimit(ip);
  }
}

export async function recordFailedAttempt(
  ip: string
): Promise<{ blocked: boolean; attemptsLeft: number }> {
  try {
    const countKey = `rl:${ip}:count`;
    const blockKey = `rl:${ip}:block`;

    // Atomically increment and set TTL on first write
    const count = (await redis(['INCR', countKey])) as number;
    if (count === 1) {
      await redis(['PEXPIRE', countKey, String(WINDOW_MS)]);
    }

    if (count >= MAX_ATTEMPTS) {
      // Set block key; also delete count key so it resets after the block
      await redis(['SET', blockKey, '1', 'PX', String(BLOCK_DURATION_MS)]);
      await redis(['DEL', countKey]);
      return { blocked: true, attemptsLeft: 0 };
    }

    return { blocked: false, attemptsLeft: MAX_ATTEMPTS - count };
  } catch {
    return devRecordFailed(ip);
  }
}

export async function recordSuccessfulLogin(ip: string): Promise<void> {
  try {
    await redis(['DEL', `rl:${ip}:count`, `rl:${ip}:block`]);
  } catch {
    devStore.delete(ip);
  }
}
