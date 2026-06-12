export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

/**
 * This endpoint previously ran inline DDL.
 * Schema migrations have been moved to scripts/migrations/ and are
 * applied via `npm run db:migrate` before deploying.
 *
 * This stub is kept so existing callers receive a clear explanation
 * rather than a 404.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message:
        'Inline migrations have been removed. Run `npm run db:migrate` from your CLI to apply schema changes.',
    },
    { status: 410 }  // 410 Gone — intentionally retired
  );
}
