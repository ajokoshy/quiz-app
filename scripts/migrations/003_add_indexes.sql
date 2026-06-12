-- Migration 003: Indexes on quiz_id foreign keys
-- Dramatically speeds up filtered queries on attempts, questions, and archive.

CREATE INDEX IF NOT EXISTS idx_questions_quiz_id        ON questions        (quiz_id);
CREATE INDEX IF NOT EXISTS idx_attempts_quiz_id         ON attempts         (quiz_id);
CREATE INDEX IF NOT EXISTS idx_attempts_archive_quiz_id ON attempts_archive (quiz_id);

-- Compound index for the archive summary GROUP BY query
CREATE INDEX IF NOT EXISTS idx_attempts_archive_quiz_batch
  ON attempts_archive (quiz_id, batch_number);
