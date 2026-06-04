export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { question_text, option_a, option_b, option_c, option_d, correct_option } = await req.json();
    await sql`
      UPDATE questions SET
        question_text = ${question_text},
        option_a = ${option_a},
        option_b = ${option_b},
        option_c = ${option_c},
        option_d = ${option_d},
        correct_option = ${correct_option}
      WHERE id = ${params.id}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await sql`DELETE FROM questions WHERE id = ${params.id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
