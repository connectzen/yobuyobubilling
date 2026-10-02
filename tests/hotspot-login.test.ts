import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hotspotPapLoginUrl } from "../lib/mikrotik/hotspot-login.ts";

describe("MikroTik hotspot PAP login URL", () => {
  it("sends the paid user to the gateway login from the phone itself", () => {
    assert.equal(
      hotspotPapLoginUrl("ybab12cd34", "ybab12cd34"),
      "http://10.10.0.1/login?username=ybab12cd34&password=ybab12cd34",
    );
  });
});
