import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendPendingCommands,
  buildBootstrapScript,
  buildProvisionOneLiner,
  idleAgentScript,
  parseInterfaceReport,
} from "../lib/mikrotik/provision.ts";

describe("MikroTik provision scripts", () => {
  it("builds a one-liner that fetches and imports the bootstrap file", () => {
    const line = buildProvisionOneLiner({
      appUrl: "https://billing.yobuyobu.com",
      token: "tok_abc",
    });

    assert.match(line, /^\{/);
    assert.match(line, /\/tool fetch check-certificate=no /);
    assert.match(line, /url="https:\/\/billing\.yobuyobu\.com\/provision\/tok_abc"/);
    assert.match(line, /dst-path=yobuyobu\.rsc/);
    assert.match(line, /\/import yobuyobu\.rsc/);
    assert.doesNotMatch(line, /mode=/);
    assert.doesNotMatch(line, /check-certificate=yes/);
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
    assert.match(script, /\/api\/agent\/tok_abc\/run/);
    assert.match(script, /interval=3s/);
    assert.match(script, /\/tool fetch check-certificate=no /);
    assert.match(script, /output=user as-value/);
    assert.match(script, /\(\$ybrun->"data"\)/);
    assert.match(script, /:local ybdo \[:parse \$ybcmd\]/);
    assert.match(script, /\/api\/agent\/tok_abc\/run\?done=1/);
    assert.match(script, /policy=read,write,policy,test,password,sensitive,ftp/);
    assert.doesNotMatch(script, /dst-path=yobuyobu-cmd\.rsc/);
    assert.doesNotMatch(script, /:execute script=\$ybcmd/);
    assert.doesNotMatch(script, /\/import yobuyobu-cmd\.rsc/);
    assert.match(script, /# yobuyobu idle/);
    assert.doesNotMatch(script, /mode=/);
    assert.doesNotMatch(script, /check-certificate=yes/);
    assert.doesNotMatch(script, /interval=10s/);
    assert.doesNotMatch(script, /YOUR_|TODO|placeholder/i);
  });

  it("appends unpaid grants onto the paste-once bootstrap so Terminal import creates users", () => {
    const bootstrap = buildBootstrapScript({
      appUrl: "https://billing.yobuyobu.com",
      token: "tok_abc",
      routerName: "manyatta",
    });
    const grant = `/ip hotspot user add name=ybdeadbeef01 password=ybdeadbeef01 profile=yb-hotspot`;
    const script = appendPendingCommands(bootstrap, grant);

    assert.match(script, /\/system scheduler add name=yobuyobu-agent/);
    assert.match(script, /\/ip hotspot user add name=ybdeadbeef01/);
    assert.equal(appendPendingCommands(bootstrap, idleAgentScript()), bootstrap);
  });

  it("uses http fetch when the app url is not TLS", () => {
    const line = buildProvisionOneLiner({
      appUrl: "http://192.168.88.10:3000",
      token: "tok_abc",
    });
    assert.match(line, /\/tool fetch url=/);
    assert.doesNotMatch(line, /mode=/);
    assert.doesNotMatch(line, /check-certificate/);
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
