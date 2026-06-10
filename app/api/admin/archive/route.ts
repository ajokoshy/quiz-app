export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { logger } from '@/lib/logger';

// GET - fetch all archived attempts (optionally filter by quiz_id)
export async function GET(req: NextRequest) {
  try {
    // Self-healing: ensure archive table exists
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

    const { searchParams } = new URL(req.url);
    const quizId = searchParams.get('quiz_id');

    const archived = quizId
      ? await sql`
          SELECT id, original_id, quiz_id, quiz_title, participant_name,
                 score, total, attempted_at, archived_at, batch_number
          FROM attempts_archive
          WHERE quiz_id = ${quizId}
          ORDER BY batch_number DESC, attempted_at DESC
        `
      : await sql`
          SELECT id, original_id, quiz_id, quiz_title, participant_name,
                 score, total, attempted_at, archived_at, batch_number
          FROM attempts_archive
          ORDER BY archived_at DESC, batch_number DESC, attempted_at DESC
        `;

    // Summary: count per quiz per batch
    const summary = await sql`
      SELECT
        quiz_id, quiz_title,
        batch_number,
        COUNT(*)::int AS count,
        AVG(score::float / total * 100)::numeric(5,1) AS avg_score_pct,
        MAX(score)::int AS highest_score,
        MIN(score)::int AS lowest_score,
        MAX(archived_at) AS archived_at
      FROM attempts_archive
      ${quizId ? sql`WHERE quiz_id = ${quizId}` : sql``}
      GROUP BY quiz_id, quiz_title, batch_number
      ORDER BY archived_at DESC
    `;

    return NextResponse.json({ archived, summary }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    logger.error('Archive fetch failed', { error: String(err) });
    return NextResponse.json({ error: 'Failed to load archive' }, { status: 500 });
  }
}

// DELETE - clear entire archive table (all quizzes, all batches)
export async function DELETE(req: NextRequest) {
  try {
    // Self-healing: ensure archive table exists
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

    const result = await sql`DELETE FROM attempts_archive RETURNING id`;
    logger.info('Entire archive cleared', { count: result.length });
    return NextResponse.json({ ok: true, deleted: result.length });
  } catch (err) {
    logger.error('Archive clear failed', { error: String(err) });
    return NextResponse.json({ error: 'Failed to clear archive' }, { status: 500 });
  }
}
