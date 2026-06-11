export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    await sql`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`;

    const quizzes = await sql`
      SELECT q.id, q.title,
        (q.is_active = true)::boolean AS is_active,
        q.created_at,
        COUNT(a.id)::int AS attempt_count
      FROM quizzes q
      LEFT JOIN attempts a ON a.quiz_id = q.id
      GROUP BY q.id, q.title, q.is_active, q.created_at
      ORDER BY q.created_at DESC
    `;

    // Normalize is_active to JS boolean (neon can return string or bool)
    const normalized = quizzes.map((q: any) => ({
      ...q,
      is_active: q.is_active === true || q.is_active === 'true',
    }));

    return NextResponse.json({ quizzes: normalized }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    logger.error('Quizzes fetch failed', { error: String(err) });
    return NextResponse.json({ error: 'Failed to load quizzes' }, { status: 500 });
  }
}
