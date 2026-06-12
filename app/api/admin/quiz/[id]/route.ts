export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const quiz = await sql`SELECT * FROM quizzes WHERE id = ${params.id}`;
    if (quiz.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const quizData = { ...quiz[0], is_active: quiz[0].is_active === true || quiz[0].is_active === 'true' };
    const questions = await sql`
      SELECT * FROM questions WHERE quiz_id = ${params.id} ORDER BY order_index
    `;
    return NextResponse.json({ quiz: quizData, questions }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    logger.error('Admin quiz fetch failed', { quizId: params.id, error: String(err) });
    return NextResponse.json({ error: 'Failed to load quiz' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await sql`DELETE FROM quizzes WHERE id = ${params.id}`;
    logger.info('Quiz deleted', { quizId: params.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error('Quiz delete failed', { quizId: params.id, error: String(err) });
    return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 });
  }
}
