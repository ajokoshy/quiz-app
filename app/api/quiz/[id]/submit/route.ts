export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { participant_name, answers } = body;

    if (!participant_name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Enforce 100 attempt limit
    const countResult = await sql`
      SELECT COUNT(*)::int AS cnt FROM attempts WHERE quiz_id = ${params.id}
    `;
    if (countResult[0].cnt >= 100) {
      return NextResponse.json({ error: 'This quiz has reached the maximum of 100 attempts. Please contact the administrator.' }, { status: 403 });
    }

    const questions = await sql`
      SELECT id, correct_option FROM questions WHERE quiz_id = ${params.id} ORDER BY order_index
    `;
    if (questions.length === 0) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    let score = 0;
    const result: Record<string, { chosen: string; correct: string; is_correct: boolean }> = {};

    for (const q of questions) {
      const chosen = answers[q.id] || '';
      const isCorrect = chosen.toUpperCase() === q.correct_option.toUpperCase();
      if (isCorrect) score++;
      result[q.id] = { chosen, correct: q.correct_option, is_correct: isCorrect };
    }

    await sql`
      INSERT INTO attempts (quiz_id, participant_name, score, total, answers)
      VALUES (${params.id}, ${participant_name}, ${score}, ${questions.length}, ${JSON.stringify(answers)})
    `;

    return NextResponse.json({ score, total: questions.length, result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
