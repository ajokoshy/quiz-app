-- Migration 002: Add is_active to quizzes (backfill for pre-001 installs)
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
