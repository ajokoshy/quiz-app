export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { parseBody, SubmitAttemptSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';

const ATTEMPT_LIMIT = 100;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const parsed = parseBody(SubmitAttemptSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { participant_name, answers } = parsed.data;
    const sql = neon(process.env.DATABASE_URL || '');

    // Verify quiz exists and is active
    const quiz = await sql`SELECT id, title, is_active FROM quizzes WHERE id = ${params.id}`;
    if (quiz.length === 0) {
      return NextResponse.json({ error: 'Quiz not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    if (!quiz[0].is_active) {
      return NextResponse.json({ error: 'This quiz is not available now.', code: 'INACTIVE' }, { status: 403 });
    }

    // Get correct answers
    const questions = await sql`
      SELECT id, correct_option FROM questions WHERE quiz_id = ${params.id} ORDER BY order_index
    `;
    if (questions.length === 0) {
      return NextResponse.json({ error: 'Quiz has no questions' }, { status: 404 });
    }

    // Score the answers
    let score = 0;
    const result: Record<string, { chosen: string; correct: string; is_correct: boolean }> = {};
    for (const q of questions) {
      const chosen = (answers[q.id] || '').toUpperCase();
      const isCorrect = chosen === q.correct_option.toUpperCase();
      if (isCorrect) score++;
      result[q.id] = { chosen, correct: q.correct_option, is_correct: isCorrect };
    }

    // ── TRANSACTION: check limit, save, auto-archive if needed ──
    await sql.transaction(async (tx) => {
      // Lock + count in transaction to avoid race conditions
      const countResult = await tx`
        SELECT COUNT(*)::int AS cnt FROM attempts WHERE quiz_id = ${params.id}
      `;
      const currentCount = countResult[0].cnt;

      if (currentCount >= ATTEMPT_LIMIT) {
        // This will be caught below and returned as 403
        throw new Error('LIMIT_REACHED');
      }

      // Insert the new attempt
      await tx`
        INSERT INTO attempts (quiz_id, participant_name, score, total, answers)
        VALUES (${params.id}, ${participant_name.trim()}, ${score}, ${questions.length}, ${JSON.stringify(answers)})
      `;

      const newCount = currentCount + 1;

      // ── AUTO-ARCHIVE when hitting exactly 100 ──
      if (newCount >= ATTEMPT_LIMIT) {
        logger.info('Auto-archiving attempts at limit', { quizId: params.id, count: newCount });

        // Determine next batch number
        const batchResult = await tx`
          SELECT COALESCE(MAX(batch_number), 0)::int AS max_batch
          FROM attempts_archive WHERE quiz_id = ${params.id}
        `;
        const nextBatch = batchResult[0].max_batch + 1;
        const quizTitle = quiz[0].title;

        // Copy all attempts to archive
        await tx`
          INSERT INTO attempts_archive
            (original_id, quiz_id, quiz_title, participant_name, score, total, answers, attempted_at, batch_number)
          SELECT
            id, quiz_id, ${quizTitle}, participant_name, score, total, answers, attempted_at, ${nextBatch}
          FROM attempts
          WHERE quiz_id = ${params.id}
        `;

        // Clear from main table
        await tx`DELETE FROM attempts WHERE quiz_id = ${params.id}`;

        logger.info('Auto-archive complete', { quizId: params.id, batch: nextBatch, count: newCount });
      }
    });

    logger.info('Attempt submitted', { quizId: params.id, score, total: questions.length });
    return NextResponse.json({ score, total: questions.length, result });

  } catch (err) {
    if (err instanceof Error && err.message === 'LIMIT_REACHED') {
      return NextResponse.json({
        error: 'This quiz has reached its maximum of 100 participants. A new batch will be available shortly.',
      }, { status: 403 });
    }
    logger.error('Submit failed', { quizId: params.id, error: String(err) });
    return NextResponse.json({ error: 'Failed to submit quiz. Please try again.' }, { status: 500 });
  }
}
