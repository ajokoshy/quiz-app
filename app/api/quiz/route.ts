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
    const quizId = await sql.transaction(async (tx) => {
      const quizRows = await tx`
        INSERT INTO quizzes (title) VALUES (${title}) RETURNING id
      `;
      const id = quizRows[0].id;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await tx`
          INSERT INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index)
          VALUES (${id}, ${q.question_text}, ${q.option_a}, ${q.option_b}, ${q.option_c}, ${q.option_d}, ${q.correct_option}, ${i})
        `;
      }
      return id;
    });

    logger.info('Quiz created', { quizId, title });
    return NextResponse.json({ id: quizId });
  } catch (err) {
    logger.error('Quiz creation failed', { error: String(err) });
    return NextResponse.json({ error: 'Failed to create quiz. Please try again.' }, { status: 500 });
  }
}
