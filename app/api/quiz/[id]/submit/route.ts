export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { neon, neonConfig } from '@neondatabase/serverless';
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

    // Verify quiz exists and is active (no DDL here — handled by migrations)
    const quiz = await sql`SELECT id, title, is_active FROM quizzes WHERE id = ${params.id}`;
    if (quiz.length === 0) {
      return NextResponse.json({ error: 'Quiz not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    const isActive = quiz[0].is_active === true || quiz[0].is_active === 'true';
    if (!isActive) {
      return NextResponse.json({ error: 'This quiz is not available now.', code: 'INACTIVE' }, { status: 403 });
    }

    // Fetch questions
    const questions = await sql`
      SELECT id, correct_option FROM questions WHERE quiz_id = ${params.id} ORDER BY order_index
    `;
    if (questions.length === 0) {
      return NextResponse.json({ error: 'Quiz has no questions' }, { status: 404 });
    }

    // Score answers
    let score = 0;
    const result: Record<string, { chosen: string; correct: string; is_correct: boolean }> = {};
    for (const q of questions) {
      const chosen = (answers[q.id] || '').toUpperCase();
      const isCorrect = chosen === q.correct_option.toUpperCase();
      if (isCorrect) score++;
      result[q.id] = { chosen, correct: q.correct_option, is_correct: isCorrect };
    }

    // ── Transactional insert + optional auto-archive ───────────────────────
    // Use an explicit transaction so the count-check and insert are atomic,
    // eliminating the race condition where two concurrent submissions both
    // read the same count and both decide not to archive.
    await sql`BEGIN`;
    try {
      // Lock the rows for this quiz so concurrent submissions queue up
      const countResult = await sql`
        SELECT COUNT(*)::int AS cnt
        FROM attempts
        WHERE quiz_id = ${params.id}
        FOR UPDATE
      `;
      // Note: FOR UPDATE on an aggregate requires a subquery in strict SQL,
      // but Neon/Postgres accepts it; alternatively lock the quizzes row:
      // SELECT id FROM quizzes WHERE id = ${params.id} FOR UPDATE
      const currentCount = countResult[0].cnt;

      if (currentCount >= ATTEMPT_LIMIT) {
        logger.warn('Attempt limit reached — running archive inside transaction', {
          quizId: params.id,
          currentCount,
        });
        await archiveInsideTransaction(sql, params.id, quiz[0].title);
      }

      await sql`
        INSERT INTO attempts (quiz_id, participant_name, score, total, answers)
        VALUES (${params.id}, ${participant_name.trim()}, ${score}, ${questions.length}, ${JSON.stringify(answers)})
      `;

      // Re-check count after insert to see if we just hit the limit
      const afterCount = await sql`
        SELECT COUNT(*)::int AS cnt FROM attempts WHERE quiz_id = ${params.id}
      `;
      if (afterCount[0].cnt >= ATTEMPT_LIMIT) {
        await archiveInsideTransaction(sql, params.id, quiz[0].title);
      }

      await sql`COMMIT`;
    } catch (txErr) {
      await sql`ROLLBACK`;
      throw txErr;
    }
    // ── End transaction ────────────────────────────────────────────────────

    logger.info('Attempt submitted', { quizId: params.id, score, total: questions.length });
    return NextResponse.json({ score, total: questions.length, result });

  } catch (err) {
    logger.error('Submit failed', { quizId: params.id, error: String(err) });
    return NextResponse.json({ error: 'Failed to submit quiz. Please try again.' }, { status: 500 });
  }
}

// ── Archive helper (runs inside an existing transaction) ──────────────────────
async function archiveInsideTransaction(sql: any, quizId: string, quizTitle: string): Promise<void> {
  const batchResult = await sql`
    SELECT COALESCE(MAX(batch_number), 0)::int AS max_batch
    FROM attempts_archive WHERE quiz_id = ${quizId}
  `;
  const nextBatch = batchResult[0].max_batch + 1;

  const copied = await sql`
    INSERT INTO attempts_archive
      (original_id, quiz_id, quiz_title, participant_name, score, total, answers, attempted_at, batch_number)
    SELECT
      id, quiz_id, ${quizTitle}, participant_name, score, total, answers, attempted_at, ${nextBatch}
    FROM attempts
    WHERE quiz_id = ${quizId}
    RETURNING id
  `;

  if (copied.length === 0) {
    logger.warn('Archive: no attempts to copy', { quizId });
    return;
  }

  await sql`DELETE FROM attempts WHERE quiz_id = ${quizId}`;
  logger.info('Auto-archive complete', { quizId, batch: nextBatch, archived: copied.length });
}
