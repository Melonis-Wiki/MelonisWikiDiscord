import { config } from "../config/env.js";
import { withTimeout } from "../utils/async.js";

export type WikiArticleSummary = {
  id: number;
  slug: string;
  title: string;
  section_slug: string;
  section_name: string;
  author_username: string;
  created_at: string;
  updated_at: string;
  version: number;
  url: string;
  score?: number;
};

export type WikiArticleFull = WikiArticleSummary & {
  content: string;
};

type FetchError = {
  ok: false;
  error?: string;
  retry_after_sec?: number;
};

type SearchEnvelope = {
  ok: true;
  articles?: WikiArticleSummary[];
};

type ArticleEnvelope = {
  ok: true;
  article?: WikiArticleFull;
};

async function readJson<T>(path: string): Promise<T> {
  const url = `${config.wikiBaseUrl}${path}`;
  const response = await withTimeout(
    (signal) =>
      fetch(url, {
        signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "MelonisWikiDiscord/1.0"
        }
      }),
    10_000,
    "Wiki API request"
  );
  const body = await response.text();

  let data: T | FetchError;
  try {
    data = JSON.parse(body) as T | FetchError;
  } catch {
    throw new Error(`Wiki API returned invalid JSON (${response.status})`);
  }

  if (!response.ok || (typeof data === "object" && data !== null && "ok" in data && data.ok === false)) {
    const errorData = data as FetchError;
    const message = errorData.error ?? `Wiki API error (${response.status})`;
    if (response.status === 429) {
      const retryAfter = errorData.retry_after_sec ?? response.headers.get("Retry-After");
      throw new Error(retryAfter ? `${message}. Retry after ${retryAfter} seconds.` : `${message}. Rate limited.`);
    }
    throw new Error(message);
  }

  return data as T;
}

export async function searchArticles(query: string): Promise<WikiArticleSummary[]> {
  const params = new URLSearchParams({ q: query });
  const data = await readJson<SearchEnvelope>(`/api/fetch?${params.toString()}`);
  return Array.isArray(data.articles) ? data.articles : [];
}

export async function getArticleById(id: number): Promise<WikiArticleFull> {
  const params = new URLSearchParams({ id: String(id) });
  const data = await readJson<ArticleEnvelope>(`/api/fetch?${params.toString()}`);
  if (!data.article) {
    throw new Error("Article not found");
  }
  return data.article;
}
