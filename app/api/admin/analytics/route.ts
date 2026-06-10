export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    // Self-healing: ensure required columns and tables exist
    await sql`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`;
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

    const [overview, perQuiz, recentAttempts] = await Promise.all([
      // Overall platform stats — includes both live and archived attempts
      sql`
        SELECT
          (SELECT COUNT(*)::int FROM quizzes) AS total_quizzes,
          (
            (SELECT COUNT(*)::int FROM attempts) +
            (SELECT COUNT(*)::int FROM attempts_archive)
          ) AS total_attempts,
          (
            (SELECT COUNT(*)::int FROM attempts WHERE score::float / total >= 0.5) +
            (SELECT COUNT(*)::int FROM attempts_archive WHERE score::float / total >= 0.5)
          ) AS total_passes,
          (
            SELECT COALESCE(
              AVG(score::float / total * 100), 0
            )::numeric(5,1) FROM (
              SELECT score, total FROM attempts
              UNION ALL
              SELECT score, total FROM attempts_archive
            ) all_attempts
          ) AS avg_score_pct,
          (
            SELECT COALESCE(MAX(score), 0)::int FROM (
              SELECT score FROM attempts
              UNION ALL
              SELECT score FROM attempts_archive
            ) all_scores
          ) AS highest_score,
          (
            SELECT COALESCE(MIN(score), 0)::int FROM (
              SELECT score FROM attempts
              UNION ALL
              SELECT score FROM attempts_archive
            ) all_scores
          ) AS lowest_score,
          (SELECT COUNT(*)::int FROM attempts_archive) AS total_archived,
          (SELECT COUNT(DISTINCT batch_number || quiz_id::text)::int FROM attempts_archive) AS total_batches
      `,
      // Per-quiz breakdown (live + archived combined)
      sql`
        SELECT
          q.id, q.title, q.is_active, q.created_at,
          (
            COUNT(a.id) +
            COALESCE((SELECT COUNT(*) FROM attempts_archive aa WHERE aa.quiz_id = q.id), 0)
          )::int AS attempt_count,
          COUNT(a.id)::int AS live_count,
          COALESCE((SELECT COUNT(*) FROM attempts_archive aa WHERE aa.quiz_id = q.id), 0)::int AS archived_count,
          COALESCE((SELECT MAX(batch_number) FROM attempts_archive aa WHERE aa.quiz_id = q.id), 0)::int AS batches,
          COALESCE(
            (
              SELECT AVG(s::float / t * 100) FROM (
                SELECT score AS s, total AS t FROM attempts WHERE quiz_id = q.id
                UNION ALL
                SELECT score, total FROM attempts_archive WHERE quiz_id = q.id
              ) combined
            ), 0
          )::numeric(5,1) AS avg_score_pct,
          COALESCE(
            (SELECT MAX(score) FROM (
              SELECT score FROM attempts WHERE quiz_id = q.id
              UNION ALL
              SELECT score FROM attempts_archive WHERE quiz_id = q.id
            ) combined), 0
          )::int AS highest_score,
          COALESCE(
            (SELECT MIN(score) FROM (
              SELECT score FROM attempts WHERE quiz_id = q.id
              UNION ALL
              SELECT score FROM attempts_archive WHERE quiz_id = q.id
            ) combined), 0
          )::int AS lowest_score,
          COALESCE(
            (SELECT COUNT(*) FROM (
              SELECT score, total FROM attempts WHERE quiz_id = q.id AND score::float / total >= 0.5
              UNION ALL
              SELECT score, total FROM attempts_archive WHERE quiz_id = q.id AND score::float / total >= 0.5
            ) combined), 0
          )::int AS pass_count
        FROM quizzes q
        LEFT JOIN attempts a ON a.quiz_id = q.id
        GROUP BY q.id, q.title, q.is_active, q.created_at
        ORDER BY q.created_at DESC
      `,
      // Last 10 attempts (live only — most recent activity)
      sql`
        SELECT a.participant_name, a.score, a.total, a.attempted_at, q.title AS quiz_title
        FROM attempts a
        JOIN quizzes q ON q.id = a.quiz_id
        ORDER BY a.attempted_at DESC
        LIMIT 10
      `,
    ]);

    const stats = overview[0];
    const passRate = stats.total_attempts > 0
      ? ((stats.total_passes / stats.total_attempts) * 100).toFixed(1)
      : '0.0';

    return NextResponse.json({
      overview: { ...stats, pass_rate_pct: passRate },
      perQuiz,
      recentAttempts,
    }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (err) {
    logger.error('Analytics fetch failed', { error: String(err) });
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}
