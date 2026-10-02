import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { grantAccess, isExpired } from "../lib/billing/access.ts";

describe("package access", () => {
  it("adds plan duration to the grant time", () => {
    const now = new Date("2026-10-02T08:00:00.000Z");
    const grant = grantAccess({
      now,
      durationMinutes: 60,
      downloadKbps: 10240,
      uploadKbps: 2048,
      serviceType: "hotspot",
      username: "hs-1001",
    });

    assert.equal(grant.expiresAt.toISOString(), "2026-10-02T09:00:00.000Z");
    assert.match(grant.script, /\/ip hotspot user add/);
    assert.match(grant.script, /name=hs-1001/);
    assert.match(grant.script, /rate-limit=10240k\/2048k/);
  });

  it("writes a PPPoE secret for PPPoE grants", () => {
    const grant = grantAccess({
      now: new Date("2026-10-02T08:00:00.000Z"),
      durationMinutes: 1440,
      downloadKbps: 5120,
      uploadKbps: 1024,
      serviceType: "pppoe",
      username: "cust-22",
      password: "secret22",
    });

    assert.match(grant.script, /\/ppp secret add/);
    assert.match(grant.script, /name=cust-22/);
    assert.match(grant.script, /password=secret22/);
  });

  it("treats a session as expired at or after expires_at", () => {
    const expiresAt = new Date("2026-10-02T09:00:00.000Z");
    assert.equal(isExpired(expiresAt, new Date("2026-10-02T08:59:59.000Z")), false);
    assert.equal(isExpired(expiresAt, new Date("2026-10-02T09:00:00.000Z")), true);
  });
});
