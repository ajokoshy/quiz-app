// In-memory rate limiter (per-IP, resets on server restart)
// For production scale, swap Map for Redis/Upstash

interface Attempt {
  count: number;
  windowStart: number;
  blockedUntil?: number;
}

const store = new Map<string, Attempt>();

const WINDOW_MS = 60 * 1000;       // 1 minute window
const MAX_ATTEMPTS = 5;            // max 5 failures per window
const BLOCK_DURATION_MS = 5 * 60 * 1000; // block for 5 minutes

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = store.get(ip);

  // Check if currently blocked
  if (entry?.blockedUntil && now < entry.blockedUntil) {
    const retryAfterSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  // Reset window if expired
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(ip, { count: 0, windowStart: now });
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedAttempt(ip: string): { blocked: boolean; attemptsLeft: number } {
  const now = Date.now();
  const entry = store.get(ip) || { count: 0, windowStart: now };

  // Reset window if expired
  if (now - entry.windowStart > WINDOW_MS) {
    store.set(ip, { count: 1, windowStart: now });
    return { blocked: false, attemptsLeft: MAX_ATTEMPTS - 1 };
  }

  entry.count += 1;

  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION_MS;
    store.set(ip, entry);
    return { blocked: true, attemptsLeft: 0 };
  }

  store.set(ip, entry);
  return { blocked: false, attemptsLeft: MAX_ATTEMPTS - entry.count };
}

export function recordSuccessfulLogin(ip: string): void {
  store.delete(ip); // Clear on success
}
