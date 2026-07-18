import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isArticleSummaryCacheFresh,
  type CachedArticleSummary
} from "../src/db/article-summary-cache.js";

const HOUR_MS = 60 * 60 * 1000;
const NOW = Date.parse("2026-07-08T12:00:00.000Z");
const WIKI_UPDATED_AT = "2026-07-08T10:00:00.000Z";

function cached(overrides: Partial<CachedArticleSummary>): CachedArticleSummary {
  return {
    article_id: 1,
    title: "Article",
    url: "https://melonis.wiki/article/1",
    section_name: "Main",
    author_username: "author",
    wiki_updated_at: WIKI_UPDATED_AT,
    summary: "Summary",
    cached_at: new Date(NOW - HOUR_MS).toISOString(),
    ...overrides
  };
}

describe("isArticleSummaryCacheFresh", () => {
  it("accepts matching fresh cache", () => {
    assert.equal(isArticleSummaryCacheFresh(cached({}), WIKI_UPDATED_AT, NOW, 36 * HOUR_MS), true);
  });

  it("rejects expired cache", () => {
    assert.equal(
      isArticleSummaryCacheFresh(
        cached({ cached_at: new Date(NOW - 37 * HOUR_MS).toISOString() }),
        WIKI_UPDATED_AT,
        NOW,
        36 * HOUR_MS
      ),
      false
    );
  });

  it("rejects cache for an older wiki revision", () => {
    assert.equal(
      isArticleSummaryCacheFresh(
        cached({ wiki_updated_at: "2026-07-07T10:00:00.000Z" }),
        WIKI_UPDATED_AT,
        NOW,
        36 * HOUR_MS
      ),
      false
    );
  });

  it("rejects malformed dates", () => {
    assert.equal(
      isArticleSummaryCacheFresh(cached({ cached_at: "not-a-date" }), WIKI_UPDATED_AT, NOW, 36 * HOUR_MS),
      false
    );
  });
});
