import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  grantAccess,
  isExpired,
  kickScript,
  normalizeMac,
  paymentAlreadyProvisioned,
  randomHotspotUsername,
  removeAccessScript,
  resumeScript,
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
    const userAdd = grant.script.split("\n").find((line) => line.includes("/ip hotspot user add")) ?? "";
    assert.match(grant.script, /\/ip hotspot user profile add name=yb-u2048-d10240-s1/);
    assert.match(grant.script, /rate-limit="2048k\/10240k"/);
    assert.match(userAdd, /name="hs-1001"/);
    assert.match(userAdd, /profile=yb-u2048-d10240-s1/);
    assert.match(userAdd, /limit-uptime=1h/);
    assert.doesNotMatch(userAdd, /rate-limit=/);
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
    assert.match(grant.script, /name="cust-22"/);
    assert.match(grant.script, /password="secret22"/);
    assert.match(grant.script, /limit-uptime=1d/);
  });

  it("logs the phone into HotSpot so the package profile applies", () => {
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

    const userAdd = grant.script.split("\n").find((line) => line.includes("/ip hotspot user add")) ?? "";
    assert.match(userAdd, /mac-address="AA:BB:CC:DD:EE:FF"/);
    assert.doesNotMatch(userAdd, /(^|\s)address=/);
    assert.match(grant.script, /login-by="http-pap,mac-cookie,http-chap,mac"/);
    assert.match(grant.script, /\/ip hotspot ip-binding remove/);
    assert.match(grant.script, /\/ip hotspot active login user="ybab12cd34" password="ybab12cd34" mac-address="AA:BB:CC:DD:EE:FF" ip=10.10.0.50/);
    assert.doesNotMatch(grant.script, /type=bypassed/);
    assert.doesNotMatch(grant.script, /\/ip hotspot ip-binding add/);
    assert.doesNotMatch(grant.script, /server=yb-hotspot/);
    assert.doesNotMatch(grant.script, /\/ip hotspot host remove/);
  });

  it("keeps a known MAC on the HotSpot user when the portal did not send an IP", () => {
    const grant = grantAccess({
      now: new Date("2026-10-02T08:00:00.000Z"),
      durationMinutes: 60,
      downloadKbps: 2000,
      uploadKbps: 2000,
      serviceType: "hotspot",
      username: "ybab12cd34",
      macAddress: "AA:BB:CC:DD:EE:FF",
    });

    assert.match(grant.script, /profile=yb-u2000-d2000-s1/);
    assert.match(grant.script, /mac-address="AA:BB:CC:DD:EE:FF"/);
    assert.match(grant.script, /login-by="http-pap,mac-cookie,http-chap,mac"/);
    assert.doesNotMatch(grant.script, /type=bypassed/);
    assert.doesNotMatch(grant.script, /\/ip hotspot active login/);
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

  it("pauses a hotspot user by disabling the account and dropping the MAC bypass", () => {
    const script = kickScript("ybab12cd34", "hotspot", "AA:BB:CC:DD:EE:FF");
    assert.match(script, /\/ip hotspot user disable/);
    assert.match(script, /\/ip hotspot active remove/);
    assert.match(script, /\/ip hotspot ip-binding remove/);
  });

  it("resumes a hotspot user without opening a MAC bypass", () => {
    const script = resumeScript("ybab12cd34", "hotspot", "AA:BB:CC:DD:EE:FF");
    assert.match(script, /\/ip hotspot user enable/);
    assert.match(script, /\/ip hotspot ip-binding remove/);
    assert.match(script, /login-by="http-pap,mac-cookie,http-chap,mac"/);
    assert.doesNotMatch(script, /type=bypassed/);
  });

  it("deletes a hotspot user from MikroTik without leaving the MAC bypass", () => {
    const script = removeAccessScript("ybab12cd34", "hotspot", "AA:BB:CC:DD:EE:FF");
    assert.match(script, /\/ip hotspot user remove/);
    assert.match(script, /\/ip hotspot active remove/);
    assert.match(script, /\/ip hotspot ip-binding remove/);
    assert.doesNotMatch(script, /\/ip hotspot user disable/);
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

  it("does not provision a payment that already has a subscriber", () => {
    assert.equal(paymentAlreadyProvisioned({ status: "success", subscriber_id: "sub-1" }), true);
    assert.equal(paymentAlreadyProvisioned({ status: "success", subscriber_id: null }), false);
    assert.equal(paymentAlreadyProvisioned({ status: "pending", subscriber_id: null }), false);
  });
});
