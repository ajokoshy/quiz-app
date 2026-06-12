-- Migration 001: Initial schema
-- Run once. Safe to re-run only via the migration runner (checks applied_migrations).

CREATE TABLE IF NOT EXISTS quizzes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT    NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id        UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text  TEXT   NOT NULL,
  option_a       TEXT   NOT NULL,
  option_b       TEXT   NOT NULL,
  option_c       TEXT   NOT NULL,
  option_d       TEXT   NOT NULL,
  correct_option CHAR(1) NOT NULL,
  order_index    INT    NOT NULL
);

CREATE TABLE IF NOT EXISTS attempts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id          UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  score            INT  NOT NULL,
  total            INT  NOT NULL,
  answers          JSONB,
  attempted_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attempts_archive (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id      UUID NOT NULL,
  quiz_id          UUID NOT NULL,
  quiz_title       TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  score            INT  NOT NULL,
  total            INT  NOT NULL,
  answers          JSONB,
  attempted_at     TIMESTAMP NOT NULL,
  archived_at      TIMESTAMP DEFAULT NOW(),
  batch_number     INT NOT NULL DEFAULT 1
);
