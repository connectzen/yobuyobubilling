import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildServiceConfigScript,
  customerLanPorts,
} from "../lib/mikrotik/services.ts";

const samplePorts = [
  { name: "ether1", type: "ether" },
  { name: "ether2", type: "ether" },
  { name: "ether5", type: "ether" },
  { name: "wlan1", type: "wlan" },
  { name: "bridge", type: "bridge" },
];

describe("MikroTik service configuration", () => {
  it("treats every remaining non-bridge port as customer LAN", () => {
    assert.deepEqual(customerLanPorts("ether1", samplePorts), [
      "ether2",
      "ether5",
      "wlan1",
    ]);
  });

  it("bridges remaining ports and runs hotspot plus PPPoE on that LAN", () => {
    const script = buildServiceConfigScript({
      wanInterface: "ether1",
      ports: samplePorts,
      hotspot: true,
      pppoe: true,
      antiShare: false,
    });

    assert.match(script, /\/interface bridge add name=yb-lan/);
    assert.match(script, /bridge=yb-lan interface=ether2/);
    assert.match(script, /bridge=yb-lan interface=ether5/);
    assert.match(script, /bridge=yb-lan interface=wlan1/);
    assert.doesNotMatch(script, /bridge=yb-lan interface=ether1/);
    assert.doesNotMatch(script, /bridge=yb-lan interface=bridge(?:\s|$)/);
    assert.match(script, /\/ip hotspot add name=yb-hotspot interface=yb-lan/);
    assert.match(script, /pppoe-server server add service-name=yb-pppoe interface=yb-lan/);
    assert.match(script, /out-interface=ether1/);
  });

  it("locks hotspot accounts to one session when anti-sharing is on", () => {
    const script = buildServiceConfigScript({
      wanInterface: "ether1",
      ports: samplePorts,
      hotspot: true,
      pppoe: false,
      antiShare: true,
    });

    assert.match(script, /name=yb-hotspot shared-users=1/);
    assert.doesNotMatch(script, /shared-users=2/);
  });

  it("configures PPPoE and anti-sharing together", () => {
    const script = buildServiceConfigScript({
      wanInterface: "ether1",
      ports: samplePorts,
      hotspot: false,
      pppoe: true,
      antiShare: true,
    });

    assert.match(script, /\/interface pppoe-server server/);
    assert.match(script, /only-one=yes/);
    assert.match(script, /shared-users=1/);
  });

  it("requires WAN and at least one remaining customer port", () => {
    assert.throws(() =>
      buildServiceConfigScript({
        wanInterface: "",
        ports: samplePorts,
        hotspot: true,
        pppoe: false,
        antiShare: false,
      }),
    );
    assert.throws(() =>
      buildServiceConfigScript({
        wanInterface: "ether1",
        ports: [{ name: "ether1", type: "ether" }],
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
        ports: samplePorts,
        hotspot: false,
        pppoe: false,
        antiShare: true,
      }),
    );
  });

  it("keeps physical customer ports when the report includes lo and bridge", () => {
    const ports = [
      ...["ether1", "ether2", "ether3", "ether4", "ether5", "ether6", "ether7", "ether8"].map(
        (name) => ({ name, type: "ether" }),
      ),
      { name: "sfp1", type: "sfp-sfpplus" },
      { name: "lo", type: "loopback" },
      { name: "bridge", type: "bridge" },
    ];
    assert.equal(ports.length, 11);
    assert.deepEqual(customerLanPorts("ether1", ports), [
      "ether2",
      "ether3",
      "ether4",
      "ether5",
      "ether6",
      "ether7",
      "ether8",
      "sfp1",
    ]);
  });

  it("quotes RouterOS list values and puts yb-lan on the LAN list", () => {
    const script = buildServiceConfigScript({
      wanInterface: "ether1",
      ports: samplePorts,
      hotspot: true,
      pppoe: true,
      antiShare: true,
    });

    assert.match(script, /login-by="http-chap,http-pap,mac-cookie"/);
    assert.match(script, /authentication="pap,chap,mschap2"/);
    assert.match(script, /interface list member add list=LAN interface=yb-lan/);
    assert.match(script, /interface list member add list=WAN interface=ether1/);
    assert.match(script, /:do \{ \/interface bridge remove \[find name="yb-lan"\] \} on-error=\{\}/);
  });
});
