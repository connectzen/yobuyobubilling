import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rsc } from "../lib/api.ts";

describe("RouterOS script responses", () => {
  it("sends a Content-Length so MikroTik fetch keeps the body", async () => {
    const body = "# yobuyobu idle\n";
    const response = rsc(body);
    const text = await response.text();

    assert.equal(text, body);
    assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
    assert.equal(response.headers.get("content-length"), String(Buffer.byteLength(body)));
    assert.equal(response.headers.get("cache-control"), "no-store");
  });
});
