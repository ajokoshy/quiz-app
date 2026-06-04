import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, questions } = body;

    if (!title || !questions || questions.length !== 10) {
      return NextResponse.json({ error: 'Need a title and exactly 10 questions' }, { status: 400 });
    }

    // Create the quiz
    const quizResult = await sql`
      INSERT INTO quizzes (title) VALUES (${title}) RETURNING id
    `;
    const quizId = quizResult[0].id;

    // Insert all 10 questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await sql`
        INSERT INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index)
        VALUES (${quizId}, ${q.question_text}, ${q.option_a}, ${q.option_b}, ${q.option_c}, ${q.option_d}, ${q.correct_option}, ${i})
      `;
    }

    return NextResponse.json({ id: quizId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
