import { pool } from "./pool.js";
import type { CachedArticleSummary } from "./article-summary-cache.js";
export type { CachedArticleSummary } from "./article-summary-cache.js";
export { isArticleSummaryCacheFresh } from "./article-summary-cache.js";

export async function getCachedArticleSummary(articleId: number): Promise<CachedArticleSummary | null> {
  const result = await pool.query<CachedArticleSummary>(
    `SELECT article_id, title, url, section_name, author_username,
            wiki_updated_at::text AS wiki_updated_at, summary,
            updated_at::text AS cached_at
     FROM article_summaries
     WHERE article_id = $1`,
    [articleId]
  );
  return result.rows[0] ?? null;
}

export async function deleteCachedArticleSummary(articleId: number): Promise<void> {
  await pool.query("DELETE FROM article_summaries WHERE article_id = $1", [articleId]);
}

export async function saveArticleSummary(row: {
  articleId: number;
  title: string;
  url: string;
  sectionName: string;
  authorUsername: string;
  wikiUpdatedAt: string;
  summary: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO article_summaries (
       article_id, title, url, section_name, author_username, wiki_updated_at, summary
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (article_id) DO UPDATE SET
       title = EXCLUDED.title,
       url = EXCLUDED.url,
       section_name = EXCLUDED.section_name,
       author_username = EXCLUDED.author_username,
       wiki_updated_at = EXCLUDED.wiki_updated_at,
       summary = EXCLUDED.summary,
       updated_at = NOW()`,
    [
      row.articleId,
      row.title,
      row.url,
      row.sectionName,
      row.authorUsername,
      row.wikiUpdatedAt,
      row.summary
    ]
  );
}
