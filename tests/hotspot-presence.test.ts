import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseHotspotReport } from "../lib/mikrotik/presence.ts";

describe("hotspot presence", () => {
  it("keeps an active login ahead of the same account name", () => {
    const rows = parseHotspotReport({
      users: "yb1b1b38d91a,other-user,",
      actives: "yb1b1b38d91a|10.10.0.50|AA:BB:CC:DD:EE:FF;",
      bypass: "",
    });

    assert.deepEqual(rows, [
      { username: "yb1b1b38d91a", ip: "10.10.0.50", mac: "AA:BB:CC:DD:EE:FF", state: "active" },
      { username: "other-user", ip: null, mac: null, state: "account" },
    ]);
  });

  it("reads a bypass comment back to the subscriber name", () => {
    const rows = parseHotspotReport({
      users: "",
      actives: "",
      bypass: "aa:bb:cc:dd:ee:ff|yb-yb1b1b38d91a;",
    });

    assert.equal(rows[0]?.state, "bypassed");
    assert.equal(rows[0]?.username, "yb1b1b38d91a");
    assert.equal(rows[0]?.mac, "AA:BB:CC:DD:EE:FF");
  });
});
