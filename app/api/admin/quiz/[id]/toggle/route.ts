export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { logger } from '@/lib/logger';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Ensure is_active column exists (self-healing for existing installs)
    await sql`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`;

    const result = await sql`
      UPDATE quizzes
      SET is_active = NOT is_active
      WHERE id = ${params.id}
      RETURNING id, title, is_active
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const quiz = result[0];
    logger.info('Quiz toggled', { quizId: quiz.id, is_active: quiz.is_active });
    return NextResponse.json({ ok: true, is_active: quiz.is_active });
  } catch (err) {
    logger.error('Quiz toggle failed', { quizId: params.id, error: String(err) });
    return NextResponse.json({ error: 'Failed to update quiz status' }, { status: 500 });
  }
}
