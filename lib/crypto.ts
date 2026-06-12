import { createHash, timingSafeEqual } from 'crypto';

/**
 * Compare two strings in constant time using Node.js crypto.timingSafeEqual().
 *
 * timingSafeEqual requires both buffers to be the same length, so we hash
 * both inputs first (SHA-256). The hash step is fast and ensures equal-length
 * buffers without leaking the actual length of the secrets.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}
