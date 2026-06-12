export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { logger } from '@/lib/logger';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Ensure is_active column exists

    // Read current value first
    const current = await sql`SELECT is_active FROM quizzes WHERE id = ${params.id}`;
    if (current.length === 0) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Explicitly set to opposite of current value (avoids type ambiguity with NOT operator)
    const currentActive = current[0].is_active === true || current[0].is_active === 'true';
    const newActive = !currentActive;

    const result = await sql`
      UPDATE quizzes
      SET is_active = ${newActive}
      WHERE id = ${params.id}
      RETURNING id, title, is_active
    `;

    const quiz = result[0];
    const returnedActive = quiz.is_active === true || quiz.is_active === 'true';

    logger.info('Quiz toggled', {
      quizId: params.id,
      from: currentActive,
      to: newActive,
      db_returned: quiz.is_active,
      db_returned_type: typeof quiz.is_active,
    });

    return NextResponse.json({ ok: true, is_active: returnedActive });
  } catch (err) {
    logger.error('Quiz toggle failed', { quizId: params.id, error: String(err) });
    return NextResponse.json({ error: 'Failed to update quiz status' }, { status: 500 });
  }
}
