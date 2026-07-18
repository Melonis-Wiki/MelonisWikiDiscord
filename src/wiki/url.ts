import { config } from "../config/env.js";
import { normalizeWikiArticleUrlWithBase } from "./url-normalize.js";

export function normalizeWikiArticleUrl(url: string | undefined, articleId: number): string {
  return normalizeWikiArticleUrlWithBase(config.wikiBaseUrl, url, articleId);
}

export { normalizeWikiArticleUrlWithBase } from "./url-normalize.js";
