// Next.js instrumentation - runs once when the server starts
// Handles all DB migrations automatically so manual SQL is never needed

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { neon } = await import('@neondatabase/serverless');
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl || dbUrl.includes('placeholder')) return;

      const sql = neon(dbUrl);

      // Run all migrations - all are idempotent (safe to run multiple times)
      await sql`
        CREATE TABLE IF NOT EXISTS quizzes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      await sql`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`;

      await sql`
        CREATE TABLE IF NOT EXISTS questions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
          question_text TEXT NOT NULL,
          option_a TEXT NOT NULL,
          option_b TEXT NOT NULL,
          option_c TEXT NOT NULL,
          option_d TEXT NOT NULL,
          correct_option CHAR(1) NOT NULL,
          order_index INT NOT NULL
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS attempts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
          participant_name TEXT NOT NULL,
          score INT NOT NULL,
          total INT NOT NULL,
          answers JSONB,
          attempted_at TIMESTAMP DEFAULT NOW()
        )
      `;

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

      console.log('[QuizCraft] Database migrations verified OK');
    } catch (err) {
      // Non-fatal: app still works if DB is already set up correctly
      console.error('[QuizCraft] Migration warning:', err);
    }
  }
}
