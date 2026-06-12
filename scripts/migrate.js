#!/usr/bin/env node
/**
 * Migration runner — applies SQL migration files in order.
 * Usage: node scripts/migrate.js
 *
 * Tracks applied migrations in the `schema_migrations` table so each
 * file runs exactly once, even if you run this script multiple times.
 */

const fs   = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('❌  DATABASE_URL is not set.');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  // Ensure tracking table exists
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `;

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const applied = await sql`SELECT filename FROM schema_migrations`;
  const appliedSet = new Set(applied.map(r => r.filename));

  let ran = 0;
  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`⏭  ${file} — already applied`);
      continue;
    }

    const sqlText = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`⚙️  Applying ${file}…`);

    // Run inside a transaction so partial failures don't corrupt state
    await sql`BEGIN`;
    try {
      // neon tagged-template only accepts static strings, so we use sql.query for dynamic SQL
      await sql.query(sqlText);
      await sql`INSERT INTO schema_migrations (filename) VALUES (${file})`;
      await sql`COMMIT`;
      console.log(`✅  ${file} applied`);
      ran++;
    } catch (err) {
      await sql`ROLLBACK`;
      console.error(`❌  ${file} failed:`, err.message);
      process.exit(1);
    }
  }

  if (ran === 0) {
    console.log('✅  Database schema is already up to date.');
  } else {
    console.log(`\n🎉  ${ran} migration(s) applied successfully.`);
  }
}

run().catch(err => {
  console.error('Migration runner error:', err);
  process.exit(1);
});
