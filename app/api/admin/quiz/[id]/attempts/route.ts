import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const attempts = await sql`
      SELECT id, participant_name, score, total, attempted_at
      FROM attempts WHERE quiz_id = ${params.id}
      ORDER BY attempted_at DESC
    `;
    return NextResponse.json({ attempts });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
