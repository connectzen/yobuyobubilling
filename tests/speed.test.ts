import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatMbps, mbpsToKbps } from "../lib/billing/speed.ts";

describe("package speed", () => {
  it("stores Mbps as kilobits for MikroTik", () => {
    assert.equal(mbpsToKbps(10), 10000);
    assert.equal(mbpsToKbps(2), 2000);
    assert.equal(mbpsToKbps(0.5), 500);
  });

  it("rejects zero and negative Mbps", () => {
    assert.throws(() => mbpsToKbps(0));
    assert.throws(() => mbpsToKbps(-1));
  });

  it("displays stored kilobits as Mbps", () => {
    assert.equal(formatMbps(10000), "10 Mbps");
    assert.equal(formatMbps(2000), "2 Mbps");
    assert.equal(formatMbps(500), "0.5 Mbps");
    assert.equal(formatMbps(10240), "10.24 Mbps");
  });
});
