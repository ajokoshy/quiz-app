export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, sessionCookieOptions, clearSessionCookieOptions } from '@/lib/auth';
import { checkRateLimit, recordFailedAttempt, recordSuccessfulLogin } from '@/lib/rateLimit';
import { parseBody, LoginSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';

function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  const ip = getIP(req);
  try {
    // Rate limit check
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      logger.warn('Login blocked by rate limit', { ip });
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rateCheck.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    // Parse & validate body
    const body = await req.json().catch(() => ({}));
    const parsed = parseBody(LoginSchema, body);
    if (!parsed.success) {
      recordFailedAttempt(ip);
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 400 });
    }

    const { username, password } = parsed.data;

    // Validate against env vars with constant-time comparison
    const expectedUsername = process.env.ADMIN_USERNAME || '';
    const expectedPassword = process.env.ADMIN_PASSWORD || '';

    let usernameMatch = username.length === expectedUsername.length;
    let passwordMatch = password.length === expectedPassword.length;
    for (let i = 0; i < Math.max(username.length, expectedUsername.length); i++) {
      if (username[i] !== expectedUsername[i]) usernameMatch = false;
    }
    for (let i = 0; i < Math.max(password.length, expectedPassword.length); i++) {
      if (password[i] !== expectedPassword[i]) passwordMatch = false;
    }

    if (!usernameMatch || !passwordMatch) {
      const result = recordFailedAttempt(ip);
      logger.warn('Failed login attempt', { ip, blocked: result.blocked });
      const msg = result.blocked
        ? 'Too many failed attempts. Try again in 5 minutes.'
        : `Invalid credentials. ${result.attemptsLeft} attempt(s) remaining.`;
      return NextResponse.json({ error: msg }, { status: 401 });
    }

    // Success
    recordSuccessfulLogin(ip);
    const token = await createSessionToken();
    logger.info('Admin login successful', { ip });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(sessionCookieOptions(token));
    return res;

  } catch (err) {
    logger.error('Login error', { ip, error: String(err) });
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(clearSessionCookieOptions());
    return res;
  } catch (err) {
    logger.error('Logout error', { error: String(err) });
    return NextResponse.json({ error: 'Logout failed.' }, { status: 500 });
  }
}
