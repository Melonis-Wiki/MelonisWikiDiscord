import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Message } from "discord.js";
import {
  parseCommand,
  parseDurationMinutes,
  parseUserId,
  parseNonNegativeInt,
  parsePositiveInt
} from "../src/utils/parse.js";

describe("parseCommand", () => {
  it("parses command and args with default prefix", () => {
    assert.deepEqual(parseCommand("?ban 123 spam"), {
      command: "ban",
      args: ["123", "spam"]
    });
  });

  it("supports custom prefixes", () => {
    assert.deepEqual(parseCommand("!help", "!"), {
      command: "help",
      args: []
    });
  });

  it("returns empty command for non-prefix messages", () => {
    assert.deepEqual(parseCommand("hello"), {
      command: "",
      args: []
    });
  });
});

describe("parsePositiveInt", () => {
  it("accepts positive integers", () => {
    assert.equal(parsePositiveInt("42"), 42);
  });

  it("rejects zero and invalid values", () => {
    assert.equal(parsePositiveInt("0"), null);
    assert.equal(parsePositiveInt("-1"), null);
    assert.equal(parsePositiveInt("abc"), null);
  });
});

describe("parseNonNegativeInt", () => {
  it("accepts zero", () => {
    assert.equal(parseNonNegativeInt("0"), 0);
  });
});

describe("parseDurationMinutes", () => {
  it("accepts the Discord timeout range", () => {
    assert.equal(parseDurationMinutes("40320"), 40320);
  });

  it("rejects out-of-range values", () => {
    assert.equal(parseDurationMinutes("0"), null);
    assert.equal(parseDurationMinutes("40321"), null);
  });
});

describe("parseUserId", () => {
  const message = {
    mentions: {
      users: {
        first: () => ({ id: "123456789012345678" })
      }
    }
  } as unknown as Pick<Message, "mentions">;

  it("parses normal mentions", () => {
    assert.equal(parseUserId(message, "<@123456789012345678>"), "123456789012345678");
  });

  it("parses nickname mentions", () => {
    assert.equal(parseUserId(message, "<@!123456789012345678>"), "123456789012345678");
  });

  it("parses raw snowflake IDs", () => {
    assert.equal(parseUserId(message, "123456789012345678"), "123456789012345678");
  });

  it("falls back to the first mention when the arg is not directly parseable", () => {
    assert.equal(parseUserId(message, "someone"), "123456789012345678");
  });

  it("returns null when there is no usable id", () => {
    const empty = {
      mentions: {
        users: {
          first: () => undefined
        }
      }
    } as unknown as Pick<Message, "mentions">;
    assert.equal(parseUserId(empty, "someone"), null);
  });
});
