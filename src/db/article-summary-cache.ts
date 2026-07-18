export const DEFAULT_ARTICLE_SUMMARY_CACHE_TTL_MS = 36 * 60 * 60 * 1000;

export type CachedArticleSummary = {
  article_id: number;
  title: string;
  url: string;
  section_name: string;
  author_username: string;
  wiki_updated_at: string;
  summary: string;
  cached_at: string;
};

export function isArticleSummaryCacheFresh(
  cached: CachedArticleSummary,
  wikiUpdatedAt: string,
  nowMs = Date.now(),
  ttlMs = DEFAULT_ARTICLE_SUMMARY_CACHE_TTL_MS
): boolean {
  const cachedWikiUpdated = new Date(cached.wiki_updated_at).getTime();
  const currentWikiUpdated = new Date(wikiUpdatedAt).getTime();
  if (Number.isNaN(cachedWikiUpdated) || Number.isNaN(currentWikiUpdated)) return false;
  if (cachedWikiUpdated < currentWikiUpdated) return false;

  const cachedAt = new Date(cached.cached_at).getTime();
  if (Number.isNaN(cachedAt)) return false;

  return nowMs - cachedAt < ttlMs;
}
