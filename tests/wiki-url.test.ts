import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeWikiArticleUrlWithBase } from "../src/wiki/url-normalize.js";

describe("normalizeWikiArticleUrlWithBase", () => {
  it("keeps valid absolute URLs", () => {
    assert.equal(
      normalizeWikiArticleUrlWithBase("https://melonis.wiki", "https://melonis.wiki/article/12", 12),
      "https://melonis.wiki/article/12"
    );
  });

  it("converts relative URLs to wiki absolute URLs", () => {
    assert.equal(
      normalizeWikiArticleUrlWithBase("https://melonis.wiki", "/article/12", 12),
      "https://melonis.wiki/article/12"
    );
    assert.equal(
      normalizeWikiArticleUrlWithBase("https://melonis.wiki", "article/12", 12),
      "https://melonis.wiki/article/12"
    );
  });

  it("falls back to the article id when the URL is missing or unsupported", () => {
    assert.equal(
      normalizeWikiArticleUrlWithBase("https://melonis.wiki", "", 12),
      "https://melonis.wiki/article/12"
    );
    assert.equal(
      normalizeWikiArticleUrlWithBase("https://melonis.wiki", "javascript:alert(1)", 12),
      "https://melonis.wiki/article/12"
    );
  });
});
