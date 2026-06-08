export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { parseBody, UpdateQuestionSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const parsed = parseBody(UpdateQuestionSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { question_text, option_a, option_b, option_c, option_d, correct_option } = parsed.data;
    await sql`
      UPDATE questions SET
        question_text = ${question_text},
        option_a = ${option_a}, option_b = ${option_b},
        option_c = ${option_c}, option_d = ${option_d},
        correct_option = ${correct_option}
      WHERE id = ${params.id}
    `;
    logger.info('Question updated', { questionId: params.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error('Question update failed', { questionId: params.id, error: String(err) });
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await sql`DELETE FROM questions WHERE id = ${params.id}`;
    logger.info('Question deleted', { questionId: params.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error('Question delete failed', { questionId: params.id, error: String(err) });
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
  }
}
