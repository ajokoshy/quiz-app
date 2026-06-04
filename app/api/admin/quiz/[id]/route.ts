import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const quiz = await sql`SELECT * FROM quizzes WHERE id = ${params.id}`;
    if (quiz.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Admin gets correct_option too
    const questions = await sql`
      SELECT * FROM questions WHERE quiz_id = ${params.id} ORDER BY order_index
    `;

    return NextResponse.json({ quiz: quiz[0], questions });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await sql`DELETE FROM quizzes WHERE id = ${params.id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
