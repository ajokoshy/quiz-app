export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { parseBody, CreateQuizSchema } from '@/lib/validation';
import { getRequestSession } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  // Quiz creation requires admin session
  const authenticated = await getRequestSession(req);
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const parsed = parseBody(CreateQuizSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { title, questions } = parsed.data;
    const sql = neon(process.env.DATABASE_URL || '');

    // Transaction: create quiz + all 10 questions atomically
    const countResult = await sql`
  SELECT COUNT(*)::int AS cnt
  FROM attempts
  WHERE quiz_id = ${params.id}
`;

const currentCount = countResult[0].cnt;

if (currentCount >= ATTEMPT_LIMIT) {
  throw new Error('LIMIT_REACHED');
}

// Insert attempt
await sql`
  INSERT INTO attempts
    (quiz_id, participant_name, score, total, answers)
  VALUES
    (${params.id}, ${participant_name.trim()}, ${score}, ${questions.length}, ${JSON.stringify(answers)})
`;

const newCount = currentCount + 1;

// Auto archive
if (newCount >= ATTEMPT_LIMIT) {
  logger.info('Auto-archiving attempts at limit', {
    quizId: params.id,
    count: newCount,
  });

  const batchResult = await sql`
    SELECT COALESCE(MAX(batch_number), 0)::int AS max_batch
    FROM attempts_archive
    WHERE quiz_id = ${params.id}
  `;

  const nextBatch = batchResult[0].max_batch + 1;
  const quizTitle = quiz[0].title;

  await sql`
    INSERT INTO attempts_archive
      (original_id, quiz_id, quiz_title, participant_name, score, total, answers, attempted_at, batch_number)
    SELECT
      id, quiz_id, ${quizTitle}, participant_name, score, total, answers, attempted_at, ${nextBatch}
    FROM attempts
    WHERE quiz_id = ${params.id}
  `;

  await sql`
    DELETE FROM attempts
    WHERE quiz_id = ${params.id}
  `;
}

    logger.info('Quiz created', { quizId, title });
    return NextResponse.json({ id: quizId });
  } catch (err) {
    logger.error('Quiz creation failed', { error: String(err) });
    return NextResponse.json({ error: 'Failed to create quiz. Please try again.' }, { status: 500 });
  }
}
