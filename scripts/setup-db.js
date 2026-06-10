// Run this once to set up your database tables
// Usage: node scripts/setup-db.js

const { neon } = require('@neondatabase/serverless');

async function setup() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set. Copy .env.example to .env.local and fill it in.');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  console.log('🔧 Setting up database tables...');

  await sql`
    CREATE TABLE IF NOT EXISTS quizzes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log('✅ quizzes table ready');

  // Add is_active column to existing installs (safe to run multiple times)
  await sql`
    ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true
  `;
  console.log('✅ is_active column verified');

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
  console.log('✅ questions table ready');

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
  console.log('✅ attempts table ready');

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
  console.log('✅ attempts_archive table ready');

  console.log('\n🎉 Database setup complete! You can now run: npm run dev');
}

setup().catch(console.error);
