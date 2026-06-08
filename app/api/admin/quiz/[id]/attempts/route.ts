export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const attempts = await sql`
      SELECT id, participant_name, score, total, attempted_at
      FROM attempts WHERE quiz_id = ${params.id}
      ORDER BY attempted_at DESC
    `;
    return NextResponse.json({ attempts }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    logger.error('Attempts fetch failed', { quizId: params.id, error: String(err) });
    return NextResponse.json({ error: 'Failed to load attempts' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await sql`
      DELETE FROM attempts WHERE quiz_id = ${params.id} RETURNING id
    `;
    logger.info('All attempts cleared', { quizId: params.id, count: result.length });
    return NextResponse.json({ ok: true, deleted: result.length });
  } catch (err) {
    logger.error('Clear attempts failed', { quizId: params.id, error: String(err) });
    return NextResponse.json({ error: 'Failed to clear attempts' }, { status: 500 });
  }
}
