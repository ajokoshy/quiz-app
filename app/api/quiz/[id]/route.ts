export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const quiz = await sql`SELECT * FROM quizzes WHERE id = ${params.id}`;
    if (quiz.length === 0) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

    // Return questions WITHOUT correct_option (so users can't cheat)
    const questions = await sql`
      SELECT id, question_text, option_a, option_b, option_c, option_d, order_index
      FROM questions WHERE quiz_id = ${params.id} ORDER BY order_index
    `;

    return NextResponse.json({ quiz: quiz[0], questions });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
