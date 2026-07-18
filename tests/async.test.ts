import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { withTimeout } from "../src/utils/async.js";

describe("withTimeout", () => {
  it("returns the operation result before the timeout", async () => {
    const result = await withTimeout(async () => "ok", 100, "fast operation");
    assert.equal(result, "ok");
  });

  it("aborts operations that exceed the timeout", async () => {
    await assert.rejects(
      withTimeout(
        (signal) =>
          new Promise<string>((resolve, reject) => {
            signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
            setTimeout(() => resolve("late"), 50);
          }),
        5,
        "slow operation"
      ),
      /slow operation timed out/
    );
  });

  it("preserves non-timeout errors", async () => {
    await assert.rejects(
      withTimeout(async () => {
        throw new Error("original");
      }, 100, "failing operation"),
      /original/
    );
  });
});
