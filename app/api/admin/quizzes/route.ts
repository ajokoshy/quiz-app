import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  try {
    const quizzes = await sql`
      SELECT q.id, q.title, q.created_at,
        COUNT(a.id)::int AS attempt_count
      FROM quizzes q
      LEFT JOIN attempts a ON a.quiz_id = q.id
      GROUP BY q.id, q.title, q.created_at
      ORDER BY q.created_at DESC
    `;
    return NextResponse.json({ quizzes });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
