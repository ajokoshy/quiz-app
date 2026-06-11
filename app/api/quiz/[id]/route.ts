export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Self-healing: ensure is_active column exists
    await sql`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`;

    const quiz = await sql`SELECT id, title, is_active FROM quizzes WHERE id = ${params.id}`;

    if (quiz.length === 0) {
      return NextResponse.json({ error: 'Quiz not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    // Normalize boolean (neon can return string or bool)
    const isActive = quiz[0].is_active === true || quiz[0].is_active === 'true';
    if (!isActive) {
      return NextResponse.json({ error: 'This quiz is not available now.', code: 'INACTIVE' }, { status: 403 });
    }

    const questions = await sql`
      SELECT id, question_text, option_a, option_b, option_c, option_d, order_index
      FROM questions WHERE quiz_id = ${params.id} ORDER BY order_index
    `;
    return NextResponse.json({ quiz: quiz[0], questions }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    logger.error('Quiz fetch failed', { quizId: params.id, error: String(err) });
    return NextResponse.json({ error: 'Failed to load quiz', code: 'SERVER_ERROR' }, { status: 500 });
  }
}
