import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildBootstrapScript,
  buildProvisionOneLiner,
  parseInterfaceReport,
} from "../lib/mikrotik/provision.ts";

describe("MikroTik provision scripts", () => {
  it("builds a one-liner that fetches and imports the bootstrap file", () => {
    const line = buildProvisionOneLiner({
      appUrl: "https://billing.yobuyobu.com",
      token: "tok_abc",
    });

    assert.match(line, /^\{/);
    assert.match(line, /\/tool fetch mode=https/);
    assert.match(line, /url="https:\/\/billing\.yobuyobu\.com\/provision\/tok_abc"/);
    assert.match(line, /dst-path=yobuyobu\.rsc/);
    assert.match(line, /\/import yobuyobu\.rsc/);
  });

  it("rejects a missing token or app url", () => {
    assert.throws(() =>
      buildProvisionOneLiner({ appUrl: "", token: "tok_abc" }),
    );
    assert.throws(() =>
      buildProvisionOneLiner({ appUrl: "https://x.com", token: "" }),
    );
  });

  it("writes a bootstrap script that polls the agent endpoint", () => {
    const script = buildBootstrapScript({
      appUrl: "https://billing.yobuyobu.com",
      token: "tok_abc",
      routerName: "Manyatta-AP1",
    });

    assert.match(script, /\/system identity set name="Manyatta-AP1"/);
    assert.match(script, /\/system scheduler/);
    assert.match(script, /yobuyobu-agent/);
    assert.match(script, /\/api\/agent\/tok_abc\/sync/);
    assert.doesNotMatch(script, /YOUR_|TODO|placeholder/i);
  });

  it("parses interface reports from the agent", () => {
    const ports = parseInterfaceReport("ether1:ether,wlan1:wlan,bridge1:bridge,");
    assert.deepEqual(ports, [
      { name: "ether1", type: "ether" },
      { name: "wlan1", type: "wlan" },
      { name: "bridge1", type: "bridge" },
    ]);
  });
});
