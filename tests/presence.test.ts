import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ROUTER_STALE_AFTER_MS,
  formatAge,
  routerPresence,
} from "../lib/routers/presence.ts";

describe("router live presence", () => {
  it("is waiting when the MikroTik has never checked in", () => {
    const presence = routerPresence(null, 1_000_000);
    assert.equal(presence.live, false);
    assert.equal(presence.headline, "Waiting");
    assert.match(presence.detail, /paste/i);
  });

  it("is online when last seen inside the heartbeat window", () => {
    const now = Date.parse("2026-10-02T19:42:00.000Z");
    const presence = routerPresence(new Date(now - 5_000).toISOString(), now);
    assert.equal(presence.live, true);
    assert.equal(presence.headline, "Online");
    assert.match(presence.detail, /5s ago/);
  });

  it("goes offline after a reset stops the agent", () => {
    const now = Date.parse("2026-10-02T19:42:00.000Z");
    const presence = routerPresence(
      new Date(now - ROUTER_STALE_AFTER_MS - 1).toISOString(),
      now,
    );
    assert.equal(presence.live, false);
    assert.equal(presence.headline, "Offline");
    assert.match(presence.detail, /reset/i);
    assert.match(presence.detail, /provision/i);
  });

  it("formats ages for the dashboard clock", () => {
    assert.equal(formatAge(3_000), "3s ago");
    assert.equal(formatAge(120_000), "2 min ago");
    assert.equal(formatAge(3_600_000), "1h ago");
  });
});
