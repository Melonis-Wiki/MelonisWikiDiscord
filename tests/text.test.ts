import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanDiscordText, clip, reasonText } from "../src/utils/text.js";

describe("clip", () => {
  it("clips long text", () => {
    assert.equal(clip("abcdef", 4), "a...");
  });
});

describe("cleanDiscordText", () => {
  it("neutralizes mass mentions", () => {
    assert.equal(cleanDiscordText("@everyone @here"), "@\u200beveryone @\u200bhere");
  });
});

describe("reasonText", () => {
  it("uses fallback for empty reasons", () => {
    assert.equal(reasonText([], "No reason"), "No reason");
  });
});
