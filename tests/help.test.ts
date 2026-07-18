import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { helpText } from "../src/commands/help.js";

describe("helpText", () => {
  it("uses the configured prefix for every command example", () => {
    const text = helpText("!");
    assert.match(text, /!ban @user\|id \[reason\]/);
    assert.match(text, /!voice kickall/);
    assert.doesNotMatch(text, /\?ban/);
  });

  it("lists the legacy moderation feature surface", () => {
    const text = helpText("?");
    for (const command of [
      "ban",
      "unban",
      "kick",
      "timeout",
      "warn",
      "warnings",
      "purge",
      "slowmode",
      "lockdown",
      "unlock",
      "nick",
      "role add",
      "userinfo",
      "voice kick",
      "help"
    ]) {
      assert.match(text, new RegExp(command.replace(" ", "\\s+")));
    }
  });
});
