export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { logger } from '@/lib/logger';

// One-time migration — safe to call multiple times (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
export async function POST(req: NextRequest) {
  try {
    // Create attempts_archive if missing
    await sql`
      CREATE TABLE IF NOT EXISTS attempts_archive (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        original_id UUID NOT NULL,
        quiz_id UUID NOT NULL,
        quiz_title TEXT NOT NULL,
        participant_name TEXT NOT NULL,
        score INT NOT NULL,
        total INT NOT NULL,
        answers JSONB,
        attempted_at TIMESTAMP NOT NULL,
        archived_at TIMESTAMP DEFAULT NOW(),
        batch_number INT NOT NULL DEFAULT 1
      )
    `;

    // Add is_active to quizzes if missing
    await sql`
      ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true
    `;

    logger.info('Migration complete: attempts_archive + is_active column');
    return NextResponse.json({ ok: true, message: 'Migration complete. All tables are ready.' });
  } catch (err) {
    logger.error('Migration failed', { error: String(err) });
    return NextResponse.json({ error: 'Migration failed: ' + String(err) }, { status: 500 });
  }
}
