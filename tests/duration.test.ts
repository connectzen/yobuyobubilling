import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  durationToMinutes,
  formatDuration,
  minutesToDuration,
} from "../lib/billing/duration.ts";

describe("package duration", () => {
  it("converts 1 day to 1440 minutes", () => {
    assert.equal(durationToMinutes(1, "days"), 1440);
  });

  it("converts hours and minutes into stored minutes", () => {
    assert.equal(durationToMinutes(1, "hours"), 60);
    assert.equal(durationToMinutes(30, "minutes"), 30);
    assert.equal(durationToMinutes(2, "days"), 2880);
  });

  it("rejects zero, negative, and unknown units", () => {
    assert.throws(() => durationToMinutes(0, "days"));
    assert.throws(() => durationToMinutes(-1, "hours"));
    assert.throws(() => durationToMinutes(1, "weeks" as "days"));
  });

  it("formats stored minutes with the largest whole unit", () => {
    assert.equal(formatDuration(1440), "1 day");
    assert.equal(formatDuration(2880), "2 days");
    assert.equal(formatDuration(60), "1 hour");
    assert.equal(formatDuration(120), "2 hours");
    assert.equal(formatDuration(1), "1 minute");
    assert.equal(formatDuration(45), "45 minutes");
  });

  it("opens the duration picker on the selected unit", () => {
    assert.deepEqual(minutesToDuration(1440), { amount: 1, unit: "days" });
    assert.deepEqual(minutesToDuration(60), { amount: 1, unit: "hours" });
    assert.deepEqual(minutesToDuration(45), { amount: 45, unit: "minutes" });
  });
});
