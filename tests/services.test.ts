import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildServiceConfigScript } from "../lib/mikrotik/services.ts";

describe("MikroTik service configuration", () => {
  it("configures hotspot on the selected LAN port", () => {
    const script = buildServiceConfigScript({
      wanInterface: "ether1",
      lanInterface: "ether2",
      hotspot: true,
      pppoe: false,
      antiShare: false,
    });

    assert.match(script, /\/ip hotspot/);
    assert.match(script, /interface=ether2/);
    assert.doesNotMatch(script, /pppoe-server/);
  });

  it("configures PPPoE and anti-sharing together", () => {
    const script = buildServiceConfigScript({
      wanInterface: "ether1",
      lanInterface: "bridge1",
      hotspot: false,
      pppoe: true,
      antiShare: true,
    });

    assert.match(script, /\/interface pppoe-server server/);
    assert.match(script, /only-one=yes/);
    assert.match(script, /shared-users=1/);
  });

  it("requires WAN and LAN and refuses the same port for both", () => {
    assert.throws(() =>
      buildServiceConfigScript({
        wanInterface: "",
        lanInterface: "ether2",
        hotspot: true,
        pppoe: false,
        antiShare: false,
      }),
    );
    assert.throws(() =>
      buildServiceConfigScript({
        wanInterface: "ether1",
        lanInterface: "ether1",
        hotspot: true,
        pppoe: false,
        antiShare: false,
      }),
    );
  });

  it("requires at least one service", () => {
    assert.throws(() =>
      buildServiceConfigScript({
        wanInterface: "ether1",
        lanInterface: "ether2",
        hotspot: false,
        pppoe: false,
        antiShare: true,
      }),
    );
  });
});
