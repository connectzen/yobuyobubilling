import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  readConfigureApiResult,
  uploadBlockedReason,
  UPLOAD_SUCCESS_MESSAGE,
} from "../lib/mikrotik/setup-ui.ts";

describe("router upload button feedback", () => {
  it("explains why upload cannot run yet", () => {
    assert.equal(
      uploadBlockedReason({
        connected: false,
        wan: "",
        customerPortCount: 0,
        hotspot: true,
        pppoe: true,
      }),
      "Waiting for this MikroTik to report its ports.",
    );
    assert.equal(
      uploadBlockedReason({
        connected: true,
        wan: "",
        customerPortCount: 8,
        hotspot: true,
        pppoe: true,
      }),
      "Pick the WAN port first.",
    );
    assert.equal(
      uploadBlockedReason({
        connected: true,
        wan: "ether1",
        customerPortCount: 0,
        hotspot: true,
        pppoe: true,
      }),
      "No remaining customer ports. Pick a different WAN.",
    );
    assert.equal(
      uploadBlockedReason({
        connected: true,
        wan: "ether1",
        customerPortCount: 8,
        hotspot: false,
        pppoe: false,
      }),
      "Turn on Hotspot or PPPoE.",
    );
    assert.equal(
      uploadBlockedReason({
        connected: true,
        wan: "ether1",
        customerPortCount: 8,
        hotspot: true,
        pppoe: false,
      }),
      "",
    );
  });

  it("surfaces API JSON errors instead of failing silently", () => {
    assert.deepEqual(
      readConfigureApiResult(200, JSON.stringify({ success: true, data: { queued: true }, error: null })),
      { ok: true, message: UPLOAD_SUCCESS_MESSAGE },
    );
    assert.deepEqual(
      readConfigureApiResult(400, JSON.stringify({ success: false, data: null, error: "Choose hotspot or PPPoE" })),
      { ok: false, message: "Choose hotspot or PPPoE" },
    );
    assert.deepEqual(readConfigureApiResult(500, "<html>Internal Server Error</html>"), {
      ok: false,
      message: "Could not queue configuration (HTTP 500)",
    });
    assert.deepEqual(readConfigureApiResult(401, ""), {
      ok: false,
      message: "Could not queue configuration (HTTP 401)",
    });
  });
});
