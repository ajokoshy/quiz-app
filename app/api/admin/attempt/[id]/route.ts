export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await sql`DELETE FROM attempts WHERE id = ${params.id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
