import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const SESSION_COOKIE = 'qc_session';
const SESSION_EXPIRY_SECONDS = 60 * 60 * 4; // 4 hours

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET env var must be set and at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

// ── CREATE SESSION TOKEN ──────────────────────────────────
export async function createSessionToken(): Promise<string> {
  const secret = getSecret();
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_EXPIRY_SECONDS}s`)
    .sign(secret);
}

// ── VERIFY SESSION TOKEN ──────────────────────────────────
export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const secret = getSecret();
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

// ── GET SESSION FROM COOKIES (Server Component) ───────────
export async function getServerSession(): Promise<boolean> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return false;
    return await verifySessionToken(token);
  } catch {
    return false;
  }
}

// ── GET SESSION FROM REQUEST (API Routes / Middleware) ────
export async function getRequestSession(req: NextRequest): Promise<boolean> {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return false;
    return await verifySessionToken(token);
  } catch {
    return false;
  }
}

// ── SESSION COOKIE CONFIG ─────────────────────────────────
export function sessionCookieOptions(token: string) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict' as const,
    maxAge: SESSION_EXPIRY_SECONDS,
    path: '/',
  };
}

export function clearSessionCookieOptions() {
  return {
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 0,
    path: '/',
  };
}

export const COOKIE_NAME = SESSION_COOKIE;
