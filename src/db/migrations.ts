import { pool } from "./pool.js";

export async function runMigrations(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS warnings (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS moderation_logs (
      id BIGSERIAL PRIMARY KEY,
      action TEXT NOT NULL,
      user_id TEXT,
      moderator_id TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS article_summaries (
      article_id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      section_name TEXT NOT NULL DEFAULT '',
      author_username TEXT NOT NULL DEFAULT '',
      wiki_updated_at TIMESTAMPTZ NOT NULL,
      summary TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_warnings_user_created_at
      ON warnings(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_moderation_logs_user_created_at
      ON moderation_logs(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_article_summaries_updated_at
      ON article_summaries(updated_at);
  `);
}
