import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  grantAccess,
  isExpired,
  kickScript,
  normalizeMac,
  randomHotspotUsername,
} from "../lib/billing/access.ts";

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

  it("bypasses and logs in the hotspot client immediately when a MAC is known", () => {
    const grant = grantAccess({
      now: new Date("2026-10-02T08:00:00.000Z"),
      durationMinutes: 60,
      downloadKbps: 10240,
      uploadKbps: 2048,
      serviceType: "hotspot",
      username: "ybab12cd34",
      macAddress: "aabbccddeeff",
      ipAddress: "10.10.0.50",
    });

    assert.match(grant.script, /mac-address=AA:BB:CC:DD:EE:FF/);
    assert.match(grant.script, /type=bypassed/);
    assert.match(grant.script, /\/ip hotspot active login user=ybab12cd34 password=ybab12cd34 mac-address=AA:BB:CC:DD:EE:FF ip=10.10.0.50/);
    assert.match(grant.script, /:do \{ \/ip hotspot ip-binding add/);
    assert.doesNotMatch(grant.script, /server=yb-hotspot/);
    assert.doesNotMatch(grant.script, /\/ip hotspot host remove/);
    assert.doesNotMatch(grant.script, /\/ip hotspot cookie add/);
  });

  it("normalizes compact and hyphen MAC addresses", () => {
    assert.equal(normalizeMac("aa-bb-cc-dd-ee-ff"), "AA:BB:CC:DD:EE:FF");
    assert.equal(normalizeMac("AABBCCDDEEFF"), "AA:BB:CC:DD:EE:FF");
    assert.equal(normalizeMac(""), undefined);
  });

  it("makes a random MikroTik username instead of using the customer's name", () => {
    const one = randomHotspotUsername();
    const two = randomHotspotUsername();
    assert.match(one, /^yb[a-f0-9]{10}$/);
    assert.notEqual(one, two);
  });

  it("removes the MAC bypass when the package expires", () => {
    const script = kickScript("ybab12cd34", "hotspot", "AA:BB:CC:DD:EE:FF");
    assert.match(script, /\/ip hotspot ip-binding remove/);
    assert.match(script, /AA:BB:CC:DD:EE:FF/);
  });

  it("treats a session as expired at or after expires_at", () => {
    const expiresAt = new Date("2026-10-02T09:00:00.000Z");
    assert.equal(isExpired(expiresAt, new Date("2026-10-02T08:59:59.000Z")), false);
    assert.equal(isExpired(expiresAt, new Date("2026-10-02T09:00:00.000Z")), true);
  });
});
