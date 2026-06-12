/**
 * Next.js instrumentation hook — runs once when the server starts.
 *
 * DDL (CREATE TABLE, ALTER TABLE) has been moved to versioned SQL migration
 * files in scripts/migrations/. Run `npm run db:migrate` to apply them.
 *
 * This file intentionally contains no schema mutations so that production
 * deployments never execute DDL inside a request-handling process.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[QuizCraft] Server starting. Run `npm run db:migrate` to apply any pending migrations.');
  }
}
