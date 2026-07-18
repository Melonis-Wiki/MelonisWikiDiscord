export function normalizeWikiArticleUrlWithBase(
  wikiBaseUrl: string,
  url: string | undefined,
  articleId: number
): string {
  const fallback = `${wikiBaseUrl}/article/${articleId}`;
  const value = url?.trim();
  if (!value) return fallback;

  try {
    const absolute = new URL(value);
    if (absolute.protocol === "http:" || absolute.protocol === "https:") {
      return absolute.href;
    }
  } catch {
    const path = value.startsWith("/") ? value : `/${value}`;
    return `${wikiBaseUrl}${path}`;
  }

  return fallback;
}
