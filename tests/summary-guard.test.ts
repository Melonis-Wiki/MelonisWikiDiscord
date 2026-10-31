import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shareInFlight, takeModelBudget, takeUserCommand } from "../src/ai/summary-guard.js";

describe("summary guard", () => {
  it("limits one user's commands per minute without affecting others", () => {
    const now = Date.parse("2026-10-31T12:00:00.000Z");
    for (let i = 0; i < 5; i++) assert.equal(takeUserCommand("user-a", now), true);
    assert.equal(takeUserCommand("user-a", now), false);
    assert.equal(takeUserCommand("user-b", now), true);
    assert.equal(takeUserCommand("user-a", now + 60_000), true);
  });

  it("stops model calls once the hourly budget is spent", () => {
    const now = Date.parse("2026-10-31T13:00:00.000Z");
    let granted = 0;
    while (takeModelBudget(now)) granted++;
    assert.equal(granted, 30);
    assert.equal(takeModelBudget(now + 60 * 60_000), true);
  });

  it("shares one run between concurrent callers of the same key", async () => {
    let runs = 0;
    const work = async () => {
      runs++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return runs;
    };
    const results = await Promise.all([
      shareInFlight("1:2026", work),
      shareInFlight("1:2026", work),
      shareInFlight("2:2026", work)
    ]);
    assert.equal(runs, 2);
    assert.equal(results[0], results[1]);
    assert.equal((await shareInFlight("1:2026", work)) > 0, true);
    assert.equal(runs, 3, "a finished run is not reused");
  });
});
