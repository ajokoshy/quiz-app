export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { logger } from '@/lib/logger';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await sql`DELETE FROM attempts WHERE id = ${params.id}`;
    logger.info('Attempt deleted', { attemptId: params.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error('Attempt delete failed', { attemptId: params.id, error: String(err) });
    return NextResponse.json({ error: 'Failed to delete attempt' }, { status: 500 });
  }
}
