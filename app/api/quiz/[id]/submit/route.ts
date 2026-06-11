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

    // Self-healing: ensure is_active column exists
    await sql`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`;

    // Verify quiz exists and is active
    const quiz = await sql`SELECT id, title, is_active FROM quizzes WHERE id = ${params.id}`;
    if (quiz.length === 0) {
      return NextResponse.json({ error: 'Quiz not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    // Normalize boolean (neon can return string or bool)
    const isActive = quiz[0].is_active === true || quiz[0].is_active === 'true';
    if (!isActive) {
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

    // Count BEFORE inserting
    const countResult = await sql`
      SELECT COUNT(*)::int AS cnt FROM attempts WHERE quiz_id = ${params.id}
    `;
    const currentCount = countResult[0].cnt;

    // If already at limit, try to archive first to free up space, then accept
    if (currentCount >= ATTEMPT_LIMIT) {
      logger.warn('Attempt count at limit on arrival — attempting emergency archive', { quizId: params.id, currentCount });
      await runArchive(sql, params.id, quiz[0].title);
      // After archive, table should be empty — proceed to insert below
    }

    // Insert the new attempt
    await sql`
      INSERT INTO attempts (quiz_id, participant_name, score, total, answers)
      VALUES (${params.id}, ${participant_name.trim()}, ${score}, ${questions.length}, ${JSON.stringify(answers)})
    `;

    const newCount = currentCount >= ATTEMPT_LIMIT ? 1 : currentCount + 1;

    // Auto-archive when this insertion brings us to the limit
    if (newCount >= ATTEMPT_LIMIT) {
      await runArchive(sql, params.id, quiz[0].title);
    }

    logger.info('Attempt submitted', { quizId: params.id, score, total: questions.length });
    return NextResponse.json({ score, total: questions.length, result });

  } catch (err) {
    logger.error('Submit failed', { quizId: params.id, error: String(err) });
    return NextResponse.json({ error: 'Failed to submit quiz. Please try again.' }, { status: 500 });
  }
}

// ── ARCHIVE HELPER ────────────────────────────────────────────────────────────
async function runArchive(sql: any, quizId: string, quizTitle: string): Promise<void> {
  try {
    // Ensure archive table exists (self-healing)
    await sql`
      CREATE TABLE IF NOT EXISTS attempts_archive (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        original_id UUID NOT NULL,
        quiz_id UUID NOT NULL,
        quiz_title TEXT NOT NULL,
        participant_name TEXT NOT NULL,
        score INT NOT NULL,
        total INT NOT NULL,
        answers JSONB,
        attempted_at TIMESTAMP NOT NULL,
        archived_at TIMESTAMP DEFAULT NOW(),
        batch_number INT NOT NULL DEFAULT 1
      )
    `;

    // Get next batch number for this quiz
    const batchResult = await sql`
      SELECT COALESCE(MAX(batch_number), 0)::int AS max_batch
      FROM attempts_archive WHERE quiz_id = ${quizId}
    `;
    const nextBatch = batchResult[0].max_batch + 1;

    // Copy all current attempts to archive
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

    // Delete from main table
    await sql`DELETE FROM attempts WHERE quiz_id = ${quizId}`;

    logger.info('Auto-archive complete', { quizId, batch: nextBatch, archived: copied.length });
  } catch (err) {
    // Log but throw so caller knows archive failed
    logger.error('Archive failed', { quizId, error: String(err) });
    throw err;
  }
}
